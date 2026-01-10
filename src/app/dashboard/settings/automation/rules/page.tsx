// Rules now live under settings

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SettingsRulesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1220] p-6 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-2 h-56 w-56 rounded-full bg-cyan-500/20 blur-[120px]" />
          <div className="absolute right-[-80px] top-8 h-56 w-56 rounded-full bg-emerald-400/18 blur-[120px]" />
        </div>
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100">Settings</p>
          <h1 className="font-display text-4xl text-white">Rules</h1>
          <p className="text-sm text-slate-200/80">Merchant defaults, dedupe, and privacy controls land here.</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/50 p-4 shadow-sm space-y-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Merchant defaults</div>
          <div className="mt-1 text-sm opacity-70">Example: Nike → 30 day return window. (We’ll wire this to DB next.)</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Dedupe</div>
          <div className="mt-1 text-sm opacity-70">Group similar receipts and produce confidence scores. (Next.)</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Privacy</div>
          <div className="mt-1 text-sm opacity-70">Choose labels/folders to scan, disconnect, delete imported data. (Next.)</div>
        </div>
      </div>
    </main>
  );
}
