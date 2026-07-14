import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

function mockFetch(status: number, body: unknown = null) {
  const fn = vi.fn(async () =>
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      statusText: status === 502 ? "Bad Gateway" : "",
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api (BFF client)", () => {
  it("builds product list URLs with defaults and filters", async () => {
    const fetchMock = mockFetch(200, []);
    await api.listProducts();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/products?limit=24&offset=0",
      expect.anything(),
    );

    await api.listProducts({ q: "lamp", category: "home", limit: 5, offset: 10 });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/bff/products?q=lamp&category=home&limit=5&offset=10",
      expect.anything(),
    );
  });

  it("serializes json payloads with a Content-Type header", async () => {
    const fetchMock = mockFetch(200, {});
    await api.parseProductUrl("https://example.com/p/1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/bff/products/parse");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ url: "https://example.com/p/1" }));
  });

  it("returns null for empty response bodies", async () => {
    mockFetch(204);
    await expect(api.deleteAvatar("a1")).resolves.toBeNull();
  });

  it("throws ApiError with the backend detail message", async () => {
    mockFetch(422, { detail: "invalid url" });
    const err = await api.parseProductUrl("nope").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.message).toBe("invalid url");
  });

  it("falls back to statusText, then a generic message, for unusable errors", async () => {
    mockFetch(502);
    await expect(api.getUsage()).rejects.toMatchObject({
      status: 502,
      message: "Bad Gateway",
    });

    mockFetch(400, { detail: [{ loc: ["body"], msg: "boom" }] });
    await expect(api.getUsage()).rejects.toMatchObject({
      status: 400,
      message: "Request failed",
    });
  });

  it("me() maps 401 to null but rethrows other errors", async () => {
    mockFetch(401, { detail: "unauthenticated" });
    await expect(api.me()).resolves.toBeNull();

    mockFetch(500, { detail: "boom" });
    await expect(api.me()).rejects.toMatchObject({ status: 500 });
  });
});
