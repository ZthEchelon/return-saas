//page to review your automations

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import InboxReview from "@/app/dashboard/automation/ui/InboxReview";

export default async function ReviewPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inbox Review</h1>
        <p className="text-sm opacity-70">Confirm suggestions before anything is created.</p>
      </div>
      <InboxReview />
    </main>
  );
}
