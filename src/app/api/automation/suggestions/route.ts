import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { scheduleBillDueSoon, scheduleReturnDeadlineSoon, scheduleSubscriptionRenewalSoon } from "@/lib/notifications/domainScheduler";
import type { InputJsonValue } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

function isoDateOnlyToUTC(dateOnly: string) {
  // expects YYYY-MM-DD
  return new Date(dateOnly + "T00:00:00.000Z");
}

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function toCents(n: unknown) {
  if (typeof n === "number" && Number.isFinite(n)) return Math.max(0, Math.floor(n));
  return null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const rows = await prisma.automationSuggestion.findMany({
    where: { userId, status: "NEW" },
    orderBy: { detectedDate: "desc" },
    take: 200,
  });

  return NextResponse.json({ suggestions: rows });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { id, action, draft } = body as {
    id: string;
    action: "CONFIRM" | "IGNORE";
    draft?: Record<string, unknown>;
  };

  if (!id || !action) return NextResponse.json({ error: "Missing id/action" }, { status: 400 });

  const s = await prisma.automationSuggestion.findFirst({ where: { id, userId } });
  if (!s) return new NextResponse("Not found", { status: 404 });

  // Idempotency
  if (s.status !== "NEW") return NextResponse.json({ ok: true, alreadyHandled: true });

  if (action === "IGNORE") {
    await prisma.automationSuggestion.update({
      where: { id },
      data: { status: "IGNORED" },
    });
    return NextResponse.json({ ok: true });
  }

  // CONFIRM: merge any edits from UI into stored draft
  const storedDraft = (s.draft as Record<string, unknown> | null) ?? {};
  const mergedDraft = { ...storedDraft, ...(draft ?? {}) };

  const type = s.type as "RETURN" | "SUBSCRIPTION" | "BILL";
  const merchant = (mergedDraft.merchant ?? s.merchant) as string;
  const currency = String(mergedDraft.currency ?? s.currency ?? "CAD").toUpperCase();

  const amountCents =
    toCents(mergedDraft.amountCents) ??
    (typeof s.amountCents === "number" ? s.amountCents : null);

  // --- Create real records based on suggestion type ---
  if (type === "RETURN") {
    const purchaseDateStr = String(mergedDraft.purchaseDate ?? "").slice(0, 10);
    const windowDays = Number.isFinite(Number(mergedDraft.returnWindowDays))
      ? Math.max(1, Number(mergedDraft.returnWindowDays))
      : 30;

    if (!purchaseDateStr) {
      return NextResponse.json({ error: "Return requires draft.purchaseDate (YYYY-MM-DD)" }, { status: 400 });
    }

    const purchaseDate = isoDateOnlyToUTC(purchaseDateStr);

    let returnBy: Date;
    const returnByStr = String(mergedDraft.returnBy ?? "").slice(0, 10);
    if (returnByStr) returnBy = isoDateOnlyToUTC(returnByStr);
    else returnBy = addDaysUTC(purchaseDate, windowDays);

    const createdReturn = await prisma.returnItem.create({
      data: {
        userId,
        store: merchant,
        itemNote: typeof mergedDraft.itemNote === "string" ? mergedDraft.itemNote : null,
        amountCents,
        currency,
        purchaseDate,
        returnWindowDays: windowDays,
        returnBy,
        status: "NOT_STARTED",
        dropoffDate: null,
        refundedDate: null,
        trackingNumber: typeof mergedDraft.trackingNumber === "string" && mergedDraft.trackingNumber.trim().length > 0
          ? mergedDraft.trackingNumber.trim()
          : null,
        refundExpectedBy: null,
        refundAmountCents: null,
      },
    });

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
  }

  if (type === "SUBSCRIPTION") {
    const renewalDateStr = String(mergedDraft.renewalDate ?? "").slice(0, 10);
    if (!renewalDateStr) {
      return NextResponse.json({ error: "Subscription requires draft.renewalDate (YYYY-MM-DD)" }, { status: 400 });
    }

    const renewalDate = isoDateOnlyToUTC(renewalDateStr);
    const cadenceRaw = String(mergedDraft.cadence ?? "MONTHLY").toUpperCase();
    const cadence: "MONTHLY" | "YEARLY" | "CUSTOM" =
      cadenceRaw === "YEARLY" || cadenceRaw === "CUSTOM" ? (cadenceRaw as typeof cadence) : "MONTHLY";

    const createdSub = await prisma.subscription.create({
      data: {
        userId,
        name: merchant,
        amountCents: amountCents ?? 0,
        currency,
        renewalDate,
        cadence,
        status: "ACTIVE",
      },
    });

    await scheduleSubscriptionRenewalSoon({
      userId,
      subscriptionId: createdSub.id,
      name: createdSub.name,
      renewalDate: createdSub.renewalDate,
      amountCents: createdSub.amountCents,
      currency: createdSub.currency,
    });
  }

  if (type === "BILL") {
    const dueDayOfMonth = Number.isFinite(Number(mergedDraft.dueDayOfMonth))
      ? Math.min(28, Math.max(1, Number(mergedDraft.dueDayOfMonth)))
      : 1;

    const createdBill = await prisma.bill.create({
      data: {
        userId,
        name: merchant,
        amountCents,
        currency,
        dueDayOfMonth,
        autopay: Boolean(mergedDraft.autopay ?? false),
        status: "ACTIVE",
      },
    });

    await scheduleBillDueSoon({
      userId,
      billId: createdBill.id,
      name: createdBill.name,
      dueDayOfMonth: createdBill.dueDayOfMonth,
      amountCents: createdBill.amountCents,
      currency: createdBill.currency,
    });
  }

  // Mark suggestion confirmed (store merged draft edits too)
  await prisma.automationSuggestion.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      merchant,
      amountCents,
      currency,
      draft: mergedDraft as InputJsonValue,
    },
  });

  return NextResponse.json({ ok: true });
}
