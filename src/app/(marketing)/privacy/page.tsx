import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Prose } from "@/components/marketing/page-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.privacy");
  return { title: t("title") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("marketing.legal");
  const strong = (chunks: ReactNode) => <strong>{chunks}</strong>;
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {t("kicker")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">
          {t("privacy.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>
      </div>

      <div className="mt-10">
        <Prose>
          <p>{t("privacy.intro")}</p>

          <h2>{t("privacy.collect.heading")}</h2>
          <ul>
            <li>{t.rich("privacy.collect.account", { strong })}</li>
            <li>{t.rich("privacy.collect.usage", { strong })}</li>
            <li>{t.rich("privacy.collect.technical", { strong })}</li>
          </ul>

          <h2>{t("privacy.use.heading")}</h2>
          <ul>
            <li>{t("privacy.use.item1")}</li>
            <li>{t("privacy.use.item2")}</li>
            <li>{t("privacy.use.item3")}</li>
            <li>{t("privacy.use.item4")}</li>
          </ul>

          <h2>{t("privacy.sharing.heading")}</h2>
          <p>{t("privacy.sharing.body")}</p>

          <h2>{t("privacy.cookies.heading")}</h2>
          <p>{t("privacy.cookies.body")}</p>

          <h2>{t("privacy.retention.heading")}</h2>
          <p>{t("privacy.retention.body")}</p>

          <h2>{t("privacy.rights.heading")}</h2>
          <p>{t("privacy.rights.body")}</p>

          <h2>{t("privacy.security.heading")}</h2>
          <p>{t("privacy.security.body")}</p>

          <h2>{t("privacy.children.heading")}</h2>
          <p>{t("privacy.children.body")}</p>

          <h2>{t("privacy.changes.heading")}</h2>
          <p>{t("privacy.changes.body")}</p>

          <h2>{t("privacy.contact.heading")}</h2>
          <p>
            {t.rich("privacy.contact.body", {
              email: (chunks) => (
                <a href="mailto:privacy@sellcast.ai">{chunks}</a>
              ),
            })}
          </p>
        </Prose>
      </div>
    </div>
  );
}
