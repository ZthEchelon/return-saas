"use client";

import { useEffect, useState } from "react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  eventDate?: string | null;
  scheduledFor: string;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationsClient() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/notifications?limit=100${filterUnread ? "&unread=1" : ""}`, { cache: "no-store" });
    const data = await res.json();
    setItems(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUnread]);

  async function act(action: "READ" | "UNREAD" | "DISMISS", id: string) {
    setBusy(id);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [id] }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="text-sm opacity-70">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
          onClick={() => setFilterUnread(v => !v)}
        >
          {filterUnread ? "Showing unread" : "Showing all"} · Unread {unreadCount}
        </button>

        <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={load}>
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border bg-white/50 p-4 text-sm opacity-70">No notifications yet.</div>
      ) : (
        items.map(n => {
          const unread = !n.readAt;
          const disabled = busy === n.id;

          return (
            <div key={n.id} className="rounded-2xl border bg-white/50 p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">
                    {n.title}{" "}
                    {unread ? <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">new</span> : null}
                  </div>
                  {n.body ? <div className="text-sm opacity-70">{n.body}</div> : null}
                  <div className="text-xs opacity-60">
                    {n.eventDate ? `Event: ${String(n.eventDate).slice(0, 10)} · ` : ""}
                    Created: {String(n.createdAt).slice(0, 19).replace("T", " ")}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {unread ? (
                    <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60" disabled={disabled} onClick={() => act("READ", n.id)}>
                      Mark read
                    </button>
                  ) : (
                    <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60" disabled={disabled} onClick={() => act("UNREAD", n.id)}>
                      Mark unread
                    </button>
                  )}
                  <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60" disabled={disabled} onClick={() => act("DISMISS", n.id)}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
