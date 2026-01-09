//page to review ibox automations

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Suggestion } from "@/lib/automation";
import { formatMoney } from "@/lib/automation";

type Filter = "ALL" | "RETURN" | "SUBSCRIPTION" | "BILL";

function badge(conf: Suggestion["confidence"]) {
  return conf === "HIGH" ? "High" : conf === "MEDIUM" ? "Medium" : "Low";
}

export default function InboxReview() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [saving, setSaving] = useState(false);

  // editable draft fields (minimal)
  const [purchaseDate, setPurchaseDate] = useState("");
  const [returnBy, setReturnBy] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [amount, setAmount] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/automation/suggestions", { cache: "no-store" });
      const data = await res.json();
      setItems(data.suggestions ?? []);
      const firstNew = (data.suggestions ?? []).find((s: Suggestion) => s.status === "NEW");
      setSelectedId(firstNew?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (s.status !== "NEW") return false;
      if (filter === "ALL") return true;
      return s.type === filter;
    });
  }, [items, filter]);

  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

  useEffect(() => {
    if (!selected) return;
    // prime editor fields from suggestion
    setAmount(
      selected.amountCents != null && selected.amountCents > 0
        ? (selected.amountCents / 100).toFixed(2)
        : ""
    );

    setPurchaseDate(selected.draft.purchaseDate ?? "");
    setReturnBy(selected.draft.returnBy ?? "");
    setRenewalDate(selected.draft.renewalDate ?? "");
    setDueDay(selected.draft.dueDayOfMonth != null ? String(selected.draft.dueDayOfMonth) : "");
  }, [selected]);

  async function act(id: string, action: "CONFIRM" | "IGNORE") {
    setSaving(true);
    try {
      const s = items.find((x) => x.id === id);
      if (!s) return;

      const draft: Partial<Suggestion["draft"]> & { amountCents?: number } = {};

      const dollars = amount.trim();
      if (dollars.length > 0 && Number.isFinite(Number(dollars))) {
        draft.amountCents = Math.round(Number(dollars) * 100);
      }

      if (s.type === "RETURN") {
        if (purchaseDate) draft.purchaseDate = purchaseDate;
        if (returnBy) draft.returnBy = returnBy;
        draft.returnWindowDays = s.draft.returnWindowDays ?? 30;
      }
      if (s.type === "SUBSCRIPTION") {
        if (renewalDate) draft.renewalDate = renewalDate;
        draft.cadence = s.draft.cadence ?? "MONTHLY";
      }
      if (s.type === "BILL") {
        if (dueDay && Number.isFinite(Number(dueDay))) draft.dueDayOfMonth = Number(dueDay);
        draft.autopay = Boolean(s.draft.autopay ?? false);
      }

      await fetch("/api/automation/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, draft }),
      });

      await load();
    } finally {
      setSaving(false);
    }
  }

  async function scanNow() {
    setSaving(true);
    try {
      await fetch("/api/automation/scan", { method: "POST" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <div className="rounded-2xl border bg-white/50 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["ALL", "RETURN", "SUBSCRIPTION", "BILL"] as Filter[]).map((f) => (
              <button
                key={f}
                className={`rounded-xl border px-3 py-1 text-sm ${filter === f ? "bg-white" : "hover:bg-neutral-50"}`}
                onClick={() => setFilter(f)}
              >
                {f === "ALL" ? "All" : f.toLowerCase()}
              </button>
            ))}
          </div>

          <button
            className="rounded-xl border px-3 py-1 text-sm hover:bg-neutral-50 disabled:opacity-60"
            onClick={scanNow}
            disabled={saving}
            title="Generate demo suggestions"
          >
            {saving ? "…" : "Scan"}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="text-sm opacity-70">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm opacity-70">No suggestions to review.</div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                className={`w-full rounded-xl border px-3 py-2 text-left hover:bg-neutral-50 ${
                  selectedId === s.id ? "bg-white" : ""
                }`}
                onClick={() => setSelectedId(s.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-medium">
                    {s.merchant} <span className="opacity-70">· {s.type.toLowerCase()}</span>
                  </div>
                  <div className="text-sm opacity-70">{formatMoney(s.amountCents, s.currency)}</div>
                </div>
                <div className="mt-1 text-xs opacity-70">
                  {s.detectedDate} · {badge(s.confidence)} confidence
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-white/50 p-4 shadow-sm">
        {!selected ? (
          <div className="text-sm opacity-70">Select a suggestion to review.</div>
        ) : (
          <div>
            <div className="text-lg font-semibold">{selected.merchant}</div>
            <div className="mt-1 text-sm opacity-70">
              {selected.type.toLowerCase()} · {badge(selected.confidence)} confidence
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="opacity-70">Detected</span>
                <span>{selected.detectedDate}</span>
              </div>

              <label className="block">
                <div className="mb-1 opacity-70">Amount (optional override, CAD)</div>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="e.g. 120.50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>

              {selected.type === "RETURN" ? (
                <>
                  <label className="block">
                    <div className="mb-1 opacity-70">Purchase date</div>
                    <input
                      type="date"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 opacity-70">Return by</div>
                    <input
                      type="date"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={returnBy}
                      onChange={(e) => setReturnBy(e.target.value)}
                    />
                  </label>
                </>
              ) : null}

              {selected.type === "SUBSCRIPTION" ? (
                <label className="block">
                  <div className="mb-1 opacity-70">Next renewal date</div>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                  />
                </label>
              ) : null}

              {selected.type === "BILL" ? (
                <label className="block">
                  <div className="mb-1 opacity-70">Due day of month</div>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="1–31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                  />
                </label>
              ) : null}

              <div className="rounded-xl border p-3">
                <div className="text-sm font-medium">Why we think this matches</div>
                <ul className="mt-2 list-disc pl-5 text-sm opacity-70 space-y-1">
                  {selected.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                  disabled={saving}
                  onClick={() => act(selected.id, "CONFIRM")}
                >
                  {saving ? "Saving…" : "Confirm & create"}
                </button>
                <button
                  className="flex-1 rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                  disabled={saving}
                  onClick={() => act(selected.id, "IGNORE")}
                >
                  Ignore
                </button>
              </div>

              <div className="text-xs opacity-60">
                Nothing is created until you confirm.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
