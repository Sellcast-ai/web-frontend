import { describe, it, expect } from "vitest";
import { aspectFrameClass } from "./aspect-frame";
import { VIDEO_ASPECT_RATIOS } from "./api/types";

describe("aspectFrameClass", () => {
  it("maps every ratio the Studio picker offers to its own frame", () => {
    const classes = VIDEO_ASPECT_RATIOS.map((r) => aspectFrameClass(r.value));
    expect(new Set(classes).size).toBe(VIDEO_ASPECT_RATIOS.length);
  });

  it("falls back to the backend's 9:16 default for unknown or missing text", () => {
    expect(aspectFrameClass("21:9")).toBe(aspectFrameClass("9:16"));
    expect(aspectFrameClass(undefined)).toBe(aspectFrameClass("9:16"));
  });
});
