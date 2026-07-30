import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { API_BASE, COOKIE, COOKIE_MAX_AGE } from "./config";
import type { AuthSuccess } from "./types";

const isProd = process.env.NODE_ENV === "production";

export function setSessionCookies(res: NextResponse, session: AuthSuccess["session"]) {
  res.cookies.set({
    name: COOKIE.access,
    value: session.access_token,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE.access,
  });
  res.cookies.set({
    name: COOKIE.refresh,
    value: session.refresh_token,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE.refresh,
  });
}

export function clearSessionCookies(res: NextResponse) {
  for (const name of [COOKIE.access, COOKIE.refresh]) {
    res.cookies.set({ name, value: "", path: "/", maxAge: 0 });
  }
}

type CallInit = {
  method?: string;
  body?: unknown;
  accessToken?: string | null;
  headers?: Record<string, string>;
  search?: string;
  redirect?: RequestRedirect;
};

/** Low-level fetch to the FastAPI backend. */
export async function callBackend(path: string, init: CallInit = {}): Promise<Response> {
  const url = `${API_BASE}/${path.replace(/^\/+/, "")}${init.search ?? ""}`;
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (init.body !== undefined && init.body !== null) headers["Content-Type"] = "application/json";
  if (init.accessToken) headers["Authorization"] = `Bearer ${init.accessToken}`;
  return fetch(url, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined && init.body !== null ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    redirect: init.redirect ?? "follow",
  });
}

async function tryRefresh(refreshToken: string): Promise<AuthSuccess | null> {
  const res = await callBackend("auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
  if (!res.ok) return null;
  return (await res.json()) as AuthSuccess;
}

/**
 * Authenticated backend call for the OAuth-style BFF routes (Shopify connect),
 * where the *browser* navigates and the route must inspect redirects itself
 * rather than stream a proxied body. Same refresh-on-401 semantics as `proxy`;
 * `res` is null when there is no session at all.
 */
export async function callBackendAuthed(
  req: NextRequest,
  path: string,
  init: CallInit = {},
): Promise<{ res: Response | null; refreshed: AuthSuccess | null }> {
  const access = req.cookies.get(COOKIE.access)?.value;
  const refresh = req.cookies.get(COOKIE.refresh)?.value;
  if (!access && !refresh) return { res: null, refreshed: null };

  const doCall = (token?: string | null) =>
    callBackend(path, { ...init, accessToken: token });

  let res = await doCall(access);
  let refreshed: AuthSuccess | null = null;
  if (res.status === 401 && refresh) {
    refreshed = await tryRefresh(refresh);
    if (refreshed) res = await doCall(refreshed.session.access_token);
  }
  return { res, refreshed };
}

/** Generic authenticated proxy used by the BFF catch-all route. */
export async function proxy(req: NextRequest, path: string): Promise<NextResponse> {
  const access = req.cookies.get(COOKIE.access)?.value;
  const refresh = req.cookies.get(COOKIE.refresh)?.value;

  if (!access && !refresh) {
    // Machine-readable only: a `detail`/`error`/`message` string here would be
    // treated as the server's own human message and rendered untranslated.
    return NextResponse.json({ error_type: "Unauthenticated" }, { status: 401 });
  }

  const method = req.method;
  const search = req.nextUrl.search;
  let body: unknown;
  if (method !== "GET" && method !== "DELETE" && method !== "HEAD") {
    const text = await req.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
  }

  const doCall = (token?: string | null) =>
    callBackend(path, { method, body, accessToken: token, search });

  let backendRes = await doCall(access);
  let refreshed: AuthSuccess | null = null;

  if (backendRes.status === 401 && refresh) {
    refreshed = await tryRefresh(refresh);
    if (refreshed) backendRes = await doCall(refreshed.session.access_token);
  }

  const payload = await backendRes.text();
  // Null-body statuses (204/205/304) reject ANY body — even "" — with a
  // TypeError, which surfaced as a 500 on every DELETE proxied through here.
  const responseBody = [204, 205, 304].includes(backendRes.status) ? null : payload;
  const out = new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      "Content-Type": backendRes.headers.get("content-type") ?? "application/json",
    },
  });

  if (refreshed) setSessionCookies(out, refreshed.session);
  else if (backendRes.status === 401) clearSessionCookies(out);

  return out;
}
