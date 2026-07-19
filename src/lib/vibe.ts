import type { VideoMode, VideoStyle } from "./api/types";

/** Style auto-derives from mode (locked decision #1: vibe is the hero, style is
 * demoted). We keep sending a valid `style` so the backend schema stays intact,
 * defaulting to the closest clean/neutral style per mode. This is intended to
 * fully merge into vibe later. */
export function defaultStyleForMode(mode: VideoMode): VideoStyle {
  return mode === "ai_avatar" ? "avatar_talking_intro" : "product_clean_showcase";
}
