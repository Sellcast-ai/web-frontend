import { NextRequest, NextResponse } from "next/server";
import { callBackendAuthed, setSessionCookies } from "@/lib/api/server";
import type { PlatformConnection } from "@/lib/api/types";

export const dynamic = "force-dynamic";

/** Must match STATE_COOKIE_NAME in the backend's app/services/shopify/oauth.py. */
const STATE_COOKIE = "sellcast_shopify_oauth_state";

/**
 * Shopify sends the merchant back here (the backend's redirect_uri points at
 * this BFF route). We forward the query (code/shop/state/hmac) and the state
 * cookie to the backend, which verifies HMAC + state and exchanges the code.
 * The browser is in a top-level navigation, so whatever the backend answers
 * becomes a redirect back to the connections page - success names the shop,
 * failure carries an honest error code. Never render the backend's JSON.
 */
export async function GET(req: NextRequest) {
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;

  const { res, refreshed } = await callBackendAuthed(
    req,
    "connections/shopify/callback",
    {
      search: req.nextUrl.search,
      headers: stateCookie ? { cookie: `${STATE_COOKIE}=${stateCookie}` } : {},
    },
  );
  if (!res) return NextResponse.redirect(new URL("/login", req.url), 302);

  let target: string;
  if (res.ok) {
    const connection = (await res.json().catch(() => null)) as PlatformConnection | null;
    target = connection?.shop_domain
      ? `/app/connections?connected=${encodeURIComponent(connection.shop_domain)}`
      : "/app/connections?connected";
  } else {
    const code = res.status === 503 ? "unavailable" : "failed";
    target = `/app/connections?error=${code}`;
  }

  const out = NextResponse.redirect(new URL(target, req.url), 302);
  // The state cookie lives on this origin; the backend's own delete-cookie
  // never reaches the browser, so clear it here either way.
  out.cookies.set({ name: STATE_COOKIE, value: "", path: "/", maxAge: 0 });
  if (refreshed) setSessionCookies(out, refreshed.session);
  return out;
}
