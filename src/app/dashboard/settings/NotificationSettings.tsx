"use client";

import useSWR from "swr";
import { useState } from "react";

type Pref = {
  emailDigestEnabled: boolean;
  digestHourLocal: number;
  timezone: string;
  subLeadDays: number;
  returnLeadDays: number;
  billLeadDays: number;
  primaryEmail?: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationSettings() {
  const { data, isLoading, error, mutate } = useSWR("/api/settings/notifications", fetcher);
  const pref: Pref | undefined = data?.preference;

  const [saving, setSaving] = useState(false);

  async function save() {
    if (!pref) return;
    setSaving(true);
    try {
      await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pref),
      });
      await mutate();
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Pref>(key: K, value: Pref[K]) {
    mutate(
      (prev: any) => ({
        ...prev,
        preference: { ...(prev?.preference ?? {}), [key]: value },
      }),
      { revalidate: false }
    );
  }

  if (isLoading) return <div className="rounded-2xl border bg-white/80 p-4 text-sm text-slate-600">Loading…</div>;
  if (error || !pref) return <div className="rounded-2xl border bg-rose-50 p-4 text-sm text-rose-700">Failed to load settings.</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white/80 p-4 shadow-sm space-y-3">
        <div className="text-sm font-semibold text-slate-900">Email digest</div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={pref.emailDigestEnabled}
            onChange={(e) => update("emailDigestEnabled", e.target.checked)}
          />
          <span>Send daily digest</span>
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-slate-600">Hour of day (local time)</div>
          <input
            type="number"
            min={0}
            max={23}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={pref.digestHourLocal}
            onChange={(e) => update("digestHourLocal", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-slate-600">Primary email</div>
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={pref.primaryEmail ?? ""}
            onChange={(e) => update("primaryEmail", e.target.value)}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <div className="rounded-2xl border bg-white/80 p-4 shadow-sm space-y-3">
        <div className="text-sm font-semibold text-slate-900">Lead days</div>
        <div className="text-xs text-slate-500">How many days before to get reminders.</div>

        <label className="block text-sm">
          <div className="mb-1 text-slate-600">Subscriptions</div>
          <input
            type="number"
            min={0}
            max={31}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={pref.subLeadDays}
            onChange={(e) => update("subLeadDays", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-slate-600">Returns</div>
          <input
            type="number"
            min={0}
            max={31}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={pref.returnLeadDays}
            onChange={(e) => update("returnLeadDays", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-slate-600">Bills</div>
          <input
            type="number"
            min={0}
            max={31}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={pref.billLeadDays}
            onChange={(e) => update("billLeadDays", Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
