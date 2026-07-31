import type { VideoJob, VideoJobStatus } from "./api/types";

export type VideoTab = "needsYou" | "onTheWay" | "failed" | "success";

/** Attention order: the tab a returning user should land on is the first one
 *  in this list that has anything in it. */
export const VIDEO_TAB_ORDER: VideoTab[] = [
  "needsYou",
  "onTheWay",
  "failed",
  "success",
];

/** Every status in the backend state machine (`app/models/video_job.py`)
 *  lands in exactly one tab. The two AWAITING_* statuses are durable pauses:
 *  the worker has exited and nothing advances until the user approves, so they
 *  are "Needs you" — not work the system still owes. */
export const TAB_FOR_STATUS: Record<VideoJobStatus, VideoTab> = {
  awaiting_storyboard: "needsYou",
  awaiting_review: "needsYou",
  queued: "onTheWay",
  submitted: "onTheWay",
  in_progress: "onTheWay",
  failed: "failed",
  completed: "success",
};

/** The one place a job's tab is decided. The table is total at compile time,
 *  but statuses arrive as runtime JSON: a status the backend adds before
 *  `types.ts` catches up must still land somewhere, or the job disappears from
 *  My Videos entirely. Unknown means "the system still owes work". */
export function tabForJob(job: VideoJob): VideoTab {
  return TAB_FOR_STATUS[job.status] ?? "onTheWay";
}

export function jobsForTab(jobs: VideoJob[], tab: VideoTab): VideoJob[] {
  return jobs.filter((j) => tabForJob(j) === tab);
}

export function countByTab(jobs: VideoJob[]): Record<VideoTab, number> {
  const counts: Record<VideoTab, number> = {
    needsYou: 0,
    onTheWay: 0,
    failed: 0,
    success: 0,
  };
  for (const job of jobs) counts[tabForJob(job)] += 1;
  return counts;
}

/** Landing tab: the first tab (in attention order) with jobs in it, so a user
 *  with a parked approval lands on the tab that needs them. */
export function defaultTab(jobs: VideoJob[]): VideoTab {
  return (
    VIDEO_TAB_ORDER.find((tab) => jobs.some((j) => tabForJob(j) === tab)) ??
    "success"
  );
}
