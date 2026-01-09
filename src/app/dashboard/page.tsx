import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/events";

type BillRow = { id: string; amountCents: number | null; autopay: boolean; status: string };
type SubscriptionRow = { id: string; name: string; amountCents: number; status: string; renewalDate: Date };
type ReturnRow = {
  id: string;
  store: string;
  itemNote: string | null;
  amountCents: number | null;
  refundAmountCents: number | null;
  status: string;
  returnBy: Date;
  refundedDate: Date | null;
  currency: string;
};
type RecentTxRow = { merchant: string; totalCents: number | null; currency: string; purchasedAt: Date | null };
type UpcomingBillRow = { name: string; amountCents: number | null; dueDayOfMonth: number; autopay: boolean };

type UpcomingItem = {
  title: string;
  subtitle: string;
  date: Date;
  amountCents?: number | null;
  currency?: string;
  type: "Return" | "Subscription" | "Bill";
  autopay?: boolean;
};

const typeMeta: Record<UpcomingItem["type"], { icon: string; chip: string; accent: string }> = {
  Return: { icon: "↩", chip: "bg-cyan-500/20 text-cyan-100", accent: "from-cyan-400/15 to-cyan-500/10" },
  Subscription: { icon: "⟳", chip: "bg-emerald-500/20 text-emerald-100", accent: "from-emerald-400/15 to-emerald-500/10" },
  Bill: { icon: "⏰", chip: "bg-indigo-400/20 text-indigo-100", accent: "from-indigo-400/15 to-indigo-500/10" },
};

