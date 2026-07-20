/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
  FileText,
  Clapperboard,
  Camera,
  Pencil,
  Film,
  ChevronDown,
  Lock,
  Image as ImageIcon,
} from "lucide-react";
import { motion } from "motion/react";
import {
  useVideoJob,
  useBeatAction,
  useRetryJob,
  useApproveStoryboard,
  usePatchStoryboard,
} from "@/lib/api/hooks";
import { DUR, EASE_OUT, PopIn } from "@/components/ui/motion";
import { Drawer } from "@/components/ui/overlay";
import { api } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mediaUrl, relativeTime } from "@/lib/format";
import { orderedSubjects, SUBJECT_HEADING_KEYS } from "@/lib/subjects";
import { STEP_LABEL_KEYS, stepIndex } from "@/lib/job-progress";
import { VIDEO_STYLES } from "@/lib/api/types";
import type {
  VideoJob,
  VideoJobBeat,
  BeatReviewStatus,
  Storyboard,
  Shot,
  ShotTransition,
  ProductVisibility,
  SubjectLock,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, dataUpdatedAt } = useVideoJob(id);
  const [scriptOpen, setScriptOpen] = useState(false);

  if (isLoading || !job) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const styleLabel =
    VIDEO_STYLES[job.mode]?.find((s) => s.value === job.style)?.label ?? job.style;
  const active = [
    "queued",
    "submitted",
    "in_progress",
    "awaiting_storyboard",
    "awaiting_review",
  ].includes(job.status);

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
      ) : job.status === "awaiting_storyboard" ? (
        <StoryboardView job={job} />
      ) : job.status === "awaiting_review" ? (
        <ReviewView job={job} />
      ) : (
        <WorkingView job={job} />
      )}

      {/* full script — clean structured render from the beats, no internal
          prompt directives ([MUST KEEP]/[MUST AVOID]) or repeated persona */}
      {job.beats.length > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="mt-8"
            onClick={() => setScriptOpen(true)}
          >
            <FileText className="h-4 w-4" />
            View full script
          </Button>
          <Drawer
            open={scriptOpen}
            onClose={() => setScriptOpen(false)}
            title="Full script"
          >
            <div className="space-y-4">
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
          </Drawer>
        </>
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
  const t = useTranslations("shared.jobProgress");

  return (
    <div className="mt-6 flex items-center gap-2">
      {STEP_LABEL_KEYS.map((labelKey, i) => {
        const label = t(labelKey);
        const done = i < current;
        const isCurrent = i === current;
        return (
          <div key={labelKey} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-500",
                  failed && isCurrent
                    ? "bg-rose text-white"
                    : done
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-brand-gradient text-white"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <PopIn className="inline-flex">
                    <Check className="h-4 w-4" />
                  </PopIn>
                ) : (
                  i + 1
                )}
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
            {i < STEP_LABEL_KEYS.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-success"
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ duration: DUR.slow, ease: EASE_OUT }}
                />
              </span>
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
  const tt = useTranslations("app.toasts");
  const action = useBeatAction(job.id, {
    approveError: tt("approveShotFailed"),
    regenerateError: tt("regenerateShotFailed"),
  });

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

/* ------------------------------------------------------------- storyboard */

const TRANSITION_LABEL: Record<ShotTransition, string> = {
  cut: "Hard cut",
  dissolve: "Dissolve",
  slide: "Slide",
  fade: "Fade",
  match_cut: "Match cut",
};

const PRODUCT_VISIBLE_LABEL: Record<ProductVisibility, string> = {
  start: "Product at start",
  throughout: "Product throughout",
  end: "Product at end",
  none: "No product shown",
};

/** Empty text fields go back as null so backend preflight doesn't choke on "". */
function normalizeStoryboard(sb: Storyboard): Storyboard {
  return {
    ...sb,
    shots: sb.shots.map((s) => ({
      ...s,
      dialogue: s.dialogue?.trim() ? s.dialogue : null,
      on_screen_text: s.on_screen_text?.trim() ? s.on_screen_text : null,
    })),
  };
}

/** Warm, human shot label for the storyboard (vs the internal Hook/Proof/Offer). */
function shotLabel(i: number, total: number): string {
  if (i === 0) return "Hook";
  if (i === total - 1) return "Call to action";
  return `Shot ${i + 1}`;
}

/** The storyboard gate: the user reviews the AI-written shot-list as read-first
 *  visual cards, taps a card to tweak a line, then approves to run hands-off.
 *  Edits PATCH the whole VideoScript (the backend re-validates it). */
function StoryboardView({ job }: { job: VideoJob }) {
  const tt = useTranslations("app.toasts");
  const approve = useApproveStoryboard(job.id, {
    approveError: tt("approveStoryboardFailed"),
  });
  const patch = usePatchStoryboard(job.id, {
    saveError: tt("saveStoryboardEditsFailed"),
  });
  const [draft, setDraft] = useState<Storyboard | null>(job.storyboard);
  const [editing, setEditing] = useState<number | null>(null);

  // storyboard is present once the worker has written the script; seed draft
  // when a later poll carries it, without clobbering in-progress edits.
  if (!draft && job.storyboard) setDraft(job.storyboard);
  const hasDraft = draft != null;

  // Reserve scroll runway equal to the sticky action bar's real height so the
  // last card never hides behind it. The bar height varies (copy wraps on
  // narrow screens), so measure it rather than hard-coding padding.
  const barRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(0);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBarH(el.offsetHeight));
    ro.observe(el);
    setBarH(el.offsetHeight);
    return () => ro.disconnect();
  }, [hasDraft]);

  // guard the brief window before the first poll carries the storyboard.
  if (!draft) return <WorkingView job={job} />;

  const dirty = JSON.stringify(draft) !== JSON.stringify(job.storyboard);
  const busy = approve.isPending || patch.isPending;

  function editShot(i: number, patchShot: Partial<Shot>) {
    setDraft((d) =>
      d
        ? { ...d, shots: d.shots.map((s, j) => (j === i ? { ...s, ...patchShot } : s)) }
        : d,
    );
  }

  async function save(): Promise<boolean> {
    const updated = await patch.mutateAsync(normalizeStoryboard(draft!)).catch(() => null);
    if (updated?.storyboard) setDraft(updated.storyboard);
    if (updated) toast.success(tt("storyboardSaved"));
    return Boolean(updated);
  }

  async function approveAndGenerate() {
    // Persist pending edits (re-validated) before the render kicks off; bail if
    // validation fails so the user can fix the offending shot.
    if (dirty && !(await save())) return;
    await approve.mutateAsync().catch(() => null);
  }

  return (
    <div className="mt-8">
      <div className="flex items-start gap-3 rounded-card border border-brand-200 bg-accent p-4">
        <Clapperboard className="mt-0.5 h-5 w-5 text-accent-foreground" />
        <div>
          <p className="font-semibold text-ink">Here&apos;s the plan for your video</p>
          <p className="text-sm text-muted-foreground">
            Nothing&apos;s been made yet - this is just the plan. Read it over,
            change any line you want, then hit go and Lumi builds the whole video
            for you.
          </p>
        </div>
      </div>

      {/* locked-subjects strip — "this is your product / host / scene". Omitted
          until the worker has written the subject rows (image step), and on
          jobs that predate the feature. */}
      <SubjectStrip subjects={job.subjects} />

      {/* shot list — bottom padding reserves runway for the sticky bar (§overlap
          fix): it sits between the last card and the bar, not below the bar. */}
      <div
        className="mt-5 space-y-3"
        style={{ paddingBottom: barH ? barH + 24 : undefined }}
      >
        {draft.shots.map((shot, i) => (
          <ShotCard
            key={i}
            shot={shot}
            label={shotLabel(i, draft.shots.length)}
            imageUrl={mediaUrl(job.product_image_url)}
            onEdit={() => setEditing(i)}
          />
        ))}
      </div>

      {/* action bar — sticky and out of the card flow, so it never covers a card */}
      <div
        ref={barRef}
        className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-card/95 p-4 shadow-card backdrop-blur"
      >
        <Button size="lg" onClick={approveAndGenerate} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Approve &amp; make my video
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          This is the only step that uses your credits.
        </p>
      </div>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing !== null
            ? `Edit ${shotLabel(editing, draft.shots.length).toLowerCase()}`
            : "Edit shot"
        }
      >
        {editing !== null && (
          <ShotEditor
            shot={draft.shots[editing]}
            disabled={busy}
            onChange={(patchShot) => editShot(editing, patchShot)}
            onDone={() => setEditing(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

/** The locked-subjects strip: Product / Host / Scene, each a thumbnail + plain
 *  label + a lock indicator, so the user sees "this is unmistakably *my*
 *  product/host/scene" before approving. Read-only for now — unlock/swap needs
 *  a backend endpoint (follow-up); every subject ships locked by default.
 *  Renders nothing when there are no subjects (older jobs / pre-generation). */
function SubjectStrip({ subjects }: { subjects: SubjectLock[] }) {
  const items = orderedSubjects(subjects);
  if (items.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Locked in for every shot
      </p>
      {/* horizontally scrollable on mobile so the three cards never squash */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {items.map((s, i) => (
          <SubjectCard key={`${s.kind}-${i}`} subject={s} />
        ))}
      </div>
    </div>
  );
}

function SubjectCard({ subject }: { subject: SubjectLock }) {
  const t = useTranslations("shared.subjects");
  const img = mediaUrl(subject.image_url);
  return (
    <div className="flex w-44 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card p-2.5 shadow-soft">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-gradient/10">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-brand-300" />
          </div>
        )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t(SUBJECT_HEADING_KEYS[subject.kind])}
          </span>
        <span className="truncate text-sm font-semibold text-ink">
          {subject.label}
        </span>
        {subject.locked && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-success">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
    </div>
  );
}

/** Read-first shot card: a 9:16 caption preview + the spoken line as a quote,
 *  with director metadata tucked into the tap-to-edit drawer. */
function ShotCard({
  shot,
  label,
  imageUrl,
  onEdit,
}: {
  shot: Shot;
  label: string;
  imageUrl?: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
      {/* 9:16 preview — no shots are generated pre-approval, so show the product
          photo (it already exists) + burned-in caption; fall back to the soft
          placeholder when the job has no product image. Mirrors BeatCard. */}
      <div className="relative aspect-9/16 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-gradient/10 sm:w-24">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-5 w-5 text-brand-300" />
          </div>
        )}
        {shot.on_screen_text && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-1.5 pb-1.5 pt-6">
            <p className="text-center text-[10px] font-extrabold leading-tight text-white [text-shadow:_0_1px_4px_rgb(0_0_0_/_55%)]">
              {shot.on_screen_text}
            </p>
          </div>
        )}
      </div>

      {/* read-first content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="inline-flex w-fit items-center rounded-full bg-ink/80 px-2.5 py-0.5 text-[11px] font-bold text-white">
          {label} · {shot.duration}s
        </span>
        {shot.dialogue ? (
          <p className="mt-2 line-clamp-3 text-sm leading-snug text-ink">
            “{shot.dialogue}”
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground">No spoken line</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2">
          {shot.technique && (
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <Camera className="h-3 w-3 shrink-0" />
              <span className="truncate">{shot.technique}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

const EDIT_INPUT_CLS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-brand-300 disabled:opacity-60";

/** Tap-to-edit drawer for one shot. Spoken line + on-screen text up front;
 *  director metadata (technique, transition, product visibility) behind an
 *  Advanced disclosure, hidden by default. */
function ShotEditor({
  shot,
  disabled,
  onChange,
  onDone,
}: {
  shot: Shot;
  disabled: boolean;
  onChange: (patch: Partial<Shot>) => void;
  onDone: () => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  return (
    <div className="mt-2 space-y-4">
      <EditField label="What you say">
        <textarea
          value={shot.dialogue ?? ""}
          onChange={(e) => onChange({ dialogue: e.target.value })}
          disabled={disabled}
          rows={3}
          placeholder="No spoken line for this shot"
          className={cn(EDIT_INPUT_CLS, "resize-y")}
        />
      </EditField>
      <EditField label="On-screen text">
        <input
          value={shot.on_screen_text ?? ""}
          onChange={(e) => onChange({ on_screen_text: e.target.value })}
          disabled={disabled}
          placeholder="No caption"
          className={EDIT_INPUT_CLS}
        />
      </EditField>

      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground hover:text-ink"
        >
          Advanced
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", advanced && "rotate-180")}
          />
        </button>
        {advanced && (
          <div className="mt-3 space-y-4">
            <EditField label="How it's filmed">
              <input
                value={shot.technique}
                onChange={(e) => onChange({ technique: e.target.value })}
                disabled={disabled}
                placeholder="Let Lumi choose the shot"
                className={EDIT_INPUT_CLS}
              />
            </EditField>
            <EditField label="Cut to the next shot">
              <select
                value={shot.transition_out}
                onChange={(e) =>
                  onChange({ transition_out: e.target.value as ShotTransition })
                }
                disabled={disabled}
                className={EDIT_INPUT_CLS}
              >
                {(Object.keys(TRANSITION_LABEL) as ShotTransition[]).map((k) => (
                  <option key={k} value={k}>
                    {TRANSITION_LABEL[k]}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="When the product shows">
              <select
                value={shot.product_visible}
                onChange={(e) =>
                  onChange({ product_visible: e.target.value as ProductVisibility })
                }
                disabled={disabled}
                className={EDIT_INPUT_CLS}
              >
                {(Object.keys(PRODUCT_VISIBLE_LABEL) as ProductVisibility[]).map((k) => (
                  <option key={k} value={k}>
                    {PRODUCT_VISIBLE_LABEL[k]}
                  </option>
                ))}
              </select>
            </EditField>
          </div>
        )}
      </div>

      <Button className="w-full" onClick={onDone} disabled={disabled}>
        Done
      </Button>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
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
  const tt = useTranslations("app.toasts");
  const src = mediaUrl(job.video_url);
  async function markPosted() {
    try {
      await api.recordEvent(job.id, { event_type: "posted" });
      toast.success(tt("markedPosted"));
    } catch {
      toast.error(tt("recordPostedFailed"));
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
  const tt = useTranslations("app.toasts");
  const retry = useRetryJob({ retryError: tt("retryJobFailed") });
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
