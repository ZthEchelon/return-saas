import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/data-access/prisma";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const [
    purchases,
    purchaseItems,
    purchaseAttachments,
    returns,
    subscriptions,
    bills,
    emailTransactions,
    receiptUploads,
    receiptDocuments,
    detectedItems,
    automationSuggestions,
    notifications,
    valueEvents,
  ] = await Promise.all([
    prisma.purchase.count({ where: { userId } }),
    prisma.purchaseItem.count({ where: { purchase: { userId } } }),
    prisma.purchaseAttachment.count({ where: { purchase: { userId } } }),
    prisma.returnItem.count({ where: { userId } }),
    prisma.subscription.count({ where: { userId } }),
    prisma.bill.count({ where: { userId } }),
    prisma.emailTransaction.count({ where: { userId } }),
    prisma.receiptUpload.count({ where: { userId } }),
    prisma.receiptDocument.count({ where: { userId } }),
    prisma.detectedItem.count({ where: { userId } }),
    prisma.automationSuggestion.count({ where: { userId } }),
    prisma.notification.count({ where: { userId } }),
    prisma.valueEvent.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    purchases,
    purchaseItems,
    purchaseAttachments,
    returns,
    subscriptions,
    bills,
    emailTransactions,
    receiptUploads,
    receiptDocuments,
    detectedItems,
    automationSuggestions,
    notifications,
    valueEvents,
  });
}
