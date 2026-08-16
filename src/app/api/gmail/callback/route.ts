//exchange code, sotre tokens, store email

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { oauthClient } from "@/lib/gmailClient";
import { encryptConnectionSecrets } from "@/lib/security/emailConnectionSecrets";
import { isValidOAuthState, OAUTH_STATE_COOKIE } from "@/lib/security/oauthState";

export const runtime = "nodejs";

function resolveAppUrl(): string {
  const configured = process.env.APP_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must be set in production");
  }
  return "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Delete the cookie regardless of outcome — it's single-use either way.
  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!isValidOAuthState(storedState, state)) {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }

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
      ...encryptConnectionSecrets(userId, {
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? null,
      }),
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
      scopes: tokens.scope ?? null,
    },
    update: {
      provider: "GMAIL",
      emailAddress: me.data.email ?? null,
      ...encryptConnectionSecrets(userId, {
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? undefined, // only comes on first consent
      }),
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
      scopes: tokens.scope ?? null,
    },
  });

  return NextResponse.redirect(`${resolveAppUrl()}/dashboard/settings/automation?connected=1`);
}
