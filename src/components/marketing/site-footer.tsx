import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";

const COLUMNS: { key: string; links: { key: string; href: string }[] }[] = [
  {
    key: "product",
    links: [
      { key: "features", href: "/features" },
      { key: "models", href: "/models" },
      { key: "pricing", href: "/pricing" },
      { key: "marketplace", href: "/app/marketplace" },
    ],
  },
  {
    key: "workflow",
    links: [
      { key: "linkToVideo", href: "/features#link-to-video" },
      { key: "patternScripts", href: "/features#scripts" },
      { key: "beatReview", href: "/features#review" },
      { key: "publish", href: "/features#publish" },
    ],
  },
  {
    key: "company",
    links: [
      { key: "about", href: "/about" },
      { key: "blog", href: "/blog" },
      { key: "careers", href: "/careers" },
      { key: "contact", href: "mailto:hello@sellcast.ai" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "privacy", href: "/privacy" },
      { key: "terms", href: "/terms" },
      { key: "refunds", href: "/refunds" },
    ],
  },
];

export async function SiteFooter() {
  const t = await getTranslations("marketing.footer");

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo href={null} />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.key}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t(`columns.${col.key}.title`)}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-soft transition-colors hover:text-brand-700"
                    >
                      {t(`columns.${col.key}.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("madeFor")}</p>
        </div>
      </div>
    </footer>
  );
}
