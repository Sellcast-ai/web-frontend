import { useState } from "react";

/** Synchronous in-flight latch for destructive / credit-spending mutation
 *  handlers. `disabled={mutation.isPending}` cannot latch within one
 *  synchronous tick (React has not re-rendered yet), so a same-tick
 *  double-click fires the mutation twice — a triple-Generate created three
 *  jobs and charged 45 credits (audit L4 P0-1). `tryBegin` checks and sets in
 *  the same handler, before any await, so the second click of a same-tick
 *  pair is rejected. Keep the `isPending` disable too: it covers the
 *  re-rendered state, this covers the window before it. */
export interface MutationGuard {
  /** Returns true and latches when the caller may proceed; false when a
   *  previous call is still in flight. */
  tryBegin(): boolean;
  /** Releases the latch. Safe to call more than once. */
  end(): void;
}

export function createMutationGuard(): MutationGuard {
  let held = false;
  return {
    tryBegin() {
      if (held) return false;
      held = true;
      return true;
    },
    end() {
      held = false;
    },
  };
}

/** A component-lifetime MutationGuard with a stable identity. */
export function useMutationGuard(): MutationGuard {
  const [guard] = useState(createMutationGuard);
  return guard;
}
