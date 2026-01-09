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
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/80 p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-600">Renewals, return deadlines, and refund checks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-white">Automation</span>
          <Link className="pill-link" href="/dashboard/automation">
            Overview
          </Link>
          <Link className="pill-link" href="/dashboard/automation/review">
            Review
          </Link>
          <Link className="pill-link" href="/dashboard/automation/rules">
            Rules
          </Link>
        </div>
      </div>

      <CalendarClient initialStart={start} initialEnd={end} initialEvents={[]} />
    </main>
  );
}
