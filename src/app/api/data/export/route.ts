import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/data-access/prisma";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const [purchases, returns, subscriptions, bills] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId },
      include: { items: true, attachments: true },
      orderBy: { purchasedAt: "desc" },
    }),
    prisma.returnItem.findMany({ where: { userId }, orderBy: { returnBy: "desc" } }),
    prisma.subscription.findMany({ where: { userId }, orderBy: { renewalDate: "desc" } }),
    prisma.bill.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    purchases,
    returns,
    subscriptions,
    bills,
  };

  const json = JSON.stringify(payload, null, 2);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=looply-export.json",
    },
  });
}
