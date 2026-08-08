import { describe, expect, it } from "vitest";
import { STEP_LABEL_KEYS, jobProgressDisplay, stepIndex } from "./job-progress";
import type { VideoJob, VideoJobStatus, Storyboard } from "./api/types";

const RENDER = STEP_LABEL_KEYS.indexOf("render"); // 3
const REVIEW = STEP_LABEL_KEYS.indexOf("review"); // 1
const SHOTS = STEP_LABEL_KEYS.indexOf("shots"); // 2

const sb = { shots: [] } as unknown as Storyboard;
const approvedBeat = { review_status: "user_approved" } as VideoJob["beats"][number];
const pendingBeat = { review_status: "pending" } as VideoJob["beats"][number];

// Only the fields the display helper reads matter; cast the rest away.
const mk = (o: {
  status: VideoJobStatus;
  storyboard?: Storyboard | null;
  beats?: VideoJob["beats"];
  video_url?: string | null;
}): VideoJob =>
  ({
    status: o.status,
    storyboard: o.storyboard ?? null,
    beats: o.beats ?? [],
    video_url: o.video_url ?? null,
  }) as VideoJob;

describe("jobProgressDisplay", () => {
  it("keeps the visible tracker order aligned to the current backend flow", () => {
    expect(STEP_LABEL_KEYS).toEqual(["script", "review", "shots", "render", "ready"]);
  });

  it("sits at Review while at the storyboard gate", () => {
    expect(stepIndex(mk({ status: "awaiting_storyboard", storyboard: sb }))).toBe(REVIEW);
    expect(jobProgressDisplay(mk({ status: "awaiting_storyboard", storyboard: sb }))).toMatchObject({
      stepKey: "review",
      statusLabelKey: "reviewStoryboard",
    });
  });

  it("moves to Shots after storyboard approval while shot assets are built", () => {
    expect(jobProgressDisplay(mk({ status: "queued", storyboard: sb, beats: [] }))).toMatchObject({
      stepIndex: SHOTS,
      stepKey: "shots",
      statusLabelKey: "queuedForShots",
      workingTitleKey: "queuedForShots",
      workingDescriptionKey: "shotsDescription",
    });
    expect(jobProgressDisplay(mk({ status: "submitted", storyboard: sb, beats: [] }))).toMatchObject({
      stepIndex: SHOTS,
      stepKey: "shots",
      statusLabelKey: "buildingShots",
      workingTitleKey: "buildingShots",
      workingDescriptionKey: "shotsDescription",
    });
  });

  it("keeps a fresh job with no storyboard in the Script step", () => {
    expect(stepIndex(mk({ status: "queued" }))).toBe(0); // script
    expect(jobProgressDisplay(mk({ status: "queued" }))).toMatchObject({
      stepKey: "script",
      statusLabelKey: "queuedForScript",
      workingTitleKey: "queuedForScript",
      workingDescriptionKey: "scriptDescription",
    });
    expect(jobProgressDisplay(mk({ status: "submitted" }))).toMatchObject({
      stepKey: "script",
      statusLabelKey: "writingScript",
      workingTitleKey: "writingScript",
      workingDescriptionKey: "scriptDescription",
    });
  });

  it("keeps the legacy shot-review gate in Shots instead of moving backward", () => {
    expect(
      jobProgressDisplay(mk({ status: "awaiting_review", storyboard: sb, beats: [pendingBeat] })),
    ).toMatchObject({
      stepIndex: SHOTS,
      stepKey: "shots",
      statusLabelKey: "reviewShots",
    });
  });

  it("moves to Render only once approved shots are ready to render", () => {
    expect(
      jobProgressDisplay(mk({ status: "queued", storyboard: sb, beats: [approvedBeat] })),
    ).toMatchObject({
      stepIndex: RENDER,
      stepKey: "render",
      statusLabelKey: "queuedForRender",
      workingTitleKey: "queuedForRender",
      workingDescriptionKey: "renderDescription",
    });
    expect(
      jobProgressDisplay(mk({ status: "in_progress", storyboard: sb, beats: [approvedBeat] })),
    ).toMatchObject({
      stepIndex: RENDER,
      stepKey: "render",
      statusLabelKey: "rendering",
      workingTitleKey: "renderingVideo",
      workingDescriptionKey: "renderDescription",
    });
  });

  it("reaches Ready when completed", () => {
    expect(stepIndex(mk({ status: "completed", storyboard: sb }))).toBe(4);
    expect(jobProgressDisplay(mk({ status: "completed", storyboard: sb }))).toMatchObject({
      stepKey: "ready",
      statusLabelKey: "ready",
    });
  });

  it("marks a failure at the stage implied by the job artifacts", () => {
    expect(jobProgressDisplay(mk({ status: "failed" }))).toMatchObject({
      stepKey: "script",
      statusLabelKey: "failed",
    });
    expect(jobProgressDisplay(mk({ status: "failed", storyboard: sb }))).toMatchObject({
      stepKey: "shots",
      statusLabelKey: "failed",
    });
    expect(
      jobProgressDisplay(mk({ status: "failed", storyboard: sb, beats: [approvedBeat] })),
    ).toMatchObject({
      stepKey: "render",
      statusLabelKey: "failed",
    });
  });

  it("never moves backward through the normal lifecycle", () => {
    const lifecycle = [
      mk({ status: "queued" }),
      mk({ status: "submitted" }),
      mk({ status: "awaiting_storyboard", storyboard: sb }),
      mk({ status: "queued", storyboard: sb }),
      mk({ status: "submitted", storyboard: sb }),
      mk({ status: "awaiting_review", storyboard: sb, beats: [pendingBeat] }),
      mk({ status: "queued", storyboard: sb, beats: [approvedBeat] }),
      mk({ status: "in_progress", storyboard: sb, beats: [approvedBeat] }),
      mk({ status: "completed", storyboard: sb, beats: [approvedBeat] }),
    ].map(stepIndex);

    expect(lifecycle).toEqual([...lifecycle].sort((a, b) => a - b));
  });

  it("degrades unknown statuses to the best stage implied by artifacts", () => {
    expect(jobProgressDisplay(mk({ status: "rendering_audio" as VideoJobStatus }))).toMatchObject({
      stepKey: "script",
      statusLabelKey: "working",
      workingTitleKey: "writingScript",
    });
    expect(
      jobProgressDisplay(
        mk({ status: "rendering_audio" as VideoJobStatus, storyboard: sb, beats: [pendingBeat] }),
      ),
    ).toMatchObject({
      stepKey: "shots",
      statusLabelKey: "working",
      workingTitleKey: "buildingShots",
    });
  });
});
