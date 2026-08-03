/* eslint-disable @next/next/no-img-element */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  UserSquare2,
  Package,
  Sparkles,
  Loader2,
  Eye,
  PackagePlus,
  Link2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import {
  useProduct,
  useCreateJob,
  useUsage,
  useAvatars,
  useMyProducts,
  useVideoJobs,
  useVideoCapabilities,
} from "@/lib/api/hooks";
import { ApiError, api } from "@/lib/api/client";
import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_LANGUAGES,
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
  VIDEO_VIBES,
  type VideoAspectRatio,
  type VideoLanguage,
  type VideoModelKey,
  type VideoResolution,
  type VideoMode,
  type VideoVibe,
  type VideoDuration,
  type VideoJob,
  type VideoJobStatus,
} from "@/lib/api/types";
import { defaultLanguageFor } from "@/lib/language";
import { defaultStyleForMode } from "@/lib/vibe";
import {
  isModeKnownUnavailable,
  optionFor,
  repairMode,
  studioCapabilityState,
  type CapabilityOption,
  type OptionUnavailableReason,
  type StudioCapabilitySelection,
} from "@/lib/video-capabilities";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/app/product-card";
import { StaggerItem } from "@/components/ui/motion";
import { priceRange } from "@/lib/format";
import { NEW_PRODUCT_HREF, PRODUCTS_HREF, STUDIO_HREF } from "@/lib/launch-routes";
import { useMutationGuard } from "@/lib/mutation-guard";
import { isOutOfCreditsError } from "@/lib/quota-error";
import { cn } from "@/lib/utils";

/** Mirrors the backend's MAX_ACTIVE_JOBS_PER_USER: past it, create 409s. The
 *  usage endpoint doesn't expose the cap, so Studio derives it from the jobs
 *  list and pre-flights it before the user configures and clicks (P2-1). The
 *  first jobs page is enough: jobs come newest-first, so anything active is on
 *  it, and the backend cap check stays the authoritative gate regardless. */
const MAX_ACTIVE_JOBS = 3;

/** The statuses the backend's cap counts (`_ACTIVE_STATUSES` in
 *  video_job_repository.py): only jobs the worker still owns. The
 *  awaiting_storyboard/awaiting_review gates are parked on the user and
 *  excluded there, so counting them here would disable Generate over a cap
 *  the backend would not enforce. Kept apart from ACTIVE_JOB_STATUSES, the
 *  polling definition, which does include both gates. */
const CAP_ACTIVE_JOB_STATUSES: VideoJobStatus[] = [
  "queued",
  "submitted",
  "in_progress",
];

/** While the cap note is showing, nothing else refreshes the jobs list
 *  (no polling default, no focus refetch, and mutations can't fire with
 *  Generate disabled), so the note polls for the finish it promises. */
const CAP_POLL_MS = 4000;

function capActiveCount(jobs: VideoJob[] | undefined): number {
  return (jobs ?? []).filter((j) =>
    CAP_ACTIVE_JOB_STATUSES.includes(j.status),
  ).length;
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      }
    >
      <StudioInner />
    </Suspense>
  );
}

type StudioOptionKeys = {
  label: string;
  blurb: string;
};

type ReferenceMode = "link" | "upload";

const VIBE_KEYS: Record<VideoVibe, StudioOptionKeys> = {
  premium_clean: { label: "vibes.premiumClean.label", blurb: "vibes.premiumClean.blurb" },
  fun_fast: { label: "vibes.funFast.label", blurb: "vibes.funFast.blurb" },
  cozy_personal: { label: "vibes.cozyPersonal.label", blurb: "vibes.cozyPersonal.blurb" },
  bold_punchy: { label: "vibes.boldPunchy.label", blurb: "vibes.boldPunchy.blurb" },
  clean_demo: { label: "vibes.cleanDemo.label", blurb: "vibes.cleanDemo.blurb" },
};

