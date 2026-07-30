"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { APP_HOME_HREF } from "@/lib/launch-routes";

const MarketingSessionContext = createContext(false);

/**
 * The marketing layout resolves the session once (server-side `hasSession`) and
 * publishes it here, so every CTA under it - server- or client-rendered, page
 * body or shared band - answers a signed-in visitor the same way instead of
 * each site deciding for itself.
 */
export function MarketingSessionProvider({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <MarketingSessionContext.Provider value={signedIn}>
      {children}
    </MarketingSessionContext.Provider>
  );
}

export function useMarketingSession() {
  return useContext(MarketingSessionContext);
}

const SIGNUP_HREF = "/signup";

type AuthCtaProps = {
  /** Label shown to a visitor without a session. */
  label: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  /** Trailing slot (icons); the label is a prop so it can be swapped. */
  children?: React.ReactNode;
};

/**
 * The one primary marketing CTA: "Open Studio" into the app when a session
 * cookie is present, the signup label/href otherwise. No marketing surface may
 * offer a signed-in user a link the auth pages would just redirect away.
 */
export function AuthCta({ label, children, ...rest }: AuthCtaProps) {
  const signedIn = useMarketingSession();
  const t = useTranslations("marketing.header");
  return (
    <Button href={signedIn ? APP_HOME_HREF : SIGNUP_HREF} {...rest}>
      {signedIn ? t("openStudio") : label}
      {children}
    </Button>
  );
}

/**
 * Same destination rule for a CTA that lives inside a sentence, where the link
 * text is prose the surrounding copy depends on: only the href swaps.
 */
export function AuthCtaLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const signedIn = useMarketingSession();
  return (
    <Link href={signedIn ? APP_HOME_HREF : SIGNUP_HREF} className={className}>
      {children}
    </Link>
  );
}
