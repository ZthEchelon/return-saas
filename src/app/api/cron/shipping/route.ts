import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshShipmentTimeline } from "@/lib/domain/shipping/tracking";
import { scheduleRefundOverdueOnce } from "@/lib/notifications/eventNotificationScheduler";

export const runtime = "nodejs";

function mustBeCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  const got = req.headers.get("x-cron-secret");
  if (got !== secret) throw new Error("Forbidden");
}

export async function POST(req: Request) {
  try {
    mustBeCron(req);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const trackable = await prisma.returnItem.findMany({
    where: {
      trackingNumber: { not: null },
      deliveredAt: null,
      refundedDate: null,
      status: { in: ["NOT_STARTED", "PACKED", "DROPPED_OFF"] },
    },
    select: { id: true, userId: true },
    take: 200,
  });

  const userIds = Array.from(new Set(trackable.map(t => t.userId)));
  const billing = await prisma.billingAccount.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, plan: true },
  });
  const planMap = new Map(billing.map(b => [b.userId, b.plan]));

  let polled = 0;
  for (const r of trackable) {
    const plan = planMap.get(r.userId) ?? "FREE";
    if (plan === "FREE") continue; // free tier: manual refresh only
    await refreshShipmentTimeline({ userId: r.userId, returnId: r.id });
    polled++;
  }

  const refundCandidates = await prisma.returnItem.findMany({
    where: { refundExpectedAt: { not: null }, refundedDate: null },
    select: { id: true, userId: true, store: true, refundExpectedAt: true, refundedDate: true },
  });

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: Array.from(new Set(refundCandidates.map(r => r.userId))) } },
    select: { userId: true, notifyOnRefundOverdue: true },
  });
  const prefMap = new Map(prefs.map(p => [p.userId, p.notifyOnRefundOverdue]));

  let overdueNotified = 0;
  const now = new Date();
  for (const r of refundCandidates) {
    if (!r.refundExpectedAt) continue;
    if (prefMap.get(r.userId) === false) continue;
    await scheduleRefundOverdueOnce({
      userId: r.userId,
      returnId: r.id,
      store: r.store,
      refundExpectedAt: r.refundExpectedAt,
      refundedDate: r.refundedDate,
    });
    if (r.refundExpectedAt < now) {
      await prisma.refundCase.upsert({
        where: { returnId: r.id },
        create: { userId: r.userId, returnId: r.id, expectedAt: r.refundExpectedAt, overdueNotifiedAt: now },
        update: { expectedAt: r.refundExpectedAt, overdueNotifiedAt: now },
      });
      overdueNotified++;
    }
  }

  return NextResponse.json({
    ok: true,
    polled,
    overdueNotified,
  });
}
