import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { scheduleReturnDeadlineSoon } from "@/lib/notifications/eventNotificationScheduler";

export const runtime = "nodejs";

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  type PurchaseRow = {
    id: string;
    merchant: string;
    totalCents: number | null;
    currency: string;
    purchasedAt: Date;
  };

  const prismaAny = prisma as typeof prisma & {
    purchase: { findFirst: (args: unknown) => Promise<PurchaseRow | null> };
  };

  const purchase = await prismaAny.purchase.findFirst({ where: { id: params.id, userId } });
  if (!purchase) return new NextResponse("Not found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const returnWindowDays = Number(body.returnWindowDays ?? 30);
  const windowDays = Number.isFinite(returnWindowDays) ? Math.max(1, returnWindowDays) : 30;

  const purchaseDate = new Date(purchase.purchasedAt);
  const returnBy = addDaysUTC(purchaseDate, windowDays);

    const data = {
      userId,
      purchaseId: purchase.id,
      store: purchase.merchant,
      itemNote: null,
      amountCents: purchase.totalCents ?? null,
      currency: purchase.currency,
      purchaseDate,
      returnWindowDays: windowDays,
      returnBy,
      status: "NOT_STARTED",
      dropoffDate: null,
      refundedDate: null,
      trackingNumber: null,
      carrier: null,
      deliveredAt: null,
      refundExpectedAt: null,
      refundSlaDays: 14,
      refundType: "ORIGINAL",
      refundAmountCents: null,
    } as unknown as Prisma.ReturnItemCreateInput;

  const createdReturn = await prisma.returnItem.create({ data });

  await scheduleReturnDeadlineSoon({
    userId,
    returnId: createdReturn.id,
    store: createdReturn.store,
    itemNote: createdReturn.itemNote,
    returnBy: createdReturn.returnBy,
    amountCents: createdReturn.amountCents,
    currency: createdReturn.currency,
    status: createdReturn.status,
  });

  return NextResponse.json({ return: createdReturn });
}
