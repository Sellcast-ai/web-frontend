import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { APP_HOME_HREF } from "@/lib/launch-routes";

/* Slim, zero-state marketing chrome: logo, Pricing, language, theme, Sign in,
   one primary CTA. Below sm the two text links drop out (they stay reachable
   from the footer), spacing tightens, and the wordmark collapses to the mark
   so the row can't overflow a 320px screen. Features/Models live in the
   footer; the page itself does the talking. Server component; no menu state.
   A signed-in visitor gets a single "Open Studio" CTA instead of Sign in /
   Start free. */
export async function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations("nav");
  const tc = await getTranslations("marketing.header");

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Logo wordmarkClassName="hidden sm:inline" />
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/pricing"
            className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:block"
          >
            {t("pricing")}
          </Link>
          <LanguageSwitcher compactOnSmall />
          <ThemeToggle />
          {signedIn ? (
            <Button href={APP_HOME_HREF} variant="primary" size="sm" className="px-3 sm:px-4">
              {tc("openStudio")}
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:block"
              >
                {tc("signIn")}
              </Link>
              <Button href="/signup" variant="primary" size="sm" className="px-3 sm:px-4">
                <span className="sm:hidden">{tc("startFreeMobile")}</span>
                <span className="hidden sm:inline">{tc("startFree")}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
