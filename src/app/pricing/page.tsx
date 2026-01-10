/* Pricing page inspired by the provided animated layout */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ShinyButton } from "@/components/ui/shiny-button";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Starter",
      price: billingCycle === "monthly" ? "0" : "0",
      description: "Perfect for tracking a few items.",
      features: ["Track up to 5 subscriptions", "Track 3 active returns", "Email notifications"],
      cta: "Start Free",
      popular: false,
    },
    {
      name: "Pro",
      price: billingCycle === "monthly" ? "9" : "90",
      description: "For the power shopper.",
      features: ["Unlimited subscriptions", "Unlimited returns", "SMS notifications", "Priority support"],
      cta: "Go Pro",
      popular: true,
    },
    {
      name: "Pro+",
      price: billingCycle === "monthly" ? "19" : "190",
      description: "Ultimate peace of mind.",
      features: ["Everything in Pro", "Concierge cancellation", "Dedicated account manager", "Early access features"],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />

      <div className="px-4 pb-20 pt-32">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h1 className="font-display text-5xl font-bold md:text-6xl">Simple, transparent pricing</h1>
          <p className="mb-10 text-xl text-slate-300">Choose the plan that fits your lifestyle.</p>

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

              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-slate-400">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
              </div>

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
