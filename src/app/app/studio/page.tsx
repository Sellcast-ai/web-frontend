/* eslint-disable @next/next/no-img-element */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  UserSquare2,
  Package,
  Sparkles,
  Loader2,
  Eye,
  Store,
  Link2,
  Upload,
} from "lucide-react";
import { useProduct, useCreateJob, useUsage, useAvatars } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import {
  VIDEO_DURATIONS,
  VIDEO_LANGUAGES,
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
  VIDEO_VIBES,
  type VideoLanguage,
  type VideoModelKey,
  type VideoResolution,
  type VideoMode,
  type VideoVibe,
  type VideoDuration,
} from "@/lib/api/types";
import { defaultLanguageFor } from "@/lib/language";
import { defaultStyleForMode } from "@/lib/vibe";
import { Button } from "@/components/ui/button";
import { priceRange } from "@/lib/format";
import { cn } from "@/lib/utils";

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
};

const RESOLUTION_KEYS: Record<VideoResolution, StudioOptionKeys> = {
  "480p": { label: "resolutions.p480.label", blurb: "resolutions.p480.blurb" },
  "720p": { label: "resolutions.p720.label", blurb: "resolutions.p720.blurb" },
  "1080p": { label: "resolutions.p1080.label", blurb: "resolutions.p1080.blurb" },
};

