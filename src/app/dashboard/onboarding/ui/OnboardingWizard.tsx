"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const steps = [
  {
    id: 1,
    title: "Add first return",
    description: "Capture the store, amount, and return-by date.",
    fields: [
      { label: "Store", placeholder: "e.g. Nike" },
      { label: "Item", placeholder: "e.g. Air Max 90" },
      { label: "Return by", placeholder: "2024-01-18", type: "date" as const },
    ],
  },
  {
    id: 2,
    title: "Add first subscription",
    description: "Set renewal amount and cadence.",
    fields: [
      { label: "Name", placeholder: "e.g. Spotify" },
      { label: "Amount", placeholder: "9.99" },
      { label: "Renewal date", placeholder: "2024-01-22", type: "date" as const },
    ],
  },
  {
    id: 3,
    title: "Choose lead times",
    description: "Pick when we nudge you before it matters.",
    fields: [
      { label: "Returns lead time (days)", placeholder: "3" },
      { label: "Subscriptions lead time (days)", placeholder: "7" },
      { label: "Bills lead time (days)", placeholder: "5" },
    ],
  },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  const current = steps[step];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Step {step + 1} / {steps.length}</p>
          <h2 className="text-xl font-semibold text-white">{current.title}</h2>
          <p className="text-sm text-slate-300">{current.description}</p>
        </div>
        <Link href="/dashboard" className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-cyan-200/50 hover:bg-white/10">
          Resume later
        </Link>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuchsia-400" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {current.fields.map(field => (
          <label key={field.label} className="block text-sm">
            <div className="mb-1 flex items-center gap-2 text-slate-300">
              <span>{field.label}</span>
              <span className="text-[11px] text-slate-400" title="UI-only helper">?</span>
            </div>
            <input
              type={field.type ?? "text"}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder={field.placeholder}
              value={form[field.label] ?? ""}
              onChange={(e) => setForm(prev => ({ ...prev, [field.label]: e.target.value }))}
            />
          </label>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setStep(idx)}
              className={`h-2 w-10 rounded-full transition ${idx <= step ? "bg-gradient-to-r from-cyan-400 to-emerald-400" : "bg-white/10"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep(prev => Math.min(prev + 1, steps.length - 1))}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-200/50 hover:bg-white/10"
          >
            {step === steps.length - 1 ? "Finish" : "Next"}
          </button>
          <button
            onClick={() => setStep(prev => Math.min(prev + 1, steps.length - 1))}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