const MODES: { value: VideoMode; label: string; blurb: string; Icon: typeof UserSquare2 }[] = [
  {
    value: "ai_avatar",
    label: "modes.aiAvatar.label",
    blurb: "modes.aiAvatar.blurb",
    Icon: UserSquare2,
  },
  {
    value: "product_only",
    label: "modes.productOnly.label",
    blurb: "modes.productOnly.blurb",
    Icon: Package,
  },
];

const MODEL_KEYS: Record<VideoModelKey, StudioOptionKeys> = {
  "seedance-2.0": { label: "models.seedance20.label", blurb: "models.seedance20.blurb" },
  "seedance-2.0-fast": { label: "models.seedance20Fast.label", blurb: "models.seedance20Fast.blurb" },
};

const RESOLUTION_KEYS: Record<VideoResolution, StudioOptionKeys> = {
  "480p": { label: "resolutions.p480.label", blurb: "resolutions.p480.blurb" },
  "720p": { label: "resolutions.p720.label", blurb: "resolutions.p720.blurb" },
  "1080p": { label: "resolutions.p1080.label", blurb: "resolutions.p1080.blurb" },
};

function StudioInner() {
  const t = useTranslations("app.studio");
  const tt = useTranslations("app.toasts");
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const productId = sp.get("product") ?? "";
  const {
    data: product,
    isLoading,
    isError,
    error: productError,
    refetch: refetchProduct,
    isFetching: isFetchingProduct,
  } = useProduct(productId);
  const { data: usage } = useUsage();
  const { data: videoCapabilities } = useVideoCapabilities();
  const { data: jobs } = useVideoJobs({}, (list) =>
    capActiveCount(list) >= MAX_ACTIVE_JOBS ? CAP_POLL_MS : false,
  );
  const create = useCreateJob({
    startError: tt("startVideoFailed"),
    outOfCredits: tt("outOfCredits"),
  });
  const generateGuard = useMutationGuard();

  // Start on the generally available path; capabilities can disable or repair
  // mode-specific choices after the backend reports current provider support.
  const [mode, setMode] = useState<VideoMode>("product_only");
  const [vibe, setVibe] = useState<VideoVibe>("premium_clean");
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("link");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [duration, setDuration] = useState<VideoDuration>(15);
  const [videoModel, setVideoModel] = useState<VideoModelKey>(VIDEO_MODELS[0].value);
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");
  const [avatarId, setAvatarId] = useState<string | null>(null);
  // The backend-metered balance a create was last refused against by the
  // credit meter, plus the render it was judged against. Only a later read
  // showing more credits than that clears the notice - the client has no
  // honest way to price a render (see render-cost.ts), so it must never decide
  // that a cheaper pick would now fit. Reconfiguring doesn't reprice it either;
  // it just makes the refusal stale, so the notice stops describing a render
  // nobody attempted and the next Generate re-tests against the backend.
  const [refused, setRefused] = useState<{ balance: number; render: string } | null>(null);
  const { data: avatars } = useAvatars();
  // Language defaults to the product's source market (shopee.co.id → id)
  // until the user explicitly picks one — derived, so no effect needed.
  const [languageOverride, setLanguageOverride] = useState<VideoLanguage | null>(null);
  const selectedLanguage = languageOverride ?? defaultLanguageFor(product);
  const effectiveMode = repairMode(videoCapabilities, mode);
  const capabilityState = studioCapabilityState(videoCapabilities, {
    mode: effectiveMode,
    videoModel,
    resolution,
    aspectRatio,
    language: selectedLanguage,
  });
  const effectiveVideoModel = capabilityState.repaired.videoModel;
  const effectiveResolution = capabilityState.repaired.resolution;
  const effectiveAspectRatio = capabilityState.repaired.aspectRatio;
  const language = capabilityState.repaired.language;
  // Style is no longer a manual pick — it auto-derives from mode (locked
  // decision #1). We still send it so the backend schema stays intact.
  const style = defaultStyleForMode(effectiveMode);
  // Storyboard review is always on (the default gate); the legacy image-level
  // review_mode stays wired but is no longer user-toggleable.
  const reviewMode = false;

  function selectWithCapabilities(next: Partial<StudioCapabilitySelection>) {
    const repaired = studioCapabilityState(videoCapabilities, {
      mode: effectiveMode,
      videoModel,
      resolution,
      aspectRatio,
      language: selectedLanguage,
      ...next,
    }).repaired;
    if (next.mode) setMode(next.mode);
    if (repaired.videoModel !== videoModel) setVideoModel(repaired.videoModel);
    if (repaired.resolution !== resolution) setResolution(repaired.resolution);
    if (repaired.aspectRatio !== aspectRatio) setAspectRatio(repaired.aspectRatio);
    if (next.language !== undefined || repaired.language !== selectedLanguage) {
      setLanguageOverride(repaired.language);
    }
  }

  // Two backend-metered signals, no client pricing: an empty meter (zero is
  // zero under any rate card, so the user sees it before clicking and Generate
  // is disabled - no render costs nothing), or
  // a refused create, still on the render it refused, whose balance hasn't
  // grown since. `useCreateJob` refetches
  // usage on failure, so a top-up or a plan change clears this on its own; a
  // fresh Generate clears it too. Without a usage read there is no honest
  // balance to quote, so the create toast carries the failure alone.
  const renderKey = [
    effectiveMode,
    vibe,
    duration,
    effectiveVideoModel,
    effectiveResolution,
    effectiveAspectRatio,
  ].join("|");
  const noCredits = usage !== undefined && usage.remaining <= 0;
  const outOfQuota =
    noCredits ||
    (usage !== undefined &&
      refused !== null &&
      refused.render === renderKey &&
      usage.remaining <= refused.balance);
  // Pre-flight the backend's active-jobs cap (see MAX_ACTIVE_JOBS) so the user
  // learns about it before configuring, not from a raw 409 after the click.
  const activeCount = capActiveCount(jobs);
  const atActiveCap = activeCount >= MAX_ACTIVE_JOBS;
  const trimmedReferenceUrl = referenceUrl.trim();
  const linkInvalid =
    referenceMode === "link" &&
    trimmedReferenceUrl.length > 0 &&
    !isSupportedReferenceUrl(trimmedReferenceUrl);
  // The reference actually sent depends on the active tab: a valid pasted link,
  // or the R2 URL returned by a completed upload. Anything else sends nothing.
  const activeReferenceUrl =
    referenceMode === "link"
      ? linkInvalid
        ? ""
        : trimmedReferenceUrl
      : uploadedUrl ?? "";
  const referenceReady = activeReferenceUrl.length > 0;

  async function generate() {
    if (!productId || !capabilityState.canSubmit || linkInvalid || referenceUploading) return;
    // Synchronous latch: `disabled={create.isPending}` cannot catch two clicks
    // in the same tick (audit L4 P0-1 — a triple-click created 3 jobs and
    // charged 45 credits). This rejects the second click before any await.
    if (!generateGuard.tryBegin()) return;
    setRefused(null);
    try {
      // failure is surfaced as a toast by useCreateJob
      const job = await create.mutateAsync({
        product_id: productId,
        mode: effectiveMode,
        style,
        vibe,
        ...(referenceReady ? { reference_url: activeReferenceUrl } : {}),
        duration_seconds: duration,
        review_mode: reviewMode,
        language,
        video_model: effectiveVideoModel,
        resolution: effectiveResolution,
        aspect_ratio: effectiveAspectRatio,
        avatar_id: effectiveMode === "ai_avatar" ? avatarId : null,
      });
      // Success keeps the latch held until navigation unmounts the page.
      router.push(`/app/jobs/${job.id}`);
    } catch (err) {
      // Only the credit meter's own refusal latches the notice (see
      // isOutOfCreditsError - a 429 from an edge rate limiter is not one);
      // everything else is already a toast from useCreateJob.
      // Nothing was charged, so the balance the backend judged is the one the
      // meter already holds. Without a usage read there is no such number, so
      // nothing latches and the toast carries the failure alone - a read
      // landing later is a fresh balance, never evidence of the refusal.
      if (isOutOfCreditsError(err) && usage !== undefined) {
        setRefused({ balance: usage.remaining, render: renderKey });
      }
      generateGuard.end();
    }
  }

  if (!productId) {
    return <PickProduct />;
  }

  const productUnavailable =
    productError instanceof ApiError &&
    (productError.status === 404 || productError.status === 403);

  if (isError && productUnavailable) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">
          {t("productError.title")}
        </h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {t("productError.description")}
        </p>
        <Button href={STUDIO_HREF} size="lg" className="mt-6">
          {t("productError.action")}
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">
          {t("productLoadError.title")}
        </h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {t("productLoadError.description")}
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-6"
          onClick={() => refetchProduct()}
          disabled={isFetchingProduct}
        >
          {isFetchingProduct && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("productLoadError.action")}
        </Button>
      </div>
    );
  }

  const cover = product?.cover_image_url || product?.hero_image_urls?.[0];

  return (
    <div className="container-page py-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* config */}
        <div className="space-y-8">
          {/* vibe — the hero creation control. Style auto-derives from mode. */}
          <Section title={t("sections.vibe")}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {VIDEO_VIBES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVibe(v.value)}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-colors",
                    vibe === v.value
                      ? "border-brand-400 bg-accent"
                      : "border-border bg-card hover:border-border-strong",
                  )}
                >
                  <p className="font-display font-semibold text-ink">
                    {t(VIBE_KEYS[v.value].label)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(VIBE_KEYS[v.value].blurb)}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          {/* reference — optional vibe/energy source, not shot-copying */}
          <Section title={t("sections.reference")}>
            <div className="rounded-card border border-border bg-card p-4">
              <div className="flex flex-wrap gap-2">
                <ReferenceModeButton
                  active={referenceMode === "link"}
                  onClick={() => setReferenceMode("link")}
                  icon={<Link2 className="h-4 w-4" />}
                  label={t("reference.linkTab")}
                />
                <ReferenceModeButton
                  active={referenceMode === "upload"}
                  onClick={() => setReferenceMode("upload")}
                  icon={<Upload className="h-4 w-4" />}
                  label={t("reference.uploadTab")}
                />
              </div>
              {referenceMode === "link" ? (
                <>
                  <label className="mt-3 block">
                    <span className="sr-only">{t("reference.linkLabel")}</span>
                    <input
                      type="url"
                      inputMode="url"
                      value={referenceUrl}
                      onChange={(e) => setReferenceUrl(e.target.value)}
                      placeholder={t("reference.linkPlaceholder")}
                      className={cn(
                        "w-full rounded-xl border bg-background px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-400",
                        linkInvalid ? "border-rose" : "border-border",
                      )}
                    />
                  </label>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {t("reference.linkHelper")}
                    </p>
                    {trimmedReferenceUrl.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setReferenceUrl("")}
                        className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-ink"
                      >
                        {t("reference.uploadRemove")}
                      </button>
                    )}
                  </div>
                  {linkInvalid && (
                    <p className="mt-2 text-xs font-semibold text-danger">
                      {t("reference.invalidUrl")}
                    </p>
                  )}
                </>
              ) : (
                <ReferenceUpload
                  uploadedUrl={uploadedUrl}
                  onChange={setUploadedUrl}
                  onUploadingChange={setReferenceUploading}
                />
              )}
            </div>
          </Section>

          {/* mode */}
          <Section title={t("sections.mode")}>
            <div className="grid grid-cols-2 gap-3">
              {MODES.map((m) => (
                <ModeButton
                  key={m.value}
                  mode={m}
                  selected={effectiveMode === m.value}
                  disabled={isModeKnownUnavailable(videoCapabilities, m.value)}
                  onClick={() => selectWithCapabilities({ mode: m.value })}
                />
              ))}
            </div>
          </Section>

          {/* avatar — who's on screen (avatar mode only) */}
          {effectiveMode === "ai_avatar" && (
            <Section title={t("sections.presenter")}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                <AvatarChoice
                  selected={avatarId === null}
                  onClick={() => setAvatarId(null)}
                  label={t("presenter.auto")}
                  sublabel={t("presenter.autoSublabel")}
                />
                {(avatars ?? []).map((a) => (
                  <AvatarChoice
                    key={a.id}
                    selected={avatarId === a.id}
                    onClick={() => setAvatarId(a.id)}
                    label={a.name}
                    imageUrl={a.image_url}
                  />
                ))}
              </div>
              <Link
                href="/app/avatars"
                className="mt-3 inline-block text-xs font-semibold text-brand-700"
              >
                {t("presenter.manageAvatars")}
              </Link>
            </Section>
          )}

          {/* duration */}
          <Section title={t("sections.duration")}>
            <div className="flex flex-wrap gap-2">
              {VIDEO_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                    duration === d
                      ? "border-brand-400 bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-ink",
                  )}
                >
                  {t("durationSeconds", { duration: d })}
                </button>
              ))}
            </div>
          </Section>

          {/* model — only shown when the selected mode exposes a model picker */}
          {capabilityState.modelPickerVisible && (
            <Section title={t("sections.model")}>
              <div className="grid grid-cols-2 gap-3">
                {capabilityState.models.map((option) => {
                  const m = VIDEO_MODELS.find((model) => model.value === option.value);
                  if (!m) return null;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      disabled={!option.enabled}
                      title={unavailableTitle(option.reason, t)}
                      onClick={() => selectWithCapabilities({ videoModel: m.value })}
                      className={cn(
                        "rounded-2xl border p-3.5 text-left transition-colors",
                        !option.enabled
                          ? "cursor-not-allowed border-border bg-card opacity-60"
                          : effectiveVideoModel === m.value
                            ? "border-brand-400 bg-accent"
                            : "border-border bg-card hover:border-border-strong",
                      )}
                    >
                      <p className="text-sm font-semibold text-ink">
                        {t(MODEL_KEYS[m.value].label)}
                        <UnavailableBadge reason={option.reason} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(MODEL_KEYS[m.value].blurb)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* resolution — render quality */}
          <Section title={t("sections.resolution")}>
            <div className="grid grid-cols-3 gap-3">
              {VIDEO_RESOLUTIONS.map((r) => (
                <ResolutionButton
                  key={r.value}
                  resolution={r}
                  option={optionFor(capabilityState.resolutions, r.value)}
                  selected={effectiveResolution === r.value}
                  onClick={() => selectWithCapabilities({ resolution: r.value })}
                />
              ))}
            </div>
          </Section>

          {/* size — output aspect ratio. All sizes stay selectable in every
              mode; talking-head output may adapt its shape server-side. */}
          <Section title={t("sections.size")}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {VIDEO_ASPECT_RATIOS.map((a) => {
                const option = optionFor(capabilityState.aspectRatios, a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    disabled={!option.enabled}
                    title={unavailableTitle(option.reason, t)}
                    onClick={() => selectWithCapabilities({ aspectRatio: a.value })}
                    className={cn(
                      "rounded-2xl border p-3.5 text-left transition-colors",
                      !option.enabled
                        ? "cursor-not-allowed border-border bg-card opacity-60"
                        : effectiveAspectRatio === a.value
                          ? "border-brand-400 bg-accent"
                          : "border-border bg-card hover:border-border-strong",
                    )}
                  >
                    <p className="text-sm font-semibold text-ink">
                      {a.label}
                      <UnavailableBadge reason={option.reason} />
                    </p>
                    <p className="text-xs text-muted-foreground">{a.blurb}</p>
                  </button>
                );
              })}
            </div>
            {effectiveMode === "ai_avatar" && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("size.avatarHint")}
              </p>
            )}
          </Section>

          {/* language — only voice-QA-validated languages are selectable */}
          <Section title={t("sections.language")}>
            <div className="flex flex-wrap gap-2">
              {VIDEO_LANGUAGES.map((lang) => (
                <LanguageButton
                  key={lang.value}
                  language={lang}
                  option={optionFor(capabilityState.languages, lang.value)}
                  selected={language === lang.value}
                  onClick={() => selectWithCapabilities({ language: lang.value })}
                />
              ))}
            </div>
          </Section>

          {/* storyboard review — always on; this is the product's wedge, not an
              option. The user reviews and approves the storyboard before any
              image or video spend. */}
          <Section title={t("sections.review")}>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <Eye className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                {t("reviewDescription")}
              </p>
            </div>
          </Section>
        </div>

        {/* summary / submit */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-card border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-muted">
                {cover ? (
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : isLoading ? (
                  <div className="h-full w-full animate-pulse bg-muted" />
                ) : (
                  <div className="bg-brand-gradient h-full w-full" />
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-ink">
                  {product?.title ?? t("loading")}
                </p>
                {product && (
                  <p className="text-xs text-muted-foreground">
                    {priceRange(product.price_min, product.price_max, locale, product.currency)}
                  </p>
                )}
              </div>
            </div>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <Row
                label={t("summary.vibe")}
                value={t(VIBE_KEYS[vibe].label)}
              />
              <Row
                label={t("summary.reference")}
                value={referenceReady ? t("summary.referenceAdded") : t("summary.referenceNone")}
              />
              <Row
                label={t("summary.mode")}
                value={t(MODES.find((m) => m.value === effectiveMode)?.label ?? "modes.aiAvatar.label")}
              />
              <Row
                label={t("summary.length")}
                value={t("durationSeconds", { duration })}
              />
              {capabilityState.modelPickerVisible && (
                <Row
                  label={t("summary.model")}
                  value={t(MODEL_KEYS[effectiveVideoModel].label)}
                />
              )}
              <Row
                label={t("summary.resolution")}
                value={t(RESOLUTION_KEYS[effectiveResolution].label)}
              />
              <Row
                label={t("summary.language")}
                value={
                  VIDEO_LANGUAGES.find((l) => l.value === language)?.label ??
                  VIDEO_LANGUAGES[0].label
                }
              />
              <Row label={t("summary.format")} value={effectiveAspectRatio} />
              <Row label={t("summary.review")} value={t("summary.storyboard")} />
            </dl>

            {usage && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t("usageSummary", {
                  remaining: usage.remaining,
                  limit: usage.limit,
                })}
              </p>
            )}
            <Button
              size="lg"
              className="mt-2 w-full"
              onClick={generate}
              disabled={
                create.isPending ||
                !product ||
                atActiveCap ||
                noCredits ||
                !capabilityState.canSubmit ||
                linkInvalid ||
                referenceUploading
              }
            >
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : referenceUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("generateUploading")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("generateVideo")}
                </>
              )}
            </Button>
            {atActiveCap && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("cap.reached", { count: activeCount, limit: MAX_ACTIVE_JOBS })}{" "}
                <Link href="/app/videos" className="font-semibold text-brand-700">
                  {t("cap.viewVideos")}
                </Link>
              </p>
            )}
            {outOfQuota && usage && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("outOfQuota", {
                  remaining: usage.remaining,
                  limit: usage.limit,
                })}{" "}
                <Link href="/pricing" className="font-semibold text-brand-700">
                  {t("seePlans")}
                </Link>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReferenceModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-brand-400 bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ModeButton({
  mode,
  selected,
  disabled,
  onClick,
}: {
  mode: (typeof MODES)[number];
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("app.studio");
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? t("modes.unavailableTitle") : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl border-2 p-4 text-left transition-colors",
        disabled
          ? "cursor-not-allowed border-border bg-card opacity-60"
          : selected
            ? "border-brand-400 bg-accent"
            : "border-border bg-card hover:border-border-strong",
      )}
    >
      <mode.Icon
        className={cn(
          "h-6 w-6",
          selected && !disabled ? "text-brand-700" : "text-muted-foreground",
        )}
      />
      <p className="mt-2 font-display font-semibold text-ink">
        {t(mode.label)}
      </p>
      <p className="text-xs text-muted-foreground">{t(mode.blurb)}</p>
      {disabled && (
        <p className="mt-2 text-xs font-semibold text-danger">
          {t("modes.unavailable")}
        </p>
      )}
    </button>
  );
}

