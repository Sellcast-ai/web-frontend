import { NextRequest } from "next/server";
import { proxy } from "@/lib/api/server";

export const dynamic = "force-dynamic";
// /products/parse proxies a synchronous Apify scrape (30-120s on Amazon/
// Shopee). Hosts clamp this to the plan's ceiling — without it, the default
// (~10-15s) kills long parses mid-flight.
export const maxDuration = 180;

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(req, path.join("/"));
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
