//api endpoint for disconnections

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/data-access/prisma";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  await prisma.emailConnection.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true });
}
