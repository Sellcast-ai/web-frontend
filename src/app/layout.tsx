import type { Metadata } from "next";
import Script from "next/script";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { Providers } from "@/components/providers";
import { themeNoFlashScript } from "@/components/theme-provider";

// SF Rounded is used by the iOS app for display text. On Apple devices the
// `ui-rounded` CSS family maps to SF Rounded directly; Nunito is the rounded
// cross-platform fallback (see --font-display in globals.css).
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lumi.sellcast.ai"),
  // Product images come from a CDN (s.500fd.com) that 403s any request
  // carrying a cross-origin Referer (hotlink protection). Omitting the
  // referer site-wide lets those <img> loads succeed (server-side fetches
  // already work since they send no referer).
  referrer: "no-referrer",
  title: {
    default: "Lumi — Turn any product into a scroll-stopping shoppable video",
    template: "%s · Lumi",
  },
  description:
    "Lumi turns a product link into conversion-ready TikTok & Reels videos. Grounded in real viral patterns, scripted by AI, reviewed beat-by-beat, rendered with Seedance 2.0.",
  keywords: [
    "AI video",
    "shoppable video",
    "TikTok Shop",
    "UGC ads",
    "product video generator",
    "Seedance",
  ],
  openGraph: {
    title: "Lumi — Scroll-stopping shoppable videos, on autopilot",
    description:
      "From product link to converting short-form video in minutes. Built for sellers, creators, brands, and agencies.",
    type: "website",
    siteName: "Lumi",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale resolves from the `lumi-locale` cookie via i18n/request.ts. Rendered
  // in this Server Component, NextIntlClientProvider inherits locale + messages
  // for the client tree with no props needed.
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${nunito.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Script id="lumi-theme-noflash" strategy="beforeInteractive">
          {themeNoFlashScript}
        </Script>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
