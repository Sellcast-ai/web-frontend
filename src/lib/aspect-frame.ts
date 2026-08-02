/** Tailwind aspect class for a job's output shape. `VideoJob.aspect_ratio` is
 *  free-form backend text, so anything outside the Studio picker's five ratios
 *  falls back to the 9:16 default the backend itself uses. Classes are written
 *  out in full so the Tailwind scanner can see them. */
const FRAME_CLASSES: Record<string, string> = {
  "9:16": "aspect-9/16",
  "16:9": "aspect-16/9",
  "1:1": "aspect-square",
  "4:3": "aspect-4/3",
  "3:4": "aspect-3/4",
};

export function aspectFrameClass(aspectRatio: string | null | undefined) {
  return FRAME_CLASSES[aspectRatio ?? ""] ?? FRAME_CLASSES["9:16"];
}
