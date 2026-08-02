import { ApiError } from "./api/client";

/** The structured code the backend will carry once the credit lane raises a
 * named exception instead of a bare `HTTPException`; `error_type` is derived
 * from the Python class name, like `SMS_NOT_CONFIGURED_ERROR_TYPE` in
 * `phone-auth.ts`. Nothing sends it yet - see `isOutOfCreditsError`. */
export const OUT_OF_CREDITS_ERROR_TYPE = "QuotaExceededError";

/**
 * Did the credit meter itself refuse this render?
 *
 * `POST /video-jobs` answers 429 for exactly one reason - the meter (backend
 * `app/api/v1/routes/video_jobs.py`, the only 429 that route raises) - but it
 * raises a bare `HTTPException`, so FastAPI emits `detail` with no
 * `error_type`. There is no structured code to match on yet, so the signal is
 * "a 429 the backend itself authored": its refusal always carries a body
 * message (4xx prose is displayable, see `errorFrom`), while a 429 that never
 * reached the backend - an ingress or edge rate limit answering with an HTML
 * error page - carries none. When the backend does start sending
 * `OUT_OF_CREDITS_ERROR_TYPE`, match on that alone and drop the prose-presence
 * half; keep the literal in sync with the backend like `phone-auth.ts` does.
 *
 * Never match on the message itself: it is untranslated backend prose.
 */
export function isOutOfCreditsError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.errorType === OUT_OF_CREDITS_ERROR_TYPE) return true;
  return err.status === 429 && !!err.serverMessage;
}
