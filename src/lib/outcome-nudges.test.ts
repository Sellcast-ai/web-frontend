import { describe, expect, it } from "vitest";
import {
  knownOutcomeNudges,
  storyboardWithKnownOutcomeNudges,
} from "@/lib/outcome-nudges";
import type { Storyboard } from "@/lib/api/types";

const storyboard: Storyboard = {
  audience: "Home office gamers",
  buying_points: ["Better calls"],
  hook_angle: "daily_routine",
  persona: "Casual host",
  shots: [
    {
      duration: 10,
      visual: "Host sits at a desk",
      dialogue: "This made my desk setup easier.",
      ambient_audio: "room tone",
      on_screen_text: "Cleaner setup",
      outcome_nudges: [
        "Closer on the product",
        "Boosts gaming immersion",
        "Enhances online meetings",
      ],
      nudge_note: "",
      technique: "medium shot",
      transition_out: "cut",
      product_visible: "throughout",
    },
  ],
};

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

  it("sanitizes storyboard nudges before the editor or PATCH path reads them", () => {
    expect(storyboardWithKnownOutcomeNudges(storyboard)?.shots[0]?.outcome_nudges).toEqual([
      "Closer on the product",
    ]);
  });
});
