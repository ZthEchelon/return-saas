import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/data-access/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const purchase = await prisma.purchase.findFirst({
    where: { id, userId },
    include: { items: true, attachments: true, returns: true },
  });

  if (!purchase) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json({ purchase });
}
