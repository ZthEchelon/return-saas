//create or edit bills

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { scheduleBillDueSoon } from "@/lib/notifications/eventNotificationScheduler";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { name, amountCents, currency = "CAD", dueDayOfMonth, autopay = false, payee, notes } = body;

  if (!name || typeof name !== "string") return NextResponse.json({ error: "name required" }, { status: 400 });
  const due = Number(dueDayOfMonth);
  if (!Number.isFinite(due) || due < 1 || due > 31) {
    return NextResponse.json({ error: "dueDayOfMonth must be 1..31" }, { status: 400 });
  }

  const created = await prisma.bill.create({
    data: {
      userId,
      name,
      amountCents: typeof amountCents === "number" ? amountCents : null,
      currency,
      dueDayOfMonth: due,
      autopay: Boolean(autopay),
      payee: payee ?? null,
      notes: notes ?? null,
      status: "ACTIVE",
    },
  });

  await scheduleBillDueSoon({
    userId,
    billId: created.id,
    name: created.name,
    dueDayOfMonth: created.dueDayOfMonth,
    amountCents: created.amountCents,
    currency: created.currency,
  });

  return NextResponse.json({ bill: created });
}
