import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Prose } from "@/components/marketing/page-parts";
import { BILLING_EMAIL } from "@/lib/contact";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.refunds");
  return { title: t("title") };
}

export default async function RefundsPage() {
  const t = await getTranslations("marketing.legal");
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {t("kicker")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">
          {t("refunds.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>
      </div>

      <div className="mt-10">
        <Prose>
          <p>{t("refunds.intro")}</p>

          <h2>{t("refunds.free.heading")}</h2>
          <p>{t("refunds.free.body")}</p>

          <h2>{t("refunds.subscriptions.heading")}</h2>
          <p>{t("refunds.subscriptions.body")}</p>

          <h2>{t("refunds.guarantee.heading")}</h2>
          <p>{t("refunds.guarantee.body")}</p>

          <h2>{t("refunds.annual.heading")}</h2>
          <p>{t("refunds.annual.body")}</p>

          <h2>{t("refunds.cancellations.heading")}</h2>
          <p>{t("refunds.cancellations.body")}</p>

          <h2>{t("refunds.request.heading")}</h2>
          <p>
            {t.rich("refunds.request.body", {
              address: BILLING_EMAIL,
              email: (chunks) => (
                <a href={`mailto:${BILLING_EMAIL}`}>{chunks}</a>
              ),
            })}
          </p>
        </Prose>
      </div>
    </div>
  );
}
