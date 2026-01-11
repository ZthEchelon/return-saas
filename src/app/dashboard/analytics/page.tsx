"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles, Flame, TrendingUp, PieChart as PieIcon, RefreshCcw, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/calendarEvents";

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

type ValueEventDTO = {
  id: string;
  label: string;
  type: string;
  amountCents: number;
  currency: string;
  occurredAt: string;
  isEstimated: boolean;
  sourceId?: string | null;
};

type AtRiskItem = {
  id: string;
  label: string;
  kind: "RENEWAL" | "RETURN_DEADLINE" | "REFUND_OVERDUE";
  dueDate: string;
  amountCents?: number | null;
  currency?: string | null;
};

type ValueSummary = {
  saved: {
    totalCents: number;
    confirmedCents: number;
    estimatedCents: number;
    currency: string;
    events: ValueEventDTO[];
  };
  atRisk: {
    totalCents: number;
    currency: string;
    horizonDays: number;
    renewals: AtRiskItem[];
    returnDeadlines: AtRiskItem[];
    overdueRefunds: AtRiskItem[];
  };
  recovered: {
    totalCents: number;
    currency: string;
    events: ValueEventDTO[];
  };
  plan: {
    code: "FREE" | "PRO";
    featureAccess: {
      saved: boolean;
      recovered: boolean;
      drilldowns: boolean;
      concierge: boolean;
    };
  };
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [summary, setSummary] = useState<ValueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [analyticsRes, summaryRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/analytics/summary"),
        ]);

        if (!analyticsRes.ok) throw new Error("Failed to load analytics");
        const analyticsJson = await analyticsRes.json();
        setData(analyticsJson);

        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          setSummary(summaryJson);
        }
      } catch (error) {
        console.error("Analytics load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Subscriptions", value: formatMoney(data.currentMonthStats.subscriptionsTotal, "CAD"), accent: "from-emerald-400/20 to-emerald-500/10", icon: <Sparkles className="h-5 w-5 text-emerald-200" /> },
      { label: "Bills", value: formatMoney(data.currentMonthStats.billsTotal, "CAD"), accent: "from-cyan-400/20 to-blue-500/10", icon: <Flame className="h-5 w-5 text-cyan-200" /> },
      { label: "Refunds", value: formatMoney(data.currentMonthStats.refundsTotal, "CAD"), accent: "from-fuchsia-400/20 to-rose-500/10", icon: <RefreshCcw className="h-5 w-5 text-fuchsia-200" /> },
      { label: "Est. Monthly", value: formatMoney(data.currentMonthStats.estimatedMonthly, "CAD"), accent: "from-amber-400/20 to-emerald-400/10", icon: <TrendingUp className="h-5 w-5 text-amber-200" /> },
    ];
  }, [data]);

  const topRisk = useMemo(() => {
    if (!summary) return [] as AtRiskItem[];
    return [
      ...summary.atRisk.renewals,
      ...summary.atRisk.returnDeadlines,
      ...summary.atRisk.overdueRefunds,
    ]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 3);
  }, [summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-300">Loading analytics…</div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-300/50 bg-rose-500/10 p-4 text-sm text-rose-100">
        Failed to load analytics. Try refreshing the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1220] p-6 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-60 w-60 rounded-full bg-cyan-500/15 blur-[120px]" />
          <div className="absolute right-[-80px] top-12 h-60 w-60 rounded-full bg-emerald-400/15 blur-[120px]" />
        </div>
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-100">Analytics HQ</p>
            <h1 className="font-display text-4xl text-white">See where your money and time go.</h1>
            <p className="max-w-3xl text-sm text-slate-200/80">
              Stacked trends, category mix, and refund velocity. Built to keep you honest, not overwhelmed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white">Live sync</span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-100">Auto-refresh</span>
          </div>
        </div>
      </div>

        {summary ? (
          <div className="grid gap-4 md:grid-cols-3">
            <ValueBadge
              title="Saved"
              amount={formatMoney(summary.saved.totalCents, summary.saved.currency)}
              detail={summary.plan.featureAccess.saved
                ? `${formatMoney(summary.saved.confirmedCents, summary.saved.currency)} confirmed · ${formatMoney(summary.saved.estimatedCents, summary.saved.currency)} est.`
                : "Pro unlocks saved + drilldowns"}
              tone="emerald"
              locked={!summary.plan.featureAccess.saved}
            />
            <ValueBadge
              title={`At Risk (${summary.atRisk.horizonDays}d)`}
              amount={formatMoney(summary.atRisk.totalCents, summary.atRisk.currency)}
              detail={`${summary.atRisk.renewals.length} renewals · ${summary.atRisk.returnDeadlines.length} returns · ${summary.atRisk.overdueRefunds.length} refunds`}
              tone="amber"
              locked={false}
            >
              <div className="mt-3 space-y-2 text-xs text-slate-200">
                {topRisk.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-slate-300">No risks this week.</p>
                ) : (
                  topRisk.map(item => (
                    <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="font-semibold text-white">{item.label}</span>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">{item.kind.replace("_", " ")}</p>
                        <p className="text-[11px] text-slate-400">{new Date(item.dueDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ValueBadge>
            <ValueBadge
              title="Recovered"
              amount={formatMoney(summary.recovered.totalCents, summary.recovered.currency)}
              detail={summary.plan.featureAccess.recovered
                ? `${summary.recovered.events.length} refunds tracked`
                : "Upgrade to see recovered"}
              tone="cyan"
              locked={!summary.plan.featureAccess.recovered}
            />
          </div>
        ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg`}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-2">{card.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard title="6-Month Trend" subtitle="Stacked bars by type" badge="Stacked view" icon={<ArrowUpRight className="h-4 w-4 text-cyan-200" />}>
          <Legend
            items={[
              { label: "Subscriptions", color: "#34d399" },
              { label: "Bills", color: "#60a5fa" },
              { label: "Refunds", color: "#a78bfa" },
            ]}
          />
          <BarChart data={data.sixMonthTrend} />
        </GlassCard>

        <GlassCard title="Total Over Time" subtitle="Combined spend" badge="Line" icon={<TrendingUp className="h-4 w-4 text-emerald-200" />}>
          <Legend items={[{ label: "Total", color: "#22d3ee" }]} />
          <LineChart data={data.sixMonthTrend} />
        </GlassCard>

        <GlassCard title="Category Mix" subtitle="Subscriptions vs Bills vs Returns" badge="Share" icon={<PieIcon className="h-4 w-4 text-fuchsia-200" />}>
          <Legend
            items={[
              { label: "Subscriptions", color: "#34d399" },
              { label: "Bills", color: "#60a5fa" },
              { label: "Returns", color: "#a78bfa" },
            ]}
          />
          <PieChart data={data.categoryBreakdown} />
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard title="Category Breakdown" subtitle="Where your spend lives" badge="Live mix">
          <CategoryBreakdown data={data.categoryBreakdown} />
        </GlassCard>
        <GlassCard title="Return Stats" subtitle="Refund velocity + totals" badge="Returns">
          <ReturnStats stats={data.returnStats} />
        </GlassCard>
      </div>

      {data.topMerchants.length > 0 ? (
        <GlassCard title="Top Merchants" subtitle="Where money clusters" badge="Merchants">
          <div className="space-y-3">
            {data.topMerchants.map(merchant => (
              <div key={merchant.merchant} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                <div>
                  <p className="font-semibold text-white">{merchant.merchant}</p>
                  <p className="text-xs text-slate-400">{merchant.count} transaction{merchant.count > 1 ? "s" : ""}</p>
                </div>
                <span className="font-semibold text-emerald-200">
                  {formatMoney(merchant.totalSpent, "CAD")}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}

function ValueBadge({
  title,
  amount,
  detail,
  tone,
  locked,
  children,
}: {
  title: string;
  amount: string;
  detail: string;
  tone: "emerald" | "amber" | "cyan";
  locked?: boolean;
  children?: ReactNode;
}) {
  const toneStyles: Record<"emerald" | "amber" | "cyan", { bg: string; chip: string }> = {
    emerald: { bg: "from-emerald-400/20 via-emerald-500/15 to-slate-950", chip: "bg-emerald-500/20 text-emerald-50" },
    amber: { bg: "from-amber-400/25 via-rose-400/15 to-slate-950", chip: "bg-amber-500/20 text-amber-50" },
    cyan: { bg: "from-cyan-400/20 via-blue-400/15 to-slate-950", chip: "bg-cyan-500/20 text-cyan-50" },
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${toneStyles[tone].bg} p-4 shadow-xl shadow-black/40`}>
      {locked ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">Upgrade to unlock</span>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-200">{title}</p>
          <p className="mt-1 text-3xl font-bold text-white">{amount}</p>
          <p className="text-sm text-slate-200/80">{detail}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${toneStyles[tone].chip}`}>{locked ? "Pro" : "Live"}</span>
      </div>
      {children}
    </div>
  );
}

function GlassCard({
  title,
  subtitle,
  badge,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl shadow-black/30">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{title}</p>
          {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
        </div>
        {badge ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-100">
            {icon}
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function CategoryBreakdown({ data }: { data: { subscriptions: number; bills: number; returns: number } }) {
  const rows = [
    { label: "Subscriptions", value: data.subscriptions, color: "bg-emerald-400" },
    { label: "Bills", value: data.bills, color: "bg-cyan-400" },
    { label: "Returns", value: data.returns, color: "bg-fuchsia-400" },
  ];
  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-300">{row.label}</span>
            <span className="font-semibold text-white">{row.value}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div className={`h-full ${row.color}`} style={{ width: `${row.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReturnStats({ stats }: { stats: Analytics["returnStats"] }) {
  return (
    <div className="space-y-3 text-sm text-slate-200">
      <Row label="Total Returns" value={stats.totalReturned} />
      <Row label="Refunded Amount" value={formatMoney(stats.refundedAmount, "CAD")} accent="text-emerald-200" />
      <Row label="Pending Refunds" value={formatMoney(stats.pendingAmount, "CAD")} accent="text-amber-200" />
      {stats.averageRefundDays > 0 ? <Row label="Avg Refund Time" value={`${stats.averageRefundDays} days`} /> : null}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold text-white ${accent ?? ""}`}>{value}</span>
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
