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
  Check,
  Eye,
  Wand2,
  Store,
} from "lucide-react";
import { useProduct, useCreateJob, useUsage, useAvatars } from "@/lib/api/hooks";
import {
  VIDEO_DURATIONS,
  VIDEO_LANGUAGES,
  VIDEO_MODELS,
  VIDEO_STYLES,
  type VideoLanguage,
  type VideoModelKey,
  type VideoMode,
  type VideoStyle,
  type VideoDuration,
} from "@/lib/api/types";
import { defaultLanguageFor } from "@/lib/language";
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
  const [style, setStyle] = useState<VideoStyle>("avatar_talking_intro");
  const [duration, setDuration] = useState<VideoDuration>(15);
  const [videoModel, setVideoModel] = useState<VideoModelKey>(VIDEO_MODELS[0].value);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const { data: avatars } = useAvatars();
  // Language defaults to the product's source market (shopee.co.id → id)
  // until the user explicitly picks one — derived, so no effect needed.
  const [languageOverride, setLanguageOverride] = useState<VideoLanguage | null>(null);
  const language = languageOverride ?? defaultLanguageFor(product);
  const [reviewMode, setReviewMode] = useState(false);

  // 1 credit = 1 second of 720p video; this clip needs `duration` credits.
  const outOfQuota = !!usage && usage.remaining < duration;

  // switching modes resets style to that mode's first option (in the click
  // handler, not an effect — see react-hooks/set-state-in-effect)
  function pickMode(next: VideoMode) {
    setMode(next);
    setStyle(VIDEO_STYLES[next][0].value);
  }

  async function generate() {
    if (!productId) return;
    const job = await create.mutateAsync({
      product_id: productId,
      mode,
      style,
      duration_seconds: duration,
      review_mode: reviewMode,
      language,
      video_model: videoModel,
      avatar_id: mode === "ai_avatar" ? avatarId : null,
    });
    router.push(`/app/jobs/${job.id}`);
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
          {/* mode */}
          <Section title="1 · Mode">
            <div className="grid grid-cols-2 gap-3">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => pickMode(m.value)}
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

          {/* style */}
          <Section title="2 · Style">
            <div className="grid grid-cols-2 gap-3">
              {VIDEO_STYLES[mode].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                    style === s.value
                      ? "border-brand-400 bg-accent"
                      : "border-border bg-card hover:border-border-strong",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      style === s.value
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-border-strong",
                    )}
                  >
                    {style === s.value && <Check className="h-3 w-3" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.blurb}</span>
                  </span>
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

          {/* review mode */}
          <Section title="5 · Review">
            <button
              type="button"
              onClick={() => setReviewMode((v) => !v)}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  reviewMode ? "bg-brand-gradient text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {reviewMode ? <Eye className="h-5 w-5" /> : <Wand2 className="h-5 w-5" />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">
                  {reviewMode ? "Beat-by-beat review" : "Auto-QA (hands off)"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {reviewMode
                    ? "Approve each shot's reference image before it renders."
                    : "Lumi auto-approves beats and renders straight through."}
                </span>
              </span>
              <Toggle on={reviewMode} />
            </button>
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
              <Row label="Mode" value={MODES.find((m) => m.value === mode)?.label ?? ""} />
              <Row
                label="Style"
                value={VIDEO_STYLES[mode].find((s) => s.value === style)?.label ?? ""}
              />
              <Row label="Length" value={`${duration}s`} />
              <Row
                label="Model"
                value={VIDEO_MODELS.find((m) => m.value === videoModel)?.label ?? ""}
              />
              <Row
                label="Language"
                value={VIDEO_LANGUAGES.find((l) => l.value === language)?.label ?? "English"}
              />
              <Row label="Format" value="9:16" />
              <Row label="Review" value={reviewMode ? "Manual beats" : "Auto-QA"} />
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
            {outOfQuota ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Not enough credits for a {duration}s video ({usage?.remaining} of{" "}
                {usage?.limit} left).{" "}
                <Link href="/pricing" className="font-semibold text-brand-700">
                  See plans
                </Link>
              </p>
            ) : create.isError ? (
              <p className="mt-2 text-center text-xs text-rose">
                {(create.error as Error)?.message || "Couldn't start the job. Try again."}
              </p>
            ) : null}
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

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-brand-500" : "bg-border-strong",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </span>
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
