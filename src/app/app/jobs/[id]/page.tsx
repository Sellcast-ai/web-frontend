/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
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
  Trash2,
  Save,
  CreditCard,
  Image as ImageIcon,
  Mic,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import {
  useVideoJob,
  useBeatAction,
  useRetryJob,
  useApproveStoryboard,
  usePatchStoryboard,
  useProduct,
  useDeleteJob,
  useUsage,
  useVideoCapabilities,
  useVideoQuote,
} from "@/lib/api/hooks";
import { DUR, EASE_OUT, PopIn } from "@/components/ui/motion";
import { Drawer, Modal } from "@/components/ui/overlay";
import { ApiError, api, apiErrorMessage } from "@/lib/api/client";
import { aspectFrameClass } from "@/lib/aspect-frame";
import { videoJobFailureKey } from "@/lib/failure-messages";
import { toast } from "@/lib/toast";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mediaUrl, relativeTime } from "@/lib/format";
import { STUDIO_HREF } from "@/lib/launch-routes";
import {
  OUTCOME_NUDGE_LABEL_KEYS,
  knownOutcomeNudges,
} from "@/lib/outcome-nudges";
import { orderedSubjects, SUBJECT_HEADING_KEYS } from "@/lib/subjects";
import { STEP_LABEL_KEYS, stepIndex } from "@/lib/job-progress";
import { isQuotable, priceUnknownReason, verifiedCredits } from "@/lib/render-quote";
import {
  normalizeVideoCapabilities,
  videoModelKeyForProviderModel,
} from "@/lib/video-capabilities";
import { useMutationGuard } from "@/lib/mutation-guard";
import { VIDEO_STYLES, OUTCOME_NUDGES } from "@/lib/api/types";
import type {
  VideoJob,
  VideoJobBeat,
  BeatReviewStatus,
  Storyboard,
  Shot,
  ShotTransition,
  ProductVisibility,
  OutcomeNudge,
  SubjectLock,
  VideoStyle,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type StyleLabelKey =
  | "avatarTalkingIntro"
  | "avatarDemoExplainer"
  | "avatarTestimonial"
  | "avatarHostProduct"
  | "productCleanShowcase"
  | "productFeatureHighlights"
  | "productUnboxing"
  | "productOfferFocused";

const STYLE_LABEL_KEYS: Partial<Record<VideoStyle, StyleLabelKey>> = {
  avatar_talking_intro: "avatarTalkingIntro",
  avatar_demo_explainer: "avatarDemoExplainer",
  avatar_testimonial: "avatarTestimonial",
  avatar_host_product: "avatarHostProduct",
  product_clean_showcase: "productCleanShowcase",
  product_feature_highlights: "productFeatureHighlights",
  product_unboxing: "productUnboxing",
  product_offer_focused: "productOfferFocused",
};

export default function JobDetailPage() {
  const t = useTranslations("app.jobs");
  const tf = useTranslations("app.format");
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const { data: job, error, isFetching, isLoading, isError, dataUpdatedAt, refetch } =
    useVideoJob(id);
  const [scriptOpen, setScriptOpen] = useState(false);

  if (isError && !job) {
    if (error instanceof ApiError && error.status === 404) return <JobNotFound />;
    return (
      <JobLoadError
        message={apiErrorMessage(error, t("loadError.description"))}
        retrying={isFetching}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !job) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const styleKey = STYLE_LABEL_KEYS[job.style];
  const styleLabel = styleKey
    ? t(`styles.${styleKey}`)
    : VIDEO_STYLES[job.mode]?.find((s) => s.value === job.style)?.label ?? job.style;
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
        {t("backToVideos")}
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
              <ProductLink job={job} />
            </h1>
            <p className="text-sm text-muted-foreground">
              {styleLabel} · {job.duration_seconds}s · {job.aspect_ratio} ·{" "}
              {relativeTime(job.created_at, tf, locale)}
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
            {t("fullScript.view")}
          </Button>
          <Drawer
            open={scriptOpen}
            onClose={() => setScriptOpen(false)}
            title={t("fullScript.title")}
          >
            <div className="space-y-4">
              {job.beats.map((b) => (
                <div key={b.beat_index} className="border-l-2 border-brand-200 pl-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                    {beatLabel(t, b.beat_index, job.beats.length)}
                    {b.duration ? ` · ${b.duration}s` : ""}
                  </p>
                  {b.dialogue && <p className="mt-1 text-sm text-ink">{b.dialogue}</p>}
                  {b.on_screen_text && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("fullScript.caption")}{" "}
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

      {/* danger zone — at the very bottom, away from every routine action */}
      <DeleteVideoSection job={job} />
    </div>
  );
}

function JobNotFound() {
  const t = useTranslations("app.jobs.notFound");
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Film className="h-8 w-8" />
      </div>
      <p className="mt-5 font-display text-xl font-bold text-ink">{t("title")}</p>
      <p className="mt-1 max-w-sm text-muted-foreground">{t("description")}</p>
      <Button href="/app/videos" size="lg" className="mt-6">
        {t("action")}
      </Button>
    </div>
  );
}

function JobLoadError({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("app.jobs.loadError");
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <p className="mt-5 font-display text-xl font-bold text-ink">{t("title")}</p>
      <p className="mt-1 max-w-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="lg" className="mt-6" onClick={onRetry} disabled={retrying}>
        {retrying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {t("action")}
      </Button>
    </div>
  );
}

/** The job's source product, linked through to My Products. A video outlives
 *  its product (the backend keeps name + thumbnail on the job), so when the
 *  product is gone — the only 404 the owner's own product can produce here —
 *  the link degrades to a labelled, non-navigating span instead of a dead
 *  route. Other failures (network) leave the link in place. */
function ProductLink({ job }: { job: VideoJob }) {
  const t = useTranslations("app.jobs");
  const { isError, error } = useProduct(job.product_id);
  const name = job.product_name ?? t("videoFallback");
  if (isError && error instanceof ApiError && error.status === 404) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        {name}
        <Badge variant="outline" size="sm" className="font-sans">
          {t("product.deleted")}
        </Badge>
      </span>
    );
  }
  return (
    <Link
      href={`/app/products/${job.product_id}`}
      title={t("product.view")}
      className="underline-offset-4 hover:text-brand-700 hover:underline"
    >
      {name}
    </Link>
  );
}

/** Permanent delete, no refund (captain's decision, settled). The modal says
 *  plainly the video cannot be recovered. Deleting an unfinished job is still
 *  a delete — this never touches the backend's cancel/refund path. */
function DeleteVideoSection({ job }: { job: VideoJob }) {
  const t = useTranslations("app.jobs.delete");
  const tt = useTranslations("app.toasts");
  const router = useRouter();
  const del = useDeleteJob({ deleteError: tt("deleteVideoFailed") });
  const [confirming, setConfirming] = useState(false);
  // Synchronous latch: `disabled={del.isPending}` only engages after React
  // re-renders, so a same-tick double-click fires DELETE twice — the second
  // one detached the observer, swallowed the success toast + navigation, and
  // stranded the user on the deleted video's page (audit L4 P1-1).
  const deleteGuard = useMutationGuard();
  return (
    <div className="mt-12 border-t border-border pt-6">
      <Button
        variant="outline"
        size="sm"
        className="border-danger/40 text-danger hover:bg-rose/5 hover:text-danger"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-4 w-4" />
        {t("button")}
      </Button>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("title")}
      >
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            className="bg-rose shadow-none hover:bg-rose/90"
            disabled={del.isPending}
            onClick={() => {
              if (!deleteGuard.tryBegin()) return;
              del.mutate(job.id, {
                onSuccess: () => {
                  toast.success(tt("videoDeleted"));
                  router.push("/app/videos");
                },
                onSettled: deleteGuard.end,
              });
            }}
          >
            {del.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t("confirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ----------------------------------------------------------------- live */

/** Subtle "this page is polling" affordance: pulsing dot + last-fetch time. */
function LiveIndicator({ updatedAt }: { updatedAt: number }) {
  const t = useTranslations("app.jobs.live");
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
      {t("updated", {
        time: secs < 5 ? t("justNow") : t("secondsAgo", { seconds: secs }),
      })}
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
                  className="absolute inset-0 origin-left rounded-full bg-success dark:bg-live"
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
  const t = useTranslations("app.jobs.working");
  return (
    <div className="mt-8">
      <div className="rounded-card border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white">
          <Sparkles className="h-7 w-7" />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-ink">
          {job.beats.length
            ? t("renderingBeats")
            : t("writingScript")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>
      {job.beats.length > 0 && (
        <BeatGrid beats={job.beats} frameClass={aspectFrameClass(job.aspect_ratio)} />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- review */

function ReviewView({ job }: { job: VideoJob }) {
  const t = useTranslations("app.jobs.review");
  const tt = useTranslations("app.toasts");
  const action = useBeatAction(job.id, {
    approveError: tt("approveShotFailed"),
    regenerateError: tt("regenerateShotFailed"),
    outOfCredits: tt("outOfCredits"),
  });

  return (
    <div className="mt-8">
      <div className="flex items-start gap-3 rounded-card border border-brand-200 bg-accent p-4">
        <Eye className="mt-0.5 h-5 w-5 text-accent-foreground" />
        <div>
          <p className="font-semibold text-ink">{t("title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      <BeatGrid
        beats={job.beats}
        jobId={job.id}
        frameClass={aspectFrameClass(job.aspect_ratio)}
        action={action}
        reviewable
      />
    </div>
  );
}

/* ------------------------------------------------------------- storyboard */

const TRANSITION_LABEL_KEYS: Record<ShotTransition, string> = {
  cut: "hardCut",
  dissolve: "dissolve",
  slide: "slide",
  fade: "fade",
  match_cut: "matchCut",
};

const PRODUCT_VISIBLE_LABEL_KEYS: Record<ProductVisibility, string> = {
  start: "start",
  throughout: "throughout",
  end: "end",
  none: "none",
};

/** Empty text fields go back as null; unknown nudge strings never round-trip. */
function normalizeStoryboard(sb: Storyboard): Storyboard {
  return {
    ...sb,
    shots: sb.shots.map((s) => ({
      ...s,
      dialogue: s.dialogue?.trim() ? s.dialogue : null,
      on_screen_text: s.on_screen_text?.trim() ? s.on_screen_text : null,
      outcome_nudges: knownOutcomeNudges(s.outcome_nudges),
      nudge_note: s.nudge_note?.trim() ? s.nudge_note : "",
    })),
  };
}

/** Warm, human shot label for the storyboard (vs the internal Hook/Proof/Offer). */
function storyboardShotLabel(
  t: ReturnType<typeof useTranslations>,
  i: number,
  total: number,
): string {
  if (i === 0) return t("shotLabels.hook");
  if (i === total - 1) return t("shotLabels.callToAction");
  return t("shotLabels.shot", { number: i + 1 });
}

function storyboardShotEditLabel(
  t: ReturnType<typeof useTranslations>,
  i: number,
  total: number,
): string {
  if (i === 0) return t("shotLabels.hookLower");
  if (i === total - 1) return t("shotLabels.callToActionLower");
  return t("shotLabels.shotLower", { number: i + 1 });
}

/** The storyboard gate: the user reviews the AI-written shot-list as read-first
 *  visual cards, taps a card to tweak a line, then approves to run hands-off.
 *  Edits PATCH the whole VideoScript (the backend re-validates it). */
function StoryboardView({ job }: { job: VideoJob }) {
  const t = useTranslations("app.jobs.storyboard");
  const tt = useTranslations("app.toasts");
  const approve = useApproveStoryboard(job.id, {
    approveError: tt("approveStoryboardFailed"),
    outOfCredits: tt("outOfCredits"),
  });
  // What approving actually costs, priced off the job's own stored render
  // configuration - `resolution` is the clamped value the charge is priced at,
  // so this is the same tuple the debit runs through. The model is the job's
  // own `provider_model`, resolved back to the picker key the quote takes via
  // the capability read's `model_id` pairing: quoting the mode's default
  // instead would be the render's real price only by coincidence, and silently
  // wrong at the one click that spends.
  const capabilities = useVideoCapabilities();
  const caps = useMemo(
    () => normalizeVideoCapabilities(capabilities.data),
    [capabilities.data],
  );
  const videoModel = videoModelKeyForProviderModel(caps, job.mode, job.provider_model);
  // Nothing is quoted until that lookup has had its chance, so the bar can't
  // flash a default-priced number and then correct itself.
  const quoteParams = capabilities.isPending
    ? null
    : {
        mode: job.mode,
        duration_seconds: job.duration_seconds,
        resolution: job.resolution,
        aspect_ratio: job.aspect_ratio,
        ...(videoModel ? { video_model: videoModel } : {}),
      };
  const quote = useVideoQuote(quoteParams);
  const { data: usage, refetch: refetchUsage } = useUsage();
  // Only ever THIS render's price, through the same `verifiedCredits` Studio's
  // rail runs: a quote the backend priced on some other model - the mode
  // default, because the key couldn't be resolved - is a plausible wrong
  // number, which is worse here than no number at all.
  const { credits: cost, withheld: costWithheld } = verifiedCredits(
    quote.data,
    job.provider_model,
  );
  // ...and when there is no number, the bar says why rather than letting the
  // price quietly disappear - and says WHICH why, because the two make very
  // different promises. `priceUnknownReason` is that one classification, shared
  // with Studio's rail: it reads the response class rather than which of the
  // two reads failed. Settled without any failure at all is this surface's own
  // half - a read that landed and still leaves THIS job unpriceable, because
  // its model isn't in the payload (so the backend priced its own default and
  // said so through `model_id`) or the row is missing a field the quote needs
  // (`isQuotable`, the same gate the hook uses, so that one never became a
  // request). Copy that invited a wait there would leave the user watching for
  // a number that is never coming.
  const priceUnknown = priceUnknownReason(
    [capabilities, quote],
    (quoteParams !== null && !isQuotable(quoteParams)) || costWithheld,
  );
  // What the balance means for this approve, split on how certain the outcome
  // is rather than on how big the gap is. An empty meter is certain - zero is
  // zero at any price, the backend refuses whatever the quote says and whether
  // or not one landed - so it gets definite copy, never the ceiling's hedge,
  // and it is the one thing on this bar that also changes the button: the copy
  // and the control are read off this same value, or a page that says the
  // approve won't go through would still offer it. What the button becomes is
  // save-only, never dead: this PATCH is the ONLY path a shot edit has to the
  // server, so disabling it would silently throw the user's rewrite away.
  // A non-empty balance under the quoted ceiling is genuinely uncertain, since
  // the debit prices the storyboard's shorter post-overlap length, so that one
  // keeps the hedge and stays a warning.
  const noCredits = usage !== undefined && usage.remaining <= 0;
  const shortfall =
    usage !== undefined && !noCredits && cost !== undefined && cost > usage.remaining
      ? cost - usage.remaining
      : null;
  const patch = usePatchStoryboard(job.id, {
    saveError: tt("saveStoryboardEditsFailed"),
  });
  const [draft, setDraft] = useState<Storyboard | null>(job.storyboard);
  const [editing, setEditing] = useState<number | null>(null);
  // Synchronous latch on approve: a same-tick double-click fired PATCH ×2 +
  // approve ×2, and the second approve's 409 toasted a raw English error over
  // an action that had actually succeeded (audit L4 P1-1 sister symptom).
  const approveGuard = useMutationGuard();

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
  const hookAngle = draft.hook_angle?.trim() ?? "";
  const audience = draft.audience?.trim() ?? "";
  const hasContext = Boolean(hookAngle || audience);

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
    if (!approveGuard.tryBegin()) return;
    try {
      // Persist pending edits (re-validated) before the render kicks off; bail if
      // validation fails so the user can fix the offending shot.
      if (dirty && !(await save())) return;
      // At zero credits the approve is a refusal the page has already stated,
      // so the button only does the half it can deliver: the edits land, and
      // no request is spent on an outcome known before it started. The saved
      // balance read is refreshed after, so credits bought elsewhere bring the
      // approve back without a reload.
      if (noCredits) {
        await refetchUsage();
        return;
      }
      await approve.mutateAsync().catch(() => null);
    } finally {
      approveGuard.end();
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-start gap-3 rounded-card border border-brand-200 bg-accent p-4">
        <Clapperboard className="mt-0.5 h-5 w-5 text-accent-foreground" />
        <div>
          <p className="font-semibold text-ink">{t("title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      {/* locked-subjects strip — "this is your product / host / scene". Omitted
          until the worker has written the subject rows (image step), and on
          jobs that predate the feature. */}
      <SubjectStrip subjects={job.subjects} />

      {hasContext && (
        <div className="mt-5 grid gap-3 rounded-card border border-border bg-card p-4 shadow-soft sm:grid-cols-2">
          {hookAngle && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("context.angle")}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{hookAngle}</p>
            </div>
          )}
          {audience && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("context.audience")}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{audience}</p>
            </div>
          )}
        </div>
      )}

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
            label={storyboardShotLabel(t, i, draft.shots.length)}
            imageUrl={mediaUrl(job.product_image_url)}
            frameClass={aspectFrameClass(job.aspect_ratio)}
            onEdit={() => setEditing(i)}
          />
        ))}
      </div>

      {/* action bar — sticky and out of the card flow, so it never covers a card */}
      <div
        ref={barRef}
        className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-card/95 p-4 shadow-card backdrop-blur"
      >
        {/* Three live states, each labelled as what the click actually does,
            so no control ever overstates itself: approve when the meter can
            pay, save-only when it can't but there are edits to persist (this
            PATCH is the ONLY path a shot edit has to the server), and the way
            out when it can't and there is nothing to save - the same /pricing
            route the note beside it names. The gate never ends up with a dead
            control, and topping up and coming back remounts this page, which
            is what refreshes the balance read. */}
        {noCredits && !dirty ? (
          <Button size="lg" href="/pricing">
            <CreditCard className="h-4 w-4" />
            {t("getCredits")}
          </Button>
        ) : (
          <Button size="lg" onClick={approveAndGenerate} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : noCredits ? (
              <>
                <Save className="h-4 w-4" />
                {t("saveEdits")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("approveAndMake")}
              </>
            )}
          </Button>
        )}
        {/* The price sits in the bar's existing sentence slot rather than on
            the button: this is the line the user reads immediately before the
            click that spends, the bar is sticky so it is on screen for the
            whole review, and a button label carrying a number truncates first
            on narrow screens. Until the quote lands - and if it never does -
            the bar keeps the vague-but-true note it has always had, so nothing
            here can ever block or delay approving. It is a permanent live
            region: the sentence swaps from the vague note to the price (or to
            why there isn't one) as the reads land, and this is the line read
            immediately before the click that spends. */}
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {cost === undefined ? (
            <>
              {t("creditNote")}
              {/* A price that failed to load is named, not omitted: the user is
                  about to spend, and silence would read as "no cost here". */}
              {priceUnknown === "settled"
                ? ` ${t("priceNotQuotable")}`
                : priceUnknown === "retrying"
                  ? ` ${t("priceUnavailable")}`
                  : null}
            </>
          ) : (
            <>
              <strong className="font-semibold text-ink">
                {t("costNote", { cost })}
              </strong>
              {/* Two independent sentences, so a missing usage read costs the
                  balance and not the price. */}
              {usage && ` ${t("balanceNote", { remaining: usage.remaining })}`}
            </>
          )}
          {/* This is the click that actually spends, so a balance that can't
              cover the render is named rather than left as two adjacent numbers
              to compare, and always with the one route that resolves it. Which
              sentence depends on how certain the refusal is: an empty meter
              states it plainly (and is the branch that turns the button
              save-only, or sends it to /pricing when there is nothing to
              save), a gap under the ceiling keeps the same hedge Studio's
              warning carries, because the debit is usually lower and approving
              is not blocked there. */}
          {(noCredits || shortfall !== null) && (
            <>
              {" "}
              <span className="font-semibold text-ink">
                {shortfall !== null
                  ? t("shortfallNote", { shortfall })
                  : t("noCreditsNote")}
              </span>
              {/* The route out is named once. In the one branch where the
                  bar's primary button already IS /pricing ("Get credits"),
                  a second link to the same place under a second label would
                  make the bar read as two different offers. */}
              {!(noCredits && !dirty) && (
                <>
                  {" "}
                  <Link href="/pricing" className="font-semibold text-brand-700">
                    {t("seePlans")}
                  </Link>
                </>
              )}
            </>
          )}
        </p>
      </div>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing !== null
            ? t("editTitle", {
                label: storyboardShotEditLabel(t, editing, draft.shots.length),
              })
            : t("editFallbackTitle")
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
  const t = useTranslations("app.jobs.subjects");
  const items = orderedSubjects(subjects);
  if (items.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t("heading")}
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
  const tj = useTranslations("app.jobs.subjects");
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
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-success dark:text-live">
            <Lock className="h-3 w-3" />
            {tj("locked")}
          </span>
        )}
      </div>
    </div>
  );
}

/** One shot line: an icon a sighted seller can tell apart at a glance plus the
 *  same distinction spelled out for assistive tech, because Latin quote marks
 *  are not a dialogue convention in every locale we ship. */
function ShotLine({
  icon: Icon,
  label,
  text,
  emptyText,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
  emptyText: string;
}) {
  return (
    <p className="mt-2 flex gap-1.5 text-sm leading-snug">
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
      />
      <span className="sr-only">{label}</span>
      {text ? (
        <span className="line-clamp-3 text-ink">{text}</span>
      ) : (
        <span className="italic text-muted-foreground">{emptyText}</span>
      )}
    </p>
  );
}

/** Read-first shot card: an on-screen-text preview in the job's own output
 *  shape + the spoken line stacked above the visual plan, both at equal weight
 *  (the line is what gets spoken and what the drawer can edit; the visual is
 *  read-only, so it may not displace it), with director metadata tucked into
 *  the tap-to-edit drawer. */
function ShotCard({
  shot,
  label,
  imageUrl,
  frameClass,
  onEdit,
}: {
  shot: Shot;
  label: string;
  imageUrl?: string;
  frameClass: string;
  onEdit: () => void;
}) {
  const t = useTranslations("app.jobs.shotCard");
  const te = useTranslations("app.jobs.shotEditor");
  const nudges = knownOutcomeNudges(shot.outcome_nudges);
  const visual = shot.visual?.trim() ?? "";
  const dialogue = shot.dialogue?.trim() ?? "";
  const hint =
    nudges.length > 0
      ? nudges.map((n) => te(`nudgeLabels.${OUTCOME_NUDGE_LABEL_KEYS[n]}`)).join(" · ")
      : shot.nudge_note?.trim() || null;
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
      {/* no shots are generated pre-approval, so show the product photo (it
          already exists) + the on-screen text; fall back to the soft
          placeholder when the job has no product image. Mirrors BeatCard. */}
      <div
        className={cn(
          "relative w-20 shrink-0 overflow-hidden rounded-xl bg-brand-gradient/10 sm:w-24",
          frameClass,
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-5 w-5 text-brand-300" />
          </div>
        )}
        {shot.on_screen_text && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-1.5 pb-1 pt-3">
            <p className="line-clamp-2 text-center text-[10px] font-extrabold leading-tight text-white [text-shadow:_0_1px_4px_rgb(0_0_0_/_55%)]">
              {shot.on_screen_text}
            </p>
          </div>
        )}
      </div>

      {/* read-first content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* fixed black scrim: bg-ink flips near-white in dark mode and the
            white label would go white-on-near-white */}
        <span className="inline-flex w-fit items-center rounded-full bg-black/80 px-2.5 py-0.5 text-[11px] font-bold text-white">
          {label} · {shot.duration}s
        </span>
        <ShotLine
          icon={Mic}
          label={t("spokenLine")}
          text={dialogue}
          emptyText={t("noSpokenLine")}
        />
        <ShotLine
          icon={Eye}
          label={t("visual")}
          text={visual}
          emptyText={t("noVisual")}
        />
        <div className="mt-auto flex items-center gap-2 pt-2">
          {hint && (
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <Camera className="h-3 w-3 shrink-0" />
              <span className="truncate">{hint}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("edit")}
          </button>
        </div>
      </div>
    </div>
  );
}

const EDIT_INPUT_CLS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-brand-300 disabled:opacity-60";

/** Tap-to-edit drawer for one shot. The main path is all plain language:
 *  spoken line, on-screen text, outcome-nudge taps, and a free-text ask. The
 *  raw camera fields (technique, transition, product visibility) — which the
 *  backend derives from the taps/note — live behind a "Pro mode" disclosure,
 *  hidden by default. */
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
  const t = useTranslations("app.jobs.shotEditor");
  const [pro, setPro] = useState(false);
  const active = knownOutcomeNudges(shot.outcome_nudges);

  function toggleNudge(tap: OutcomeNudge) {
    onChange({
      outcome_nudges: active.includes(tap)
        ? active.filter((n) => n !== tap)
        : [...active, tap],
    });
  }

  return (
    <div className="mt-2 space-y-4">
      <EditField label={t("fields.dialogue")}>
        <textarea
          value={shot.dialogue ?? ""}
          onChange={(e) => onChange({ dialogue: e.target.value })}
          disabled={disabled}
          rows={3}
          placeholder={t("placeholders.dialogue")}
          className={cn(EDIT_INPUT_CLS, "resize-y")}
        />
      </EditField>
      <EditField label={t("fields.onScreenText")}>
        <input
          value={shot.on_screen_text ?? ""}
          onChange={(e) => onChange({ on_screen_text: e.target.value })}
          disabled={disabled}
          placeholder={t("placeholders.onScreenText")}
          className={EDIT_INPUT_CLS}
        />
      </EditField>

      <EditField label={t("fields.nudges")}>
        <div className="flex flex-wrap gap-2">
          {OUTCOME_NUDGES.map((tap) => {
            const on = active.includes(tap);
            return (
              <button
                key={tap}
                type="button"
                onClick={() => toggleNudge(tap)}
                disabled={disabled}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                  on
                    ? "border-brand-300 bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-ink",
                )}
              >
                {t(`nudgeLabels.${OUTCOME_NUDGE_LABEL_KEYS[tap]}`)}
              </button>
            );
          })}
        </div>
      </EditField>

      <EditField label={t("fields.nudgeNote")}>
        <textarea
          value={shot.nudge_note ?? ""}
          onChange={(e) => onChange({ nudge_note: e.target.value })}
          disabled={disabled}
          rows={2}
          placeholder={t("placeholders.nudgeNote")}
          className={cn(EDIT_INPUT_CLS, "resize-y")}
        />
      </EditField>

      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setPro((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground hover:text-ink"
        >
          {t("proMode")}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", pro && "rotate-180")}
          />
        </button>
        {pro && (
          <div className="mt-3 space-y-4">
            <p className="text-xs text-muted-foreground">{t("proHint")}</p>
            <EditField label={t("fields.technique")}>
              <input
                value={shot.technique}
                onChange={(e) => onChange({ technique: e.target.value })}
                disabled={disabled}
                placeholder={t("placeholders.technique")}
                className={EDIT_INPUT_CLS}
              />
            </EditField>
            <EditField label={t("fields.transition")}>
              <select
                value={shot.transition_out}
                onChange={(e) =>
                  onChange({ transition_out: e.target.value as ShotTransition })
                }
                disabled={disabled}
                className={EDIT_INPUT_CLS}
              >
                {(Object.keys(TRANSITION_LABEL_KEYS) as ShotTransition[]).map((k) => (
                  <option key={k} value={k}>
                    {t(`transitions.${TRANSITION_LABEL_KEYS[k]}`)}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label={t("fields.productVisible")}>
              <select
                value={shot.product_visible}
                onChange={(e) =>
                  onChange({ product_visible: e.target.value as ProductVisibility })
                }
                disabled={disabled}
                className={EDIT_INPUT_CLS}
              >
                {(Object.keys(PRODUCT_VISIBLE_LABEL_KEYS) as ProductVisibility[]).map((k) => (
                  <option key={k} value={k}>
                    {t(`productVisibility.${PRODUCT_VISIBLE_LABEL_KEYS[k]}`)}
                  </option>
                ))}
              </select>
            </EditField>
          </div>
        )}
      </div>

      <Button className="w-full" onClick={onDone} disabled={disabled}>
        {t("done")}
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

function beatLabel(
  t: ReturnType<typeof useTranslations>,
  i: number,
  total: number,
): string {
  if (total <= 3) {
    return (
      [t("shotLabels.hook"), t("shotLabels.proof"), t("shotLabels.offer")][i] ??
      t("shotLabels.shot", { number: i + 1 })
    );
  }
  if (i === 0) return t("shotLabels.hook");
  if (i === total - 1) return t("shotLabels.cta");
  return t("shotLabels.shot", { number: i + 1 });
}

function BeatGrid({
  beats,
  jobId,
  frameClass,
  action,
  reviewable = false,
}: {
  beats: VideoJobBeat[];
  jobId?: string;
  frameClass: string;
  action?: ReturnType<typeof useBeatAction>;
  reviewable?: boolean;
}) {
  const t = useTranslations("app.jobs");
  return (
    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {beats.map((b) => (
        <BeatCard
          key={b.beat_index}
          beat={b}
          label={beatLabel(t, b.beat_index, beats.length)}
          frameClass={frameClass}
          action={action}
          reviewable={reviewable}
          jobId={jobId}
        />
      ))}
    </div>
  );
}

const BEAT_STATUS: Record<BeatReviewStatus, { labelKey: string; cls: string }> = {
  pending: { labelKey: "pending", cls: "bg-muted text-muted-foreground" },
  auto_approved: {
    labelKey: "autoApproved",
    cls: "bg-success-soft text-success dark:bg-[#123524] dark:text-live",
  },
  user_approved: {
    labelKey: "approved",
    cls: "bg-success-soft text-success dark:bg-[#123524] dark:text-live",
  },
  regen_requested: { labelKey: "regenerating", cls: "bg-brand-100 text-brand-800" },
};

function BeatCard({
  beat,
  label,
  frameClass,
  action,
  reviewable,
}: {
  beat: VideoJobBeat;
  label: string;
  frameClass: string;
  action?: ReturnType<typeof useBeatAction>;
  reviewable: boolean;
  jobId?: string;
}) {
  const t = useTranslations("app.jobs.beatCard");
  const ts = useTranslations("app.jobs.beatStatus");
  const img = mediaUrl(beat.reference_image_url);
  const approved =
    beat.review_status === "user_approved" || beat.review_status === "auto_approved";
  const pendingThis =
    action?.isPending && action.variables?.beatIndex === beat.beat_index;
  const s = BEAT_STATUS[beat.review_status];
  // Synchronous latch per card — `pendingThis` needs a re-render to engage, so
  // a same-tick double-click on Approve/Regenerate would fire the beat action
  // twice (regenerates are billed work).
  const actionGuard = useMutationGuard();

  function runBeatAction(kind: "approve" | "regenerate") {
    if (!action || !actionGuard.tryBegin()) return;
    action.mutate(
      { beatIndex: beat.beat_index, action: kind },
      { onSettled: actionGuard.end },
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className={cn("relative bg-muted", frameClass)}>
        {img ? (
          <img src={img} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-gradient/10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
          {label}
          {beat.duration ? ` · ${beat.duration}s` : ""}
        </span>
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold",
            s.cls,
          )}
        >
          {ts(s.labelKey)}
        </span>
        {/* on-screen-text preview — a storyboard aid only. Caption burn-in is
            disabled in the backend (settings.burn_captions), so this text does
            not appear in the rendered file. See AGENTS.md. */}
        {beat.on_screen_text && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-2 pt-6">
            <p className="line-clamp-2 text-center text-sm font-extrabold leading-tight text-white [text-shadow:_0_1px_4px_rgb(0_0_0_/_55%)]">
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
            onClick={() => runBeatAction("approve")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
              approved
                ? "bg-success-soft text-success dark:bg-[#123524] dark:text-live"
                : "bg-brand-700 text-white hover:bg-brand-800",
            )}
          >
            {approved ? <Check className="h-3.5 w-3.5" /> : null}
            {approved ? t("approved") : t("approve")}
          </button>
          <button
            type="button"
            disabled={pendingThis}
            onClick={() => runBeatAction("regenerate")}
            aria-label={t("regenerate")}
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
  const t = useTranslations("app.jobs.completed");
  const tt = useTranslations("app.toasts");
  const src = mediaUrl(job.video_url);
  const postedGuard = useMutationGuard();
  async function markPosted() {
    if (!postedGuard.tryBegin()) return;
    try {
      await api.recordEvent(job.id, { event_type: "posted" });
      toast.success(tt("markedPosted"));
    } catch {
      toast.error(tt("recordPostedFailed"));
    } finally {
      postedGuard.end();
    }
  }
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[20rem_1fr]">
      <div className="mx-auto w-full max-w-[20rem]">
        <div
          className={cn(
            "overflow-hidden rounded-card border border-border bg-ink shadow-card",
            aspectFrameClass(job.aspect_ratio),
          )}
        >
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
        <Badge variant="success">{t("badge")}</Badge>
        <h2 className="mt-3 font-display text-2xl font-bold text-ink">
          {t("title")}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {t("description")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            href={job.download_url ?? src ?? "#"}
            size="md"
            {...(job.download_url || src ? { target: "_blank" } : {})}
          >
            {t("download")}
          </Button>
          <Button variant="outline" size="md" onClick={markPosted}>
            <Share2 className="h-4 w-4" />
            {t("markPosted")}
          </Button>
        </div>
        {job.beats.length > 0 && (
          <BeatGrid beats={job.beats} frameClass={aspectFrameClass(job.aspect_ratio)} />
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- failed */

function FailedView({ job }: { job: VideoJob }) {
  const t = useTranslations("app.jobs.failed");
  const tt = useTranslations("app.toasts");
  const retry = useRetryJob({
    retryError: tt("retryJobFailed"),
    outOfCredits: tt("outOfCredits"),
  });
  // Synchronous latch — retry resumes billed work, so a same-tick double-click
  // must not fire it twice before `retry.isPending` can engage.
  const retryGuard = useMutationGuard();
  return (
    <div className="mt-8 flex items-start gap-3 rounded-card border border-rose/30 bg-rose/5 p-5">
      <AlertTriangle className="mt-0.5 h-5 w-5 text-rose" />
      <div>
        <p className="font-semibold text-ink">{t("title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {/* never the raw server string: `error_message` is free-form English
              (operator jargon included) - mapped to a catalog key, generic for
              anything unknown (see `failure-messages.ts`) */}
          {t(videoJobFailureKey(job.error_message))}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {/* resumes already-paid work (rendered shots, reference images) */}
          <Button
            size="md"
            onClick={() => {
              if (!retryGuard.tryBegin()) return;
              retry.mutate(job.id, { onSettled: retryGuard.end });
            }}
            disabled={retry.isPending}
          >
            {retry.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {t("retry")}
              </>
            )}
          </Button>
          <Button href={STUDIO_HREF} variant="outline" size="md">
            {t("startNewVideo")}
          </Button>
        </div>
      </div>
    </div>
  );
}
