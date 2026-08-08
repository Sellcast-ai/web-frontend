import { describe, expect, it } from "vitest";
import { knownOutcomeNudges } from "@/lib/outcome-nudges";

describe("outcome nudge filtering", () => {
  it("keeps canonical nudges and drops model-written free-form phrases", () => {
    expect(
      knownOutcomeNudges([
        "Boosts gaming immersion",
        "More energy",
        "Enhances online meetings",
      ]),
    ).toEqual(["More energy"]);
  });

  it("treats a missing list as no nudges", () => {
    expect(knownOutcomeNudges(null)).toEqual([]);
    expect(knownOutcomeNudges(undefined)).toEqual([]);
  });
});
