//marks paid/mark due api

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function clampDayToMonth(year: number, monthZero: number, day: number) {
  const lastDay = new Date(Date.UTC(year, monthZero + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

function dueDateFromMonthKey(monthKey: string, dueDayOfMonth: number) {
  // monthKey: "YYYY-MM"
  const [yStr, mStr] = monthKey.split("-");
  const y = Number(yStr);
  const mZero = Number(mStr) - 1;
  if (!Number.isFinite(y) || !Number.isFinite(mZero)) throw new Error("Invalid monthKey");

  const day = clampDayToMonth(y, mZero, dueDayOfMonth);
  return new Date(Date.UTC(y, mZero, day));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const billId = String(body.billId ?? "");
  const monthKey = String(body.monthKey ?? "");
  const paid = body.paid !== undefined ? Boolean(body.paid) : true;

  if (!billId || !monthKey) {
    return NextResponse.json({ error: "billId and monthKey are required" }, { status: 400 });
  }

  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId },
    select: { id: true, userId: true, dueDayOfMonth: true, amountCents: true, currency: true },
  });

  if (!bill) return new NextResponse("Not found", { status: 404 });

  const dueDate = dueDateFromMonthKey(monthKey, bill.dueDayOfMonth);

  const row = await prisma.billPayment.upsert({
    where: { billId_monthKey: { billId, monthKey } },
    create: {
      userId,
      billId,
      monthKey,
      dueDate,
      paidAt: paid ? new Date() : null,
      amountCents: bill.amountCents ?? null,
      currency: bill.currency ?? "CAD",
    },
    update: {
      paidAt: paid ? new Date() : null,
    },
    select: { billId: true, monthKey: true, paidAt: true },
  });

  return NextResponse.json({ ok: true, payment: row });
}
