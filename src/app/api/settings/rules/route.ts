import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/data-access/prisma";
import { NotificationChannel } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const rules = await prisma.userRule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { ruleType, daysBefore, channels } = body as {
    ruleType?: "RENEWAL_REMINDER";
    daysBefore?: number;
    channels?: NotificationChannel[];
  };

  if (!ruleType) return NextResponse.json({ error: "ruleType required" }, { status: 400 });

  const days = Number(daysBefore ?? 3);
  if (!Number.isFinite(days) || days < 0 || days > 60) {
    return NextResponse.json({ error: "daysBefore invalid" }, { status: 400 });
  }

  const channelList = (() => {
    const allowed = new Set<NotificationChannel>([
      NotificationChannel.EMAIL_DIGEST,
      NotificationChannel.EMAIL_IMMEDIATE,
    ]);
    const filtered = Array.isArray(channels)
      ? channels.filter((channel): channel is NotificationChannel => allowed.has(channel))
      : [];
    return filtered.length > 0 ? filtered : [NotificationChannel.EMAIL_DIGEST];
  })();

  const rule = await prisma.userRule.create({
    data: {
      userId,
      ruleType,
      daysBefore: Math.floor(days),
      channels: channelList,
    },
  });

  return NextResponse.json({ rule });
}
