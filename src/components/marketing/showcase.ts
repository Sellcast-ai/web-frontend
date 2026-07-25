/**
 * Footage for the landing showcase slots. Assets are committed under
 * `public/marketing/videos/` and referenced by absolute path - see
 * `public/marketing/videos/SOURCES.md` for which Lumi job produced each clip.
 * Spec: 9:16, 720x1280, 10 s or longer, ~1-3 MB each; posters are the one
 * eager fetch on the page, so they stay 480x853 WebP (tens of KB).
 *
 * Everything wired up here is real Lumi output, so the page carries no
 * stock-footage disclaimer - never let stock read as generated output, and if a
 * slot ever has to fall back to stock, the disclaimer copy comes back with it.
 * The clips carry voice; `showcase-video.tsx` plays them muted behind a
 * user-operated sound toggle.
 *
 * A null slot renders the designed placeholder state instead of a <video>.
 */

/** Sits inside the hero phone frame; revealed and played only while the
 * simulated pipeline is on its rendered step, hidden behind the stage
 * gradient for the rest of the replay. Each replay's rendered step holds for as
 * long as this clip runs, and the overlay badge is formatted from the same
 * measured length (the catalog string `marketing.landing.pipeline.duration` is
 * only the pre-metadata fallback), so any length works and swapping the file is
 * enough. */
export const HERO_OUTPUT_VIDEO: { src: string; poster?: string } | null = {
  src: "/marketing/videos/hero.mp4",
  poster: "/marketing/videos/hero.webp",
};

/** Keys match `marketing.landing.wall.*` in the catalog (category/vibe chips).
 * A tile with a src plays muted-loop; without one it renders the designed
 * gradient placeholder. Only `beauty` is filled today - the other five are
 * intentionally empty until their Lumi renders exist. */
export type WallTileKey =
  | "beauty"
  | "gadgets"
  | "home"
  | "pets"
  | "fashion"
  | "fitness";

export const OUTPUT_WALL_VIDEOS: Partial<
  Record<WallTileKey, { src: string; poster?: string }>
> = {
  beauty: {
    src: "/marketing/videos/beauty.mp4",
    poster: "/marketing/videos/beauty.webp",
  },
};
