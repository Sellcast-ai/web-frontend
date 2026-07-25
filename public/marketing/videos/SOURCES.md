# Landing showcase footage - provenance

All clips here are royalty-free stock from [Pexels](https://www.pexels.com), added 22 July 2026.
They are **not** Lumi output; the landing page says so in `marketing.landing.heroStageNote` and `marketing.landing.wallDisclaimer`.
Slots are wired up in `src/components/marketing/showcase.ts`.

## Licence

[Pexels License](https://www.pexels.com/license/): free for commercial use, no attribution required, modification allowed.
Two limits that bind this page:

- Identifiable people (`hero`, `fashion`, `fitness`, `home`) must not be shown as endorsing a product or service.
  Keep the "licensed stock footage, not Lumi output" copy in place, and never attribute a testimonial, quote, or result to anyone on screen.
- The clips may not be resold or redistributed as stock.

## Files

Each `.mp4` is a local derivative: cropped/scaled to 720x1280, trimmed to a 8.5-10 s loop, audio stripped, ~1.2-1.7 MB.
Each `.jpg` is a frame from its clip, used as the `poster`.

| Slot | File | Source clip |
| --- | --- | --- |
| `HERO_OUTPUT_VIDEO` | `hero.mp4` | https://www.pexels.com/video/video-of-woman-advertising-a-beauty-product-8141582/ |
| `beauty` | `beauty.mp4` | https://www.pexels.com/video/close-up-footage-of-a-woman-holding-a-serum-bottle-8955653/ |
| `gadgets` | `gadgets.mp4` | https://www.pexels.com/video/a-person-unboxing-an-iphone-14-15728690/ |
| `home` | `home.mp4` | https://www.pexels.com/video/woman-recording-herself-cooking-8357903/ |
| `pets` | `pets.mp4` | https://www.pexels.com/video/pouring-dog-food-in-a-pet-bowl-8434094/ |
| `fashion` | `fashion.mp4` | https://www.pexels.com/video/woman-trying-the-clothes-in-front-of-the-mirror-7679420/ |
| `fitness` | `fitness.mp4` | https://www.pexels.com/video/a-woman-working-out-using-a-resistance-band-8836979/ |

The slot-to-clip mapping was reconstructed from the sourcing shortlist and checked frame by frame against the committed derivatives.
Re-verify a row before relying on it for a licence question.
