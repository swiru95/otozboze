import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Navbar } from "@/components/layout/navbar";
import { Toaster } from "@/components/ui/sonner";
import { MarketTicker } from "@/modules/market/components/market-ticker";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "otozboze.pl — giełda zbóż B2B",
  description:
    "Platforma B2B łącząca rolników, kupujących i przewoźników na rynku zbóż.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Navbar />
        <MarketTicker />
        {/* pb-24 clears the fixed mobile role bar. */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 md:px-6 md:py-8">
          {children}
        </main>
        {/* Bottom-right toasts hide under the phone keyboard and the role bar. */}
        <Toaster position="top-center" mobileOffset={{ top: "1rem" }} />
      </body>
    </html>
  );
}
