"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationsBadge() {
  const { data } = useSWR("/api/notifications?unread=1&limit=1", fetcher, { refreshInterval: 60000 });
  const count = data?.unreadCount ?? 0;

  return (
    <Link href="/dashboard/automation/review" className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50">
      Inbox
      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
        {count}
      </span>
    </Link>
  );
}
