import type { VideoAspectRatio, VideoModelKey, VideoResolution } from "./api/types";

/** Credits per second of rendered video, by model and resolution. Mirrors the
 * render provider's rate card; the backend's quote endpoint is the eventual
 * source of truth, so keep this in sync until Studio can call it. Models the
 * picker doesn't offer yet (fast/mini) are listed so the card stays whole when
 * `VIDEO_MODELS` grows. */
const CREDITS_PER_SECOND: Record<string, Partial<Record<VideoResolution, number>>> = {
  "seedance-2.0": { "480p": 7, "720p": 15, "1080p": 37 },
  "seedance-2.0-fast": { "480p": 6, "720p": 12 },
  "seedance-2.0-mini": { "480p": 4, "720p": 8 },
};

/** Rendered frame per aspect ratio, taken from the provider's 720p size table.
 * Cost is proportional to pixel area, so 9:16 is the 16:9 frame on its side and
 * costs exactly the same, while the squarer ratios cost their pixel ratio more.
 * Only the ratio between these matters, and it holds at every resolution. */
const FRAME_PIXELS: Record<VideoAspectRatio, number> = {
  "16:9": 1248 * 704,
  "9:16": 704 * 1248,
  "1:1": 960 * 960,
  "4:3": 1120 * 832,
  "3:4": 832 * 1120,
};

const BASELINE_FRAME_PIXELS = FRAME_PIXELS["16:9"];

/** What a render will cost, in whole credits — the pre-flight Studio uses to
 * disable Generate before the backend rejects it. An unknown model falls back
 * to the flagship's rates and an unlisted resolution to the model's top rate,
 * so a gap in the card can never quote less than the render will cost. */
export function renderCostCredits(input: {
  model: VideoModelKey;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  durationSeconds: number;
}): number {
  const rates = CREDITS_PER_SECOND[input.model] ?? CREDITS_PER_SECOND["seedance-2.0"];
  const perSecond = rates[input.resolution] ?? Math.max(...Object.values(rates));
  const pixelScale = FRAME_PIXELS[input.aspectRatio] / BASELINE_FRAME_PIXELS;
  return Math.round(perSecond * input.durationSeconds * pixelScale);
}
