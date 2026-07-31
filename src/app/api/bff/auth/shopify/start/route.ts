import { NextRequest, NextResponse } from "next/server";
import {
  callBackendAuthed,
  clearSessionCookies,
  setSessionCookies,
  setShopifyStateCookie,
} from "@/lib/api/server";
import {
  isShopDomain,
  normalizeShopDomain,
  shopifyAuthorizeUrl,
  stateCookieValue,
} from "@/lib/shopify-shop";

export const dynamic = "force-dynamic";

/**
 * Browser entry point for the Shopify connect flow. The backend answers with
 * a redirect to the shop's /admin/oauth/authorize URL plus the HMAC-signed
 * state cookie; both must reach the browser (the cookie on *this* origin,
 * because Shopify sends the merchant back to our callback, not the backend's).
 * Anything that isn't that redirect sends the merchant back to the connections
 * page with an honest error instead of a dead end.
 */
export async function GET(req: NextRequest) {
  const shop = normalizeShopDomain(req.nextUrl.searchParams.get("shop") ?? "");

  const fail = (code: string, refreshed?: Parameters<typeof setSessionCookies>[1]) => {
    const out = NextResponse.redirect(
      new URL(`/app/connections?error=${code}`, req.url),
      302,
    );
    if (refreshed) setSessionCookies(out, refreshed);
    return out;
  };

  if (!isShopDomain(shop)) return fail("invalid-shop");

  const { res, refreshed, unreachable } = await callBackendAuthed(
    req,
    "connections/shopify/start",
    { search: `?shop=${encodeURIComponent(shop)}`, redirect: "manual" },
  );
  if (unreachable) return fail("failed", refreshed?.session);
  if (!res) {
    const out = NextResponse.redirect(new URL("/login", req.url), 302);
    if (refreshed) setSessionCookies(out, refreshed.session);
    else clearSessionCookies(out);
    return out;
  }

  const location = shopifyAuthorizeUrl(res);
  if (location) {
    // Without the state the callback cannot verify the round trip, so the
    // merchant would authorize the app on their store for nothing.
    const state = stateCookieValue(res.headers.getSetCookie());
    if (!state) return fail("failed", refreshed?.session);
    const out = NextResponse.redirect(location, 302);
    if (refreshed) setSessionCookies(out, refreshed.session);
    setShopifyStateCookie(out, state);
    return out;
  }

  const code =
    res.status === 422 ? "invalid-shop" : res.status === 503 ? "unavailable" : "failed";
  return fail(code, refreshed?.session);
}
