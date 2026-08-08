"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { jobProgressDisplay } from "@/lib/job-progress";
import type { VideoJob, VideoJobStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const MAP: Record<VideoJobStatus, { className: string; dot: string }> = {
  queued: {
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  submitted: {
    className: "bg-brand-100 text-brand-800",
    dot: "bg-brand-500",
  },
  in_progress: {
    className: "bg-brand-100 text-brand-800",
    dot: "bg-brand-500 animate-pulse",
  },
  awaiting_storyboard: {
    className: "bg-[#fff1e0] text-[#9a5a00] dark:bg-[#3a2a10] dark:text-warning",
    dot: "bg-warning",
  },
  awaiting_review: {
    className: "bg-[#fff1e0] text-[#9a5a00] dark:bg-[#3a2a10] dark:text-warning",
    dot: "bg-warning",
  },
  completed: {
    className: "bg-success-soft text-success dark:bg-[#123524] dark:text-live",
    dot: "bg-success dark:bg-live",
  },
  failed: {
    className: "bg-[#ffe4e9] text-[#a31432] dark:bg-[#3a141d] dark:text-rose",
    dot: "bg-rose",
  },
};

/** `compact` is for badges pinned over a thumbnail, where the full stage
 *  sentence ("Queued for render") wraps to two lines at 320px. A job a worker
 *  has claimed shrinks to the tracker's own step label, drawn from the same
 *  display model so the tile can never name a stage the job page disagrees
 *  with; one still parked in line says so in words rather than leaving colour
 *  and motion the only difference. States that name themselves (ready, failed,
 *  a review gate) keep their own label. */
export function StatusBadge({
  job,
  compact,
  className,
}: {
  job: VideoJob;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("shared.status");
  const tStep = useTranslations("shared.jobProgress");
  const s = MAP[job.status] ?? MAP.queued;
  const display = jobProgressDisplay(job);
  return (
    <Badge className={cn(s.className, className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
      {compact && display.phase
        ? display.phase === "queued"
          ? t("queued")
          : tStep(display.stepKey)
        : t(display.statusLabelKey)}
    </Badge>
  );
}
