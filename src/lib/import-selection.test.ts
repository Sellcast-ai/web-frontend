import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ImportCandidate } from "@/lib/api/types";
import {
  beginSelection,
  clearSelection,
  importOutcome,
  importRequested,
  loadSelection,
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

  it("says so when the run went past the chosen subset, instead of a clean success", () => {
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

  it("calls read failures the subset can't explain an overshoot, not a partial", () => {
    // 5 chosen, 5 upserted, 12 read failures: the import read 17 products, so it
    // didn't honour the selection. Reporting "5 of 5 - 12 couldn't be read"
    // would be a partial whose own numbers contradict each other.
    expect(
      importOutcome({ products_found: 200, products_upserted: 5, products_failed: 12 }, 5),
    ).toEqual({ key: "importOvershoot", values: { imported: 5, requested: 5 } });
  });

  it("keeps a partial a partial when the failures fit inside the subset", () => {
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

  const pass = {
    userId: "u1",
    storeUrl: "https://shop.example",
    deselected: ["/a", "/b"],
  };

  it("round-trips a deselection pass", () => {
    saveSelection(pass);
    expect(loadSelection("u1")).toEqual(pass);
  });

  it("hides a pass from the next account in the same tab", () => {
    // sessionStorage outlives a logout, so the read is what has to be guarded -
    // otherwise user B is offered a resume of user A's store review
    saveSelection(pass);
    expect(loadSelection("u2")).toBeNull();
    expect(loadSelection(undefined)).toBeNull();
  });

  it("discards a pass stored without an owner", () => {
    window.sessionStorage.setItem(
      "lumi.import-selection",
      JSON.stringify({ storeUrl: "https://shop.example", deselected: ["/a"] }),
    );
    expect(loadSelection("u1")).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(loadSelection("u1")).toBeNull();
  });

  it("returns null for a malformed payload instead of throwing", () => {
    window.sessionStorage.setItem("lumi.import-selection", "{not json");
    expect(loadSelection("u1")).toBeNull();
    window.sessionStorage.setItem("lumi.import-selection", JSON.stringify({ storeUrl: 1 }));
    expect(loadSelection("u1")).toBeNull();
  });

  describe("beginSelection", () => {
    it("carries the pass back into a review of the same store", () => {
      saveSelection(pass);
      expect(beginSelection("u1", "https://shop.example")).toEqual({
        userId: "u1",
        deselected: ["/a", "/b"],
      });
    });

    it("starts a different store all-selected", () => {
      saveSelection(pass);
      expect(beginSelection("u1", "https://other.example")).toEqual({
        userId: "u1",
        deselected: [],
      });
    });

    it("opens nothing until the reader is known, so a write can never precede a read", () => {
      // the caller has no identity to save under, so an unresolved user cannot
      // overwrite a long stored pass with the empty set it would have started from
      saveSelection(pass);
      expect(beginSelection(undefined, "https://shop.example")).toBeNull();
      expect(loadSelection("u1")).toEqual(pass);
    });

    it("gives the next account in the same tab a clean slate", () => {
      saveSelection(pass);
      expect(beginSelection("u2", "https://shop.example")).toEqual({
        userId: "u2",
        deselected: [],
      });
    });
  });
});
