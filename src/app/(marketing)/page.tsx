import Link from "next/link";
import {
  ArrowRight,
  Link2,
  Wand2,
  ListChecks,
  UserSquare2,
  AudioLines,
  Send,
  Sparkles,
  Search,
  ScanSearch,
  PencilRuler,
  Clapperboard,
  Check,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroMock } from "@/components/marketing/hero-mock";
import { Faq } from "@/components/marketing/faq";

/* ------------------------------------------------------------------ data */

const STEPS = [
  { icon: Search, key: "find" },
  { icon: ScanSearch, key: "deconstruct" },
  { icon: PencilRuler, key: "script" },
  { icon: Clapperboard, key: "generate" },
] as const;

const FEATURES = [
  { icon: Link2, key: "linkToVideo" },
  { icon: Wand2, key: "scripts" },
  { icon: ListChecks, key: "review" },
  { icon: UserSquare2, key: "modes" },
  { icon: AudioLines, key: "qa" },
  { icon: Send, key: "publish" },
] as const;

const MODELS = [
  { key: "seedance", live: true },
  { key: "more", live: false },
] as const;

const USE_CASES = [
  { key: "sellers", glow: "from-brand-300 to-brand-600" },
  { key: "creators", glow: "from-rose to-warning" },
  { key: "brands", glow: "from-gold to-rose" },
  { key: "agencies", glow: "from-brand-500 to-brand-800" },
] as const;

const STATS = ["ways", "ratio", "credit", "spend"] as const;

const PRICING = [
  { key: "creator", href: "/signup?plan=creator", featured: false },
  { key: "pro", href: "/signup?plan=pro", featured: true },
  { key: "scale", href: "/signup?plan=scale", featured: false },
] as const;

/* ------------------------------------------------------------------ page */