function StudioInner() {
  const t = useTranslations("app.studio");
  const tt = useTranslations("app.toasts");
  const router = useRouter();
  const sp = useSearchParams();
  const productId = sp.get("product") ?? "";
  const { data: product, isLoading } = useProduct(productId);
  const { data: usage } = useUsage();
  const create = useCreateJob({ startError: tt("startVideoFailed") });

  const [mode, setMode] = useState<VideoMode>("ai_avatar");
  const [vibe, setVibe] = useState<VideoVibe>("premium_clean");
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("link");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [duration, setDuration] = useState<VideoDuration>(15);
  // Style is no longer a manual pick — it auto-derives from mode (locked
  // decision #1). We still send it so the backend schema stays intact.
  const style = defaultStyleForMode(mode);
  const [videoModel, setVideoModel] = useState<VideoModelKey>(VIDEO_MODELS[0].value);
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const { data: avatars } = useAvatars();
  // Language defaults to the product's source market (shopee.co.id → id)
  // until the user explicitly picks one — derived, so no effect needed.
  const [languageOverride, setLanguageOverride] = useState<VideoLanguage | null>(null);
  const language = languageOverride ?? defaultLanguageFor(product);
  // Storyboard review is always on (the default gate); the legacy image-level
  // review_mode stays wired but is no longer user-toggleable.
  const reviewMode = false;

  // 1 credit = 1 second of 720p video; this clip needs `duration` credits.
  const outOfQuota = !!usage && usage.remaining < duration;
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
    if (!productId || linkInvalid || referenceUploading) return;
    // failure is surfaced as a toast by useCreateJob
    const job = await create
      .mutateAsync({
        product_id: productId,
        mode,
        style,
        vibe,
        ...(referenceReady ? { reference_url: activeReferenceUrl } : {}),
        duration_seconds: duration,
        review_mode: reviewMode,
        language,
        video_model: videoModel,
        resolution,
        avatar_id: mode === "ai_avatar" ? avatarId : null,
      })
      .catch(() => null);
    if (job) router.push(`/app/jobs/${job.id}`);
  }

  if (!productId) {
    return <PickProduct />;
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
                    <p className="mt-2 text-xs font-semibold text-rose">
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
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-colors",
                    mode === m.value
                      ? "border-brand-400 bg-accent"
                      : "border-border bg-card hover:border-border-strong",
                  )}
                >
                  <m.Icon
                    className={cn(
                      "h-6 w-6",
                      mode === m.value ? "text-brand-700" : "text-muted-foreground",
                    )}
                  />
                  <p className="mt-2 font-display font-semibold text-ink">
                    {t(m.label)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t(m.blurb)}</p>
                </button>
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

          {/* model — which Seedance model renders the video */}
          <Section title={t("sections.model")}>
            <div className="grid grid-cols-2 gap-3">
              {VIDEO_MODELS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  disabled={!m.enabled}
                  onClick={() => setVideoModel(m.value)}
                  className={cn(
                    "rounded-2xl border p-3.5 text-left transition-colors",
                    !m.enabled
                      ? "cursor-not-allowed border-border bg-card opacity-60"
                      : videoModel === m.value
                        ? "border-brand-400 bg-accent"
                        : "border-border bg-card hover:border-border-strong",
                  )}
                >
                  <p className="text-sm font-semibold text-ink">
                    {t(MODEL_KEYS[m.value].label)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(MODEL_KEYS[m.value].blurb)}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          {/* resolution — render quality */}
          <Section title={t("sections.resolution")}>
            <div className="grid grid-cols-3 gap-3">
              {VIDEO_RESOLUTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  disabled={!r.enabled}
                  onClick={() => setResolution(r.value)}
                  className={cn(
                    "rounded-2xl border p-3.5 text-left transition-colors",
                    !r.enabled
                      ? "cursor-not-allowed border-border bg-card opacity-60"
                      : resolution === r.value
                        ? "border-brand-400 bg-accent"
                        : "border-border bg-card hover:border-border-strong",
                  )}
                >
                  <p className="text-sm font-semibold text-ink">
                    {t(RESOLUTION_KEYS[r.value].label)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(RESOLUTION_KEYS[r.value].blurb)}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          {/* language — only voice-QA-validated languages are selectable */}
          <Section title={t("sections.language")}>
            <div className="flex flex-wrap gap-2">
              {VIDEO_LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  disabled={!lang.enabled}
                  title={lang.enabled ? undefined : t("language.comingSoonTitle")}
                  onClick={() => setLanguageOverride(lang.value)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                    !lang.enabled
                      ? "cursor-not-allowed border-border bg-card text-muted-foreground opacity-60"
                      : language === lang.value
                        ? "border-brand-400 bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-ink",
                  )}
                >
                  {lang.label}
                  {!lang.enabled && (
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide">
                      {t("language.soonBadge")}
                    </span>
                  )}
                </button>
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
                    {priceRange(product.price_min, product.price_max, product.currency)}
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
                value={t(MODES.find((m) => m.value === mode)?.label ?? "modes.aiAvatar.label")}
              />
              <Row
                label={t("summary.length")}
                value={t("durationSeconds", { duration })}
              />
              <Row
                label={t("summary.model")}
                value={t(MODEL_KEYS[videoModel].label)}
              />
              <Row
                label={t("summary.resolution")}
                value={t(RESOLUTION_KEYS[resolution].label)}
              />
              <Row
                label={t("summary.language")}
                value={
                  VIDEO_LANGUAGES.find((l) => l.value === language)?.label ??
                  VIDEO_LANGUAGES[0].label
                }
              />
              <Row label={t("summary.format")} value="9:16" />
              <Row label={t("summary.review")} value={t("summary.storyboard")} />
            </dl>

            {usage && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t("usageSummary", {
                  remaining: usage.remaining,
                  limit: usage.limit,
                  duration,
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
                outOfQuota ||
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
            {outOfQuota && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("outOfQuota", {
                  duration,
                  remaining: usage?.remaining ?? 0,
                  limit: usage?.limit ?? 0,
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
        <p className="mt-2 text-xs font-semibold text-rose">{error}</p>
      )}
    </div>
  );
}

function PickProduct() {
  const t = useTranslations("app.studio.pickProduct");
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Store className="h-8 w-8" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        {t("description")}
      </p>
      <Button href="/app/marketplace" size="lg" className="mt-6">
        {t("browseMarketplace")}
      </Button>
    </div>
  );
}
