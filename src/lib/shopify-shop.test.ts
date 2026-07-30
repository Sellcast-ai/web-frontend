import { describe, expect, it } from "vitest";
import {
  SHOPIFY_STATE_COOKIE,
  isShopDomain,
  shopifyAuthorizeUrl,
  shopifyRedirect,
  stateCookieValue,
} from "./shopify-shop";

describe("isShopDomain", () => {
  it("accepts canonical shop domains", () => {
    expect(isShopDomain("my-store.myshopify.com")).toBe(true);
    expect(isShopDomain("Store123.myshopify.com")).toBe(true);
  });

  it("rejects anything that isn't one", () => {
    for (const shop of [
      "",
      "my-store",
      "-store.myshopify.com",
      "evil.com",
      "myshopify.com",
      "https://my-store.myshopify.com",
      "my-store.myshopify.com.evil.com",
      "my-store.myshopify.com/admin",
      "my store.myshopify.com",
    ]) {
      expect(isShopDomain(shop), shop).toBe(false);
    }
  });
});

describe("shopifyRedirect", () => {
  it("passes an https Shopify authorize URL through", () => {
    expect(shopifyRedirect("https://my-store.myshopify.com/admin/oauth/authorize?x=1")).toBe(
      "https://my-store.myshopify.com/admin/oauth/authorize?x=1",
    );
  });

  it("refuses any target that leaves Shopify", () => {
    for (const location of [
      null,
      "",
      "/app/connections",
      "http://my-store.myshopify.com/admin/oauth/authorize",
      "https://evil.com/admin/oauth/authorize",
      "https://myshopify.com.evil.com/",
      "https://evil.com/?next=my-store.myshopify.com",
      "javascript:alert(1)",
    ]) {
      expect(shopifyRedirect(location), String(location)).toBeNull();
    }
  });
});

describe("shopifyAuthorizeUrl", () => {
  const res = (status: number, location?: string) =>
    new Response(null, { status, headers: location ? { location } : {} });

  it("accepts any 3xx that lands on Shopify", () => {
    for (const status of [301, 302, 303, 307, 308]) {
      expect(
        shopifyAuthorizeUrl(res(status, "https://my-store.myshopify.com/admin/oauth/authorize")),
        String(status),
      ).toBe("https://my-store.myshopify.com/admin/oauth/authorize");
    }
  });

  it("refuses a 3xx that goes anywhere else, so the probe can't green-light a bounce", () => {
    expect(shopifyAuthorizeUrl(res(301, "https://api.example.com/connections/shopify/start/"))).toBeNull();
    expect(shopifyAuthorizeUrl(res(302))).toBeNull();
    expect(shopifyAuthorizeUrl(res(200))).toBeNull();
    expect(shopifyAuthorizeUrl(res(503))).toBeNull();
  });
});

describe("stateCookieValue", () => {
  it("takes only the state cookie's value, never the backend's attributes", () => {
    expect(
      stateCookieValue([
        "other=zzz; Path=/",
        `${SHOPIFY_STATE_COOKIE}=abc.def; Domain=api.example.com; Path=/api/v1; HttpOnly; SameSite=Lax`,
      ]),
    ).toBe("abc.def");
  });

  it("is null when the backend sent no usable state", () => {
    expect(stateCookieValue([])).toBeNull();
    expect(stateCookieValue(["session=abc; Path=/"])).toBeNull();
    expect(stateCookieValue([`${SHOPIFY_STATE_COOKIE}=; Path=/; Max-Age=0`])).toBeNull();
  });
});
