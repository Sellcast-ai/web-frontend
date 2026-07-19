import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// UI-locale resolution for next-intl "without i18n routing" (PR-1: cookie-only,
// no `[locale]` URL segment). The locale is read from the server-readable
// `lumi-locale` cookie so the correct language renders on first paint with no
// hydration flash; default `en`. Only `en` has a catalog today - the other 8
// target locales (es, zh, ja, ko, pt, id, vi, th) arrive in later PRs.
//
// This is the UI axis only. It must never feed the video-output `language`
// payload (see i18n plan §0).
export const DEFAULT_LOCALE = "en";

export default getRequestConfig(async () => {
  const cookie = (await cookies()).get("lumi-locale")?.value;
  const locale = cookie === "en" ? cookie : DEFAULT_LOCALE;

  return {
    // v4 requires `locale` to be returned explicitly.
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
