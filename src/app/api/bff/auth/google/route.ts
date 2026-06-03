import { NextRequest, NextResponse } from "next/server";
import { callBackend, setSessionCookies } from "@/lib/api/server";
import type { AuthSuccess } from "@/lib/api/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = await callBackend("auth/google", {
    method: "POST",
    body: { platform: "web", ...body },
  });
  const text = await res.text();

  if (res.ok) {
    const data = JSON.parse(text) as AuthSuccess;
    const out = NextResponse.json({ user: data.user });
    setSessionCookies(out, data.session);
    return out;
  }
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
