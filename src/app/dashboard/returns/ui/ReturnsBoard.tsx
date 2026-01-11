"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, CheckCircle2, Package, RefreshCw, Circle, Filter } from "lucide-react";
import { formatMoney } from "@/lib/calendarEvents";

type ReturnItem = {
  id: string;
  store: string;
  itemNote: string | null;
  amountCents: number | null;
  currency: string;
  purchaseDate: string;
  returnBy: string;
  returnWindowDays: number;
  refundAmountCents: number | null;
  refundExpectedBy: string | null;
  refundedDate: string | null;
  status: "NOT_STARTED" | "PACKED" | "DROPPED_OFF" | "REFUNDED";
  dropoffDate: string | null;
  trackingNumber: string | null;
};

type Stats = {
  total: number;
  refunded: number;
  inProgress: number;
  totalRefunded: number;
  potentialRefunds: number;
};

const statusMeta: Record<ReturnItem["status"], { label: string; chip: string; glow: string }> = {
  NOT_STARTED: { label: "Not started", chip: "bg-slate-500/25 text-slate-100", glow: "from-slate-500/20 to-slate-800/60" },
  PACKED: { label: "Packed", chip: "bg-amber-500/25 text-amber-50", glow: "from-amber-400/25 to-amber-500/10" },
  DROPPED_OFF: { label: "Dropped off", chip: "bg-blue-500/25 text-blue-50", glow: "from-blue-400/25 to-blue-500/10" },
  REFUNDED: { label: "Refunded", chip: "bg-emerald-500/25 text-emerald-50", glow: "from-emerald-400/25 to-emerald-500/10" },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export default function ReturnsBoard({
  items,
  stats,
  initialBucket,
  onBucketChange,
}: {
  items: ReturnItem[];
  stats: Stats;
  initialBucket: "active" | "refunded";
  onBucketChange?: (bucket: "active" | "refunded") => void;
}) {
  const [view, setView] = useState<"list" | "timeline">("timeline");
  const [bucket, setBucket] = useState<"active" | "refunded">(initialBucket);
  const [statusFilter, setStatusFilter] = useState<Set<ReturnItem["status"]>>(
    new Set(["NOT_STARTED", "PACKED", "DROPPED_OFF", "REFUNDED"])
  );
  const [range, setRange] = useState<"all" | "7d" | "30d" | "overdue">("all");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ReturnItem[]>(items);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    return data.filter(item => {
      if (bucket === "active" && item.status === "REFUNDED") return false;
      if (bucket === "refunded" && item.status !== "REFUNDED") return false;
      if (!statusFilter.has(item.status)) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const combined = `${item.store} ${item.itemNote ?? ""}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }

      const returnDate = new Date(item.returnBy);
      const diffDays = Math.ceil((returnDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (range === "7d" && !(diffDays >= 0 && diffDays <= 7)) return false;
      if (range === "30d" && !(diffDays >= 0 && diffDays <= 30)) return false;
      if (range === "overdue" && !(diffDays < 0 && item.status !== "REFUNDED")) return false;

      return true;
    });
  }, [bucket, data, query, range, statusFilter]);

  const focusStrip = useMemo(() => {
    return [...filtered]
      .filter(item => item.status !== "REFUNDED")
      .sort((a, b) => new Date(a.returnBy).getTime() - new Date(b.returnBy).getTime())
      .slice(0, 3);
  }, [filtered]);

  async function markReturned(id: string) {
    setLoadingId(id + "-returned");
    try {
      await fetch(`/api/returns/${id}/mark-returned`, { method: "POST" });
      const nowISO = new Date().toISOString();
      setData(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, status: "DROPPED_OFF", dropoffDate: nowISO }
            : item
        )
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function markRefunded(item: ReturnItem) {
    setLoadingId(item.id + "-refunded");
    try {
      await fetch(`/api/returns/${item.id}/mark-refunded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundAmountCents: item.amountCents ?? undefined }),
      });
      const nowISO = new Date().toISOString();
      setData(prev =>
        prev.map(it =>
          it.id === item.id
            ? { ...it, status: "REFUNDED", refundedDate: nowISO, refundAmountCents: item.amountCents ?? it.refundAmountCents }
            : it
        )
      );
    } finally {
      setLoadingId(null);
    }
  }

  useEffect(() => {
    onBucketChange?.(bucket);
  }, [bucket, onBucketChange]);

  useEffect(() => {
    setBucket(initialBucket);
  }, [initialBucket]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Filters</p>
            <p className="text-sm text-slate-200">Status chips, horizons, and views.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              {["timeline", "list"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setView(mode as "timeline" | "list")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    view === mode ? "bg-gradient-to-r from-cyan-400/50 to-emerald-400/40 text-slate-950" : "text-slate-200"
                  }`}
                >
                  {mode === "timeline" ? "Timeline cards" : "Compact list"}
                </button>
              ))}
            </div>
            <details className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200 shadow-sm">
              <summary className="flex cursor-pointer items-center gap-2 font-semibold">
                <Filter className="h-4 w-4" />
                Filters
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {(["NOT_STARTED", "PACKED", "DROPPED_OFF", "REFUNDED"] as ReturnItem["status"][]).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        const next = new Set(statusFilter);
                        if (next.has(status)) next.delete(status);
                        else next.add(status);
                        setStatusFilter(next);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        statusFilter.has(status)
                          ? "border-cyan-200/50 bg-white/15 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      {status.replaceAll("_", " ").toLowerCase()}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {["all", "7d", "30d", "overdue"].map(r => (
                    <button
                      key={r}
                      onClick={() => setRange(r as typeof range)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        range === r
                          ? "border-emerald-200/60 bg-emerald-500/20 text-emerald-50"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      {r === "all" ? "All dates" : r === "overdue" ? "Overdue" : `Next ${r}`}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-100">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search store or note…"
                    className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-[1.4fr,0.8fr,0.6fr,0.6fr,0.6fr] gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-400">
            <span>Item</span>
            <span>Return by</span>
            <span>Status</span>
            <span>Amount</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-white/10">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-300">No returns match these filters.</div>
            ) : (
              filtered.map(item => {
                const meta = statusMeta[item.status];
                const daysLeft = Math.max(0, Math.ceil((new Date(item.returnBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                return (
                  <div key={item.id} className="grid grid-cols-[1.4fr,0.8fr,0.6fr,0.6fr,0.6fr] items-center gap-2 px-3 py-3 text-sm text-slate-100">
                    <div className="space-y-1">
                      <div className="font-semibold text-white">{item.store}</div>
                      <div className="text-xs text-slate-400">{item.itemNote}</div>
                    </div>
                    <div className="text-slate-200">
                      {formatDate(item.returnBy)}
                      <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-emerald-100">{daysLeft}d</span>
                    </div>
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${meta.chip}`}>
                      {meta.label}
                    </span>
                    <div className="text-slate-100">
                      {item.amountCents != null ? formatMoney(item.amountCents, item.currency ?? "CAD") : "—"}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-[11px] font-semibold">
                        {["drop", "refund"].map(step => {
                          const dropped = ["DROPPED_OFF", "REFUNDED"].includes(item.status);
                          const refunded = item.status === "REFUNDED";
                          const active = step === "drop" ? dropped : refunded;
                          const disabled = step === "refund" ? !dropped : false;
                          const loading = loadingId === item.id + (step === "drop" ? "-returned" : "-refunded");
                          const onClick =
                            step === "drop"
                              ? () => markReturned(item.id)
                              : () => markRefunded(item);
                          return (
                            <button
                              key={step}
                              onClick={onClick}
                              disabled={disabled || loading}
                              className={`flex items-center gap-1 rounded-full px-3 py-1 transition ${
                                active
                                  ? "bg-gradient-to-r from-cyan-400/50 to-emerald-400/40 text-slate-950"
                                  : "text-slate-200 hover:text-white"
                              } ${disabled ? "opacity-60" : ""}`}
                            >
                              <Check className="h-3 w-3" />
                              {step === "drop" ? "Drop off" : "Refunded"}
                            </button>
                          );
                        })}
                      </div>
                      <Link href={`/dashboard/returns/${item.id}`} className="text-[11px] font-semibold text-cyan-100 hover:text-white">
                        Details ↗
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300 md:col-span-2">
              No returns match these filters. Adjust status or date horizon.
            </div>
          ) : (
            filtered.map(item => {
              const meta = statusMeta[item.status];
              const daysLeft = Math.max(0, Math.ceil((new Date(item.returnBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const dropped = ["PACKED", "DROPPED_OFF", "REFUNDED"].includes(item.status);
              const returned = ["DROPPED_OFF", "REFUNDED"].includes(item.status);
              const refunded = item.status === "REFUNDED";
              const actions = [
                { key: "purchase", label: "Purchase", active: true, disabled: true, icon: <Circle className="h-4 w-4" /> },
                {
                  key: "dropped",
                  label: "Dropped",
                  active: dropped,
                  disabled: dropped || loadingId === item.id + "-returned",
                  icon: <Package className="h-4 w-4" />,
                  onClick: () => markReturned(item.id),
                  loading: loadingId === item.id + "-returned",
                },
                { key: "returned", label: "Returned", active: returned, disabled: true, icon: <RefreshCw className="h-4 w-4" /> },
                {
                  key: "refunded",
                  label: "Refunded",
                  active: refunded,
                  disabled: !returned || refunded || loadingId === item.id + "-refunded",
                  icon: <CheckCircle2 className="h-4 w-4" />,
                  onClick: () => markRefunded(item),
                  loading: loadingId === item.id + "-refunded",
                },
              ];
              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-3xl border border-rose-300/25 bg-slate-900/80 p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]"
                >
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-[-40px] top-[-60px] h-48 w-48 rounded-full bg-rose-500/10 blur-[120px]" />
                    <div className="absolute right-[-60px] bottom-[-40px] h-48 w-48 rounded-full bg-cyan-500/10 blur-[120px]" />
                  </div>

                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">Return</p>
                      <p className="text-2xl font-semibold text-white">{item.store}</p>
                      <p className="text-sm text-slate-400">{item.itemNote}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-white">
                        {item.amountCents != null ? formatMoney(item.amountCents, item.currency ?? "CAD") : "—"}
                      </p>
                      <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${daysLeft <= 3 ? "text-rose-300" : "text-slate-200"}`}>
                        <AlertCircle className="h-4 w-4" />
                        {daysLeft} days left
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-emerald-300/30 bg-emerald-500/10 text-emerald-200 shadow-[0_0_0_6px_rgba(16,185,129,0.08)]">
                      <Circle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 border-b border-white/5" />
                  </div>

                  <div className="relative mt-4 grid grid-cols-4 gap-3">
                    {actions.map(action => (
                      <button
                        key={action.key}
                        disabled={action.disabled || action.loading}
                        onClick={action.onClick}
                        className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                          action.active
                            ? "border-emerald-300/60 bg-emerald-400/10 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]"
                            : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                        } ${action.disabled ? "opacity-50" : ""}`}
                      >
                        <span className="text-base">{action.icon}</span>
                        {action.loading ? "…" : action.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative mt-4 text-[11px] text-slate-400">
                    Return by {formatDate(item.returnBy)} · Purchased {formatDate(item.purchaseDate)} · Tracking {item.trackingNumber || "—"}
                  </div>

                  <div className="relative mt-3 text-right text-[11px] font-semibold">
                    <Link href={`/dashboard/returns/${item.id}`} className="text-cyan-100 hover:text-white">
                      Details ↗
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
