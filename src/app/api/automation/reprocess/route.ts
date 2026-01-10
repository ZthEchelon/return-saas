import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAuthedGmail } from "@/lib/gmail";
import { parsePurchaseFromRawGmailMessage } from "@/lib/receipts/parser";
import type { Purchase } from "@/lib/receipts/parser";

/**
 * Reprocess all Gmail receipts with pagination and progress tracking
 * Useful for fixing parser errors or updating all transactions
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(body.batchSize || 50, 100); // Max 100 per request
  const offset = body.offset || 0;

  const authed = await getAuthedGmail(userId);
  if (!authed) {
    // Gracefully no-op instead of throwing so dashboards don't error/noise
    return NextResponse.json({
      error: "Gmail not connected",
      totalCount: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      offset,
      batchSize,
      hasMore: false,
      nextOffset: null,
      errors: [],
      progress: 0,
    });
  }
  const { gmail } = authed;

  // Get all transactions to reprocess
  const totalCount = await prisma.emailTransaction.count({
    where: { userId, provider: "GMAIL" },
  });

  const transactions = await prisma.emailTransaction.findMany({
    where: { userId, provider: "GMAIL" },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: batchSize,
    select: { id: true, messageId: true },
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ messageId: string; error: string }> = [];

  for (const tx of transactions) {
    try {
      // Fetch raw message
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: tx.messageId,
        format: "raw",
      });

      const raw = msg.data.raw;
      if (!raw) {
        failed++;
        errors.push({ messageId: tx.messageId, error: "No raw content" });
        continue;
      }

      let parserError: string | null = null;
      let purchase: Purchase;

      try {
        purchase = await parsePurchaseFromRawGmailMessage({ messageId: tx.messageId, raw });
      } catch (error) {
        parserError = error instanceof Error ? error.message : String(error);
        // Create fallback purchase object
        purchase = {
          messageId: tx.messageId,
          merchant: "Parse Failed",
          rawSource: "text",
          fromEmail: undefined,
          subject: undefined,
          purchasedAt: undefined,
          orderId: undefined,
          totalCents: undefined,
          currency: "CAD",
          items: undefined,
        };
        failed++;
        errors.push({ messageId: tx.messageId, error: parserError });
      }

      // Update transaction
      await prisma.emailTransaction.update({
        where: { id: tx.id },
        data: {
          merchant: purchase.merchant,
          fromEmail: purchase.fromEmail ?? null,
          subject: purchase.subject ?? null,
          purchasedAt: purchase.purchasedAt ?? null,
          orderId: purchase.orderId ?? null,
          totalCents: purchase.totalCents ?? null,
          currency: (purchase.currency ?? "CAD").toUpperCase(),
          items: purchase.items ?? undefined,
          rawSource: purchase.rawSource,
          parserError,
        },
      });

      if (!parserError) succeeded++;
      processed++;
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ messageId: tx.messageId, error: errorMsg });
    }
  }

  const hasMore = offset + batchSize < totalCount;
  const nextOffset = hasMore ? offset + batchSize : null;

  return NextResponse.json({
    totalCount,
    processed,
    succeeded,
    failed,
    offset,
    batchSize,
    hasMore,
    nextOffset,
    errors: errors.slice(0, 10), // Return first 10 errors
    progress: Math.round(((offset + processed) / totalCount) * 100),
  });
}
