# Landing showcase footage - provenance

Every clip here is **real Lumi output** - rendered by the product itself, not licensed stock (25 July 2026).
That is why the landing page carries no stock-footage disclaimer.
If a slot ever has to fall back to stock again, the disclaimer copy has to come back with it.
Slots are wired up in `src/components/marketing/showcase.ts`; the assets themselves live under `public/marketing/videos/`.
This document stays out of `public/`, which Next.js serves verbatim - the render ids below are internal.

## Files

Each `.mp4` is the render as Lumi produced it - 9:16, 720x1280, H.264 + AAC audio - never re-encoded (`hero.mp4` is trimmed with a stream copy, see below).
Some older clips carry burned-in captions from when that encode step was enabled; it is off in production today, so do not read these files as a promise that new renders ship captions (see `AGENTS.md`).
Each `.webp` is a frame from its clip downscaled to 480x853, used as the `poster` (posters are fetched eagerly, so they stay well under the clip weight).
The clips carry voice, so `showcase-video.tsx` plays them muted behind a user-operated sound toggle.

| Slot | File | Lumi render | Length |
| --- | --- | --- | --- |
| `HERO_OUTPUT_VIDEO` | `hero.mp4` | `593af0e7cb72c9905973b307130e976e` - jacket try-on, host to camera | 15.7 s (trimmed from 22.6 s) |
| `beauty` | `beauty.mp4` | `e9e35a9ba8b93267f590b2a931e6d24f` - fragrance product beauty shot | 15.1 s |

`hero.mp4` is a stream copy of the render cut in the speech gap after "I also have this in ivory".
The hero's simulated pipeline holds its rendered step for exactly as long as this clip runs, so the full 22.6 s left the rest of the replay motionless for three quarters of every loop.

The render id is the output filename Lumi's video worker wrote, which is how the job is looked up backend-side.

## Empty slots

`gadgets`, `home`, `pets`, `fashion` and `fitness` are intentionally `null` in `showcase.ts` and render the designed gradient placeholder.
They stay empty until each has its own Lumi render - do not refill them with stock.
