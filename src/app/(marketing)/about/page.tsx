import type { Metadata } from "next";
import { Target, Sparkles, ShieldCheck, Users } from "lucide-react";
import { PageHeader, CtaBand } from "@/components/marketing/page-parts";

export const metadata: Metadata = {
  title: "About",
  description:
    "Lumi is a Sellcast product helping sellers and creators turn products into scroll-stopping shoppable videos — grounded in real viral patterns.",
};

const VALUES = [
  {
    icon: Target,
    title: "Grounded, not guessing",
    body: "We learn from what actually converts in a category before we generate a thing.",
  },
  {
    icon: Sparkles,
    title: "Quality over volume",
    body: "Native-feeling creatives that stop the scroll — not generic AI filler.",
  },
  {
    icon: ShieldCheck,
    title: "You stay in control",
    body: "Review beat-by-beat. Nothing burns render time without your sign-off (unless you want it to).",
  },
  {
    icon: Users,
    title: "Built for sellers",
    body: "Made for people who'd rather sell than film — solo creators to agencies.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        kicker="About"
        title="We help you sell with video —"
        highlight="without the studio."
        subtitle="Lumi is a Sellcast product. We turn any product into a scroll-stopping shoppable video, grounded in what's already winning."
      />

      <section className="container-page pb-4">
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-muted-foreground">
          <p>
            Short-form video is the storefront now — but most sellers don&apos;t
            have time to film, edit, and test their way to a winner. Generic AI
            tools fill the gap with content that feels like AI.
          </p>
          <p>
            Lumi takes a different path. Before writing a script, it studies a
            large sample of real, organic top-performers in your product&apos;s
            category and learns the <em>structure</em> that converts — then scripts,
            storyboards, and renders a video you can review beat-by-beat and ship
            in minutes.
          </p>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-card border border-border bg-card p-7 shadow-soft"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">
                {v.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {v.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-muted-foreground">
          Want to talk partnerships, press, or enterprise?{" "}
          <a
            href="mailto:hello@sellcast.ai"
            className="font-semibold text-brand-700 underline underline-offset-4"
          >
            hello@sellcast.ai
          </a>
        </p>
      </section>

      <CtaBand />
    </>
  );
}
