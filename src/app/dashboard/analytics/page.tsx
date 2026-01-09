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

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">6-Month Trend</p>
              <p className="text-sm text-slate-600">Stacked bars by type</p>
            </div>
            <Legend
              items={[
                { label: "Subscriptions", color: "#10b981" },
                { label: "Bills", color: "#3b82f6" },
                { label: "Refunds", color: "#22c55e" },
              ]}
            />
          </div>
          <BarChart data={data.sixMonthTrend} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Total Over Time</p>
              <p className="text-sm text-slate-600">Line chart of combined spend</p>
            </div>
            <Legend items={[{ label: "Total", color: "#0ea5e9" }]} />
          </div>
          <LineChart data={data.sixMonthTrend} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Category Mix</p>
              <p className="text-sm text-slate-600">Subscriptions vs Bills vs Returns</p>
            </div>
            <Legend
              items={[
                { label: "Subscriptions", color: "#10b981" },
                { label: "Bills", color: "#3b82f6" },
                { label: "Returns", color: "#a855f7" },
              ]}
            />
          </div>
          <PieChart data={data.categoryBreakdown} />
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

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-600">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function BarChart({
  data,
}: {
  data: Array<{ month: string; subscriptionsCents: number; billsCents: number; refundsCents: number }>;
}) {
  if (data.length === 0) {
    return <div className="mt-3 text-sm text-slate-500">No trend data yet.</div>;
  }

  const max = Math.max(
    ...data.map(d => d.subscriptionsCents + d.billsCents + Math.max(0, d.refundsCents)),
    1
  );
  const barWidth = 44;
  const height = 160;
  const colors = {
    subs: "#10b981",
    bills: "#3b82f6",
    refunds: "#22c55e",
  };

  return (
    <div className="mt-3 flex items-end justify-between gap-3 overflow-x-auto pb-1">
      {data.map(d => {
        const total = d.subscriptionsCents + d.billsCents + Math.max(0, d.refundsCents);
        const subsH = (d.subscriptionsCents / max) * height;
        const billsH = (d.billsCents / max) * height;
        const refundsH = (Math.max(0, d.refundsCents) / max) * height;
        const label = new Date(d.month + "-01").toLocaleDateString("en-US", { month: "short" });

        return (
          <div key={d.month} className="flex flex-col items-center" style={{ minWidth: barWidth }}>
            <div className="relative flex w-full flex-col justify-end rounded-lg bg-slate-100" style={{ height }}>
              <div style={{ height: subsH, backgroundColor: colors.subs }} />
              <div style={{ height: billsH, backgroundColor: colors.bills }} />
              <div style={{ height: refundsH, backgroundColor: colors.refunds }} />
            </div>
            <div className="mt-2 text-xs text-slate-500">{label}</div>
            <div className="text-[11px] text-slate-400">{formatMoney(total, "CAD")}</div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({
  data,
}: {
  data: Array<{ month: string; totalCents: number }>;
}) {
  if (data.length === 0) {
    return <div className="mt-4 text-sm text-slate-500">No trend data yet.</div>;
  }

  const width = 360;
  const height = 180;
  const padding = 24;
  const maxY = Math.max(...data.map(d => d.totalCents), 1);
  const points = data.map((d, idx) => {
    const x = padding + (idx / Math.max(1, data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - d.totalCents / maxY) * (height - padding * 2);
    return { x, y, label: new Date(d.month + "-01").toLocaleDateString("en-US", { month: "short" }) };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2.5"
          points={polyline}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          fill="url(#lineFill)"
          points={`${points[0].x},${height - padding} ${polyline} ${points[points.length - 1].x},${height - padding}`}
        />
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r={4} fill="#0ea5e9" />
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        {points.map(p => (
          <span key={p.x}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

function PieChart({
  data,
}: {
  data: { subscriptions: number; bills: number; returns: number };
}) {
  const total = Math.max(data.subscriptions + data.bills + data.returns, 1);
  const slices = [
    { label: "Subscriptions", value: data.subscriptions, color: "#10b981" },
    { label: "Bills", value: data.bills, color: "#3b82f6" },
    { label: "Returns", value: data.returns, color: "#a855f7" },
  ];

  let cumulative = 0;
  const radius = 70;
  const center = 90;

  return (
    <div className="mt-4 flex items-center gap-4">
      <svg viewBox="0 0 180 180" className="h-40 w-40">
        {slices.map(slice => {
          const startAngle = (cumulative / total) * 2 * Math.PI;
          const sliceAngle = (slice.value / total) * 2 * Math.PI;
          cumulative += slice.value;
          const endAngle = startAngle + sliceAngle;

          const x1 = center + radius * Math.sin(startAngle);
          const y1 = center - radius * Math.cos(startAngle);
          const x2 = center + radius * Math.sin(endAngle);
          const y2 = center - radius * Math.cos(endAngle);
          const largeArc = sliceAngle > Math.PI ? 1 : 0;

          const pathData = [
            `M ${center} ${center}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            "Z",
          ].join(" ");

          return <path key={slice.label} d={pathData} fill={slice.color} stroke="white" strokeWidth="1" />;
        })}
      </svg>
      <div className="space-y-1 text-sm text-slate-700">
        {slices.map(slice => {
          const pct = Math.round((slice.value / total) * 100);
          return (
            <div key={slice.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                {slice.label}
              </span>
              <span className="text-slate-500">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
