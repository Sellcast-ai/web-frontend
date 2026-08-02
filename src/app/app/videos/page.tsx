/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Clapperboard, Play, RefreshCw, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePagedVideoJobs } from "@/lib/api/hooks";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/ui/motion";
import { apiErrorMessage } from "@/lib/api/client";
import { aspectFrameClass } from "@/lib/aspect-frame";
import { mediaUrl, relativeTime } from "@/lib/format";
import { STUDIO_HREF } from "@/lib/launch-routes";
import {
  VIDEO_TAB_ORDER,
  countByTab,
  defaultTab,
  jobsForTab,
  type VideoTab,
} from "@/lib/video-tabs";
import { VIDEO_STYLES, type VideoJob, type VideoStyle } from "@/lib/api/types";
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

export default function VideosPage() {
  const t = useTranslations("app.videos");
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchNextPageError,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = usePagedVideoJobs();
  // null = the user hasn't picked a tab yet, so follow defaultTab(jobs)
  const [selected, setSelected] = useState<VideoTab | null>(null);

  const jobs = data?.pages.flat() ?? [];
  const counts = countByTab(jobs ?? []);
  const activeTab = selected ?? defaultTab(jobs ?? []);
  const visible = jobsForTab(jobs ?? [], activeTab);
  const countOpen = Boolean(hasNextPage);
  const pageLoadError = isFetchNextPageError && jobs.length > 0;
  const pageLoadErrorMessage = pageLoadError
    ? apiErrorMessage(error, t("pageLoadError.description"))
    : null;
  const loadMore = () => {
    setSelected(activeTab);
    void fetchNextPage();
  };

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button href={STUDIO_HREF} size="md" className="hidden sm:inline-flex">
          <Sparkles className="h-4 w-4" />
          {t("newVideo")}
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : isError && jobs.length === 0 ? (
        <LoadError
          message={apiErrorMessage(error, t("loadError.description"))}
          retrying={isFetching}
          onRetry={() => void refetch()}
        />
      ) : jobs.length === 0 && !hasNextPage ? (
        <Empty />
      ) : (
        <>
          <div
            role="group"
            aria-label={t("tabsLabel")}
            className="mt-6 flex gap-1 overflow-x-auto border-b border-border"
          >
            {VIDEO_TAB_ORDER.map((tab) => (
              <TabButton
                key={tab}
                label={t(`tabs.${tab}`)}
                count={counts[tab]}
                open={countOpen}
                active={tab === activeTab}
                onSelect={() => setSelected(tab)}
              />
            ))}
          </div>
          {visible.length === 0 ? (
            <TabEmpty
              tab={activeTab}
              hasMore={Boolean(hasNextPage)}
              loading={isFetchingNextPage}
              onLoadMore={loadMore}
              errorMessage={pageLoadErrorMessage}
            />
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((job, i) => (
                  <StaggerItem key={job.id} index={i} className="h-full">
                    <JobCard job={job} />
                  </StaggerItem>
                ))}
              </div>
              {hasNextPage && !pageLoadErrorMessage && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={loadMore}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {t("loadMore")}
                  </Button>
                </div>
              )}
              {pageLoadErrorMessage && (
                <PageLoadError
                  message={pageLoadErrorMessage}
                  retrying={isFetchingNextPage}
                  onRetry={loadMore}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({
  label,
  count,
  open,
  active,
  onSelect,
}: {
  label: string;
  count: number;
  open: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const countText = open ? `${count}+` : String(count);
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "flex shrink-0 items-center gap-1.5 border-b-2 px-1.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:px-3 sm:py-2.5 sm:text-sm",
        active
          ? "border-brand-500 text-ink"
          : "border-transparent text-muted-foreground hover:text-ink",
      )}
    >
      {label}
      <span
        className={cn(
          "hidden rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums sm:inline-block",
          active ? "bg-brand-100 text-brand-800" : "bg-muted text-muted-foreground",
        )}
      >
        {countText}
      </span>
    </button>
  );
}

function JobCard({ job }: { job: VideoJob }) {
  const t = useTranslations("app.videos");
  const tp = useTranslations("app.videoPresets.styles");
  const tf = useTranslations("app.format");
  const locale = useLocale();
  const thumb = mediaUrl(job.thumbnail_url) || mediaUrl(job.product_image_url);
  const style = VIDEO_STYLES[job.mode]?.find((s) => s.value === job.style);
  const styleKey = STYLE_LABEL_KEYS[style?.value ?? job.style];
  const styleLabel = styleKey ? tp(styleKey) : job.style;

  return (
    <Link
      href={`/app/jobs/${job.id}`}
      className="group overflow-hidden rounded-card border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
    >
      <div className={cn("relative bg-ink", aspectFrameClass(job.aspect_ratio))}>
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
          {styleLabel} · {relativeTime(job.created_at, tf, locale)}
        </p>
      </div>
    </Link>
  );
}

function TabEmpty({
  tab,
  hasMore,
  loading,
  onLoadMore,
  errorMessage,
}: {
  tab: VideoTab;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  errorMessage: string | null;
}) {
  const t = useTranslations("app.videos.tabEmpty");
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <p className="font-display text-lg font-bold text-ink">
        {t(`${tab}.${hasMore ? "loadedTitle" : "title"}`)}
      </p>
      <p className="mt-1 max-w-sm text-muted-foreground">
        {t(`${tab}.${hasMore ? "loadedDescription" : "description"}`)}
      </p>
      {hasMore && !errorMessage && (
        <Button
          variant="outline"
          size="md"
          className="mt-5"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("loadMore")}
        </Button>
      )}
      {errorMessage && (
        <PageLoadError message={errorMessage} retrying={loading} onRetry={onLoadMore} />
      )}
    </div>
  );
}

function PageLoadError({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("app.videos.pageLoadError");
  return (
    <div className="mt-5 flex flex-col items-center rounded-card border border-destructive/20 bg-destructive/5 p-4 text-center">
      <p className="text-sm font-semibold text-ink">{t("title")}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={onRetry}
        disabled={retrying}
      >
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

function LoadError({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("app.videos.loadError");
  return (
    <div className="mt-16 flex flex-col items-center text-center">
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
      <Button href={STUDIO_HREF} size="lg" className="mt-6">
        {t("startFirstVideo")}
      </Button>
    </div>
  );
}
