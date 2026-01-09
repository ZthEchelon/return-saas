// Client-side calendar: renders month grid, fetches events per month, and shows an info drawer.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CalendarEvent } from "@/lib/events";
import { formatMoney } from "@/lib/events";


type Props = {
  initialStart: string;
  initialEnd: string;
  initialEvents: CalendarEvent[];
};




function parseISODateOnly(s: string) {
  // s is YYYY-MM-DD
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

function weekdayIndexUTC(d: Date) {
  // 0=Sun..6=Sat
  return d.getUTCDay();
}

function daysInMonthUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  // day 0 of next month = last day of this month
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function buildMonthGrid(month: Date) {
  const first = startOfMonthUTC(month);
  const leading = weekdayIndexUTC(first);
  const totalDays = daysInMonthUTC(first);

  const cells: { date: Date; inMonth: boolean }[] = [];

  // leading days
  for (let i = 0; i < leading; i++) {
    const d = new Date(first);
    d.setUTCDate(d.getUTCDate() - (leading - i));
    cells.push({ date: d, inMonth: false });
  }

  // month days
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ date: new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)), inMonth: true });
  }

  // trailing to fill 6 weeks (42 cells) for stable layout
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() + 1);
    cells.push({ date: d, inMonth: false });
  }

  return cells;
}

