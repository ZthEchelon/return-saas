//page for automations

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AutomationHome from "@/app/dashboard/automation/ui/AutomationHome";

export default async function AutomationPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Automation</h1>
        <p className="text-sm opacity-70">Connect email, scan, and confirm suggestions.</p>
      </div>
      <AutomationHome />
    </main>
  );
}
