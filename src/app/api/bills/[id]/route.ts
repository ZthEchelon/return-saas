//update bill (paude/edit)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/data-access/prisma";
import { scheduleBillDueSoon } from "@/lib/domain/notifications/eventNotificationScheduler";
// no prisma enum import to avoid version/type export issues

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const existing = await prisma.bill.findFirst({ where: { id, userId } });
  if (!existing) return new NextResponse("Not found", { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const data: {
    name?: string;
    amountCents?: number | null;
    currency?: string;
    autopay?: boolean;
    payee?: string | null;
    notes?: string | null;
    dueDayOfMonth?: number;
    status?: "ACTIVE" | "PAUSED";
  } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.amountCents === "number" || body.amountCents === null) data.amountCents = body.amountCents;
  if (typeof body.currency === "string") data.currency = body.currency;
  if (typeof body.autopay === "boolean") data.autopay = body.autopay;
  if (typeof body.payee === "string" || body.payee === null) data.payee = body.payee;
  if (typeof body.notes === "string" || body.notes === null) data.notes = body.notes;

  if (typeof body.dueDayOfMonth === "number") {
    const due = body.dueDayOfMonth;
    if (!Number.isFinite(due) || due < 1 || due > 31) {
      return NextResponse.json({ error: "dueDayOfMonth must be 1..31" }, { status: 400 });
    }
    data.dueDayOfMonth = due;
  }

  if (typeof body.status === "string") {
    if (!["ACTIVE", "PAUSED"].includes(body.status)) {
      return NextResponse.json({ error: "status invalid" }, { status: 400 });
    }
    data.status = body.status as "ACTIVE" | "PAUSED";
  }

  const updated = await prisma.bill.update({
    where: { id },
    data,
  });

  if (updated.status === "ACTIVE") {
    await scheduleBillDueSoon({
      userId,
      billId: updated.id,
      name: updated.name,
      dueDayOfMonth: updated.dueDayOfMonth,
      amountCents: updated.amountCents,
      currency: updated.currency,
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, sourceKind: "bill", sourceId: { startsWith: `${updated.id}:` }, dismissedAt: null },
      data: { dismissedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
