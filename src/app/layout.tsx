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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-sm font-medium">
            <div className="flex items-center gap-6">
              <Link href="/">Home</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/calendar">Calendar</Link>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/dashboard/automation">Automation</Link>
              <Link href="/dashboard/automation/review">Review</Link>
              <Link href="/dashboard/automation/rules">Rules</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
    </ClerkProvider>
  );
}
