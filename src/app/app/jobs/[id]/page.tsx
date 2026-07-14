/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Check,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Eye,
  Share2,
} from "lucide-react";
import { useVideoJob, useBeatAction, useRetryJob } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mediaUrl, relativeTime } from "@/lib/format";
import { VIDEO_STYLES } from "@/lib/api/types";
import type { VideoJob, VideoJobBeat, BeatReviewStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STEPS = ["Script", "Beats", "Review", "Render", "Ready"] as const;

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

function stepIndex(job: VideoJob): number {
  switch (job.status) {
    case "queued":
      // Re-queued after the review gate (all beats approved) → the worker is
      // resuming at render, so advance to "Render" instead of jumping back to
      // "Beats". The initial queue (no beats yet) still sits at "Script".
      if (allBeatsApproved(job)) return 3;
      return job.beats.length ? 1 : 0;
    case "submitted":
      return 1;
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

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, dataUpdatedAt } = useVideoJob(id);

  if (isLoading || !job) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const styleLabel =
    VIDEO_STYLES[job.mode]?.find((s) => s.value === job.style)?.label ?? job.style;
  const active = ["queued", "submitted", "in_progress", "awaiting_review"].includes(
    job.status,
  );

  return (
    <div className="container-page py-8">
      <Link
        href="/app/videos"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        My Videos
      </Link>

      {/* header */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {job.product_image_url && (
            <img
              src={mediaUrl(job.product_image_url)}
              alt=""
              className="h-14 w-14 rounded-xl object-cover"
            />
          )}
          <div>
            <h1 className="font-display text-xl font-bold text-ink">
              {job.product_name ?? "Your video"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {styleLabel} · {job.duration_seconds}s · {job.aspect_ratio} ·{" "}
              {relativeTime(job.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {active && <LiveIndicator updatedAt={dataUpdatedAt} />}
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* progress */}
      <Progress current={stepIndex(job)} failed={job.status === "failed"} />

      {/* state-specific body */}
      {job.status === "completed" && job.video_url ? (
        <CompletedView job={job} />
      ) : job.status === "failed" ? (
        <FailedView job={job} />
      ) : job.status === "awaiting_review" ? (
        <ReviewView job={job} />
      ) : (
        <WorkingView job={job} />
      )}

      {/* full script — clean structured render from the beats, no internal
          prompt directives ([MUST KEEP]/[MUST AVOID]) or repeated persona */}
      {job.beats.length > 0 && (
        <details className="mt-8 rounded-card border border-border bg-card p-5">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Full script
          </summary>
          <div className="mt-4 space-y-4">
            {job.beats.map((b) => (
              <div key={b.beat_index} className="border-l-2 border-brand-200 pl-3">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                  {beatLabel(b.beat_index, job.beats.length)}
                  {b.duration ? ` · ${b.duration}s` : ""}
                </p>
                {b.dialogue && <p className="mt-1 text-sm text-ink">{b.dialogue}</p>}
                {b.on_screen_text && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Caption:{" "}
                    <span className="font-medium text-ink-soft">{b.on_screen_text}</span>
                  </p>
                )}
                {b.scene && <p className="mt-1 text-xs text-muted-foreground">{b.scene}</p>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- live */

/** Subtle "this page is polling" affordance: pulsing dot + last-fetch time. */
function LiveIndicator({ updatedAt }: { updatedAt: number }) {
  // starts at updatedAt (secs = 0) and ticks forward once a second
  const [now, setNow] = useState(updatedAt);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - updatedAt) / 1000));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
      </span>
      Live · updated {secs < 5 ? "just now" : `${secs}s ago`}
    </span>
  );
}

/* --------------------------------------------------------------- progress */

function Progress({ current, failed }: { current: number; failed: boolean }) {
  return (
    <div className="mt-6 flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  failed && isCurrent
                    ? "bg-rose text-white"
                    : done
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-brand-gradient text-white"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:block",
                  isCurrent ? "text-ink" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  done ? "bg-success" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- working */

function WorkingView({ job }: { job: VideoJob }) {
  return (
    <div className="mt-8">
      <div className="rounded-card border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white">
          <Sparkles className="h-7 w-7" />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-ink">
          {job.beats.length
            ? "Rendering your beats…"
            : "Writing your grounded script…"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          This page updates automatically. You can leave and come back.
        </p>
      </div>
      {job.beats.length > 0 && <BeatGrid beats={job.beats} />}
    </div>
  );
}

/* ----------------------------------------------------------------- review */

function ReviewView({ job }: { job: VideoJob }) {
  const action = useBeatAction(job.id);

  return (
    <div className="mt-8">
      <div className="flex items-start gap-3 rounded-card border border-brand-200 bg-accent p-4">
        <Eye className="mt-0.5 h-5 w-5 text-accent-foreground" />
        <div>
          <p className="font-semibold text-ink">Review your beats</p>
          <p className="text-sm text-muted-foreground">
            Approve each shot, or regenerate the ones you don&apos;t love. Lumi
            renders once every beat is approved.
          </p>
        </div>
      </div>

      <BeatGrid beats={job.beats} jobId={job.id} action={action} reviewable />
    </div>
  );
}

/* --------------------------------------------------------------- beat grid */

function beatLabel(i: number, total: number): string {
  if (total <= 3) return ["Hook", "Proof", "Offer"][i] ?? `Shot ${i + 1}`;
  if (i === 0) return "Hook";
  if (i === total - 1) return "CTA";
  return `Shot ${i + 1}`;
}

function BeatGrid({
  beats,
  jobId,
  action,
  reviewable = false,
}: {
  beats: VideoJobBeat[];
  jobId?: string;
  action?: ReturnType<typeof useBeatAction>;
  reviewable?: boolean;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {beats.map((b) => (
        <BeatCard
          key={b.beat_index}
          beat={b}
          label={beatLabel(b.beat_index, beats.length)}
          action={action}
          reviewable={reviewable}
          jobId={jobId}
        />
      ))}
    </div>
  );
}

const BEAT_STATUS: Record<BeatReviewStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
  auto_approved: { label: "Auto ✓", cls: "bg-success-soft text-success" },
  user_approved: { label: "Approved", cls: "bg-success-soft text-success" },
  regen_requested: { label: "Regenerating", cls: "bg-brand-100 text-brand-800" },
};

function BeatCard({
  beat,
  label,
  action,
  reviewable,
}: {
  beat: VideoJobBeat;
  label: string;
  action?: ReturnType<typeof useBeatAction>;
  reviewable: boolean;
  jobId?: string;
}) {
  const img = mediaUrl(beat.reference_image_url);
  const approved =
    beat.review_status === "user_approved" || beat.review_status === "auto_approved";
  const pendingThis =
    action?.isPending && action.variables?.beatIndex === beat.beat_index;
  const s = BEAT_STATUS[beat.review_status];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="relative aspect-9/16 bg-muted">
        {img ? (
          <img src={img} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-gradient/10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-bold text-white">
          {label}
          {beat.duration ? ` · ${beat.duration}s` : ""}
        </span>
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold",
            s.cls,
          )}
        >
          {s.label}
        </span>
        {/* caption preview — burned-in style, mirrors how it appears in the video */}
        {beat.on_screen_text && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-3 pt-10">
            <p className="text-center text-sm font-extrabold leading-tight text-white [text-shadow:_0_1px_4px_rgb(0_0_0_/_55%)]">
              {beat.on_screen_text}
            </p>
          </div>
        )}
      </div>

      {reviewable && action && (
        <div className="flex gap-1.5 p-2">
          <button
            type="button"
            disabled={pendingThis || approved}
            onClick={() =>
              action.mutate({ beatIndex: beat.beat_index, action: "approve" })
            }
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
              approved
                ? "bg-success-soft text-success"
                : "bg-brand-700 text-white hover:bg-brand-800",
            )}
          >
            {approved ? <Check className="h-3.5 w-3.5" /> : null}
            {approved ? "Approved" : "Approve"}
          </button>
          <button
            type="button"
            disabled={pendingThis}
            onClick={() =>
              action.mutate({ beatIndex: beat.beat_index, action: "regenerate" })
            }
            aria-label="Regenerate"
            className="inline-flex items-center justify-center rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground hover:text-ink"
          >
            {pendingThis ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- completed */

function CompletedView({ job }: { job: VideoJob }) {
  const src = mediaUrl(job.video_url);
  async function markPosted() {
    try {
      await api.recordEvent(job.id, { event_type: "posted" });
      toast.success("Marked as posted.");
    } catch {
      toast.error("Couldn't record that. Please try again.");
    }
  }
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[20rem_1fr]">
      <div className="mx-auto w-full max-w-[20rem]">
        <div className="aspect-9/16 overflow-hidden rounded-card border border-border bg-ink shadow-card">
          <video
            src={src}
            poster={mediaUrl(job.thumbnail_url)}
            controls
            playsInline
            className="h-full w-full object-cover"
          />
        </div>
      </div>
      <div>
        <Badge variant="success">Ready to publish</Badge>
        <h2 className="mt-3 font-display text-2xl font-bold text-ink">
          Your video is ready 🎉
        </h2>
        <p className="mt-2 text-muted-foreground">
          A publish-ready 9:16 cut with spoken audio. Download it or mark it
          posted to keep your stats tidy.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            href={job.download_url ?? src ?? "#"}
            size="md"
            {...(job.download_url || src ? { target: "_blank" } : {})}
          >
            Download
          </Button>
          <Button variant="outline" size="md" onClick={markPosted}>
            <Share2 className="h-4 w-4" />
            Mark as posted
          </Button>
        </div>
        {job.beats.length > 0 && <BeatGrid beats={job.beats} />}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- failed */

function FailedView({ job }: { job: VideoJob }) {
  const retry = useRetryJob();
  return (
    <div className="mt-8 flex items-start gap-3 rounded-card border border-rose/30 bg-rose/5 p-5">
      <AlertTriangle className="mt-0.5 h-5 w-5 text-rose" />
      <div>
        <p className="font-semibold text-ink">Generation failed</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.error_message ?? "Something went wrong. Try creating it again."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {/* resumes already-paid work (rendered shots, reference images) */}
          <Button
            size="md"
            onClick={() => retry.mutate(job.id)}
            disabled={retry.isPending}
          >
            {retry.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Retry
              </>
            )}
          </Button>
          <Button href="/app/marketplace" variant="outline" size="md">
            Start a new video
          </Button>
        </div>
      </div>
    </div>
  );
}
