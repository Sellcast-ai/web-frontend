import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";

/* Slim, zero-state marketing chrome: logo, Pricing, language, Sign in, one
   primary CTA. Below sm the two text links drop out (they stay reachable from
   the footer) so the row can't overflow a 320px screen. Features/Models/theme
   live in the footer or the app; the page itself does the talking. Server
   component; no menu state. */
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
            className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:block"
          >
            {t("pricing")}
          </Link>
          <LanguageSwitcher compactOnSmall />
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
