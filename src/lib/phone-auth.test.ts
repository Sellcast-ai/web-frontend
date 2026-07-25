import { describe, expect, it } from "vitest";
import { DEV_DELIVERY_CHANNEL, isDevDeliveryChannel } from "./phone-auth";

describe("isDevDeliveryChannel", () => {
  it("matches the backend provider literal only", () => {
    expect(DEV_DELIVERY_CHANNEL).toBe("development");
    expect(isDevDeliveryChannel("development")).toBe(true);
    expect(isDevDeliveryChannel("twilio")).toBe(false);
    expect(isDevDeliveryChannel("dev")).toBe(false);
  });
});
