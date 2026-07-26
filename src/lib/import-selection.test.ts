import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ImportCandidate } from "@/lib/api/types";
import {
  clearSelection,
  importOutcome,
  importRequested,
  isStaleJobHandle,
  loadSelection,
  pendingMarker,
  resumeFor,
  saveSelection,
  selectedUrls,
} from "./import-selection";

const candidate = (source_url: string): ImportCandidate => ({
  source_url,
  title: source_url,
  image: null,
  price_min: null,
  price_max: null,
  currency: null,
});

const catalog = [candidate("/a"), candidate("/b"), candidate("/c")];

describe("selectedUrls", () => {
  it("selects everything when nothing is deselected", () => {
    expect(selectedUrls(catalog, new Set())).toEqual(["/a", "/b", "/c"]);
  });

  it("keeps catalog order for a partial selection", () => {
    expect(selectedUrls(catalog, new Set(["/b"]))).toEqual(["/a", "/c"]);
  });

  it("is empty after a deselect-all", () => {
    expect(selectedUrls(catalog, new Set(["/a", "/b", "/c"]))).toEqual([]);
  });

  it("ignores keys that are no longer in the catalog", () => {
    // a restored selection can name products the store has since dropped
    expect(selectedUrls(catalog, new Set(["/gone", "/a"]))).toEqual(["/b", "/c"]);
  });
});

describe("importOutcome", () => {
  it("reports a clean success", () => {
    expect(
      importOutcome({ products_found: 12, products_upserted: 12, products_failed: 0 }),
    ).toEqual({ key: "importSucceeded", values: { count: 12 } });
  });

  it("reports a partial even when the job called itself succeeded", () => {
    expect(
      importOutcome({ products_found: 12, products_upserted: 10, products_failed: 2 }),
    ).toEqual({
      key: "importPartial",
      values: { imported: 10, requested: 12, failed: 2 },
    });
  });

  it("counts a short upsert as failed even when the job forgot to", () => {
    expect(
      importOutcome({ products_found: 12, products_upserted: 10, products_failed: 0 }),
    ).toEqual({
      key: "importPartial",
      values: { imported: 10, requested: 12, failed: 2 },
    });
  });

  it("trusts the larger of found and upserted+failed", () => {
    expect(
      importOutcome({ products_found: 0, products_upserted: 3, products_failed: 1 }),
    ).toEqual({
      key: "importPartial",
      values: { imported: 3, requested: 4, failed: 1 },
    });
  });

  it("reports nothing-imported instead of a success with a zero count", () => {
    expect(
      importOutcome({ products_found: 5, products_upserted: 0, products_failed: 5 }),
    ).toEqual({ key: "importNone", values: { requested: 5 } });
  });

  it("says so when more landed than was chosen, instead of a clean success", () => {
    // the backend ignoring `source_urls`: products the user deselected are now
    // in their account, and a green "Imported 9 products" would hide that
    expect(
      importOutcome({ products_found: 200, products_upserted: 9, products_failed: 0 }, 5),
    ).toEqual({ key: "importOvershoot", values: { imported: 9, requested: 5 } });
  });

  it("cannot report an overshoot off the job counters alone", () => {
    // without a client-known count the total is derived to be >= what landed,
    // so the fallback path keeps its existing success/partial behaviour
    expect(
      importOutcome({ products_found: 0, products_upserted: 9, products_failed: 0 }),
    ).toEqual({ key: "importSucceeded", values: { count: 9 } });
  });

  it("counts against the requested subset, not the store catalog", () => {
    // the backend may keep reporting the whole catalog it walked; 5 of 5 chosen
    // products landing is a clean success, not "5 of 200"
    expect(
      importOutcome({ products_found: 200, products_upserted: 5, products_failed: 0 }, 5),
    ).toEqual({ key: "importSucceeded", values: { count: 5 } });
    expect(
      importOutcome({ products_found: 200, products_upserted: 3, products_failed: 2 }, 5),
    ).toEqual({ key: "importPartial", values: { imported: 3, requested: 5, failed: 2 } });
  });
});

describe("importRequested", () => {
  const counters = { products_found: 200, products_upserted: 5, products_failed: 0 };

  it("is the exact requested count when the client knows it", () => {
    expect(importRequested(counters, 5)).toBe(5);
  });

  it("falls back to the job counters when it doesn't", () => {
    expect(importRequested(counters, null)).toBe(200);
    expect(importRequested(counters, undefined)).toBe(200);
    expect(importRequested(counters, 0)).toBe(200);
  });

  it("stays at what the user chose even when the import overshoots it", () => {
    // the backend ignoring `source_urls` has to stay visible: rewriting the
    // total up to what landed would quietly read as a finished import
    expect(importRequested({ ...counters, products_upserted: 9 }, 5)).toBe(5);
  });

  it("gives the toast and the progress bar the same total", () => {
    const job = { products_found: 200, products_upserted: 3, products_failed: 2 };
    const outcome = importOutcome(job, 5);
    expect(outcome.key).toBe("importPartial");
    expect(outcome.values).toMatchObject({ requested: importRequested(job, 5) });
  });
});

