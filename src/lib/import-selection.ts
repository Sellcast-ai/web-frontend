import type { ImportCandidate, ImportJob } from "@/lib/api/types";

/** Store-import review step: selection is stored as the *deselected* set, because
 * everything arrives selected. That also means a candidate the store adds between
 * a save and a restore defaults to selected, same as a first visit.
 *
 * The pass is all that outlives the visit - no import handle, no pre-flight
 * marker. Both were tried and both only ever produced stale-restore bugs, while
 * the one thing they guarded (starting the same import twice) is already held
 * server-side: `POST products/import` hands back the caller's existing active
 * job instead of enqueueing a second. Don't re-add either.
 *
 * sessionStorage outlives a logout in the same tab, so the pass is keyed by the
 * user it belongs to and discarded when the reader is someone else. That read-
 * time guard is the single mechanism - it covers logout, an expired session, and
 * every other exit, so no exit path needs its own `clearSelection()`. */

const STORAGE_KEY = "lumi.import-selection";

export type StoredSelection = {
  /** Whose pass this is. A different reader gets nothing back (see
   * `loadSelection`), which is what keeps a shared tab from offering account B
   * a resume of account A's store review. */
  userId: string;
  /** Only ever used to match the opt-outs back to the store they belong to -
   * never to re-enter the (billed) catalog walk on its own. */
  storeUrl: string;
  deselected: string[];
};

/** sessionStorage so a reload doesn't throw away a long deselection pass.
 * Every access is guarded: no `window` on the server, and Safari private mode
 * throws on write. Read it at the point of use, where the current user is known. */
export function loadSelection(userId: string | undefined): StoredSelection | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSelection;
    if (typeof parsed?.storeUrl !== "string" || !Array.isArray(parsed.deselected)) return null;
    if (parsed.userId !== userId) return null;
    return {
      userId,
      storeUrl: parsed.storeUrl,
      deselected: parsed.deselected.filter((u) => typeof u === "string"),
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

/** Opens a review of `url` for whoever is signed in: the opt-outs to start from
 * (carried over only for the store they were made against - a different store
 * starts all-selected) and the identity to write them back under.
 *
 * `null` when there is no reader yet, and that is the whole point: the caller
 * has nothing to write with until a read has succeeded, so an unresolved user
 * can't overwrite a long stored pass with an empty one. */
export function beginSelection(
  userId: string | undefined,
  url: string,
): { userId: string; deselected: string[] } | null {
  if (!userId) return null;
  const saved = loadSelection(userId);
  return { userId, deselected: saved?.storeUrl === url ? saved.deselected : [] };
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
  const failed = Math.max(requested - imported, 0);
  if (imported === 0) return { key: "importNone", values: { requested } };
  // the run touched more products than were chosen - it either upserted past the
  // subset or failed reads the subset can't account for. Either way it ignored
  // `source_urls`, and the user is the one who has to hear about it.
  if (imported + job.products_failed > requested) {
    return { key: "importOvershoot", values: { imported, requested } };
  }
  if (failed > 0) return { key: "importPartial", values: { imported, requested, failed } };
  return { key: "importSucceeded", values: { count: imported } };
}