export default async function HomePage() {
  const t = await getTranslations("marketing.landing");
  const marquee = t.raw("marquee") as string[];

  return (
    <>
      {/* ============================================================ HERO */}
      <section className="relative overflow-hidden">
        <div className="bg-aurora absolute inset-0 -z-10 opacity-70" />
        <div className="container-page grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-rise">
            <Badge variant="outline" className="mb-6">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              {t("heroBadge")}
            </Badge>
            <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {t.rich("heroTitle", {
                highlight: (chunks) => <span className="text-brand">{chunks}</span>,
              })}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/signup" size="lg">
                {t("heroStartFree")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/features" variant="outline" size="lg">
                {t("heroSeeHow")}
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> {t("heroCheck1")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> {t("heroCheck2")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> {t("heroCheck3")}
              </span>
            </div>
          </div>

          <div className="animate-rise [animation-delay:120ms]">
            <HeroMock />
          </div>
        </div>

        {/* marquee */}
        <div className="border-y border-border/70 bg-card/50 py-5">
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-marquee gap-10">
              {[...marquee, ...marquee].map((item, i) => (
                <span
                  key={i}
                  className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================== HOW IT WORKS */}
      <section id="how" className="container-page py-24">
        <SectionHeading
          kicker={t("howKicker")}
          title={t("howTitle")}
          subtitle={t("howSubtitle")}
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className="relative rounded-card border border-border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1"
            >
              <span className="font-display text-sm font-semibold text-brand-300">
                0{i + 1}
              </span>
              <div className="mt-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <step.icon className="h-6 w-6" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-600">
                {t(`steps.${step.key}.kicker`)}
              </p>
              <h3 className="mt-1 font-display text-xl font-medium text-ink">
                {t(`steps.${step.key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`steps.${step.key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= FEATURES */}
      <section className="bg-muted/40 py-24">
        <div className="container-page">
          <SectionHeading
            kicker={t("featuresKicker")}
            title={t("featuresTitle")}
            subtitle={t("featuresSubtitle")}
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className="group rounded-card border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-105">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-medium text-ink">
                  {t(`features.${f.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`features.${f.key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================== MODELS */}
      <section className="container-page py-24">
        <SectionHeading
          kicker={t("modelsKicker")}
          title={t("modelsTitle")}
          subtitle={t("modelsSubtitle")}
        />
        <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-2">
          {MODELS.map((m) => (
            <div
              key={m.key}
              className="relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-soft"
            >
              <div className="bg-aurora absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-xl" />
              <div className="relative flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-background">
                  <Clapperboard className="h-5 w-5" />
                </span>
                <Badge variant={m.live ? "success" : "outline"} size="sm">
                  {t(`models.${m.key}.tag`)}
                </Badge>
              </div>
              <h3 className="relative mt-4 font-display text-lg font-semibold text-ink">
                {t(`models.${m.key}.name`)}
              </h3>
              <p className="relative mt-1 text-sm text-muted-foreground">
                {t(`models.${m.key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== USE CASES */}
      <section className="container-page pb-24">
        <SectionHeading
          kicker={t("useCasesKicker")}
          title={t("useCasesTitle")}
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u) => (
            <div
              key={u.key}
              className="rounded-card border border-border bg-card p-7 shadow-soft"
            >
              <div
                className={`mb-5 h-1.5 w-12 rounded-full bg-linear-to-r ${u.glow}`}
              />
              <h3 className="font-display text-2xl font-medium text-ink">
                {t(`useCases.${u.key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`useCases.${u.key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ STATS */}
      <section className="bg-ink py-20 text-background">
        <div className="container-page grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s} className="text-center">
              <p className="text-brand-300 font-display text-5xl font-semibold">
                {t(`stats.${s}.value`)}
              </p>
              <p className="mx-auto mt-2 max-w-[12rem] text-sm text-background/70">
                {t(`stats.${s}.label`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================== PRICING */}
      <section className="bg-muted/40 py-24">
        <div className="container-page">
          <SectionHeading
            kicker={t("pricingKicker")}
            title={t("pricingTitle")}
            subtitle={t("pricingSubtitle")}
          />
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.key}
                className={
                  p.featured
                    ? "relative rounded-card border-2 border-brand-400 bg-card p-8 shadow-glow"
                    : "relative rounded-card border border-border bg-card p-8 shadow-soft"
                }
              >
                {p.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t("mostPopular")}
                  </Badge>
                )}
                <h3 className="font-display text-xl font-semibold text-ink">
                  {t(`pricingTiers.${p.key}.name`)}
                </h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold text-ink">
                    {t(`pricingTiers.${p.key}.price`)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t(`pricingTiers.${p.key}.note`)}
                  </span>
                </p>
                <ul className="mt-6 space-y-3">
                  {(t.raw(`pricingTiers.${p.key}.features`) as string[]).map(
                    (feat) => (
                      <li key={feat} className="flex items-center gap-2.5 text-sm text-ink-soft">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Check className="h-3 w-3" />
                        </span>
                        {feat}
                      </li>
                    ),
                  )}
                </ul>
                <Button
                  href={p.href}
                  variant={p.featured ? "primary" : "outline"}
                  size="md"
                  className="mt-8 w-full"
                >
                  {t(`pricingTiers.${p.key}.cta`)}
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t.rich("pricingFooter", {
              signup: (chunks) => (
                <Link href="/signup" className="font-semibold text-brand-700">
                  {chunks}
                </Link>
              ),
              plans: (chunks) => (
                <Link href="/pricing" className="font-semibold text-brand-700">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </section>

      {/* ============================================================== FAQ */}
      <section className="container-page py-24">
        <SectionHeading kicker={t("faqKicker")} title={t("faqTitle")} />
        <div className="mt-12">
          <Faq />
        </div>
      </section>

      {/* ======================================================== FINAL CTA */}
      <section className="container-page pb-24">
        <div className="bg-hero relative overflow-hidden rounded-[2.5rem] px-8 py-16 text-center shadow-glow sm:px-16 sm:py-20">
          <div className="bg-aurora absolute inset-0 opacity-40 mix-blend-overlay" />
          <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
            {t("finalCtaTitle")}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/90">
            {t("finalCtaSubtitle")}
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              href="/signup"
              variant="solid"
              size="lg"
              className="bg-white text-brand-700 hover:bg-white/90"
            >
              {t("finalCtaStartFree")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link
              href="/pricing"
              className="inline-flex h-13 items-center justify-center rounded-full px-8 text-base font-semibold text-white underline-offset-4 hover:underline"
            >
              {t("finalCtaSeePricing")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------- subcomponent */

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-500">
        {kicker}
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}
