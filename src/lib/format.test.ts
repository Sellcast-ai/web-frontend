import { describe, expect, it } from "vitest";
import { mediaUrl, money, percent, priceRange, relativeTime } from "./format";

describe("mediaUrl", () => {
  it("passes absolute URLs through and prefixes relative paths", () => {
    expect(mediaUrl("https://cdn.example.com/a.mp4")).toBe("https://cdn.example.com/a.mp4");
    expect(mediaUrl("/media/a.mp4")).toBe("http://127.0.0.1:8000/media/a.mp4");
    expect(mediaUrl("media/a.mp4")).toBe("http://127.0.0.1:8000/media/a.mp4");
    expect(mediaUrl(null)).toBeUndefined();
  });
});

describe("money / priceRange", () => {
  it("uses cents below 100 and whole units above", () => {
    expect(money(9.99)).toBe("$9.99");
    expect(money(1299)).toBe("$1,299");
  });

  it("collapses degenerate ranges and joins real ones", () => {
    expect(priceRange(null, null)).toBe("\u2014");
    expect(priceRange(10, null)).toBe("$10.00");
    expect(priceRange(10, 10)).toBe("$10.00");
    expect(priceRange(10, 20)).toBe("$10.00\u2013$20.00");
  });
});

describe("percent", () => {
  it("signs positive fractions only", () => {
    expect(percent(0.325)).toBe("+33%");
    expect(percent(-0.1)).toBe("-10%");
    expect(percent(null)).toBe("\u2014");
  });
});

describe("relativeTime", () => {
  it("buckets by minutes, hours, and days", () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 10_000).toISOString())).toBe("just now");
    expect(relativeTime(new Date(now - 5 * 60_000).toISOString())).toBe("5m ago");
    expect(relativeTime(new Date(now - 3 * 3_600_000).toISOString())).toBe("3h ago");
    expect(relativeTime(new Date(now - 2 * 86_400_000).toISOString())).toBe("2d ago");
    expect(relativeTime(null)).toBe("");
  });
});
