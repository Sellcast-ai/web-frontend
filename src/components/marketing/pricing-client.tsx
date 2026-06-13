"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, CtaBand } from "@/components/marketing/page-parts";
import { cn } from "@/lib/utils";

type Tier = {
  name: string;
  monthly: number | null;
  annual: number | null;
  priceLabel?: string;
  note: string;
  /** Headline allowance, e.g. "≈ 10 videos / mo". */
  allowance: string;
  /** Precise credit line under the allowance. */
  credits?: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    note: "no card",
    allowance: "Your first video free",
    credits: "20 credits, one-time",
    features: ["720p · 9:16 export", "Marketplace access", "Auto-QA rendering", "Lumi watermark"],
    cta: "Start free",
    href: "/signup",
  },
  {
    name: "Creator",
    monthly: 29,
    annual: 23,
    note: "per month",
    allowance: "≈ 3 videos / mo",
    credits: "75 credits / mo",
    features: ["No watermark", "Beat-by-beat review", "Avatar + product modes", "720p · 9:16 export"],
    cta: "Start Creator",
    href: "/signup?plan=creator",
  },
  {
    name: "Pro",
    monthly: 79,
    annual: 63,
    note: "per month",
    allowance: "≈ 10 videos / mo",
    credits: "200 credits / mo",
    features: ["Everything in Creator", "More credits, same per-video cost", "Priority over free renders"],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    featured: true,
  },
  {
    name: "Scale",
    monthly: 199,
    annual: 159,
    note: "per month",
    allowance: "≈ 25 videos / mo",
    credits: "500 credits / mo",
    features: ["Everything in Pro", "For always-on posting", "Highest self-serve volume"],
    cta: "Start Scale",
    href: "/signup?plan=scale",
  },
  {
    name: "Enterprise",
    monthly: null,
    annual: null,
    priceLabel: "Let's talk",
    note: "for teams & agencies",
    allowance: "Custom credit volume",
    credits: "committed, wholesale rate",
    features: ["Seats & roles", "Brand kits", "API access", "SSO & dedicated support"],
    cta: "Contact sales",
    href: "/about",
  },
];

const INCLUDED = [
  "Pattern-grounded scripts",
  "Beat-by-beat review",
  "Avatar + product modes",
  "Captions burned in",
  "9:16 for TikTok & Reels",
  "Paste any product link or browse the marketplace",
];

const FAQ = [
  {
    q: "What's a credit?",
    a: "1 credit = 1 second of finished video. A 20-second video uses 20 credits; a 30-second one uses 30. You pick the length, and you're only charged for what you render.",
  },
  {
    q: "Do regenerations cost credits?",
    a: "No. Regenerating a beat while you review doesn't cost extra — credits only count the final rendered video.",
  },
  {
    q: "What if I run out of credits?",
    a: "Upgrade anytime for a bigger monthly allowance — it applies immediately. Credits reset at the start of each billing cycle.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Anytime. Upgrades apply immediately; downgrades take effect next cycle. Annual saves ~20% over monthly.",
  },
  {
    q: "Which render model does Lumi use?",
    a: "Lumi renders with Seedance 2.0, with more models rolling out. It picks the best settings per shot.",
  },
];

export function PricingClient() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <PageHeader
        kicker="Pricing"
        title="Start free. Scale when"
        highlight="it's working."
        subtitle="No credit card to begin. Cancel anytime. Annual billing saves about 20%."
      />

      {/* billing toggle */}
      <div className="container-page -mt-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
          {(["Monthly", "Annual"] as const).map((label, i) => {
            const isAnnual = i === 1;
            const active = annual === isAnnual;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setAnnual(isAnnual)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-ink",
                )}
              >
                {label}
                {isAnnual && (
                  <span className="ml-1.5 text-xs font-bold text-success">−20%</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* tiers */}
      <section className="container-page py-12">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TIERS.map((t) => {
            const price = t.priceLabel ?? `$${annual ? t.annual : t.monthly}`;
            return (
              <div
                key={t.name}
                className={cn(
                  "relative rounded-card bg-card p-8",
                  t.featured
                    ? "border-2 border-brand-400 shadow-glow"
                    : "border border-border shadow-soft",
                )}
              >
                {t.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </Badge>
                )}
                <h3 className="font-display text-xl font-semibold text-ink">
                  {t.name}
                </h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-ink">
                    {price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t.priceLabel
                      ? t.note
                      : annual && t.monthly
                        ? "/mo · billed yearly"
                        : t.note}
                  </span>
                </p>
                <div className="mt-4 rounded-lg bg-brand-100/60 px-3 py-2">
                  <p className="text-sm font-bold text-brand-800">{t.allowance}</p>
                  {t.credits && (
                    <p className="text-xs text-muted-foreground">{t.credits}</p>
                  )}
                </div>
                <ul className="mt-5 space-y-3">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-ink-soft"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        <Check className="h-3 w-3" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  href={t.href}
                  variant={t.featured ? "primary" : "outline"}
                  size="md"
                  className="mt-8 w-full"
                >
                  {t.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          1 credit = 1 second of video. Video counts are approximate, based on
          20-second clips — a 15s video uses fewer credits, a 30s video more.
        </p>

        {/* included in every plan */}
        <div className="mx-auto mt-10 max-w-5xl rounded-card border border-border bg-muted/40 p-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Every plan includes
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {INCLUDED.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink"
              >
                <Check className="h-4 w-4 text-success" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* billing faq */}
      <section className="container-page pb-8">
        <h2 className="text-center font-display text-2xl font-bold text-ink">
          Billing questions
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 sm:grid-cols-2">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-card border border-border bg-card p-6 shadow-soft"
            >
              <h3 className="font-display text-base font-semibold text-ink">
                {item.q}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
