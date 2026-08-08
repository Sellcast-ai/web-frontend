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

/** The badge label and the waiting copy for one stage, on each side of the
 *  worker claim. Both surfaces read this single table, so a stage added here
 *  cannot leave the badge and the body copy saying different things. */
type StageCopy = Pick<
  JobProgressDisplay,
  "statusLabelKey" | "workingTitleKey" | "workingDescriptionKey"
>;

const STAGE_COPY: Partial<
  Record<JobProgressStepKey, { queued: StageCopy; active: StageCopy }>
> = {
  script: {
    queued: {
      statusLabelKey: "queuedForScript",
      workingTitleKey: "queuedForScript",
      workingDescriptionKey: "queuedScriptDescription",
    },
    active: {
      statusLabelKey: "writingScript",
      workingTitleKey: "writingScript",
      workingDescriptionKey: "scriptDescription",
    },
  },
  shots: {
    queued: {
      statusLabelKey: "queuedForShots",
      workingTitleKey: "queuedForShots",
      workingDescriptionKey: "queuedShotsDescription",
    },
    active: {
      statusLabelKey: "buildingShots",
      workingTitleKey: "buildingShots",
      workingDescriptionKey: "shotsDescription",
    },
  },
  render: {
    queued: {
      statusLabelKey: "queuedForRender",
      workingTitleKey: "queuedForRender",
      workingDescriptionKey: "queuedRenderDescription",
    },
    active: {
      statusLabelKey: "rendering",
      workingTitleKey: "renderingVideo",
      workingDescriptionKey: "renderDescription",
    },
  },
};

/** The gates (Review) and the terminal step (Ready) have no worker stage of
 *  their own, so they name none. */
const NO_STAGE: StageCopy = {
  statusLabelKey: "working",
  workingTitleKey: "working",
  workingDescriptionKey: "workingDescription",
};

/** True once every beat has cleared the review gate. `every` on an empty
 *  array is vacuously true, so guard on length. */
function allBeatsApproved(job: VideoJob): boolean {
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

/** The statuses that name themselves rather than a worker stage: the two
 *  gates, the two terminal states, and any status this client does not know
 *  (which may name no stage, however clearly the artifacts imply one). */
function statusOwnLabel(status: VideoJob["status"]): JobStatusLabelKey | null {
  switch (status) {
    case "completed":
      return "ready";
    case "failed":
      return "failed";
    case "awaiting_storyboard":
      return "reviewStoryboard";
    case "awaiting_review":
      return "reviewShots";
    case "queued":
    case "submitted":
    case "in_progress":
      return null;
    default:
      return "working";
  }
}

export function jobProgressDisplay(job: VideoJob): JobProgressDisplay {
  const stepKey = stepForJob(job);
  // A `queued` job is parked in line, unclaimed by any worker, so the badge,
  // the title and the description all have to agree that nothing is happening
  // "now" yet - which is why they come from one row of the table.
  const stage = STAGE_COPY[stepKey]?.[job.status === "queued" ? "queued" : "active"] ?? NO_STAGE;
  return {
    ...stage,
    stepKey,
    stepIndex: STEP_LABEL_KEYS.indexOf(stepKey),
    statusLabelKey: statusOwnLabel(job.status) ?? stage.statusLabelKey,
  };
}
