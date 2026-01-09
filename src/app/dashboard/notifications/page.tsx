//ui for notifcations page

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import NotificationsClient from "@/app/dashboard/notifications/ui/NotificationsClient";

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm opacity-70">Renewals to cancel, return deadlines, bills due, refund checks.</p>
      </div>
      <NotificationsClient />
    </main>
  );
}
