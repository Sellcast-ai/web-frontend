/* eslint-disable @next/next/no-img-element */
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  useVideoQuote,
} from "@/lib/api/hooks";
import { ApiError, api } from "@/lib/api/client";
import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_LANGUAGES,
  VIDEO_MODELS,
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
  normalizeVideoCapabilities,
  providerModelForVideoModelKey,
  studioCapabilityState,
  type CapabilityOption,
  type OptionUnavailableReason,
} from "@/lib/video-capabilities";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/app/product-card";
import { StaggerItem } from "@/components/ui/motion";
import { priceRange } from "@/lib/format";
import { NEW_PRODUCT_HREF, PRODUCTS_HREF, STUDIO_HREF } from "@/lib/launch-routes";
import { useMutationGuard } from "@/lib/mutation-guard";
import { isOutOfCreditsError } from "@/lib/quota-error";
import { affordability, priceUnknownReason } from "@/lib/render-quote";
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

// Keyed by the union so a new `VideoMode` literal can't reach a render with no
// label to show for it; the card row keeps this declaration order.
const MODE_META: Record<
  VideoMode,
  { value: VideoMode; label: string; blurb: string; Icon: typeof UserSquare2 }
> = {
  ai_avatar: {
    value: "ai_avatar",
    label: "modes.aiAvatar.label",
    blurb: "modes.aiAvatar.blurb",
    Icon: UserSquare2,
  },
  product_only: {
    value: "product_only",
    label: "modes.productOnly.label",
    blurb: "modes.productOnly.blurb",
    Icon: Package,
  },
};

const MODES = Object.values(MODE_META);

const MODEL_KEYS: Record<VideoModelKey, StudioOptionKeys> = {
  "seedance-2.0": { label: "models.seedance20.label", blurb: "models.seedance20.blurb" },
  "seedance-2.0-fast": { label: "models.seedance20Fast.label", blurb: "models.seedance20Fast.blurb" },
};

const RESOLUTION_KEYS: Record<VideoResolution, StudioOptionKeys> = {
  "480p": { label: "resolutions.p480.label", blurb: "resolutions.p480.blurb" },
  "720p": { label: "resolutions.p720.label", blurb: "resolutions.p720.blurb" },
  "1080p": { label: "resolutions.p1080.label", blurb: "resolutions.p1080.blurb" },
};

// Capability options carry only a value, so their labels are looked up by that
// value - never by position in the static array they were narrowed from.
function byValue<T extends { value: string }>(entries: readonly T[]) {
  return Object.fromEntries(entries.map((entry) => [entry.value, entry])) as Record<
    T["value"],
    T
  >;
}

