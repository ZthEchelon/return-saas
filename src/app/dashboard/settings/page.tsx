import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import NotificationSettings from "./NotificationSettings";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6 space-y-4">
      <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">Manage digest emails and reminder lead times.</p>
      </div>
      <NotificationSettings />
    </main>
  );
}
