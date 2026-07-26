import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ImportCandidate } from "@/lib/api/types";
import {
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
      deselected: ["/a", "/b"],
    });
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