function ResolutionButton({
  resolution,
  option,
  selected,
  onClick,
}: {
  resolution: (typeof VIDEO_RESOLUTIONS)[number];
  option: CapabilityOption<VideoResolution>;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("app.studio");
  return (
    <button
      type="button"
      disabled={!option.enabled}
      title={unavailableTitle(option.reason, t)}
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-3.5 text-left transition-colors",
        !option.enabled
          ? "cursor-not-allowed border-border bg-card opacity-60"
          : selected
            ? "border-brand-400 bg-accent"
            : "border-border bg-card hover:border-border-strong",
      )}
    >
      <p className="text-sm font-semibold text-ink">
        {t(RESOLUTION_KEYS[resolution.value].label)}
        <UnavailableBadge reason={option.reason} />
      </p>
      <p className="text-xs text-muted-foreground">
        {t(RESOLUTION_KEYS[resolution.value].blurb)}
      </p>
    </button>
  );
}

function LanguageButton({
  language,
  option,
  selected,
  onClick,
}: {
  language: (typeof VIDEO_LANGUAGES)[number];
  option: CapabilityOption<VideoLanguage>;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("app.studio");
  return (
    <button
      type="button"
      disabled={!option.enabled}
      title={unavailableTitle(option.reason, t)}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
        !option.enabled
          ? "cursor-not-allowed border-border bg-card text-muted-foreground opacity-60"
          : selected
            ? "border-brand-400 bg-accent text-accent-foreground"
            : "border-border bg-card text-muted-foreground hover:text-ink",
      )}
    >
      {language.label}
      <UnavailableBadge reason={option.reason} />
    </button>
  );
}

