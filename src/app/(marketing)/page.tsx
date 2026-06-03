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
  Quote,
  Star,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroMock } from "@/components/marketing/hero-mock";
import { Faq } from "@/components/marketing/faq";

/* ------------------------------------------------------------------ data */

const STEPS = [
  {
    icon: Search,
    kicker: "Find",
    title: "Pick a winning product",
    body: "Browse trending TikTok Shop products with live sales & commission signals — or paste any product link.",
  },
  {
    icon: ScanSearch,
    kicker: "Deconstruct",
    title: "Lumi learns the pattern",
    body: "It studies ~100 real top-performers in that category and extracts the hook, proof, and CTA structure that converts.",
  },
  {
    icon: PencilRuler,
    kicker: "Script",
    title: "Review the script & beats",
    body: "A grounded script with shot-by-shot beats. Approve or regenerate each reference image before any render burns.",
  },
  {
    icon: Clapperboard,
    kicker: "Generate",
    title: "Render & publish",
    body: "Seedance & Sora render each beat in parallel, captions burn in, and you're ready to post.",
  },
];

const FEATURES = [
  {
    icon: Link2,
    title: "Link to Video",
    body: "Drop a product URL or pick from the marketplace. Lumi handles framing, script, voice, and edit automatically.",
  },
  {
    icon: Wand2,
    title: "Pattern-grounded scripts",
    body: "Every script is built from real viral structure in your category — learn the pattern, never copy the surface.",
  },
  {
    icon: ListChecks,
    title: "Beat-by-beat review",
    body: "See a reference image for every shot. Approve, tweak, or regenerate before spending a second of render time.",
  },
  {
    icon: UserSquare2,
    title: "Avatar & product modes",
    body: "AI presenter talking to camera, or clean product-only showcase — eight ready-made styles to match your offer.",
  },
  {
    icon: AudioLines,
    title: "Auto dialogue QA",
    body: "Whisper checks every rendered line against the script and flags drift, so the voice always says what it should.",
  },
  {
    icon: Send,
    title: "Captions & publish",
    body: "Auto-burned captions and a publish-ready 9:16 cut, sized for TikTok and Reels out of the box.",
  },
];

const MODELS = [
  { name: "Seedance 2.0", tag: "Live", desc: "Fast, lifelike motion for product & avatar shots.", live: true },
  { name: "Sora 2", tag: "Live", desc: "Cinematic scenes and complex camera moves.", live: true },
  { name: "Veo 3.1", tag: "Soon", desc: "High-fidelity realism for hero moments.", live: false },
  { name: "Kling V3", tag: "Soon", desc: "Expressive characters and dynamic action.", live: false },
];

const USE_CASES = [
  { title: "Sellers", body: "Scale your catalog — a converting video for every SKU, without a studio.", glow: "from-brand-300 to-brand-600" },
  { title: "Creators", body: "Spin TikTok Shop content in minutes and keep your posting streak alive.", glow: "from-rose to-warning" },
  { title: "Brands", body: "Stay on-brand across hundreds of unique creatives, all at once.", glow: "from-gold to-rose" },
  { title: "Agencies", body: "Serve every client at volume with quality you don't have to babysit.", glow: "from-brand-500 to-brand-800" },
];

const STATS = [
  { value: "100+", label: "real videos studied per category" },
  { value: "4 min", label: "median product → finished cut" },
  { value: "2", label: "render models, more on the way" },
  { value: "9:16", label: "publish-ready, every time" },
];

const TESTIMONIALS = [
  {
    quote:
      "We went from 3 videos a week to 30. The pattern grounding is the part nobody else does — the hooks actually land.",
    name: "Maya R.",
    role: "DTC founder",
  },
  {
    quote:
      "Beat review sold me. I approve the shots I want, regen the ones I don't, and I never waste render credits.",
    name: "Devon K.",
    role: "TikTok Shop affiliate",
  },
  {
    quote:
      "My agency runs five brands through Lumi. Same quality bar, a fraction of the edit time.",
    name: "Priya N.",
    role: "Creative agency lead",
  },
  {
    quote:
      "It feels native, not 'AI-made'. That's the whole game on TikTok and Lumi nails the feel.",
    name: "Theo M.",
    role: "Performance marketer",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "$0",
    note: "to try it",
    features: ["5 videos / mo", "Marketplace access", "Auto-QA render", "720p export"],
    cta: "Start free",
    href: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    price: "$39",
    note: "/ mo",
    features: [
      "100 videos / mo",
      "Beat-by-beat review",
      "Avatar + product modes",
      "1080p export",
      "Seedance + Sora",
    ],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    featured: true,
  },
  {
    name: "Studio",
    price: "Let's talk",
    note: "for teams",
    features: ["Unlimited seats", "Brand kits", "Priority render", "API access", "Dedicated support"],
    cta: "Contact sales",
    href: "/contact",
    featured: false,
  },
];

const MARQUEE = [
  "TikTok Shop",
  "Reels",
  "Beauty",
  "Home & Kitchen",
  "Fitness",
  "Gadgets",
  "Pets",
  "Fashion",
  "Supplements",
];

/* ------------------------------------------------------------------ page */

