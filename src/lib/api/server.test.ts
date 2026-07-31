import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COOKIE } from "./config";
import { callBackendAuthed, proxy } from "./server";
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

// NOTE: the rotation-lineage cache in server.ts is module-level and outlives
// individual tests, so every test below must use its own refresh token -
// reusing one lets an earlier test's rotation answer a later test's refresh.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callBackendAuthed", () => {
  it("reports a transport failure as unreachable instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const out = await callBackendAuthed(
      req("/api/bff/auth/shopify/start", { cookies: { [COOKIE.access]: "at1" } }),
      "connections/shopify/start",
    );

    expect(out).toEqual({ res: null, refreshed: null, unreachable: true });
  });

  it("keeps a successful refresh when the retry still 401s", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json(401, { detail: "expired" }))
        .mockResolvedValueOnce(json(200, { user: {}, session }))
        .mockResolvedValueOnce(json(401, { detail: "still expired" })),
    );

    const out = await callBackendAuthed(
      req("/api/bff/auth/shopify/start", {
        cookies: { [COOKIE.access]: "stale-at", [COOKIE.refresh]: "rt-authed" },
      }),
      "connections/shopify/start",
    );

    expect(out.res).toBeNull();
    expect(out.unreachable).toBe(false);
    expect(out.refreshed?.session.access_token).toBe("new-at");
  });

  it("does not expose a cached refreshed session when the retry proves revoked", async () => {
    let revoked = false;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/auth/refresh")) {
        return Promise.resolve(json(200, { user: {}, session }));
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return Promise.resolve(
        auth === "Bearer new-at" && !revoked
          ? json(200, { shop: "test.myshopify.com" })
          : json(401, { detail: "expired" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const cookies = {
      [COOKIE.access]: "stale-at",
      [COOKIE.refresh]: "rt-authed-revoked-lineage",
    };
    const first = await callBackendAuthed(
      req("/api/bff/auth/shopify/start", { cookies }),
      "connections/shopify/start",
    );
    expect(first.res?.status).toBe(200);
    expect(first.refreshed?.session.access_token).toBe("new-at");

    revoked = true;
    const second = await callBackendAuthed(
      req("/api/bff/auth/shopify/start", { cookies }),
      "connections/shopify/start",
    );
    expect(second.res).toBeNull();
    expect(second.refreshed).toBeNull();
    expect(second.unreachable).toBe(false);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("does not expose a cached refreshed session when the retry is unreachable", async () => {
    let unreachable = false;
    let refreshCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/auth/refresh")) {
        refreshCount += 1;
        return Promise.resolve(
          refreshCount === 1
            ? json(200, { user: {}, session })
            : json(401, { detail: "refresh expired" }),
        );
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      if (auth === "Bearer new-at" && unreachable) {
        return Promise.reject(new TypeError("fetch failed"));
      }
      return Promise.resolve(
        auth === "Bearer new-at"
          ? json(200, { shop: "test.myshopify.com" })
          : json(401, { detail: "expired" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const cookies = {
      [COOKIE.access]: "stale-at",
      [COOKIE.refresh]: "rt-authed-unreachable-lineage",
    };
    const first = await callBackendAuthed(
      req("/api/bff/auth/shopify/start", { cookies }),
      "connections/shopify/start",
    );
    expect(first.res?.status).toBe(200);
    expect(first.refreshed?.session.access_token).toBe("new-at");

    unreachable = true;
    const second = await callBackendAuthed(
      req("/api/bff/auth/shopify/start", { cookies }),
      "connections/shopify/start",
    );
    expect(second.res).toBeNull();
    expect(second.refreshed).toBeNull();
    expect(second.unreachable).toBe(true);

    const third = await callBackendAuthed(
      req("/api/bff/auth/shopify/start", { cookies }),
      "connections/shopify/start",
    );
    expect(third.res).toBeNull();
    expect(third.refreshed).toBeNull();
    expect(third.unreachable).toBe(false);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(2);
  });
});

describe("proxy", () => {
  it("rejects requests without session cookies before touching the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(req("/api/bff/products"), "products");
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error_type: "Unauthenticated" });
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

  it("coalesces a burst of parallel 401s into one refresh and never clears cookies", async () => {
    const refreshBodies: unknown[] = [];
    let releaseRefresh!: (res: Response) => void;
    const gate = new Promise<Response>((resolve) => {
      releaseRefresh = resolve;
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/auth/refresh")) {
        refreshBodies.push(init?.body);
        return gate;
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return Promise.resolve(
        auth === "Bearer new-at" ? json(200, { ok: true }) : json(401, { detail: "expired" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const cookies = { [COOKIE.access]: "stale-at", [COOKIE.refresh]: "rt-burst" };
    const burst = Array.from({ length: 10 }, () =>
      proxy(req("/api/bff/products", { cookies }), "products"),
    );
    // Hold the refresh until every request in the burst is waiting on it.
    await new Promise((resolve) => setImmediate(resolve));
    releaseRefresh(json(200, { user: {}, session }));
    const responses = await Promise.all(burst);

    expect(refreshBodies).toEqual([JSON.stringify({ refresh_token: "rt-burst" })]);
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.cookies.get(COOKIE.access)?.value).toBe("new-at");
      expect(res.cookies.get(COOKIE.refresh)?.value).toBe("new-rt");
    }
  });

  it("reuses the winning session for a request holding the just-rotated token", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/auth/refresh")) {
        return Promise.resolve(json(200, { user: {}, session }));
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return Promise.resolve(
        auth === "Bearer new-at" ? json(200, { ok: true }) : json(401, { detail: "expired" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const cookies = { [COOKIE.access]: "stale-at", [COOKIE.refresh]: "rt-lineage" };
    const first = await proxy(req("/api/bff/products", { cookies }), "products");
    expect(first.status).toBe(200);

    // A request that read its cookies before the winner's Set-Cookie landed
    // still presents the rotated-away token: it must ride the lineage to the
    // same session, not refresh (and so never reach the 401-and-clear path).
    const second = await proxy(req("/api/bff/products", { cookies }), "products");
    expect(second.status).toBe(200);
    expect(second.cookies.get(COOKIE.access)?.value).toBe("new-at");
    expect(second.cookies.get(COOKIE.refresh)?.value).toBe("new-rt");

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("does not resurrect cookies when a cached refreshed session is revoked", async () => {
    let revoked = false;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/auth/refresh")) {
        return Promise.resolve(json(200, { user: {}, session }));
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return Promise.resolve(
        auth === "Bearer new-at" && !revoked
          ? json(200, { ok: true })
          : json(401, { detail: "expired" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const cookies = { [COOKIE.access]: "stale-at", [COOKIE.refresh]: "rt-revoked-lineage" };
    const first = await proxy(req("/api/bff/products", { cookies }), "products");
    expect(first.status).toBe(200);
    expect(first.cookies.get(COOKIE.access)?.value).toBe("new-at");

    revoked = true;
    const second = await proxy(req("/api/bff/products", { cookies }), "products");
    expect(second.status).toBe(401);
    expect(second.cookies.get(COOKIE.access)).toBeUndefined();
    expect(second.cookies.get(COOKIE.refresh)).toBeUndefined();

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("points older token generations at the latest session", async () => {
    const session2 = {
      ...session,
      access_token: "at-2",
      refresh_token: "rt-gen3",
    };
    let validAccess: string | null = null;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/auth/refresh")) {
        const body = JSON.parse(String(init?.body)) as { refresh_token: string };
        const next =
          body.refresh_token === "rt-gen1"
            ? { ...session, access_token: "at-1", refresh_token: "rt-gen2" }
            : session2;
        validAccess = next.access_token;
        return Promise.resolve(json(200, { user: {}, session: next }));
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return Promise.resolve(
        auth === `Bearer ${validAccess}` && validAccess !== null
          ? json(200, { ok: true })
          : json(401, { detail: "expired" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    // Generation 1 -> 2.
    const first = await proxy(
      req("/api/bff/products", {
        cookies: { [COOKIE.access]: "stale-at", [COOKIE.refresh]: "rt-gen1" },
      }),
      "products",
    );
    expect(first.status).toBe(200);
    expect(first.cookies.get(COOKIE.refresh)?.value).toBe("rt-gen2");

    // Generation 2 -> 3 (at-1 expires first so this request must refresh).
    validAccess = null;
    const second = await proxy(
      req("/api/bff/products", {
        cookies: { [COOKIE.access]: "at-1", [COOKIE.refresh]: "rt-gen2" },
      }),
      "products",
    );
    expect(second.status).toBe(200);
    expect(second.cookies.get(COOKIE.refresh)?.value).toBe("rt-gen3");

    // A request two generations stale (still holding rt-gen1) resolves to the
    // latest session through the lineage, with no third backend refresh.
    const third = await proxy(
      req("/api/bff/products", {
        cookies: { [COOKIE.access]: "stale-at", [COOKIE.refresh]: "rt-gen1" },
      }),
      "products",
    );
    expect(third.status).toBe(200);
    expect(third.cookies.get(COOKIE.access)?.value).toBe("at-2");
    expect(third.cookies.get(COOKIE.refresh)?.value).toBe("rt-gen3");

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(2);
  });
});
