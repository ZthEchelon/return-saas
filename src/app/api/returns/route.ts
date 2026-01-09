//return endpoint

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { scheduleReturnDeadlineSoon } from "@/lib/notifications/domainScheduler";

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
    returnBy,
  } = body;

  if (!store || typeof store !== "string") return NextResponse.json({ error: "store required" }, { status: 400 });
  if (!purchaseDate || typeof purchaseDate !== "string") return NextResponse.json({ error: "purchaseDate required" }, { status: 400 });

  const pd = new Date(purchaseDate);
  if (Number.isNaN(pd.getTime())) return NextResponse.json({ error: "purchaseDate invalid" }, { status: 400 });

  const windowDays = Number(returnWindowDays);
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return NextResponse.json({ error: "returnWindowDays invalid" }, { status: 400 });
  }

  let rb: Date;
  if (typeof returnBy === "string" && returnBy.length > 0) {
    rb = new Date(returnBy);
    if (Number.isNaN(rb.getTime())) return NextResponse.json({ error: "returnBy invalid" }, { status: 400 });
  } else {
    rb = new Date(pd.getTime());
    rb.setUTCDate(rb.getUTCDate() + windowDays);
  }

  const created = await prisma.returnItem.create({
    data: {
      userId,
      store,
      itemNote: itemNote ?? null,
      amountCents: typeof amountCents === "number" ? amountCents : null,
      currency,
      purchaseDate: pd,
      returnWindowDays: windowDays,
      returnBy: rb,
      status: "NOT_STARTED",
    },
  });

  await scheduleReturnDeadlineSoon({
    userId,
    returnId: created.id,
    store: created.store,
    itemNote: created.itemNote,
    returnBy: created.returnBy,
    amountCents: created.amountCents,
    currency: created.currency,
    status: created.status,
  });

  return NextResponse.json({ returnItem: created });
}
