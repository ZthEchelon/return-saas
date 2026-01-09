//api endpoint for disconnections

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  await prisma.emailConnection.deleteMany({ where: { userId } });
  // keep imported messages/suggestions if you want; or delete them too:
  // await prisma.emailMessage.deleteMany({ where: { userId } });
  // await prisma.automationSuggestion.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true });
}
