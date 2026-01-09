import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import OnboardingWizard from "./ui/OnboardingWizard";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1220] p-6 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-emerald-400/18 blur-[120px]" />
          <div className="absolute right-[-80px] top-10 h-56 w-56 rounded-full bg-cyan-500/20 blur-[120px]" />
        </div>
        <div className="relative space-y-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-100">Onboarding</p>
          <h1 className="font-display text-4xl text-white">3 steps. Fast value. Skippable.</h1>
          <p className="text-sm text-slate-200/80">Add a return, add a subscription, pick lead times. You can skip or resume later.</p>
        </div>
      </div>

      <OnboardingWizard />
    </div>
  );
}
