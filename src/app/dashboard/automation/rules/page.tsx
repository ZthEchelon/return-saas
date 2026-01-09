//page to review rules 

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RulesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Rules</h1>
        <p className="text-sm opacity-70">Merchant defaults, dedupe, and privacy controls (next).</p>
      </div>

      <div className="rounded-2xl border bg-white/50 p-4 shadow-sm space-y-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Merchant defaults</div>
          <div className="mt-1 text-sm opacity-70">
            Example: Nike → 30 day return window. (We’ll wire this to DB next.)
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Dedupe</div>
          <div className="mt-1 text-sm opacity-70">
            Group similar receipts and produce confidence scores. (Next.)
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Privacy</div>
          <div className="mt-1 text-sm opacity-70">
            Choose labels/folders to scan, disconnect, delete imported data. (Next.)
          </div>
        </div>
      </div>
    </main>
  );
}
