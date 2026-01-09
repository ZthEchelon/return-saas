//cron generate notifcations daily

import { NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SUB_LEAD_DAYS = 3;    // “renewals coming up to cancel”
const RETURN_LEAD_DAYS = 2;
const BILL_LEAD_DAYS = 2;

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDaysUTC(d: Date, days: number) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}
function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}
function clampDayToMonth(year: number, monthZero: number, day: number) {
  const lastDay = new Date(Date.UTC(year, monthZero + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

export async function POST(req: Request) {
  // Optional protection: set CRON_SECRET in env for prod
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const got = req.headers.get("x-cron-secret");
    if (got !== secret) return new NextResponse("Forbidden", { status: 403 });
  }

  const today = startOfDayUTC(new Date());
  const scheduledFor = today;

  const subTargetStart = startOfDayUTC(addDaysUTC(today, SUB_LEAD_DAYS));
  const subTargetEnd = addDaysUTC(subTargetStart, 1);

  const retTargetStart = startOfDayUTC(addDaysUTC(today, RETURN_LEAD_DAYS));
  const retTargetEnd = addDaysUTC(retTargetStart, 1);

  const billTarget = startOfDayUTC(addDaysUTC(today, BILL_LEAD_DAYS));
  const billTargetISO = isoDateOnly(billTarget);

  // Parallelize all queries for faster execution
  const [subs, returns, bills, dropped] = await Promise.all([
    // 1) Subscriptions that renew in SUB_LEAD_DAYS
    prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        renewalDate: { gte: subTargetStart, lt: subTargetEnd },
      },
      select: { id: true, userId: true, name: true, amountCents: true, currency: true, renewalDate: true },
    }),
    // 2) Return deadlines in RETURN_LEAD_DAYS (not refunded)
    prisma.returnItem.findMany({
      where: {
        status: { in: ["NOT_STARTED", "PACKED"] },
        returnBy: { gte: retTargetStart, lt: retTargetEnd },
      },
      select: { id: true, userId: true, store: true, itemNote: true, amountCents: true, currency: true, returnBy: true },
    }),
    // 3) Bills due in BILL_LEAD_DAYS (computed from dueDayOfMonth)
    prisma.bill.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, userId: true, name: true, amountCents: true, currency: true, dueDayOfMonth: true },
    }),
    // 4) Refund check due today (derived from dropoffDate + 7/14)
    prisma.returnItem.findMany({
      where: {
        dropoffDate: { not: null, gte: addDaysUTC(today, -20), lt: addDaysUTC(today, 1) },
        refundedDate: null,
        status: { not: "REFUNDED" },
      },
      select: { id: true, userId: true, store: true, dropoffDate: true, amountCents: true, currency: true },
    }),
  ]);

  const creates: Promise<unknown>[] = [];

  // helper: upsert by deterministic eventKey
  async function upsertNotif(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    eventDate?: Date;
    sourceKind: string;
    sourceId: string;
    eventKey: string;
  }) {
    return prisma.notification.upsert({
      where: { userId_eventKey: { userId: input.userId, eventKey: input.eventKey } },
      create: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        eventDate: input.eventDate,
        scheduledFor,
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
        eventKey: input.eventKey,
      },
      update: {}, // don’t spam-update once created
    });
  }

  // Sub notifications
  for (const s of subs) {
    const eventISO = isoDateOnly(s.renewalDate);
    const amt = `${s.currency} ${(s.amountCents / 100).toFixed(2)}`;
    const title = `${s.name} renews in ${SUB_LEAD_DAYS} days`;
    const body = `Renews on ${eventISO} · ${amt}. If you want to cancel, do it before renewal.`;
    const eventKey = `sub:${s.id}:${eventISO}:lead${SUB_LEAD_DAYS}`;

    creates.push(
      upsertNotif({
        userId: s.userId,
        type: "SUBSCRIPTION_RENEWAL_SOON" as NotificationType,
        title,
        body,
        eventDate: startOfDayUTC(s.renewalDate),
        sourceKind: "subscription",
        sourceId: s.id,
        eventKey,
      })
    );
  }

  // Return notifications
  for (const r of returns) {
    const eventISO = isoDateOnly(r.returnBy);
    const title = `Return deadline in ${RETURN_LEAD_DAYS} days`;
    const body = `${r.store}${r.itemNote ? ` — ${r.itemNote}` : ""} · Return by ${eventISO}.`;
    const eventKey = `ret:${r.id}:${eventISO}:lead${RETURN_LEAD_DAYS}`;

    creates.push(
      upsertNotif({
        userId: r.userId,
        type: "RETURN_DEADLINE_SOON" as NotificationType,
        title,
        body,
        eventDate: startOfDayUTC(r.returnBy),
        sourceKind: "return",
        sourceId: r.id,
        eventKey,
      })
    );
  }

  // Bill notifications (compute due date for current + next month; match billTargetISO)
  const y0 = billTarget.getUTCFullYear();
  const m0 = billTarget.getUTCMonth();
  for (const b of bills) {
    const day = clampDayToMonth(y0, m0, b.dueDayOfMonth);
    const due = new Date(Date.UTC(y0, m0, day));
    if (isoDateOnly(due) !== billTargetISO) continue;

    const eventISO = isoDateOnly(due);
    const amt = b.amountCents != null ? `${b.currency} ${(b.amountCents / 100).toFixed(2)}` : "amount unknown";
    const title = `${b.name} due in ${BILL_LEAD_DAYS} days`;
    const body = `Due on ${eventISO} · ${amt}.`;
    const monthKey = eventISO.slice(0, 7);
    const eventKey = `bill:${b.id}:${monthKey}:lead${BILL_LEAD_DAYS}`;

    creates.push(
      upsertNotif({
        userId: b.userId,
        type: "BILL_DUE_SOON" as NotificationType,
        title,
        body,
        eventDate: due,
        sourceKind: "bill",
        sourceId: `${b.id}:${monthKey}`,
        eventKey,
      })
    );
  }

  // Refund checks due today
  for (const r of dropped) {
    const drop = startOfDayUTC(r.dropoffDate!);
    const check7 = addDaysUTC(drop, 7);
    const check14 = addDaysUTC(drop, 14);

    for (const [check, label] of [
      [check7, "Refund check (7d)"],
      [check14, "Refund check (14d)"],
    ] as const) {
      if (isoDateOnly(check) !== isoDateOnly(today)) continue;

      const eventISO = isoDateOnly(check);
      const title = `${label}: ${r.store}`;
      const body = `Follow up on refund · ${eventISO}.`;
      const eventKey = `refund:${r.id}:${label}:${eventISO}`;

      creates.push(
        upsertNotif({
          userId: r.userId,
        type: "REFUND_CHECK_DUE" as NotificationType,
          title,
          body,
          eventDate: check,
          sourceKind: "return",
          sourceId: r.id,
          eventKey,
        })
      );
    }
  }

  const results = await Promise.allSettled(creates);
  const createdOrExisting = results.filter(r => r.status === "fulfilled").length;

  return NextResponse.json({
    ok: true,
    scheduledFor: isoDateOnly(scheduledFor),
    attempted: creates.length,
    upserts: createdOrExisting,
  });
}