function formatShort(date: Date) {
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function daysUntil(date: Date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [bills, subscriptions, returns, recentTransactions, upcomingBills] = await Promise.all([
    prisma.bill.findMany({ where: { userId }, select: { id: true, amountCents: true, autopay: true, status: true } }) as Promise<BillRow[]>,
    prisma.subscription.findMany({ where: { userId }, select: { id: true, name: true, amountCents: true, status: true, renewalDate: true } }) as Promise<SubscriptionRow[]>,
    prisma.returnItem.findMany({ where: { userId }, select: { id: true, store: true, itemNote: true, amountCents: true, refundAmountCents: true, status: true, returnBy: true, refundedDate: true, currency: true } }) as Promise<ReturnRow[]>,
    prisma.emailTransaction.findMany({
      where: { userId, purchasedAt: { gte: new Date(thirtyDaysAgo) } },
      orderBy: { purchasedAt: "desc" },
      take: 6,
      select: { merchant: true, totalCents: true, currency: true, purchasedAt: true },
    }) as Promise<RecentTxRow[]>,
    prisma.bill.findMany({
      where: { userId, status: "ACTIVE" },
      take: 6,
      select: { name: true, amountCents: true, dueDayOfMonth: true, autopay: true },
    }) as Promise<UpcomingBillRow[]>,
  ]);

  const nowDate = new Date();

  const totalBills = bills.length;
  const autopayBills = bills.filter(b => b.autopay).length;

  const activeSubs = subscriptions.filter(s => s.status === "ACTIVE");
  const activeSubsCost = activeSubs.reduce((sum, s) => sum + (s.amountCents || 0), 0);

  const activeReturns = returns.filter(r => r.status !== "REFUNDED");
  const refundedReturns = returns.filter(r => r.status === "REFUNDED").length;
  const potentialRefunds = activeReturns.reduce((sum, r) => sum + (r.amountCents || 0), 0);

  const overdueReturns = returns.filter(
    r => r.status !== "REFUNDED" && r.returnBy && r.returnBy < new Date(today + "T00:00:00.000Z")
  ).length;

  const recentSpending = recentTransactions.reduce((sum, t) => sum + (t.totalCents || 0), 0);

  const savedThisMonth = returns
    .filter(r => r.refundedDate && r.refundedDate.getUTCFullYear() === nowDate.getUTCFullYear() && r.refundedDate.getUTCMonth() === nowDate.getUTCMonth())
    .reduce((sum, r) => sum + (r.refundAmountCents ?? 0), 0);

  const search = typeof searchParams?.search === "string" ? searchParams.search.trim().toLowerCase() : "";

  const nextBillDate = (dueDay: number) => {
    const currentMonth = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), dueDay));
    if (currentMonth < nowDate) {
      return new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, dueDay));
    }
    return currentMonth;
  };

  const upcomingItems: UpcomingItem[] = [
    ...returns
      .filter(r => r.status !== "REFUNDED")
      .map(r => ({
        title: r.itemNote ? `${r.store} — ${r.itemNote}` : r.store,
        subtitle: r.status === "DROPPED_OFF" ? "Refund check" : "Return window",
        date: r.returnBy,
        amountCents: r.amountCents,
        currency: r.currency ?? "CAD",
        type: "Return" as const,
      })),
    ...activeSubs.map(s => ({
      title: s.name,
      subtitle: "Subscription",
      date: s.renewalDate,
      amountCents: s.amountCents,
      currency: "CAD",
      type: "Subscription" as const,
    })),
    ...upcomingBills.map(b => ({
      title: b.name,
      subtitle: b.autopay ? "Autopay" : "Manual pay",
      date: nextBillDate(b.dueDayOfMonth),
      amountCents: b.amountCents,
      currency: "CAD",
      type: "Bill" as const,
      autopay: b.autopay,
    })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 12);

  const filteredUpcoming = search
    ? upcomingItems.filter(item =>
        item.title.toLowerCase().includes(search) ||
        item.subtitle.toLowerCase().includes(search) ||
        item.type.toLowerCase().includes(search)
      )
    : upcomingItems;

  const horizon7 = filteredUpcoming.filter(item => {
    const diff = daysUntil(item.date);
    return diff >= 0 && diff <= 7;
  });
  const horizon14 = filteredUpcoming.filter(item => {
    const diff = daysUntil(item.date);
    return diff >= 0 && diff <= 14;
  });
  const horizon30 = filteredUpcoming.filter(item => {
    const diff = daysUntil(item.date);
    return diff >= 0 && diff <= 30;
  });

  const focusStrip = (horizon7.length ? horizon7 : filteredUpcoming).slice(0, 3);

  const highlightStats = [
    { label: "Active returns", value: activeReturns.length, detail: `${overdueReturns} overdue · ${refundedReturns} refunded`, tone: "cyan" },
    { label: "Subscriptions", value: activeSubs.length, detail: `${formatMoney(activeSubsCost, "CAD")}/mo tracking`, tone: "emerald" },
    { label: "Potential refunds", value: formatMoney(potentialRefunds, "CAD"), detail: `${activeReturns.length} in flight`, tone: "amber" },
    { label: "30d spend", value: formatMoney(recentSpending, "CAD"), detail: `${recentTransactions.length} receipts`, tone: "indigo" },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-cyan-400/25 blur-[100px]" />
            <div className="absolute right-[-60px] top-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-[100px]" />
          </div>

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Today</p>
              <h1 className="font-display text-4xl leading-[1.05] text-white md:text-5xl">
                Wow within 2 seconds, clarity forever.
              </h1>
              <p className="max-w-2xl text-sm text-slate-300">
                Focus strip shows what moves right now—returns, renewals, and bills with kinetic typography and obvious next steps.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">Live</span>
              <Link href="/dashboard/calendar" className="pill-link">
                Calendar
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 md:grid-cols-3">
            {focusStrip.length === 0 ? (
              <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-2xl p-4 md:col-span-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Nothing urgent</p>
                  <p className="mt-1 text-lg font-semibold text-white">Add your first return or renewal.</p>
                  <p className="text-sm text-slate-400">Your focus strip lights up once you add items.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/dashboard/returns" className="pill-link">Add return</Link>
                  <Link href="/dashboard/calendar" className="pill-link">Add subscription</Link>
                </div>
              </div>
            ) : (
              focusStrip.map(item => {
                const meta = typeMeta[item.type];
                const daysLeft = Math.max(0, daysUntil(item.date));
                return (
                  <div
                    key={`${item.type}-${item.title}-${item.date.toISOString()}`}
                    className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${meta.accent} p-4 shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:border-white/25`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">{meta.icon}</span>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{item.type}</p>
                          <p className="font-display text-lg text-white">{item.title}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.chip}`}>
                        {item.subtitle}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                          {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Today"}
                        </span>
                        <p className="text-slate-300">{formatShort(item.date)}</p>
                      </div>
                      <p className="font-semibold text-white">
                        {item.amountCents != null ? formatMoney(item.amountCents, item.currency ?? "CAD") : "—"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-panel relative space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Highlights</p>
              <p className="text-lg font-semibold text-white">Key signals this week</p>
            </div>
            <Link href="/dashboard/settings" className="pill-link text-xs">
              Notifications
            </Link>
          </div>
          <div className="space-y-3">
            {highlightStats.map(stat => (
              <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                  <p className="text-sm text-slate-300">{stat.detail}</p>
                </div>
                <p className="font-display text-2xl text-white">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-cyan-200/30 bg-gradient-to-br from-cyan-400/15 via-emerald-400/10 to-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Digest preview</p>
                <p className="text-sm text-slate-100">“Renews in 3 days · Return by Friday · Saved {formatMoney(savedThisMonth, "CAD")} this month.”</p>
              </div>
              <Link href="/dashboard/settings" className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20">
                Schedule
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.75fr_1.15fr]">
        <div className="glass-panel space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">What’s coming up</p>
              <p className="text-lg font-semibold text-white">7 / 14 / 30 day horizons</p>
            </div>
            <Link href="/dashboard/calendar" className="pill-link text-xs">
              Open calendar
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Next 7 days", items: horizon7 },
              { label: "Next 14 days", items: horizon14 },
              { label: "Next 30 days", items: horizon30 },
            ].map(group => (
              <div key={group.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{group.label}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-100">
                    {group.items.length} items
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {group.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-sm text-slate-400">
                      All clear. Add your next deadline.
                    </div>
                  ) : (
                    group.items.slice(0, 4).map(item => {
                      const meta = typeMeta[item.type];
                      const daysLeft = Math.max(0, daysUntil(item.date));
                      return (
                        <div
                          key={`${group.label}-${item.type}-${item.title}-${item.date.toISOString()}`}
                          className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-base">
                              {meta.icon}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <p className="text-xs text-slate-400">
                                {item.subtitle} · {formatShort(item.date)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.chip}`}>
                              {daysLeft > 0 ? `${daysLeft}d` : "Today"}
                            </span>
                            {item.amountCents != null ? (
                              <p className="mt-1 text-xs font-semibold text-white">
                                {formatMoney(item.amountCents, item.currency ?? "CAD")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Quick actions</p>
              <p className="text-lg font-semibold text-white">Act fast without hunting</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-200">Premium motion</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Add return", body: "Return-by + refund follow-ups", href: "/dashboard/returns", accent: "from-cyan-400/30 to-emerald-400/10", icon: "↩" },
              { title: "Add subscription", body: "Renewal cadence + amount", href: "/dashboard/calendar", accent: "from-emerald-400/25 to-cyan-300/15", icon: "⟳" },
              { title: "Mark returned", body: "Mark dropped off today", href: "/dashboard/returns", accent: "from-indigo-400/25 to-slate-900", icon: "📦" },
              { title: "Mark refunded", body: "Celebrate the refund", href: "/dashboard/returns", accent: "from-amber-400/25 to-emerald-400/15", icon: "💸" },
            ].map(action => (
              <Link
                key={action.title}
                href={action.href}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${action.accent} p-4 transition hover:-translate-y-0.5 hover:border-white/20`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-base">{action.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{action.title}</p>
                      <p className="text-xs text-slate-300">{action.body}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-300 transition group-hover:text-white">↗</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Automation</p>
            <p className="text-sm text-slate-200">Inbox and rules live in Automation. Enable lead times to reduce noise.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/dashboard/automation" className="pill-link text-xs">Review inbox</Link>
              <Link href="/dashboard/settings" className="pill-link text-xs">Set lead times</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="glass-panel space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Renewals + returns radar</p>
              <p className="text-lg font-semibold text-white">Sorted by urgency</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-200">Live feed</span>
          </div>
          <div className="space-y-2">
            {filteredUpcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">
                Add a return or subscription to see the radar populate instantly.
              </div>
            ) : (
              filteredUpcoming.slice(0, 7).map(item => {
                const meta = typeMeta[item.type];
                const daysLeft = Math.max(0, daysUntil(item.date));
                return (
                  <div
                    key={`${item.type}-${item.title}-${item.date.toISOString()}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-base">{meta.icon}</span>
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-slate-400">
                          {item.subtitle} · {formatShort(item.date)} {item.autopay ? "· Autopay" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.chip}`}>
                        {daysLeft > 0 ? `${daysLeft}d` : "Today"}
                      </span>
                      {item.amountCents != null ? (
                        <p className="mt-1 text-xs font-semibold text-white">
                          {formatMoney(item.amountCents, item.currency ?? "CAD")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-panel space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Recent transactions</p>
              <p className="text-lg font-semibold text-white">Receipt-driven intelligence</p>
            </div>
            <Link href="/dashboard/receipts/browser" className="pill-link text-xs">
              Open receipts
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm text-slate-400">
                No receipts in the last 30 days. Forward one to populate this feed.
              </div>
            ) : (
              recentTransactions.map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{tx.merchant}</p>
                    <p className="text-xs text-slate-400">
                      {tx.purchasedAt ? new Date(tx.purchasedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "Unknown date"}
                    </p>
                  </div>
                  {tx.totalCents != null ? (
                    <p className="text-sm font-semibold text-white">
                      {tx.currency} {(tx.totalCents / 100).toFixed(2)}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/20 via-cyan-400/15 to-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Saved this month</p>
                <p className="text-lg font-semibold text-white">{formatMoney(savedThisMonth, "CAD")}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-50">
                {autopayBills} autopay · {totalBills} bills
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
