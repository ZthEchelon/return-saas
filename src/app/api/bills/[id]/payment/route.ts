//mark paid/ or mark due endpoint
//toggles payment status for a month

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

function monthKeyFromISODate(dateYYYYMMDD: string) {
  // "YYYY-MM-DD" -> "YYYY-MM"
  return dateYYYYMMDD.slice(0, 7);
}

function isISODateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id: billId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { dueDate, mark, amountCents, notes } = body;
  
  // Validate inputs
  if (typeof dueDate !== "string" || !isISODateOnly(dueDate)) {
    return NextResponse.json({ error: "dueDate must be YYYY-MM-DD" }, { status: 400 });
  }
  if (mark !== "PAID" && mark !== "DUE") {
    return NextResponse.json({ error: "mark must be PAID or DUE" }, { status: 400 });
  }

  // Ensure bill belongs to user
  const bill = await prisma.bill.findFirst({ 
    where: { id: billId, userId },
    select: { id: true, amountCents: true, currency: true }
  });
  if (!bill) return new NextResponse("Not found", { status: 404 });

  const monthKey = monthKeyFromISODate(dueDate);
  const due = new Date(dueDate + "T00:00:00.000Z");

  const payment = await prisma.billPayment.upsert({
    where: { billId_monthKey: { billId, monthKey } },
    create: {
      userId,
      billId,
      monthKey,
      dueDate: due,
      paidAt: mark === "PAID" ? new Date() : null,
      amountCents: typeof amountCents === "number" ? Math.round(amountCents) : (bill.amountCents ?? null),
      currency: bill.currency,
      notes: typeof notes === "string" ? (notes || null) : null,
    },
    update: {
      paidAt: mark === "PAID" ? new Date() : null,
      ...(typeof amountCents === "number" ? { amountCents: Math.round(amountCents) } : {}),
      ...(typeof notes === "string" ? { notes: notes || null } : {}),
    },
    select: { billId: true, monthKey: true, paidAt: true, amountCents: true, currency: true },
  });

  return NextResponse.json({ ok: true, payment });
}
