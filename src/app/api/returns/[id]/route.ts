 //update return endpoint (droped off / refunded)

 import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
// avoid importing prisma enums directly; use string unions matching schema

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const id = ctx.params.id;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const data: {
    store?: string;
    itemNote?: string | null;
    amountCents?: number | null;
    currency?: string;
    purchaseDate?: Date;
    returnWindowDays?: number;
    returnBy?: Date;
    status?: "NOT_STARTED" | "PACKED" | "DROPPED_OFF" | "REFUNDED";
    dropoffDate?: Date | null;
    refundedDate?: Date | null;
  } = {};
  if (typeof body.store === "string") data.store = body.store;
  if (typeof body.itemNote === "string" || body.itemNote === null) data.itemNote = body.itemNote;
  if (typeof body.amountCents === "number" || body.amountCents === null) data.amountCents = body.amountCents;
  if (typeof body.currency === "string") data.currency = body.currency;

  if (typeof body.purchaseDate === "string") {
    const pd = new Date(body.purchaseDate);
    if (Number.isNaN(pd.getTime())) return NextResponse.json({ error: "purchaseDate invalid" }, { status: 400 });
    data.purchaseDate = pd;
  }

  if (typeof body.returnWindowDays === "number") {
    const wd = body.returnWindowDays;
    if (!Number.isFinite(wd) || wd <= 0) return NextResponse.json({ error: "returnWindowDays invalid" }, { status: 400 });
    data.returnWindowDays = wd;
  }

  // recompute returnBy if purchaseDate or returnWindowDays changes
  if (data.purchaseDate || data.returnWindowDays) {
    const current = await prisma.returnItem.findFirst({ where: { id, userId } });
    if (!current) return new NextResponse("Not found", { status: 404 });

    const pd = data.purchaseDate ?? current.purchaseDate;
    const wd = data.returnWindowDays ?? current.returnWindowDays;

    const rb = new Date(pd.getTime());
    rb.setUTCDate(rb.getUTCDate() + wd);
    data.returnBy = rb;
  }

  if (typeof body.status === "string") {
    if (!["NOT_STARTED", "PACKED", "DROPPED_OFF", "REFUNDED"].includes(body.status)) {
      return NextResponse.json({ error: "status invalid" }, { status: 400 });
    }
    data.status = body.status as "NOT_STARTED" | "PACKED" | "DROPPED_OFF" | "REFUNDED";
  }

  if (typeof body.dropoffDate === "string" || body.dropoffDate === null) {
    data.dropoffDate = body.dropoffDate ? new Date(body.dropoffDate) : null;
  }

  if (typeof body.refundedDate === "string" || body.refundedDate === null) {
    data.refundedDate = body.refundedDate ? new Date(body.refundedDate) : null;
  }

  const updated = await prisma.returnItem.updateMany({
    where: { id, userId },
    data,
  });

  if (updated.count === 0) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json({ ok: true });
}
