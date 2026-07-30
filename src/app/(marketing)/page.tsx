import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  Clapperboard,
  Languages,
  Link2,
  ListChecks,
  MousePointer2,
  Package,
  Smartphone,
  Sparkles,
  Timer,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";
import { Accent } from "@/components/marketing/accent";
import { AuthCta, AuthCtaLink } from "@/components/marketing/auth-cta";
import { Faq } from "@/components/marketing/faq";
import { PipelineHero } from "@/components/marketing/pipeline-hero";
import { OUTPUT_WALL_VIDEOS, type WallTileKey } from "@/components/marketing/showcase";
import { ShowcaseVideo } from "@/components/marketing/showcase-video";
import { VIDEO_LANGUAGES } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ data */

const MARQUEE = [
  { key: "seedance", icon: Clapperboard },
  { key: "review", icon: ListChecks },
  { key: "languages", icon: Languages },
  { key: "productOnly", icon: Package },
  { key: "qa", icon: AudioLines },
  { key: "ratio", icon: Smartphone },
  { key: "vibes", icon: Sparkles },
  { key: "sources", icon: Link2 },
  { key: "durations", icon: Timer },
] as const;

const STORY_STEPS = ["link", "learn", "approve", "render"] as const;

/* Wall order. A key with a clip in OUTPUT_WALL_VIDEOS (showcase.ts) plays it;
   an unfilled key becomes the closing-statement card instead. */
const WALL_TILES: WallTileKey[] = [
  "beauty",
  "gadgets",
  "home",
  "pets",
  "fashion",
  "fitness",
];

/* The section's closing line goes in the first unfilled tile when there is one,
   and below the grid when the wall is full, so it renders exactly once however
   many slots are empty. Any further unfilled key is dropped from the grid
   rather than drawn as a second, wordless card - the wall shrinks instead of
   showing a hole, which is the "tile that failed to load" look this section
   exists to avoid. */
const FIRST_EMPTY_TILE = WALL_TILES.find((key) => !OUTPUT_WALL_VIDEOS[key]);
const SHOWN_TILES = WALL_TILES.filter(
  (key) => OUTPUT_WALL_VIDEOS[key] || key === FIRST_EMPTY_TILE,
);

/* Paid-tier CTAs go to /pricing, never straight to signup: /pricing is the one
   place that knows whether the visitor is signed in, and so the only place that
   can answer a paid click honestly (upgrade dialog vs. sign up). Sending a
   signed-in visitor to /signup would just bounce them into the app. */
const PRICING = [
  { key: "creator", featured: false },
  { key: "pro", featured: true },
  { key: "scale", featured: false },
] as const;

/* ------------------------------------------------------------------ page */

