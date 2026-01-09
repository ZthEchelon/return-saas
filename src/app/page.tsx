import Link from "next/link";

export default function Home() {
  return (
    <section className="grid gap-10 rounded-3xl border bg-white/80 p-10 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-4">
          <p className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Returns & Renewals</p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900">
            Track returns, subscriptions, and bills without the busywork.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Pull important dates from email, confirm what matters, and keep a calm calendar of renewals, refund checks, and due dates.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="rounded-full bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800" href="/dashboard">
              Go to dashboard
            </Link>
            <Link className="rounded-full border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50" href="/dashboard/calendar">
              View calendar
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border bg-slate-50 px-6 py-5 text-sm text-slate-800 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="font-medium">Next 7 days</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">3 items</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
              <div>
                <div className="text-sm font-semibold">Netflix renewal</div>
                <div className="text-xs text-slate-500">Feb 12 · $20.99</div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Subscription</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
              <div>
                <div className="text-sm font-semibold">Nike return window</div>
                <div className="text-xs text-slate-500">Feb 14 · refund check</div>
              </div>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">Return</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
              <div>
                <div className="text-sm font-semibold">Hydro bill due</div>
                <div className="text-xs text-slate-500">Feb 15 · autopay off</div>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Bill</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-white/80 p-6 shadow-sm lg:grid-cols-3">
        <Feature
          title="Email-powered"
          body="Scan Gmail, suggest returns/subscriptions/bills, and confirm with one click."
        />
        <Feature
          title="Calendar-first"
          body="See renewals, return windows, and refund checks in one calm view."
        />
        <Feature
          title="Fast edits"
          body="Adjust dates and amounts before creating records—no spreadsheets needed."
        />
      </div>
    </section>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 shadow-inner">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-600">{body}</div>
    </div>
  );
}