export default function HomePage() {
  return (
    <>
      {/* ============================================================ HERO */}
      <section className="relative overflow-hidden">
        <div className="bg-aurora absolute inset-0 -z-10 opacity-70" />
        <div className="container-page grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-rise">
            <Badge variant="outline" className="mb-6">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              Built for TikTok Shop &amp; Reels
            </Badge>
            <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Turn any product into a{" "}
              <span className="text-brand">scroll-stopping</span> shoppable
              video.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Lumi studies what actually goes viral in your category, scripts a
              video grounded in that pattern, lets you review it beat-by-beat,
              and renders it with Seedance &amp; Sora — in minutes, no camera
              required.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/signup" size="lg">
                Start creating free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/features" variant="outline" size="lg">
                See how it works
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["bg-brand-300", "bg-rose", "bg-gold", "bg-brand-600"].map((c) => (
                  <span
                    key={c}
                    className={`h-8 w-8 rounded-full border-2 border-background ${c}`}
                  />
                ))}
              </div>
              <span>
                <strong className="text-ink">10,000+</strong> creators &amp;
                sellers shipping with Lumi
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
              {[...MARQUEE, ...MARQUEE].map((item, i) => (
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
          kicker="The Lumi pipeline"
          title="Four stages, zero blank pages"
          subtitle="Most tools start from nothing. Lumi starts from what's already winning — then keeps you in control all the way to publish."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-card border border-border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1"
            >
              <span className="font-display text-sm font-semibold text-brand-300">
                0{i + 1}
              </span>
              <div className="mt-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <step.icon className="h-6 w-6" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-600">
                {step.kicker}
              </p>
              <h3 className="mt-1 font-display text-xl font-medium text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= FEATURES */}
      <section className="bg-muted/40 py-24">
        <div className="container-page">
          <SectionHeading
            kicker="Everything in one studio"
            title="The whole video workflow, handled"
            subtitle="From sourcing the product to a publish-ready cut — no stitching five tools together."
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-card border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-105">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-medium text-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================== MODELS */}
      <section className="container-page py-24">
        <SectionHeading
          kicker="Best model for every shot"
          title="One studio, the frontier of video AI"
          subtitle="Lumi picks the right model per beat — and your scripts carry over as new ones arrive."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MODELS.map((m) => (
            <div
              key={m.name}
              className="relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-soft"
            >
              <div className="bg-aurora absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-xl" />
              <div className="relative flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-background">
                  <Clapperboard className="h-5 w-5" />
                </span>
                <Badge variant={m.live ? "success" : "outline"} size="sm">
                  {m.tag}
                </Badge>
              </div>
              <h3 className="relative mt-4 font-display text-lg font-semibold text-ink">
                {m.name}
              </h3>
              <p className="relative mt-1 text-sm text-muted-foreground">
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== USE CASES */}
      <section className="container-page pb-24">
        <SectionHeading
          kicker="Who it's for"
          title="Made for everyone who sells with video"
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u) => (
            <div
              key={u.title}
              className="rounded-card border border-border bg-card p-7 shadow-soft"
            >
              <div
                className={`mb-5 h-1.5 w-12 rounded-full bg-linear-to-r ${u.glow}`}
              />
              <h3 className="font-display text-2xl font-medium text-ink">
                {u.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {u.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ STATS */}
      <section className="bg-ink py-20 text-background">
        <div className="container-page grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-brand-300 font-display text-5xl font-semibold">
                {s.value}
              </p>
              <p className="mx-auto mt-2 max-w-[12rem] text-sm text-background/70">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================== TESTIMONIALS */}
      <section className="container-page py-24">
        <SectionHeading
          kicker="Wall of love"
          title="Creators don't go back to filming"
        />
        <div className="mt-14 columns-1 gap-5 sm:columns-2 lg:columns-2 [&>*]:mb-5">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="break-inside-avoid rounded-card border border-border bg-card p-7 shadow-soft"
            >
              <Quote className="h-7 w-7 text-brand-300" />
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <blockquote className="mt-3 text-[15px] leading-relaxed text-ink">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold text-ink">{t.name}</span>
                <span className="text-muted-foreground"> · {t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ========================================================== PRICING */}
      <section className="bg-muted/40 py-24">
        <div className="container-page">
          <SectionHeading
            kicker="Pricing"
            title="Start free. Scale when it's working."
            subtitle="No credit card to begin. Cancel anytime."
          />
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={
                  p.featured
                    ? "relative rounded-card border-2 border-brand-400 bg-card p-8 shadow-glow"
                    : "relative rounded-card border border-border bg-card p-8 shadow-soft"
                }
              >
                {p.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most popular
                  </Badge>
                )}
                <h3 className="font-display text-xl font-semibold text-ink">
                  {p.name}
                </h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold text-ink">
                    {p.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{p.note}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm text-ink-soft">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        <Check className="h-3 w-3" />
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  href={p.href}
                  variant={p.featured ? "primary" : "outline"}
                  size="md"
                  className="mt-8 w-full"
                >
                  {p.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== FAQ */}
      <section className="container-page py-24">
        <SectionHeading kicker="FAQ" title="Questions, answered" />
        <div className="mt-12">
          <Faq />
        </div>
      </section>

      {/* ======================================================== FINAL CTA */}
      <section className="container-page pb-24">
        <div className="bg-hero relative overflow-hidden rounded-[2.5rem] px-8 py-16 text-center shadow-glow sm:px-16 sm:py-20">
          <div className="bg-aurora absolute inset-0 opacity-40 mix-blend-overlay" />
          <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Your next best-seller is one product link away.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/90">
            Make your first scroll-stopping video free. No camera, no editor, no
            blank page.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              href="/signup"
              variant="solid"
              size="lg"
              className="bg-white text-brand-700 hover:bg-white/90"
            >
              Start creating free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link
              href="/pricing"
              className="inline-flex h-13 items-center justify-center rounded-full px-8 text-base font-semibold text-white underline-offset-4 hover:underline"
            >
              See pricing
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
