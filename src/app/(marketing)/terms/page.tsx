import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Prose } from "@/components/marketing/page-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.terms");
  return { title: t("title") };
}

export default async function TermsPage() {
  const t = await getTranslations("marketing.legal");
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {t("kicker")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">
          {t("terms.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>
      </div>

      <div className="mt-10">
        <Prose>
          <p>{t("terms.intro")}</p>

          <h2>{t("terms.service.heading")}</h2>
          <p>{t("terms.service.body")}</p>

          <h2>{t("terms.account.heading")}</h2>
          <p>{t("terms.account.body")}</p>

          <h2>{t("terms.acceptableUse.heading")}</h2>
          <ul>
            <li>{t("terms.acceptableUse.item1")}</li>
            <li>{t("terms.acceptableUse.item2")}</li>
            <li>{t("terms.acceptableUse.item3")}</li>
            <li>{t("terms.acceptableUse.item4")}</li>
          </ul>

          <h2>{t("terms.content.heading")}</h2>
          <h3>{t("terms.content.yourHeading")}</h3>
          <p>{t("terms.content.yourBody")}</p>
          <h3>{t("terms.content.outputHeading")}</h3>
          <p>{t("terms.content.outputBody")}</p>

          <h2>{t("terms.billing.heading")}</h2>
          <p>
            {t.rich("terms.billing.body", {
              refunds: (chunks) => <a href="/refunds">{chunks}</a>,
            })}
          </p>

          <h2>{t("terms.disclaimers.heading")}</h2>
          <p>{t("terms.disclaimers.body")}</p>

          <h2>{t("terms.liability.heading")}</h2>
          <p>{t("terms.liability.body")}</p>

          <h2>{t("terms.termination.heading")}</h2>
          <p>{t("terms.termination.body")}</p>

          <h2>{t("terms.changes.heading")}</h2>
          <p>{t("terms.changes.body")}</p>

          <h2>{t("terms.contact.heading")}</h2>
          <p>
            {t.rich("terms.contact.body", {
              email: (chunks) => <a href="mailto:legal@sellcast.ai">{chunks}</a>,
            })}
          </p>
        </Prose>
      </div>
    </div>
  );
}
