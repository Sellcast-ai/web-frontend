import type { PhoneDeliveryChannel } from "./api/types";

/**
 * Backend `app/services/sms.py` reports this provider name when codes are only
 * logged, never sent. Keep it in sync with the backend provider literal.
 */
export const DEV_DELIVERY_CHANNEL = "development";

export function isDevDeliveryChannel(channel: PhoneDeliveryChannel) {
  return channel === DEV_DELIVERY_CHANNEL;
}

/**
 * Once the backend stops returning a development channel it rejects send-code
 * outright, so the unconfigured-SMS message is the other signal that phone
 * sign-in is not a working path.
 */
export function isSmsNotConfigured(message: string) {
  return (
    /\bsms\b/i.test(message) &&
    /not configured|unconfigured|not set up|not available|unavailable|disabled/i.test(
      message,
    )
  );
}
