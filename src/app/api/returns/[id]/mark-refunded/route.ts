import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const refundAmountCents =
    typeof body?.refundAmountCents === "number" ? Math.max(0, Math.floor(body.refundAmountCents)) : undefined;

  const item = await prisma.returnItem.findFirst({ where: { id, userId } });
  if (!item) return new NextResponse("Not found", { status: 404 });

  const updated = await prisma.returnItem.update({
    where: { id },
    data: {
      status: "REFUNDED",
      refundedDate: item.refundedDate ?? new Date(),
      refundAmountCents: refundAmountCents ?? item.refundAmountCents ?? null,
    },
  });

  return NextResponse.json({ ok: true, returnItem: updated });
}
