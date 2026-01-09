import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { getAuthedGmail } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { parsePurchaseFromRawGmailMessage } from "@/lib/receipts/parser";
import { saveReceiptAttachment } from "@/lib/receipts/storage";

function guessSuggestionType(merchant: string, subject?: string | null) {
  const s = (subject ?? "").toLowerCase();
  const m = merchant.toLowerCase();

  if (s.includes("bill") || s.includes("statement") || s.includes("invoice")) return "BILL";
  if (m.includes("netflix") || m.includes("spotify") || s.includes("subscription") || s.includes("renewal")) return "SUBSCRIPTION";
  return "RETURN";
}

function toISODateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const days = Number(body?.days ?? 90);
  const max = Number(body?.max ?? 200);
  const reprocess = Boolean(body?.reprocess ?? false);

  const authed = await getAuthedGmail(userId);
  if (!authed) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  const { gmail } = authed;

  const q =
    `newer_than:${Number.isFinite(days) ? days : 90}d ` +
    `(subject:(receipt OR invoice OR "order confirmation" OR "thanks for your order") OR "order total" OR "grand total")`;

  const list = await gmail.users.messages.list({
    userId: "me",
    q,
    maxResults: Math.min(Number.isFinite(max) ? max : 200, 500),
  });

  const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);

  let already = 0;
  let parsed = 0;
  let transactionsUpserted = 0;
  let suggestionsCreated = 0;

  for (const id of ids) {
    let tx = await prisma.emailTransaction.findUnique({
      where: { provider_messageId: { provider: "GMAIL", messageId: id } },
    });
    let purchase: Awaited<ReturnType<typeof parsePurchaseFromRawGmailMessage>> | null = null;

    // If no transaction or reprocess requested, re-fetch + parse + upsert
    if (!tx || reprocess) {
      const msg = await gmail.users.messages.get({ userId: "me", id, format: "raw" as any });
      const raw = msg.data.raw;
      if (!raw) continue;

      let parserError: string | null = null;
      try {
        purchase = await parsePurchaseFromRawGmailMessage({ messageId: id, raw });
        parsed++;
      } catch (error) {
        parserError = error instanceof Error ? error.message : String(error);
        console.error(`Parser error for message ${id}:`, parserError);
        // Continue to create transaction record with error logged
        purchase = {
          messageId: id,
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
      }

      tx = await prisma.emailTransaction.upsert({
        where: { provider_messageId: { provider: "GMAIL", messageId: id } },
        create: {
          userId,
          provider: "GMAIL",
          messageId: id,
          merchant: purchase!.merchant,
          fromEmail: purchase!.fromEmail ?? null,
          subject: purchase!.subject ?? null,
          purchasedAt: purchase!.purchasedAt ?? null,
          orderId: purchase!.orderId ?? null,
          totalCents: purchase!.totalCents ?? null,
          currency: (purchase!.currency ?? "CAD").toUpperCase(),
          items: purchase!.items ? (purchase!.items as unknown as Prisma.InputJsonValue) : undefined,
          rawSource: purchase!.rawSource,
          parserError,
        },
        update: {
          merchant: purchase!.merchant,
          fromEmail: purchase!.fromEmail ?? null,
          subject: purchase!.subject ?? null,
          purchasedAt: purchase!.purchasedAt ?? null,
          orderId: purchase!.orderId ?? null,
          totalCents: purchase!.totalCents ?? null,
          currency: (purchase!.currency ?? "CAD").toUpperCase(),
          items: purchase!.items ? (purchase!.items as unknown as Prisma.InputJsonValue) : undefined,
          rawSource: purchase!.rawSource,
          parserError,
        },
      });

      // Save receipt attachments (if parser provided them)
      const attachments = (purchase as unknown as { attachments?: { filename: string; mimetype?: string; content: Buffer }[] }).attachments;
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            // Filter for PDF and image attachments
            if (attachment.mimetype && (attachment.mimetype.startsWith('image/') || attachment.mimetype === 'application/pdf')) {
              const storagePath = await saveReceiptAttachment(
                userId,
                tx.id,
                attachment.filename,
                attachment.content
              );

              // Create ReceiptDocument record
              await prisma.receiptDocument.create({
                data: {
                  userId,
                  emailTransactionId: tx.id,
                  filename: attachment.filename,
                  contentType: attachment.mimetype,
                  storagePath,
                  sizeBytes: attachment.content.length,
                },
              });
            }
          } catch (error) {
            console.error(`Failed to save attachment ${attachment.filename}:`, error);
            // Don't fail the entire transaction if attachment storage fails
          }
        }
      }

      transactionsUpserted++;
    } else {
      already++;
    }

    // Create suggestion if missing
    const existingSuggestion = await prisma.automationSuggestion.findUnique({
      where: { userId_primaryMessageId: { userId, primaryMessageId: id } },
    });

    if (!existingSuggestion && tx) {
      const subj = (tx.subject ?? "").toLowerCase();
      const merch = (tx.merchant ?? "").toLowerCase();
      const type =
        subj.includes("bill") || subj.includes("statement") || subj.includes("invoice")
          ? "BILL"
          : subj.includes("subscription") || subj.includes("renew") || merch.includes("netflix") || merch.includes("spotify")
          ? "SUBSCRIPTION"
          : "RETURN";

      const detected = tx.purchasedAt ?? new Date();
      const detectedISO = detected.toISOString().slice(0, 10);

      const draft: Record<string, unknown> = {};
      if (type === "RETURN") {
        const purchaseDate = detectedISO;
        const returnWindowDays = 30;
        const rb = new Date(purchaseDate + "T00:00:00.000Z");
        rb.setUTCDate(rb.getUTCDate() + returnWindowDays);
        draft.purchaseDate = purchaseDate;
        draft.returnWindowDays = returnWindowDays;
        draft.returnBy = rb.toISOString().slice(0, 10);
      }
      if (type === "SUBSCRIPTION") {
        const rd = new Date(detectedISO + "T00:00:00.000Z");
        rd.setUTCDate(rd.getUTCDate() + 30);
        draft.cadence = "MONTHLY";
        draft.renewalDate = rd.toISOString().slice(0, 10);
      }
      if (type === "BILL") {
        const due = new Date(detectedISO + "T00:00:00.000Z");
        due.setUTCDate(due.getUTCDate() + 7);
        draft.dueDayOfMonth = due.getUTCDate();
        draft.autopay = false;
      }

      await prisma.automationSuggestion.create({
        data: {
          userId,
          provider: "GMAIL",
          primaryMessageId: id,
          type,
          status: "NEW",
          merchant: tx.merchant,
          amountCents: tx.totalCents ?? null,
          currency: tx.currency ?? "CAD",
          detectedDate: detected,
          confidence: "MEDIUM",
          reasons: [`Built from transaction (${tx.rawSource})`],
          messageIds: [id],
          draft: draft as Prisma.InputJsonValue,
        },
      });

      suggestionsCreated++;
    }
  }

  return NextResponse.json({
    ok: true,
    // keep UI-compatible fields
    importedEmails: transactionsUpserted,
    skipped: already,
    suggestionsCreated,

    // extra debug fields
    query: q,
    listed: ids.length,
    alreadyScanned: already,
    parsed,
    transactionsUpserted,
  });
}
