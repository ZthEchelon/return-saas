import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm opacity-70">Signed in as: {userId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs uppercase tracking-wide opacity-60">Automation</span>
          <Link className="rounded-full border px-3 py-1 hover:bg-neutral-50" href="/dashboard/automation">
            Overview
          </Link>
          <Link className="rounded-full border px-3 py-1 hover:bg-neutral-50" href="/dashboard/automation/review">
            Review
          </Link>
          <Link className="rounded-full border px-3 py-1 hover:bg-neutral-50" href="/dashboard/automation/rules">
            Rules
          </Link>
        </div>
      </div>

      <Link className="inline-flex rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50" href="/dashboard/calendar">
        Open Calendar
      </Link>
      <button
        className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        onClick={async () => {
          const res = await fetch("/api/billing/checkout", { method: "POST" });
          const data = await res.json();
          window.location.href = data.url;
        }}
      >
        Upgrade to Pro
      </button>

    </main>
  );
}
