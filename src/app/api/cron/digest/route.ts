import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildDigestForUser } from "@/lib/notifications/digest";

export const runtime = "nodejs";

function mustBeCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  const got = req.headers.get("x-cron-secret");
  if (got !== secret) throw new Error("Forbidden");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderDigestEmail(args: { appUrl: string; digest: NonNullable<Awaited<ReturnType<typeof buildDigestForUser>>>["digest"] }) {
  const { appUrl, digest } = args;
  const renderSection = (title: string, items: { title: string; date: string; amount?: string; link?: string }[]) => {
    if (!items.length) return "";
    return `
      <h3 style="margin:12px 0 6px 0;">${escapeHtml(title)}</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${items
          .map(
            i => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #eee;">
                <div style="font-weight:600;">${escapeHtml(i.title)}</div>
                <div style="color:#555;">${escapeHtml(i.date)}${i.amount ? ` · ${escapeHtml(i.amount)}` : ""}</div>
                ${i.link ? `<div><a href="${appUrl}${i.link}" style="color:#2563eb;text-decoration:none;">View</a></div>` : ""}
              </td>
            </tr>
          `
          )
          .join("")}
      </table>
    `;
  };

  return `
  <div style="font-family: ui-sans-serif, system-ui; line-height:1.4; color:#111;">
    <h2 style="margin:0 0 8px 0;">${escapeHtml(digest.subject)}</h2>
    <div style="color:#555;margin-bottom:16px;">Returns: ${digest.counts.returns} · Bills: ${digest.counts.bills} · Subs: ${digest.counts.subs} · Overdue: ${digest.counts.overdue}</div>

    ${renderSection("Returns", digest.sections.returns)}
    ${renderSection("Bills", digest.sections.bills)}
    ${renderSection("Subscriptions", digest.sections.subs)}

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

  const prefs = await prisma.notificationPreference.findMany({
    where: { emailDigestEnabled: true },
    select: { userId: true, timezone: true, digestHourLocal: true },
  });

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  for (const p of prefs) {
    const tz = p.timezone || "America/Toronto";
    const now = new Date();
    const localHour = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "2-digit", hour12: false })
      .formatToParts(now)
      .find(part => part.type === "hour")?.value;
    if (localHour && Number(localHour) !== p.digestHourLocal) {
      skipped++;
      continue;
    }

    const built = await buildDigestForUser(p.userId, now);
    if (!built) {
      skipped++;
      continue;
    }
    const { digest, dateLocal } = built;

    // idempotency: one per local day
    try {
      await prisma.digestRun.create({ data: { userId: p.userId, digestDate: dateLocal } });
    } catch {
      skipped++;
      continue;
    }

    // Use primaryEmail stored in prefs
    const pref = await prisma.notificationPreference.findUnique({ where: { userId: p.userId }, select: { primaryEmail: true } });
    const to = pref?.primaryEmail;
    if (!to) {
      skipped++;
      continue;
    }

    try {
      await sendEmail({
        to,
        subject: digest.subject,
        html: renderDigestEmail({ appUrl, digest }),
      });
      sent++;
    } catch (error) {
      errors.push({ userId: p.userId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors, totalEnabled: prefs.length });
}
