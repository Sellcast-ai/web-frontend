import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  importPollInterval,
  patchProductLists,
  qk,
  snapshotProductQueries,
} from "./hooks";
import type { ProductSummary } from "./types";

const product = (id: string, is_liked: boolean) =>
  ({ id, is_liked }) as ProductSummary;

function seed() {
  const qc = new QueryClient();
  qc.setQueryData(qk.product("p1"), product("p1", false));
  qc.setQueryData(qk.products({ q: "" }), [
    product("p1", false),
    product("p2", true),
  ]);
  qc.setQueryData(qk.products({ q: "shoes" }), [product("p1", false)]);
  qc.setQueryData(qk.myProducts, [product("p1", false)]);
  return qc;
}

describe("optimistic like flip + rollback", () => {
  it("flips the detail and every product list", () => {
    const qc = seed();
    qc.setQueryData<ProductSummary | undefined>(qk.product("p1"), (p) =>
      p ? { ...p, is_liked: true } : p,
    );
    patchProductLists(qc, "p1", true);

    expect(qc.getQueryData<ProductSummary>(qk.product("p1"))?.is_liked).toBe(true);
    for (const key of [qk.products({ q: "" }), qk.products({ q: "shoes" }), qk.myProducts]) {
      const list = qc.getQueryData<ProductSummary[]>(key)!;
      expect(list.find((p) => p.id === "p1")?.is_liked).toBe(true);
    }
    // untouched sibling stays as-is
    const list = qc.getQueryData<ProductSummary[]>(qk.products({ q: "" }))!;
    expect(list.find((p) => p.id === "p2")?.is_liked).toBe(true);
  });

  it("restores every affected query from the snapshot on rollback", () => {
    const qc = seed();
    const snapshot = snapshotProductQueries(qc, "p1");

    qc.setQueryData<ProductSummary | undefined>(qk.product("p1"), (p) =>
      p ? { ...p, is_liked: true } : p,
    );
    patchProductLists(qc, "p1", true);
    snapshot.forEach(([key, data]) => qc.setQueryData(key, data));

    expect(qc.getQueryData<ProductSummary>(qk.product("p1"))?.is_liked).toBe(false);
    for (const key of [qk.products({ q: "" }), qk.products({ q: "shoes" }), qk.myProducts]) {
      const list = qc.getQueryData<ProductSummary[]>(key)!;
      expect(list.find((p) => p.id === "p1")?.is_liked).toBe(false);
    }
  });

  it("polls while the import is active and stops on terminal status", () => {
    expect(importPollInterval("queued")).toBe(2500);
    expect(importPollInterval("running")).toBe(2500);
    for (const terminal of ["succeeded", "partial", "failed"] as const) {
      expect(importPollInterval(terminal)).toBe(false);
    }
    expect(importPollInterval(undefined)).toBe(false);
  });

  it("snapshots lists even when the detail query is not cached", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.products({}), [product("p1", true)]);

    const snapshot = snapshotProductQueries(qc, "p1");
    patchProductLists(qc, "p1", false);
    snapshot.forEach(([key, data]) => qc.setQueryData(key, data));

    const list = qc.getQueryData<ProductSummary[]>(qk.products({}))!;
    expect(list[0].is_liked).toBe(true);
    expect(qc.getQueryData(qk.product("p1"))).toBeUndefined();
  });
});
