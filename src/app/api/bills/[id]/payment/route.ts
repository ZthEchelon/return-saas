//mark paid/ or mark due endpoint
//toggles payment status for am onth

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

function monthKeyFromISODate(dateYYYYMMDD: string) {
  // "YYYY-MM-DD" -> "YYYY-MM"
  return dateYYYYMMDD.slice(0, 7);
}



export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id: billId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });



  const { dueDate, mark, amountCents, notes } = body;
// dueDate: "YYYY-MM-DD", mark: "PAID" | "DUE"
  if (typeof dueDate !== "string") return NextResponse.json({ error: "dueDate required" }, { status: 400 });
  if (mark !== "PAID" && mark !== "DUE") return NextResponse.json({ error: "mark must be PAID or DUE" }, { status: 400 });

  // Ensure bill belongs to user
  const bill = await prisma.bill.findFirst({ where: { id: billId, userId } });
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
    amountCents: typeof amountCents === "number" ? amountCents : (bill.amountCents ?? null),
    currency: bill.currency,
    notes: typeof notes === "string" ? notes : null,
  },
  update: {
    dueDate: due,
    paidAt: mark === "PAID" ? new Date() : null,
    ...(typeof amountCents === "number" ? { amountCents } : {}),
    ...(typeof notes === "string" ? { notes } : {}),
  },
});




  return NextResponse.json({ payment });
}