const ASPECT_RATIO_META = byValue(VIDEO_ASPECT_RATIOS);
const LANGUAGE_META = byValue(VIDEO_LANGUAGES);

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
  const capabilities = useVideoCapabilities();
  const videoCapabilities = capabilities.data;
  const { data: jobs } = useVideoJobs({}, (list) =>
    capActiveCount(list) >= MAX_ACTIVE_JOBS ? CAP_POLL_MS : false,
  );
  const create = useCreateJob({
    startError: tt("startVideoFailed"),
    outOfCredits: tt("outOfCredits"),
  });
  const generateGuard = useMutationGuard();

  // Start on the generally available path; capabilities can disable a mode and
  // narrow its options after the backend reports current provider support.
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
  // credit meter, plus the render it was judged against. This is the residual
  // path now that the quote gate below exists: it covers a refusal the quote
  // couldn't predict (no quote in hand, or a balance drained in another tab
  // between the quote and the click). Only a later read showing more credits
  // than that clears the notice. Reconfiguring doesn't reprice it either; it
  // just makes the refusal stale, so the notice stops describing a render
  // nobody attempted and the next Generate re-tests against the backend.
  const [refused, setRefused] = useState<{ balance: number; render: string } | null>(null);
  const { data: avatars } = useAvatars();
  // Language defaults to the product's source market (shopee.co.id → id)
  // until the user explicitly picks one — derived, so no effect needed.
  const [languageOverride, setLanguageOverride] = useState<VideoLanguage | null>(null);
  const selectedLanguage = languageOverride ?? defaultLanguageFor(product);
  // One validated snapshot per capability read: the mode gate, the repair and
  // the pickers all narrow against the same thing.
  const caps = useMemo(
    () => normalizeVideoCapabilities(videoCapabilities),
    [videoCapabilities],
  );
  // The mode is never repaired for the user: a mode the backend reports off
  // shows as unavailable and blocks Generate while it stays selected, and only
  // a click of theirs leaves it. Moving them - even to a mode that works - is
  // choosing which product they ship, and a transient backend answer must not
  // make that choice. The sub-options below do fall back automatically; those
  // don't change what the render is. That fallback stays derived: only the
  // control the user actually clicked writes state, so a repair narrowing
  // 1080p to 720p under one mode can never outlive the mode that caused it.
  const capabilityState = studioCapabilityState(caps, {
    mode,
    videoModel,
    resolution,
    aspectRatio,
    language: selectedLanguage,
  });
  // "Pick another mode" is only an instruction while another mode can be
  // picked; with every mode reported off it would name a way out the grid
  // doesn't have, so the note names the outage instead.
  const anotherModePickable = MODES.some(
    (m) => m.value !== mode && !isModeKnownUnavailable(caps, m.value),
  );
  const effectiveVideoModel = capabilityState.repaired.videoModel;
  const effectiveResolution = capabilityState.repaired.resolution;
  const effectiveAspectRatio = capabilityState.repaired.aspectRatio;
  const language = capabilityState.repaired.language;
  // Style is no longer a manual pick — it auto-derives from mode (locked
  // decision #1). We still send it so the backend schema stays intact.
  const style = defaultStyleForMode(mode);
  // Storyboard review is always on (the default gate); the legacy image-level
  // review_mode stays wired but is no longer user-toggleable.
  const reviewMode = false;

  // What this exact render costs, from the backend's own quote endpoint. Quoted on
  // the REPAIRED values - the ones the create payload will carry - so the price
  // on screen is the price of the render the button would start, never of the
  // pick a capability narrowing has already moved off. That promise only holds
  // once the capability read has had its chance: until then the repair has
  // nothing to narrow with, so the rail waits on `cost.pending` rather than
  // pricing 1080p a moment before capabilities clamp it to 720p and quietly
  // swapping the number under the user. Vibe and language don't reach pricing,
  // so they don't re-quote. A mode the backend reports unavailable is not
  // priced at all: there is no render to put a number on, the card under
  // Generate already names why, and a refused tuple would come back as "price
  // unavailable" - blaming pricing for a capability outage.
  const quoteParams =
    capabilities.isPending || !capabilityState.modeAvailable
      ? null
      : {
          mode,
          duration_seconds: duration,
          resolution: effectiveResolution,
          aspect_ratio: effectiveAspectRatio,
          ...(effectiveVideoModel ? { video_model: effectiveVideoModel } : {}),
        };
  const quote = useVideoQuote(quoteParams);
  // ...and only ever a price for the model this render would run on, the same
  // check the approve bar makes against a job's `provider_model`: the quote
  // takes a picker KEY and answers with the provider id it actually priced, so
  // a key the backend doesn't know comes back priced on its own default. That
  // is a plausible wrong number, and the fact that the create would substitute
  // identically doesn't make it the configured render's price. Verified only
  // when the capability read named an id to verify against - with no read
  // Studio is running on the static pickers and has nothing to compare, and
  // losing the price there would be an outage of pricing over a capability
  // outage the rail deliberately degrades through.
  const expectedModelId = effectiveVideoModel
    ? providerModelForVideoModelKey(caps, mode, effectiveVideoModel)
    : null;
  const cost =
    expectedModelId === null || quote.data?.model_id === expectedModelId
      ? quote.data?.credits
      : undefined;
  // With no number, the slot says which kind of no: `priceUnknownReason` is the
  // same classification the approve bar uses, so the two surfaces can't drift
  // into calling a re-polled 5xx and a settled 4xx the same thing. The
  // capability read is deliberately not in it - Studio degrades to the static
  // pickers when it fails and still gets a real quote for them. There is no
  // unpriceable tuple to pass either: every field here is a typed literal, so
  // `isQuotable` belongs to the job page, which builds its tuple from wire data.
  // A quote that landed and was withheld above IS settled, though: the backend
  // has answered, and nothing about waiting turns its answer into this model's
  // price.
  const costUnknown = priceUnknownReason(
    [quote],
    quote.data !== undefined && cost === undefined,
  );

  // Three backend-metered signals, no client pricing: the quote against the
  // balance, an empty meter (zero is zero at any price, and it stands even with
  // no quote in hand), or a refused create still on the render it refused whose
  // balance hasn't grown since. `useCreateJob` refetches usage on failure, so a
  // top-up or a plan change clears the last one on its own; a fresh Generate
  // clears it too. Without a usage read there is no honest balance to quote, so
  // the create toast carries the failure alone.
  const renderKey = [
    mode,
    vibe,
    duration,
    effectiveVideoModel ?? "",
    effectiveResolution,
    effectiveAspectRatio,
  ].join("|");
  const noCredits = usage !== undefined && usage.remaining <= 0;
  // Warning only, never a gate: the quote is a ceiling (the debit prices the
  // storyboard's shorter post-overlap length), so "short" cannot mean "too
  // expensive" - disabling Generate on it would refuse renders the user can
  // actually pay for. It states the ceiling against the balance and leaves the
  // decision to the backend, which is the authoritative refusal either way.
  // "unknown" - no quote yet, or a quote that failed - shows no number at all.
  const canAfford = affordability(cost, usage?.remaining);
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
  // Every reason a render cannot start, in one place, so the button and the
  // notice under it can never disagree: a warning that says "it may still go
  // through" is only true while this is true. `create.isPending` is not one of
  // them - that render is already on its way.
  const canGenerate =
    Boolean(product) &&
    !atActiveCap &&
    !noCredits &&
    capabilityState.canSubmit &&
    !linkInvalid &&
    !referenceUploading;

  async function generate() {
    if (!productId || !canGenerate) return;
    // Synchronous latch: `disabled={create.isPending}` cannot catch two clicks
    // in the same tick (audit L4 P0-1 — a triple-click created 3 jobs and
    // charged 45 credits). This rejects the second click before any await.
    if (!generateGuard.tryBegin()) return;
    setRefused(null);
    try {
      // failure is surfaced as a toast by useCreateJob
      const job = await create.mutateAsync({
        product_id: productId,
        mode,
        style,
        vibe,
        ...(referenceReady ? { reference_url: activeReferenceUrl } : {}),
        duration_seconds: duration,
        review_mode: reviewMode,
        language,
        // Omitted when this mode offers no model we can stand behind: the
        // field is optional and the backend then picks its own default,
        // rather than being handed a model it just said it doesn't offer.
        ...(effectiveVideoModel ? { video_model: effectiveVideoModel } : {}),
        resolution: effectiveResolution,
        aspect_ratio: effectiveAspectRatio,
        avatar_id: mode === "ai_avatar" ? avatarId : null,
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
                  selected={mode === m.value}
                  disabled={isModeKnownUnavailable(caps, m.value)}
                  onClick={() => setMode(m.value)}
                />
              ))}
            </div>
          </Section>

          {/* avatar — who's on screen (avatar mode only) */}
          {mode === "ai_avatar" && (
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
                {capabilityState.models.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!option.enabled}
                    onClick={() => setVideoModel(option.value)}
                    className={cn(
                      "rounded-2xl border p-3.5 text-left transition-colors",
                      capabilityState.selectedModel === option.value
                        ? "border-brand-400 bg-accent"
                        : "border-border bg-card",
                      !option.enabled
                        ? "cursor-not-allowed opacity-60"
                        : capabilityState.selectedModel !== option.value &&
                          "hover:border-border-strong",
                    )}
                  >
                    <p className="text-sm font-semibold text-ink">
                      {t(MODEL_KEYS[option.value].label)}
                      <UnavailableBadge reason={option.reason} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(MODEL_KEYS[option.value].blurb)}
                    </p>
                    <UnavailableNote reason={option.reason} />
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* resolution — render quality */}
          <Section title={t("sections.resolution")}>
            <div className="grid grid-cols-3 gap-3">
              {capabilityState.resolutions.map((option) => (
                <ResolutionButton
                  key={option.value}
                  option={option}
                  selected={effectiveResolution === option.value}
                  onClick={() => setResolution(option.value)}
                />
              ))}
            </div>
          </Section>

          {/* size — output aspect ratio, narrowed to what the selected mode
              reports; talking-head output may adapt its shape server-side. */}
          <Section title={t("sections.size")}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {capabilityState.aspectRatios.map((option) => {
                const a = ASPECT_RATIO_META[option.value];
                return (
                  <button
                    key={a.value}
                    type="button"
                    disabled={!option.enabled}
                    onClick={() => setAspectRatio(a.value)}
                    className={cn(
                      "rounded-2xl border p-3.5 text-left transition-colors",
                      effectiveAspectRatio === a.value
                        ? "border-brand-400 bg-accent"
                        : "border-border bg-card",
                      !option.enabled
                        ? "cursor-not-allowed opacity-60"
                        : effectiveAspectRatio !== a.value && "hover:border-border-strong",
                    )}
                  >
                    <p className="text-sm font-semibold text-ink">
                      {a.label}
                      <UnavailableBadge reason={option.reason} />
                    </p>
                    <p className="text-xs text-muted-foreground">{a.blurb}</p>
                    <UnavailableNote reason={option.reason} />
                  </button>
                );
              })}
            </div>
            {mode === "ai_avatar" && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("size.avatarHint")}
              </p>
            )}
          </Section>

          {/* language — voice-QA-validated languages, narrowed to the ones the
              selected mode reports; the two reasons never share copy */}
          <Section title={t("sections.language")}>
            <div className="flex flex-wrap gap-2">
              {capabilityState.languages.map((option) => (
                <LanguageButton
                  key={option.value}
                  label={LANGUAGE_META[option.value].label}
                  option={option}
                  selected={language === option.value}
                  onClick={() => setLanguageOverride(option.value)}
                />
              ))}
            </div>
            <UnavailableLegend options={capabilityState.languages} />
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
                value={t(MODE_META[mode].label)}
              />
              <Row
                label={t("summary.length")}
                value={t("durationSeconds", { duration })}
              />
              {capabilityState.modelPickerVisible && (
                <Row
                  label={t("summary.model")}
                  value={t(MODEL_KEYS[capabilityState.selectedModel].label)}
                />
              )}
              <Row
                label={t("summary.resolution")}
                value={t(RESOLUTION_KEYS[effectiveResolution].label)}
              />
              <Row
                label={t("summary.language")}
                value={LANGUAGE_META[language].label}
              />
              <Row label={t("summary.format")} value={effectiveAspectRatio} />
              <Row label={t("summary.review")} value={t("summary.storyboard")} />
            </dl>

            {/* Price, then balance, in that order and in one block directly
                above Generate: the summary above it is the render being
                priced, and the rail is sticky, so both numbers stay on screen
                while the pickers that move them are being used. The price is
                the loud one - the balance was already here and was never the
                question the user couldn't answer. */}
            <div className="mt-4 border-t border-border pt-4">
              {/* The row goes away entirely for a mode that can't render: no
                  quote was asked for, so "pricing…" would be a wait that never
                  ends, and the note under Generate is the answer the user
                  actually needs. */}
              {capabilityState.modeAvailable && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {t("cost.label")}
                  </span>
                  {/* One slot, always occupied: a price that blinks out on every
                      picker change reads worse than one that arrives late. A
                      quote in flight or failed shows its own words here - never a
                      number, and never the previous render's number - and a
                      failure says whether anything is still trying, because a
                      5xx we re-poll and a 4xx nobody will retry are different
                      answers to "should I wait?". */}
                  <span
                    aria-live="polite"
                    className={cn(
                      "text-right font-display font-semibold",
                      cost !== undefined
                        ? "text-base text-ink"
                        : "text-sm text-muted-foreground",
                    )}
                  >
                    {cost !== undefined
                      ? t("cost.value", { credits: cost })
                      : costUnknown === "retrying"
                        ? t("cost.retrying")
                        : costUnknown === "settled"
                          ? t("cost.unavailable")
                          : t("cost.pending")}
                  </span>
                </div>
              )}
              {usage && (
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {t("usageSummary", {
                    remaining: usage.remaining,
                    limit: usage.limit,
                  })}
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="mt-3 w-full"
              onClick={generate}
              disabled={create.isPending || !canGenerate}
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
            {!capabilityState.modeAvailable && (
              <p className="mt-2 text-center text-xs font-semibold text-danger">
                {anotherModePickable
                  ? t("modes.unavailableNote", { mode: t(MODE_META[mode].label) })
                  : t("modes.unavailableAllNote")}
              </p>
            )}
            {atActiveCap && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("cap.reached", { count: activeCount, limit: MAX_ACTIVE_JOBS })}{" "}
                <Link href="/app/videos" className="font-semibold text-brand-700">
                  {t("cap.viewVideos")}
                </Link>
              </p>
            )}
            {/* The notice always agrees with the button. The priced ceiling
                warns and names the gap the user can act on ("up to 225, you
                have 30") instead of restating the balance they can already read
                above - a warning, not a refusal, since the backend may well
                charge less than the ceiling, so it is only shown while the
                render can actually be started: "it may still go through" beside
                a button dead for any other reason (the active-jobs cap, an
                unavailable mode, an upload in flight) is the one thing this must
                never read as, and that reason is the one the user needs to read
                instead. Everything else falls to the gated balance.
                (`affordability` only answers "short" with a quote in hand, so
                the ceiling branch always has its number; the check is what types
                it, not what decides it.) The wrapper is a permanent live region:
                the money warning appears and disappears as the pickers move, and
                an element that only enters the DOM when it applies is announced
                unreliably. */}
            <div aria-live="polite">
              {((canAfford === "short" && canGenerate) || outOfQuota) && usage && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {!outOfQuota && cost !== undefined
                    ? t("costMayExceed", { cost, remaining: usage.remaining })
                    : t("outOfQuota", {
                        remaining: usage.remaining,
                        limit: usage.limit,
                      })}{" "}
                  <Link href="/pricing" className="font-semibold text-brand-700">
                    {t("seePlans")}
                  </Link>
                </p>
              )}
            </div>
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
      onClick={onClick}
      className={cn(
        "rounded-2xl border-2 p-4 text-left transition-colors",
        selected ? "border-brand-400 bg-accent" : "border-border bg-card",
        disabled ? "cursor-not-allowed opacity-60" : !selected && "hover:border-border-strong",
      )}
    >
      <mode.Icon
        className={cn("h-6 w-6", selected ? "text-brand-700" : "text-muted-foreground")}
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
  option,
  selected,
  onClick,
}: {
  option: CapabilityOption<VideoResolution>;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("app.studio");
  return (
    <button
      type="button"
      disabled={!option.enabled}
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-3.5 text-left transition-colors",
        selected ? "border-brand-400 bg-accent" : "border-border bg-card",
        !option.enabled
          ? "cursor-not-allowed opacity-60"
          : !selected && "hover:border-border-strong",
      )}
    >
      <p className="text-sm font-semibold text-ink">
        {t(RESOLUTION_KEYS[option.value].label)}
        <UnavailableBadge reason={option.reason} />
      </p>
      <p className="text-xs text-muted-foreground">
        {t(RESOLUTION_KEYS[option.value].blurb)}
      </p>
      <UnavailableNote reason={option.reason} />
    </button>
  );
}

