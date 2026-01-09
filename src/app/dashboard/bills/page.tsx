//bills page taht ises api/events and toggles paid/due

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BillsList from "@/app/dashboard/bills/ui/BillsList";

export default async function BillsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Bills</h1>
        <p className="text-sm opacity-70">Toggle DUE ↔ PAID. This updates the calendar too.</p>
      </div>

      <BillsList />
    </main>
  );
}
