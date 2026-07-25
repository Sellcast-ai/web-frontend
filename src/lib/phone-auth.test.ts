import { describe, expect, it } from "vitest";
import {
  DEV_DELIVERY_CHANNEL,
  isDevDeliveryChannel,
  isSmsNotConfigured,
} from "./phone-auth";

describe("isDevDeliveryChannel", () => {
  it("matches the backend provider literal only", () => {
    expect(DEV_DELIVERY_CHANNEL).toBe("development");
    expect(isDevDeliveryChannel("development")).toBe(true);
    expect(isDevDeliveryChannel("twilio")).toBe(false);
    expect(isDevDeliveryChannel("dev")).toBe(false);
  });
});

describe("isSmsNotConfigured", () => {
  it("recognises the send-code rejection the backend returns without SMS", () => {
    expect(isSmsNotConfigured("SMS delivery is not configured")).toBe(true);
    expect(isSmsNotConfigured("SMS provider unavailable")).toBe(true);
    expect(isSmsNotConfigured("sms sending is disabled")).toBe(true);
  });

  it("leaves ordinary send-code failures alone", () => {
    expect(isSmsNotConfigured("Invalid phone number")).toBe(false);
    expect(isSmsNotConfigured("Too many requests")).toBe(false);
    expect(isSmsNotConfigured("Verification code is not valid")).toBe(false);
  });
});
