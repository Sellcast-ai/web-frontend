/**
 * The site's own public origin - the single source of truth for canonical
 * links, Open Graph URLs, robots.txt and sitemap.xml.
 *
 * Resolution order:
 *  1. `NEXT_PUBLIC_SITE_URL` - set this when a real domain is attached.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` - the project's production deployment
 *     host, injected by Vercel at build/runtime (bare host, no scheme).
 *  3. The current production deployment origin, as a last resort so an
 *     unconfigured build still emits URLs that actually resolve.
 */
const FALLBACK_ORIGIN = "https://web-frontend-ten-nu.vercel.app";

/** Coerce a configured value into a bare origin: scheme + host, no trailing slash. */
export function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withScheme).origin;
}

function resolveSiteUrl(): string {
  // Read statically so Next can inline the NEXT_PUBLIC_ value at build time.
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  try {
    return configured ? normalizeOrigin(configured) : FALLBACK_ORIGIN;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export const SITE_URL = resolveSiteUrl();
