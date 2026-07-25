# Landing showcase footage - provenance

All clips here are royalty-free stock from [Pexels](https://www.pexels.com), added 22 July 2026.
They are **not** Lumi output; the landing page says so in `marketing.landing.heroStageNote` and `marketing.landing.wallDisclaimer`.
Slots are wired up in `src/components/marketing/showcase.ts`.

## Licence

[Pexels License](https://www.pexels.com/license/): free for commercial use, no attribution required, modification allowed.
Two limits that bind this page:

- Identifiable people (`hero`, `fashion`, `fitness`, `home`; `beauty` shows a partial face) must not be shown as endorsing a product or service.
  Keep the "licensed stock footage, not Lumi output" copy in place, and never attribute a testimonial, quote, or result to anyone on screen.
- The clips may not be resold or redistributed as stock.

## Files

Each `.mp4` is a local derivative: cropped/scaled to 720x1280, trimmed to a 5-10 s loop, audio stripped, ~1.1-1.7 MB.
Each `.webp` is a frame from its clip downscaled to 480x853, used as the `poster` (posters are fetched eagerly, so they stay well under the clip weight).

| Slot | File | Source clip |
| --- | --- | --- |
| `HERO_OUTPUT_VIDEO` | `hero.mp4` | https://www.pexels.com/video/video-of-woman-advertising-a-beauty-product-8141582/ |
| `beauty` | `beauty.mp4` | https://www.pexels.com/video/close-up-footage-of-a-woman-holding-a-serum-bottle-8955653/ |
| `gadgets` | `gadgets.mp4` | https://www.pexels.com/video/4982728/ |
| `home` | `home.mp4` | https://www.pexels.com/video/a-woman-using-a-kitchen-appliance-8090692/ |
| `pets` | `pets.mp4` | https://www.pexels.com/video/8473395/ |
| `fashion` | `fashion.mp4` | https://www.pexels.com/video/woman-trying-the-clothes-in-front-of-the-mirror-7679420/ |
| `fitness` | `fitness.mp4` | https://www.pexels.com/video/a-woman-working-out-using-a-resistance-band-8836979/ |
