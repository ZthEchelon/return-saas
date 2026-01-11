import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { refreshShipmentTimeline } from "@/lib/domain/shipping/tracking";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const ret = await prisma.returnItem.findFirst({ where: { id, userId } });
  if (!ret) return new NextResponse("Not found", { status: 404 });

  if (!ret.trackingNumber) {
    return NextResponse.json({ error: "No tracking attached" }, { status: 400 });
  }

  const refresh = await refreshShipmentTimeline({ userId, returnId: id });

  return NextResponse.json({
    ok: true,
    returnItem: refresh.returnItem,
    eventsAdded: refresh.eventsAdded,
  });
}
