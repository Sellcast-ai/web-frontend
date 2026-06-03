import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/api/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = await callBackend("auth/phone/send-code", { method: "POST", body });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
