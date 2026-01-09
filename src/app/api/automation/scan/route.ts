//api in memory suggestion store + scan generator

// post scan -> generates suggestions

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { Suggestion } from "@/lib/automation";

const mem = globalThis as unknown as {
  __suggestions?: Map<string, Suggestion[]>;
};
const store = (mem.__suggestions ??= new Map<string, Suggestion[]>());

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function gen(userId: string): Suggestion[] {
  // deterministic-ish demo suggestions
  const base = todayISO();
  const id = (s: string) => `${userId}_${s}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  return [
    {
      id: id("nike"),
      type: "RETURN",
      merchant: "Nike",
      amountCents: 18500,
      currency: "CAD",
      detectedDate: base,
      confidence: "HIGH",
      reasons: ["Order confirmation email", "Matched merchant defaults (30 days)"],
      source: { provider: "gmail", messageIds: ["msg_nike_1", "msg_nike_2"] },
      draft: {
        purchaseDate: addDaysISO(-3),
        returnWindowDays: 30,
        returnBy: addDaysISO(27),
      },
      status: "NEW",
    },
    {
      id: id("netflix"),
      type: "SUBSCRIPTION",
      merchant: "Netflix",
      amountCents: 2099,
      currency: "CAD",
      detectedDate: base,
      confidence: "HIGH",
      reasons: ["Receipt pattern repeats monthly", "Found 3 similar receipts"],
      source: { provider: "gmail", messageIds: ["msg_nf_1", "msg_nf_2", "msg_nf_3"] },
      draft: {
        cadence: "MONTHLY",
        renewalDate: addDaysISO(10),
      },
      status: "NEW",
    },
    {
      id: id("hydro"),
      type: "BILL",
      merchant: "Hydro One",
      amountCents: 0, // variable; let user override later
      currency: "CAD",
      detectedDate: base,
      confidence: "MEDIUM",
      reasons: ["Utility invoice wording detected", "Merchant matches known bill category"],
      source: { provider: "gmail", messageIds: ["msg_hydro_1"] },
      draft: {
        dueDayOfMonth: Math.min(new Date().getUTCDate() + 7, 28),
        autopay: false,
      },
      status: "NEW",
    },
  ];
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existing = store.get(userId) ?? [];
  const fresh = gen(userId);

  // Keep existing ignored/confirmed; replace NEW with fresh for demo
  const keep = existing.filter((s) => s.status !== "NEW");
  store.set(userId, [...keep, ...fresh]);

  return NextResponse.json({
    ok: true,
    found: fresh.length,
  });
}
