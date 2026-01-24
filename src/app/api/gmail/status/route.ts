//status + disconnect 

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const conn = await prisma.emailConnection.findUnique({ where: { userId } });

  const hasRefresh = Boolean(conn?.refreshToken);
  const hasAccess = Boolean(conn?.accessToken);
  const notExpired = conn?.expiry ? conn.expiry.getTime() > Date.now() : true;

  return NextResponse.json({
    connected: hasRefresh || (hasAccess && notExpired),
    needsReauth: !hasRefresh && (!hasAccess || !notExpired),
    emailAddress: conn?.emailAddress ?? null,
    scope: conn?.scope ?? null,
    scopes: conn?.scopes ?? null,
    scanMode: conn?.scanMode ?? "ALL",
    lastScanAt: conn?.lastScanAt ?? null,
  });
}
