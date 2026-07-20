import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Centered page hero used across marketing sub-pages. */
export function PageHeader({
  kicker,
  title,
  highlight,
  subtitle,
}: {
  kicker?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-aurora absolute inset-0 -z-10 opacity-60" />
      <div className="container-page py-16 text-center sm:py-20">
        {kicker && (
          <Badge variant="outline" className="mb-5">
            {kicker}
          </Badge>
        )}
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl">
          {title} {highlight && <span className="text-brand">{highlight}</span>}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}

/** Reusable bottom call-to-action band (hero gradient). */
export function CtaBand({
  title,
  subtitle,
  primaryHref = "/signup",
  primaryLabel,
}: {
  title?: string;
  subtitle?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  const t = useTranslations("marketing.cta");
  const resolvedTitle = title ?? t("title");
  const resolvedSubtitle = subtitle ?? t("subtitle");
  const resolvedPrimaryLabel = primaryLabel ?? t("primaryLabel");
  return (
    <section className="container-page py-20">
      <div className="bg-hero relative overflow-hidden rounded-[2.5rem] px-8 py-16 text-center shadow-glow sm:px-16">
        <div className="bg-aurora absolute inset-0 opacity-30 mix-blend-overlay" />
        <h2 className="relative mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
          {resolvedTitle}
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-white/85">{resolvedSubtitle}</p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            href={primaryHref}
            variant="solid"
            size="lg"
            className="bg-white text-brand-700 hover:bg-white/90"
          >
            {resolvedPrimaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link
            href="/pricing"
            className="inline-flex h-13 items-center justify-center rounded-full px-8 text-base font-semibold text-white underline-offset-4 hover:underline"
          >
            {t("seePricing")}
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Styling wrapper for long-form legal / prose content. We don't ship the
 * typography plugin, so child element styles are applied via arbitrary
 * variants — keeps legal pages readable without per-element classes.
 */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl text-[15px] leading-relaxed text-ink-soft [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mt-1.5 [&_p]:mt-4 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      {children}
    </div>
  );
}