async function loadEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const res = await fetch(`/api/events?start=${start}&end=${end}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events ?? []) as CalendarEvent[];
}

export default function CalendarClient({ initialStart, initialEnd, initialEvents }: Props) {
  const [month, setMonth] = useState(() => startOfMonthUTC(parseISODateOnly(initialStart)));
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set(["BILL", "SUBSCRIPTION", "RETURN"]));
  const [autopayOnly, setAutopayOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showAddBill, setShowAddBill] = useState(false);
  const [payAmount, setPayAmount] = useState<string>(""); // dollars input like "120.50"
  const [payNotes, setPayNotes] = useState<string>("");
  const [payLoading, setPayLoading] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddReturn, setShowAddReturn] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [billEdit, setBillEdit] = useState({ name: "", amount: "", dueDay: "", autopay: false });
  const [subEdit, setSubEdit] = useState({ name: "", amount: "", renewalDate: "" });
  const [returnEdit, setReturnEdit] = useState({ store: "", itemNote: "", amount: "", purchaseDate: "", returnBy: "", trackingNumber: "" });

  useEffect(() => {
    if (!selected) return;

    if (selected.type === "BILL_DUE") {
      if (selected.amountCents != null) {
        setPayAmount((selected.amountCents / 100).toFixed(2));
      } else {
        setPayAmount("");
      }
      setPayNotes(selected.autopay ? "autopay" : "");
    } else {
      setPayAmount("");
      setPayNotes("");
    }
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) {
      setBillEdit({ name: "", amount: "", dueDay: "", autopay: false });
      setSubEdit({ name: "", amount: "", renewalDate: "" });
      setReturnEdit({ store: "", itemNote: "", amount: "", purchaseDate: "", returnBy: "", trackingNumber: "" });
      return;
    }

    if (selected.type === "BILL_DUE") {
      setBillEdit({
        name: selected.title,
        amount: selected.amountCents != null ? (selected.amountCents / 100).toFixed(2) : "",
        dueDay: selected.date.slice(-2),
        autopay: Boolean(selected.autopay),
      });
    }

    if (selected.type === "RENEWAL" || selected.type === "CANCELLED_SUBSCRIPTION") {
      setSubEdit({
        name: selected.title.replace(/ cancelled$/i, ""),
        amount: selected.amountCents != null ? (selected.amountCents / 100).toFixed(2) : "",
        renewalDate: selected.date,
      });
    }

    if (selected.source.kind === "return") {
      const [store, note] = selected.title.split(" — ");
      setReturnEdit({
        store: store ?? "",
        itemNote: note ?? "",
        amount: selected.amountCents != null ? (selected.amountCents / 100).toFixed(2) : "",
        purchaseDate: selected.purchaseDate ?? "",
        returnBy: selected.returnBy ?? selected.date,
        trackingNumber: selected.trackingNumber ?? "",
      });
    }
  }, [selected]);

  useEffect(() => {
    // initial load for the current month
    const start = initialStart;
    const end = initialEnd;

    loadEvents(start, end).then(setEvents).catch(() => setEvents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grid = useMemo(() => buildMonthGrid(month), [month]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = toISODateOnlyUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
    
    return events.filter(e => {
      // Type filter
      let matchesType = false;
      if (filterTypes.has("BILL") && e.type === "BILL_DUE") matchesType = true;
      if (filterTypes.has("SUBSCRIPTION") && (e.type === "RENEWAL" || e.type === "CANCELLED_SUBSCRIPTION")) matchesType = true;
      if (filterTypes.has("RETURN") && (e.type === "RETURN_DEADLINE" || e.type === "REFUND_CHECK" || e.type === "REFUND_EXPECTED" || e.type === "REFUNDED")) matchesType = true;
      if (!matchesType) return false;

      // Autopay filter
      if (autopayOnly && !e.autopay) return false;

      // Overdue filter
      if (overdueOnly) {
        if (e.type === "BILL_DUE" && e.billStatus !== "PAID" && e.date < today) {
          // Overdue unpaid bill
        } else if (e.type === "RETURN_DEADLINE" && e.date < today) {
          // Overdue return
        } else {
          return false;
        }
      }

      // Search filter (merchant/store)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = e.title.toLowerCase();
        if (!title.includes(query)) return false;
      }

      return true;
    });
  }, [events, filterTypes, autopayOnly, overdueOnly, searchQuery]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filteredEvents) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.type.localeCompare(b.type));
      map.set(k, arr);
    }
    return map;
  }, [filteredEvents]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const today = toISODateOnlyUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
    return [...filteredEvents]
      .filter(e => e.date >= today)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type.localeCompare(b.type)))
      .slice(0, 12);
  }, [filteredEvents]);

  const monthStartISO = useMemo(() => toISODateOnlyUTC(startOfMonthUTC(month)), [month]);
  const monthEndISO = useMemo(() => toISODateOnlyUTC(addMonthsUTC(month, 1)), [month]);

  const completed = useMemo(() => {
    return filteredEvents
      .filter(e => e.date >= monthStartISO && e.date < monthEndISO)
      .filter(
        e =>
          (e.type === "BILL_DUE" && e.billStatus === "PAID") ||
          e.type === "REFUNDED" ||
          e.type === "CANCELLED_SUBSCRIPTION"
      )
      .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
  }, [events, monthStartISO, monthEndISO]);

  async function goTo(deltaMonths: number) {
    const next = addMonthsUTC(month, deltaMonths);
    setMonth(next);

    const start = toISODateOnlyUTC(startOfMonthUTC(next));
    const end = toISODateOnlyUTC(addMonthsUTC(next, 1));
    // Pull fresh events for the visible month window.
    const nextEvents = await loadEvents(start, end);
    setEvents(nextEvents);
    setSelected(null);
  }

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
  }, [month]);

  const todayISO = useMemo(() => {
    const now = new Date();
    return toISODateOnlyUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  }, []);

  const typePills: Record<CalendarEvent["type"], string> = {
    RENEWAL: "bg-emerald-100 text-emerald-700",
    RETURN_DEADLINE: "bg-cyan-100 text-cyan-700",
    REFUND_CHECK: "bg-amber-100 text-amber-800",
    REFUND_EXPECTED: "bg-amber-100 text-amber-800",
    REFUNDED: "bg-emerald-100 text-emerald-700",
    CANCELLED_SUBSCRIPTION: "bg-slate-200 text-slate-800",
    BILL_DUE: "bg-indigo-100 text-indigo-800",
  };

  const cardBg: Record<CalendarEvent["type"], string> = {
    RENEWAL: "bg-emerald-50",
    RETURN_DEADLINE: "bg-cyan-50",
    REFUND_CHECK: "bg-amber-50",
    REFUND_EXPECTED: "bg-amber-50",
    REFUNDED: "bg-emerald-50",
    CANCELLED_SUBSCRIPTION: "bg-slate-50",
    BILL_DUE: "bg-indigo-50",
  };

  function pillClass(ev: CalendarEvent) {
    if (ev.type === "BILL_DUE") {
      return ev.billStatus === "PAID"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-indigo-100 text-indigo-800";
    }
    return typePills[ev.type];
  }

  function cardClass(ev: CalendarEvent) {
    if (ev.type === "BILL_DUE") {
      return ev.billStatus === "PAID" ? "bg-emerald-50" : "bg-indigo-50";
    }
    return cardBg[ev.type];
  }

  async function seedDemo() {
    setLoading(true);
    try {
      await fetch("/api/dev/seed", { method: "POST" });
      // reload events for the currently visible month
      const start = toISODateOnlyUTC(startOfMonthUTC(month));
      const end = toISODateOnlyUTC(addMonthsUTC(month, 1));
      const nextEvents = await loadEvents(start, end);
      setEvents(nextEvents);
    } finally {
      setLoading(false);
    }
  }

  async function refreshMonth() {
    const start = toISODateOnlyUTC(startOfMonthUTC(month));
    const end = toISODateOnlyUTC(addMonthsUTC(month, 1));
    const nextEvents = await loadEvents(start, end);
    setEvents(nextEvents);
    return nextEvents;
  }

  async function markBill(ev: CalendarEvent, mark: "PAID" | "DUE") {
    if (ev.type !== "BILL_DUE") return;

    setPayLoading(true);
    try {
      const dollars = payAmount.trim();
      const amountCents =
        dollars.length > 0 ? Math.round(Number(dollars) * 100) : undefined;

      await fetch(`/api/bills/${ev.source.sourceId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: ev.date,
          mark,
          amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
          notes: payNotes.trim() || undefined,
        }),
      });

      const next = await refreshMonth();
      setSelected(next.find(x => x.id === ev.id) ?? null);

      // reset inputs after marking paid
      setPayAmount("");
      setPayNotes("");
    } finally {
      setPayLoading(false);
    }
  }

  async function cancelSubscription(ev: CalendarEvent) {
    if (ev.type !== "RENEWAL") return;

    setPayLoading(true);
    try {
      await fetch(`/api/subscriptions/${ev.source.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const next = await refreshMonth();
      setSelected(next.find(x => x.source.sourceId === ev.source.sourceId && x.type === "RENEWAL") ?? null);
    } finally {
      setPayLoading(false);
    }
  }

  async function markDroppedOff(ev: CalendarEvent) {
    if (ev.type !== "RETURN_DEADLINE") return;

    const trackingInput = typeof window !== "undefined" ? window.prompt("Tracking number (optional)") : null;
    const trackingNumber = trackingInput && trackingInput.trim().length > 0 ? trackingInput.trim() : null;

    setPayLoading(true);
    try {
      await fetch(`/api/returns/${ev.source.sourceId}/mark-returned`, {
        method: "POST",
        headers: trackingNumber ? { "Content-Type": "application/json" } : undefined,
        body: trackingNumber ? JSON.stringify({ trackingNumber }) : undefined,
      });

      const next = await refreshMonth();
      // you might still keep the deadline event; refund checks will show once dropoff is set
      setSelected(next.find(x => x.source.sourceId === ev.source.sourceId) ?? null);
    } finally {
      setPayLoading(false);
    }
  }

  async function markRefunded(ev: CalendarEvent) {
    if (ev.source.kind !== "return") return;

    setPayLoading(true);
    try {
      await fetch(`/api/returns/${ev.source.sourceId}/mark-refunded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundAmountCents: ev.amountCents ?? undefined,
        }),
      });

      const next = await refreshMonth();
      setSelected(next.find(x => x.source.sourceId === ev.source.sourceId) ?? null);
    } finally {
      setPayLoading(false);
    }
  }

  async function saveBillEdit() {
    if (!selected || selected.type !== "BILL_DUE") return;
    setEditLoading(true);
    try {
      const amountCents = billEdit.amount.trim().length ? Math.round(Number(billEdit.amount) * 100) : undefined;
      const dueDay = Number(billEdit.dueDay);
      await fetch(`/api/bills/${selected.source.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: billEdit.name,
          amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
          dueDayOfMonth: Number.isFinite(dueDay) ? dueDay : undefined,
          autopay: billEdit.autopay,
        }),
      });
      const next = await refreshMonth();
      setSelected(next.find(x => x.id === selected.id) ?? null);
    } finally {
      setEditLoading(false);
    }
  }

  async function saveSubEdit() {
    if (!selected || (selected.type !== "RENEWAL" && selected.type !== "CANCELLED_SUBSCRIPTION")) return;
    setEditLoading(true);
    try {
      const amountCents = subEdit.amount.trim().length ? Math.round(Number(subEdit.amount) * 100) : undefined;
      await fetch(`/api/subscriptions/${selected.source.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subEdit.name,
          amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
          renewalDate: subEdit.renewalDate ? `${subEdit.renewalDate}T00:00:00.000Z` : undefined,
          status: "ACTIVE",
        }),
      });
      const next = await refreshMonth();
      setSelected(next.find(x => x.source.sourceId === selected.source.sourceId && x.type === "RENEWAL") ?? null);
    } finally {
      setEditLoading(false);
    }
  }

  async function saveReturnEdit() {
    if (!selected || selected.source.kind !== "return") return;
    setEditLoading(true);
    try {
      const amountCents = returnEdit.amount.trim().length ? Math.round(Number(returnEdit.amount) * 100) : undefined;
      await fetch(`/api/returns/${selected.source.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: returnEdit.store,
          itemNote: returnEdit.itemNote || null,
          amountCents: Number.isFinite(amountCents) ? amountCents : null,
          purchaseDate: returnEdit.purchaseDate ? `${returnEdit.purchaseDate}T00:00:00.000Z` : undefined,
          returnBy: returnEdit.returnBy ? `${returnEdit.returnBy}T00:00:00.000Z` : undefined,
          trackingNumber: returnEdit.trackingNumber || null,
        }),
      });
      const next = await refreshMonth();
      setSelected(next.find(x => x.source.sourceId === selected.source.sourceId && x.type === selected.type) ?? null);
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[2.6fr_1fr] xl:grid-cols-[2.8fr_1fr]">
      {/* Calendar */}
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-3xl font-semibold text-slate-900">{monthLabel}</div>
            <div className="text-sm text-slate-500">Renewals, return deadlines, refund checks, and bills.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50" onClick={() => goTo(-1)}>
              ← Prev
            </button>
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50" onClick={() => goTo(1)}>
              Next →
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={seedDemo}
              disabled={loading}
              title="Insert demo subscription + return for this month"
            >
              {loading ? "Seeding…" : "Seed demo"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Renewal</span>
          <span className="rounded-full bg-cyan-100 px-3 py-1 font-semibold text-cyan-700">Return deadline</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">Refund check / expected</span>
          <span className="rounded-full bg-emerald-200 px-3 py-1 font-semibold text-emerald-800">Refunded / paid</span>
          <span className="rounded-full bg-slate-200 px-3 py-1 font-semibold text-slate-800">Cancelled</span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-800">Bill due</span>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Filters:</span>
          </div>
          
          {/* Type filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const next = new Set(filterTypes);
                if (next.has("BILL")) next.delete("BILL");
                else next.add("BILL");
                setFilterTypes(next);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filterTypes.has("BILL")
                  ? "border-indigo-300 bg-indigo-100 text-indigo-800"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Bills {filterTypes.has("BILL") && "✓"}
            </button>
            <button
              onClick={() => {
                const next = new Set(filterTypes);
                if (next.has("SUBSCRIPTION")) next.delete("SUBSCRIPTION");
                else next.add("SUBSCRIPTION");
                setFilterTypes(next);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filterTypes.has("SUBSCRIPTION")
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Subscriptions {filterTypes.has("SUBSCRIPTION") && "✓"}
            </button>
            <button
              onClick={() => {
                const next = new Set(filterTypes);
                if (next.has("RETURN")) next.delete("RETURN");
                else next.add("RETURN");
                setFilterTypes(next);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filterTypes.has("RETURN")
                  ? "border-cyan-300 bg-cyan-100 text-cyan-800"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Returns {filterTypes.has("RETURN") && "✓"}
            </button>
            <button
              onClick={() => setAutopayOnly(!autopayOnly)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                autopayOnly
                  ? "border-violet-300 bg-violet-100 text-violet-800"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Autopay only {autopayOnly && "✓"}
            </button>
            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                overdueOnly
                  ? "border-rose-300 bg-rose-100 text-rose-800"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Overdue only {overdueOnly && "✓"}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by merchant or store..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="text-slate-500">Add items to your calendar:</span>
          <button
            className="rounded-full border border-slate-200 bg-white px-3 py-1 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => setShowAddBill(true)}
          >
            + Add Bill (due date)
          </button>
          <button
            className="rounded-full border border-slate-200 bg-white px-3 py-1 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => setShowAddSub(true)}
          >
            + Add Subscription (renewal)
          </button>
          <button
            className="rounded-full border border-slate-200 bg-white px-3 py-1 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => setShowAddReturn(true)}
          >
            + Add Return (deadline)
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="px-2 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {grid.map(({ date, inMonth }) => {
            const key = toISODateOnlyUTC(date);
            const dayEvents = eventsByDate.get(key) ?? [];
            const dayNum = date.getUTCDate();
            const isToday = key === todayISO;
            
            // Count completed tasks for this day
            const completedOnDay = dayEvents.filter(
              e =>
                (e.type === "BILL_DUE" && e.billStatus === "PAID") ||
                e.type === "REFUNDED" ||
                e.type === "CANCELLED_SUBSCRIPTION"
            ).length;

            return (
              <div
                key={key}
                className={`relative min-h-40 min-w-[160px] md:min-w-[180px] rounded-2xl border p-3 transition ${
                  inMonth ? "bg-white hover:border-slate-300" : "bg-slate-50 text-slate-400"
                } ${isToday ? "ring-2 ring-slate-900 ring-offset-2 ring-offset-white" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`text-sm font-semibold ${isToday ? "text-slate-900" : "text-slate-600"}`}>{dayNum}</div>
                  <div className="flex items-center gap-1">
                    {completedOnDay > 0 ? (
                      <span className="text-base" title={`${completedOnDay} task${completedOnDay > 1 ? "s" : ""} completed`}>⭐</span>
                    ) : null}
                    {dayEvents.length > 3 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">+{dayEvents.length - 3}</span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {dayEvents.slice(0, 3).map(ev => (
                    <button
                      key={ev.id}
                      className={`w-full rounded-xl border border-transparent px-3 py-2 text-left text-xs shadow-sm transition hover:border-slate-200 ${cardClass(ev)}`}
                      onClick={() => setSelected(ev)}
                      title={ev.title}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 truncate font-semibold text-slate-900">{ev.title}</span>
                        <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${pillClass(ev)}`}>
                          {ev.type.replaceAll("_", " ").toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                        <span className="truncate">{ev.amountCents != null ? formatMoney(ev.amountCents, ev.currency ?? "CAD") : "No amount"}</span>
                        {ev.type === "BILL_DUE" && ev.autopay ? (
                          <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">autopay</span>
                        ) : null}
                      </div>
                      {ev.source.kind === "return" && (ev.returnBy || ev.purchaseDate) ? (
                        <div className="mt-1 text-[10px] text-slate-500">
                          {ev.purchaseDate ? `Purchased ${ev.purchaseDate}` : ""}{ev.purchaseDate && ev.returnBy ? " · " : ""}
                          {ev.returnBy ? `Return by ${ev.returnBy}` : ""}
                        </div>
                      ) : null}
                    </button>
                  ))}
                  {dayEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-2 py-6 text-center text-[11px] text-slate-400">
                      Empty
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {/* Upcoming */}
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-slate-900">Upcoming</div>
          <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">{upcoming.length} items</div>
        </div>
        <div className="mt-3 space-y-3">
          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              Nothing scheduled. Add a bill, subscription, or return to see it here.
            </div>
          ) : (
              upcoming.map(ev => (
                <button
                  key={ev.id}
                  className={`w-full rounded-xl border px-3 py-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 ${cardClass(ev)}`}
                  onClick={() => setSelected(ev)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold text-slate-900">{ev.title}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pillClass(ev)}`}>
                      {ev.type.replaceAll("_", " ").toLowerCase()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {ev.date} · {ev.amountCents != null ? formatMoney(ev.amountCents, ev.currency ?? "CAD") : "No amount"}
                    </span>
                    {ev.type === "BILL_DUE" && ev.autopay ? (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        autopay
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Completed */}
        {completed.length > 0 ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-emerald-900">⭐ Completed this month</div>
              <div className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white">{completed.length} items</div>
            </div>
            <div className="mt-3 space-y-2">
              {completed.map(ev => (
                <button
                  key={ev.id}
                  className={`w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left text-xs shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50`}
                  onClick={() => setSelected(ev)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-semibold text-slate-900">{ev.title}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${pillClass(ev)}`}>
                      {ev.type.replaceAll("_", " ").toLowerCase()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                    <span>{ev.date}</span>
                    {ev.type === "BILL_DUE" && ev.autopay ? (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        autopay
                      </span>
                    ) : null}
                  </div>
                    {ev.amountCents != null ? (
                      <div className="text-[11px] text-slate-700">{formatMoney(ev.amountCents, ev.currency ?? "CAD")}</div>
                    ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Details drawer */}
      {selected ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{selected.title}</div>
                <div className="mt-1 text-sm opacity-70">
                  {selected.date} · {selected.type.replaceAll("_", " ").toLowerCase()}
                </div>
              </div>
              <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="opacity-70">Amount</span>
                <span>
                  {selected.amountCents != null ? formatMoney(selected.amountCents, selected.currency ?? "CAD") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">Source</span>
                <span className="capitalize">
                  {selected.source.kind} · {selected.source.sourceId.slice(0, 8)}…
                </span>
              </div>
            {selected.source.kind === "return" ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="opacity-70">Purchase date</span>
                  <span>{selected.purchaseDate ?? "Unknown"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-70">Return by</span>
                  <span>{selected.returnBy ?? "Potential return date not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-70">Tracking #</span>
                  <span>{selected.trackingNumber && selected.trackingNumber.length ? selected.trackingNumber : "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-70">Follow up</span>
                  <Link
                    className="pill-link"
                    href={`https://www.google.com/search?q=${encodeURIComponent((selected.title || "customer service") + " refund")}`}
                    target="_blank"
                  >
                    Contact merchant
                  </Link>
                </div>
              </>
            ) : null}
            </div>

            {selected.type === "BILL_DUE" ? (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-70">Status</span>
                  <span className="font-medium">{selected.billStatus ?? "DUE"}</span>
                </div>
                {selected.autopay !== undefined ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-70">Autopay</span>
                    <span className="font-medium">{selected.autopay ? "On" : "Off"}</span>
                  </div>
                ) : null}

                <div className="rounded-xl border bg-slate-50 p-3 text-sm space-y-2">
                  <div className="font-semibold text-slate-900">Edit bill</div>
                  <label className="block">
                    <div className="text-xs opacity-70">Name</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={billEdit.name} onChange={e => setBillEdit(v => ({ ...v, name: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Amount (CAD)</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={billEdit.amount} onChange={e => setBillEdit(v => ({ ...v, amount: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Due day</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={billEdit.dueDay} onChange={e => setBillEdit(v => ({ ...v, dueDay: e.target.value }))} />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={billEdit.autopay} onChange={e => setBillEdit(v => ({ ...v, autopay: e.target.checked }))} />
                    <span>Autopay</span>
                  </label>
                  <button className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60" disabled={editLoading} onClick={saveBillEdit}>
                    {editLoading ? "Saving…" : "Save bill"}
                  </button>
                </div>

                {selected.billStatus !== "PAID" ? (
                  <>
                    <label className="block text-sm">
                      <div className="mb-1 opacity-70">Amount paid (optional override, CAD)</div>
                      <input
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder="e.g. 120.50"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </label>

                    <label className="block text-sm">
                      <div className="mb-1 opacity-70">Notes (optional)</div>
                      <input
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder="e.g. paid via autopay"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                      />
                    </label>

                    <button
                      className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                      disabled={payLoading}
                      onClick={() => markBill(selected, "PAID")}
                    >
                      {payLoading ? "Saving…" : "Mark as Paid"}
                    </button>
                  </>
                ) : (
                  <button
                    className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                    disabled={payLoading}
                    onClick={() => markBill(selected, "DUE")}
                  >
                    {payLoading ? "Saving…" : "Mark as Due"}
                  </button>
                )}
              </div>
            ) : null}
            {selected.type === "RENEWAL" ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-xl border bg-slate-50 p-3 text-sm space-y-2">
                  <div className="font-semibold text-slate-900">Edit subscription</div>
                  <label className="block">
                    <div className="text-xs opacity-70">Name</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={subEdit.name} onChange={e => setSubEdit(v => ({ ...v, name: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Amount (CAD)</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={subEdit.amount} onChange={e => setSubEdit(v => ({ ...v, amount: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Renewal date</div>
                    <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={subEdit.renewalDate} onChange={e => setSubEdit(v => ({ ...v, renewalDate: e.target.value }))} />
                  </label>
                  <div className="flex gap-2">
                    <button className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60" disabled={editLoading} onClick={saveSubEdit}>
                      {editLoading ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                      disabled={payLoading}
                      onClick={() => cancelSubscription(selected)}
                    >
                      {payLoading ? "Saving…" : "Mark as Cancelled"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {selected.type === "RETURN_DEADLINE" ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-xl border bg-slate-50 p-3 text-sm space-y-2">
                  <div className="font-semibold text-slate-900">Edit return</div>
                  <label className="block">
                    <div className="text-xs opacity-70">Store</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.store} onChange={e => setReturnEdit(v => ({ ...v, store: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Item note</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.itemNote} onChange={e => setReturnEdit(v => ({ ...v, itemNote: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Amount (CAD)</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.amount} onChange={e => setReturnEdit(v => ({ ...v, amount: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Purchase date</div>
                    <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.purchaseDate} onChange={e => setReturnEdit(v => ({ ...v, purchaseDate: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Return by</div>
                    <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.returnBy} onChange={e => setReturnEdit(v => ({ ...v, returnBy: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Tracking # (optional)</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.trackingNumber} onChange={e => setReturnEdit(v => ({ ...v, trackingNumber: e.target.value }))} />
                  </label>
                  <button className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60" disabled={editLoading} onClick={saveReturnEdit}>
                    {editLoading ? "Saving…" : "Save return"}
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                    disabled={payLoading}
                    onClick={() => markDroppedOff(selected)}
                  >
                    {payLoading ? "Saving…" : "Mark Dropped Off"}
                  </button>
                  <button
                    className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                    disabled={payLoading}
                    onClick={() => markRefunded(selected)}
                  >
                    {payLoading ? "Saving…" : "Mark Refunded"}
                  </button>
                </div>
              </div>
            ) : null}

            {selected.type === "REFUND_CHECK" ? (
              <button
                className="mt-6 w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                disabled={payLoading}
                onClick={() => markRefunded(selected)}
              >
                {payLoading ? "Saving…" : "Mark Refunded"}
              </button>
            ) : null}
            {selected.source.kind === "return" && selected.type !== "RETURN_DEADLINE" ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-xl border bg-slate-50 p-3 text-sm space-y-2">
                  <div className="font-semibold text-slate-900">Edit return</div>
                  <label className="block">
                    <div className="text-xs opacity-70">Store</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.store} onChange={e => setReturnEdit(v => ({ ...v, store: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Item note</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.itemNote} onChange={e => setReturnEdit(v => ({ ...v, itemNote: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Amount (CAD)</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.amount} onChange={e => setReturnEdit(v => ({ ...v, amount: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Purchase date</div>
                    <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.purchaseDate} onChange={e => setReturnEdit(v => ({ ...v, purchaseDate: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Return by</div>
                    <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.returnBy} onChange={e => setReturnEdit(v => ({ ...v, returnBy: e.target.value }))} />
                  </label>
                  <label className="block">
                    <div className="text-xs opacity-70">Tracking # (optional)</div>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={returnEdit.trackingNumber} onChange={e => setReturnEdit(v => ({ ...v, trackingNumber: e.target.value }))} />
                  </label>
                  <button className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60" disabled={editLoading} onClick={saveReturnEdit}>
                    {editLoading ? "Saving…" : "Save return"}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mt-8 text-sm opacity-70">
              Next we’ll wire this drawer to real actions: mark cancelled, mark dropped off, mark refunded, edit dates.
            </div>
          </div>
        </div>
      ) : null}

      {showAddBill ? <AddBillModal onClose={() => setShowAddBill(false)} onCreated={refreshMonth} /> : null}
      {showAddSub ? <AddSubscriptionModal onClose={() => setShowAddSub(false)} onCreated={refreshMonth} /> : null}
      {showAddReturn ? <AddReturnModal onClose={() => setShowAddReturn(false)} onCreated={refreshMonth} /> : null}
    </div>
  );
}

function AddBillModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<unknown> }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [autopay, setAutopay] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const amountCents =
        amount.trim().length > 0 ? Math.round(Number(amount) * 100) : undefined;

      await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
          dueDayOfMonth: Number(dueDay),
          autopay,
        }),
      });

      await onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Add Bill</div>
            <div className="mt-1 text-sm opacity-70">Recurring monthly bill with paid tracking.</div>
          </div>
          <button className="rounded-xl border px-3 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block text-sm">
            <div className="mb-1 opacity-70">Name</div>
            <input className="w-full rounded-xl border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Default amount (optional, CAD)</div>
            <input className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="e.g. 2000.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Due day of month (1–31)</div>
            <input className="w-full rounded-xl border px-3 py-2 text-sm" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
            <span>Autopay</span>
          </label>

          <button
            className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
            disabled={saving || name.trim().length === 0}
            onClick={submit}
          >
            {saving ? "Saving…" : "Create Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSubscriptionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [renewalDate, setRenewalDate] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const amountCents = Math.round(Number(amount) * 100);

      await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amountCents,
          currency: "CAD",
          renewalDate: renewalDate + "T00:00:00.000Z",
          cadence: "MONTHLY",
        }),
      });

      await onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 0 && Number.isFinite(Number(amount)) && Number(amount) > 0;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Add Subscription</div>
            <div className="mt-1 text-sm opacity-70">Monthly renewal tracked on your calendar.</div>
          </div>
          <button className="rounded-xl border px-3 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block text-sm">
            <div className="mb-1 opacity-70">Name</div>
            <input className="w-full rounded-xl border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Amount (CAD)</div>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="e.g. 20.99"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Next renewal date</div>
            <input
              type="date"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
            />
          </label>

          <button
            className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
            disabled={saving || !canSave}
            onClick={submit}
          >
            {saving ? "Saving…" : "Create Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddReturnModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<unknown>;
}) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const [store, setStore] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [amount, setAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO);

  const [returnWindowDays, setReturnWindowDays] = useState("30");

  const [returnBy, setReturnBy] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const [saving, setSaving] = useState(false);

  // When purchaseDate or window changes, update returnBy default UNLESS user has manually edited it.
  // Simple version: always recompute returnBy when those change, until you change returnBy directly.
  const [returnByTouched, setReturnByTouched] = useState(false);

  function recomputeReturnBy(pdStr: string, wdStr: string) {
    const wd = Number(wdStr);
    if (!Number.isFinite(wd) || wd <= 0) return;
    const d = new Date(pdStr + "T00:00:00.000Z");
    if (Number.isNaN(d.getTime())) return;
    d.setUTCDate(d.getUTCDate() + wd);
    setReturnBy(d.toISOString().slice(0, 10));
  }

  function onPurchaseDateChange(v: string) {
    setPurchaseDate(v);
    if (!returnByTouched) recomputeReturnBy(v, returnWindowDays);
  }

  function onWindowChange(v: string) {
    setReturnWindowDays(v);
    if (!returnByTouched) recomputeReturnBy(purchaseDate, v);
  }

  async function submit() {
    setSaving(true);
    try {
      const amountCents =
        amount.trim().length > 0 && Number.isFinite(Number(amount)) ? Math.round(Number(amount) * 100) : null;

      const wd = Number(returnWindowDays);

      await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          itemNote: itemNote.trim() || null,
          amountCents,
          currency: "CAD",
          purchaseDate: purchaseDate + "T00:00:00.000Z",
          returnWindowDays: Number.isFinite(wd) && wd > 0 ? wd : 30,
          // NOTE: endpoint currently computes returnBy from purchaseDate+window.
          // We'll update endpoint next to respect manual returnBy.
          returnBy: returnBy + "T00:00:00.000Z",
        }),
      });

      await onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const canSave = store.trim().length > 0 && purchaseDate.length === 10 && returnBy.length === 10;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Add Return</div>
            <div className="mt-1 text-sm opacity-70">Track return-by and refund follow-ups.</div>
          </div>
          <button className="rounded-xl border px-3 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block text-sm">
            <div className="mb-1 opacity-70">Store</div>
            <input className="w-full rounded-xl border px-3 py-2 text-sm" value={store} onChange={(e) => setStore(e.target.value)} />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Item note (optional)</div>
            <input className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="e.g. Air Max" value={itemNote} onChange={(e) => setItemNote(e.target.value)} />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Amount (optional, CAD)</div>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="e.g. 185.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Purchase date</div>
            <input
              type="date"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={purchaseDate}
              onChange={(e) => onPurchaseDateChange(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Return window days (default 30)</div>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={returnWindowDays}
              onChange={(e) => onWindowChange(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Return by (manual)</div>
            <input
              type="date"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={returnBy}
              onChange={(e) => {
                setReturnByTouched(true);
                setReturnBy(e.target.value);
              }}
            />
          </label>

          <button
            className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
            disabled={saving || !canSave}
            onClick={submit}
          >
            {saving ? "Saving…" : "Create Return"}
          </button>
        </div>
      </div>
    </div>
  );
}
