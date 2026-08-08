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
 * The quote is a ceiling (see `VideoQuote`), so "short" can occasionally refuse
 * a render the backend would have accepted for a few credits less. That is the
 * right direction to be wrong in: the alternative lets the user spend an
 * active-job slot on a job that then cannot be approved. */
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
