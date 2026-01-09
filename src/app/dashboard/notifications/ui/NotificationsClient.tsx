"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import Link from "next/link";

type NotificationType = "SUBSCRIPTION_RENEWAL_SOON" | "RETURN_DEADLINE_SOON" | "BILL_DUE_SOON" | "REFUND_CHECK_DUE" | "REFUND_OVERDUE";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  eventDate?: string | null;
  scheduledFor: string;
  readAt?: string | null;
  dismissedAt?: string | null;
  sourceKind: string;
  sourceId: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

function typeLabel(t: NotificationType) {
  switch (t) {
    case "SUBSCRIPTION_RENEWAL_SOON": return "Subscription";
    case "RETURN_DEADLINE_SOON": return "Return";
    case "BILL_DUE_SOON": return "Bill";
    case "REFUND_CHECK_DUE": return "Refund check";
    case "REFUND_OVERDUE": return "Refund overdue";
    default: return t;
  }
}

function typePill(t: NotificationType) {
  const map: Record<NotificationType, string> = {
    SUBSCRIPTION_RENEWAL_SOON: "bg-emerald-100 text-emerald-800",
    RETURN_DEADLINE_SOON: "bg-cyan-100 text-cyan-800",
    BILL_DUE_SOON: "bg-indigo-100 text-indigo-800",
    REFUND_CHECK_DUE: "bg-amber-100 text-amber-800",
    REFUND_OVERDUE: "bg-rose-100 text-rose-800",
  };
  return map[t] ?? "bg-slate-100 text-slate-700";
}

export default function NotificationsClient() {
  const { data, mutate, isLoading } = useSWR("/api/notifications?limit=200", fetcher, { refreshInterval: 30000 });
  const [busy, setBusy] = useState(false);

  const notifications: Notification[] = data?.notifications ?? [];
  const unread = notifications.filter(n => !n.readAt && !n.dismissedAt);

  const grouped = useMemo(() => {
    const map = new Map<NotificationType, Notification[]>();
    for (const n of notifications) {
      if (!map.has(n.type)) map.set(n.type, []);
      map.get(n.type)!.push(n);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => (a.scheduledFor > b.scheduledFor ? -1 : 1));
      map.set(k, arr);
    }
    return map;
  }, [notifications]);

  async function mark(ids: string[], action: "READ" | "UNREAD" | "DISMISS") {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    await mark(unread.map(n => n.id), "READ");
  }

  function linkFor(n: Notification) {
    if (n.sourceKind === "bill") return `/dashboard/calendar`;
    if (n.sourceKind === "subscription") return `/dashboard/calendar`;
    if (n.sourceKind === "return") return `/dashboard/calendar`;
    return null;
  }

  if (isLoading) {
    return <div className="rounded-2xl border bg-white/80 p-4 text-sm text-slate-600">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-white">Unread</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{unread.length}</span>
        </div>
        <div className="flex gap-2 text-sm">
          <button className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-slate-300" onClick={markAllRead} disabled={busy || unread.length === 0}>
            Mark all read
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border bg-white/80 p-4 text-sm text-slate-600">
          No notifications yet.
        </div>
      ) : (
        Array.from(grouped.entries()).map(([type, items]) => (
          <div key={type} className="rounded-2xl border bg-white/80 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${typePill(type)}`}>{typeLabel(type)}</span>
                <span className="text-xs text-slate-500">{items.length} items</span>
              </div>
              <button
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => mark(items.map(i => i.id), "READ")}
                disabled={busy}
              >
                Mark read
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((n) => {
                const link = linkFor(n);
                return (
                  <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                        {!n.readAt ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">new</span> : null}
                      </div>
                      {n.body ? <div className="text-xs text-slate-600">{n.body}</div> : null}
                      <div className="text-[11px] text-slate-500">
                        {n.scheduledFor?.slice(0, 10)}{n.eventDate ? ` · event ${n.eventDate.slice(0, 10)}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {link ? (
                        <Link className="pill-link" href={link}>
                          View item
                        </Link>
                      ) : null}
                      {!n.readAt ? (
                        <button
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                          onClick={() => mark([n.id], "READ")}
                          disabled={busy}
                        >
                          Mark read
                        </button>
                      ) : (
                        <button
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                          onClick={() => mark([n.id], "UNREAD")}
                          disabled={busy}
                        >
                          Mark unread
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
