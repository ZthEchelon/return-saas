"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationsBadge() {
  const { data } = useSWR("/api/notifications?limit=12", fetcher, { refreshInterval: 60000 });
  const count = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-xl transition hover:border-cyan-200/40 hover:bg-white/15"
        title="Notifications"
        aria-expanded={open}
      >
        🔔
        {count > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-[11px] font-bold text-slate-950 shadow-md shadow-cyan-500/30">
            {count}
          </span>
        )}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-white/10 bg-slate-950/95 text-sm text-slate-100 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Notifications</span>
            <Link href="/dashboard/notifications" className="text-cyan-200 hover:text-white" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">No notifications.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {items.slice(0, 8).map((n: { id: string; title?: string; body?: string | null; readAt?: string | null; scheduledFor?: string | null }) => {
                  return (
                    <div key={n.id} className="px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{n.title ?? "Notification"}</p>
                        {!n.readAt ? (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">
                            New
                          </span>
                        ) : null}
                      </div>
                      {n.body ? <p className="mt-1 text-xs text-slate-400 line-clamp-2">{n.body}</p> : null}
                      <p className="mt-1 text-[11px] text-slate-500">
                        {n.scheduledFor ? new Date(n.scheduledFor).toLocaleDateString() : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
