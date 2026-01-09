// update subscription endpoint (edit/cancel)
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { scheduleSubscriptionRenewalSoon } from "@/lib/notifications/domainScheduler";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const existing = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!existing) return new NextResponse("Not found", { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const data: {
    name?: string;
    amountCents?: number;
    currency?: string;
    renewalDate?: Date;
    cadence?: "MONTHLY" | "YEARLY" | "CUSTOM";
    cancelUrl?: string | null;
    notes?: string | null;
    status?: "ACTIVE" | "CANCELLED";
  } = {};

  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.amountCents === "number") data.amountCents = body.amountCents;
  if (typeof body.currency === "string") data.currency = body.currency;
  if (typeof body.cadence === "string") {
    const c = body.cadence.toUpperCase();
    if (c === "MONTHLY" || c === "YEARLY" || c === "CUSTOM") data.cadence = c;
  }
  if (typeof body.cancelUrl === "string" || body.cancelUrl === null) data.cancelUrl = body.cancelUrl;
  if (typeof body.notes === "string" || body.notes === null) data.notes = body.notes;
  if (typeof body.status === "string" && (body.status === "ACTIVE" || body.status === "CANCELLED")) data.status = body.status;

  if (typeof body.renewalDate === "string") {
    const rd = new Date(body.renewalDate);
    if (Number.isNaN(rd.getTime())) return NextResponse.json({ error: "renewalDate invalid" }, { status: 400 });
    data.renewalDate = rd;
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data,
  });

  if (updated.status === "ACTIVE") {
    await scheduleSubscriptionRenewalSoon({
      userId,
      subscriptionId: updated.id,
      name: updated.name,
      renewalDate: updated.renewalDate,
      amountCents: updated.amountCents,
      currency: updated.currency,
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, sourceKind: "subscription", sourceId: updated.id, dismissedAt: null },
      data: { dismissedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const sub = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!sub) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ subscription: sub });
}
