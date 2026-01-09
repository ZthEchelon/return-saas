//get suggestions + post confirm/ignore (and create real items)

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Suggestion, SuggestionType } from "@/lib/automation";

const mem = globalThis as unknown as {
  __suggestions?: Map<string, Suggestion[]>;
};
const store = (mem.__suggestions ??= new Map<string, Suggestion[]>());

function isoToDate(s: string) {
  return new Date(s + "T00:00:00.000Z");
}

async function createFromSuggestion(userId: string, s: Suggestion) {
  if (s.type === "SUBSCRIPTION") {
    const renewalDate = s.draft.renewalDate ?? new Date().toISOString().slice(0, 10);
    await prisma.subscription.create({
      data: {
        userId,
        name: s.merchant,
        amountCents: s.amountCents ?? 0,
        currency: s.currency ?? "CAD",
        renewalDate: isoToDate(renewalDate),
        cadence: s.draft.cadence ?? "MONTHLY",
        status: "ACTIVE",
      },
    });
    return;
  }

  if (s.type === "RETURN") {
    const purchaseDate = s.draft.purchaseDate ?? new Date().toISOString().slice(0, 10);
    const returnBy = s.draft.returnBy ?? purchaseDate; // fallback
    await prisma.returnItem.create({
      data: {
        userId,
        store: s.merchant,
        itemNote: null,
        amountCents: s.amountCents ?? null,
        currency: s.currency ?? "CAD",
        purchaseDate: isoToDate(purchaseDate),
        returnWindowDays: s.draft.returnWindowDays ?? 30,
        returnBy: isoToDate(returnBy),
        status: "NOT_STARTED",
      },
    });
    return;
  }

  if (s.type === "BILL") {
    await prisma.bill.create({
      data: {
        userId,
        name: s.merchant,
        amountCents: s.amountCents && s.amountCents > 0 ? s.amountCents : null,
        currency: s.currency ?? "CAD",
        dueDayOfMonth: s.draft.dueDayOfMonth ?? 1,
        autopay: Boolean(s.draft.autopay ?? false),
        status: "ACTIVE",
      },
    });
    return;
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const list = store.get(userId) ?? [];
  return NextResponse.json({ suggestions: list });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { id, action, draft } = body as {
    id: string;
    action: "CONFIRM" | "IGNORE";
    draft?: Partial<Suggestion["draft"]> & {
      amountCents?: number;
      currency?: "CAD";
      merchant?: string;
      type?: SuggestionType;
    };
  };

  const list = store.get(userId) ?? [];
  const idx = list.findIndex((x: Suggestion) => x.id === id);
  if (idx === -1) return new NextResponse("Not found", { status: 404 });

  const current = list[idx];

  if (action === "IGNORE") {
    list[idx] = { ...current, status: "IGNORED" };
    store.set(userId, list);
    return NextResponse.json({ ok: true });
  }

  // CONFIRM: allow edits from UI before creation
  const merged: Suggestion = {
    ...current,
    merchant: draft?.merchant ?? current.merchant,
    type: (draft?.type ?? current.type) as SuggestionType,
    amountCents: draft?.amountCents ?? current.amountCents,
    currency: draft?.currency ?? current.currency,
    draft: { ...current.draft, ...((draft as Partial<Suggestion["draft"]>) ?? {}) },
  };

  await createFromSuggestion(userId, merged);

  list[idx] = { ...merged, status: "CONFIRMED" };
  store.set(userId, list);

  return NextResponse.json({ ok: true });
}