// "Coming soon" is a claim about inventory; an option the selected mode can't
// render is built and offered elsewhere, so it gets its own copy.
function unavailableTitle(
  reason: OptionUnavailableReason | null,
  t: (key: "language.comingSoonTitle" | "optionUnavailable.title") => string,
) {
  if (!reason) return undefined;
  return reason === "soon"
    ? t("language.comingSoonTitle")
    : t("optionUnavailable.title");
}

function UnavailableBadge({ reason }: { reason: OptionUnavailableReason | null }) {
  const t = useTranslations("app.studio");
  if (!reason) return null;
  return (
    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide">
      {reason === "soon" ? t("language.soonBadge") : t("optionUnavailable.badge")}
    </span>
  );
}

function AvatarChoice({
  selected,
  onClick,
  label,
  sublabel,
  imageUrl,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  sublabel?: string;
  imageUrl?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "overflow-hidden rounded-2xl border-2 text-left transition-colors",
        selected ? "border-brand-400" : "border-border hover:border-border-strong",
      )}
    >
      <div className="flex aspect-square items-center justify-center bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <Sparkles className="h-6 w-6 text-brand-500" />
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-xs font-semibold text-ink">{label}</p>
        {sublabel && <p className="truncate text-[11px] text-muted-foreground">{sublabel}</p>}
      </div>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-600">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

