import Link from "next/link";
import { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import NotificationsBadgeServer from "../ui/NotificationsBadgeServer";
import { SidebarNav } from "./ui/SidebarNav";
import ThemeToggle from "./ui/ThemeToggle";
import { GeminiUpgradeBadge } from "@/app/ui/GeminiUpgradeBadge";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: "⚡", hint: "Today" },
  { title: "Analytics", href: "/dashboard/analytics", icon: "📊", hint: "Spending" },
  { title: "Calendar", href: "/dashboard/calendar", icon: "🗓", hint: "Month + agenda" },
  { title: "Returns", href: "/dashboard/returns", icon: "📦", hint: "Deadlines + refunds" },
  { title: "Bills", href: "/dashboard/bills", icon: "💳", hint: "Due soon" },
  { title: "Subscriptions", href: "/dashboard/subscriptions", icon: "🔁", hint: "Renewals" },
  { title: "Settings", href: "/dashboard/settings", icon: "⚙️", hint: "Preferences + automation" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen">
        <div className="absolute left-[-120px] top-10 h-80 w-80 rounded-full bg-cyan-500/25 blur-[120px]" />
        <div className="absolute right-[-80px] top-28 h-72 w-72 rounded-full bg-emerald-400/25 blur-[120px]" />
        <div className="absolute left-1/2 bottom-[-140px] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-[160px]" />
      </div>

      <div className="relative flex min-h-screen group/sidebar">
        <Link
          href="/"
          className="hidden lg:flex fixed left-3 top-6 z-50 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition duration-300 group-hover/sidebar:translate-x-[6px]"
          aria-label="Open navigation"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-lg font-bold text-slate-950 shadow-lg shadow-cyan-500/30">
            ⟳
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold tracking-tight">Looply</div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-200">reminders</p>
          </div>
        </Link>

        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-[270px] shrink-0 flex-col gap-6 border-r border-white/10 bg-white/5 px-6 py-6 backdrop-blur-xl transition-transform duration-300 ease-out -translate-x-[240px] group-hover/sidebar:translate-x-0 group-focus-within/sidebar:translate-x-0">
          <div className="mt-14 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Navigation</p>
            <SidebarNav items={navItems} variant="sidebar" />
          </div>

          <div className="glass-panel space-y-3 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-300">
              <span>Focus strip</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-emerald-200">Live</span>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[11px] text-slate-400">Return by</p>
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg text-white">Jan 18</p>
                  <span className="rounded-full bg-cyan-500/20 px-2 py-1 text-[11px] font-semibold text-cyan-100">4 days</span>
                </div>
                <p className="text-xs text-slate-400">Nike running kit</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[11px] text-slate-400">Renews</p>
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg text-white">Jan 20</p>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-100">3 days</span>
                </div>
                <p className="text-xs text-slate-400">Adobe CC · $54.99</p>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Shortcuts</p>
            <div className="space-y-2">
              {["Add return", "Add subscription", "Mark refunded"].map(action => (
                <button
                  key={action}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-white/10 hover:text-white"
                >
                  <span>{action}</span>
                  <span className="text-xs text-slate-400">↗</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-4 md:px-8">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-sm text-slate-400">⌘K</span>
                <input
                  type="search"
                  placeholder="Search returns, renewals, receipts…"
                  className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              <GeminiUpgradeBadge className="hidden sm:inline-flex" />
              <ThemeToggle />
              <Link
                href="/dashboard/receipts"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-white/10"
                aria-label="Receipts"
                title="Receipts"
              >
                🧾
              </Link>
              <button className="hidden items-center gap-2 rounded-2xl border border-cyan-200/50 bg-gradient-to-r from-cyan-400/80 via-emerald-400/80 to-fuchsia-400/70 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-cyan-500/50 sm:flex">
                <span className="text-base">＋</span>
                Add
              </button>
              <div className="hidden sm:block">
                <NotificationsBadgeServer />
              </div>
              <UserButton afterSignOutUrl="/" />
            </div>
            <div className="block border-t border-white/5 px-4 pb-3 pt-2 lg:hidden md:px-8">
              <SidebarNav items={navItems} variant="mobile" />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
