import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED = ["CAD", "USD", "EUR", "GBP", "AUD", "NZD"]; // extend as needed

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const acct = await prisma.billingAccount.findUnique({ where: { userId }, select: { preferredCurrency: true, plan: true } });
  return NextResponse.json({ preferredCurrency: acct?.preferredCurrency ?? "CAD", plan: acct?.plan ?? "FREE" });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const currencyRaw = typeof body.preferredCurrency === "string" ? body.preferredCurrency.toUpperCase().trim() : "";
  const currency = ALLOWED.includes(currencyRaw) ? currencyRaw : null;
  if (!currency) return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });

  const account = await prisma.billingAccount.upsert({
    where: { userId },
    update: { preferredCurrency: currency },
    create: { userId, preferredCurrency: currency },
    select: { preferredCurrency: true, plan: true },
  });

  return NextResponse.json({ preferredCurrency: account.preferredCurrency, plan: account.plan });
}
