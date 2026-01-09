//return endpoint

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    store,
    itemNote,
    amountCents,
    currency = "CAD",
    purchaseDate,
    returnWindowDays = 30,
  } = body;

  if (!store || typeof store !== "string") return NextResponse.json({ error: "store required" }, { status: 400 });
  if (!purchaseDate || typeof purchaseDate !== "string") return NextResponse.json({ error: "purchaseDate required" }, { status: 400 });

  const pd = new Date(purchaseDate);
  if (Number.isNaN(pd.getTime())) return NextResponse.json({ error: "purchaseDate invalid" }, { status: 400 });

  const windowDays = Number(returnWindowDays);
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return NextResponse.json({ error: "returnWindowDays invalid" }, { status: 400 });
  }

  const returnBy = new Date(pd.getTime());
  returnBy.setUTCDate(returnBy.getUTCDate() + windowDays);

  const created = await prisma.returnItem.create({
    data: {
      userId,
      store,
      itemNote: itemNote ?? null,
      amountCents: typeof amountCents === "number" ? amountCents : null,
      currency,
      purchaseDate: pd,
      returnWindowDays: windowDays,
      returnBy,
      status: "NOT_STARTED",
    },
  });

  return NextResponse.json({ returnItem: created });
}
