import { ImapFlow } from "imapflow";
import { prisma } from "@/lib/prisma";

type ImapAuth =
  | { user: string; accessToken: string }
  | { user: string; pass: string };

export async function getAuthedImap(userId: string) {
  const conn = await prisma.emailConnection.findUnique({ where: { userId } });
  if (!conn) return null;

  const host = conn.imapHost ?? process.env.IMAP_HOST ?? "imap.gmail.com";
  const port = Number(conn.imapPort ?? process.env.IMAP_PORT ?? 993);
  const secureRaw = conn.imapSecure ?? (process.env.IMAP_SECURE ? process.env.IMAP_SECURE === "true" : undefined);
  const secure = secureRaw === undefined ? true : Boolean(secureRaw);

  const user = conn.imapUser ?? conn.emailAddress ?? process.env.IMAP_USER;
  const accessToken = conn.accessToken;
  const password = conn.imapPassword ?? process.env.IMAP_PASSWORD;

  let auth: ImapAuth | null = null;
  if (accessToken && user) {
    auth = { user, accessToken };
  } else if (user && password) {
    auth = { user, pass: password };
  }

  if (!auth) return null;

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth,
    logger: false,
  });

  await client.connect();
  return { client, conn };
}
