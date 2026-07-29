import { ApiError } from "./api/client";
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
 * Backend `app/services/sms.py` raises `SmsNotConfiguredError` when SMS is not
 * configured in production; the API surfaces it as this structured
 * `error_type` (HTTP 503) so the frontend can key on it instead of message
 * prose. Keep it in sync with the backend exception name.
 */
export const SMS_NOT_CONFIGURED_ERROR_TYPE = "SmsNotConfiguredError";

export function isSmsNotConfiguredError(err: unknown) {
  return (
    err instanceof ApiError && err.errorType === SMS_NOT_CONFIGURED_ERROR_TYPE
  );
}
