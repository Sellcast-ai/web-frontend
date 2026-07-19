import { describe, expect, it } from "vitest";
import { defaultLanguageFor } from "./language";
import { VIDEO_LANGUAGES } from "./api/types";

describe("defaultLanguageFor", () => {
  it("falls back to English for missing or unparseable sources", () => {
    expect(defaultLanguageFor(null)).toBe("en");
    expect(defaultLanguageFor({ source_url: "not a url" })).toBe("en");
    expect(defaultLanguageFor({ source_url: "https://amazon.com/dp/1" })).toBe("en");
  });

  it("maps enabled source markets to their language", () => {
    expect(defaultLanguageFor({ source_url: "https://shopee.co.id/x" })).toBe("id");
    expect(defaultLanguageFor({ source_url: "https://shopee.co.th/x" })).toBe("th");
    expect(defaultLanguageFor({ source_url: "https://amazon.es/dp/1" })).toBe("es");
  });

  it("never returns a language outside the enabled set", () => {
    const enabled = new Set(VIDEO_LANGUAGES.filter((l) => l.enabled).map((l) => l.value));
    expect(defaultLanguageFor({ source_url: "https://shopee.vn/x" })).toBe("en");
    expect(enabled.has(defaultLanguageFor({ source_url: "https://shopee.co.id/x" }))).toBe(true);
  });
});

describe("VIDEO_LANGUAGES", () => {
  it("enables exactly the 8 backend-supported languages and not Vietnamese", () => {
    const values = VIDEO_LANGUAGES.filter((l) => l.enabled).map((l) => l.value);
    expect(values).toEqual(["en", "es", "zh", "ja", "ko", "pt", "id", "th"]);
    // Vietnamese failed voice QA and must not be selectable.
    expect(values).not.toContain("vi");
  });
});
