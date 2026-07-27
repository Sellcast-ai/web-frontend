/**
 * Footage for the landing showcase slots. Assets are committed under
 * `public/marketing/videos/` and referenced by absolute path - see
 * `docs/marketing-showcase-sources.md` (kept out of `public/`, which is served
 * verbatim) for which Lumi job produced each clip.
 * Spec: 9:16, 10 s or longer, ~1-3 MB each; posters are the one eager fetch on
 * the page (a <video poster> loads even under preload="none"), so they stay
 * 480 wide WebP, tens of KB. Clips already inside budget are stream copies;
 * only over-budget ones are re-encoded - the doc has the exact commands.
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
 * long as this clip runs (measured from the file, never hardcoded), so any
 * length works and swapping the file is enough. */
export const HERO_OUTPUT_VIDEO: { src: string; poster?: string } | null = {
  src: "/marketing/videos/hero.mp4",
  poster: "/marketing/videos/hero.webp",
};

/** Keys match `marketing.landing.wall.*` in the catalog (category/vibe chips).
 * A tile with a src plays muted-loop; without one it renders the designed
 * gradient placeholder. `fitness` is the one deliberately empty slot: the only
 * activewear render carries a burned-in discount-sale graphic and the only gym
 * render carries a third-party store URL, so neither can go on this page. It
 * stays on the placeholder until a clean fitness render exists - see
 * `docs/marketing-showcase-sources.md`. */
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
};
