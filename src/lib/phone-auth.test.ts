import { describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api/client";
import {
  DEV_DELIVERY_CHANNEL,
  isDevDeliveryChannel,
  isSmsUnavailableError,
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

describe("isSmsUnavailableError", () => {
  it("matches the structured error_type", () => {
    const err = new ApiError(
      503,
      "SMS verification is not available right now. Please sign in another way.",
      SMS_NOT_CONFIGURED_ERROR_TYPE,
    );
    expect(isSmsUnavailableError(err)).toBe(true);
  });

  it("matches a bare 503 with no error_type, so a backend rename can't unlatch it", () => {
    expect(isSmsUnavailableError(new ApiError(503, "Service Unavailable"))).toBe(
      true,
    );
    expect(
      isSmsUnavailableError(new ApiError(503, "nope", "RenamedSmsError")),
    ).toBe(true);
  });

  it("latches on a real send-code 503 whose body is gateway HTML, not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>Service Unavailable</html>", {
            status: 503,
            statusText: "Service Unavailable",
          }),
      ),
    );
    const err = await api.sendPhoneCode("+15550100", "signup").catch((e) => e);
    vi.unstubAllGlobals();
    expect(err).toBeInstanceOf(ApiError);
    expect(isSmsUnavailableError(err)).toBe(true);
  });

  it("still matches the error_type on a non-503 status", () => {
    expect(
      isSmsUnavailableError(
        new ApiError(500, "boom", SMS_NOT_CONFIGURED_ERROR_TYPE),
      ),
    ).toBe(true);
  });

  it("rejects other failures, prose lookalikes and non-errors", () => {
    expect(isSmsUnavailableError(new ApiError(500, "boom", "OtherError"))).toBe(
      false,
    );
    expect(isSmsUnavailableError(new ApiError(429, "Too many requests"))).toBe(
      false,
    );
    expect(
      isSmsUnavailableError(new Error("SMS verification is not available")),
    ).toBe(false);
    expect(isSmsUnavailableError(null)).toBe(false);
  });
});
