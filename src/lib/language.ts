import type { ProductSummary, VideoLanguage } from "./api/types";
import { VIDEO_LANGUAGES } from "./api/types";

/** Source market → default video language (only if that language is enabled).
 * A seller can of course override — this just saves the obvious click:
 * shopee.co.id sells to Indonesians, amazon.es to Spanish speakers. */
const HOST_LANGUAGE: [RegExp, VideoLanguage][] = [
  [/shopee\.co\.id$/, "id"],
  [/shopee\.co\.th$/, "th"],
  [/amazon\.(es|com\.mx)$/, "es"],
];

export function defaultLanguageFor(
  product: Pick<ProductSummary, "source_url"> | undefined | null,
): VideoLanguage {
  if (!product?.source_url) return "en";
  let host = "";
  try {
    host = new URL(product.source_url).hostname.toLowerCase();
  } catch {
    return "en";
  }
  for (const [pattern, lang] of HOST_LANGUAGE) {
    if (pattern.test(host)) {
      const entry = VIDEO_LANGUAGES.find((l) => l.value === lang);
      if (entry?.enabled) return lang;
    }
  }
  return "en";
}
