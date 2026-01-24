// cron reconcile/backfill: re-run scheduler functions for upcoming window
// safe to run daily; scheduler functions handle deduplication via eventKey

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  scheduleSubscriptionRenewalSoon,
  scheduleReturnDeadlineSoon,
  scheduleRefundChecks,
  scheduleRefundOverdueOnce,
  scheduleBillDueSoon,
} from "@/lib/notifications/eventNotificationScheduler";

export const runtime = "nodejs";

function mustBeCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  const got = req.headers.get("x-cron-secret");
  if (got !== secret) throw new Error("Forbidden");
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDaysUTC(d: Date, days: number) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

export async function POST(req: NextRequest) {
  try {
    mustBeCron(req);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const today = startOfDayUTC(new Date());
  const horizon = addDaysUTC(today, 45); // safe default; prefs windowDays handled inside bill scheduler

  const [subs, returns, bills, refundCandidates] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "ACTIVE", renewalDate: { gte: today, lt: horizon } },
      select: { id: true, userId: true, name: true, renewalDate: true, amountCents: true, currency: true },
    }),
    prisma.returnItem.findMany({
      where: {
        status: { in: ["NOT_STARTED", "PACKED"] },
        returnBy: { gte: today, lt: horizon },
      },
      select: { id: true, userId: true, store: true, itemNote: true, amountCents: true, currency: true, returnBy: true, status: true },
    }),
    prisma.bill.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, userId: true, name: true, dueDayOfMonth: true, amountCents: true, currency: true },
    }),
    prisma.returnItem.findMany({
      where: {
        OR: [
          { dropoffDate: { not: null }, refundedDate: null },
          { refundExpectedAt: { not: null }, refundedDate: null },
        ],
      },
      select: { id: true, userId: true, store: true, dropoffDate: true, refundedDate: true, refundExpectedAt: true },
    }),
  ]);

  let attempted = 0;

  for (const s of subs) {
    attempted++;
    await scheduleSubscriptionRenewalSoon({
      userId: s.userId,
      subscriptionId: s.id,
      name: s.name,
      renewalDate: s.renewalDate,
      amountCents: s.amountCents,
      currency: s.currency,
    });
  }

  for (const r of returns) {
    attempted++;
    await scheduleReturnDeadlineSoon({
      userId: r.userId,
      returnId: r.id,
      store: r.store,
      itemNote: r.itemNote,
      returnBy: r.returnBy,
      amountCents: r.amountCents,
      currency: r.currency,
      status: r.status === "NOT_STARTED" ? "NOT_STARTED" : r.status === "PACKED" ? "PACKED" : "NOT_STARTED",
    });
  }

  for (const b of bills) {
    attempted++;
    await scheduleBillDueSoon({
      userId: b.userId,
      billId: b.id,
      name: b.name,
      dueDayOfMonth: b.dueDayOfMonth,
      amountCents: b.amountCents,
      currency: b.currency,
    });
  }

  for (const r of refundCandidates) {
    attempted++;
    await scheduleRefundChecks({
      userId: r.userId,
      returnId: r.id,
      store: r.store,
      dropoffDate: r.dropoffDate,
      refundedDate: r.refundedDate,
    });

    await scheduleRefundOverdueOnce({
      userId: r.userId,
      returnId: r.id,
      store: r.store,
      refundExpectedAt: r.refundExpectedAt ?? null,
      refundedDate: r.refundedDate,
    });
  }

  return NextResponse.json({
    ok: true,
    attempted,
    scanned: { subs: subs.length, returns: returns.length, bills: bills.length, refundCandidates: refundCandidates.length },
  });
}
