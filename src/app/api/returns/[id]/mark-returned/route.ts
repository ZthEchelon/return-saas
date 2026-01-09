//endpoint for mark returned  mark refunded

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const trackingNumber =
    typeof body?.trackingNumber === "string" && body.trackingNumber.trim().length > 0
      ? body.trackingNumber.trim()
      : null;

  const item = await prisma.returnItem.findFirst({ where: { id, userId } });
  if (!item) return new NextResponse("Not found", { status: 404 });

  const now = new Date();

  const dropoff = item.dropoffDate ?? now;
  const expected = item.refundExpectedBy ?? addDaysUTC(dropoff, 7); // default: 7 days after return

  const updated = await prisma.returnItem.update({
    where: { id },
    data: {
      status: "DROPPED_OFF",
      dropoffDate: dropoff,
      refundExpectedBy: expected,
      trackingNumber,
    },
  });

  return NextResponse.json({ ok: true, returnItem: updated });
}
