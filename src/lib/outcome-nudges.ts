import { OUTCOME_NUDGES } from "@/lib/api/types";
import type { OutcomeNudge } from "@/lib/api/types";

/** Plain-language outcome tap -> catalog key. The tap's canonical value string
 * is what PATCH /storyboard sends after filtering. */
export const OUTCOME_NUDGE_LABEL_KEYS: Record<OutcomeNudge, string> = {
  "Closer on the product": "closerProduct",
  "Show the whole scene": "wholeScene",
  "Focus on the person": "focusPerson",
  "More energy": "moreEnergy",
  "Slow & lingering": "slowLingering",
};

const OUTCOME_NUDGE_SET = new Set<string>(OUTCOME_NUDGES);

function isOutcomeNudge(value: string): value is OutcomeNudge {
  return OUTCOME_NUDGE_SET.has(value);
}

/** Drop anything outside the canonical taps. Backend generation emits
 * free-form phrases too, and those have no `nudgeLabels.*` key - rendering one
 * shows the raw key. Filter on read and on save, never when seeding the editor
 * draft: that compares against `job.storyboard` and would read as dirty. */
export function knownOutcomeNudges(
  values: readonly string[] | null | undefined,
): OutcomeNudge[] {
  return (values ?? []).filter(isOutcomeNudge);
}
