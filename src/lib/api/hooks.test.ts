import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  createJobFailureMessage,
  deleteVideoJobOrGone,
  importPollInterval,
  patchProductLists,
  qk,
  removeJobFromCachedLists,
  retryUnlessNotFound,
  snapshotProductQueries,
} from "./hooks";
import { ApiError } from "./client";
import type { ProductSummary, VideoJob } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(status: number, body: unknown = null) {
  const fn = vi.fn(
    async () =>
      new Response(body === null ? null : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

const product = (id: string, is_liked: boolean) =>
  ({ id, is_liked }) as ProductSummary;

const job = (id: string) => ({ id }) as VideoJob;

function seed() {
  const qc = new QueryClient();
  qc.setQueryData(qk.product("p1"), product("p1", false));
  qc.setQueryData(qk.myProducts, [product("p1", false), product("p2", true)]);
  return qc;
}

describe("optimistic like flip + rollback", () => {
  it("flips the detail and my products list", () => {
    const qc = seed();
    qc.setQueryData<ProductSummary | undefined>(qk.product("p1"), (p) =>
      p ? { ...p, is_liked: true } : p,
    );
    patchProductLists(qc, "p1", true);

    expect(qc.getQueryData<ProductSummary>(qk.product("p1"))?.is_liked).toBe(true);
    const list = qc.getQueryData<ProductSummary[]>(qk.myProducts)!;
    expect(list.find((p) => p.id === "p1")?.is_liked).toBe(true);
    // untouched sibling stays as-is
    expect(list.find((p) => p.id === "p2")?.is_liked).toBe(true);
  });

  it("restores affected queries from the snapshot on rollback", () => {
    const qc = seed();
    const snapshot = snapshotProductQueries(qc, "p1");

    qc.setQueryData<ProductSummary | undefined>(qk.product("p1"), (p) =>
      p ? { ...p, is_liked: true } : p,
    );
    patchProductLists(qc, "p1", true);
    snapshot.forEach(([key, data]) => qc.setQueryData(key, data));

    expect(qc.getQueryData<ProductSummary>(qk.product("p1"))?.is_liked).toBe(false);
    const list = qc.getQueryData<ProductSummary[]>(qk.myProducts)!;
    expect(list.find((p) => p.id === "p1")?.is_liked).toBe(false);
  });

  it("polls while the import is active and stops on terminal status", () => {
    expect(importPollInterval("queued")).toBe(2500);
    expect(importPollInterval("running")).toBe(2500);
    for (const terminal of ["succeeded", "partial", "failed"] as const) {
      expect(importPollInterval(terminal)).toBe(false);
    }
    // no status yet is not terminal: a first poll, a garbage-collected cache or
    // a failing GET has to keep asking, or the progress card never recovers
    expect(importPollInterval(undefined)).toBe(2500);
  });

  it("snapshots my products even when the detail query is not cached", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.myProducts, [product("p1", true)]);

    const snapshot = snapshotProductQueries(qc, "p1");
    patchProductLists(qc, "p1", false);
    snapshot.forEach(([key, data]) => qc.setQueryData(key, data));

    const list = qc.getQueryData<ProductSummary[]>(qk.myProducts)!;
    expect(list[0].is_liked).toBe(true);
    expect(qc.getQueryData(qk.product("p1"))).toBeUndefined();
  });
});

describe("video job list cache pruning", () => {
  it("removes a deleted job from cached list queries", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.jobs({ product_id: "p1" }), [
      job("j1"),
      job("deleted"),
      job("j2"),
    ]);

    removeJobFromCachedLists(qc, "deleted");

    expect(qc.getQueryData<VideoJob[]>(qk.jobs({ product_id: "p1" }))).toEqual([
      job("j1"),
      job("j2"),
    ]);
  });

  it("removes cached paged list queries instead of shortening offset pages", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.jobs({ limit: 50 }), {
      pageParams: [0, 50],
      pages: [[job("j1"), job("deleted")], [job("j2"), job("deleted")]],
    });

    removeJobFromCachedLists(qc, "deleted");

    expect(qc.getQueryData(qk.jobs({ limit: 50 }))).toBeUndefined();
  });
});

describe("deleteVideoJobOrGone", () => {
  it("resolves on a plain 204 delete", async () => {
    mockFetch(204);
    await expect(deleteVideoJobOrGone("j1")).resolves.toBeUndefined();
  });

  it("treats a 404 as success — the job is already gone, which was the goal", async () => {
    mockFetch(404, { detail: "Video job not found" });
    await expect(deleteVideoJobOrGone("j1")).resolves.toBeUndefined();
  });

  it("still surfaces real failures", async () => {
    mockFetch(500, { detail: "boom" });
    await expect(deleteVideoJobOrGone("j1")).rejects.toBeInstanceOf(ApiError);
    await expect(deleteVideoJobOrGone("j1")).rejects.toMatchObject({ status: 500 });
  });
});

describe("status-aware product probes", () => {
  it("does not retry deleted products", () => {
    expect(retryUnlessNotFound(0, new ApiError(404, "Not found"))).toBe(false);
  });

  it("retries transient product probe failures once", () => {
    expect(retryUnlessNotFound(0, new ApiError(502, "Bad gateway"))).toBe(true);
    expect(retryUnlessNotFound(1, new ApiError(502, "Bad gateway"))).toBe(false);
  });
});

describe("createJobFailureMessage", () => {
  const secondsProse = "This 15s 720p video needs 15 credits, but you have 4 of 300 left.";

  it("drops the credit refusal's prose for the localized fallback", () => {
    const refusal = new ApiError(429, secondsProse, undefined, secondsProse);
    expect(createJobFailureMessage(refusal, "fallback")).toBe("fallback");
  });

  it("keeps every other 4xx's curated server message", () => {
    const capped = new ApiError(409, "Too many active jobs", undefined, "Too many active jobs");
    expect(createJobFailureMessage(capped, "fallback")).toBe("Too many active jobs");
  });
});
