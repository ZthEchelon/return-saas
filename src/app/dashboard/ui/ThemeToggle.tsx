"use client";

import { useEffect, useState } from "react";

const storageKey = "looply-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem(storageKey) as "light" | "dark" | null;
    return saved ?? "dark";
  });

  useEffect(() => {
    const cls = theme === "light" ? "theme-light" : "theme-dark";
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(cls);
    localStorage.setItem(storageKey, theme);
  }, [theme]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-200/50 hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
