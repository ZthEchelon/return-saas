//gmail helpers

import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export async function getAuthedGmail(userId: string) {
  const conn = await prisma.emailConnection.findUnique({ where: { userId } });
  if (!conn) return null;

  const hasAccess = Boolean(conn.accessToken);
  const hasRefresh = Boolean(conn.refreshToken);

  // if access token is expired and we have no refresh token -> must reconnect
  if (!hasRefresh && conn.expiry && conn.expiry.getTime() <= Date.now()) {
    return null;
  }

  if (!hasAccess && !hasRefresh) return null;

  const oauth2 = oauthClient();
  oauth2.setCredentials({
    access_token: conn.accessToken ?? undefined,
    refresh_token: conn.refreshToken ?? undefined,
    expiry_date: conn.expiry ? conn.expiry.getTime() : undefined,
  });

  oauth2.on("tokens", async (t) => {
    await prisma.emailConnection.update({
      where: { userId },
      data: {
        accessToken: t.access_token ?? conn.accessToken,
        refreshToken: t.refresh_token ?? conn.refreshToken, // keep existing if missing
        expiry: t.expiry_date ? new Date(t.expiry_date) : conn.expiry,
      },
    });
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  return { gmail, oauth2, conn };
}
