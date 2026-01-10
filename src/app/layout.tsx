import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Looply",
  description: "Stay in the Loop",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Looply",
    description: "Stay in the Loop.",
    images: ["/favicon.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${grotesk.variable} ${jetbrains.variable} antialiased theme-dark bg-slate-950 text-slate-50`}>
          <div className="relative min-h-screen bg-noise overflow-hidden">
            <div className="pointer-events-none absolute inset-0 mix-blend-screen">
              <div className="absolute -left-10 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-[120px]" />
              <div className="absolute right-[-120px] top-20 h-96 w-96 rounded-full bg-emerald-400/15 blur-[130px]" />
              <div className="absolute left-1/2 bottom-[-120px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#8b5cf6]/10 blur-[160px]" />
            </div>
            <main className="relative z-10">{children}</main>
          </div>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
