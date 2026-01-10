import Link from "next/link";
import { pricingPlans } from "./plans";
import { GeminiUpgradeBadge } from "@/app/ui/GeminiUpgradeBadge";

export const metadata = {
  title: "Pricing | Looply",
  description: "Simple, transparent pricing. Start free and upgrade anytime.",
};

export default function PricingPage() {
  const navLinks = [
    { href: "/", label: "Product" },
    { href: "/#features", label: "Features" },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <div className="theme-light min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <nav className="max-w-6xl mx-auto glass-panel rounded-2xl border px-6 py-3 shadow-lg shadow-orange-200/40">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <div className="w-9 h-9 overflow-hidden rounded-lg bg-white shadow">
                <img src="/looply-logo.png" alt="Looply logo" className="h-full w-full object-cover" />
              </div>
              <span className="font-display font-bold text-xl text-slate-900">Looply</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}>
                  <span className="text-sm font-medium cursor-pointer transition-colors text-slate-600 hover:text-slate-900">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <GeminiUpgradeBadge />
              <Link href="/sign-in">
                <button className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:shadow-md">
                  Log in
                </button>
              </Link>
              <Link href="/sign-up">
                <button className="inline-flex items-center justify-center gap-2 rounded-md border border-orange-200 bg-gradient-to-r from-orange-500 to-emerald-400 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-200/70 hover:shadow-lg">
                  Get Started
                </button>
              </Link>
            </div>

            <button className="md:hidden p-2 text-slate-700" aria-label="Open menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16" />
                <path d="M4 12h16" />
                <path d="M4 19h16" />
              </svg>
            </button>
          </div>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-10 shadow-2xl backdrop-blur">
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-purple-200/40 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/40" />

          <div className="relative space-y-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
              <h1 className="font-display text-4xl font-bold text-slate-900 sm:text-5xl">Simple, transparent plans</h1>
              <p className="max-w-2xl text-sm text-slate-600">Start free, upgrade when you need more. Cancel anytime. All plans include reminders, dashboards, and email notifications.</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
                <span>Start your journey to financial freedom.</span>
                <Link href="/sign-up" className="rounded-full bg-emerald-500 px-2 py-0.5 text-white transition hover:-translate-y-0.5 hover:bg-emerald-600">
                  Upgrade now
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {pricingPlans.map(plan => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border p-6 shadow-sm ${
                    plan.highlight ? "border-emerald-300 bg-emerald-50/60 shadow-lg shadow-emerald-200/60" : "border-slate-200/80 bg-white/80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{plan.badge}</p>
                      <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                      {plan.subtext && <p className="text-xs text-slate-500">{plan.subtext}</p>}
                    </div>
                    {plan.highlight && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Most Popular</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-slate-900">{plan.price}</p>
                    <p className="text-sm text-slate-600">{plan.period}</p>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {plan.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/sign-up"
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-semibold transition ${
                      plan.highlight
                        ? "bg-emerald-500 text-white shadow-lg hover:-translate-y-0.5 hover:bg-emerald-600"
                        : "border border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Need a hand?</p>
                  <h2 className="font-display text-2xl font-bold text-slate-900">Chat with us about the right plan</h2>
                  <p className="text-sm text-slate-600">We can help you import items, set reminders, and pick the right lead times.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:-translate-y-0.5 hover:bg-emerald-600"
                  >
                    Start Free
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    View Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
