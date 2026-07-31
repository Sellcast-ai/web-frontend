import { describe, expect, it } from "vitest";
import type { VideoJob, VideoJobStatus } from "./api/types";
import {
  TAB_FOR_STATUS,
  VIDEO_TAB_ORDER,
  countByTab,
  defaultTab,
  jobsForTab,
} from "./video-tabs";

// The full backend VideoJobStatus enum (app/models/video_job.py). The tab
// table is only honest if every one of these is mapped — no silent bucket.
const ALL_STATUSES: VideoJobStatus[] = [
  "queued",
  "submitted",
  "in_progress",
  "awaiting_storyboard",
  "awaiting_review",
  "completed",
  "failed",
];

function job(status: VideoJobStatus): VideoJob {
  return { id: status, status } as VideoJob;
}

describe("TAB_FOR_STATUS", () => {
  it("maps every backend status to exactly one real tab", () => {
    expect(Object.keys(TAB_FOR_STATUS).sort()).toEqual([...ALL_STATUSES].sort());
    for (const status of ALL_STATUSES) {
      expect(VIDEO_TAB_ORDER).toContain(TAB_FOR_STATUS[status]);
    }
  });

  it("parks both user-approval gates in Needs you", () => {
    expect(TAB_FOR_STATUS.awaiting_storyboard).toBe("needsYou");
    expect(TAB_FOR_STATUS.awaiting_review).toBe("needsYou");
  });
});

describe("jobsForTab", () => {
  it("partitions jobs without overlap or loss", () => {
    const jobs = ALL_STATUSES.map(job);
    const total = VIDEO_TAB_ORDER.reduce(
      (n, tab) => n + jobsForTab(jobs, tab).length,
      0,
    );
    expect(total).toBe(jobs.length);
    expect(jobsForTab(jobs, "needsYou").map((j) => j.status)).toEqual([
      "awaiting_storyboard",
      "awaiting_review",
    ]);
    expect(jobsForTab(jobs, "onTheWay").map((j) => j.status)).toEqual([
      "queued",
      "submitted",
      "in_progress",
    ]);
    expect(jobsForTab(jobs, "failed")).toHaveLength(1);
    expect(jobsForTab(jobs, "success")).toHaveLength(1);
  });
});

describe("unknown runtime statuses", () => {
  // The backend can ship a status before types.ts knows about it; such a job
  // must stay listed and counted somewhere rather than vanish.
  const unknown = job("rendering_audio" as VideoJobStatus);

  it("keeps an unmapped job visible in On the way", () => {
    expect(jobsForTab([unknown], "onTheWay")).toEqual([unknown]);
    expect(countByTab([unknown])).toEqual({
      needsYou: 0,
      onTheWay: 1,
      failed: 0,
      success: 0,
    });
    expect(defaultTab([unknown])).toBe("onTheWay");
  });
});

describe("countByTab", () => {
  it("counts every job exactly once", () => {
    const counts = countByTab(ALL_STATUSES.map(job));
    expect(counts).toEqual({ needsYou: 2, onTheWay: 3, failed: 1, success: 1 });
  });
});

describe("defaultTab", () => {
  it("lands on the first non-empty tab in attention order", () => {
    expect(defaultTab([job("failed"), job("completed")])).toBe("failed");
    expect(defaultTab([job("completed"), job("awaiting_review")])).toBe("needsYou");
    expect(defaultTab([])).toBe("success");
  });
});
