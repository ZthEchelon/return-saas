//automation page

"use client";

import Link from "next/link";
import { useState } from "react";

export default function AutomationHome() {
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<number | null>(null);

  async function scanNow() {
    setScanning(true);
    setFound(null);
    try {
      const res = await fetch("/api/automation/scan", { method: "POST" });
      const data = await res.json();
      setFound(data.found ?? 0);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white/50 p-4 shadow-sm space-y-4">
      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">Connection</div>
        <div className="mt-1 text-sm opacity-70">
          Gmail/Outlook OAuth hookup comes next. For now, Scan generates demo suggestions.
        </div>

        <div className="mt-3 flex gap-2">
          <button className="rounded-xl border px-3 py-2 text-sm opacity-60" disabled>
            Connect Gmail (soon)
          </button>
          <button className="rounded-xl border px-3 py-2 text-sm opacity-60" disabled>
            Connect Outlook (soon)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">Scan controls</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border px-3 py-2 text-sm opacity-70">Scope: Inbox</div>
          <div className="rounded-xl border px-3 py-2 text-sm opacity-70">Range: last 30 days</div>
          <div className="rounded-xl border px-3 py-2 text-sm opacity-70">Types: all</div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
            onClick={scanNow}
            disabled={scanning}
          >
            {scanning ? "Scanning…" : "Scan now"}
          </button>

          <Link className="text-sm underline opacity-80" href="/dashboard/automation/review">
            Go to Inbox Review
          </Link>

          {found != null ? (
            <div className="text-sm opacity-70">Found: {found} suggestions</div>
          ) : null}
        </div>

        <div className="mt-2 text-xs opacity-60">
          Nothing is created automatically. You confirm every item.
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">Privacy-first</div>
        <ul className="mt-2 text-sm opacity-70 list-disc pl-5 space-y-1">
          <li>Choose what to scan (labels/folders later)</li>
          <li>One-click disconnect (later)</li>
          <li>Delete imported suggestions anytime (later)</li>
        </ul>
      </div>
    </div>
  );
}
