import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  approveStoryboardOptions,
  deleteVideoJobOrGone,
  importPollInterval,
  patchProductLists,
  qk,
  removeJobFromCachedLists,
  renderFailureMessage,
  retryUnlessNotFound,
  snapshotProductQueries,
} from "./hooks";
import { ApiError } from "./client";
import { getToasts } from "@/lib/toast";
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

describe("renderFailureMessage", () => {
  const secondsProse = "This 15s 720p video needs 15 credits, but you have 4 of 300 left.";
  const messages = { fallback: "fallback", outOfCredits: "out of credits" };

  it("drops the credit refusal's prose for the localized credit copy", () => {
    const refusal = new ApiError(429, secondsProse, undefined, secondsProse);
    expect(renderFailureMessage(refusal, messages)).toBe("out of credits");
  });

  it("keeps every other 4xx's curated server message", () => {
    const capped = new ApiError(409, "Too many active jobs", undefined, "Too many active jobs");
    expect(renderFailureMessage(capped, messages)).toBe("Too many active jobs");
  });

  it("falls back to the generic copy when the body carried nothing", () => {
    expect(renderFailureMessage(new ApiError(500, "Server Error"), messages)).toBe(
      "fallback",
    );
  });
});

describe("qk.quote", () => {
  const base = {
    mode: "product_only",
    duration_seconds: 15,
    resolution: "720p",
    aspect_ratio: "9:16",
  };

  // Re-quoting when a picker moves IS this key changing; nothing else drives it.
  it("changes when any priced input changes", () => {
    const keys = [
      { ...base, duration_seconds: 30 },
      { ...base, resolution: "1080p" },
      { ...base, aspect_ratio: "1:1" },
      { ...base, mode: "ai_avatar" },
      { ...base, video_model: "seedance-2.0" },
    ].map((p) => JSON.stringify(qk.quote(p)));

    expect(new Set([...keys, JSON.stringify(qk.quote(base))]).size).toBe(6);
  });

  it("is stable for the same configuration, so a re-pick is served from cache", () => {
    expect(qk.quote({ ...base })).toEqual(qk.quote({ ...base }));
  });
});

describe("approveStoryboardOptions", () => {
  const messages = { approveError: "approve failed", outOfCredits: "out of credits" };

  function usageInvalidations(qc: QueryClient) {
    return vi.spyOn(qc, "invalidateQueries");
  }

  it("refreshes the meter after a charge lands", () => {
    const qc = new QueryClient();
    const spy = usageInvalidations(qc);
    approveStoryboardOptions(qc, "j1", messages).onSuccess(job("j1"));

    expect(qc.getQueryData(qk.job("j1"))).toEqual(job("j1"));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["usage"] });
  });

  // Approval is the charge point, so it takes the metered-call path: the
  // backend's English balance prose never reaches a nine-locale surface.
  it("routes the credit refusal through the localized message, and re-reads usage", () => {
    const qc = new QueryClient();
    const spy = usageInvalidations(qc);
    const prose = "This 15s 720p video needs 225 credits, but you have 30 of 30 left.";
    approveStoryboardOptions(qc, "j1", messages).onError(
      new ApiError(429, prose, undefined, prose),
    );

    expect(getToasts().at(-1)?.message).toBe("out of credits");
    expect(spy).toHaveBeenCalledWith({ queryKey: ["usage"] });
  });

  it("keeps the curated server message for every other failure", () => {
    const qc = new QueryClient();
    approveStoryboardOptions(qc, "j1", messages).onError(
      new ApiError(409, "Storyboard already approved", undefined, "Storyboard already approved"),
    );

    expect(getToasts().at(-1)?.message).toBe("Storyboard already approved");
  });
});
