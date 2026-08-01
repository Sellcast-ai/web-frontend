import { describe, expect, it } from "vitest";
import { createMutationGuard } from "./mutation-guard";

describe("createMutationGuard", () => {
  it("admits the first caller and rejects same-window reentry", () => {
    const guard = createMutationGuard();
    expect(guard.tryBegin()).toBe(true);
    // the second click of a same-tick pair lands while the first is in flight
    expect(guard.tryBegin()).toBe(false);
    expect(guard.tryBegin()).toBe(false);
  });

  it("admits again after end", () => {
    const guard = createMutationGuard();
    guard.tryBegin();
    guard.end();
    expect(guard.tryBegin()).toBe(true);
  });

  it("tolerates a redundant end", () => {
    const guard = createMutationGuard();
    guard.end(); // end without a begin is a no-op, not a latch
    expect(guard.tryBegin()).toBe(true);
    guard.end();
    guard.end();
    expect(guard.tryBegin()).toBe(true);
  });

  it("holds one latch per instance", () => {
    const a = createMutationGuard();
    const b = createMutationGuard();
    expect(a.tryBegin()).toBe(true);
    expect(b.tryBegin()).toBe(true);
    expect(a.tryBegin()).toBe(false);
  });
});
