import type { VideoJob } from "@/lib/api/types";

/** Translation keys for the five job-detail progress stages, in order. */
export const STEP_LABEL_KEYS = ["script", "review", "shots", "render", "ready"] as const;

export type JobProgressStepKey = (typeof STEP_LABEL_KEYS)[number];

export type JobStatusLabelKey =
  | "queuedForScript"
  | "writingScript"
  | "reviewStoryboard"
  | "queuedForShots"
  | "buildingShots"
  | "reviewShots"
  | "queuedForRender"
  | "rendering"
  | "ready"
  | "failed"
  | "working";

export type JobWorkingTitleKey =
  | "queuedForScript"
  | "writingScript"
  | "queuedForShots"
  | "buildingShots"
  | "queuedForRender"
  | "renderingVideo"
  | "working";

export type JobWorkingDescriptionKey =
  | "queuedScriptDescription"
  | "scriptDescription"
  | "queuedShotsDescription"
  | "shotsDescription"
  | "queuedRenderDescription"
  | "renderDescription"
  | "workingDescription";

export interface JobProgressDisplay {
  stepKey: JobProgressStepKey;
  stepIndex: number;
  statusLabelKey: JobStatusLabelKey;
  workingTitleKey: JobWorkingTitleKey;
  workingDescriptionKey: JobWorkingDescriptionKey;
}

/** True once every beat has cleared the review gate. `every` on an empty
 *  array is vacuously true, so guard on length. */
export function allBeatsApproved(job: VideoJob): boolean {
  return (
    job.beats.length > 0 &&
    job.beats.every(
      (b) =>
        b.review_status === "user_approved" ||
        b.review_status === "auto_approved",
    )
  );
}

/** The one artifact ladder: the stage a job's own assets imply, regardless of
 *  which status it is sitting in. Every status branch that has no stage of its
 *  own reads it, so the ladder can only ever be changed in one place. */
function stepFromArtifacts(job: VideoJob): JobProgressStepKey {
  if (!job.storyboard) return "script";
  if (!job.beats.length) return "shots";
  return allBeatsApproved(job) ? "render" : "shots";
}

function stepForJob(job: VideoJob): JobProgressStepKey {
  switch (job.status) {
    case "completed":
      return "ready";
    case "awaiting_storyboard":
      return "review";
    case "awaiting_review":
      return "shots";
    case "in_progress":
      return "render";
    case "queued":
    case "submitted":
    case "failed":
      return stepFromArtifacts(job);
    default:
      return job.video_url ? "ready" : stepFromArtifacts(job);
  }
}

function statusLabelForJob(job: VideoJob, stepKey: JobProgressStepKey): JobStatusLabelKey {
  switch (job.status) {
    case "completed":
      return "ready";
    case "failed":
      return "failed";
    case "awaiting_storyboard":
      return "reviewStoryboard";
    case "awaiting_review":
      return "reviewShots";
    case "queued":
      if (stepKey === "shots") return "queuedForShots";
      if (stepKey === "render") return "queuedForRender";
      return "queuedForScript";
    case "submitted":
      if (stepKey === "shots") return "buildingShots";
      if (stepKey === "render") return "rendering";
      return "writingScript";
    case "in_progress":
      return "rendering";
    default:
      return "working";
  }
}

/** A `queued` job is parked in line, unclaimed by any worker, so the title and
 *  the description have to agree about that: nothing is happening "now" yet. */
function workingCopyForJob(
  job: VideoJob,
  stepKey: JobProgressStepKey,
): Pick<JobProgressDisplay, "workingTitleKey" | "workingDescriptionKey"> {
  const waiting = job.status === "queued";
  if (stepKey === "script") {
    return waiting
      ? { workingTitleKey: "queuedForScript", workingDescriptionKey: "queuedScriptDescription" }
      : { workingTitleKey: "writingScript", workingDescriptionKey: "scriptDescription" };
  }
  if (stepKey === "shots") {
    return waiting
      ? { workingTitleKey: "queuedForShots", workingDescriptionKey: "queuedShotsDescription" }
      : { workingTitleKey: "buildingShots", workingDescriptionKey: "shotsDescription" };
  }
  if (stepKey === "render") {
    return waiting
      ? { workingTitleKey: "queuedForRender", workingDescriptionKey: "queuedRenderDescription" }
      : { workingTitleKey: "renderingVideo", workingDescriptionKey: "renderDescription" };
  }
  return { workingTitleKey: "working", workingDescriptionKey: "workingDescription" };
}

export function jobProgressDisplay(job: VideoJob): JobProgressDisplay {
  const stepKey = stepForJob(job);
  return {
    stepKey,
    stepIndex: STEP_LABEL_KEYS.indexOf(stepKey),
    statusLabelKey: statusLabelForJob(job, stepKey),
    ...workingCopyForJob(job, stepKey),
  };
}