export default async function HomePage() {
  const t = await getTranslations("marketing.landing");

  return (
    <>
      {/* ============================================================ HERO */}
      {/* The hero canvas is deliberately bare: the headline and the pipeline
          stage carry it. It used to sit on three blurred colour blobs drifting
          behind the h1 on a 46 s loop - decoration competing with the one thing
          a visitor is trying to read. */}
      <section className="relative overflow-hidden">
        <div className="container-page pb-20 pt-20 sm:pt-24">
          <div className="animate-rise mx-auto max-w-3xl text-center">
            <h1 className="font-display text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
              {t.rich("heroTitle", {
                highlight: (chunks) => <Accent>{chunks}</Accent>,
              })}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              {t("heroSubtitle")}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <AuthCta label={t("heroPrimary")} size="lg">
                <ArrowRight className="h-4 w-4" />
              </AuthCta>
              <Link
                href="/#how"
                className="inline-flex h-13 items-center gap-1.5 rounded-full px-6 text-base font-medium text-ink-soft transition-colors hover:text-ink"
              >
                {t("heroSecondary")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-5 text-balance text-sm text-muted-foreground">
              {t("heroFinePrint")}
            </p>
          </div>

          <div className="animate-rise mx-auto mt-16 max-w-4xl [animation-delay:150ms]">
            <PipelineHero />
          </div>
        </div>

        {/* capability chip marquee — every chip is a real, shipping capability */}
        <div className="border-y border-border/70 bg-card/40 py-6">
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex w-max animate-marquee gap-3.5 pr-3.5">
              {/* three copies + a -33.333% keyframe: the loop stays seamless
                  even when one copy is narrower than the viewport (short CJK
                  strings on a wide desktop) */}
              {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((chip, i) => (
                <span
                  key={i}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-ink-soft"
                >
                  <chip.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {t(`marquee.${chip.key}`)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================== WHY IT CONVERTS */}
      <section className="container-page py-28 sm:py-32">
        <FadeIn className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.75rem]">
            {t.rich("whyTitle", {
              highlight: (chunks) => <Accent>{chunks}</Accent>,
            })}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t("whySubtitle")}
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {/* pattern extract */}
          <FadeIn delay={0}>
            <MediaCard>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/60">
                  {t("why.pattern.uiHeading")}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/60">
                  {t("why.pattern.uiSample")}
                </span>
              </div>
              <div className="mt-5 space-y-3.5">
                {(
                  [
                    ["uiHook", "88%"],
                    ["uiProof", "72%"],
                    ["uiOffer", "58%"],
                  ] as const
                ).map(([key, width]) => (
                  <div key={key}>
                    <p className="mb-1.5 text-[11px] font-medium text-white/75">
                      {t(`why.pattern.${key}`)}
                    </p>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white/45"
                        style={{ width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </MediaCard>
            <MediaCaption
              caption={t("why.pattern.caption")}
              body={t("why.pattern.body")}
            />
          </FadeIn>

          {/* storyboard review */}
          <FadeIn delay={0.12}>
            <MediaCard>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/60">
                  {t("why.review.uiHeading")}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-[10px] font-semibold text-live">
                  {t("why.review.uiSpend")}
                </span>
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <span
                    className="h-10 w-6 shrink-0 rounded-md"
                    style={{ background: "linear-gradient(150deg,#3d5a63 0%,#17242a 78%)" }}
                  />
                  <span className="flex-1 text-xs font-medium text-white/80">
                    {t("pipeline.beats.hook.label")}
                  </span>
                  <span className="relative">
                    <span className="flex items-center gap-1 rounded-full bg-live/15 px-2.5 py-1 text-[10px] font-semibold text-live">
                      <Check className="h-3 w-3" />
                      {t("pipeline.approved")}
                    </span>
                    <MousePointer2
                      className="absolute -bottom-2.5 -right-1 h-4 w-4 drop-shadow-md"
                      fill="white"
                      stroke="#14171a"
                      strokeWidth={1.5}
                    />
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <span
                    className="h-10 w-6 shrink-0 rounded-md"
                    style={{ background: "linear-gradient(150deg,#5a4a3d 0%,#221b15 78%)" }}
                  />
                  <span className="flex-1 text-xs font-medium text-white/80">
                    {t("pipeline.beats.proof.label")}
                  </span>
                  <span className="flex items-center rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-medium text-white/70">
                    {t("why.review.uiRegenerate")}
                  </span>
                </div>
              </div>
            </MediaCard>
            <MediaCaption
              caption={t("why.review.caption")}
              body={t("why.review.body")}
            />
          </FadeIn>

          {/* vibes, languages */}
          <FadeIn delay={0.24}>
            <MediaCard>
              <div className="flex flex-wrap gap-1.5">
                {/* `why.reach.body` hardcodes "eight" — disabling a language
                    means editing that string in all 9 catalogs too. */}
                {VIDEO_LANGUAGES.filter((l) => l.enabled).map(({ label: lang }) => (
                  <span
                    key={lang}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-white/70"
                  >
                    {lang}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-300" />
                <span className="text-xs font-medium text-white/80">
                  {t("why.reach.uiVibe")}
                </span>
              </div>
            </MediaCard>
            <MediaCaption
              caption={t("why.reach.caption")}
              body={t("why.reach.body")}
            />
          </FadeIn>
        </div>
      </section>

      {/* ================================================ THE STORY (dark) */}
      <section id="how" className="container-page scroll-mt-24 pb-28 sm:pb-32">
        <div className="rounded-[2.5rem] border border-white/[0.07] bg-gradient-to-b from-[#1b1f26] to-[#111419] px-6 py-16 sm:px-14 sm:py-20">
          <FadeIn>
            <h2 className="max-w-2xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-[2.75rem]">
              {t.rich("storyTitle", {
                highlight: (chunks) => <Accent>{chunks}</Accent>,
              })}
            </h2>
          </FadeIn>

          <div className="mt-14 divide-y divide-white/[0.07]">
            {STORY_STEPS.map((key, i) => (
              <FadeIn
                key={key}
                delay={i * 0.08}
                className="grid gap-2 py-7 sm:grid-cols-[7rem_1fr] sm:gap-8"
              >
                <span
                  aria-hidden
                  className="font-display text-5xl font-semibold leading-none text-white/[0.13] sm:text-6xl"
                >
                  0{i + 1}
                </span>
                <div>
                  <h3 className="font-display text-xl font-medium text-white sm:text-2xl">
                    {t(`storySteps.${key}.title`)}
                  </h3>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/55">
                    {t(`storySteps.${key}.body`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-10 flex flex-wrap gap-3">
            {[t("storyFact1"), t("storyFact2")].map((fact) => (
              <span
                key={fact}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[13px] font-medium text-white/80"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-live" />
                {fact}
              </span>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ====================================================== OUTPUT WALL */}
      <section className="container-page pb-28 sm:pb-32">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.75rem]">
            {t.rich("wallTitle", {
              highlight: (chunks) => <Accent>{chunks}</Accent>,
            })}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t("wallSubtitle")}
          </p>
        </FadeIn>

        {/* Straight grid, no per-tile offset: six vertical clips of the same
            size read as a considered set, where the old zigzag read as drift. */}
        <div className="mt-14 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          {SHOWN_TILES.map((key, i) => {
            const video = OUTPUT_WALL_VIDEOS[key];
            return (
              <FadeIn key={key} delay={(i % 3) * 0.1}>
                {video ? (
                  /* The frame carries its own surface: the poster is only
                     fetched as the tile nears the viewport, so without one the
                     slot paints as an empty bordered rectangle until then. */
                  <div className="group relative aspect-9/16 overflow-hidden rounded-card border border-border bg-muted/40 shadow-soft">
                    <ShowcaseVideo
                      className="absolute inset-0 h-full w-full object-cover"
                      src={video.src}
                      poster={video.poster}
                    />
                    {/* The footage runs from near-white kitchens to near-black
                        product shots, so the label needs its own scrim rather
                        than a pill per chip. */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[11px] font-medium leading-tight text-white">
                        {t(`wall.${key}.category`)}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-white/75">
                        {t(`wall.${key}.vibe`)}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* An unfilled slot carries the section's closing line instead
                     of a labelled empty gradient, which now that its neighbours
                     all play would just read as a tile that failed to load.
                     Only the first one reaches here - SHOWN_TILES drops the
                     rest, so this card is never wordless. */
                  <div className="flex aspect-9/16 flex-col justify-end rounded-card border border-border bg-muted/40 p-4 sm:p-6">
                    {/* A two-column phone leaves this card ~160px wide, where
                        the desktop size wraps to eight lines. */}
                    <p className="font-accent text-lg leading-snug text-ink sm:text-2xl">
                      {t("wallAudience")}
                    </p>
                  </div>
                )}
              </FadeIn>
            );
          })}
        </div>

        {!FIRST_EMPTY_TILE && (
          <FadeIn>
            <p className="mx-auto mt-16 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              {t("wallAudience")}
            </p>
          </FadeIn>
        )}
      </section>

      {/* ========================================================== PRICING */}
      <section className="border-y border-border/70 bg-muted/40 py-28 sm:py-32">
        <div className="container-page">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.75rem]">
              {t.rich("pricingTitle", {
                highlight: (chunks) => <Accent>{chunks}</Accent>,
              })}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {t("pricingSubtitle")}
            </p>
          </FadeIn>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
            {PRICING.map((p, i) => {
              const features = t.raw(`pricingTiers.${p.key}.features`) as string[];
              return (
                <FadeIn
                  key={p.key}
                  delay={i * 0.1}
                  className={cn(
                    "relative flex flex-col rounded-card p-8",
                    p.featured
                      ? "border border-white/[0.07] bg-gradient-to-b from-[#1b1f26] to-[#111419] text-white shadow-card"
                      : "border border-border bg-card shadow-soft",
                  )}
                >
                  {p.featured && (
                    <span className="absolute right-6 top-6 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[11px] font-semibold text-white/85">
                      {t("mostPopular")}
                    </span>
                  )}
                  <h3
                    className={cn(
                      "font-display text-lg font-semibold",
                      p.featured ? "text-white" : "text-ink",
                    )}
                  >
                    {t(`pricingTiers.${p.key}.name`)}
                  </h3>
                  <p className="mt-4 flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "font-display text-[2.6rem] font-semibold leading-none tracking-tight",
                        p.featured ? "text-white" : "text-ink",
                      )}
                    >
                      {t(`pricingTiers.${p.key}.price`)}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        p.featured ? "text-white/55" : "text-muted-foreground",
                      )}
                    >
                      {t(`pricingTiers.${p.key}.note`)}
                    </span>
                  </p>
                  <ul className="mt-7 flex-1 space-y-3">
                    {features.map((feat) => (
                      <li
                        key={feat}
                        className={cn(
                          "flex items-start gap-2.5 text-sm",
                          p.featured ? "text-white/80" : "text-ink-soft",
                        )}
                      >
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            p.featured ? "text-live" : "text-ink/35",
                          )}
                        />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Button
                    href="/pricing"
                    variant={p.featured ? "primary" : "outline"}
                    size="md"
                    className="mt-8 w-full"
                  >
                    {t("seePlans")}
                  </Button>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn>
            <p className="mt-10 text-center text-sm text-muted-foreground">
              {t.rich("pricingFooter", {
                signup: (chunks) => (
                  <AuthCtaLink className="font-semibold text-ink underline-offset-4 hover:underline">
                    {chunks}
                  </AuthCtaLink>
                ),
                plans: (chunks) => (
                  <Link
                    href="/pricing"
                    className="font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ============================================================== FAQ */}
      <section className="container-page py-28 sm:py-32">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.75rem]">
            {t.rich("faqTitle", {
              highlight: (chunks) => <Accent>{chunks}</Accent>,
            })}
          </h2>
        </FadeIn>
        <FadeIn className="mt-14">
          <Faq />
        </FadeIn>
      </section>

      {/* ======================================================== FINAL CTA */}
      <section className="container-page pb-28 sm:pb-32">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.07] bg-gradient-to-b from-[#1b1f26] to-[#111419] px-8 py-20 text-center sm:px-16 sm:py-28">
          {/* ghost wordmark */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-[30%] select-none text-center font-display text-[clamp(7rem,24vw,17rem)] font-semibold leading-none tracking-tight text-white/[0.045]"
          >
            Lumi
          </span>
          {/* The two rotated gradient rectangles that used to flank this
              headline stood in for output stills. The wall above now shows the
              real thing, so they only read as filler. */}
          <FadeIn className="relative">
            <h2 className="mx-auto max-w-2xl text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
              {t.rich("finalCtaTitle", {
                highlight: (chunks) => <Accent>{chunks}</Accent>,
              })}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-white/65">
              {t("finalCtaSubtitle")}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <AuthCta
                label={t("finalCtaPrimary")}
                variant="solid"
                size="lg"
                className="bg-white text-neutral-900 shadow-button hover:bg-white/90"
              >
                <ArrowRight className="h-4 w-4" />
              </AuthCta>
              <Link
                href="/pricing"
                className="inline-flex h-13 items-center justify-center rounded-full px-6 text-base font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {t("finalCtaSecondary")}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------- subcomponents */

/** Dark product-UI vignette — the arcads fake-UI card, built from Lumi's real
 * studio surfaces. */
function MediaCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-white/10 bg-gradient-to-b from-[#1b1f26] to-[#111419] p-5 shadow-card">
      {children}
    </div>
  );
}

/** Serif-italic caption + supporting line under a media card. */
function MediaCaption({ caption, body }: { caption: string; body: string }) {
  return (
    <div className="mt-5 px-1">
      <h3 className="font-accent text-2xl text-ink">{caption}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
