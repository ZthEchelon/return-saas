//create digest cron sends one email per user per day using the notifcationf from cron otify

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

function mustBeCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  const got = req.headers.get("x-cron-secret");
  if (got !== secret) throw new Error("Forbidden");
}

// Minimal timezone support without extra deps:
// We’ll compute “today” in user timezone using Intl.
function localDateKey(timezone: string, d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function localHour(timezone: string, d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hh = parts.find(p => p.type === "hour")?.value ?? "00";
  return Number(hh);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderDigestEmail(args: {
  appUrl: string;
  items: { title: string; body?: string | null }[];
}) {
  const { appUrl, items } = args;

  const list = items
    .map(
      i => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;">
          <div style="font-weight:600;">${escapeHtml(i.title)}</div>
          ${i.body ? `<div style="color:#555;margin-top:4px;">${escapeHtml(i.body)}</div>` : ""}
        </td>
      </tr>
    `
    )
    .join("");

  return `
  <div style="font-family: ui-sans-serif, system-ui; line-height:1.4; color:#111;">
    <h2 style="margin:0 0 8px 0;">Your Looply digest</h2>
    <div style="color:#555;margin-bottom:16px;">
      Here’s what’s coming up. Open the app to take action.
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${list || `<tr><td style="padding:10px 0;color:#555;">No reminders today.</td></tr>`}
    </table>

    <div style="margin-top:18px;">
      <a href="${appUrl}/dashboard/calendar" style="display:inline-block;padding:10px 14px;border:1px solid #ddd;border-radius:12px;text-decoration:none;color:#111;">
        View calendar
      </a>
      <a href="${appUrl}/dashboard/notifications" style="display:inline-block;margin-left:10px;padding:10px 14px;border:1px solid #ddd;border-radius:12px;text-decoration:none;color:#111;">
        View notifications
      </a>
    </div>

    <div style="margin-top:18px;color:#777;font-size:12px;">
      You can turn digests off anytime in Settings.
    </div>
  </div>
  `;
}

export async function POST(req: Request) {
  try {
    mustBeCron(req);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  // Users with digest enabled
  const prefs = await prisma.notificationPreference.findMany({
    where: { emailDigestEnabled: true },
    select: { userId: true, timezone: true, digestHourLocal: true, windowDays: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const p of prefs) {
    const tz = p.timezone || "America/Toronto";

    // only send at the configured local hour
    const hh = localHour(tz);
    if (hh !== p.digestHourLocal) {
      skipped++;
      continue;
    }

    const dateKey = localDateKey(tz);

    // idempotency: one per day
    const existing = await prisma.digestSendLog.findUnique({
      where: { userId_dateLocal: { userId: p.userId, dateLocal: dateKey } },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // get the user’s email from Clerk user table IF you store it.
    // If you don’t yet store email, you need to add it (recommended).
    const acct = await prisma.emailConnection.findUnique({
      where: { userId: p.userId },
      select: { emailAddress: true },
    });
    const to = acct?.emailAddress;
    if (!to) {
      skipped++;
      continue;
    }

    // pull undismissed notifications in the last N days (simple window)
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - Math.max(1, Math.min(30, p.windowDays)));

    const notifs = await prisma.notification.findMany({
      where: {
        userId: p.userId,
        dismissedAt: null,
        createdAt: { gte: since },
      },
      orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: { title: true, body: true },
    });

    const subject = `Your Looply digest — ${notifs.length} reminder${notifs.length === 1 ? "" : "s"}`;
    const html = renderDigestEmail({ appUrl, items: notifs });

    await sendEmail({ to, subject, html });

    await prisma.digestSendLog.create({
      data: { userId: p.userId, dateLocal: dateKey },
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped, totalEnabled: prefs.length });
}
