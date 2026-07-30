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

/**
 * The single question both ends of the honesty gate ask of the backend's start
 * response: does it hand the merchant to Shopify? The availability probe must
 * answer it exactly as the start route does, or the card offers a button that
 * always bounces.
 */
export function shopifyAuthorizeUrl(res: Response): string | null {
  if (res.status < 300 || res.status >= 400) return null;
  return shopifyRedirect(res.headers.get("location"));
}

/** Must match STATE_COOKIE_NAME in the backend's app/services/shopify/oauth.py. */
export const SHOPIFY_STATE_COOKIE = "sellcast_shopify_oauth_state";

/**
 * The state cookie's value out of the backend's `set-cookie` list. Only the
 * value travels: the attributes were chosen for the backend's origin, and a
 * `Domain=`/`Path=` meant for it would keep the cookie from ever reaching our
 * callback.
 */
export function stateCookieValue(setCookies: string[]): string | null {
  for (const raw of setCookies) {
    const eq = raw.indexOf("=");
    if (eq < 1 || raw.slice(0, eq).trim() !== SHOPIFY_STATE_COOKIE) continue;
    const end = raw.indexOf(";", eq);
    const value = raw.slice(eq + 1, end === -1 ? undefined : end).trim();
    if (value) return value;
  }
  return null;
}
