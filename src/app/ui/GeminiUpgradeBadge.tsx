import Link from "next/link";

type Props = {
  className?: string;
  showLabel?: boolean;
};

export function GeminiUpgradeBadge({ className = "", showLabel = false }: Props) {
  return (
    <Link
      href="/pricing"
      aria-label="Upgrade"
      className={`group relative inline-flex items-center ${showLabel ? "gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2" : "gap-2"} ${className}`}
    >
      <div className="relative flex h-11 w-11 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/25 via-emerald-400/20 to-indigo-500/25 blur-[14px] transition duration-500 group-hover:scale-110 group-hover:blur-2xl" />
        <div className="absolute inset-[3px] rounded-2xl bg-slate-900/80 ring-1 ring-white/10 backdrop-blur-sm" />
        <div className="absolute inset-[5px] rounded-2xl bg-gradient-to-br from-cyan-500/20 via-emerald-400/20 to-indigo-400/20 animate-[spin_12s_linear_infinite] group-hover:animate-[spin_7s_linear_infinite]" />
        <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-emerald-300 to-indigo-400 shadow-[0_0_18px_rgba(56,189,248,0.35)]">
          <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-transparent to-white/5" />
          <span className="absolute h-3.5 w-3.5 rounded-full bg-gradient-to-br from-emerald-200 via-cyan-200 to-indigo-200 opacity-90 blur-[0.5px] animate-[pulse_2.6s_ease-in-out_infinite]" />
          <span className="absolute h-6 w-6 rounded-full border border-white/20 opacity-70" />
        </div>
      </div>
      {showLabel ? (
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-50">Upgrade</p>
          <p className="text-xs text-slate-400">Plans</p>
        </div>
      ) : null}
      <span className="sr-only">Upgrade now</span>
      <span className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 translate-y-2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition duration-300 group-hover:translate-y-3 group-hover:opacity-100">
        Upgrade now
      </span>
    </Link>
  );
}
