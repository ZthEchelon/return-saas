//Create Subscription endpoint

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { name, amountCents, currency = "CAD", renewalDate, cadence = "MONTHLY", cancelUrl, notes } = body;

  if (!name || typeof name !== "string") return NextResponse.json({ error: "name required" }, { status: 400 });
  if (typeof amountCents !== "number") return NextResponse.json({ error: "amountCents required" }, { status: 400 });
  if (!renewalDate || typeof renewalDate !== "string") return NextResponse.json({ error: "renewalDate required" }, { status: 400 });

  const rd = new Date(renewalDate);
  if (Number.isNaN(rd.getTime())) return NextResponse.json({ error: "renewalDate invalid" }, { status: 400 });

  const created = await prisma.subscription.create({
    data: {
      userId,
      name,
      amountCents,
      currency,
      renewalDate: rd,
      cadence,
      status: "ACTIVE",
      cancelUrl: cancelUrl ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json({ subscription: created });
}
