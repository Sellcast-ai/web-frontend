import type { VideoJob } from "@/lib/api/types";

/** Translation keys for the five job-detail progress stages, in order. */
export const STEP_LABEL_KEYS = ["script", "review", "shots", "render", "ready"] as const;

type JobProgressStepKey = (typeof STEP_LABEL_KEYS)[number];

/** The stages the artifact ladder can name - the ones a worker actually works
 *  through. The gates and the terminal step are not among them. */
type JobWorkerStepKey = Exclude<JobProgressStepKey, "review" | "ready">;

type JobStatusLabelKey =
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

type JobWorkingTitleKey =
  | "queuedForScript"
  | "writingScript"
  | "queuedForShots"
  | "buildingShots"
  | "queuedForRender"
  | "renderingVideo"
  | "working";

/** Each of these says only what its stage is doing. The "this page updates
 *  automatically, you can leave and come back" reassurance is its own key
 *  (`workingDescription`), rendered on every wait, so it is one string per
 *  locale rather than a tail copied onto all of them. */
type JobWorkingDescriptionKey =
  | "queuedScriptDescription"
  | "scriptDescription"
  | "queuedShotsDescription"
  | "shotsDescription"
  | "queuedRenderDescription"
  | "renderDescription";

/** Which side of the worker claim the job sits on, or `null` when the status
 *  names itself (a gate, a terminal state, or one this client does not know)
 *  rather than reading a worker stage. */
type JobWorkerPhase = "queued" | "active" | null;

export interface JobProgressDisplay {
  stepKey: JobProgressStepKey;
  stepIndex: number;
  statusLabelKey: JobStatusLabelKey;
  workingTitleKey: JobWorkingTitleKey;
  /** `null` when no stage is being worked, so the wait carries the
   *  reassurance alone rather than a stage fact nobody is acting on. */
  workingDescriptionKey: JobWorkingDescriptionKey | null;
  /** A surface too narrow for the stage sentence falls back to the step label
   *  only while this is non-null - "Ready"/"Failed"/a review gate must keep
   *  saying so - and a `queued` job must still read as waiting, in words. */
  phase: JobWorkerPhase;
}

/** The badge label and the waiting copy for one stage, on each side of the
 *  worker claim. Both surfaces read this single table, so a stage added here
 *  cannot leave the badge and the body copy saying different things. */
type StageCopy = Pick<
  JobProgressDisplay,
  "statusLabelKey" | "workingTitleKey" | "workingDescriptionKey"
>;

const STAGE_COPY: Record<
  JobWorkerStepKey,
  { queued: StageCopy; active: StageCopy }
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
  workingDescriptionKey: null,
};

function isWorkerStep(key: JobProgressStepKey): key is JobWorkerStepKey {
  return key in STAGE_COPY;
}

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
function stepFromArtifacts(job: VideoJob): JobWorkerStepKey {
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
    case "queued":
    case "submitted":
    case "in_progress":
    case "failed":
      return stepFromArtifacts(job);
    default:
      return job.video_url ? "ready" : stepFromArtifacts(job);
  }
}

/** The one partition of the status set: a status either names itself (the two
 *  gates, the two terminal states, and any status this client does not know,
 *  which may name no stage however clearly the artifacts imply one) or it names
 *  a side of the worker claim. Deriving both from one switch is what keeps the
 *  badge and the body copy from ever describing different states. */
function statusFacing(
  status: VideoJob["status"],
): { ownLabel: JobStatusLabelKey; phase: null } | { ownLabel: null; phase: "queued" | "active" } {
  switch (status) {
    case "queued":
      return { ownLabel: null, phase: "queued" };
    case "submitted":
    case "in_progress":
      return { ownLabel: null, phase: "active" };
    case "completed":
      return { ownLabel: "ready", phase: null };
    case "failed":
      return { ownLabel: "failed", phase: null };
    case "awaiting_storyboard":
      return { ownLabel: "reviewStoryboard", phase: null };
    case "awaiting_review":
      return { ownLabel: "reviewShots", phase: null };
    default:
      return { ownLabel: "working", phase: null };
  }
}

export function jobProgressDisplay(job: VideoJob): JobProgressDisplay {
  const stepKey = stepForJob(job);
  const { ownLabel, phase } = statusFacing(job.status);
  // A `queued` job is parked in line, unclaimed by any worker, so the badge,
  // the title and the description all have to agree that nothing is happening
  // "now" yet - which is why they come from one row of the table.
  const stage = phase && isWorkerStep(stepKey) ? STAGE_COPY[stepKey][phase] : NO_STAGE;
  return {
    ...stage,
    stepKey,
    stepIndex: STEP_LABEL_KEYS.indexOf(stepKey),
    statusLabelKey: ownLabel ?? stage.statusLabelKey,
    phase,
  };
}
