import { describe, expect, it } from "vitest";
import { stripDialogueStageDirections } from "./storyboard-display";

describe("stripDialogueStageDirections", () => {
  it("removes AI stage-direction parentheticals from displayed dialogue", () => {
    expect(stripDialogueStageDirections("(smiling) Your morning coffee is ready.")).toBe(
      "Your morning coffee is ready.",
    );
    expect(stripDialogueStageDirections("Meet the kit (softly) that upgrades breakfast.")).toBe(
      "Meet the kit that upgrades breakfast.",
    );
  });

  it("keeps legitimate parenthetical punctuation", () => {
    expect(stripDialogueStageDirections("Save on the 2-pack (with filters) today.")).toBe(
      "Save on the 2-pack (with filters) today.",
    );
    expect(stripDialogueStageDirections("Ready now (today only).")).toBe(
      "Ready now (today only).",
    );
  });

  it("does not rewrite non-Latin parenthetical copy", () => {
    expect(stripDialogueStageDirections("限定セット（本日だけ）です。")).toBe(
      "限定セット（本日だけ）です。",
    );
  });
});
