// Get automation suggestions + confirm/ignore actions
// GET: Fetch all NEW suggestions for user from database
// POST: CONFIRM creates actual return/subscription/bill records, IGNORE just marks status

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { SuggestionType } from "@/lib/automation";

type Draft = {
  purchaseDate?: string;
  returnBy?: string;
  returnWindowDays?: number;
  renewalDate?: string;
  cadence?: "MONTHLY" | "YEARLY";
  dueDayOfMonth?: number;
  autopay?: boolean;
  itemNote?: string | null;
};

// Helper to convert ISO date string to Date
function isoToDate(s: string) {
  return new Date(s + "T00:00:00.000Z");
}

// Helper to create actual records (returns, subscriptions, bills) from automation suggestion
async function createFromSuggestion(userId: string, suggestion: {
  type: SuggestionType;
  merchant: string;
  amountCents?: number | null;
  currency?: string;
  draft?: Draft;
}) {
  const draft = suggestion.draft ?? {};

  if (suggestion.type === "SUBSCRIPTION") {
    const renewalDate = typeof draft.renewalDate === "string" ? draft.renewalDate : new Date().toISOString().slice(0, 10);
    const cadence = draft.cadence === "YEARLY" ? "YEARLY" : "MONTHLY";
    await prisma.subscription.create({
      data: {
        userId,
        name: suggestion.merchant,
        amountCents: suggestion.amountCents ?? 0,
        currency: suggestion.currency ?? "CAD",
        renewalDate: isoToDate(renewalDate),
        cadence,
        status: "ACTIVE",
      },
    });
    return;
  }

  if (suggestion.type === "RETURN") {
    const purchaseDate = typeof draft.purchaseDate === "string" ? draft.purchaseDate : new Date().toISOString().slice(0, 10);
    const returnBy = typeof draft.returnBy === "string" ? draft.returnBy : purchaseDate;
    const windowDays = typeof draft.returnWindowDays === "number" ? draft.returnWindowDays : 30;
    await prisma.returnItem.create({
      data: {
        userId,
        store: suggestion.merchant,
        itemNote: draft.itemNote ?? null,
        amountCents: suggestion.amountCents ?? null,
        currency: suggestion.currency ?? "CAD",
        purchaseDate: isoToDate(purchaseDate),
        returnWindowDays: windowDays,
        returnBy: isoToDate(returnBy),
        status: "NOT_STARTED",
      },
    });
    return;
  }

  if (suggestion.type === "BILL") {
    await prisma.bill.create({
      data: {
        userId,
        name: suggestion.merchant,
        amountCents: suggestion.amountCents && suggestion.amountCents > 0 ? suggestion.amountCents : null,
        currency: suggestion.currency ?? "CAD",
        dueDayOfMonth: typeof draft.dueDayOfMonth === "number" ? draft.dueDayOfMonth : 1,
        autopay: Boolean(draft.autopay ?? false),
        status: "ACTIVE",
      },
    });
    return;
  }
}

// GET: Fetch all NEW suggestions for the authenticated user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const suggestions = await prisma.automationSuggestion.findMany({
    where: { userId, status: "NEW" },
    orderBy: { detectedDate: "desc" },
  });

  return NextResponse.json({ suggestions });
}

// POST: Handle CONFIRM (create actual record) or IGNORE (skip suggestion) actions
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { id, action, draft } = body as {
    id: string;
    action: "CONFIRM" | "IGNORE";
    draft?: Draft;
  };

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  // Find the suggestion
  const suggestion = await prisma.automationSuggestion.findUnique({
    where: { id },
  });

  if (!suggestion || suggestion.userId !== userId) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Handle IGNORE: just mark as IGNORED
  if (action === "IGNORE") {
    await prisma.automationSuggestion.update({
      where: { id },
      data: { status: "IGNORED" },
    });
    return NextResponse.json({ ok: true });
  }

  // Handle CONFIRM: merge draft overrides and create the actual record
  if (action === "CONFIRM") {
    const baseDraft = (suggestion.draft ?? {}) as Draft;
    const merged = { ...baseDraft, ...(draft ?? {}) };

    try {
      await createFromSuggestion(userId, {
        type: suggestion.type as SuggestionType,
        merchant: suggestion.merchant,
        amountCents: suggestion.amountCents,
        currency: suggestion.currency,
        draft: merged,
      });

      // Mark suggestion as CONFIRMED
      await prisma.automationSuggestion.update({
        where: { id },
        data: { status: "CONFIRMED" },
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Error creating record from suggestion:", error);
      return NextResponse.json(
        { error: "Failed to create record" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
