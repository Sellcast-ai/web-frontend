import { describe, expect, it } from "vitest";
import {
  affordability,
  isQuotable,
  priceUnknownReason,
  verifiedCredits,
} from "./render-quote";
import { ApiError } from "./api/client";
import { VIDEO_MODELS, type VideoQuote } from "./api/types";

describe("affordability", () => {
  it("flags a shortfall - the quote is a ceiling, so it warns and never blocks", () => {
    expect(affordability(225, 30)).toBe("short");
  });

  it("clears one the balance exactly covers", () => {
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

// Both priced surfaces ask this one question, so a 5xx that is still being
// re-polled and a 4xx nobody will retry can never be told to the user as the
// same sentence.
// The one check both priced surfaces run before printing a number: Studio
// against the id its picker key resolves to, the approve bar against a job's
// `provider_model`. A landed quote that fails it is the backend's settled
// answer, which is why `withheld` travels with the credits.
describe("verifiedCredits", () => {
  const quote = { model_id: "seedance-1-pro", credits: 225 } as VideoQuote;

  it("shows a quote the backend priced on the model we asked for", () => {
    expect(verifiedCredits(quote, "seedance-1-pro")).toEqual({
      credits: 225,
      withheld: false,
    });
  });

  it("withholds one priced on some other model, and says it was withheld", () => {
    expect(verifiedCredits(quote, "kling-2-1")).toEqual({
      credits: undefined,
      withheld: true,
    });
  });

  // Nothing read to compare against is never "verified false" - Studio runs on
  // its static pickers when the capability read fails and must not lose the
  // price on top of a capability outage.
  it("shows the quote when there is no expected id to check", () => {
    expect(verifiedCredits(quote, null)).toEqual({ credits: 225, withheld: false });
  });

  // No quote yet is pending, not withheld: nothing has been dropped.
  it("doesn't call an absent quote withheld", () => {
    expect(verifiedCredits(undefined, "seedance-1-pro")).toEqual({
      credits: undefined,
      withheld: false,
    });
  });
});

describe("priceUnknownReason", () => {
  const ok = { isError: false, error: null };
  const settled = { isError: true, error: new ApiError(404, "Not Found") };
  const transient = { isError: true, error: new ApiError(503, "Unavailable") };

  it("is pending while nothing has failed and the tuple is priceable", () => {
    expect(priceUnknownReason([ok, ok])).toBe("pending");
  });

  it("retries on a 5xx, a dead socket or an unparseable body", () => {
    expect(priceUnknownReason([ok, transient])).toBe("retrying");
    expect(priceUnknownReason([{ isError: true, error: new TypeError("fetch failed") }])).toBe(
      "retrying",
    );
  });

  it("settles as soon as any failure is the backend's own answer", () => {
    expect(priceUnknownReason([settled])).toBe("settled");
    // One read still recovering doesn't make the pair recoverable: the settled
    // one will answer the same way forever, so no price is coming either way.
    expect(priceUnknownReason([transient, settled])).toBe("settled");
  });

  // No failure at all and still no price - an incomplete tuple, or a quote
  // priced on something other than this render. Waiting won't fix either.
  it("settles an unpriceable read that never failed", () => {
    expect(priceUnknownReason([ok], true)).toBe("settled");
  });

  // A failure outranks it: it says which of the two answers to give, and a
  // read that failed hasn't reported anything to be unpriceable about.
  it("still retries a transient failure alongside an unpriceable flag", () => {
    expect(priceUnknownReason([transient], true)).toBe("retrying");
  });
});
