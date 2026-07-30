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
 * `error_type` (HTTP 503). It is derived from the backend class name, so
 * renaming the exception there would silently stop matching - which is why
 * `isSmsUnavailableError` treats the 503 status as sufficient on its own.
 */
export const SMS_NOT_CONFIGURED_ERROR_TYPE = "SmsNotConfiguredError";

/**
 * `send-code` telling us phone verification cannot work on this deployment:
 * either the structured `error_type` or any 503 from that call (SMS delivery
 * is the only unavailable dependency behind it). Never keyed on message prose.
 */
export function isSmsUnavailableError(err: unknown) {
  if (!(err instanceof ApiError)) return false;
  return err.status === 503 || err.errorType === SMS_NOT_CONFIGURED_ERROR_TYPE;
}
