"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationsBadge() {
  const { data } = useSWR("/api/notifications?unread=1&limit=1", fetcher, { refreshInterval: 60000 });
  const count = data?.unreadCount ?? 0;

  return (
    <Link
      href="/dashboard/automation/review"
      className="relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-50 transition hover:border-cyan-200/40 hover:bg-white/20 hover:text-white"
    >
      Inbox
      <span className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-2 py-0.5 text-[11px] font-bold text-slate-950 shadow-md shadow-cyan-500/30">
        {count}
      </span>
    </Link>
  );
}
