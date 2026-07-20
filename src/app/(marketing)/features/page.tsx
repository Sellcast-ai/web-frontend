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
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader, CtaBand } from "@/components/marketing/page-parts";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.metadata.features");
  return { title: t("title"), description: t("description") };
}

const FEATURES = [
  { id: "link-to-video", key: "linkToVideo", icon: Link2 },
  { id: "scripts", key: "scripts", icon: Wand2 },
  { id: "review", key: "review", icon: ListChecks },
  { id: "modes", key: "modes", icon: UserSquare2 },
  { id: "qa", key: "qa", icon: AudioLines },
  { id: "publish", key: "publish", icon: Send },
] as const;

const PIPELINE = [
  { icon: Search, key: "find" },
  { icon: ScanSearch, key: "deconstruct" },
  { icon: PencilRuler, key: "script" },
  { icon: Clapperboard, key: "generate" },
] as const;

export default async function FeaturesPage() {
  const t = await getTranslations("marketing.features");
  return (
    <>
      <PageHeader
        kicker={t("header.kicker")}
        title={t("header.title")}
        highlight={t("header.highlight")}
        subtitle={t("header.subtitle")}
      />

      {/* pipeline strip */}
      <div className="container-page -mt-6 mb-8">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-border bg-card px-5 py-3 shadow-soft">
          {PIPELINE.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <s.icon className="h-4 w-4 text-brand-600" />
                {t(`pipeline.${s.key}`)}
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

async function FeatureRow({
  feature,
  flip,
  index,
}: {
  feature: (typeof FEATURES)[number];
  flip: boolean;
  index: number;
}) {
  const t = await getTranslations(`marketing.features.rows.${feature.key}`);
  const Icon = feature.icon;
  const bullets = t.raw("bullets") as string[];
  return (
    <section
      id={feature.id}
      className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2"
    >
      <div className={cn(flip && "lg:order-2")}>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {t("kicker")}
        </p>
        <h2 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold text-ink">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Icon className="h-5 w-5" />
          </span>
          {t("title")}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {t("body")}
        </p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((b) => (
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
            {bullets.map((b, j) => (
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
