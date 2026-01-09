import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UpgradeButton from "./ui/UpgradeButton";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Fetch all user data for dashboard
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  type BillRow = { id: string; amountCents: number | null; autopay: boolean; status: string };
  type SubscriptionRow = { id: string; amountCents: number; status: string; renewalDate: Date };
  type ReturnRow = { id: string; amountCents: number | null; status: string; returnBy: Date; refundedDate: Date | null };
  type RecentTxRow = { merchant: string; totalCents: number | null; currency: string; purchasedAt: Date | null };
  type UpcomingBillRow = { name: string; amountCents: number | null; dueDayOfMonth: number; autopay: boolean };
  type UpcomingReturnRow = { store: string; itemNote: string | null; returnBy: Date; amountCents: number | null };
  type UpcomingSubRow = { name: string; amountCents: number; renewalDate: Date };

  const [
    bills,
    subscriptions,
    returns,
    recentTransactions,
    upcomingBills,
    upcomingReturns,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.bill.findMany({ where: { userId }, select: { id: true, amountCents: true, autopay: true, status: true } }) as Promise<BillRow[]>,
    prisma.subscription.findMany({ where: { userId }, select: { id: true, amountCents: true, status: true, renewalDate: true } }) as Promise<SubscriptionRow[]>,
    prisma.returnItem.findMany({ where: { userId }, select: { id: true, amountCents: true, status: true, returnBy: true, refundedDate: true } }) as Promise<ReturnRow[]>,
    prisma.emailTransaction.findMany({
      where: { userId, purchasedAt: { gte: new Date(thirtyDaysAgo) } },
      orderBy: { purchasedAt: "desc" },
      take: 5,
      select: { merchant: true, totalCents: true, currency: true, purchasedAt: true },
    }) as Promise<RecentTxRow[]>,
    prisma.bill.findMany({
      where: { userId, status: "ACTIVE" },
      take: 5,
      select: { name: true, amountCents: true, dueDayOfMonth: true, autopay: true },
    }) as Promise<UpcomingBillRow[]>,
    prisma.returnItem.findMany({
      where: { userId, status: { in: ["NOT_STARTED", "PACKED", "DROPPED_OFF"] }, returnBy: { gte: new Date(today + "T00:00:00.000Z") } },
      orderBy: { returnBy: "asc" },
      take: 5,
      select: { store: true, itemNote: true, returnBy: true, amountCents: true },
    }) as Promise<UpcomingReturnRow[]>,
    prisma.subscription.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { renewalDate: "asc" },
      take: 5,
      select: { name: true, amountCents: true, renewalDate: true },
    }) as Promise<UpcomingSubRow[]>,
  ]);

  // Calculate stats
  const totalBills = bills.length;
  const autopayBills = bills.filter(b => b.autopay).length;
  const activeSubs = subscriptions.filter(s => s.status === "ACTIVE").length;
  const totalSubsCost = subscriptions
    .filter(s => s.status === "ACTIVE")
    .reduce((sum, s) => sum + (s.amountCents || 0), 0);
  
  const activeReturns = returns.filter(r => r.status !== "REFUNDED").length;
  const refundedReturns = returns.filter(r => r.status === "REFUNDED").length;
  const potentialRefunds = returns
    .filter(r => r.status !== "REFUNDED")
    .reduce((sum, r) => sum + (r.amountCents || 0), 0);
  
  const overdueReturns = returns.filter(r => 
    r.status !== "REFUNDED" && 
    r.returnBy && 
    r.returnBy < new Date(today + "T00:00:00.000Z")
  ).length;

  const recentSpending = recentTransactions.reduce((sum, t) => sum + (t.totalCents || 0), 0);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-500 to-purple-600 p-8 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome Back! 👋</h1>
            <p className="mt-1 text-indigo-100">Here's what's happening with your finances</p>
          </div>
          <UpgradeButton />
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Bills */}
        <Link href="/dashboard/bills" className="group rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-indigo-600">Bills</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{totalBills}</div>
              <div className="mt-1 text-xs text-slate-600">{autopayBills} on autopay</div>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-2xl">📝</div>
          </div>
        </Link>

        {/* Subscriptions */}
        <Link href="/dashboard/calendar" className="group rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-emerald-600">Subscriptions</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{activeSubs}</div>
              <div className="mt-1 text-xs text-slate-600">
                ${(totalSubsCost / 100).toFixed(0)}/mo total
              </div>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 text-2xl">🔄</div>
          </div>
        </Link>

        {/* Returns */}
        <Link href="/dashboard/returns" className="group rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-cyan-600">Active Returns</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{activeReturns}</div>
              <div className="mt-1 text-xs text-slate-600">
                {overdueReturns > 0 ? `${overdueReturns} overdue!` : `${refundedReturns} completed`}
              </div>
            </div>
            <div className="rounded-full bg-cyan-100 p-3 text-2xl">📦</div>
          </div>
        </Link>

        {/* Potential Refunds */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-amber-600">Potential Refunds</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">
                ${(potentialRefunds / 100).toFixed(0)}
              </div>
              <div className="mt-1 text-xs text-slate-600">Pending returns</div>
            </div>
            <div className="rounded-full bg-amber-100 p-3 text-2xl">💰</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/calendar"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
          >
            <div className="text-2xl">📅</div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Calendar</div>
              <div className="text-xs text-slate-600">View timeline</div>
            </div>
          </Link>
          
          <Link
            href="/dashboard/automation/review"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
          >
            <div className="text-2xl">🤖</div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Review Inbox</div>
              <div className="text-xs text-slate-600">Check suggestions</div>
            </div>
          </Link>
          
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
          >
            <div className="text-2xl">📊</div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Analytics</div>
              <div className="text-xs text-slate-600">View insights</div>
            </div>
          </Link>
          
          <Link
            href="/dashboard/receipts/browser"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
          >
            <div className="text-2xl">🧾</div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Receipts</div>
              <div className="text-xs text-slate-600">Browse docs</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Items */}
        <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming This Month</h2>
            <Link href="/dashboard/calendar" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingBills.length === 0 && upcomingReturns.length === 0 && activeSubscriptions.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-600">
                No upcoming items. You're all clear! ✨
              </div>
            ) : (
              <>
                {upcomingBills.slice(0, 3).map((bill, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-indigo-100 p-2 text-sm">📝</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{bill.name}</div>
                        <div className="text-xs text-slate-600">
                          Due on {bill.dueDayOfMonth}th {bill.autopay && "• Autopay"}
                        </div>
                      </div>
                    </div>
                    {bill.amountCents && (
                      <div className="text-sm font-bold text-slate-900">
                        ${(bill.amountCents / 100).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}

                {upcomingReturns.slice(0, 2).map((ret, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-cyan-100 p-2 text-sm">📦</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {ret.store} {ret.itemNote && `- ${ret.itemNote}`}
                        </div>
                        <div className="text-xs text-slate-600">
                          Return by {typeof ret.returnBy === "string" ? ret.returnBy : new Date(ret.returnBy as unknown as string).toISOString().slice(0, 10)}
                        </div>
                      </div>
                    </div>
                    {ret.amountCents && (
                      <div className="text-sm font-bold text-cyan-700">
                        ${(ret.amountCents / 100).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}

                {activeSubscriptions.slice(0, 2).map((sub, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-emerald-100 p-2 text-sm">🔄</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{sub.name}</div>
                        <div className="text-xs text-slate-600">
                          Renews {new Date(sub.renewalDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-emerald-700">
                      ${(sub.amountCents / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
            <Link href="/dashboard/receipts/browser" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-600">
                No recent transactions in the last 30 days
              </div>
            ) : (
              <>
                {recentTransactions.map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-slate-100 p-2 text-sm">🧾</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{tx.merchant}</div>
                        <div className="text-xs text-slate-600">
                          {tx.purchasedAt && new Date(tx.purchasedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {tx.totalCents && (
                      <div className="text-sm font-bold text-slate-900">
                        {tx.currency} ${(tx.totalCents / 100).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}

                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-amber-900">Last 30 Days Total</div>
                    <div className="text-lg font-bold text-amber-900">
                      ${(recentSpending / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tips & Insights */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-purple-100 p-3 text-2xl">💡</div>
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900">Pro Tips</h3>
            <ul className="mt-2 space-y-1 text-sm text-purple-800">
              {overdueReturns > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-rose-500">⚠️</span>
                  You have {overdueReturns} overdue return{overdueReturns > 1 ? 's' : ''}! Check your returns page.
                </li>
              )}
              {activeReturns > 0 && (
                <li className="flex items-center gap-2">
                  <span>📦</span>
                  Track your {activeReturns} active return{activeReturns > 1 ? 's' : ''} on the calendar to never miss a deadline.
                </li>
              )}
              {activeSubs > 0 && (
                <li className="flex items-center gap-2">
                  <span>💳</span>
                  You're spending ${(totalSubsCost / 100).toFixed(0)}/month on subscriptions. Review them to find savings!
                </li>
              )}
              {recentTransactions.length > 0 && (
                <li className="flex items-center gap-2">
                  <span>🧾</span>
                  Enable Gmail automation to automatically track receipts and create return reminders.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
