/*
 * Landing page inspired by the provided animated hero/CTA layout.
 * Uses framer-motion + lucide-react for motion and icons.
 */
"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Calendar,
  CheckCircle2,
  FileText,
  Github,
  HelpCircle,
  Linkedin,
  RefreshCw,
  Shield,
} from "lucide-react";
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
            width={48}
            height={48}
            className="h-11 w-11 rounded-2xl object-contain drop-shadow-lg"
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
              <Link
                href="/sign-up"
                className="inline-flex rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuchsia-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

type FeatureTabKey = "returns" | "renewals" | "digest" | "calendar";

const featureTabs: { key: FeatureTabKey; label: string; title: string; icon: ReactNode; eyebrow: string; body: ReactNode }[] = [
  {
    key: "returns",
    label: "Never miss a return window again",
    title: "Return Deadlines",
    eyebrow: "Track every purchase with return deadlines. Get reminded 7, 3, and 1 day before the window closes.",
    icon: (
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] shadow-emerald-500/10">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-400/40 via-transparent to-transparent blur-xl" />
        <RefreshCw className="relative h-5 w-5 text-rose-300" />
      </div>
    ),
    body: (
      <div className="space-y-3">
        {[
          { label: "Amazon Headphones", badge: "3d left" },
          { label: "Nike Sneakers", badge: "14d left" },
          { label: "Apple Watch", badge: "7d left" },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <p className="text-sm font-semibold text-white">{item.label}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">{item.badge}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "renewals",
    label: "Stay ahead of every renewal date",
    title: "Subscription Renewals",
    eyebrow: "Get notified before subscriptions renew. Cancel unwanted services before you get charged.",
    icon: (
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] shadow-cyan-500/10">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/40 via-transparent to-transparent blur-xl" />
        <BellRing className="relative h-5 w-5 text-blue-200" />
      </div>
    ),
    body: (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Netflix", amount: "$15.99", badge: "5d" },
          { label: "Spotify", amount: "$9.99", badge: "12d" },
          { label: "Adobe CC", amount: "$54.99", badge: "18d" },
          { label: "iCloud", amount: "$2.99", badge: "24d" },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-slate-300">{item.amount}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">{item.badge}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "digest",
    label: "Everything you need in one email",
    title: "Weekly Digest",
    eyebrow: "Get a beautiful weekly summary of upcoming deadlines, renewals, and completed returns.",
    icon: (
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] shadow-emerald-500/10">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/40 via-transparent to-transparent blur-xl" />
        <CheckCircle2 className="relative h-5 w-5 text-emerald-200" />
      </div>
    ),
    body: (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Weekly Digest</p>
            <p className="text-sm font-semibold text-white">Dec 9 - Dec 15</p>
          </div>
          <span className="rounded-full bg-emerald-100/15 px-3 py-1 text-xs font-semibold text-emerald-100">Email</span>
        </div>
        <ul className="space-y-2 text-sm text-slate-200">
          {["3 returns due this week", "2 subscriptions renewing", "$89.97 saved last week"].map(row => (
            <li key={row} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {row}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    key: "calendar",
    label: "See everything at a glance",
    title: "Unified Calendar",
    eyebrow: "A beautiful calendar view that shows all your deadlines and renewals in one place.",
    icon: (
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] shadow-cyan-500/10">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/40 via-transparent to-transparent blur-xl" />
        <Calendar className="relative h-5 w-5 text-cyan-200" />
      </div>
    ),
    body: (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-emerald-900/30 p-6 shadow-inner shadow-emerald-500/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">December</p>
            <p className="text-lg font-semibold text-white">Unified agenda</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-100">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> Returns
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-1 text-cyan-100">
              <span className="h-2 w-2 rounded-full bg-cyan-300" /> Renewals
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-slate-200">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="font-semibold text-slate-100">{d}</div>
          ))}
          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
            const isReturn = [4, 12, 18].includes(day);
            const isRenewal = [7, 15, 24].includes(day);
            const isToday = day === 10;
            return (
              <div
                key={day}
                className={`relative flex h-12 items-center justify-center rounded-xl border text-sm transition ${
                  isToday
                    ? "border-emerald-300/70 bg-emerald-500/15 text-white shadow-md shadow-emerald-500/30"
                    : "border-white/10 bg-white/5 text-slate-100"
                }`}
              >
                {day}
                {(isReturn || isRenewal) && (
                  <div className="absolute bottom-1 flex gap-1">
                    {isReturn ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> : null}
                    {isRenewal ? <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ),
  },
];

function FeatureTabs() {
  const [active, setActive] = useState<FeatureTabKey>("returns");
  const current = featureTabs.find(t => t.key === active)!;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        {featureTabs.map(tab => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "border-cyan-200/60 bg-white/10 text-white shadow-md shadow-cyan-500/20"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-base">{tab.icon}</span>
              <span className="flex-1">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/20 transition-colors hover:bg-white/8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">{current.label}</p>
            <h3 className="text-2xl font-semibold text-white">{current.title}</h3>
            <p className="text-sm text-slate-300">{current.eyebrow}</p>
          </div>
        </div>

        <div className="mt-6">{current.body}</div>
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-50 selection:bg-emerald-300/20">
      <Navbar />

      {/* Hero */}
      <section className="relative px-4 pb-20 pt-32 lg:pb-32 lg:pt-48">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[10%] top-[12%] h-[500px] w-[500px] rounded-full bg-emerald-400/15 blur-[140px]" />
          <div className="absolute right-[8%] top-[24%] h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[120px]" />
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            variants={itemVariants}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-slate-200">Version 2.0 is live</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mb-8 text-5xl font-bold leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl"
          >
            Awareness that pays for itself
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl"
          >
            Looply is your one-stop hub for staying on top of subscriptions, bills, and return deadlines. We keep you accountable, so you never pay for a month you didn&apos;t want or keep a shirt that didn&apos;t fit.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up">
              <ShinyButton className="w-full sm:w-auto">Start Saving Now</ShinyButton>
            </Link>
            <Link href="/pricing">
              <ShinyButton variant="secondary" className="w-full sm:w-auto group">
                View Pricing <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ShinyButton>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Tabs */}
      <section id="features" className="relative bg-slate-900/40 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FeatureTabs />
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-4 py-28">
        <div className="absolute inset-0 origin-top-left scale-110 bg-emerald-400/10 skew-y-3" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="mb-8 text-4xl font-display font-bold sm:text-5xl">Ready to take control?</h2>
          <p className="mb-10 text-xl text-slate-200">Join thousands of users saving an average of $340/year.</p>

          <div className="flex flex-col items-center gap-6">
            <Link href="/sign-up">
              <ShinyButton className="h-14 px-10 text-lg">Get Started for Free</ShinyButton>
            </Link>
            <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:gap-8">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-black/95 border-t border-white/5 py-12 text-sm text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="text-lg font-semibold text-white">Looply.</div>
            <p className="text-sm text-slate-400">The premium standard for financial reminders.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4">
            <Link href="https://www.linkedin.com/in/your-profile" className="flex items-center gap-2 text-slate-200 hover:text-white">
              <Linkedin className="h-4 w-4" />
              <span>LinkedIn</span>
            </Link>
            <Link href="https://github.com/" className="flex items-center gap-2 text-slate-200 hover:text-white">
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </Link>
            <Link href="/privacy" className="flex items-center gap-2 text-slate-200 hover:text-white">
              <Shield className="h-4 w-4" />
              <span>Privacy</span>
            </Link>
            <Link href="/terms" className="flex items-center gap-2 text-slate-200 hover:text-white">
              <FileText className="h-4 w-4" />
              <span>Terms of Service</span>
            </Link>
            <Link href="/faq" className="flex items-center gap-2 text-slate-200 hover:text-white">
              <HelpCircle className="h-4 w-4" />
              <span>FAQ</span>
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-6xl px-4 text-slate-500">
          © 2026 Looply Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