function LanguageButton({
  label,
  option,
  selected,
  onClick,
}: {
  label: string;
  option: CapabilityOption<VideoLanguage>;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!option.enabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
        selected
          ? "border-brand-400 bg-accent text-accent-foreground"
          : "border-border bg-card text-muted-foreground",
        !option.enabled ? "cursor-not-allowed opacity-60" : !selected && "hover:text-ink",
      )}
    >
      {label}
      <UnavailableBadge reason={option.reason} />
      <UnavailableNote reason={option.reason} srOnly />
    </button>
  );
}

// Language chips are too small to carry a per-chip note, so the row gets one
// line mapping every badge in play to its reason - the badge alone explains
// nothing, and a disabled control can't be focused to reveal more.
const LEGEND_REASONS: OptionUnavailableReason[] = ["unsupported", "soon"];

function UnavailableLegend({ options }: { options: CapabilityOption<VideoLanguage>[] }) {
  const t = useTranslations("app.studio");
  const parts = LEGEND_REASONS.filter((r) => options.some((o) => o.reason === r)).map((r) =>
    r === "soon"
      ? `${t("language.soonBadge")}: ${t("language.comingSoonTitle")}`
      : `${t("optionUnavailable.badge")}: ${t("optionUnavailable.title")}`,
  );
  if (parts.length === 0) return null;
  return (
    <p className="mt-2 text-xs font-semibold text-danger">{parts.join(" · ")}</p>
  );
}

function UnavailableBadge({ reason }: { reason: OptionUnavailableReason | null }) {
  const t = useTranslations("app.studio");
  if (!reason) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-1.5 text-[10px] font-bold uppercase tracking-wide"
    >
      {reason === "soon" ? t("language.soonBadge") : t("optionUnavailable.badge")}
    </span>
  );
}

// The reason has to be in the option itself: a `title` on a disabled control
// never opens, so the badge alone would be the only explanation a seller gets.
// "Coming soon" is a claim about inventory; an option the selected mode can't
// render is built and offered elsewhere, so it gets its own copy.
function UnavailableNote({
  reason,
  srOnly,
}: {
  reason: OptionUnavailableReason | null;
  srOnly?: boolean;
}) {
  const t = useTranslations("app.studio");
  if (!reason) return null;
  const text =
    reason === "soon" ? t("language.comingSoonTitle") : t("optionUnavailable.title");
  return srOnly ? (
    <span className="sr-only">{text}</span>
  ) : (
    <p className="mt-2 text-xs font-semibold text-danger">{text}</p>
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
