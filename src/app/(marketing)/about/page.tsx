import type { Metadata } from "next";
import { Target, Sparkles, ShieldCheck, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader, CtaBand } from "@/components/marketing/page-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.metadata.about");
  return { title: t("title"), description: t("description") };
}

const VALUES = [
  { icon: Target, key: "grounded" },
  { icon: Sparkles, key: "quality" },
  { icon: ShieldCheck, key: "control" },
  { icon: Users, key: "sellers" },
] as const;

export default async function AboutPage() {
  const t = await getTranslations("marketing.about");
  return (
    <>
      <PageHeader
        kicker={t("header.kicker")}
        title={t("header.title")}
        highlight={t("header.highlight")}
        subtitle={t("header.subtitle")}
      />

      <section className="container-page pb-4">
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-muted-foreground">
          <p>{t("intro1")}</p>
          <p>
            {t.rich("intro2", {
              em: (chunks) => <em>{chunks}</em>,
            })}
          </p>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div
              key={v.key}
              className="rounded-card border border-border bg-card p-7 shadow-soft"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">
                {t(`values.${v.key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`values.${v.key}.body`)}
              </p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-muted-foreground">
          {t.rich("contact", {
            email: (chunks) => (
              <a
                href="mailto:hello@sellcast.ai"
                className="font-semibold text-brand-700 underline underline-offset-4"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>

      <CtaBand />
    </>
  );
}
