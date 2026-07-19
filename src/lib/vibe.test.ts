import { describe, expect, it } from "vitest";
import { defaultStyleForMode } from "./vibe";
import { VIDEO_STYLES } from "./api/types";

describe("defaultStyleForMode", () => {
  it("derives a clean/neutral style per mode", () => {
    expect(defaultStyleForMode("ai_avatar")).toBe("avatar_talking_intro");
    expect(defaultStyleForMode("product_only")).toBe("product_clean_showcase");
  });

  it("always returns a style that is valid for that mode", () => {
    for (const mode of ["ai_avatar", "product_only"] as const) {
      const derived = defaultStyleForMode(mode);
      expect(VIDEO_STYLES[mode].some((s) => s.value === derived)).toBe(true);
    }
  });
});
