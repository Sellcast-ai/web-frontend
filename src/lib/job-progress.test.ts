import { describe, expect, it } from "vitest";
import { STEP_LABEL_KEYS, stepIndex } from "./job-progress";
import type { VideoJob, VideoJobStatus, Storyboard } from "./api/types";

const RENDER = STEP_LABEL_KEYS.indexOf("render"); // 3
const REVIEW = STEP_LABEL_KEYS.indexOf("review"); // 2

const sb = { shots: [] } as unknown as Storyboard;

// Only the fields stepIndex reads matter; cast the rest away.
const mk = (o: {
  status: VideoJobStatus;
  storyboard?: Storyboard | null;
  beats?: VideoJob["beats"];
}): VideoJob =>
  ({ status: o.status, storyboard: o.storyboard ?? null, beats: o.beats ?? [] }) as VideoJob;

describe("stepIndex", () => {
  it("sits at Review while at the storyboard gate", () => {
    expect(stepIndex(mk({ status: "awaiting_storyboard", storyboard: sb }))).toBe(REVIEW);
  });

  it("advances to Render after storyboard approval (beats not yet generated)", () => {
    // The bug: re-queued post-approval with a storyboard but no beats used to
    // fall back to Script/Beats — going backward from Review.
    expect(stepIndex(mk({ status: "queued", storyboard: sb, beats: [] }))).toBe(RENDER);
    expect(stepIndex(mk({ status: "submitted", storyboard: sb, beats: [] }))).toBe(RENDER);
    expect(stepIndex(mk({ status: "in_progress", storyboard: sb }))).toBe(RENDER);
  });

  it("keeps a fresh job (no script/storyboard) at Script/Beats", () => {
    expect(stepIndex(mk({ status: "queued" }))).toBe(0); // script
    expect(stepIndex(mk({ status: "submitted" }))).toBe(1); // beats
  });

  it("reaches Ready when completed", () => {
    expect(stepIndex(mk({ status: "completed", storyboard: sb }))).toBe(4);
  });
});
