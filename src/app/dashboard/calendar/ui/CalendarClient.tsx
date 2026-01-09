//ui for calendar client 

"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [showAddBill, setShowAddBill] = useState(false);
  const [payAmount, setPayAmount] = useState<string>(""); // dollars input like "120.50"
  const [payNotes, setPayNotes] = useState<string>("");
  const [payLoading, setPayLoading] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddReturn, setShowAddReturn] = useState(false);

  useEffect(() => {
    // initial load for the current month
    const start = initialStart;
    const end = initialEnd;

    loadEvents(start, end).then(setEvents).catch(() => setEvents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grid = useMemo(() => buildMonthGrid(month), [month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.type.localeCompare(b.type));
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const today = toISODateOnlyUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
    return [...events]
      .filter(e => e.date >= today)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type.localeCompare(b.type)))
      .slice(0, 12);
  }, [events]);

  async function goTo(deltaMonths: number) {
    const next = addMonthsUTC(month, deltaMonths);
    setMonth(next);

    const start = toISODateOnlyUTC(startOfMonthUTC(next));
    const end = toISODateOnlyUTC(addMonthsUTC(next, 1));
    const nextEvents = await loadEvents(start, end);
    setEvents(nextEvents);
    setSelected(null);
  }

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
  }, [month]);

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

    setPayLoading(true);
    try {
      await fetch(`/api/returns/${ev.source.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DROPPED_OFF",
          dropoffDate: new Date().toISOString(),
        }),
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
      await fetch(`/api/returns/${ev.source.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REFUNDED",
          refundedDate: new Date().toISOString(),
        }),
      });

      const next = await refreshMonth();
      setSelected(next.find(x => x.source.sourceId === ev.source.sourceId) ?? null);
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Calendar */}
      <div className="rounded-2xl border bg-white/50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{monthLabel}</div>
          <div className="flex gap-2">
            <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => goTo(-1)}>
              Prev
            </button>
            <button
              className="rounded-xl border px-3 py-1 text-sm"
              onClick={() => setShowAddBill(true)}
            >
              Add Bill
            </button>

            <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => setShowAddSub(true)}>
              Add Subscription
            </button>

            <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => setShowAddReturn(true)}>
              Add Return
            </button>

            <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => goTo(1)}>
              Next
            </button>
            <button
              className="rounded-xl border px-3 py-1 text-sm"
              onClick={seedDemo}
              disabled={loading}
              title="Insert demo subscription + return for this month"
            >
              {loading ? "Seeding…" : "Seed demo"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 text-xs opacity-70">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="px-2 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {grid.map(({ date, inMonth }) => {
              const key = toISODateOnlyUTC(date);
              const dayEvents = eventsByDate.get(key) ?? [];
              const dayNum = date.getUTCDate();

              return (
                <div
                  key={key}
                  className={`min-h-[96px] rounded-xl border p-2 ${
                    inMonth ? "bg-white" : "bg-neutral-50 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-xs font-medium">{dayNum}</div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 2).map(ev => (
                      <button
                        key={ev.id}
                        className="w-full truncate rounded-lg border px-2 py-1 text-left text-xs hover:bg-neutral-50"
                        onClick={() => setSelected(ev)}
                        title={ev.title}
                      >
                        <span className="font-medium">{ev.title}</span>
                        {ev.amountCents != null ? (
                          <span className="opacity-70"> · {formatMoney(ev.amountCents, ev.currency ?? "CAD")}</span>
                        ) : null}
                      </button>
                    ))}
                    {dayEvents.length > 2 ? (
                      <div className="text-[11px] opacity-70">+{dayEvents.length - 2} more</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="rounded-2xl border bg-white/50 p-4 shadow-sm">
        <div className="text-sm font-semibold">Upcoming</div>
        <div className="mt-3 space-y-2">
          {upcoming.length === 0 ? (
            <div className="text-sm opacity-70">No upcoming events.</div>
          ) : (
            upcoming.map(ev => (
              <button
                key={ev.id}
                className="w-full rounded-xl border px-3 py-2 text-left hover:bg-neutral-50"
                onClick={() => setSelected(ev)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-medium">{ev.title}</div>
                  <div className="text-sm opacity-70">
                    {ev.amountCents != null ? formatMoney(ev.amountCents, ev.currency ?? "CAD") : ""}
                  </div>
                </div>
                <div className="mt-1 text-xs opacity-70">
                  {ev.date} · {ev.type.replaceAll("_", " ").toLowerCase()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Details drawer */}
      {selected ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white p-6 shadow-xl">
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
            </div>

            {selected.type === "BILL_DUE" ? (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-70">Status</span>
                  <span className="font-medium">{selected.billStatus ?? "DUE"}</span>
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
              <button
                className="mt-6 w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                disabled={payLoading}
                onClick={() => cancelSubscription(selected)}
              >
                {payLoading ? "Saving…" : "Mark as Cancelled"}
              </button>
            ) : null}

            {selected.type === "RETURN_DEADLINE" ? (
              <div className="mt-6 space-y-2">
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
