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
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-800 px-6 py-7 shadow-lg">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Schedule hub</p>
          <h1 className="text-4xl font-semibold text-white">Calendar</h1>
          <p className="max-w-2xl text-sm text-indigo-100/80">
            See renewals, bills, returns, and refunds in one bold view. Take action without leaving the page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white backdrop-blur">Automation</span>
          <Link className="pill-link border-white/30 text-white hover:border-white/70 hover:bg-white/10" href="/dashboard/automation">
            Overview
          </Link>
          <Link className="pill-link border-white/30 text-white hover:border-white/70 hover:bg-white/10" href="/dashboard/automation/review">
            Review
          </Link>
          <Link className="pill-link border-white/30 text-white hover:border-white/70 hover:bg-white/10" href="/dashboard/automation/rules">
            Rules
          </Link>
        </div>
      </div>

      <CalendarClient initialStart={start} initialEnd={end} initialEvents={[]} />
    </main>
  );
}
