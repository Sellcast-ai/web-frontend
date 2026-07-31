import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import { importFailureKey, videoJobFailureKey } from "./failure-messages";

/** Every key the mapping can return, resolved against the en catalog - guards
 * a renamed/missing catalog key, which next-intl would render as the raw
 * dotted path. */
function resolve(path: string): string | undefined {
  let cursor: unknown = en;
  for (const part of path.split(".")) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : undefined;
}

describe("videoJobFailureKey", () => {
  it("maps the operator-jargon strings to their own reasons", () => {
    expect(videoJobFailureKey("worker_restart_lost_state (attempts exhausted)")).toBe(
      "reasons.workerRestart",
    );
    expect(videoJobFailureKey("Worker restarted mid-run (attempt 2/3) — resuming")).toBe(
      "reasons.workerRestart",
    );
    expect(videoJobFailureKey("Resume failed: script_json missing or invalid")).toBe(
      "reasons.resumeInvalidScript",
    );
    expect(videoJobFailureKey("Product not found for job")).toBe("reasons.productNotFound");
  });

  it("maps every `_fail_job` message the worker can write", () => {
    expect(
      videoJobFailureKey(
        "Video generation is temporarily unavailable because of a service " +
          "configuration problem on our side. Your credits have been " +
          "refunded - please try again later.",
      ),
    ).toBe("reasons.providerUnavailable");
    expect(videoJobFailureKey("We couldn't start the video renders.")).toBe(
      "reasons.renderStart",
    );
    expect(videoJobFailureKey("One or more of the video renders didn't finish.")).toBe(
      "reasons.renderIncomplete",
    );
    expect(
      videoJobFailureKey("Something went wrong on our side while assembling this video."),
    ).toBe("reasons.assembling");
    expect(
      videoJobFailureKey("Something went wrong on our side while finishing this video."),
    ).toBe("reasons.finishing");
    expect(
      videoJobFailureKey("Something went wrong on our side while making this video."),
    ).toBe("reasons.making");
    expect(videoJobFailureKey("We can't make videos for this product's category yet.")).toBe(
      "reasons.categoryUnsupported",
    );
    expect(
      videoJobFailureKey(
        "We couldn't write a good enough script for this product. " +
          "Try again, or adjust the product details.",
      ),
    ).toBe("reasons.scriptQuality");
  });

  it("falls back to the translated generic for anything unknown", () => {
    expect(videoJobFailureKey("psycopg2.OperationalError: SSL SYSCALL error")).toBe(
      "fallbackMessage",
    );
    expect(videoJobFailureKey("")).toBe("fallbackMessage");
    expect(videoJobFailureKey(null)).toBe("fallbackMessage");
    expect(videoJobFailureKey(undefined)).toBe("fallbackMessage");
  });
});

describe("importFailureKey", () => {
  it("maps the worker/repository failure strings to their own reasons", () => {
    expect(importFailureKey("worker_restart_lost_state (attempts exhausted)")).toBe(
      "importFailedReasons.workerRestart",
    );
    expect(
      importFailureKey(
        "That store is not allowing automated catalog reads right now. We saved " +
          "everything imported so far - please try re-importing in a few minutes.",
      ),
    ).toBe("importFailedReasons.rateLimitedSaved");
    expect(
      importFailureKey(
        "That store is rate-limiting catalog reads right now. Please try again in a few minutes.",
      ),
    ).toBe("importFailedReasons.rateLimited");
    expect(
      importFailureKey(
        "That store is blocking automated catalog reads right now. Please try again later.",
      ),
    ).toBe("importFailedReasons.botWall");
    expect(
      importFailureKey(
        "We couldn't reach that store's catalog right now. Please try again later.",
      ),
    ).toBe("importFailedReasons.catalogUnreachable");
  });

  it("maps the catalog-structure and composite-reason strings", () => {
    expect(
      importFailureKey(
        "We couldn't read a public product catalog from that store. This works for " +
          "Shopify and WooCommerce stores with public product data. You can still add " +
          "products one at a time by pasting each product link.",
      ),
    ).toBe("importFailedReasons.storeUnsupported");
    expect(
      importFailureKey(
        "We couldn't read a public product catalog from that store. This works for " +
          "Shopify stores with public product data. You can still add products one at a " +
          "time by pasting each product link.",
      ),
    ).toBe("importFailedReasons.notShopify");
    expect(
      importFailureKey(
        "We couldn't read a public WooCommerce product catalog from that store. " +
          "You can still add products one at a time by pasting each product link.",
      ),
    ).toBe("importFailedReasons.notWoocommerce");
    // composite terminal messages lead with their most specific clause
    expect(
      importFailureKey(
        "We couldn't import 2 of the products you chose; they may no longer be in " +
          "this store. 1 product we found couldn't be imported.",
      ),
    ).toBe("importFailedReasons.selectionMissing");
    expect(
      importFailureKey("We imported the first 500 products (catalog cap). Contact us to import larger catalogs."),
    ).toBe("importFailedReasons.catalogCap");
    expect(importFailureKey("3 products we found couldn't be imported.")).toBe(
      "importFailedReasons.productsUnreadable",
    );
  });

  it("falls back to the existing translated generic for anything unknown", () => {
    expect(importFailureKey("requests.exceptions.ConnectionError: boom")).toBe("importFailed");
    expect(importFailureKey(null)).toBe("importFailed");
    expect(importFailureKey(undefined)).toBe("importFailed");
  });
});

describe("mapped keys", () => {
  it("all resolve to real catalog strings", () => {
    const videoKeys = [
      "reasons.workerRestart",
      "reasons.resumeInvalidScript",
      "reasons.productNotFound",
      "reasons.providerUnavailable",
      "reasons.renderStart",
      "reasons.renderIncomplete",
      "reasons.assembling",
      "reasons.finishing",
      "reasons.making",
      "reasons.categoryUnsupported",
      "reasons.scriptQuality",
      "fallbackMessage",
    ];
    for (const key of videoKeys) {
      expect(resolve(`app.jobs.failed.${key}`), key).toBeTruthy();
    }
    const importKeys = [
      "workerRestart",
      "rateLimitedSaved",
      "rateLimited",
      "botWall",
      "catalogUnreachable",
      "storeUnsupported",
      "notShopify",
      "notWoocommerce",
      "selectionMissing",
      "catalogCap",
      "productsUnreadable",
    ];
    for (const key of importKeys) {
      expect(resolve(`app.toasts.importFailedReasons.${key}`), key).toBeTruthy();
    }
    expect(resolve("app.toasts.importFailed")).toBeTruthy();
  });
});
