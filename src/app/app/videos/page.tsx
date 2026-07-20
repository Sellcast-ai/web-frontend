/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Loader2, Clapperboard, Play, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useVideoJobs } from "@/lib/api/hooks";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/ui/motion";
import { mediaUrl, relativeTime } from "@/lib/format";
import { VIDEO_STYLES, type VideoJob, type VideoStyle } from "@/lib/api/types";

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

export default function VideosPage() {
  const t = useTranslations("app.videos");
  const { data: jobs, isLoading } = useVideoJobs();

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button href="/app/marketplace" size="md" className="hidden sm:inline-flex">
          <Sparkles className="h-4 w-4" />
          {t("newVideo")}
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <Empty />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {jobs.map((job, i) => (
            <StaggerItem key={job.id} index={i} className="h-full">
              <JobCard job={job} />
            </StaggerItem>
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: VideoJob }) {
  const t = useTranslations("app.videos");
  const tp = useTranslations("app.videoPresets.styles");
  const thumb = mediaUrl(job.thumbnail_url) || mediaUrl(job.product_image_url);
  const style = VIDEO_STYLES[job.mode]?.find((s) => s.value === job.style);
  const styleKey = STYLE_LABEL_KEYS[style?.value ?? job.style];
  const styleLabel = styleKey ? tp(styleKey) : job.style;

  return (
    <Link
      href={`/app/jobs/${job.id}`}
      className="group overflow-hidden rounded-card border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
    >
      <div className="relative aspect-9/16 bg-ink">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover opacity-90" />
        ) : (
          <div className="bg-hero h-full w-full" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          {job.status === "completed" ? (
            <span className="flex h-12 w-12 items-center justify-center rounded-full glass">
              <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
            </span>
          ) : null}
        </div>
        <div className="absolute left-2 top-2">
          <StatusBadge status={job.status} />
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold text-ink">
          {job.product_name ?? t("videoFallback")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {styleLabel} · {relativeTime(job.created_at)}
        </p>
      </div>
    </Link>
  );
}

function Empty() {
  const t = useTranslations("app.videos.empty");
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Clapperboard className="h-8 w-8" />
      </div>
      <p className="mt-5 font-display text-xl font-bold text-ink">{t("title")}</p>
      <p className="mt-1 max-w-sm text-muted-foreground">
        {t("description")}
      </p>
      <Button href="/app/marketplace" size="lg" className="mt-6">
        {t("browseMarketplace")}
      </Button>
    </div>
  );
}
