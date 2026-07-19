"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { VideoJobStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type StatusLabelKey =
  | "queued"
  | "submitted"
  | "rendering"
  | "reviewStoryboard"
  | "needsReview"
  | "ready"
  | "failed";

const MAP: Record<
  VideoJobStatus,
  { labelKey: StatusLabelKey; className: string; dot: string }
> = {
  queued: {
    labelKey: "queued",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  submitted: {
    labelKey: "submitted",
    className: "bg-brand-100 text-brand-800",
    dot: "bg-brand-500",
  },
  in_progress: {
    labelKey: "rendering",
    className: "bg-brand-100 text-brand-800",
    dot: "bg-brand-500 animate-pulse",
  },
  awaiting_storyboard: {
    labelKey: "reviewStoryboard",
    className: "bg-[#fff1e0] text-[#9a5a00] dark:bg-[#3a2a10] dark:text-warning",
    dot: "bg-warning",
  },
  awaiting_review: {
    labelKey: "needsReview",
    className: "bg-[#fff1e0] text-[#9a5a00] dark:bg-[#3a2a10] dark:text-warning",
    dot: "bg-warning",
  },
  completed: { labelKey: "ready", className: "bg-success-soft text-success", dot: "bg-success" },
  failed: {
    labelKey: "failed",
    className: "bg-[#ffe4e9] text-[#a31432] dark:bg-[#3a141d] dark:text-rose",
    dot: "bg-rose",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: VideoJobStatus;
  className?: string;
}) {
  const t = useTranslations("shared.status");
  const s = MAP[status] ?? MAP.queued;
  return (
    <Badge className={cn(s.className, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {t(s.labelKey)}
    </Badge>
  );
}
