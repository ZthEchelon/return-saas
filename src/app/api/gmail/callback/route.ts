//exchange code, sotre tokens, store email

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { oauthClient } from "@/lib/gmailClient";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return new NextResponse("Missing code", { status: 400 });

  const oauth2 = oauthClient();
  const { tokens } = await oauth2.getToken(code);

  // Get user email
  oauth2.setCredentials(tokens);
  const oauthApi = google.oauth2({ version: "v2", auth: oauth2 });
  const me = await oauthApi.userinfo.get();

  await prisma.emailConnection.upsert({
    where: { userId },
    create: {
      userId,
      provider: "GMAIL",
      emailAddress: me.data.email ?? null,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
    },
    update: {
      provider: "GMAIL",
      emailAddress: me.data.email ?? null,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? undefined, // only comes on first consent
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
    },
  });

  return NextResponse.redirect("http://localhost:3000/dashboard/settings/automation?connected=1");
}
