import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthedGmail } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { parsePurchaseFromRawGmailMessage } from "@/lib/receipts/parser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const days = Number(body?.days ?? 90);
  const max = Number(body?.max ?? 200);

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

  for (const id of ids) {
    const existingTx = await prisma.emailTransaction.findFirst({
      where: { userId, provider: "GMAIL", messageId: id },
      select: { id: true },
    });

    if (existingTx) {
      already++;
      continue;
    }

    const msg = await gmail.users.messages.get({ userId: "me", id, format: "raw" });
    const raw = msg.data.raw;
    if (!raw) continue;

    const purchase = await parsePurchaseFromRawGmailMessage({ messageId: id, raw });
    parsed++;

    await prisma.emailTransaction.upsert({
      where: { provider_messageId: { provider: "GMAIL", messageId: id } },
      create: {
        userId,
        provider: "GMAIL",
        messageId: id,
        merchant: purchase.merchant,
        fromEmail: purchase.fromEmail ?? null,
        subject: purchase.subject ?? null,
        purchasedAt: purchase.purchasedAt ?? null,
        orderId: purchase.orderId ?? null,
        totalCents: purchase.totalCents ?? null,
        currency: (purchase.currency ?? "CAD").toUpperCase(),
        items: purchase.items ?? null,
        rawSource: purchase.rawSource,
      },
      update: {},
    });

    transactionsUpserted++;
  }

  return NextResponse.json({
    ok: true,
    query: q,
    listed: ids.length,
    alreadyScanned: already,
    parsed,
    transactionsUpserted,
  });
}
