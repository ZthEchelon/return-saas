"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationsBadge() {
  const { data } = useSWR("/api/notifications?unread=1&limit=1", fetcher, { refreshInterval: 60000 });
  const count = data?.unreadCount ?? 0;

  return (
    <Link
      href="/dashboard/notifications"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/15 bg-white/5 text-xl transition hover:border-cyan-200/40 hover:bg-white/15"
      title="Notifications"
    >
      🔔
      {count > 0 && (
        <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-slate-950 shadow-md shadow-cyan-500/30">
          {count}
        </span>
      )}
    </Link>
  );
}
