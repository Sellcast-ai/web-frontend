import type { Metadata } from "next";
import Script from "next/script";
import { Nunito, Geist, Instrument_Serif } from "next/font/google";
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

// Editorial two-voice type — MARKETING ONLY (scoped via `.marketing` in
// globals.css). Geist is the tight free grotesk for display; Instrument Serif
// (italic) is the one-phrase accent. The app keeps the SF-Rounded/Nunito stack.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
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
      className={`${nunito.variable} ${geist.variable} ${instrumentSerif.variable} h-full antialiased`}
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
