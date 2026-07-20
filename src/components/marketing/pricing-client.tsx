"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, CtaBand } from "@/components/marketing/page-parts";
import { cn } from "@/lib/utils";

type Tier = {
  key: string;
  monthly: number | null;
  annual: number | null;
  hasPriceLabel?: boolean;
  href: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  { key: "free", monthly: 0, annual: 0, href: "/signup" },
  { key: "creator", monthly: 29, annual: 23, href: "/signup?plan=creator" },
  { key: "pro", monthly: 79, annual: 63, href: "/signup?plan=pro", featured: true },
  { key: "scale", monthly: 199, annual: 159, href: "/signup?plan=scale" },
  { key: "enterprise", monthly: null, annual: null, hasPriceLabel: true, href: "/about" },
];

const BILLING = [
  { key: "monthly", isAnnual: false },
  { key: "annual", isAnnual: true },
] as const;

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export function PricingClient() {
  const [annual, setAnnual] = useState(false);
  const t = useTranslations("marketing.pricing");

  return (
    <>
      <PageHeader
        kicker={t("header.kicker")}
        title={t("header.title")}
        highlight={t("header.highlight")}
        subtitle={t("header.subtitle")}
      />

      {/* billing toggle */}
      <div className="container-page -mt-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
          {BILLING.map(({ key, isAnnual }) => {
            const active = annual === isAnnual;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAnnual(isAnnual)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-ink",
                )}
              >
                {t(`billing.${key}`)}
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
          {TIERS.map((tier) => {
            const price = tier.hasPriceLabel
              ? t(`tiers.${tier.key}.priceLabel`)
              : `$${annual ? tier.annual : tier.monthly}`;
            const credits = t(`tiers.${tier.key}.credits`);
            const features = t.raw(`tiers.${tier.key}.features`) as string[];
            return (
              <div
                key={tier.key}
                className={cn(
                  "relative rounded-card bg-card p-8",
                  tier.featured
                    ? "border-2 border-brand-400 shadow-glow"
                    : "border border-border shadow-soft",
                )}
              >
                {tier.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Sparkles className="h-3 w-3" /> {t("mostPopular")}
                  </Badge>
                )}
                <h3 className="font-display text-xl font-semibold text-ink">
                  {t(`tiers.${tier.key}.name`)}
                </h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-ink">
                    {price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tier.hasPriceLabel
                      ? t(`tiers.${tier.key}.note`)
                      : annual && tier.monthly
                        ? t("perMonthYearly")
                        : t(`tiers.${tier.key}.note`)}
                  </span>
                </p>
                <div className="mt-4 rounded-lg bg-brand-100/60 px-3 py-2">
                  <p className="text-sm font-bold text-brand-800">
                    {t(`tiers.${tier.key}.allowance`)}
                  </p>
                  {credits && (
                    <p className="text-xs text-muted-foreground">{credits}</p>
                  )}
                </div>
                <ul className="mt-5 space-y-3">
                  {features.map((f) => (
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
                  href={tier.href}
                  variant={tier.featured ? "primary" : "outline"}
                  size="md"
                  className="mt-8 w-full"
                >
                  {t(`tiers.${tier.key}.cta`)}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          {t("creditFootnote")}
        </p>

        {/* included in every plan */}
        <div className="mx-auto mt-10 max-w-5xl rounded-card border border-border bg-muted/40 p-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("everyPlanIncludes")}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {(t.raw("included") as string[]).map((f) => (
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
          {t("billingQuestions")}
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 sm:grid-cols-2">
          {FAQ_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-card border border-border bg-card p-6 shadow-soft"
            >
              <h3 className="font-display text-base font-semibold text-ink">
                {t(`faq.${key}`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`faq.${key.replace("q", "a")}`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
