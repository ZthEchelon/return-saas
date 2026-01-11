/* Pricing page inspired by the provided animated layout */
"use client";

import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser, UserButton } from "@clerk/nextjs";

type ButtonVariant = "primary" | "secondary";

function ShinyButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuchsia-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5",
    secondary: "border border-white/20 bg-white/5 text-slate-50 hover:border-white/40 hover:bg-white/10",
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
}

function Navbar() {
  const { isSignedIn, user } = useUser();

  const links = [
    { label: "Product", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Dashboard", href: "/dashboard" },
  ];
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/site.png"
            alt="Looply logo"
            width={64}
            height={64}
            className="h-12 w-24 rounded-2xl object-cover drop-shadow-2xl"
            priority
          />
          <span className="sr-only">Looply</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-200 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Hi, {user?.firstName ?? "there"}
              </span>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Link href="/sign-in" className="hidden rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-white/30 hover:bg-white/5 sm:inline-flex">
                Log in
              </Link>
              <Link href="/sign-up" className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/30 hover:-translate-y-0.5">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Free",
      monthly: "0",
      yearly: "0",
      description: "Perfect if you’re just getting organized.",
      features: [
        "Track up to 10 subscriptions + return deadlines",
        "Manual add (fast setup: name, price, dates)",
        "Basic reminders",
        "Simple dashboard for what’s next",
      ],
      cta: "Get started",
      popular: false,
      savings: "",
    },
    {
      name: "Pro",
      monthly: "7.99",
      yearly: "76.99",
      description: "For people who want Looply to actually keep them on track.",
      features: [
        "Unlimited subscriptions, bills, and return windows",
        "Smarter reminders (choose how many + when)",
        "Weekly email digest (so nothing sneaks up on you)",
        "Spending snapshot (your monthly recurring total)",
        "Calendar export (ICS)",
        "CSV export",
      ],
      cta: "Go Pro",
      popular: true,
      savings: "save ~17%",
    },
    {
      name: "Pro+",
      monthly: "14.99",
      yearly: "143.99",
      description: "Maximum automation + insight.",
      features: [
        "Everything in Pro",
        "Email/receipt detection (beta) to auto-find subscriptions + purchases",
        "Smarter insights (price increases, duplicates, “wasted spend” flags)",
        "Returns assistant (deadline checklist + links + notes)",
        "Shared tracking (couples/roommates)",
      ],
      cta: "Get Pro+",
      popular: false,
      savings: "save ~17%",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />

      <div className="px-4 pb-20 pt-32">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h1 className="font-display text-5xl font-bold md:text-6xl">Pricing</h1>
          <p className="mt-4 text-lg text-slate-200">
            Stop losing money on forgotten renewals and missed return windows. Pick a plan that fits how “set-and-forget” you want this to be.
          </p>

          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 text-sm font-medium transition ${
                billingCycle === "monthly" ? "rounded-full bg-gradient-to-r from-cyan-400/80 via-emerald-400/80 to-fuchsia-400/80 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 text-sm font-medium transition ${
                billingCycle === "yearly" ? "rounded-full bg-gradient-to-r from-cyan-400/80 via-emerald-400/80 to-fuchsia-400/80 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Yearly <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">SAVE 20%</span>
            </button>
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">Yearly plans are billed annually.</p>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex h-full flex-col rounded-3xl border p-8 backdrop-blur-sm ${
                plan.popular ? "border-emerald-300/50 bg-emerald-500/5 shadow-lg shadow-emerald-300/20" : "border-white/10 bg-white/5"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/4">
                  <span className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-cyan-500/20">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
                <p className="text-sm text-slate-300">{plan.description}</p>
              </div>

              <div className="mb-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  ${billingCycle === "monthly" ? plan.monthly : plan.yearly}
                </span>
                <span className="text-slate-400">/{billingCycle === "monthly" ? "month" : "year"}</span>
              </div>
              <p className="mb-6 text-sm text-slate-400">
                {plan.name === "Free"
                  ? "$0 / month • $0 / year"
                  : billingCycle === "monthly"
                    ? `${plan.monthly} / month`
                    : `${plan.yearly} / year ${plan.savings ? `(${plan.savings})` : ""}`}
              </p>

              <div className="mb-8 flex-grow space-y-4">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-start gap-3 text-sm text-slate-200">
                    <Check className="h-5 w-5 text-emerald-300" />
                    {feature}
                  </div>
                ))}
              </div>

              <Link href="/dashboard">
                <ShinyButton variant={plan.popular ? "primary" : "secondary"} className="flex w-full justify-center">
                  {plan.cta}
                </ShinyButton>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
