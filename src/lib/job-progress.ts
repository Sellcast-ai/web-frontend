import type { VideoJob } from "@/lib/api/types";

/** Translation keys for the five job-detail progress stages, in order. */
export const STEP_LABEL_KEYS = ["script", "review", "shots", "render", "ready"] as const;

export type JobProgressStepKey = (typeof STEP_LABEL_KEYS)[number];

export type JobStatusLabelKey =
  | "queued"
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
  | "scriptDescription"
  | "shotsDescription"
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

function stepForJob(job: VideoJob): JobProgressStepKey {
  switch (job.status) {
    case "completed":
      return "ready";
    case "queued":
    case "submitted":
      if (!job.storyboard) return "script";
      if (!job.beats.length) return "shots";
      return allBeatsApproved(job) ? "render" : "shots";
    case "awaiting_storyboard":
      return "review";
    case "awaiting_review":
      return "shots";
    case "in_progress":
      return "render";
    case "failed":
      if (!job.storyboard) return "script";
      if (!job.beats.length) return "shots";
      return allBeatsApproved(job) ? "render" : "shots";
    default:
      if (job.video_url) return "ready";
      if (job.beats.length) return allBeatsApproved(job) ? "render" : "shots";
      return job.storyboard ? "shots" : "script";
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
      if (stepKey === "script") return "queuedForScript";
      if (stepKey === "shots") return "queuedForShots";
      if (stepKey === "render") return "queuedForRender";
      return "queued";
    case "submitted":
      if (stepKey === "script") return "writingScript";
      if (stepKey === "shots") return "buildingShots";
      if (stepKey === "render") return "rendering";
      return "working";
    case "in_progress":
      return "rendering";
    default:
      return "working";
  }
}

function workingTitleForJob(job: VideoJob, stepKey: JobProgressStepKey): JobWorkingTitleKey {
  if (stepKey === "script") {
    return job.status === "queued" ? "queuedForScript" : "writingScript";
  }
  if (stepKey === "shots") {
    return job.status === "queued" ? "queuedForShots" : "buildingShots";
  }
  if (stepKey === "render") {
    return job.status === "queued" ? "queuedForRender" : "renderingVideo";
  }
  return "working";
}

function workingDescriptionForStep(stepKey: JobProgressStepKey): JobWorkingDescriptionKey {
  if (stepKey === "script") return "scriptDescription";
  if (stepKey === "shots") return "shotsDescription";
  if (stepKey === "render") return "renderDescription";
  return "workingDescription";
}

export function jobProgressDisplay(job: VideoJob): JobProgressDisplay {
  const stepKey = stepForJob(job);
  return {
    stepKey,
    stepIndex: STEP_LABEL_KEYS.indexOf(stepKey),
    statusLabelKey: statusLabelForJob(job, stepKey),
    workingTitleKey: workingTitleForJob(job, stepKey),
    workingDescriptionKey: workingDescriptionForStep(stepKey),
  };
}

/** Index into {@link STEP_LABEL_KEYS} for the job's current stage. */
export function stepIndex(job: VideoJob): number {
  return jobProgressDisplay(job).stepIndex;
}
