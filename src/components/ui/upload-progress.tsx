"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

/**
 * Pending-state content for a primary submit Button that uploads images:
 * a real progress bar while the request body is uploading, then a labelled
 * processing stage while the backend stores the images.
 */
export function UploadProgress({
  progress,
  label,
}: {
  progress: number;
  label?: string;
}) {
  const t = useTranslations("shared.uploadProgress");

  if (progress >= 1) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("processing")}
      </>
    );
  }
  const pct = Math.round(Math.max(progress, 0) * 100);
  const progressLabel = t("progress", {
    label: label ?? t("uploading"),
    percent: pct,
  });

  return (
    <>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/30">
        <span
          className="block h-full rounded-full bg-white transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </span>
      {progressLabel}
    </>
  );
}
