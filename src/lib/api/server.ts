import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { SHOPIFY_CONNECTED_COOKIE, SHOPIFY_STATE_COOKIE } from "../shopify-shop";
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

/**
 * The backend's Shopify OAuth state, re-issued on *this* origin with our own
 * attributes. Shopify returns the merchant to our callback, so the cookie has
 * to be readable there - the backend's own attributes are scoped to its origin.
 */
export function setShopifyStateCookie(res: NextResponse, value: string) {
  res.cookies.set({
    name: SHOPIFY_STATE_COOKIE,
    value,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  });
}

export function clearShopifyStateCookie(res: NextResponse) {
  res.cookies.set({ name: SHOPIFY_STATE_COOKIE, value: "", path: "/", maxAge: 0 });
}

export function setShopifyConnectedCookie(res: NextResponse, shopDomain: string) {
  res.cookies.set({
    name: SHOPIFY_CONNECTED_COOKIE,
    value: shopDomain,
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/app/connections",
    maxAge: 60,
  });
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
 * Refresh coalescing (single-flight) + short-lived rotation lineage.
 *
 * The backend rotates the refresh token on every refresh, so a burst of
 * parallel requests that all 401 at the access-token boundary must not each
 * refresh on its own: the first rotation invalidates the token every sibling
 * is about to present, and a sibling whose refresh then 401s must never clear
 * the session cookies - its response can land after the winner's
 * `setSessionCookies` and wipe the fresh session (a silent mid-session
 * logout, reproduced in the pre-launch audit: 10 parallel BFF fetches with an
 * expired access token -> one refresh 200, nine 401s, session destroyed).
 *
 * `inFlightRefreshes` makes concurrent refreshes of the same token share one
 * backend call. `rotationLineage` remembers, for `REFRESH_ROTATION_TTL_MS`,
 * which session succeeded a rotated-away token (ancestors of the current
 * token included), so a request that read its cookies before the winner's
 * Set-Cookie landed reuses the winning session instead of refreshing - and
 * therefore never reaches the 401-and-clear path at all. A refresh failure is
 * then authoritative for the presented token: this instance rotated nothing
 * in its lineage, so clearing its cookies is safe. A rotation that happened
 * on ANOTHER instance stays invisible here; the backend's previous-token
 * grace window is what closes that race on serverless, and this logic is
 * unchanged (simply never triggered) once it lands.
 */
const REFRESH_ROTATION_TTL_MS = 60_000;
const REFRESH_ROTATION_MAX_ENTRIES = 200;

type RotationRecord = { auth: AuthSuccess; expiresAt: number };

const inFlightRefreshes = new Map<string, Promise<AuthSuccess | null>>();
const rotationLineage = new Map<string, RotationRecord>();

function recordRotation(rotatedToken: string, auth: AuthSuccess) {
  const now = Date.now();
  const record: RotationRecord = { auth, expiresAt: now + REFRESH_ROTATION_TTL_MS };
  for (const [token, existing] of rotationLineage) {
    if (existing.expiresAt <= now) {
      rotationLineage.delete(token);
    } else if (existing.auth.session.refresh_token === rotatedToken) {
      // The rotated token was itself a successor: point every known ancestor
      // at the new session, so a request holding a token two generations
      // stale still finds it.
      rotationLineage.set(token, record);
    }
  }
  if (rotationLineage.size >= REFRESH_ROTATION_MAX_ENTRIES) {
    const oldest = rotationLineage.keys().next().value;
    if (oldest !== undefined) rotationLineage.delete(oldest);
  }
  rotationLineage.set(rotatedToken, record);
}

function sessionForRotatedToken(refreshToken: string): AuthSuccess | null {
  const record = rotationLineage.get(refreshToken);
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    rotationLineage.delete(refreshToken);
    return null;
  }
  return record.auth;
}

/**
 * Refresh through the single-flight map: concurrent callers with the same
 * refresh token share one backend refresh, and a token this instance already
 * rotated away (within the TTL) resolves to its successor session without a
 * backend call at all.
 */
async function refreshSession(refreshToken: string): Promise<AuthSuccess | null> {
  const rotated = sessionForRotatedToken(refreshToken);
  if (rotated) return rotated;
  let inFlight = inFlightRefreshes.get(refreshToken);
  if (!inFlight) {
    inFlight = tryRefresh(refreshToken).then((auth) => {
      if (auth) recordRotation(refreshToken, auth);
      return auth;
    });
    inFlightRefreshes.set(refreshToken, inFlight);
    const cleanup = () => {
      inFlightRefreshes.delete(refreshToken);
    };
    inFlight.then(cleanup, cleanup);
  }
  return inFlight;
}

/**
 * Authenticated backend call for the OAuth-style BFF routes (Shopify connect),
 * where the *browser* navigates and the route must inspect redirects itself
 * rather than stream a proxied body. Same refresh-on-401 semantics as `proxy`;
 * `res` is null when there is no usable session - no cookies at all, or a 401
 * no refresh could rescue. `refreshed` still carries a session in that second
 * case, and callers must write it: the refresh already rotated (and so
 * invalidated) the old token. Callers clear the session cookies only when
 * there is no `refreshed`, or stale cookies keep the app shell from
 * redirecting to /login.
 *
 * A backend that cannot be reached at all (DNS, refused connection, TLS, cold
 * start) makes `fetch` throw rather than answer. That is not an auth outcome,
 * so it is caught here and reported as `unreachable` with a null `res`: these
 * routes are top-level browser navigations, and neither a Next 500 page nor a
 * bogus logout is an honest answer to "the backend is down".
 */
export async function callBackendAuthed(
  req: NextRequest,
  path: string,
  init: CallInit = {},
): Promise<{ res: Response | null; refreshed: AuthSuccess | null; unreachable: boolean }> {
  const access = req.cookies.get(COOKIE.access)?.value;
  const refresh = req.cookies.get(COOKIE.refresh)?.value;
  if (!access && !refresh) return { res: null, refreshed: null, unreachable: false };

  const doCall = (token?: string | null) =>
    callBackend(path, { ...init, accessToken: token });

  let res: Response;
  let refreshed: AuthSuccess | null = null;
  try {
    res = await doCall(access);
    if (res.status === 401 && refresh) {
      refreshed = await refreshSession(refresh);
      if (refreshed) res = await doCall(refreshed.session.access_token);
    }
  } catch {
    return { res: null, refreshed, unreachable: true };
  }
  if (res.status === 401) return { res: null, refreshed, unreachable: false };
  return { res, refreshed, unreachable: false };
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
    refreshed = await refreshSession(refresh);
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

  if (refreshed && backendRes.status !== 401) setSessionCookies(out, refreshed.session);
  // Safe to clear: refreshSession only reports failure for a token whose
  // lineage this instance never rotated, so no sibling's fresh Set-Cookie can
  // be in flight for it (see the rotation-lineage note above).
  else if (!refreshed && backendRes.status === 401) clearSessionCookies(out);

  return out;
}
