"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/events";
import { formatMoney } from "@/lib/events";

type Props = {
  initialStart: string;
  initialEnd: string;
  initialEvents: CalendarEvent[];
};

type ViewMode = "agenda" | "month";

type BucketKey = "today" | "thisWeek" | "nextWeek" | "later";

function parseISODateOnly(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISODateOnlyUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonthsUTC(d: Date, delta: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

function addDaysUTC(d: Date, delta: number) {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

function weekdayUTC(d: Date) {
  return d.getUTCDay();
}

function daysInMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

function buildMonthGrid(month: Date) {
  const first = startOfMonthUTC(month);
  const leading = weekdayUTC(first);
  const days = daysInMonthUTC(first);
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = leading - 1; i >= 0; i--) {
    const d = new Date(first);
    d.setUTCDate(first.getUTCDate() - (i + 1));
    cells.push({ date: d, inMonth: false });
  }
  for (let day = 1; day <= days; day++) {
    cells.push({ date: new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: addDaysUTC(last, 1), inMonth: false });
  }
  return cells;
}

function daysBetween(aISO: string, bISO: string) {
  const a = parseISODateOnly(aISO).getTime();
  const b = parseISODateOnly(bISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

async function loadEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const res = await fetch(`/api/events?start=${start}&end=${end}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events ?? []) as CalendarEvent[];
}

function humanLabel(ev: CalendarEvent) {
  switch (ev.type) {
    case "BILL_DUE":
      return "Bill due";
    case "RENEWAL":
      return "Renews";
    case "CANCELLED_SUBSCRIPTION":
      return "Cancelled";
    case "RETURN_DEADLINE":
      return "Return by";
    case "REFUND_CHECK":
      return "Refund check";
    case "REFUND_EXPECTED":
      return "Refund expected";
    case "REFUNDED":
      return "Refunded";
    default:
      return ev.type.replaceAll("_", " ").toLowerCase();
  }
}

function urgency(ev: CalendarEvent, todayISO: string) {
  const delta = daysBetween(todayISO, ev.date);
  if (delta === 0) return { label: "Today", tone: "text-amber-100" };
  if (delta < 0) return { label: `${Math.abs(delta)}d overdue`, tone: "text-rose-100" };
  if (delta === 1) return { label: "Tomorrow", tone: "text-emerald-100" };
  return { label: `In ${delta}d`, tone: "text-slate-200" };
}

function typeTone(ev: CalendarEvent) {
  switch (ev.type) {
    case "BILL_DUE":
      return ev.billStatus === "PAID" ? "border-emerald-300/40 bg-emerald-500/10" : "border-indigo-300/40 bg-indigo-500/10";
    case "RENEWAL":
      return "border-emerald-300/40 bg-emerald-500/10";
    case "CANCELLED_SUBSCRIPTION":
      return "border-slate-300/30 bg-slate-800/60";
    case "RETURN_DEADLINE":
      return "border-cyan-300/40 bg-cyan-500/10";
    case "REFUND_CHECK":
    case "REFUND_EXPECTED":
      return "border-amber-300/40 bg-amber-500/10";
    case "REFUNDED":
      return "border-emerald-300/40 bg-emerald-500/10";
    default:
      return "border-white/15 bg-white/5";
  }
}

function typePill(ev: CalendarEvent) {
  switch (ev.type) {
    case "BILL_DUE":
      return ev.billStatus === "PAID"
        ? "bg-emerald-400/25 text-emerald-50"
        : "bg-indigo-500/25 text-indigo-100";
    case "RENEWAL":
      return "bg-emerald-500/20 text-emerald-100";
    case "CANCELLED_SUBSCRIPTION":
      return "bg-slate-500/25 text-slate-100";
    case "RETURN_DEADLINE":
      return "bg-cyan-500/20 text-cyan-100";
    case "REFUND_CHECK":
    case "REFUND_EXPECTED":
      return "bg-amber-500/20 text-amber-100";
    case "REFUNDED":
      return "bg-emerald-400/25 text-emerald-50";
    default:
      return "bg-white/15 text-slate-100";
  }
}

function editLinkFor(ev: CalendarEvent) {
  if (ev.source.kind === "bill") return `/dashboard/bills/${ev.source.sourceId}`;
  if (ev.source.kind === "subscription") return `/dashboard/subscriptions/${ev.source.sourceId}`;
  if (ev.source.kind === "return") return `/dashboard/returns/${ev.source.sourceId}`;
  return "#";
}

export default function CalendarClient({ initialStart, initialEnd, initialEvents }: Props) {
  const [view, setView] = useState<ViewMode>("agenda");
  const [month, setMonth] = useState(() => startOfMonthUTC(parseISODateOnly(initialStart)));
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set(["BILL", "SUBSCRIPTION", "RETURN"]));
  const [autopayOnly, setAutopayOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [payInputs, setPayInputs] = useState<Record<string, string>>({});
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [snoozeDays, setSnoozeDays] = useState(3);
  const [banner, setBanner] = useState<string | null>(null);

  const todayISO = useMemo(() => {
    const now = new Date();
    return toISODateOnlyUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  }, []);

  const monthGrid = useMemo(() => buildMonthGrid(month), [month]);

  // Fetch for visible 42-day window
  const fetchWindow = useMemo(() => {
    const start = toISODateOnlyUTC(monthGrid[0]?.date ?? startOfMonthUTC(month));
    const end = toISODateOnlyUTC(addDaysUTC(monthGrid[41]?.date ?? month, 1));
    return { start, end };
  }, [monthGrid, month]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadEvents(fetchWindow.start, fetchWindow.end)
      .then(next => {
        if (active) setEvents(next);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fetchWindow.start, fetchWindow.end]);

  // Filtering
  const filteredEvents = useMemo(() => {
    return events
      .filter(e => !snoozedIds.has(e.id))
      .filter(e => {
      let typeMatch = false;
      if (filterTypes.has("BILL") && e.type === "BILL_DUE") typeMatch = true;
      if (filterTypes.has("SUBSCRIPTION") && (e.type === "RENEWAL" || e.type === "CANCELLED_SUBSCRIPTION")) typeMatch = true;
      if (filterTypes.has("RETURN") && (e.type === "RETURN_DEADLINE" || e.type === "REFUND_CHECK" || e.type === "REFUND_EXPECTED" || e.type === "REFUNDED")) typeMatch = true;
      if (!typeMatch) return false;

      if (autopayOnly && e.type === "BILL_DUE" && !e.autopay) return false;

      if (overdueOnly) {
        if (e.date >= todayISO) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!e.title.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [events, filterTypes, autopayOnly, overdueOnly, searchQuery, todayISO, snoozedIds]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of filteredEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => (a.date === b.date ? a.type.localeCompare(b.type) : a.date.localeCompare(b.date)));
    }
    return map;
  }, [filteredEvents]);

  const agendaBuckets = useMemo(() => {
    const buckets: Record<BucketKey, CalendarEvent[]> = {
      today: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
    };
    for (const ev of filteredEvents) {
      const delta = daysBetween(todayISO, ev.date);
      if (delta < 0) continue;
      if (delta === 0) buckets.today.push(ev);
      else if (delta <= 7) buckets.thisWeek.push(ev);
      else if (delta <= 14) buckets.nextWeek.push(ev);
      else if (delta <= 30) buckets.later.push(ev);
    }
    for (const key of Object.keys(buckets) as BucketKey[]) {
      buckets[key].sort((a, b) => (a.date === b.date ? a.type.localeCompare(b.type) : a.date.localeCompare(b.date)));
    }
    return buckets;
  }, [filteredEvents, todayISO]);

  const totals = useMemo(() => {
    const weekEnd = toISODateOnlyUTC(addDaysUTC(parseISODateOnly(todayISO), 7));
    const monthEnd = toISODateOnlyUTC(addMonthsUTC(parseISODateOnly(todayISO), 1));
    const inRange = (endISO: string) =>
      filteredEvents.filter(e => e.date >= todayISO && e.date < endISO && e.amountCents != null).reduce((sum, e) => sum + (e.amountCents ?? 0), 0);
    return {
      weekAmount: inRange(weekEnd),
      monthAmount: inRange(monthEnd),
    };
  }, [filteredEvents, todayISO]);

  const handleGoMonth = async (delta: number) => {
    setMonth(m => addMonthsUTC(m, delta));
    setSelectedDay(null);
  };

  const onSelectDay = (iso: string) => {
    setSelectedDay(iso);
    setSelectedEvent(null);
  };

  const setPayInput = useCallback((id: string, value: string) => setPayInputs(prev => ({ ...prev, [id]: value })), []);
  const setTrackingInput = useCallback((id: string, value: string) => setTrackingInputs(prev => ({ ...prev, [id]: value })), []);

  const refresh = useCallback(async () => {
    const next = await loadEvents(fetchWindow.start, fetchWindow.end);
    setEvents(next);
    return next;
  }, [fetchWindow.start, fetchWindow.end]);

  const actionWrap = useCallback(async (id: string, fn: () => Promise<void>) => {
    setActionLoading(id);
    try {
      await fn();
      await refresh();
    } finally {
      setActionLoading(null);
    }
  }, [refresh]);

  // Quick actions
  const markBill = (ev: CalendarEvent, mark: "PAID" | "DUE") => {
    if (ev.type !== "BILL_DUE") return;
    return actionWrap(ev.id, async () => {
      const input = payInputs[ev.id];
      const cents = input && input.trim().length ? Math.round(Number(input) * 100) : undefined;
      await fetch(`/api/bills/${ev.source.sourceId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: ev.date, mark, amountCents: Number.isFinite(cents) ? cents : undefined }),
      });
    });
  };

  const cancelSubscription = (ev: CalendarEvent) => {
    if (ev.type !== "RENEWAL") return;
    return actionWrap(ev.id, async () => {
      await fetch(`/api/subscriptions/${ev.source.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
    });
  };

  const markDroppedOff = (ev: CalendarEvent) => {
    if (ev.type !== "RETURN_DEADLINE") return;
    return actionWrap(ev.id, async () => {
      const tracking = trackingInputs[ev.id]?.trim();
      await fetch(`/api/returns/${ev.source.sourceId}/mark-returned`, {
        method: "POST",
        headers: tracking ? { "Content-Type": "application/json" } : undefined,
        body: tracking ? JSON.stringify({ trackingNumber: tracking }) : undefined,
      });
    });
  };

  const markRefunded = (ev: CalendarEvent) => {
    if (ev.type !== "REFUND_CHECK" && ev.type !== "REFUND_EXPECTED" && ev.type !== "RETURN_DEADLINE") return;
    return actionWrap(ev.id, async () => {
      await fetch(`/api/returns/${ev.source.sourceId}/mark-refunded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundAmountCents: ev.amountCents ?? undefined }),
      });
    });
  };

  const snooze = (ev: CalendarEvent) => {
    return actionWrap(ev.id, async () => {
      await fetch("/api/events/snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ev.id, type: ev.type, date: ev.date, delayDays: snoozeDays, source: ev.source }),
      });
      setSnoozedIds(prev => {
        const next = new Set(prev);
        next.add(ev.id);
        return next;
      });
      setBanner(`Snoozed ${ev.title} for ${snoozeDays} day${snoozeDays === 1 ? "" : "s"}`);
      setTimeout(() => setBanner(null), 3000);
    });
  };

  // UI helpers
  const renderEventRow = (ev: CalendarEvent) => {
    const urg = urgency(ev, todayISO);
    return (
      <div key={ev.id} className={`rounded-xl border px-3 py-3 text-sm shadow-sm ${typeTone(ev)}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-white">{ev.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typePill(ev)}`}>{humanLabel(ev)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-100">
              <span>{ev.amountCents != null ? formatMoney(ev.amountCents, ev.currency ?? "CAD") : "No amount"}</span>
              <span className={`text-[11px] ${urg.tone}`}>{urg.label}</span>
              {ev.type === "BILL_DUE" && ev.autopay ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">autopay</span> : null}
            </div>
          </div>
          <button
            className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-100 transition hover:border-cyan-200/50 hover:bg-white/10"
            onClick={() => setSelectedEvent(ev)}
          >
            Details
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-100">
          {ev.type === "BILL_DUE" ? (
            <>
              <input
                value={payInputs[ev.id] ?? ""}
                onChange={e => setPayInput(ev.id, e.target.value)}
                placeholder="Amount (optional)"
                className="w-32 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px]"
              />
              <button
                className="rounded-full border border-emerald-200/50 bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-50 hover:-translate-y-0.5 transition"
                disabled={actionLoading === ev.id}
                onClick={() => markBill(ev, ev.billStatus === "PAID" ? "DUE" : "PAID")}
              >
                {actionLoading === ev.id ? "Saving…" : ev.billStatus === "PAID" ? "Mark Due" : "Mark Paid"}
              </button>
            </>
          ) : null}

          {ev.type === "RENEWAL" ? (
            <button
              className="rounded-full border border-rose-200/50 bg-rose-500/20 px-3 py-1 font-semibold text-rose-50 hover:-translate-y-0.5 transition"
              disabled={actionLoading === ev.id}
              onClick={() => cancelSubscription(ev)}
            >
              {actionLoading === ev.id ? "Saving…" : "Cancel"}
            </button>
          ) : null}

          {ev.type === "RETURN_DEADLINE" ? (
            <>
              <input
                value={trackingInputs[ev.id] ?? ""}
                onChange={e => setTrackingInput(ev.id, e.target.value)}
                placeholder="Tracking #"
                className="w-36 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px]"
              />
              <button
                className="rounded-full border border-cyan-200/50 bg-cyan-500/20 px-3 py-1 font-semibold text-cyan-50 hover:-translate-y-0.5 transition"
                disabled={actionLoading === ev.id}
                onClick={() => markDroppedOff(ev)}
              >
                {actionLoading === ev.id ? "Saving…" : "Dropped off"}
              </button>
              <button
                className="rounded-full border border-emerald-200/50 bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-50 hover:-translate-y-0.5 transition"
                disabled={actionLoading === ev.id}
                onClick={() => markRefunded(ev)}
              >
                {actionLoading === ev.id ? "Saving…" : "Mark refunded"}
              </button>
            </>
          ) : null}

          {ev.type === "REFUND_CHECK" || ev.type === "REFUND_EXPECTED" ? (
            <button
              className="rounded-full border border-emerald-200/50 bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-50 hover:-translate-y-0.5 transition"
              disabled={actionLoading === ev.id}
              onClick={() => markRefunded(ev)}
            >
              {actionLoading === ev.id ? "Saving…" : "Mark refunded"}
            </button>
          ) : null}

          <button
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-slate-100 hover:-translate-y-0.5 transition"
            disabled={actionLoading === ev.id}
            onClick={() => snooze(ev)}
          >
            {actionLoading === ev.id ? "Snoozing…" : "Snooze"}
          </button>
        </div>
      </div>
    );
  };

  const dayDrawerEvents = selectedDay ? eventsByDate.get(selectedDay) ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-semibold text-white">Calendar</div>
          <div className="text-sm text-slate-300">Agenda-first. Click a day to open its drawer; month view is navigation only.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${view === "agenda" ? "border-cyan-200/60 bg-white/10 text-white" : "border-white/10 bg-white/5 text-slate-200"}`}
            onClick={() => setView("agenda")}
          >
            Agenda
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${view === "month" ? "border-cyan-200/60 bg-white/10 text-white" : "border-white/10 bg-white/5 text-slate-200"}`}
            onClick={() => setView("month")}
          >
            Month
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30 space-y-3">
        {banner ? (
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-50">
            {banner}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
          <span className="font-semibold">Filters:</span>
          {[
            { key: "BILL", label: "Bills" },
            { key: "SUBSCRIPTION", label: "Subs" },
            { key: "RETURN", label: "Returns" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => {
                const next = new Set(filterTypes);
                next.has(f.key) ? next.delete(f.key) : next.add(f.key);
                setFilterTypes(next);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filterTypes.has(f.key)
                  ? "border-cyan-200/60 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {f.label} {filterTypes.has(f.key) ? "✓" : ""}
            </button>
          ))}
          <button
            onClick={() => setAutopayOnly(v => !v)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              autopayOnly
                ? "border-violet-200/60 bg-violet-500/20 text-violet-50"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            Autopay (bills) {autopayOnly ? "✓" : ""}
          </button>
          <button
            onClick={() => setOverdueOnly(v => !v)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              overdueOnly
                ? "border-rose-200/60 bg-rose-500/20 text-rose-50"
                : "border-white/10 bg-white/5 text-slate-200 hover-border-white/20 hover:bg-white/10"
            }`}
          >
            Overdue {overdueOnly ? "✓" : ""}
          </button>
          <div className="ml-2 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
            <span className="text-xs text-slate-300">Snooze for</span>
            <select
              className="rounded-md bg-slate-900/40 px-2 py-1 text-xs text-white focus:border-cyan-300/60 focus:outline-none"
              value={snoozeDays}
              onChange={e => setSnoozeDays(Number(e.target.value) || 3)}
            >
              {[1, 3, 7, 14].map(d => (
                <option key={d} value={d}>{d}d</option>
              ))}
            </select>
          </div>
        </div>
        <div className="relative">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by merchant/store"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-200/20"
          />
          {searchQuery && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setSearchQuery("")}>✕</button>
          )}
        </div>
        <div className="flex gap-3 text-xs text-slate-200">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] text-slate-400">This week total</div>
            <div className="text-sm font-semibold text-white">{totals.weekAmount ? formatMoney(totals.weekAmount, "CAD") : "—"}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] text-slate-400">This month total</div>
            <div className="text-sm font-semibold text-white">{totals.monthAmount ? formatMoney(totals.monthAmount, "CAD") : "—"}</div>
          </div>
          {loading ? <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">Loading…</div> : null}
        </div>
      </div>

      {view === "agenda" ? (
        <div className="space-y-4">
          {([
            ["today", "Today"],
            ["thisWeek", "This Week"],
            ["nextWeek", "Next Week"],
            ["later", "Later"],
          ] as [BucketKey, string][]).map(([key, label]) => {
            const list = agendaBuckets[key];
            return (
              <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/30">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white">{label}</div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">{list.length} items</div>
                </div>
                <div className="mt-3 space-y-3">
                  {list.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/30 px-3 py-4 text-sm text-slate-300">Nothing here.</div>
                  ) : (
                    list.map(renderEventRow)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold text-white">{new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(month)}</div>
              <div className="text-sm text-slate-300">Month is for navigation; click any day for the Day Drawer.</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-slate-100 transition hover:border-cyan-200/40 hover:bg-white/20" onClick={() => handleGoMonth(-1)}>← Prev</button>
              <button className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-slate-100 transition hover:border-cyan-200/40 hover:bg-white/20" onClick={() => handleGoMonth(1)}>Next →</button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map(d => (
              <div key={d} className="px-2 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthGrid.map(({ date, inMonth }) => {
              const iso = toISODateOnlyUTC(date);
              const dayEvents = eventsByDate.get(iso) ?? [];
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  onClick={() => onSelectDay(iso)}
                  className={`relative min-h-24 rounded-xl border px-2 py-2 text-left transition ${
                    inMonth ? "bg-slate-900/60 hover:border-cyan-200/40" : "bg-slate-900/30 text-slate-500"
                  } ${isToday ? "ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-slate-950" : ""}`}
                >
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="font-semibold">{date.getUTCDate()}</span>
                    {dayEvents.length > 0 ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">{dayEvents.length}</span>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-1 text-[11px]">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} className="flex items-center gap-1 truncate text-slate-100">
                        <span className={`h-2 w-2 rounded-full ${ev.type === "BILL_DUE" ? "bg-indigo-300" : ev.type === "RENEWAL" ? "bg-emerald-300" : "bg-cyan-300"}`} />
                        <span className="truncate">{humanLabel(ev)}</span>
                      </div>
                    ))}
                    {dayEvents.length === 0 ? <span className="text-slate-500">—</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Drawer */}
      {selectedDay ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur" onClick={() => setSelectedDay(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-[440px] border-l border-white/10 bg-slate-900/95 p-6 text-slate-50 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold text-white">{selectedDay}</div>
                <div className="text-sm text-slate-300">Events for this date</div>
              </div>
              <button className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-sm text-slate-100 transition hover:border-cyan-200/40 hover:bg-white/20" onClick={() => setSelectedDay(null)}>
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {dayDrawerEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-black/30 px-3 py-4 text-sm text-slate-300">No events on this day.</div>
              ) : (
                dayDrawerEvents.map(renderEventRow)
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Details Drawer */}
      {selectedEvent ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur" onClick={() => setSelectedEvent(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-[440px] border-l border-white/10 bg-slate-900/95 p-6 text-slate-50 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">{selectedEvent.title}</div>
                <div className="mt-1 text-sm text-slate-300">{selectedEvent.date} · {humanLabel(selectedEvent)}</div>
              </div>
              <button className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-sm text-slate-100 transition hover:border-cyan-200/40 hover:bg-white/20" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Amount</span>
                <span>{selectedEvent.amountCents != null ? formatMoney(selectedEvent.amountCents, selectedEvent.currency ?? "CAD") : "—"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Due / event date</span>
                <span className="text-slate-100">{selectedEvent.date}</span>
              </div>

              {selectedEvent.returnBy ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Return by</span>
                  <span className="text-slate-100">{selectedEvent.returnBy}</span>
                </div>
              ) : null}

              {selectedEvent.autopay != null ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Autopay</span>
                  <span className="text-slate-100">{selectedEvent.autopay ? "Enabled" : "Off"}</span>
                </div>
              ) : null}

              {selectedEvent.trackingNumber ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tracking #</span>
                  <span className="text-slate-100">{selectedEvent.trackingNumber}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">Edit page</span>
                <a
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/60 hover:bg-white/10"
                  href={editLinkFor(selectedEvent)}
                >
                  Open
                </a>
              </div>

              <div className="pt-2 space-y-2">
                {selectedEvent.type === "BILL_DUE" ? (
                  <button
                    className="w-full rounded-xl border border-emerald-200/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:-translate-y-0.5"
                    disabled={actionLoading === selectedEvent.id}
                    onClick={() => markBill(selectedEvent, selectedEvent.billStatus === "PAID" ? "DUE" : "PAID")}
                  >
                    {actionLoading === selectedEvent.id ? "Saving…" : selectedEvent.billStatus === "PAID" ? "Mark Due" : "Mark Paid"}
                  </button>
                ) : null}
                {selectedEvent.type === "RENEWAL" ? (
                  <button
                    className="w-full rounded-xl border border-rose-200/50 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:-translate-y-0.5"
                    disabled={actionLoading === selectedEvent.id}
                    onClick={() => cancelSubscription(selectedEvent)}
                  >
                    {actionLoading === selectedEvent.id ? "Saving…" : "Cancel subscription"}
                  </button>
                ) : null}
                {selectedEvent.type === "RETURN_DEADLINE" ? (
                  <button
                    className="w-full rounded-xl border border-cyan-200/50 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:-translate-y-0.5"
                    disabled={actionLoading === selectedEvent.id}
                    onClick={() => markDroppedOff(selectedEvent)}
                  >
                    {actionLoading === selectedEvent.id ? "Saving…" : "Mark dropped off"}
                  </button>
                ) : null}
                {(selectedEvent.type === "REFUND_CHECK" || selectedEvent.type === "REFUND_EXPECTED") ? (
                  <button
                    className="w-full rounded-xl border border-emerald-200/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:-translate-y-0.5"
                    disabled={actionLoading === selectedEvent.id}
                    onClick={() => markRefunded(selectedEvent)}
                  >
                    {actionLoading === selectedEvent.id ? "Saving…" : "Mark refunded"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
