/**
 * Never render a raw backend failure string to a user. `VideoJob.error_message`
 * and `ImportJob.error` carry free-form English - honest prose at best, operator
 * jargon at worst (`worker_restart_lost_state (attempts exhausted)`,
 * `Resume failed: script_json missing or invalid`) - all of it untranslated in
 * every locale. These helpers map each string the backend can write to a catalog
 * key; anything unrecognized maps to the translated generic, so a server string
 * this mapping doesn't know can never reach the screen.
 *
 * Backend sources (read-only sibling repo): `video_generation.py::_fail_job`,
 * `repositories/video_job_repository.py` (worker-restart orphan sweep),
 * `repositories/store_import_repository.py` and `store_import_worker.py` (plus
 * the message constants in `services/catalog_errors.py` /
 * `services/store_catalog.py` / the platform adapters). Match on the string
 * shape exactly as written there - a backend copy edit falls back to the
 * generic, which is honest and localized, never to a raw leak.
 */

type FailureRule = readonly [pattern: RegExp, key: string];

function keyFor(rules: readonly FailureRule[], raw: string | null | undefined): string | null {
  if (!raw) return null;
  for (const [pattern, key] of rules) {
    if (pattern.test(raw)) return key;
  }
  return null;
}

/* ---------------------------------------------------------------- video jobs */

/** Keys are relative to the `app.jobs.failed` catalog section; the generic is
 * the section's existing `fallbackMessage`. Terminal video-job failures always
 * refund the charge (`_fail_job` calls `quota.refund_job` unconditionally), so
 * the mapped copy may say so. */
const VIDEO_JOB_FAILURES: readonly FailureRule[] = [
  [/^worker_restart_lost_state/, "reasons.workerRestart"],
  [/^Worker restarted mid-run/, "reasons.workerRestart"],
  [/^Resume failed:/, "reasons.resumeInvalidScript"],
  [/^Product not found for job/, "reasons.productNotFound"],
  [/^Video generation is temporarily unavailable/, "reasons.providerUnavailable"],
  [/^We couldn't start the video renders\./, "reasons.renderStart"],
  [/^One or more of the video renders didn't finish\./, "reasons.renderIncomplete"],
  [/^Something went wrong on our side while assembling this video\./, "reasons.assembling"],
  [/^Something went wrong on our side while finishing this video\./, "reasons.finishing"],
  [/^Something went wrong on our side while making this video\./, "reasons.making"],
  [/^We can't make videos for this product's category yet\./, "reasons.categoryUnsupported"],
  [/^We couldn't write a good enough script for this product\./, "reasons.scriptQuality"],
];

/** Catalog key (under `app.jobs.failed`) for a failed video job's
 * `error_message` - a mapped reason, or the translated generic for anything
 * this mapping doesn't know. */
export function videoJobFailureKey(errorMessage: string | null | undefined): string {
  return keyFor(VIDEO_JOB_FAILURES, errorMessage) ?? "fallbackMessage";
}

/* --------------------------------------------------------------- store import */

/** Keys are relative to `app.toasts`; mapped reasons live in the
 * `importFailedReasons` subsection and the generic is the existing
 * `importFailed`. The composite reason strings from `store_import_worker.py`
 * lead with their most specific clause, so prefix matching the first clause is
 * enough however many clauses follow. */
const IMPORT_FAILURES: readonly FailureRule[] = [
  [/^worker_restart_lost_state/, "workerRestart"],
  [/^Worker restarted mid-run/, "workerRestart"],
  [/^That store is not allowing automated catalog reads/, "rateLimitedSaved"],
  [/^That store is rate-limiting catalog reads/, "rateLimited"],
  [/^That store is blocking automated catalog reads/, "botWall"],
  [/^We couldn't reach that store's catalog/, "catalogUnreachable"],
  // the "Shopify and WooCommerce" variant must precede the Shopify-only one:
  // they share a lead clause, and first match wins
  [/^We couldn't read a public product catalog from that store\. This works for Shopify and WooCommerce/, "storeUnsupported"],
  [/^We couldn't read a public product catalog from that store\. This works for Shopify/, "notShopify"],
  [/^We couldn't read a public WooCommerce product catalog/, "notWoocommerce"],
  [/^We couldn't import \d+ of the products you chose/, "selectionMissing"],
  [/^We imported the first \d+ products \(catalog cap\)/, "catalogCap"],
  [/^\d+ products? we found couldn't be imported\./, "productsUnreadable"],
];

/** Catalog key (under `app.toasts`) for a failed store import's `error` field -
 * a mapped `importFailedReasons.*` reason, or the translated generic
 * `importFailed` for anything this mapping doesn't know. */
export function importFailureKey(error: string | null | undefined): string {
  const key = keyFor(IMPORT_FAILURES, error);
  return key ? `importFailedReasons.${key}` : "importFailed";
}
