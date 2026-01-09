"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/events";

interface Analytics {
  currentMonthStats: {
    subscriptionsTotal: number;
    billsTotal: number;
    refundsTotal: number;
    estimatedMonthly: number;
  };
  sixMonthTrend: Array<{
    month: string;
    subscriptionsCents: number;
    billsCents: number;
    refundsCents: number;
    totalCents: number;
  }>;
  categoryBreakdown: {
    subscriptions: number;
    bills: number;
    returns: number;
  };
  topMerchants: Array<{
    merchant: string;
    totalSpent: number;
    count: number;
  }>;
  returnStats: {
    totalReturned: number;
    refundedAmount: number;
    pendingAmount: number;
    averageRefundDays: number;
  };
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Analytics load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load analytics. Try refreshing the page.
      </div>
    );
  }

  const monthLabels = data.sixMonthTrend.map(m => {
    const [year, month] = m.month.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  });

  const maxTotal = Math.max(...data.sixMonthTrend.map(m => m.totalCents), 1);
  const scaleFactor = 100 / maxTotal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-slate-600">Spending overview and insights</p>
      </div>

      {/* Current Month Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Subscriptions"
          value={formatMoney(data.currentMonthStats.subscriptionsTotal, "CAD")}
          color="emerald"
          icon="📅"
        />
        <StatCard
          label="Bills"
          value={formatMoney(data.currentMonthStats.billsTotal, "CAD")}
          color="blue"
          icon="💳"
        />
        <StatCard
          label="Refunds"
          value={formatMoney(data.currentMonthStats.refundsTotal, "CAD")}
          color="green"
          icon="✅"
        />
        <StatCard
          label="Est. Monthly"
          value={formatMoney(data.currentMonthStats.estimatedMonthly, "CAD")}
          color="slate"
          icon="📊"
        />
      </div>

      {/* 6-Month Trend Chart */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">6-Month Spending Trend</h2>
        <div className="space-y-3">
          {data.sixMonthTrend.map((month, idx) => (
            <div key={month.month} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">{monthLabels[idx]}</span>
                <span className="text-slate-900 font-semibold">
                  {formatMoney(month.totalCents, "CAD")}
                </span>
              </div>
              <div className="flex h-6 gap-0.5 overflow-hidden rounded-full bg-slate-100">
                {month.subscriptionsCents > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${month.subscriptionsCents * scaleFactor}%` }}
                    title={`Subscriptions: ${formatMoney(month.subscriptionsCents, "CAD")}`}
                  />
                )}
                {month.billsCents > 0 && (
                  <div
                    className="bg-blue-500"
                    style={{ width: `${month.billsCents * scaleFactor}%` }}
                    title={`Bills: ${formatMoney(month.billsCents, "CAD")}`}
                  />
                )}
                {month.refundsCents > 0 && (
                  <div
                    className="bg-green-500"
                    style={{ width: `${month.refundsCents * scaleFactor}%` }}
                    title={`Refunds: ${formatMoney(month.refundsCents, "CAD")}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Category Breakdown</h2>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Subscriptions</span>
                <span className="font-semibold text-slate-900">{data.categoryBreakdown.subscriptions}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${data.categoryBreakdown.subscriptions}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Bills</span>
                <span className="font-semibold text-slate-900">{data.categoryBreakdown.bills}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${data.categoryBreakdown.bills}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Return Stats */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Return Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total Returns</span>
              <span className="font-semibold text-slate-900">{data.returnStats.totalReturned}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Refunded Amount</span>
              <span className="font-semibold text-green-600">
                {formatMoney(data.returnStats.refundedAmount, "CAD")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pending Refunds</span>
              <span className="font-semibold text-amber-600">
                {formatMoney(data.returnStats.pendingAmount, "CAD")}
              </span>
            </div>
            {data.returnStats.averageRefundDays > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Avg Refund Time</span>
                <span className="font-semibold text-slate-900">
                  {data.returnStats.averageRefundDays} days
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Merchants */}
      {data.topMerchants.length > 0 && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Top Merchants</h2>
          <div className="space-y-3">
            {data.topMerchants.map(merchant => (
              <div key={merchant.merchant} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium text-slate-900">{merchant.merchant}</p>
                  <p className="text-xs text-slate-500">{merchant.count} transaction{merchant.count > 1 ? "s" : ""}</p>
                </div>
                <span className="font-semibold text-slate-900">
                  {formatMoney(merchant.totalSpent, "CAD")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  color: "emerald" | "blue" | "green" | "slate";
  icon: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold opacity-75">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}
