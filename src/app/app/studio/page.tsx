/* eslint-disable @next/next/no-img-element */
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserSquare2,
  Package,
  Sparkles,
  Loader2,
  Eye,
  Store,
} from "lucide-react";
import { useProduct, useCreateJob, useUsage, useAvatars } from "@/lib/api/hooks";
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

const MODES: { value: VideoMode; label: string; blurb: string; Icon: typeof UserSquare2 }[] = [
  { value: "ai_avatar", label: "AI Avatar", blurb: "A presenter talks to camera.", Icon: UserSquare2 },
  { value: "product_only", label: "Product Only", blurb: "No face — just the product.", Icon: Package },
];

function StudioInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const productId = sp.get("product") ?? "";
  const { data: product, isLoading } = useProduct(productId);
  const { data: usage } = useUsage();
  const create = useCreateJob();

  const [mode, setMode] = useState<VideoMode>("ai_avatar");
  const [vibe, setVibe] = useState<VideoVibe>("premium_clean");
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

  async function generate() {
    if (!productId) return;
    // failure is surfaced as a toast by useCreateJob
    const job = await create
      .mutateAsync({
        product_id: productId,
        mode,
        style,
        vibe,
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
        <h1 className="font-display text-3xl font-bold text-ink">Video Studio</h1>
        <p className="text-muted-foreground">
          Lumi scripts and renders a video from this product — set the direction.
        </p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* config */}
        <div className="space-y-8">
          {/* vibe — the hero creation control. Style auto-derives from mode. */}
          <Section title="1 · What's the vibe?">
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
                  <p className="font-display font-semibold text-ink">{v.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{v.blurb}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* mode */}
          <Section title="2 · Mode">
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
                  <p className="mt-2 font-display font-semibold text-ink">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.blurb}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* avatar — who's on screen (avatar mode only) */}
          {mode === "ai_avatar" && (
            <Section title="Presenter">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                <AvatarChoice
                  selected={avatarId === null}
                  onClick={() => setAvatarId(null)}
                  label="Auto"
                  sublabel="AI picks a creator"
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
                Manage avatars →
              </Link>
            </Section>
          )}

          {/* duration */}
          <Section title="3 · Duration">
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
                  {d}s
                </button>
              ))}
            </div>
          </Section>

          {/* model — which Seedance model renders the video */}
          <Section title="Model">
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
                  <p className="text-sm font-semibold text-ink">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.blurb}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* resolution — render quality */}
          <Section title="Resolution">
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
                  <p className="text-sm font-semibold text-ink">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.blurb}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* language — only voice-QA-validated languages are selectable */}
          <Section title="4 · Language">
            <div className="flex flex-wrap gap-2">
              {VIDEO_LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  disabled={!lang.enabled}
                  title={lang.enabled ? undefined : "Coming soon"}
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
                      soon
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* storyboard review — always on; this is the product's wedge, not an
              option. The user reviews and approves the storyboard before any
              image or video spend. */}
          <Section title="5 · Review">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <Eye className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                Lumi will show you the storyboard before it spends anything —
                review and approve it before any images or video are generated.
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
                  {product?.title ?? "Loading…"}
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
                label="Vibe"
                value={VIDEO_VIBES.find((v) => v.value === vibe)?.label ?? ""}
              />
              <Row label="Mode" value={MODES.find((m) => m.value === mode)?.label ?? ""} />
              <Row label="Length" value={`${duration}s`} />
              <Row
                label="Model"
                value={VIDEO_MODELS.find((m) => m.value === videoModel)?.label ?? ""}
              />
              <Row
                label="Resolution"
                value={VIDEO_RESOLUTIONS.find((r) => r.value === resolution)?.label ?? ""}
              />
              <Row
                label="Language"
                value={VIDEO_LANGUAGES.find((l) => l.value === language)?.label ?? "English"}
              />
              <Row label="Format" value="9:16" />
              <Row label="Review" value="Storyboard" />
            </dl>

            {usage && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {usage.remaining} of {usage.limit} credits left this month · this
                video uses {duration}
              </p>
            )}
            <Button
              size="lg"
              className="mt-2 w-full"
              onClick={generate}
              disabled={create.isPending || !product || outOfQuota}
            >
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate video
                </>
              )}
            </Button>
            {outOfQuota && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Not enough credits for a {duration}s video ({usage?.remaining} of{" "}
                {usage?.limit} left).{" "}
                <Link href="/pricing" className="font-semibold text-brand-700">
                  See plans
                </Link>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
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

function PickProduct() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Store className="h-8 w-8" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink">
        Pick a product first
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Choose a product from the marketplace and Lumi will turn it into a
        scroll-stopping video.
      </p>
      <Button href="/app/marketplace" size="lg" className="mt-6">
        Browse marketplace
      </Button>
    </div>
  );
}
