/**
 * Real curated Lumi output footage drops in here once the captain has picked
 * it — no component changes needed, just fill in the URLs (R2/CDN, muted-loop
 * friendly MP4/WebM, ~1–2 MB each, 9:16).
 *
 * While a slot is null the components render their designed placeholder state
 * instead of a <video>, so the page never fakes having customer footage.
 */

/** Plays inside the hero phone frame (poster shown until it loads). */
export const HERO_OUTPUT_VIDEO: { src: string; poster?: string } | null = null;

/** Keys match `marketing.landing.wall.*` in the catalog (category/vibe/language
 * chips). A tile with a src plays muted-loop; without one it stays a poster. */
export type WallTileKey =
  | "beauty"
  | "gadgets"
  | "home"
  | "pets"
  | "fashion"
  | "fitness";

export const OUTPUT_WALL_VIDEOS: Partial<
  Record<WallTileKey, { src: string; poster?: string }>
> = {};
