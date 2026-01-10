"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  title: string;
  href: string;
  icon?: string;
  hint?: string;
};

export function SidebarNav({
  items,
  variant = "sidebar",
}: {
  items: NavItem[];
  variant?: "sidebar" | "mobile" | "rail";
}) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                active
                  ? "border-cyan-200/50 bg-white/15 text-white shadow-cyan-500/25"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.title}
            </Link>
          );
        })}
      </div>
    );
  }

  if (variant === "rail") {
    return (
      <div className="space-y-1">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-2 py-2.5 transition cursor-pointer min-w-max ${
                active
                  ? "border-cyan-200/60 bg-white/10 shadow-md shadow-cyan-500/15"
                  : "border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">{item.icon}</div>
              <div className="flex-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75">
                <div className="font-semibold text-slate-50 text-sm whitespace-nowrap">{item.title}</div>
                {item.hint ? <p className="text-[11px] text-slate-400 whitespace-nowrap">{item.hint}</p> : null}
              </div>
              {active ? <div className="absolute inset-y-0 left-0 w-[3px] rounded-full bg-gradient-to-b from-cyan-400 to-emerald-400" /> : null}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 transition cursor-pointer ${
              active
                ? "border-cyan-200/60 bg-white/10 shadow-lg shadow-cyan-500/15"
                : "border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">{item.icon}</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-50">{item.title}</div>
              {item.hint ? <p className="text-xs text-slate-400">{item.hint}</p> : null}
            </div>
            <span className="text-sm text-slate-500 transition group-hover:text-cyan-100">↗</span>
            {active ? <div className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-gradient-to-b from-cyan-400 to-emerald-400" /> : null}
          </Link>
        );
      })}
    </div>
  );
}
