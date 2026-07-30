import { NextRequest, NextResponse } from "next/server";
import { callBackendAuthed, setSessionCookies } from "@/lib/api/server";
import type { ShopifyAvailability } from "@/lib/api/types";

export const dynamic = "force-dynamic";

/** Passes the backend's domain validation; never a real shop. The probe only
 * inspects the status code - the 302 (and its state cookie) is discarded
 * server-side, so nothing is persisted and no browser cookie is set. */
const PROBE_SHOP = "lumi-connect-probe.myshopify.com";

/**
 * Availability probe behind the Shopify connect button: the card may only
 * offer connect when this says the round trip can actually start. It calls
 * the backend's start route and reads the status:
 *   302 - route deployed AND OAuth configured (an authorize URL was built)
 *   404 - the connections routes aren't on the deployed backend
 *   503 - routes exist but Shopify OAuth isn't configured there
 */
export async function GET(req: NextRequest) {
  const { res, refreshed } = await callBackendAuthed(
    req,
    "connections/shopify/start",
    { search: `?shop=${PROBE_SHOP}`, redirect: "manual" },
  );
  if (!res) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const available = res.status === 302;
  const reason: ShopifyAvailability["reason"] = available
    ? null
    : res.status === 404
      ? "not-deployed"
      : res.status === 503
        ? "not-configured"
        : "error";

  const body: ShopifyAvailability = { available, reason };
  const out = NextResponse.json(body, { status: 200 });
  if (refreshed) setSessionCookies(out, refreshed.session);
  return out;
}
