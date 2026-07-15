import { Loader2 } from "lucide-react";

/**
 * Pending-state content for a primary submit Button that uploads images:
 * a real progress bar while the request body is uploading, then a labelled
 * processing stage while the backend stores the images.
 */
export function UploadProgress({ progress }: { progress: number }) {
  if (progress >= 1) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Processing…
      </>
    );
  }
  const pct = Math.round(progress * 100);
  return (
    <>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/30">
        <span
          className="block h-full rounded-full bg-white transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </span>
      Uploading {pct}%
    </>
  );
}
