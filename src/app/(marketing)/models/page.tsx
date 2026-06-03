import type { Metadata } from "next";
import { Clapperboard, Cpu, Layers, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, CtaBand } from "@/components/marketing/page-parts";

export const metadata: Metadata = {
  title: "Models",
  description:
    "Lumi renders with the frontier of video AI — Seedance 2.0 and Sora 2 today, with Veo, Kling, and Gemini on the way. The right model is chosen per shot.",
};

const MODELS = [
  {
    name: "Seedance 2.0",
    tag: "Live",
    live: true,
    desc: "Fast, lifelike motion for product and avatar shots — Lumi's default workhorse for most beats.",
    bestFor: ["Product motion", "Avatar talking", "Speed"],
  },
  {
    name: "Sora 2",
    tag: "Live",
    live: true,
    desc: "Cinematic scenes and complex camera moves when a beat needs more production value.",
    bestFor: ["Cinematic b-roll", "Camera moves", "Scenes"],
  },
  {
    name: "Veo 3.1",
    tag: "Soon",
    live: false,
    desc: "High-fidelity realism for hero moments where photoreal detail matters most.",
    bestFor: ["Photoreal", "Hero shots"],
  },
  {
    name: "Kling V3",
    tag: "Soon",
    live: false,
    desc: "Expressive characters and dynamic action for high-energy, motion-forward cuts.",
    bestFor: ["Action", "Characters"],
  },
  {
    name: "Gemini Omni",
    tag: "Soon",
    live: false,
    desc: "Multimodal generation for tightly synced audio-visual beats.",
    bestFor: ["A/V sync", "Multimodal"],
  },
];

const POINTS = [
  {
    icon: Layers,
    title: "Best model per beat",
    body: "Lumi routes each shot to the model that renders it best — you never pick a model by hand.",
  },
  {
    icon: Wand2,
    title: "Your work carries over",
    body: "Scripts and approved beats are model-agnostic. When a new model lands, your videos can use it without a redo.",
  },
  {
    icon: Cpu,
    title: "One studio, one bill",
    body: "No juggling separate model accounts or credits — it's all inside Lumi.",
  },
];

export default function ModelsPage() {
  return (
    <>
      <PageHeader
        kicker="Models"
        title="One studio, the frontier of"
        highlight="video AI."
        subtitle="Lumi picks the right model for every shot — and your scripts carry over as new ones arrive."
      />

      {/* model grid */}
      <section className="container-page py-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODELS.map((m) => (
            <div
              key={m.name}
              className="relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-soft"
            >
              <div className="bg-aurora absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-xl" />
              <div className="relative flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-background">
                  <Clapperboard className="h-5 w-5" />
                </span>
                <Badge variant={m.live ? "success" : "outline"} size="sm">
                  {m.tag}
                </Badge>
              </div>
              <h2 className="relative mt-4 font-display text-lg font-semibold text-ink">
                {m.name}
              </h2>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {m.desc}
              </p>
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {m.bestFor.map((b) => (
                  <span
                    key={b}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* why it matters */}
      <section className="bg-muted/40 py-16">
        <div className="container-page grid gap-5 md:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.title} className="rounded-card border border-border bg-card p-7 shadow-soft">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand title="Render with the best models — without the busywork." />
    </>
  );
}
