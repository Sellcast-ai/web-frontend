import { OUTCOME_NUDGES } from "@/lib/api/types";
import type { OutcomeNudge, Storyboard } from "@/lib/api/types";

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

export function isOutcomeNudge(value: string): value is OutcomeNudge {
  return OUTCOME_NUDGE_SET.has(value);
}

export function knownOutcomeNudges(
  values: readonly string[] | null | undefined,
): OutcomeNudge[] {
  return (values ?? []).filter(isOutcomeNudge);
}

export function storyboardWithKnownOutcomeNudges(
  storyboard: Storyboard | null,
): Storyboard | null {
  if (!storyboard) return null;
  return {
    ...storyboard,
    shots: storyboard.shots.map((shot) => ({
      ...shot,
      outcome_nudges: knownOutcomeNudges(shot.outcome_nudges),
    })),
  };
}
