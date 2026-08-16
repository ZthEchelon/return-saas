import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/data-access/prisma";

function isoUTCDate(y: number, mZero: number, d: number) {
  return new Date(Date.UTC(y, mZero, d));
}

function todayUTC() {
  const now = new Date();
  return isoUTCDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function addDaysUTC(base: Date, days: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function seed() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const t = todayUTC();
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();

  // Prefer current-month anchor dates
  let renewalDate = isoUTCDate(y, m, 15);
  if (renewalDate < t) renewalDate = addDaysUTC(t, 2);

  let returnBy = isoUTCDate(y, m, 25);
  if (returnBy < t) returnBy = addDaysUTC(t, 10);

  const purchaseDate = addDaysUTC(returnBy, -14);

  // Avoid duplicates
  const [existingSub, existingRet] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId, name: "Netflix", status: "ACTIVE" },
      select: { id: true },
    }),
    prisma.returnItem.findFirst({
      where: { userId, store: "Nike", itemNote: "Air Max" },
      select: { id: true },
    }),
  ]);

  const sub =
    existingSub ??
    (await prisma.subscription.create({
      data: {
        userId,
        name: "Netflix",
        amountCents: 2099,
        currency: "CAD",
        renewalDate,
        cadence: "MONTHLY",
        status: "ACTIVE",
      },
      select: { id: true },
    }));

  const ret =
    existingRet ??
    (await prisma.returnItem.create({
      data: {
        userId,
        store: "Nike",
        itemNote: "Air Max",
        amountCents: 18500,
        currency: "CAD",
        purchaseDate,
        returnWindowDays: 30,
        returnBy,
        status: "NOT_STARTED",
      },
      select: { id: true },
    }));

  return NextResponse.json({
    ok: true,
    created: {
      subscriptionId: sub.id,
      returnId: ret.id,
    },
    dates: {
      renewalDate: renewalDate.toISOString().slice(0, 10),
      returnBy: returnBy.toISOString().slice(0, 10),
    },
  });
}

export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not allowed", { status: 403 });
  return seed();
}

export async function POST() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not allowed", { status: 403 });
  return seed();
}
