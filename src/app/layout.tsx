import type { Metadata } from "next";
import Script from "next/script";
import { Nunito } from "next/font/google";
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
  title: {
    default: "Lumi — Turn any product into a scroll-stopping shoppable video",
    template: "%s · Lumi",
  },
  description:
    "Lumi turns a product link into conversion-ready TikTok & Reels videos. Grounded in real viral patterns, scripted by AI, reviewed beat-by-beat, rendered with Seedance & Sora.",
  keywords: [
    "AI video",
    "shoppable video",
    "TikTok Shop",
    "UGC ads",
    "product video generator",
    "Seedance",
    "Sora",
  ],
  openGraph: {
    title: "Lumi — Scroll-stopping shoppable videos, on autopilot",
    description:
      "From product link to converting short-form video in minutes. Built for sellers, creators, brands, and agencies.",
    type: "website",
    siteName: "Lumi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Script id="lumi-theme-noflash" strategy="beforeInteractive">
          {themeNoFlashScript}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