describe("resumeFor", () => {
  const saved = {
    storeUrl: "https://shop.example",
    domain: "shop.example",
    deselected: ["/a"],
    jobId: "job-1",
    requested: 4,
  };

  it("carries the pass back into a review of the same store", () => {
    // never the job: a review is entered with nothing to report on, so a dead
    // handle can't be persisted under the store the user is reviewing next
    expect(resumeFor(saved, "https://shop.example")).toEqual(["/a"]);
  });

  it("starts a different store all-selected", () => {
    expect(resumeFor(saved, "https://other.example")).toEqual([]);
  });

  it("has nothing to carry when nothing was stored", () => {
    expect(resumeFor(null, "https://shop.example")).toEqual([]);
  });
});

describe("pendingMarker", () => {
  it("marks the store while the start request is in flight", () => {
    expect(pendingMarker(5, true)).toBe(5);
  });

  it("is gone the moment the request settles, succeeded or failed", () => {
    // the marker is derived from the request, not cleared by hand, so a failed
    // or aborted start cannot leave "an import may already be running" behind
    expect(pendingMarker(5, false)).toBeNull();
  });

  it("has nothing to mark before an import is asked for", () => {
    expect(pendingMarker(null, true)).toBeNull();
    expect(pendingMarker(0, true)).toBeNull();
  });
});

describe("isStaleJobHandle", () => {
  it("drops a restored handle for an import that already finished", () => {
    for (const status of ["succeeded", "partial", "failed"] as const) {
      expect(isStaleJobHandle(status, false)).toBe(true);
    }
  });

  it("keeps a restored handle for an import that is still working", () => {
    expect(isStaleJobHandle("queued", false)).toBe(false);
    expect(isStaleJobHandle("running", false)).toBe(false);
  });

  it("keeps a completion this mount watched, so it still gets announced", () => {
    expect(isStaleJobHandle("succeeded", true)).toBe(false);
    expect(isStaleJobHandle("failed", true)).toBe(false);
  });

  it("is nothing to decide before the job has been fetched", () => {
    expect(isStaleJobHandle(undefined, false)).toBe(false);
  });
});

describe("selection persistence", () => {
  // vitest runs in the node environment, so stand up just enough of the
  // Storage surface these three functions touch.
  beforeAll(() => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
  });

  beforeEach(() => clearSelection());

  it("round-trips a deselection pass", () => {
    saveSelection({ storeUrl: "https://shop.example", deselected: ["/a", "/b"] });
    expect(loadSelection()).toEqual({
      storeUrl: "https://shop.example",
      platform: undefined,
      domain: undefined,
      deselected: ["/a", "/b"],
      jobId: null,
      requested: null,
      pending: null,
    });
  });

  it("round-trips the pre-flight marker of an import that was asked for", () => {
    saveSelection({
      storeUrl: "https://shop.example",
      deselected: [],
      pending: pendingMarker(6, true),
    });
    expect(loadSelection()).toMatchObject({ pending: 6, jobId: null });
  });

  it("stores no marker for a start request that already settled", () => {
    saveSelection({
      storeUrl: "https://shop.example",
      deselected: [],
      pending: pendingMarker(6, false),
    });
    expect(loadSelection()).toMatchObject({ pending: null });
  });

  it("round-trips the running import so a reload can't buy it twice", () => {
    saveSelection({
      storeUrl: "https://shop.example",
      platform: "shopify",
      domain: "shop.example",
      deselected: ["/a"],
      jobId: "job-1",
      requested: 4,
    });
    expect(loadSelection()).toEqual({
      storeUrl: "https://shop.example",
      platform: "shopify",
      domain: "shop.example",
      deselected: ["/a"],
      jobId: "job-1",
      requested: 4,
      pending: null,
    });
  });

  it("drops a malformed job handle rather than restoring a bogus one", () => {
    window.sessionStorage.setItem(
      "lumi.import-selection",
      JSON.stringify({
        storeUrl: "https://shop.example",
        deselected: [],
        jobId: 7,
        requested: "many",
      }),
    );
    expect(loadSelection()).toMatchObject({ jobId: null, requested: null });
  });

  it("returns null when nothing is stored", () => {
    expect(loadSelection()).toBeNull();
  });

  it("returns null for a malformed payload instead of throwing", () => {
    window.sessionStorage.setItem("lumi.import-selection", "{not json");
    expect(loadSelection()).toBeNull();
    window.sessionStorage.setItem("lumi.import-selection", JSON.stringify({ storeUrl: 1 }));
    expect(loadSelection()).toBeNull();
  });
});
