import type { Metadata } from "next";
import { Clapperboard, Cpu, Layers, Wand2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader, CtaBand } from "@/components/marketing/page-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.metadata.models");
  return { title: t("title"), description: t("description") };
}

const MODELS = [
  { key: "seedance", live: true },
  { key: "more", live: false },
] as const;

const POINTS = [
  { icon: Layers, key: "tuned" },
  { icon: Wand2, key: "carriesOver" },
  { icon: Cpu, key: "oneBill" },
] as const;

export default async function ModelsPage() {
  const t = await getTranslations("marketing.models");
  return (
    <>
      <PageHeader
        kicker={t("header.kicker")}
        title={t("header.title")}
        highlight={t("header.highlight")}
        subtitle={t("header.subtitle")}
      />

      {/* model grid */}
      <section className="container-page py-8">
        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
          {MODELS.map((m) => (
            <div
              key={m.key}
              className="relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-soft"
            >
              <div className="bg-aurora absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-xl" />
              <div className="relative flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-background">
                  <Clapperboard className="h-5 w-5" />
                </span>
                <Badge variant={m.live ? "success" : "outline"} size="sm">
                  {t(`cards.${m.key}.tag`)}
                </Badge>
              </div>
              <h2 className="relative mt-4 font-display text-lg font-semibold text-ink">
                {t(`cards.${m.key}.name`)}
              </h2>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(`cards.${m.key}.desc`)}
              </p>
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {(t.raw(`cards.${m.key}.bestFor`) as string[]).map((b) => (
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
            <div key={p.key} className="rounded-card border border-border bg-card p-7 shadow-soft">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">
                {t(`points.${p.key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`points.${p.key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand title={t("ctaTitle")} />
    </>
  );
}
