import { describe, expect, it } from "vitest";
import { ApiError } from "./api/client";
import {
  DEV_DELIVERY_CHANNEL,
  isDevDeliveryChannel,
  isSmsNotConfiguredError,
  SMS_NOT_CONFIGURED_ERROR_TYPE,
} from "./phone-auth";

describe("isDevDeliveryChannel", () => {
  it("matches the backend provider literal only", () => {
    expect(DEV_DELIVERY_CHANNEL).toBe("development");
    expect(isDevDeliveryChannel("development")).toBe(true);
    expect(isDevDeliveryChannel("twilio")).toBe(false);
    expect(isDevDeliveryChannel("dev")).toBe(false);
  });
});

describe("isSmsNotConfiguredError", () => {
  it("matches an ApiError carrying the structured error_type", () => {
    const err = new ApiError(
      503,
      "SMS verification is not available right now. Please sign in another way.",
      SMS_NOT_CONFIGURED_ERROR_TYPE,
    );
    expect(isSmsNotConfiguredError(err)).toBe(true);
  });

  it("does not match on message prose without the structured type", () => {
    const err = new ApiError(
      503,
      "SMS verification is not available right now. Please sign in another way.",
    );
    expect(isSmsNotConfiguredError(err)).toBe(false);
  });

  it("rejects other errors and non-errors", () => {
    expect(
      isSmsNotConfiguredError(new ApiError(500, "boom", "OtherError")),
    ).toBe(false);
    expect(isSmsNotConfiguredError(new Error("nope"))).toBe(false);
    expect(isSmsNotConfiguredError(null)).toBe(false);
  });
});
