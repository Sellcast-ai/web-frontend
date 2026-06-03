import { Badge } from "@/components/ui/badge";
import type { VideoJobStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const MAP: Record<
  VideoJobStatus,
  { label: string; className: string; dot: string }
> = {
  queued: { label: "Queued", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  submitted: { label: "Submitted", className: "bg-brand-100 text-brand-800", dot: "bg-brand-500" },
  in_progress: { label: "Rendering", className: "bg-brand-100 text-brand-800", dot: "bg-brand-500 animate-pulse" },
  awaiting_review: { label: "Needs review", className: "bg-[#fff1e0] text-[#9a5a00] dark:bg-[#3a2a10] dark:text-warning", dot: "bg-warning" },
  completed: { label: "Ready", className: "bg-success-soft text-success", dot: "bg-success" },
  failed: { label: "Failed", className: "bg-[#ffe4e9] text-[#a31432] dark:bg-[#3a141d] dark:text-rose", dot: "bg-rose" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: VideoJobStatus;
  className?: string;
}) {
  const s = MAP[status] ?? MAP.queued;
  return (
    <Badge className={cn(s.className, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}
