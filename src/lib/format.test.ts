import { describe, expect, it } from "vitest";
import {
  mediaUrl,
  money,
  percent,
  priceRange,
  relativeTime,
  type RelativeTimeKey,
} from "./format";

/** Test double for the scoped `app.format` translator the components pass in. */
const enT = (key: RelativeTimeKey, values?: { n: number }): string => {
  if (key === "justNow") return "just now";
  const unit = { minutesAgo: "m", hoursAgo: "h", daysAgo: "d" }[key];
  return `${values?.n}${unit} ago`;
};

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
    expect(money(9.99, "en")).toBe("$9.99");
    expect(money(1299, "en")).toBe("$1,299");
  });

  it("formats through the caller's locale, not a hardcoded one", () => {
    expect(money(9.99, "de")).toBe(
      new Intl.NumberFormat("de", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(9.99),
    );
    expect(money(9.99, "de")).not.toBe(money(9.99, "en"));
  });

  it("collapses degenerate ranges and joins real ones", () => {
    expect(priceRange(null, null, "en")).toBe("—");
    expect(priceRange(10, null, "en")).toBe("$10.00");
    expect(priceRange(10, 10, "en")).toBe("$10.00");
    expect(priceRange(10, 20, "en")).toBe("$10.00–$20.00");
  });
});

describe("percent", () => {
  it("signs positive fractions only", () => {
    expect(percent(0.325)).toBe("+33%");
    expect(percent(-0.1)).toBe("-10%");
    expect(percent(null)).toBe("—");
  });
});

describe("relativeTime", () => {
  it("buckets by minutes, hours, and days through the caller's translator", () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 10_000).toISOString(), enT, "en")).toBe("just now");
    expect(relativeTime(new Date(now - 5 * 60_000).toISOString(), enT, "en")).toBe("5m ago");
    expect(relativeTime(new Date(now - 3 * 3_600_000).toISOString(), enT, "en")).toBe("3h ago");
    expect(relativeTime(new Date(now - 2 * 86_400_000).toISOString(), enT, "en")).toBe("2d ago");
    expect(relativeTime(null, enT, "en")).toBe("");
  });

  it("resolves every bucket through the translator, never a hardcoded string", () => {
    const seen: [RelativeTimeKey, number | undefined][] = [];
    const spyT = (key: RelativeTimeKey, values?: { n: number }): string => {
      seen.push([key, values?.n]);
      return key;
    };
    const now = Date.now();
    relativeTime(new Date(now - 10_000).toISOString(), spyT, "en");
    relativeTime(new Date(now - 5 * 60_000).toISOString(), spyT, "en");
    relativeTime(new Date(now - 3 * 3_600_000).toISOString(), spyT, "en");
    relativeTime(new Date(now - 2 * 86_400_000).toISOString(), spyT, "en");
    expect(seen).toEqual([
      ["justNow", undefined],
      ["minutesAgo", 5],
      ["hoursAgo", 3],
      ["daysAgo", 2],
    ]);
  });

  it("dates older than 30 days fall back to a locale-aware date", () => {
    const iso = new Date(Date.now() - 40 * 86_400_000).toISOString();
    expect(relativeTime(iso, enT, "th")).toBe(new Date(iso).toLocaleDateString("th"));
  });
});
