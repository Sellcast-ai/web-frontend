import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToasts, subscribeToasts, toast } from "./toast";

function clearAll() {
  getToasts().forEach((t) => toast.dismiss(t.id));
}

beforeEach(() => {
  vi.useFakeTimers();
  clearAll();
});

afterEach(() => {
  clearAll();
  vi.useRealTimers();
});

describe("toast store", () => {
  it("pushes toasts in order with the right variant", () => {
    toast.success("saved");
    toast.error("failed");
    expect(getToasts().map((t) => [t.variant, t.message])).toEqual([
      ["success", "saved"],
      ["error", "failed"],
    ]);
  });

  it("auto-dismisses after the variant duration", () => {
    toast.success("saved");
    vi.advanceTimersByTime(3999);
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getToasts()).toHaveLength(0);
  });

  it("keeps errors visible longer than successes", () => {
    toast.success("saved");
    toast.error("failed");
    vi.advanceTimersByTime(4000);
    expect(getToasts().map((t) => t.variant)).toEqual(["error"]);
    vi.advanceTimersByTime(2000);
    expect(getToasts()).toHaveLength(0);
  });

  it("supports manual dismissal and ignores the stale timer", () => {
    const id = toast.info("hello");
    toast.dismiss(id);
    expect(getToasts()).toHaveLength(0);
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it("caps the queue by dropping the oldest toast", () => {
    const ids = [1, 2, 3, 4, 5].map((n) => toast.info(`t${n}`));
    expect(getToasts()).toHaveLength(4);
    expect(getToasts()[0].id).toBe(ids[1]);
    expect(getToasts().at(-1)?.id).toBe(ids[4]);
  });

  it("notifies subscribers on push and dismiss, and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    const id = toast.success("saved");
    expect(listener).toHaveBeenCalledTimes(1);
    toast.dismiss(id);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    toast.info("more");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns a new array reference on change (useSyncExternalStore contract)", () => {
    const before = getToasts();
    toast.info("x");
    expect(getToasts()).not.toBe(before);
  });
});
