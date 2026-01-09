//page for calendar

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
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm opacity-70">Renewals, return deadlines, and refund checks.</p>
      </div>

      <CalendarClient initialStart={start} initialEnd={end} initialEvents={[]} />
    </main>
  );
}
