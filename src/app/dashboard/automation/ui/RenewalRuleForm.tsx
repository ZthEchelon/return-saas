"use client";

import { useEffect, useState } from "react";

type Rule = {
  id: string;
  ruleType: "RENEWAL_REMINDER";
  daysBefore: number;
};

export default function RenewalRuleForm() {
  const [daysBefore, setDaysBefore] = useState(3);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const res = await fetch("/api/settings/rules", { cache: "no-store" });
      const data = await res.json();
      const rule = (data.rules ?? []).find((r: Rule) => r.ruleType === "RENEWAL_REMINDER");
      if (active && rule) setDaysBefore(rule.daysBefore ?? 3);
    })();

    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    await fetch("/api/settings/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleType: "RENEWAL_REMINDER", daysBefore, channels: ["EMAIL_DIGEST"] }),
    });
    setSaving(false);
    setStatus("Saved");
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Renewal reminder</div>
      <p className="mt-1 text-sm opacity-70">Remind me X days before a renewal.</p>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={60}
          value={daysBefore}
          onChange={(e) => setDaysBefore(Number(e.target.value))}
          className="w-20 rounded-lg border px-2 py-1 text-sm"
        />
        <span className="text-sm opacity-70">days before</span>
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {status ? <span className="text-xs text-emerald-700">{status}</span> : null}
      </div>
    </div>
  );
}
