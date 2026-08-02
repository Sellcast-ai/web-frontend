import { describe, expect, it } from "vitest";
import { ApiError } from "./api/client";
import { OUT_OF_CREDITS_ERROR_TYPE, isOutOfCreditsError } from "./quota-error";

describe("isOutOfCreditsError", () => {
  it("matches the backend's own quota refusal (429 + its detail prose)", () => {
    const refusal = new ApiError(
      429,
      "This 15s 720p video needs 15 credits, but you have 4 of 300 left.",
      undefined,
      "This 15s 720p video needs 15 credits, but you have 4 of 300 left.",
    );
    expect(isOutOfCreditsError(refusal)).toBe(true);
  });

  it("matches the structured error_type whatever the status", () => {
    expect(
      isOutOfCreditsError(new ApiError(402, "boom", OUT_OF_CREDITS_ERROR_TYPE)),
    ).toBe(true);
  });

  it("rejects a 429 the backend never authored (edge rate limit, HTML body)", () => {
    expect(isOutOfCreditsError(new ApiError(429, "Too Many Requests"))).toBe(
      false,
    );
  });

  it("rejects other failures and non-errors", () => {
    expect(
      isOutOfCreditsError(new ApiError(409, "cap reached", undefined, "cap reached")),
    ).toBe(false);
    expect(isOutOfCreditsError(new Error("out of credits"))).toBe(false);
    expect(isOutOfCreditsError(null)).toBe(false);
  });
});
