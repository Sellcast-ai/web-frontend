import { describe, expect, it } from "vitest";
import { affordability } from "./render-quote";
import { VIDEO_MODELS } from "./api/types";

describe("affordability", () => {
  it("blocks a render that costs more than the balance", () => {
    expect(affordability(225, 30)).toBe("short");
  });

  it("allows one the balance exactly covers", () => {
    expect(affordability(225, 225)).toBe("affordable");
    expect(affordability(70, 300)).toBe("affordable");
  });

  // A slow or failed quote must leave the button alone: there is no number to
  // compare, and guessing either way is either a wrong price or a wrong gate.
  it("is unknown with no quote, and stays unknown with no balance", () => {
    expect(affordability(undefined, 300)).toBe("unknown");
    expect(affordability(225, undefined)).toBe("unknown");
    expect(affordability(undefined, undefined)).toBe("unknown");
  });

  // Zero is refused by the balance-only check Studio keeps alongside this one,
  // not here: a free render is genuinely affordable at any balance.
  it("treats a zero-credit quote as affordable", () => {
    expect(affordability(0, 0)).toBe("affordable");
  });
});

// The storyboard approve bar quotes a job WITHOUT a model, because a job row
// carries a provider model id and `GET /video-jobs/quote` takes only Studio
// picker keys - so the backend prices the mode's default model. That is exact
// only while exactly one model can be picked. A second enabled entry makes the
// approve bar quote a price the render may not be charged, which is the whole
// failure this endpoint was wired in to end.
describe("approve-bar quote assumption", () => {
  it("holds while Studio offers exactly one selectable model", () => {
    const selectable = VIDEO_MODELS.filter((m) => m.enabled);
    expect(
      selectable.length,
      "enabling a second model means the job page must resolve the job's " +
        "provider_model back to a picker key before quoting (see StoryboardView)",
    ).toBe(1);
  });
});
