//page to review your automations

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import InboxReview from "@/app/dashboard/automation/ui/InboxReview";

export default async function ReviewPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6">
      <InboxReview />
    </main>
  );
}
