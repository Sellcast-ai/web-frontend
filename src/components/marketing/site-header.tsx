import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";

/* Slim, zero-state marketing chrome: logo, Pricing, Sign in, one primary CTA.
   Features/Models/language/theme all live in the footer or the app — the page
   itself does the talking. Server component; no menu state. */
export async function SiteHeader() {
  const t = await getTranslations("nav");
  const tc = await getTranslations("marketing.header");

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/pricing"
            className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            {t("pricing")}
          </Link>
          <Link
            href="/login"
            className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:block"
          >
            {tc("signIn")}
          </Link>
          <Button href="/signup" variant="primary" size="sm">
            {tc("startFree")}
          </Button>
        </div>
      </div>
    </header>
  );
}
