import { describe, expect, it } from "vitest";
import { defaultLanguageFor } from "./language";

describe("defaultLanguageFor", () => {
  it("falls back to English for missing or unparseable sources", () => {
    expect(defaultLanguageFor(null)).toBe("en");
    expect(defaultLanguageFor({ source_url: "not a url" })).toBe("en");
    expect(defaultLanguageFor({ source_url: "https://amazon.com/dp/1" })).toBe("en");
  });

  it("never picks a market language that is not enabled", () => {
    // shopee.co.id maps to "id", but only enabled languages may win.
    expect(defaultLanguageFor({ source_url: "https://shopee.co.id/x" })).toBe("en");
  });
});
