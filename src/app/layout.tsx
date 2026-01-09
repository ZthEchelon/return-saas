import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
//clerk imports
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Returns & Subscriptions",
  description: "Track returns and subscription renewals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-md">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm font-medium">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-gradient-to-r from-emerald-200 to-cyan-200 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                ReturnSaaS
              </div>
              <div className="flex items-center gap-2">
                <Link className="nav-link" href="/">Home</Link>
                <Link className="nav-link" href="/dashboard">Dashboard</Link>
                <Link className="nav-link" href="/dashboard/calendar">Calendar</Link>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-white">Automation</span>
              <Link className="pill-link" href="/dashboard/automation">Overview</Link>
              <Link className="pill-link" href="/dashboard/automation/review">Review</Link>
              <Link className="pill-link" href="/dashboard/automation/rules">Rules</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
    </ClerkProvider>
  );
}
