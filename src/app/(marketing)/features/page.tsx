import type { Metadata } from "next";
import {
  Link2,
  Wand2,
  ListChecks,
  UserSquare2,
  AudioLines,
  Send,
  Check,
  Search,
  ScanSearch,
  PencilRuler,
  Clapperboard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, CtaBand } from "@/components/marketing/page-parts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything Lumi does — link to video, pattern-grounded scripts, beat-by-beat review, avatar & product modes, auto dialogue QA, captions & publish.",
};

const FEATURES = [
  {
    id: "link-to-video",
    icon: Link2,
    kicker: "Source",
    title: "Link to Video",
    body: "Paste any product URL or pick from the built-in marketplace of trending TikTok Shop products. Lumi reads the product, its angle, and its proof points, then handles framing, script, voice, and edit automatically.",
    bullets: [
      "Marketplace with live sales, commission & creator-momentum signals",
      "Any product link works — no manual data entry",
      "Hero imagery becomes the render's visual reference",
    ],
  },
  {
    id: "scripts",
    icon: Wand2,
    kicker: "Script",
    title: "Pattern-grounded scripts",
    body: "Before writing a word, Lumi studies a large sample of real, organic top-performers in your product's category and extracts the structural pattern — the hook, proof, and CTA shapes that actually convert. Your script is built on that, never a blank page.",
    bullets: [
      "Learns structure from ~100 filtered organic winners",
      "Hook / proof / offer beats, not copy-pasted execution",
      "Audience language pulled from real comments",
    ],
  },
  {
    id: "review",
    icon: ListChecks,
    kicker: "Control",
    title: "Beat-by-beat review",
    body: "Lumi generates a reference image for every beat first. Approve the shots you love, regenerate the ones you don't — and only then does it spend render time. Prefer hands-off? Auto-QA approves beats for you.",
    bullets: [
      "A reference frame per shot before any render burns",
      "Approve or regenerate, beat by beat",
      "Optional auto-QA for a zero-click flow",
    ],
  },
  {
    id: "modes",
    icon: UserSquare2,
    kicker: "Format",
    title: "Avatar & product modes",
    body: "Choose an AI presenter talking to camera, or a clean product-only showcase — eight ready-made styles spanning talking intros, demos, testimonials, unboxings, and offer-focused cuts.",
    bullets: [
      "AI Avatar or Product-Only",
      "8 styles tuned for commerce",
      "5–30 second lengths, 9:16 native",
    ],
  },
  {
    id: "qa",
    icon: AudioLines,
    kicker: "Quality",
    title: "Auto dialogue QA",
    body: "After each beat renders, Whisper transcribes the spoken line and checks it against the script, flagging drift. The voice always says what it's supposed to — no off-script surprises.",
    bullets: [
      "Whisper transcription on every rendered line",
      "Drift score against the intended script",
      "Catches off-script audio before you post",
    ],
  },
  {
    id: "publish",
    icon: Send,
    kicker: "Ship",
    title: "Captions & publish",
    body: "Captions are burned in and the cut is sized 9:16 for TikTok and Reels — ready to download or mark posted, so your stats stay tidy.",
    bullets: [
      "Auto-burned captions",
      "Publish-ready 9:16 export",
      "Track posted vs. drafted in My Videos",
    ],
  },
];

const PIPELINE = [
  { icon: Search, label: "Find" },
  { icon: ScanSearch, label: "Deconstruct" },
  { icon: PencilRuler, label: "Script" },
  { icon: Clapperboard, label: "Generate" },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        kicker="Features"
        title="The whole video workflow,"
        highlight="handled."
        subtitle="From sourcing the product to a publish-ready cut — no stitching five tools together."
      />

      {/* pipeline strip */}
      <div className="container-page -mt-6 mb-8">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-border bg-card px-5 py-3 shadow-soft">
          {PIPELINE.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <s.icon className="h-4 w-4 text-brand-600" />
                {s.label}
              </span>
              {i < PIPELINE.length - 1 && (
                <span className="text-border-strong">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* feature rows */}
      <div className="container-page space-y-20 pb-12 sm:space-y-28">
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.id} feature={f} flip={i % 2 === 1} index={i} />
        ))}
      </div>

      <CtaBand />
    </>
  );
}

function FeatureRow({
  feature,
  flip,
  index,
}: {
  feature: (typeof FEATURES)[number];
  flip: boolean;
  index: number;
}) {
  const Icon = feature.icon;
  return (
    <section
      id={feature.id}
      className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2"
    >
      <div className={cn(flip && "lg:order-2")}>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {feature.kicker}
        </p>
        <h2 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold text-ink">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Icon className="h-5 w-5" />
          </span>
          {feature.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {feature.body}
        </p>
        <ul className="mt-5 space-y-2.5">
          {feature.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-ink-soft">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Check className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* stylized visual */}
      <div className={cn(flip && "lg:order-1")}>
        <div className="relative overflow-hidden rounded-card border border-border bg-card p-8 shadow-card">
          <div className="bg-aurora absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-50 blur-2xl" />
          <div className="relative flex aspect-video items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-hero text-white shadow-glow">
              <Icon className="h-12 w-12" />
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-2">
            {feature.bullets.map((b, j) => (
              <Badge key={j} variant={j === 0 ? "brand" : "outline"} size="sm">
                {b.split(" ").slice(0, 3).join(" ")}
              </Badge>
            ))}
          </div>
          <span className="pointer-events-none absolute bottom-4 right-5 font-display text-6xl font-bold text-muted">
            0{index + 1}
          </span>
        </div>
      </div>
    </section>
  );
}
