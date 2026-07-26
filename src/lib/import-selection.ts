import type { ImportCandidate, ImportJob, ImportStatus } from "@/lib/api/types";

/** Store-import review step: selection is stored as the *deselected* set, because
 * everything arrives selected. That also means a candidate the store adds between
 * a save and a restore defaults to selected, same as a first visit.
 *
 * This state outlives the visit *and the session*: sessionStorage survives a
 * logout in the same tab, so signing out clears it (see the logout handlers).
 * Anything added here has to answer three questions - what does it do on a
 * reload, on a logout, and when the job it names never resolves. */

const STORAGE_KEY = "lumi.import-selection";

export type StoredSelection = {
  /** Only ever used to match the opt-outs back to the store they belong to, and
   * to offer a one-click resume - never to re-enter the (billed) catalog walk
   * on its own. */
  storeUrl: string;
  platform?: string;
  /** Display name for that store, so a resume offer names the domain rather
   * than the raw URL the user happened to paste. */
  domain?: string;
  deselected: string[];
  /** The import this selection was committed as, so a reload lands on the
   * running job's progress instead of an armed "Import N products" button. */
  jobId?: string | null;
  /** How many products were actually sent as `source_urls`. */
  requested?: number | null;
};

const finiteCount = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** sessionStorage so a reload doesn't throw away a long deselection pass.
 * Every access is guarded: no `window` on the server, and Safari private mode
 * throws on write. */
export function loadSelection(): StoredSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSelection;
    if (typeof parsed?.storeUrl !== "string" || !Array.isArray(parsed.deselected)) return null;
    return {
      storeUrl: parsed.storeUrl,
      platform: typeof parsed.platform === "string" ? parsed.platform : undefined,
      domain: typeof parsed.domain === "string" ? parsed.domain : undefined,
      deselected: parsed.deselected.filter((u) => typeof u === "string"),
      jobId: typeof parsed.jobId === "string" ? parsed.jobId : null,
      requested: finiteCount(parsed.requested),
    };
  } catch {
    return null;
  }
}

export function saveSelection(selection: StoredSelection): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    /* full or blocked storage just costs us the restore */
  }
}

export function clearSelection(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** What a review of `url` may carry over from a stored pass: the opt-outs, and
 * only for the store they were made against. Never an import handle - a review
 * is only ever entered with no job to report on. */
export function resumeFor(saved: StoredSelection | null, url: string): string[] {
  return saved && saved.storeUrl === url ? saved.deselected : [];
}

/** A job handle worth nothing to this mount: already terminal, and nobody here
 * watched it run. Its outcome belongs to the visit that started it, so replaying
 * the toast (or the redirect) at whoever opens the page next is just noise. */
export function isStaleJobHandle(status: ImportStatus | undefined, watched: boolean): boolean {
  return !!status && !watched && status !== "queued" && status !== "running";
}

/** The chosen subset, in catalog order. Filtering the live candidate list means a
 * stale persisted key can never inflate or shrink the count. */
export function selectedUrls(candidates: ImportCandidate[], deselected: Set<string>): string[] {
  return candidates.filter((c) => !deselected.has(c.source_url)).map((c) => c.source_url);
}

type OutcomeCounts = Pick<
  ImportJob,
  "products_found" | "products_upserted" | "products_failed"
>;

export type ImportOutcome =
  | { key: "importSucceeded"; values: { count: number } }
  | { key: "importPartial"; values: { imported: number; requested: number; failed: number } }
  | { key: "importOvershoot"; values: { imported: number; requested: number } }
  | { key: "importNone"; values: { requested: number } };

/** How many products the import was asked for. The client knows this exactly:
 * it is the length of the `source_urls` it sent, so prefer it over
 * `products_found`, which counts the store's catalog, not the chosen subset.
 * The single source for both the in-flight progress bar and the finished toast,
 * so the two can never disagree. It is never raised to meet `products_upserted`:
 * an import that lands more than was chosen means the backend ignored
 * `source_urls`, and that has to stay visible rather than being clamped away. */
export function importRequested(job: OutcomeCounts, requested?: number | null): number {
  if (typeof requested === "number" && requested > 0) return requested;
  return Math.max(job.products_found, job.products_upserted + job.products_failed);
}

/** Which toast a finished import earns, from the counters rather than `status` —
 * a job can report `succeeded` while some of the selected products failed to
 * read, and calling that a clean success is a lie. */
export function importOutcome(job: OutcomeCounts, requestedCount?: number | null): ImportOutcome {
  const imported = job.products_upserted;
  const requested = importRequested(job, requestedCount);
  // the backend's own count is authoritative when it is the larger one: a run
  // that upserted everything asked for while failing a dozen other reads is not
  // a clean success
  const failed = Math.max(requested - imported, job.products_failed, 0);
  if (imported === 0) return { key: "importNone", values: { requested } };
  // more landed than was chosen: the import ignored `source_urls`, and the user
  // is the one who has to hear about the products they didn't pick
  if (imported > requested) return { key: "importOvershoot", values: { imported, requested } };
  if (failed > 0) return { key: "importPartial", values: { imported, requested, failed } };
  return { key: "importSucceeded", values: { count: imported } };
}
