//page fro bills list

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  type: "RENEWAL" | "RETURN_DEADLINE" | "REFUND_CHECK" | "BILL_DUE";
  date: string; // YYYY-MM-DD
  title: string;
  amountCents?: number;
  currency?: string;
  billStatus?: "DUE" | "PAID";
  monthKey?: string;
  source: { kind: "subscription" | "return" | "bill"; sourceId: string };
};

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addMonthsUTC(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function firstOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function money(cents?: number, currency?: string) {
  if (typeof cents !== "number") return "—";
  return `${currency ?? "CAD"} ${(cents / 100).toFixed(2)}`;
}

export default function BillsList() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = firstOfMonthUTC(new Date());
    const end = addMonthsUTC(start, 4); // 4 months window
    return { start: isoDateOnly(start), end: isoDateOnly(end) };
  }, []);

  async function load() {
    setMsg(null);
    const res = await fetch(`/api/events?start=${range.start}&end=${range.end}`, { cache: "no-store" });
    const data = await res.json();
    setEvents(data.events ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const billEvents = useMemo(
    () => events.filter((e) => e.type === "BILL_DUE").sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  async function togglePaid(e: CalendarEvent) {
    if (!e.monthKey) {
      setMsg("Missing monthKey on bill event.");
      return;
    }

    setBusyId(e.id);
    setMsg(null);

    try {
      const paidNext = e.billStatus !== "PAID";
      const res = await fetch("/api/bills/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: e.source.sourceId,
          monthKey: e.monthKey,
          paid: paidNext,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg(text || "Failed to update bill.");
        return;
      }

      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (billEvents.length === 0) {
    return <div className="rounded-2xl border bg-white/50 p-4 text-sm opacity-70">No bill events in range.</div>;
  }

  return (
    <div className="space-y-3">
      {msg ? <div className="text-sm text-red-600">{msg}</div> : null}

      {billEvents.map((e) => {
        const paid = e.billStatus === "PAID";
        const disabled = busyId === e.id;

        return (
          <div key={e.id} className="rounded-2xl border bg-white/50 p-4 shadow-sm flex items-center justify-between gap-3 hover:border-slate-300 transition">
            <Link href={`/dashboard/bills/${e.source.sourceId}`} className="flex-1 space-y-1">
              <div className="text-sm font-semibold">
                {e.title} <span className="ml-2 text-xs opacity-60">{e.date}</span>
              </div>
              <div className="text-sm opacity-70">
                {money(e.amountCents, e.currency)} ·{" "}
                <span className={paid ? "text-green-700" : "text-amber-700"}>
                  {paid ? "PAID" : "DUE"}
                </span>
              </div>
            </Link>

            <button
              className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
              onClick={() => togglePaid(e)}
              disabled={disabled}
            >
              {paid ? "Mark due" : "Mark paid"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
