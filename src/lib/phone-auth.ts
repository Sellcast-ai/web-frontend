import type { PhoneDeliveryChannel } from "./api/types";

/**
 * Backend `app/services/sms.py` reports this provider name when codes are only
 * logged, never sent. Keep it in sync with the backend provider literal.
 */
export const DEV_DELIVERY_CHANNEL = "development";

export function isDevDeliveryChannel(channel: PhoneDeliveryChannel) {
  return channel === DEV_DELIVERY_CHANNEL;
}
