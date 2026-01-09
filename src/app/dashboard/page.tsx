import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UpgradeButton from "./ui/UpgradeButton";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/80 p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">Signed in as {userId}</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Calendar</div>
              <p className="text-sm text-slate-600">Renewals, returns, refund checks.</p>
            </div>
            <Link className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" href="/dashboard/calendar">
              Open
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Upgrade</div>
              <p className="text-sm text-slate-600">Unlock automation and priority scans.</p>
            </div>
            <UpgradeButton />
          </div>
        </div>
      </div>
    </main>
  );
}
