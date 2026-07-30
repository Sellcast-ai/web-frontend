import { NextRequest, NextResponse } from "next/server";
import { callBackendAuthed, setSessionCookies } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/**
 * Browser entry point for the Shopify connect flow. The backend answers with
 * a 302 to the shop's /admin/oauth/authorize URL plus the HMAC-signed state
 * cookie; both must reach the browser (the cookie on *this* origin, because
 * Shopify sends the merchant back to our callback, not the backend's).
 * Anything that isn't that 302 sends the merchant back to the connections
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

  if (!shop) return fail("invalid-shop");

  const { res, refreshed } = await callBackendAuthed(
    req,
    "connections/shopify/start",
    { search: `?shop=${encodeURIComponent(shop)}`, redirect: "manual" },
  );
  if (!res) return NextResponse.redirect(new URL("/login", req.url), 302);

  if (res.status === 302) {
    const location = res.headers.get("location");
    if (location) {
      const out = NextResponse.redirect(location, 302);
      for (const cookie of res.headers.getSetCookie()) {
        out.headers.append("set-cookie", cookie);
      }
      if (refreshed) setSessionCookies(out, refreshed.session);
      return out;
    }
  }

  const code =
    res.status === 422 ? "invalid-shop" : res.status === 503 ? "unavailable" : "failed";
  return fail(code, refreshed?.session);
}
