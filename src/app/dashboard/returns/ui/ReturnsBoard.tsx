"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/events";

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

export default function ReturnsBoard({ items, stats }: { items: ReturnItem[]; stats: Stats }) {
  const [view, setView] = useState<"list" | "timeline">("timeline");
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
  }, [data, query, range, statusFilter]);

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

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Filters</p>
            <p className="text-sm text-slate-200">Status chips, horizons, and views.</p>
          </div>
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
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
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
          <div className="flex-1 min-w-[200px] rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-100">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search store or note…"
              className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">In progress</p>
          <p className="font-display text-2xl text-white">{stats.inProgress}</p>
          <p className="text-xs text-slate-300">Awaiting drop-off or refund</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Refunded</p>
          <p className="font-display text-2xl text-white">{stats.refunded}</p>
          <p className="text-xs text-slate-300">Received {formatMoney(stats.totalRefunded, "CAD")}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Potential</p>
          <p className="font-display text-2xl text-white">{formatMoney(stats.potentialRefunds, "CAD")}</p>
          <p className="text-xs text-slate-300">Across active returns</p>
        </div>
      </div>

      {focusStrip.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {focusStrip.map(item => {
            const daysLeft = Math.max(0, Math.ceil((new Date(item.returnBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            const meta = statusMeta[item.status];
            return (
              <div key={item.id} className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${meta.glow} p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Focus</p>
                    <p className="text-lg font-semibold text-white">{item.store}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.chip}`}>{meta.label}</span>
                </div>
                <p className="mt-1 text-sm text-slate-200">{item.itemNote}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-white">
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-emerald-100">{daysLeft}d left</span>
                  <span>{formatDate(item.returnBy)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

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
                      <button
                        onClick={() => markReturned(item.id)}
                        disabled={loadingId === item.id + "-returned"}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-cyan-200/50 hover:bg-white/10 disabled:opacity-60"
                      >
                        {loadingId === item.id + "-returned" ? "…" : "Mark returned"}
                      </button>
                      <button
                        onClick={() => markRefunded(item)}
                        disabled={loadingId === item.id + "-refunded"}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-emerald-200/50 hover:bg-white/10 disabled:opacity-60"
                      >
                        {loadingId === item.id + "-refunded" ? "…" : "Mark refunded"}
                      </button>
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
              const steps = [
                { title: "Purchased", date: formatDate(item.purchaseDate), active: true },
                { title: "Return by", date: formatDate(item.returnBy), active: true },
                { title: "Dropped off", date: formatDate(item.dropoffDate), active: ["DROPPED_OFF", "REFUNDED"].includes(item.status) },
                { title: "Refunded", date: formatDate(item.refundedDate), active: item.status === "REFUNDED" },
              ];
              return (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/30">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Return</p>
                      <p className="text-lg font-semibold text-white">{item.store}</p>
                      <p className="text-xs text-slate-400">{item.itemNote}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.chip}`}>{meta.label}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-100">
                    <span>{item.amountCents != null ? formatMoney(item.amountCents, item.currency ?? "CAD") : "—"}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-emerald-100">
                      {Math.max(0, Math.ceil((new Date(item.returnBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d left
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {steps.map((step, idx) => (
                      <div key={step.title} className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${step.active ? "bg-white/15 text-white" : "bg-white/5 text-slate-500"}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${step.active ? "text-white" : "text-slate-400"}`}>{step.title}</p>
                          <p className="text-xs text-slate-400">{step.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markReturned(item.id)}
                        disabled={loadingId === item.id + "-returned"}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-cyan-200/50 hover:bg-white/10 disabled:opacity-60"
                      >
                        {loadingId === item.id + "-returned" ? "…" : "Mark returned"}
                      </button>
                      <button
                        onClick={() => markRefunded(item)}
                        disabled={loadingId === item.id + "-refunded"}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-emerald-200/50 hover:bg-white/10 disabled:opacity-60"
                      >
                        {loadingId === item.id + "-refunded" ? "…" : "Mark refunded"}
                      </button>
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
      )}
    </div>
  );
}
