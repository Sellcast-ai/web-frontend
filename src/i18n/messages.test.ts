import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";

// The proof-surface nav labels (SiteHeader + AppShell) resolve from these keys.
// A missing key makes next-intl throw at render, so guard them explicitly.
describe("en catalog", () => {
  it("has the marketing nav keys used by SiteHeader", () => {
    expect(Object.keys(en.nav).sort()).toEqual([
      "features",
      "howItWorks",
      "models",
      "pricing",
    ]);
  });

  it("has the app nav keys used by AppShell", () => {
    expect(Object.keys(en.app.nav).sort()).toEqual([
      "avatars",
      "marketplace",
      "products",
      "profile",
      "videos",
    ]);
  });
});
