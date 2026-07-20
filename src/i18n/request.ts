import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// UI-locale resolution for next-intl "without i18n routing" (PR-1: cookie-only,
// no `[locale]` URL segment). The locale is read from the server-readable
// `lumi-locale` cookie so the correct language renders on first paint with no
// hydration flash; default `en`.
//
// This is the UI axis only. It must never feed the video-output `language`
// payload (see i18n plan §0).
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "es", "zh", "ja", "ko", "pt", "id", "vi", "th"] as const;

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export default getRequestConfig(async () => {
  const cookie = (await cookies()).get("lumi-locale")?.value;
  const locale = cookie && SUPPORTED_LOCALE_SET.has(cookie) ? cookie : DEFAULT_LOCALE;

  return {
    // v4 requires `locale` to be returned explicitly.
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
