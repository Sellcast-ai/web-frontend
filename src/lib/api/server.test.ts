import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COOKIE } from "./config";
import { proxy } from "./server";
import type { AuthSuccess } from "./types";

const session: AuthSuccess["session"] = {
  access_token: "new-at",
  refresh_token: "new-rt",
  token_type: "bearer",
  access_token_expires_at: "2026-01-01T00:00:00Z",
  refresh_token_expires_at: "2026-02-01T00:00:00Z",
  session_id: "s1",
};

function req(
  url: string,
  init: { method?: string; body?: string; cookies?: Record<string, string> } = {},
) {
  const headers = new Headers();
  if (init.cookies) {
    headers.set(
      "cookie",
      Object.entries(init.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; "),
    );
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: init.method ?? "GET",
    body: init.body,
    headers,
  });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("proxy", () => {
  it("rejects requests without session cookies before touching the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(req("/api/bff/products"), "products");
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "unauthenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards method, search, body, and bearer token to the backend", async () => {
    const fetchMock = vi.fn(async () => json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(
      req("/api/bff/video-jobs?limit=5", {
        method: "POST",
        body: JSON.stringify({ product_id: "p1" }),
        cookies: { [COOKIE.access]: "at1" },
      }),
      "video-jobs",
    );

    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:8000/api/v1/video-jobs?limit=5");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer at1" });
    expect(init.body).toBe(JSON.stringify({ product_id: "p1" }));
  });

  it("refreshes on 401, retries with the new token, and re-issues cookies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { detail: "expired" }))
      .mockResolvedValueOnce(json(200, { user: {}, session }))
      .mockResolvedValueOnce(json(200, [{ id: "p1" }]));
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(
      req("/api/bff/products", {
        cookies: { [COOKIE.access]: "stale-at", [COOKIE.refresh]: "rt1" },
      }),
      "products",
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(refreshUrl).toBe("http://127.0.0.1:8000/api/v1/auth/refresh");
    expect(refreshInit.body).toBe(JSON.stringify({ refresh_token: "rt1" }));
    const [, retryInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(retryInit.headers).toMatchObject({ Authorization: "Bearer new-at" });

    expect(res.status).toBe(200);
    expect(res.cookies.get(COOKIE.access)?.value).toBe("new-at");
    expect(res.cookies.get(COOKIE.refresh)?.value).toBe("new-rt");
  });

  it("clears both cookies when refresh fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { detail: "expired" }))
      .mockResolvedValueOnce(json(401, { detail: "refresh expired" }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(
      req("/api/bff/products", {
        cookies: { [COOKIE.access]: "stale-at", [COOKIE.refresh]: "dead-rt" },
      }),
      "products",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(401);
    for (const name of [COOKIE.access, COOKIE.refresh]) {
      const cookie = res.cookies.get(name);
      expect(cookie?.value).toBe("");
      expect(cookie?.maxAge).toBe(0);
    }
  });

  it("passes null-body statuses through without a body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );

    const res = await proxy(
      req("/api/bff/avatars/a1", {
        method: "DELETE",
        cookies: { [COOKIE.access]: "at1" },
      }),
      "avatars/a1",
    );

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });
});
