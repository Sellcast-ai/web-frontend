import { describe, expect, it } from "vitest";
import { affordability, isQuotable } from "./render-quote";
import { VIDEO_MODELS } from "./api/types";

describe("affordability", () => {
  it("blocks a render that costs more than the balance", () => {
    expect(affordability(225, 30)).toBe("short");
  });

  it("allows one the balance exactly covers", () => {
    expect(affordability(225, 225)).toBe("affordable");
    expect(affordability(70, 300)).toBe("affordable");
  });

  // A slow or failed quote must leave the button alone: there is no number to
  // compare, and guessing either way is either a wrong price or a wrong gate.
  it("is unknown with no quote, and stays unknown with no balance", () => {
    expect(affordability(undefined, 300)).toBe("unknown");
    expect(affordability(225, undefined)).toBe("unknown");
    expect(affordability(undefined, undefined)).toBe("unknown");
  });

  // Zero is refused by the balance-only check Studio keeps alongside this one,
  // not here: a free render is genuinely affordable at any balance.
  it("treats a zero-credit quote as affordable", () => {
    expect(affordability(0, 0)).toBe("affordable");
  });
});

// A field the backend left off a job row would be serialised as the literal
// "undefined" and 422 - the price would then vanish at the click that spends,
// with nothing on screen saying why.
describe("isQuotable", () => {
  const complete = {
    mode: "product_only",
    duration_seconds: 20,
    resolution: "720p",
    aspect_ratio: "9:16",
  };

  it("accepts a complete tuple, with or without an explicit model", () => {
    expect(isQuotable(complete)).toBe(true);
    expect(isQuotable({ ...complete, video_model: VIDEO_MODELS[0].value })).toBe(true);
  });

  it("rejects nothing to price", () => {
    expect(isQuotable(null)).toBe(false);
  });

  it("rejects a tuple missing any priced field", () => {
    for (const field of ["mode", "resolution", "aspect_ratio"] as const) {
      expect(
        isQuotable({ ...complete, [field]: undefined as unknown as string }),
        field,
      ).toBe(false);
      expect(isQuotable({ ...complete, [field]: "" }), field).toBe(false);
    }
    expect(
      isQuotable({ ...complete, duration_seconds: undefined as unknown as number }),
    ).toBe(false);
    expect(isQuotable({ ...complete, duration_seconds: NaN })).toBe(false);
  });

  // Zero-second renders aren't a thing, but the backend owns that refusal:
  // this predicate only asks whether a number was sent at all.
  it("passes a zero duration through to the backend", () => {
    expect(isQuotable({ ...complete, duration_seconds: 0 })).toBe(true);
  });
});
