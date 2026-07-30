import { NextRequest, NextResponse } from "next/server";
import { callBackendAuthed, clearSessionCookies, setSessionCookies } from "@/lib/api/server";
import { isShopDomain, shopifyRedirect } from "@/lib/shopify-shop";

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
  const shop = (req.nextUrl.searchParams.get("shop") ?? "").trim();

  const fail = (code: string, refreshed?: Parameters<typeof setSessionCookies>[1]) => {
    const out = NextResponse.redirect(
      new URL(`/app/connections?error=${code}`, req.url),
      302,
    );
    if (refreshed) setSessionCookies(out, refreshed);
    return out;
  };

  if (!isShopDomain(shop)) return fail("invalid-shop");

  const { res, refreshed } = await callBackendAuthed(
    req,
    "connections/shopify/start",
    { search: `?shop=${encodeURIComponent(shop)}`, redirect: "manual" },
  );
  if (!res) {
    const out = NextResponse.redirect(new URL("/login", req.url), 302);
    clearSessionCookies(out);
    return out;
  }

  if (res.status >= 300 && res.status < 400) {
    const location = shopifyRedirect(res.headers.get("location"));
    if (location) {
      const out = NextResponse.redirect(location, 302);
      // Session cookies first: `NextResponse.cookies.set` rewrites the whole
      // set-cookie header list from the bag it parsed at construction, so any
      // raw append made before it would be dropped.
      if (refreshed) setSessionCookies(out, refreshed.session);
      for (const cookie of res.headers.getSetCookie()) {
        out.headers.append("set-cookie", cookie);
      }
      return out;
    }
  }

  const code =
    res.status === 422 ? "invalid-shop" : res.status === 503 ? "unavailable" : "failed";
  return fail(code, refreshed?.session);
}
