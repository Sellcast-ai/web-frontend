import { NextRequest, NextResponse } from "next/server";
import {
  callBackendAuthed,
  clearSessionCookies,
  clearShopifyStateCookie,
  setSessionCookies,
  setShopifyConnectedCookie,
} from "@/lib/api/server";
import { SHOPIFY_STATE_COOKIE, activeShopifyConnection } from "@/lib/shopify-shop";

export const dynamic = "force-dynamic";

/**
 * Shopify sends the merchant back here (the backend's redirect_uri points at
 * this BFF route). We forward the query (code/shop/state/hmac) and the state
 * cookie to the backend, which verifies HMAC + state and exchanges the code.
 * The browser is in a top-level navigation, so whatever the backend answers
 * becomes a redirect back to the connections page - success names the shop,
 * failure carries an honest error code. Never render the backend's JSON.
 */
export async function GET(req: NextRequest) {
  const stateCookie = req.cookies.get(SHOPIFY_STATE_COOKIE)?.value;

  const { res, refreshed, unreachable } = await callBackendAuthed(
    req,
    "connections/shopify/callback",
    {
      search: req.nextUrl.search,
      headers: stateCookie ? { cookie: `${SHOPIFY_STATE_COOKIE}=${stateCookie}` } : {},
      // A 3xx here is not a success: `follow` would land on some final 200
      // (possibly HTML) and report a store as connected when it isn't.
      redirect: "manual",
    },
  );
  if (!res && !unreachable) {
    const out = NextResponse.redirect(new URL("/login", req.url), 302);
    if (refreshed) setSessionCookies(out, refreshed.session);
    else clearSessionCookies(out);
    clearShopifyStateCookie(out);
    return out;
  }

  let target: string;
  let connectedShop: string | null = null;
  if (!res) {
    target = "/app/connections?error=failed";
  } else if (res.ok) {
    const connection = activeShopifyConnection(await res.json().catch(() => null));
    if (connection) {
      connectedShop = connection.shop_domain.trim();
      target = `/app/connections?connected=${encodeURIComponent(connectedShop)}`;
    } else {
      target = "/app/connections?error=failed";
    }
  } else {
    const code = res.status === 503 ? "unavailable" : "failed";
    target = `/app/connections?error=${code}`;
  }

  const out = NextResponse.redirect(new URL(target, req.url), 302);
  // The state cookie lives on this origin; the backend's own delete-cookie
  // never reaches the browser, so clear it here either way.
  clearShopifyStateCookie(out);
  if (connectedShop) setShopifyConnectedCookie(out, connectedShop);
  if (refreshed) setSessionCookies(out, refreshed.session);
  return out;
}
