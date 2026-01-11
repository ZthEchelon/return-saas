import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { parsePurchaseFromRawGmailMessage } from "@/lib/receipts/gmailPurchaseParser";
import { saveReceiptAttachment } from "@/lib/receipts/receiptAttachmentStorage";
import { getAuthedImap } from "@/lib/services/imapClient";

type TrackingHit = { trackingNumber: string; carrier?: string };

function bufferToBase64Url(buf: Buffer) {
  const b64 = buf.toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function detectTrackingNumbers(text: string): TrackingHit[] {
  const hits = new Map<string, TrackingHit>();
  const lines = text.split(/\r?\n/).slice(0, 400);
  const carriers = [
    { carrier: "UPS", regex: /\b1Z[0-9A-Z]{16}\b/gi },
    { carrier: "FedEx", regex: /\b\d{12,15}\b/g },
    { carrier: "USPS", regex: /\b9\d{15,21}\b/g },
    { carrier: "DHL", regex: /\b[A-Z]{3}\d{9}\b/gi },
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const relevant = /track|ups|fedex|usps|dhl|canada post|parcel/.test(lower);
    if (!relevant) continue;

    for (const pattern of carriers) {
      const matches = line.match(pattern.regex) ?? [];
      for (const m of matches) {
        const key = m.trim();
        if (!hits.has(key)) hits.set(key, { trackingNumber: key, carrier: pattern.carrier });
      }
    }

    if (/tracking/.test(lower)) {
      const generic = [...line.matchAll(/[A-Z0-9]{10,24}/g)];
      for (const g of generic) {
        const val = g[0];
        if (val.length < 12) continue;
        if (!hits.has(val)) hits.set(val, { trackingNumber: val });
      }
    }
  }

  return Array.from(hits.values());
}

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

  const authedImap = await getAuthedImap(userId);
  if (!authedImap) return NextResponse.json({ error: "IMAP not connected; add credentials at /api/imap/credentials" }, { status: 400 });

  let already = 0;
  let parsed = 0;
  let transactionsUpserted = 0;
  let suggestionsCreated = 0;
  let fetched = 0;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (Number.isFinite(days) ? days : 90));

  try {
    const messages: { uid: number; raw: Buffer; subject?: string | null; from?: string | null; internalDate?: Date | null; messageId: string }[] = [];
    for await (const msg of authedImap.client.fetch({ since }, { uid: true, envelope: true, internalDate: true, source: true })) {
      if (messages.length >= Math.min(Number.isFinite(max) ? max : 200, 500)) break;
      if (!msg.source) continue;
      const messageId = msg.envelope?.messageId ?? `uid-${msg.uid}`;
      const from = msg.envelope?.from?.[0]?.address ?? null;
      const subject = msg.envelope?.subject ?? null;
      messages.push({ uid: msg.uid, raw: msg.source as Buffer, subject, from, internalDate: msg.internalDate ? new Date(msg.internalDate) : null, messageId });
    }

    fetched = messages.length;

    for (const msg of messages) {
      let tx = await prisma.emailTransaction.findUnique({
        where: { provider_messageId: { provider: "GMAIL", messageId: msg.messageId } },
      });
      let purchase: Awaited<ReturnType<typeof parsePurchaseFromRawGmailMessage>> | null = null;
      const decoded = msg.raw.toString("utf8");
      let trackingHits: TrackingHit[] = [];

      if (!tx || reprocess) {
        trackingHits = detectTrackingNumbers(decoded);

        let parserError: string | null = null;
        try {
          purchase = await parsePurchaseFromRawGmailMessage({ messageId: msg.messageId, raw: bufferToBase64Url(msg.raw) });
          parsed++;
        } catch (error) {
          parserError = error instanceof Error ? error.message : String(error);
          console.error(`Parser error for message ${msg.messageId}:`, parserError);
          purchase = {
            messageId: msg.messageId,
            merchant: "Parse Failed",
            rawSource: "text",
            fromEmail: msg.from ?? undefined,
            subject: msg.subject ?? undefined,
            purchasedAt: msg.internalDate ?? undefined,
            orderId: undefined,
            totalCents: undefined,
            currency: "CAD",
            items: undefined,
          };
        }

        tx = await prisma.emailTransaction.upsert({
          where: { provider_messageId: { provider: "GMAIL", messageId: msg.messageId } },
          create: {
            userId,
            provider: "GMAIL",
            messageId: msg.messageId,
            merchant: purchase!.merchant,
            fromEmail: purchase!.fromEmail ?? null,
            subject: purchase!.subject ?? null,
            purchasedAt: purchase!.purchasedAt ?? msg.internalDate ?? null,
            orderId: purchase!.orderId ?? null,
            totalCents: purchase!.totalCents ?? null,
            currency: (purchase!.currency ?? "CAD").toUpperCase(),
            items: purchase!.items ?? undefined,
            rawSource: purchase!.rawSource,
            parserError,
          },
          update: {
            merchant: purchase!.merchant,
            fromEmail: purchase!.fromEmail ?? null,
            subject: purchase!.subject ?? null,
            purchasedAt: purchase!.purchasedAt ?? msg.internalDate ?? null,
            orderId: purchase!.orderId ?? null,
            totalCents: purchase!.totalCents ?? null,
            currency: (purchase!.currency ?? "CAD").toUpperCase(),
            items: purchase!.items ?? undefined,
            rawSource: purchase!.rawSource,
            parserError,
          },
        });

        const attachments = (purchase as unknown as { attachments?: { filename: string; mimetype?: string; content: Buffer }[] }).attachments;
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            try {
              if (attachment.mimetype && (attachment.mimetype.startsWith("image/") || attachment.mimetype === "application/pdf")) {
                const storagePath = await saveReceiptAttachment(userId, tx.id, attachment.filename, attachment.content);
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
            }
          }
        }

        transactionsUpserted++;
      } else {
        already++;
      }

      const existingSuggestion = await prisma.automationSuggestion.findUnique({
        where: { userId_primaryMessageId: { userId, primaryMessageId: msg.messageId } },
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
          const hit = trackingHits[0];
          if (hit) {
            draft.trackingNumber = hit.trackingNumber;
            if (hit.carrier) draft.carrier = hit.carrier;
          }
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
            primaryMessageId: msg.messageId,
            type,
            status: "NEW",
            merchant: tx.merchant,
            amountCents: tx.totalCents ?? null,
            currency: tx.currency ?? "CAD",
            detectedDate: detected,
            confidence: "MEDIUM",
            reasons: [`Built from transaction (${tx.rawSource})`],
            messageIds: [msg.messageId],
            draft: draft as any,
          },
        });

        suggestionsCreated++;
      }
    }
  } finally {
    await authedImap.client.logout().catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    importedEmails: transactionsUpserted,
    skipped: already,
    suggestionsCreated,
    parsed,
    fetched,
  });
}
