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
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    monthly: 0,
    annual: 0,
    note: "to get going",
    features: [
      "5 videos / month",
      "Marketplace access",
      "Auto-QA rendering",
      "720p · 9:16 export",
    ],
    cta: "Start free",
    href: "/signup",
  },
  {
    name: "Pro",
    monthly: 39,
    annual: 31,
    note: "per month",
    features: [
      "100 videos / month",
      "Beat-by-beat review",
      "Avatar + product modes",
      "Seedance + Sora rendering",
      "Auto dialogue QA",
      "1080p export · priority queue",
    ],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    featured: true,
  },
  {
    name: "Studio",
    monthly: null,
    annual: null,
    priceLabel: "Let's talk",
    note: "for teams & agencies",
    features: [
      "Unlimited seats",
      "Brand kits & presets",
      "Priority rendering",
      "API access",
      "SSO & dedicated support",
    ],
    cta: "Contact sales",
    href: "/about",
  },
];

const INCLUDED = [
  "Pattern-grounded scripts",
  "Captions burned in",
  "9:16 for TikTok & Reels",
  "Marketplace of trending products",
];

const FAQ = [
  {
    q: "Is there really a free plan?",
    a: "Yes — Starter is free forever, no credit card. You get 5 videos a month to see Lumi work before you upgrade.",
  },
  {
    q: "What counts as a video?",
    a: "One generated cut from one product. Regenerating individual beats during review doesn't burn an extra video.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Anytime. Upgrades apply immediately; downgrades take effect next cycle. Annual saves ~20% over monthly.",
  },
  {
    q: "Which render models are included?",
    a: "Pro and Studio render with Seedance 2.0 and Sora 2, with Veo and Kling rolling out. Lumi picks the best model per shot.",
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
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
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
                <ul className="mt-6 space-y-3">
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
