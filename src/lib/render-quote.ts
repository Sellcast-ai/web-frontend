import { isTransientError } from "@/lib/api/client";
import type { VideoQuoteParams } from "@/lib/api/types";

/** Can the user pay for the render they have configured?
 *
 * Decided on two backend-metered numbers only - `VideoQuote.credits` from
 * `GET /video-jobs/quote` and `Usage.remaining` - never on a client-side rate
 * card. The old local estimator was deleted when this landed, because a second
 * source of truth for a price is worse than none.
 *
 * "unknown" is the honest answer while the quote is in flight and after one
 * that failed: there is no number to compare, so nothing may be gated on it and
 * no price may be shown. It must never collapse into "affordable" or "short".
 *
 * The quote is a ceiling (see `VideoQuote`), so "short" means "may cost more
 * than the balance", not "cannot be paid for". It is copy, never a gate: the
 * backend prices the storyboard's shorter post-overlap length and stays the
 * authoritative refusal, and blocking on a ceiling would take away renders the
 * user can actually afford. An empty meter is the only balance a surface may
 * gate on, because zero is zero at any price. */
export type Affordability = "unknown" | "affordable" | "short";

export function affordability(
  credits: number | undefined,
  remaining: number | undefined,
): Affordability {
  if (credits === undefined || remaining === undefined) return "unknown";
  return credits > remaining ? "short" : "affordable";
}

/** Is there a complete tuple to price at all?
 *
 * Studio builds its tuple from typed local state, but the job-detail surface
 * builds one from wire data (`VideoJob.resolution` and its siblings), and a
 * field the backend omitted would go out through `URLSearchParams` as the
 * literal string "undefined" and come back a 422. So this is the gate every
 * caller of `useVideoQuote` passes through: an incomplete tuple is no request,
 * and the surface says it has no price rather than losing the number silently
 * at the click that spends. */
export function isQuotable(
  params: VideoQuoteParams | null,
): params is VideoQuoteParams {
  return (
    params !== null &&
    Boolean(params.mode) &&
    Boolean(params.resolution) &&
    Boolean(params.aspect_ratio) &&
    Number.isFinite(params.duration_seconds)
  );
}

/** Why no price is on screen - the one classification both priced surfaces
 * use, so Studio's rail and the storyboard approve bar cannot drift apart.
 *
 * Decided by RESPONSE CLASS, never by which read failed: `isTransientError`
 * splits a 5xx/dead socket (which `transientRecovery` in `hooks.ts` is still
 * re-polling, so copy may say we are still trying) from a 4xx, the backend's
 * settled answer that nothing is retrying. `unpriceable` is the settled case
 * with no failure at all - a tuple `isQuotable` refuses, or a quote that landed
 * priced on something other than this render - and must read as final too. */
export type PriceUnknown = "pending" | "retrying" | "settled";

export function priceUnknownReason(
  reads: { isError: boolean; error: unknown }[],
  unpriceable = false,
): PriceUnknown {
  const failed = reads.filter((r) => r.isError);
  if (failed.length > 0)
    return failed.every((r) => isTransientError(r.error)) ? "retrying" : "settled";
  return unpriceable ? "settled" : "pending";
}
