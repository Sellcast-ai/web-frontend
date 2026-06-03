import { NextRequest, NextResponse } from "next/server";
import { callBackend, clearSessionCookies } from "@/lib/api/server";
import { COOKIE } from "@/lib/api/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get(COOKIE.refresh)?.value;
  if (refresh) {
    await callBackend("auth/logout", {
      method: "POST",
      body: { refresh_token: refresh },
    }).catch(() => undefined);
  }
  const out = NextResponse.json({ ok: true });
  clearSessionCookies(out);
  return out;
}
