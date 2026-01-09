import { prisma } from "@/lib/prisma";
import { toISODateOnlyUTC } from "@/lib/events";

type DigestItem = {
  title: string;
  date: string;
  amount?: string;
  link?: string;
};

export type DigestResult = {
  subject: string;
  counts: { returns: number; bills: number; subs: number; overdue: number };
  sections: {
    returns: DigestItem[];
    bills: DigestItem[];
    subs: DigestItem[];
    newSuggestions?: DigestItem[];
  };
};

function formatMoney(amountCents?: number | null, currency = "CAD") {
  if (amountCents == null) return "";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(amountCents / 100);
}

function todayInTz(tz: string) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = fmt.formatToParts(now);
  const y = Number(parts.find(p => p.type === "year")?.value);
  const m = Number(parts.find(p => p.type === "month")?.value);
  const d = Number(parts.find(p => p.type === "day")?.value);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysUTC(d: Date, days: number) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

export async function buildDigestForUser(userId: string, now: Date) {
  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  if (!pref.emailDigestEnabled) return null;

  const tz = pref.timezone ?? "America/Toronto";
  const todayLocal = todayInTz(tz);
  const windowEnd = addDaysUTC(todayLocal, pref.windowDays ?? 14);

  const [returns, bills, subs] = await Promise.all([
    prisma.returnItem.findMany({
      where: {
        userId,
        status: { not: "REFUNDED" },
        returnBy: { lte: windowEnd },
      },
      select: { id: true, store: true, itemNote: true, returnBy: true, amountCents: true, currency: true },
      orderBy: { returnBy: "asc" },
    }),
    prisma.bill.findMany({
      where: { userId, status: { not: "PAUSED" } },
      select: { id: true, name: true, amountCents: true, currency: true, dueDayOfMonth: true },
    }),
    prisma.subscription.findMany({
      where: { userId, status: "ACTIVE", renewalDate: { lte: windowEnd } },
      select: { id: true, name: true, amountCents: true, currency: true, renewalDate: true },
      orderBy: { renewalDate: "asc" },
    }),
  ]);

  // Build bill occurrences within window
  const billsWithin: DigestItem[] = [];
  const y0 = todayLocal.getUTCFullYear();
  const m0 = todayLocal.getUTCMonth();
  const m1 = windowEnd.getUTCMonth();
  for (const b of bills) {
    for (let m = m0; m <= m1; m++) {
      const due = new Date(Date.UTC(y0, m, Math.min(b.dueDayOfMonth, new Date(Date.UTC(y0, m + 1, 0)).getUTCDate())));
      if (due >= todayLocal && due <= windowEnd) {
        billsWithin.push({
          title: b.name,
          date: toISODateOnlyUTC(due),
          amount: formatMoney(b.amountCents, b.currency),
          link: "/dashboard/calendar",
        });
      }
    }
  }

  const returnItems: DigestItem[] = returns.map(r => ({
    title: `${r.store}${r.itemNote ? ` — ${r.itemNote}` : ""}`,
    date: toISODateOnlyUTC(r.returnBy),
    amount: formatMoney(r.amountCents, r.currency),
    link: "/dashboard/calendar",
  }));

  const subItems: DigestItem[] = subs.map(s => ({
    title: s.name,
    date: toISODateOnlyUTC(s.renewalDate),
    amount: formatMoney(s.amountCents, s.currency),
    link: "/dashboard/calendar",
  }));

  const overdueCount =
    returnItems.filter(i => i.date < toISODateOnlyUTC(todayLocal)).length +
    billsWithin.filter(i => i.date < toISODateOnlyUTC(todayLocal)).length +
    subItems.filter(i => i.date < toISODateOnlyUTC(todayLocal)).length;

  const subject = `Your digest: ${returnItems.length} returns · ${billsWithin.length} bills · ${subItems.length} subs`;

  const result: DigestResult = {
    subject,
    counts: { returns: returnItems.length, bills: billsWithin.length, subs: subItems.length, overdue: overdueCount },
    sections: {
      returns: returnItems,
      bills: billsWithin,
      subs: subItems,
    },
  };

  return { digest: result, dateLocal: toISODateOnlyUTC(todayLocal) };
}
