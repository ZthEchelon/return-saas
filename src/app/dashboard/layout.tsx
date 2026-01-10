import Link from "next/link";
import { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import NotificationsBadgeServer from "../ui/NotificationsBadgeServer";
import { SidebarNav } from "./ui/SidebarNav";
import { GeminiUpgradeBadge } from "@/app/ui/GeminiUpgradeBadge";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: "⚡", hint: "Today" },
  { title: "Analytics", href: "/dashboard/analytics", icon: "📊", hint: "Spending" },
  { title: "Calendar", href: "/dashboard/calendar", icon: "🗓", hint: "Month + agenda" },
  { title: "Returns", href: "/dashboard/returns", icon: "📦", hint: "Deadlines + refunds" },
  { title: "Bills", href: "/dashboard/bills", icon: "💳", hint: "Due soon" },
  { title: "Subscriptions", href: "/dashboard/subscriptions", icon: "🔁", hint: "Renewals" },
];

const settingsItem = { title: "Settings", href: "/dashboard/settings", icon: "⚙️", hint: "Preferences + automation" };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-visible bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen">
        <div className="absolute left-[-120px] top-10 h-80 w-80 rounded-full bg-cyan-500/25 blur-[120px]" />
        <div className="absolute right-[-80px] top-28 h-72 w-72 rounded-full bg-emerald-400/25 blur-[120px]" />
        <div className="absolute left-1/2 bottom-[-140px] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-[160px]" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-[88px] shrink-0 flex-col gap-6 border-r border-white/10 bg-white/5 px-3 py-6 backdrop-blur-xl overflow-visible">
          <Link href="/" className="group flex flex-col items-center gap-1 px-2">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-xl font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition duration-200 group-hover:scale-[1.05]">
              ⟳
            </div>
            <div className="text-center">
              <div className="font-display text-sm font-semibold tracking-tight leading-tight">Looply</div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">reminders</p>
            </div>
          </Link>

          <div className="space-y-1 flex-1 overflow-y-auto">
            <SidebarNav items={navItems} variant="rail" />
          </div>

          <div className="space-y-1 border-t border-white/10 pt-3">
            <SidebarNav items={[settingsItem]} variant="rail" />
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:ml-[88px]">
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
              <Link
                href="/dashboard/receipts"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-white/10"
                aria-label="Receipts"
                title="Receipts"
              >
                🧾
              </Link>
              <Link
                href="/pricing"
                className="hidden items-center gap-2 rounded-2xl border border-cyan-200/50 bg-gradient-to-r from-cyan-400/80 via-emerald-400/80 to-fuchsia-400/70 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-cyan-500/50 sm:flex"
              >
                <span className="text-base">⚡</span>
                Upgrade
              </Link>
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
