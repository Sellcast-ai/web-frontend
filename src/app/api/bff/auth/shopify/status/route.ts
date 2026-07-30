import { NextRequest, NextResponse } from "next/server";
import { callBackendAuthed, clearSessionCookies, setSessionCookies } from "@/lib/api/server";
import type { ShopifyAvailability } from "@/lib/api/types";

export const dynamic = "force-dynamic";

/** Passes the backend's domain validation; never a real shop. The probe only
 * inspects the response line - the redirect (and its state cookie) is
 * discarded server-side, so nothing is persisted and no browser cookie is
 * set. */
const PROBE_SHOP = "lumi-connect-probe.myshopify.com";

/**
 * Availability probe behind the Shopify connect button: the card may only
 * offer connect when this says the round trip can actually start. It calls
 * the backend's start route and looks for a redirect to an authorize URL,
 * which means the route is deployed AND OAuth is configured there. Anything
 * else (404 not deployed, 503 not configured, or an error) reads as
 * unavailable.
 */
export async function GET(req: NextRequest) {
  const { res, refreshed } = await callBackendAuthed(
    req,
    "connections/shopify/start",
    { search: `?shop=${PROBE_SHOP}`, redirect: "manual" },
  );
  if (!res) {
    const out = NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    clearSessionCookies(out);
    return out;
  }

  const body: ShopifyAvailability = {
    available: res.status >= 300 && res.status < 400 && !!res.headers.get("location"),
  };
  const out = NextResponse.json(body, { status: 200 });
  if (refreshed) setSessionCookies(out, refreshed.session);
  return out;
}
