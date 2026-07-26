import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ImportCandidate } from "@/lib/api/types";
import {
  beginSelection,
  clearSelection,
  importOutcome,
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
      importOutcome({ products_found: 12, products_upserted: 12, products_failed: 0 }, 12),
    ).toEqual({ key: "importSucceeded", values: { count: 12 } });
  });

  it("reports a partial even when the job called itself succeeded", () => {
    expect(
      importOutcome({ products_found: 12, products_upserted: 10, products_failed: 2 }, 12),
    ).toEqual({
      key: "importPartial",
      values: { imported: 10, requested: 12, failed: 2 },
    });
  });

  it("counts a short upsert as failed even when the job forgot to", () => {
    expect(
      importOutcome({ products_found: 12, products_upserted: 10, products_failed: 0 }, 12),
    ).toEqual({
      key: "importPartial",
      values: { imported: 10, requested: 12, failed: 2 },
    });
  });

  it("reports nothing-imported instead of a success with a zero count", () => {
    expect(
      importOutcome({ products_found: 5, products_upserted: 0, products_failed: 5 }, 5),
    ).toEqual({ key: "importNone", values: { requested: 5 } });
  });

  it("says so when the run went past the chosen subset, instead of a clean success", () => {
    // the backend ignoring `source_urls`: products the user deselected are now
    // in their account, and a green "Imported 9 products" would hide that
    expect(
      importOutcome({ products_found: 200, products_upserted: 9, products_failed: 0 }, 5),
    ).toEqual({ key: "importOvershoot", values: { imported: 9, requested: 5 } });
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

  it("reports read failures the subset can't explain, with their count", () => {
    // 5 chosen, 5 upserted, 12 read failures: the import read 17 products, so it
    // didn't honour the selection. "5 of 5 - 12 couldn't be read" would be a
    // partial whose own numbers contradict each other, and a plain overshoot
    // would drop the dozen failures entirely.
    expect(
      importOutcome({ products_found: 200, products_upserted: 5, products_failed: 12 }, 5),
    ).toEqual({
      key: "importIgnoredSelection",
      values: { imported: 5, requested: 5, failed: 12 },
    });
  });

  it("carries the failures of an overshoot that also failed reads", () => {
    expect(
      importOutcome({ products_found: 200, products_upserted: 9, products_failed: 3 }, 5),
    ).toEqual({
      key: "importIgnoredSelection",
      values: { imported: 9, requested: 5, failed: 3 },
    });
  });

  it("keeps a partial a partial when the failures fit inside the subset", () => {
    expect(
      importOutcome({ products_found: 200, products_upserted: 3, products_failed: 2 }, 5),
    ).toEqual({ key: "importPartial", values: { imported: 3, requested: 5, failed: 2 } });
  });

  it("keeps a short import a partial even when its failure count overruns", () => {
    // 5 chosen, 3 landed, 3 reported failed: fewer products arrived than were
    // picked, so pointing the user at extras they didn't choose would be wrong
    expect(
      importOutcome({ products_found: 200, products_upserted: 3, products_failed: 3 }, 5),
    ).toEqual({ key: "importPartial", values: { imported: 3, requested: 5, failed: 2 } });
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

  beforeEach(() => window.sessionStorage.removeItem("lumi.import-selection"));

  const pass = {
    userId: "u1",
    storeDomain: "shop.example",
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
      JSON.stringify({ storeDomain: "shop.example", deselected: ["/a"] }),
    );
    expect(loadSelection("u1")).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(loadSelection("u1")).toBeNull();
  });

  it("returns null for a malformed payload instead of throwing", () => {
    window.sessionStorage.setItem("lumi.import-selection", "{not json");
    expect(loadSelection("u1")).toBeNull();
    window.sessionStorage.setItem("lumi.import-selection", JSON.stringify({ storeDomain: 1 }));
    expect(loadSelection("u1")).toBeNull();
  });

  describe("clearSelection", () => {
    it("drops the pass the review it is leaving owns", () => {
      saveSelection(pass);
      clearSelection({ userId: "u1", storeDomain: "shop.example" });
      expect(loadSelection("u1")).toBeNull();
    });

    it("leaves another store's pass alone", () => {
      // reviewing store B never wrote anything, so discarding B must not take
      // the opt-outs the user made for store A with it
      saveSelection(pass);
      clearSelection({ userId: "u1", storeDomain: "other.example" });
      expect(loadSelection("u1")).toEqual(pass);
    });

    it("leaves another account's pass alone", () => {
      saveSelection(pass);
      clearSelection({ userId: "u2", storeDomain: "shop.example" });
      expect(loadSelection("u1")).toEqual(pass);
    });

    it("is a no-op outside a review", () => {
      saveSelection(pass);
      clearSelection(null);
      expect(loadSelection("u1")).toEqual(pass);
    });
  });

  describe("beginSelection", () => {
    it("carries the pass back into a review of the same store", () => {
      saveSelection(pass);
      expect(beginSelection("u1", "shop.example")).toEqual(["/a", "/b"]);
    });

    it("starts a different store all-selected", () => {
      saveSelection(pass);
      expect(beginSelection("u1", "other.example")).toEqual([]);
    });

    it("gives the next account in the same tab a clean slate", () => {
      saveSelection(pass);
      expect(beginSelection("u2", "shop.example")).toEqual([]);
    });

    it("never writes, so a read that finds nothing leaves the stored pass alone", () => {
      // the pass is only ever persisted from a selection gesture: however a read
      // misses (wrong store, wrong reader, blocked storage), it can't clobber it
      saveSelection(pass);
      expect(beginSelection("u1", "other.example")).toEqual([]);
      expect(beginSelection("u2", "shop.example")).toEqual([]);
      expect(loadSelection("u1")).toEqual(pass);
    });
  });
});
