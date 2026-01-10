//page for calendar

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CalendarClient from "./ui/CalendarClient";

function firstDayOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function firstDayOfNextMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
function toISODateOnlyUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function CalendarPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const now = new Date();
  const start = toISODateOnlyUTC(firstDayOfMonthUTC(now));
  const end = toISODateOnlyUTC(firstDayOfNextMonthUTC(now));

  return (
    <main className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1220] px-6 py-7 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-60 w-60 rounded-full bg-cyan-500/20 blur-[120px]" />
          <div className="absolute right-[-80px] top-12 h-60 w-60 rounded-full bg-emerald-400/18 blur-[120px]" />
        </div>
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100">Schedule hub</p>
            <h1 className="font-display text-4xl text-white">Calendar</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Swiss-edited grid with playful kinetic touches. Month + agenda, color-coded statuses, and a right-side drawer for instant edits.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white backdrop-blur">Automation</span>
            <Link className="pill-link border-white/30 text-white hover:border-white/70 hover:bg-white/10" href="/dashboard/settings/automation">
              Overview
            </Link>
            <Link className="pill-link border-white/30 text-white hover:border-white/70 hover:bg-white/10" href="/dashboard/settings/automation/review">
              Review
            </Link>
            <Link className="pill-link border-white/30 text-white hover:border-white/70 hover:bg-white/10" href="/dashboard/settings/automation/rules">
              Rules
            </Link>
          </div>
        </div>
      </div>

      <CalendarClient initialStart={start} initialEnd={end} initialEvents={[]} />
    </main>
  );
}
