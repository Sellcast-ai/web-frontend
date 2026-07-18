import type { VideoJob } from "@/lib/api/types";

/** The five stages shown in the job-detail progress tracker, in order. */
export const STEPS = ["Script", "Beats", "Review", "Render", "Ready"] as const;

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

/** Index into {@link STEPS} for the job's current stage.
 *
 *  The tracker must only ever move forward. In the review-first flow, beat
 *  reference images are generated *after* the storyboard is approved, so a
 *  just-approved job carries a storyboard but no beats — the old
 *  `beats.length ? Beats : Script` fallback read that as going backward from
 *  Review. Since a written script otherwise sits at `awaiting_storyboard`, a
 *  storyboard present on a queued/submitted job means the gate is behind us and
 *  we're rendering. */
export function stepIndex(job: VideoJob): number {
  switch (job.status) {
    case "queued":
    case "submitted":
      // Re-queued/-submitted after a review gate → the worker is resuming at
      // render, so advance to "Render" instead of dropping back to Script/Beats.
      // Two gates land here: the storyboard gate (storyboard present, beats not
      // yet generated) and the legacy image gate (all beats approved). The
      // initial queue (no script yet) stays at Script; a fresh `submitted`
      // (script generating) sits at Beats.
      if (job.storyboard || allBeatsApproved(job)) return 3;
      return job.status === "submitted" || job.beats.length ? 1 : 0;
    // Storyboard gate fires right after the script is written (before beats),
    // so it sits at the "Review" step just like the legacy image gate.
    case "awaiting_storyboard":
      return 2;
    case "awaiting_review":
      return 2;
    case "in_progress":
      return 3;
    case "completed":
      return 4;
    case "failed":
      return 3;
    default:
      return 0;
  }
}
