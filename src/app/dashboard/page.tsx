import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm opacity-70">Signed in as: {userId}</p>

      <Link className="inline-flex rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50" href="/dashboard/calendar">
        Open Calendar
      </Link>
    </main>
  );
}
