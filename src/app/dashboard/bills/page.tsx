//bills page taht ises api/events and toggles paid/due

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BillsList from "@/app/dashboard/bills/ui/BillsList";

export default async function BillsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1220] p-6 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-6 h-56 w-56 rounded-full bg-cyan-500/20 blur-[120px]" />
          <div className="absolute right-[-60px] top-12 h-56 w-56 rounded-full bg-emerald-400/18 blur-[120px]" />
        </div>
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100">Bills HQ</p>
            <h1 className="font-display text-4xl text-white">Due vs paid at a glance.</h1>
            <p className="max-w-3xl text-sm text-slate-200/80">
              Toggle DUE ↔ PAID; updates reflect in calendar and analytics. Color-coded chips keep status obvious.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white">Timeline</span>
            <Link href="/dashboard/calendar" className="pill-link">
              Calendar
            </Link>
            <Link href="/dashboard/settings" className="pill-link">
              Lead times
            </Link>
          </div>
        </div>
      </div>

      <BillsList />
    </div>
  );
}
