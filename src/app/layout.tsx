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
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import NotificationsBadgeServer from "./ui/NotificationsBadgeServer";

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
          <nav className="mx-auto max-w-7xl px-6 py-3">
            <div className="flex flex-wrap items-center gap-6">
              {/* Logo & Home Links */}
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-gradient-to-r from-emerald-200 to-cyan-200 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                  ReturnSaaS
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Link className="nav-link" href="/">Home</Link>
                  <Link className="nav-link" href="/dashboard">Dashboard</Link>
                  <Link className="nav-link" href="/dashboard/calendar">Calendar</Link>
                  <Link className="nav-link" href="/dashboard/analytics">Analytics</Link>
                </div>
              </div>

              {/* Automation */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-white font-semibold">Automation</span>
                <Link className="pill-link" href="/dashboard/automation">Overview</Link>
                <Link className="pill-link" href="/dashboard/automation/review">Review</Link>
                <Link className="pill-link" href="/dashboard/automation/rules">Rules</Link>
              </div>

              {/* Receipts */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-white font-semibold">Receipts</span>
                <Link className="pill-link" href="/dashboard/receipts/browser">Browser</Link>
                <Link className="pill-link" href="/dashboard/receipts/upload">Upload</Link>
              </div>

              {/* Bills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-white font-semibold">Bills</span>
                <Link className="pill-link" href="/dashboard/bills">View</Link>
              </div>

              {/* Returns */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-cyan-600 px-3 py-1 text-white font-semibold">Returns</span>
                <Link className="pill-link" href="/dashboard/returns">View</Link>
              </div>

              {/* Notifications & Settings */}
              <div className="flex items-center gap-3 text-sm ml-auto">
                <Link className="nav-link" href="/dashboard/notifications">Notifications</Link>
                <Link className="nav-link" href="/dashboard/settings">Settings</Link>
                <NotificationsBadgeServer />
                <UserButton />
              </div>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
        <Analytics />
      </body>
    </html>
    </ClerkProvider>
  );
}
