/**
 * Footage for the landing showcase slots. Assets are committed under
 * `public/marketing/videos/` and referenced by absolute path - see
 * `public/marketing/videos/SOURCES.md` for provenance and licence.
 * Spec: 9:16, 720x1280, silent, 5-12 s loop, ~1-2 MB each; posters are the one
 * eager fetch on the page, so they stay 480x853 WebP (tens of KB).
 *
 * What is here today is licensed stock, not Lumi output, so the page labels it
 * as such (`marketing.landing.heroStageNote` / `wallDisclaimer`). Swapping in
 * real Lumi renders means replacing the files AND dropping those two strings -
 * never let stock footage read as generated output.
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
 * gradient placeholder. */
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
  gadgets: {
    src: "/marketing/videos/gadgets.mp4",
    poster: "/marketing/videos/gadgets.webp",
  },
  home: {
    src: "/marketing/videos/home.mp4",
    poster: "/marketing/videos/home.webp",
  },
  pets: {
    src: "/marketing/videos/pets.mp4",
    poster: "/marketing/videos/pets.webp",
  },
  fashion: {
    src: "/marketing/videos/fashion.mp4",
    poster: "/marketing/videos/fashion.webp",
  },
  fitness: {
    src: "/marketing/videos/fitness.mp4",
    poster: "/marketing/videos/fitness.webp",
  },
};
