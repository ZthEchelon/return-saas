import Link from "next/link";

export default function Home() {
  const featureCards = [
    {
      title: "Return Deadlines",
      subtitle: "Never miss a window again",
      items: [
        { label: "Amazon Headphones", badge: "3d left", color: "from-amber-500 to-orange-500" },
        { label: "Nike Sneakers", badge: "14d left", color: "from-cyan-500 to-blue-500" },
        { label: "Apple Watch", badge: "7d left", color: "from-emerald-500 to-teal-500" },
      ],
    },
    {
      title: "Subscription Renewals",
      subtitle: "Stay ahead of every renewal",
      items: [
        { label: "Netflix", badge: "$15.99 · 5d", color: "from-rose-500 to-pink-500" },
        { label: "Spotify", badge: "$9.99 · 12d", color: "from-emerald-500 to-green-500" },
        { label: "Adobe CC", badge: "$54.99 · 18d", color: "from-purple-500 to-indigo-500" },
        { label: "iCloud", badge: "$2.99 · 24d", color: "from-cyan-500 to-blue-500" },
      ],
    },
    {
      title: "Weekly Digest",
      subtitle: "One beautiful email",
      digest: {
        range: "Dec 9 - Dec 15",
        bullets: [
          "3 returns due this week",
          "2 subscriptions renewing",
          "$89.97 saved last week",
        ],
      },
    },
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Add your items",
      body: "Import from email or add manually. Looply captures renewal dates, return windows, and amounts.",
    },
    {
      step: "2",
      title: "Get smart reminders",
      body: "Lead times you control—see alerts at 7, 3, and 1 day before it matters.",
    },
    {
      step: "3",
      title: "Save money, stay organized",
      body: "Avoid surprise renewals and missed returns. Track savings over time in one calm view.",
    },
  ];

  const pricing = [
    {
      name: "Free",
      price: "$0",
      period: "/mo",
      badge: "Perfect for getting started",
      bullets: [
        "Track up to 10 items",
        "Basic reminders (1 lead time)",
        "Simple dashboard",
        "Email notifications",
      ],
      cta: "Get Started",
      highlight: false,
    },
    {
      name: "Pro",
      price: "$7",
      period: "/mo",
      badge: "Most Popular",
      subtext: "Billed $84/year",
      bullets: [
        "Unlimited items",
        "Multiple lead times",
        "Weekly digest emails",
        "Advanced filters & search",
        "Calendar export",
        "Priority email support",
      ],
      cta: "Upgrade to Pro",
      highlight: true,
    },
    {
      name: "Pro+",
      price: "$15",
      period: "/mo",
      badge: "Everything in Pro",
      subtext: "Billed $180/year",
      bullets: [
        "Smart suggestions",
        "Auto-import from email",
        "Team sharing (coming soon)",
        "API access",
        "Dedicated support",
      ],
      cta: "Go Pro+",
      highlight: false,
    },
  ];

  const faqs = [
    { q: "How does Looply help me save money?", a: "We surface upcoming renewals and return deadlines with lead times you set, so you cancel or return before charges hit. Weekly digests and notifications keep you ahead." },
    { q: "Is there a free plan?", a: "Yes, the Free plan lets you track up to 10 items with basic reminders. Upgrade anytime." },
    { q: "Can I import my existing subscriptions?", a: "Yes. Add manually or connect email to auto-detect common subscriptions and returns." },
    { q: "How do reminder notifications work?", a: "You pick lead times (e.g., 7/3/1 days). We notify via email and in-app. Digest emails summarize what's upcoming." },
    { q: "Can I share my lists with family members?", a: "Team sharing is on the Pro+ roadmap; today you can export calendar feeds to share." },
    { q: "What happens if I cancel my subscription?", a: "You keep access through the current period. Your data remains; reminders pause when disabled." },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-10 shadow-2xl backdrop-blur">
      <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/40" />

      <div className="relative grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Now in public beta
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Never miss a <span className="text-gradient">return</span> or{" "}
            <span className="text-gradient-cyan">renewal</span> again
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-600">
            Looply tracks your subscriptions and return deadlines, sending smart reminders before it’s too late. Save money, stay organized.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/sign-up"
              className="group inline-flex h-14 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-500 px-7 text-base font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Get Started Free
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-14 items-center gap-2 rounded-md border border-slate-200 bg-white px-7 text-base font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="text-lg">▶</span>
              Watch Demo
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">✔</span> Free forever plan
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">✔</span> No credit card
            </div>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative h-[500px] w-full">
            <div className="glass animate-[float_6s_ease-in-out_infinite] absolute left-0 top-0 w-56 rounded-2xl border border-slate-200/50 bg-white/80 p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  📅
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">Amazon Return</p>
                  <p className="text-xs text-slate-500">Due in 3 days</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
                </div>
                <span className="text-xs font-semibold text-amber-500">85%</span>
              </div>
            </div>

            <div className="glass animate-[float_7s_ease-in-out_infinite] absolute right-0 top-12 w-56 rounded-2xl border border-slate-200/50 bg-white/80 p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                  🔔
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">Netflix</p>
                  <p className="text-xs text-slate-500">Renews Dec 15</p>
                </div>
              </div>
            </div>

            <div className="glass animate-[float_5.5s_ease-in-out_infinite] absolute bottom-24 left-10 w-56 rounded-2xl border border-slate-200/50 bg-white/80 p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white">
                  ⏰
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">Spotify</p>
                  <p className="text-xs text-slate-500">Renews in 12 days</p>
                </div>
              </div>
            </div>

            <div className="glass animate-[float_6.5s_ease-in-out_infinite] absolute bottom-2 right-8 w-56 rounded-2xl border border-slate-200/50 bg-white/80 p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-white">
                  ✅
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">Nordstrom Return</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 rounded-full border-2 border-emerald-300/40" />
              <div className="absolute h-24 w-24 rounded-full border-2 border-purple-300/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700">Active Users</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">50K+</p>
        </div>
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 shadow-sm">
          <p className="text-xs font-semibold text-cyan-700">Deadlines tracked</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">1.2M+</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700">Avg. saved / yr</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">$280</p>
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Features</p>
            <h2 className="font-display text-3xl font-bold text-slate-900">Everything you need to stay organized</h2>
            <p className="text-sm text-slate-600">Powerful tools to track, manage, and never miss important deadlines.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {featureCards.map(card => (
            <div key={card.title} className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{card.subtitle}</p>
                  <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {"items" in card && card.items
                  ? card.items.map(item => (
                      <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-6 w-6 rounded-full bg-gradient-to-br ${item.color}`} />
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.badge}</span>
                      </div>
                    ))
                  : (
                    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Weekly Digest</p>
                          <p className="text-sm font-semibold text-slate-900">{card.digest?.range}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Email</span>
                      </div>
                      <ul className="space-y-1 text-sm text-slate-700">
                        {card.digest?.bullets.map(b => (
                          <li key={b} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-12 space-y-4 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How it works</p>
            <h2 className="font-display text-3xl font-bold text-slate-900">Simple as 1, 2, 3</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {howItWorks.map(step => (
            <div key={step.step} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 shadow-inner">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                {step.step}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="mt-12 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
            <h2 className="font-display text-3xl font-bold text-slate-900">Simple, transparent pricing</h2>
            <p className="text-sm text-slate-600">Start free, upgrade when you need more. Cancel anytime.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pricing.map(plan => (
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
      </div>

      {/* FAQ */}
      <div className="mt-12 space-y-4 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">FAQ</p>
            <h2 className="font-display text-3xl font-bold text-slate-900">Got questions?</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map(item => (
            <div key={item.q} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-inner">
              <p className="text-sm font-semibold text-slate-900">{item.q}</p>
              <p className="mt-2 text-sm text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-8 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Ready?</p>
            <h3 className="font-display text-3xl font-bold text-slate-900">Never miss a deadline again</h3>
            <p className="text-sm text-slate-600">Join thousands of organized people who save money and time with Looply.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Start Free Today
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              No credit card required
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 grid gap-6 rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm md:grid-cols-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Looply
          </div>
          <p className="text-sm text-slate-600">Premium reminders for subscription renewals and return deadlines. Never miss a deadline again.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Product</p>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <Link href="/dashboard">Features</Link>
            <Link href="/dashboard/analytics">Analytics</Link>
            <Link href="/dashboard/calendar">Calendar</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Company</p>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <Link href="/dashboard">About</Link>
            <Link href="/dashboard">Blog</Link>
            <Link href="/dashboard">Contact</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Legal</p>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <Link href="/dashboard">Privacy</Link>
            <Link href="/dashboard">Terms</Link>
            <Link href="/dashboard">Security</Link>
          </div>
        </div>
      </div>
    </section>
    </div>
  );
}
