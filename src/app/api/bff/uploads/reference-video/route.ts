import { NextRequest, NextResponse } from "next/server";
import { COOKIE } from "@/lib/api/config";
import {
  callBackend,
  clearSessionCookies,
  setSessionCookies,
  tryRefresh,
} from "@/lib/api/server";
import type { AuthSuccess } from "@/lib/api/types";

export const dynamic = "force-dynamic";
// R2 reference-clip uploads can be ~50MB; keep the slow-request ceiling.
export const maxDuration = 180;

// Dedicated multipart passthrough. The generic BFF proxy JSON-encodes bodies,
// which would drop the multipart boundary and corrupt the binary file — so
// reference-video uploads route here instead and forward the bytes verbatim.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const access = req.cookies.get(COOKIE.access)?.value;
  const refresh = req.cookies.get(COOKIE.refresh)?.value;

  if (!access && !refresh) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  // Buffer the body so it can be replayed on the refresh retry.
  const rawBody = await req.arrayBuffer();

  const doCall = (token?: string | null) =>
    callBackend("uploads/reference-video", {
      method: "POST",
      rawBody,
      headers: { "Content-Type": contentType },
      accessToken: token,
    });

  let backendRes = await doCall(access);
  let refreshed: AuthSuccess | null = null;

  if (backendRes.status === 401 && refresh) {
    refreshed = await tryRefresh(refresh);
    if (refreshed) backendRes = await doCall(refreshed.session.access_token);
  }

  const payload = await backendRes.text();
  const out = new NextResponse(payload, {
    status: backendRes.status,
    headers: {
      "Content-Type": backendRes.headers.get("content-type") ?? "application/json",
    },
  });

  if (refreshed) setSessionCookies(out, refreshed.session);
  else if (backendRes.status === 401) clearSessionCookies(out);

  return out;
}
