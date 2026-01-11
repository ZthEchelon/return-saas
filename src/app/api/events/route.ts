import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { parseISODateParam } from "@/lib/dateParams";

type EventType =
  | "RENEWAL"
  | "RETURN_DEADLINE"
  | "REFUND_CHECK"
  | "REFUND_EXPECTED"
  | "DELIVERED"
  | "REFUNDED"
  | "CANCELLED_SUBSCRIPTION"
  | "BILL_DUE";

type CalendarEvent = {
  id: string;
  type: EventType;
  date: string;
  title: string;
  amountCents?: number;
  currency?: string;

  // NEW
  billStatus?: "DUE" | "PAID";
  autopay?: boolean;
  monthKey?: string;
  purchaseDate?: string;
  returnBy?: string;
  trackingNumber?: string | null;

  source: { kind: "subscription" | "return" | "bill"; sourceId: string };
};


function toISODateOnlyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(date: Date, days: number): Date {
  const out = new Date(date.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}

function firstOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonthsUTC(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function clampDayToMonth(year: number, monthZero: number, day: number) {
  const lastDay = new Date(Date.UTC(year, monthZero + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}


export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const now = new Date();

  const url = new URL(req.url);
  const start = parseISODateParam(url.searchParams.get("start"));
  const end = parseISODateParam(url.searchParams.get("end"));

  if (!start || !end) {
    return NextResponse.json(
      { error: "Provide start and end as YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const startMonthKey = start.toISOString().slice(0, 7);
  const endMonthKey = end.toISOString().slice(0, 7);

  // Query raw records inside the range (+ small buffer for derived events)
  // Guard against a stale Prisma client missing snoozedEvent (prevents 500s while still serving events).
  const snoozedEventsPromise: Promise<{ eventId: string; snoozedUntil: Date }[]> =
    (prisma as any).snoozedEvent?.findMany
      ? prisma.snoozedEvent.findMany({
          where: { userId, snoozedUntil: { gt: now } },
          select: { eventId: true, snoozedUntil: true },
        })
      : Promise.resolve([]);
  if (!(prisma as any).snoozedEvent?.findMany) {
    console.warn("prisma.snoozedEvent missing; rerun prisma generate to enable snoozing.");
  }

  const [activeSubs, cancelledSubs, returnItems, bills, payments, snoozedEvents] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId,
        renewalDate: { gte: start, lt: end },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        amountCents: true,
        currency: true,
        renewalDate: true,
      },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.subscription.findMany({
      where: {
        userId,
        status: "CANCELLED",
        updatedAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        name: true,
        amountCents: true,
        currency: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.returnItem.findMany({
      where: {
        userId,
        OR: [
          { returnBy: { gte: start, lt: end } },
          // include dropoffs slightly before range to compute refund checks within range
          { dropoffDate: { gte: addDaysUTC(start, -20), lt: end } },
        ],
      },
    select: {
      id: true,
      store: true,
      itemNote: true,
      amountCents: true,
      currency: true,
      purchaseDate: true,
      returnBy: true,
      status: true,
      dropoffDate: true,
      refundExpectedAt: true,
      deliveredAt: true,
      refundedDate: true,
      refundAmountCents: true,
      trackingNumber: true,
      refundSlaDays: true,
      carrier: true,
    },
      orderBy: { returnBy: "asc" },
    }),
    prisma.bill.findMany({
      where: { userId, status: "ACTIVE" },
      select: { id: true, name: true, amountCents: true, currency: true, dueDayOfMonth: true, autopay: true },
      orderBy: { name: "asc" },
    }),
    prisma.billPayment.findMany({
      where: {
        userId,
        monthKey: { gte: startMonthKey, lte: endMonthKey },
      },
      select: { billId: true, monthKey: true, paidAt: true, dueDate: true, amountCents: true, currency: true },
    }),
    snoozedEventsPromise,
  ]);

  const events: CalendarEvent[] = [];

  // Subscription renewals
  for (const s of activeSubs) {
    events.push({
      id: `sub_${s.id}_${toISODateOnlyUTC(s.renewalDate)}`,
      type: "RENEWAL",
      date: toISODateOnlyUTC(s.renewalDate),
      title: s.name,
      amountCents: s.amountCents,
      currency: s.currency,
      source: { kind: "subscription", sourceId: s.id },
    });
  }

  // Cancelled subscriptions (logged by updatedAt)
  for (const c of cancelledSubs) {
    events.push({
      id: `subcancel_${c.id}_${toISODateOnlyUTC(c.updatedAt)}`,
      type: "CANCELLED_SUBSCRIPTION",
      date: toISODateOnlyUTC(c.updatedAt),
      title: `${c.name} cancelled`,
      amountCents: c.amountCents ?? undefined,
      currency: c.currency,
      source: { kind: "subscription", sourceId: c.id },
    });
  }

    // Return deadlines + refund checks + refunded
  for (const r of returnItems) {
    const expectedRefundAt =
      r.refundExpectedAt ??
      (r.deliveredAt
        ? addDaysUTC(r.deliveredAt, r.refundSlaDays ?? 14)
        : r.dropoffDate
        ? addDaysUTC(r.dropoffDate, r.refundSlaDays ?? 14)
        : null);

    const deadlineDate = toISODateOnlyUTC(r.returnBy);
    if (r.returnBy >= start && r.returnBy < end && r.status !== "REFUNDED" && r.status !== "DELIVERED") {
      events.push({
        id: `ret_${r.id}_${deadlineDate}`,
        type: "RETURN_DEADLINE",
        date: deadlineDate,
        title: `${r.store}${r.itemNote ? ` — ${r.itemNote}` : ""}`,
        amountCents: r.amountCents ?? undefined,
        currency: r.currency,
        source: { kind: "return", sourceId: r.id },
        purchaseDate: toISODateOnlyUTC(r.purchaseDate),
        returnBy: deadlineDate,
        trackingNumber: r.trackingNumber ?? null,
      });
    }

    if (r.dropoffDate && !r.refundedDate && r.status !== "REFUNDED") {
      const check7 = addDaysUTC(r.dropoffDate, 7);
      const checkSla = expectedRefundAt ?? addDaysUTC(r.dropoffDate, 14);

      for (const [checkDate, label] of [
        [check7, "Refund check (7d)"],
        [checkSla, "Refund expected"],
      ] as const) {
        if (checkDate >= start && checkDate < end) {
          events.push({
            id: `ref_${r.id}_${label}_${toISODateOnlyUTC(checkDate)}`,
            type: label === "Refund expected" ? "REFUND_EXPECTED" : "REFUND_CHECK",
            date: toISODateOnlyUTC(checkDate),
            title: `${label}: ${r.store}`,
            amountCents: r.amountCents ?? undefined,
            currency: r.currency,
            source: { kind: "return", sourceId: r.id },
            purchaseDate: toISODateOnlyUTC(r.purchaseDate),
            returnBy: toISODateOnlyUTC(r.returnBy),
            trackingNumber: r.trackingNumber ?? null,
          });
        }
      }
    }

    if (r.refundedDate && r.refundedDate >= start && r.refundedDate < end) {
      events.push({
        id: `refunded_${r.id}_${toISODateOnlyUTC(r.refundedDate)}`,
        type: "REFUNDED",
        date: toISODateOnlyUTC(r.refundedDate),
        title: `${r.store} — Refunded`,
        amountCents: r.refundAmountCents ?? r.amountCents ?? undefined,
        currency: r.currency,
        source: { kind: "return", sourceId: r.id },
        purchaseDate: toISODateOnlyUTC(r.purchaseDate),
        returnBy: toISODateOnlyUTC(r.returnBy),
        trackingNumber: r.trackingNumber ?? null,
      });
    }

    if (r.deliveredAt && r.deliveredAt >= start && r.deliveredAt < end) {
      events.push({
        id: `delivered_${r.id}_${toISODateOnlyUTC(r.deliveredAt)}`,
        type: "DELIVERED",
        date: toISODateOnlyUTC(r.deliveredAt),
        title: `${r.store} — Delivered`,
        amountCents: r.amountCents ?? undefined,
        currency: r.currency,
        source: { kind: "return", sourceId: r.id },
        purchaseDate: toISODateOnlyUTC(r.purchaseDate),
        returnBy: toISODateOnlyUTC(r.returnBy),
        trackingNumber: r.trackingNumber ?? null,
      });
    }
  }
// Bill events
  const paymentMap = new Map<string, { paidAt: Date | null; amountCents?: number | null; currency?: string }>();
  for (const p of payments) {
    paymentMap.set(`${p.billId}_${p.monthKey}`, { paidAt: p.paidAt, amountCents: p.amountCents, currency: p.currency });
  }

  for (let cursor = firstOfMonthUTC(start); cursor < end; cursor = addMonthsUTC(cursor, 1)) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    const mk = monthKey(cursor);

    for (const b of bills) {
      const day = clampDayToMonth(y, m, b.dueDayOfMonth);
      const due = new Date(Date.UTC(y, m, day));
      if (due < start || due >= end) continue;

      const key = `${b.id}_${mk}`;
      const paidInfo = paymentMap.get(key);
      const paid = paidInfo?.paidAt ?? null;

      const amountCents = (paidInfo?.amountCents ?? b.amountCents) ?? undefined;
      const currency = paidInfo?.currency ?? b.currency;

      events.push({
        id: `bill_${b.id}_${mk}`,
        type: "BILL_DUE",
        date: toISODateOnlyUTC(due),
        title: b.name,
        amountCents,
        currency,
        billStatus: paid ? "PAID" : "DUE",
        autopay: b.autopay,
        monthKey: mk,
        source: { kind: "bill", sourceId: b.id },
      });
    }
  }

  const snoozedMap = new Map(snoozedEvents.map(s => [s.eventId, s.snoozedUntil]));
  const activeEvents = events.filter(ev => {
    const until = snoozedMap.get(ev.id);
    return !until || until <= now;
  });

  // Sort by date then type
  activeEvents.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type.localeCompare(b.type)));

  return NextResponse.json({ events: activeEvents });
}
