/**
 * Shop-domain and redirect-target bounds for the Shopify connect flow.
 * The BFF start route turns a user-supplied `shop` into a top-level browser
 * redirect on our own authenticated origin, so both ends have to be bounded
 * here as well as in the backend: an unbounded one is an open redirect.
 */

const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

export function isShopDomain(shop: string): boolean {
  return SHOP_DOMAIN.test(shop);
}

/** The backend's `Location`, normalized, but only if it stays inside Shopify. */
export function shopifyRedirect(location: string | null): string | null {
  if (!location) return null;
  let url: URL;
  try {
    url = new URL(location);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  return /(^|\.)myshopify\.com$/i.test(url.hostname) ? url.toString() : null;
}
