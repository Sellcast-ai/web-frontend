import type { ImportCandidate, ImportJob } from "@/lib/api/types";

/** Store-import review step: selection is stored as the *deselected* set, because
 * everything arrives selected. That also means a candidate the store adds between
 * a save and a restore defaults to selected, same as a first visit. */

const STORAGE_KEY = "lumi.import-selection";

export type StoredSelection = {
  /** Only ever used to match the opt-outs back to the store they belong to, and
   * to offer a one-click resume - never to re-enter the (billed) catalog walk
   * on its own. */
  storeUrl: string;
  platform?: string;
  deselected: string[];
  /** The import this selection was committed as, so a reload lands on the
   * running job's progress instead of an armed "Import N products" button. */
  jobId?: string | null;
  /** How many products were actually sent as `source_urls`. */
  requested?: number | null;
};

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
      deselected: parsed.deselected.filter((u) => typeof u === "string"),
      jobId: typeof parsed.jobId === "string" ? parsed.jobId : null,
      requested:
        typeof parsed.requested === "number" && Number.isFinite(parsed.requested)
          ? parsed.requested
          : null,
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
  | { key: "importNone"; values: { requested: number } };

/** How many products the import was asked for. The client knows this exactly:
 * it is the length of the `source_urls` it sent, so prefer it over
 * `products_found`, which counts the store's catalog, not the chosen subset.
 * The single source for both the in-flight progress bar and the finished toast,
 * so the two can never disagree. */
export function importRequested(job: OutcomeCounts, requested?: number | null): number {
  if (typeof requested === "number" && requested > 0) {
    return Math.max(requested, job.products_upserted);
  }
  return Math.max(job.products_found, job.products_upserted + job.products_failed);
}

/** Which toast a finished import earns, from the counters rather than `status` —
 * a job can report `succeeded` while some of the selected products failed to
 * read, and calling that a clean success is a lie. */
export function importOutcome(job: OutcomeCounts, requestedCount?: number | null): ImportOutcome {
  const imported = job.products_upserted;
  const requested = importRequested(job, requestedCount);
  const failed = Math.max(requested - imported, 0);
  if (imported === 0) return { key: "importNone", values: { requested } };
  if (failed > 0) return { key: "importPartial", values: { imported, requested, failed } };
  return { key: "importSucceeded", values: { count: imported } };
}
