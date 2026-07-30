import { describe, expect, it } from "vitest";
import { isShopDomain, shopifyRedirect } from "./shopify-shop";

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