const SUPPORTED_REFERENCE_HOSTS = [
  "tiktok.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "fb.watch",
  "snapchat.com",
  "pinterest.com",
  "pin.it",
  "twitter.com",
  "x.com",
];

function isSupportedReferenceUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  return SUPPORTED_REFERENCE_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
}

const REFERENCE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const REFERENCE_UPLOAD_ACCEPT = "video/mp4,video/quicktime,video/webm";
const REFERENCE_UPLOAD_MIME = ["video/mp4", "video/quicktime", "video/webm"];

function isAcceptedReferenceVideo(file: File): boolean {
  return (
    REFERENCE_UPLOAD_MIME.includes(file.type) || /\.(mp4|mov|webm)$/i.test(file.name)
  );
}

function ReferenceUpload({
  uploadedUrl,
  onChange,
  onUploadingChange,
}: {
  uploadedUrl: string | null;
  onChange: (url: string | null) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const t = useTranslations("app.studio");
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setUploadingState(next: boolean) {
    setUploading(next);
    onUploadingChange(next);
  }

  useEffect(() => () => onUploadingChange(false), [onUploadingChange]);

  async function handleFile(file: File) {
    setError(null);
    if (!isAcceptedReferenceVideo(file)) {
      setError(t("reference.uploadTypeError"));
      return;
    }
    if (file.size > REFERENCE_UPLOAD_MAX_BYTES) {
      setError(t("reference.uploadSizeError"));
      return;
    }
    onChange(null);
    setFileName(file.name);
    setUploadingState(true);
    setProgress(0);
    try {
      const { url } = await api.uploadReferenceVideo(file, setProgress);
      onChange(url);
    } catch {
      setError(t("reference.uploadFailed"));
      setFileName(null);
    } finally {
      setUploadingState(false);
    }
  }

  function clear() {
    onChange(null);
    setFileName(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  const done = !!uploadedUrl && !uploading;

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept={REFERENCE_UPLOAD_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so re-selecting the SAME file after an error still fires onChange.
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {!fileName && !uploading && !uploadedUrl ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {t("reference.uploadCta")}
        </Button>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm text-ink">
            {fileName ?? t("reference.uploadTab")}
          </span>
          {uploading ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {Math.round(Math.max(progress, 0) * 100)}%
            </span>
          ) : done ? (
            <span className="text-xs font-semibold text-brand-700">
              {t("summary.referenceAdded")}
            </span>
          ) : null}
          {!uploading && (
            <div className="flex shrink-0 items-center gap-3">
              {done && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-xs font-semibold text-muted-foreground hover:text-ink"
                >
                  {t("reference.uploadReplace")}
                </button>
              )}
              <button
                type="button"
                onClick={clear}
                className="text-xs font-semibold text-muted-foreground hover:text-ink"
              >
                {t("reference.uploadRemove")}
              </button>
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{t("reference.uploadHelper")}</p>
      {error && (
        <p className="mt-2 text-xs font-semibold text-danger">{error}</p>
      )}
    </div>
  );
}

function PickProduct() {
  const t = useTranslations("app.studio.pickProduct");
  const { data, isLoading } = useMyProducts();
  const products = data ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <PackagePlus className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {t("description")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href={NEW_PRODUCT_HREF} size="lg">
            {t("addProduct")}
          </Button>
          <Button href={PRODUCTS_HREF} variant="outline" size="lg">
            {t("viewProducts")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button href={NEW_PRODUCT_HREF} size="md" variant="outline">
          <PackagePlus className="h-4 w-4" />
          {t("addProduct")}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <StaggerItem key={p.id} index={i} className="h-full">
            <ProductCard product={p} href={`${STUDIO_HREF}?product=${p.id}`} />
          </StaggerItem>
        ))}
      </div>
    </div>
  );
}
