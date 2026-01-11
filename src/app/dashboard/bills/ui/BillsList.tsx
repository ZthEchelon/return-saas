//page fro bills list

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";

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

    try {
      const res = await fetch(`/api/events?start=${range.start}&end=${range.end}`, { cache: "no-store" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to load events (${res.status})`);
      }

      const text = await res.text();
      if (!text) {
        setEvents([]);
        return;
      }

      const data = JSON.parse(text);
      setEvents(data.events ?? []);
    } catch (err) {
      console.error(err);
      setMsg(err instanceof Error ? err.message : "Failed to load events.");
      setEvents([]);
    }
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
    return <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">No bill events in range.</div>;
  }

  return (
    <div className="space-y-3">
      {msg ? <div className="text-sm text-rose-400">{msg}</div> : null}

      {billEvents.map(e => {
        const paid = e.billStatus === "PAID";
        const disabled = busyId === e.id;

        return (
          <div
            key={e.id}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.5)] transition hover:-translate-y-0.5 hover:border-emerald-300/40"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[-40px] top-[-60px] h-40 w-40 rounded-full bg-cyan-500/10 blur-[100px]" />
              <div className="absolute right-[-60px] bottom-[-40px] h-40 w-40 rounded-full bg-emerald-500/10 blur-[100px]" />
            </div>

            <div className="relative flex items-start justify-between gap-3">
              <Link href={`/dashboard/bills/${e.source.sourceId}`} className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {paid ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Clock3 className="h-4 w-4 text-amber-300" />}
                  <span>{e.title}</span>
                  <span className="ml-2 text-xs text-slate-400">{e.date}</span>
                </div>
                <div className="text-sm text-slate-300">
                  {money(e.amountCents, e.currency)} ·{" "}
                  <span className={paid ? "text-emerald-200" : "text-amber-200"}>{paid ? "PAID" : "DUE"}</span>
                </div>
              </Link>

              <button
                className={`relative rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  paid
                    ? "border-emerald-200/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/80"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-200/50 hover:text-white"
                } disabled:opacity-60`}
                onClick={() => togglePaid(e)}
                disabled={disabled}
              >
                {paid ? "Mark due" : "Mark paid"}
              </button>
            </div>

            {paid ? null : (
              <div className="relative mt-3 flex items-center gap-2 text-xs text-amber-200">
                <AlertCircle className="h-4 w-4" />
                <span>Due soon—mark paid when completed.</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
