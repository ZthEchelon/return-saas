import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const subscriptionId = params.id;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { detectedItemId } = body as { detectedItemId?: string };
  if (!detectedItemId) return NextResponse.json({ error: "detectedItemId required" }, { status: 400 });

  const sub = await prisma.subscription.findFirst({ where: { id: subscriptionId, userId } });
  if (!sub) return new NextResponse("Not found", { status: 404 });

  const item = await prisma.detectedItem.findFirst({ where: { id: detectedItemId, userId } });
  if (!item) return new NextResponse("Not found", { status: 404 });

  await prisma.detectedItem.update({
    where: { id: detectedItemId },
    data: {
      status: "CONFIRMED",
      subscriptionId: sub.id,
    },
  });

  return NextResponse.json({ ok: true });
}
