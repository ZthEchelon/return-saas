//Create Subscription endpoint

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { scheduleSubscriptionRenewalSoon } from "@/lib/notifications/eventNotificationScheduler";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const subs = await prisma.subscription.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true, name: true, amountCents: true, currency: true, renewalDate: true },
    orderBy: { renewalDate: "asc" },
  });

  return NextResponse.json({ subscriptions: subs });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    name,
    amountCents,
    currency = "CAD",
    renewalDate,
    cadence = "MONTHLY",
    cancelUrl,
    cancelInstructions,
    merchantCanonicalId,
    trialEndAt,
    notes,
  } = body;

  if (!name || typeof name !== "string") return NextResponse.json({ error: "name required" }, { status: 400 });
  if (typeof amountCents !== "number") return NextResponse.json({ error: "amountCents required" }, { status: 400 });
  if (!renewalDate || typeof renewalDate !== "string") return NextResponse.json({ error: "renewalDate required" }, { status: 400 });

  const rd = new Date(renewalDate);
  if (Number.isNaN(rd.getTime())) return NextResponse.json({ error: "renewalDate invalid" }, { status: 400 });

  let trialEnd: Date | null = null;
  if (typeof trialEndAt === "string") {
    const te = new Date(trialEndAt);
    if (Number.isNaN(te.getTime())) return NextResponse.json({ error: "trialEndAt invalid" }, { status: 400 });
    trialEnd = te;
  }

  const created = await prisma.subscription.create({
    data: {
      userId,
      name,
      amountCents,
      currency,
      renewalDate: rd,
      cadence,
      renewalAt: rd,
      renewalCadence: cadence,
      status: "ACTIVE",
      cancelUrl: cancelUrl ?? null,
      cancelInstructions: cancelInstructions ?? null,
      merchantCanonicalId: merchantCanonicalId ?? null,
      trialEndAt: trialEnd,
      notes: notes ?? null,
    },
  });

  await scheduleSubscriptionRenewalSoon({
    userId,
    subscriptionId: created.id,
    name: created.name,
    renewalDate: created.renewalDate,
    amountCents: created.amountCents,
    currency: created.currency,
  });

  return NextResponse.json({ subscription: created });
}
