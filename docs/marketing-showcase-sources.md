# Landing showcase footage - provenance

Every clip here is **real Lumi output** - rendered by the product itself, not licensed stock (27 July 2026).
That is why the landing page carries no stock-footage disclaimer.
If a slot ever has to fall back to stock again, the disclaimer copy has to come back with it.
Slots are wired up in `src/components/marketing/showcase.ts`; the assets themselves live under `public/marketing/videos/`.
This document stays out of `public/`, which Next.js serves verbatim - the render ids below are internal.

## Files

Each `.mp4` is 9:16 H.264 + AAC, and every one still carries the render's real voice track - `showcase-video.tsx` plays them muted behind a user-operated sound toggle, so the audio must never be stripped.
Each `.webp` is a frame from its clip downscaled to 480 wide, used as the `poster`.
The hero poster is the page's only eager fetch (a `<video poster>` loads even under `preload="none"`, so a wall of them would burst on first paint); wall posters load as their tile nears the viewport.
Either way they stay in the tens of KB, and the clips themselves stream only once their tile nears the viewport.

Clips already inside the ~1-3 MB budget are **stream copies** (`-c copy`): remuxed so the `moov` atom leads, but not re-encoded, so they lose no generation.
Only clips over budget were re-encoded, at CRF 32 - a 29/31/33 sweep compared against the source at 100% showed no visible difference on this footage, so the extra bytes bought nothing.

| Slot | File | Lumi render | Length | Size | Treatment |
| --- | --- | --- | --- | --- | --- |
| `HERO_OUTPUT_VIDEO` | `hero.mp4` | `e9e35a9ba8b93267f590b2a931e6d24f` - dark fragrance beauty shot | 15.1 s | 1.5 MB | stream copy, full length |
| `beauty` | `beauty.mp4` | `dc21fe65b1be72b23fdf0f83bfa7aa44` - 12-colour lip set, swatch demo | 19.8 s | 2.6 MB | trimmed 9.0-28.8 s, re-encoded CRF 32 |
| `gadgets` | `gadgets.mp4` | `c08aaf2e72367b30fc9662969f92db4d` - mini food chopper | 27.6 s | 2.4 MB | re-encoded CRF 32, full length |
| `home` | `home.mp4` | `5d8dadc7127f911b73c7f95e2f9d2da3` - egg slicer, egg-salad demo | 12.2 s | 0.6 MB | stream copy, full length |
| `pets` | `pets.mp4` | `4c864343f54708b31a982c952776cdb7` - dog wearing a massager | 6.1 s | 0.9 MB | stream copy, full length |
| `fashion` | `fashion.mp4` | `593af0e7cb72c9905973b307130e976e` - host to camera, jacket try-on | 22.6 s | 2.2 MB | stream copy, full length |
| `fitness` | *(empty)* | - | - | - | see below |

The render id is the output filename Lumi's video worker wrote, which is how the job is looked up backend-side.

Rebuild any of these from the source renders with:

```
# stream copy (already in budget)
ffmpeg -i <render>.mp4 -c copy -movflags +faststart <slot>.mp4
# re-encode (over budget), optionally with -ss/-t to trim
ffmpeg -ss 9.0 -t 19.8 -i <render>.mp4 -c:v libx264 -profile:v high -crf 32 -preset slow \
  -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart <slot>.mp4
# poster
ffmpeg -ss <t> -i <slot>.mp4 -vframes 1 -vf scale=480:-2 -c:v png /tmp/p.png
cwebp -q 55 -m 6 /tmp/p.png -o <slot>.webp
```

### Why `beauty.mp4` is trimmed

The render opens with ~9 s under a burned-in title card and closes with a red arrow annotation pointing at the product tray.
Both are hard-sell overlays that read as someone else's flyer on a page selling premium output, and the 20 s between them is the clip's best material anyway.
There is no true silence in the source (continuous music bed), so the cut is on the visual boundary rather than a speech gap.

### `hero.mp4` was promoted from the `beauty` slot

Until this change the hero was `593af0e7` - a presenter talking to camera with a burned-in caption - which asserted visually the two capabilities `AGENTS.md` records as built-but-off (burned-in captions, avatar mode).
The fragrance render has neither a presenter nor a caption, so the page's largest, most prominent video no longer makes a claim the product does not keep.
`593af0e7` moved to the `fashion` tile, where it is one of six clips rather than the page's opening statement; its caption is still visible there, and that is deliberate - the capability exists, only the promise that every render ships with it was removed.

### KNOWN FLAW: `fashion.mp4` carries a spelling slip

Its burned-in caption misspells a word ("in coffey").
This is noticed and accepted, not overlooked.
The clip is the hero on the live site today, so the typo is already public at a far larger size than a 1/6 tile - moving it down the page is a strict improvement, not the acceptance of a new defect.
Trimming past it is not an option: the caption is a running transcript across the whole clip, so there is no clean segment to cut to.

**Follow-up: replace `fashion.mp4` when a clean fashion render exists.**
That is a narrower reason than the `AGENTS.md` rule about not swapping captioned slots to hide the caption capability - which still stands.
Replace this one file because of the typo; do not treat it as licence to de-caption the wall.

## Empty slots

`fitness` is `null` in `showcase.ts` and renders the section's closing statement card instead of a video.
It is empty on purpose, not for want of a render:

- `88808aa9499de2154a1a41a40faa1d47` (halter top + shorts set) is the only activewear render, and carries a burned-in "10 SETS ONLY $28" price splash plus a "Sale" graphic across most of its length. A discount flyer is the opposite of what this page sells.
- `5c3680172ae4c68cddbc1bc403a115bf` (gym bag + water bottle) is the only gym-set render, and has a live third-party store URL ("SHOP NOW AT Thedrpd.com") burned into every frame. Another company's storefront must never appear on Lumi's own landing page.

Fill it when a clean fitness render exists - do not refill it with stock, and do not reach for either clip above.

## Renders considered and not used

Kept here so the same clips are not re-litigated next time.

| Render | Why not |
| --- | --- |
| `5c3680172ae4c68cddbc1bc403a115bf` | burned-in third-party store URL (`Thedrpd.com`) |
| `88808aa9499de2154a1a41a40faa1d47` | burned-in "10 SETS ONLY $28" discount graphic |
| `45766b42d90c3976f15527feecb4c128` | "Gadget Mart" store watermark on every frame, plus stock pointing-hand cursor graphics |
| `367f9dda4cfa3357491a5d426d11d547` | product demo shot over a cluttered domestic counter (spilled sprinkles, plush toys); not a premium frame |
| `3d7f5e590b703a1cf2469a626cd326d4` | pleated dress try-on, but a TikTok "Reply to User<id>'s comment" sticker covers the first 13 s of 19.4 s; the clean twirl that follows is only 6.4 s, under the 10 s floor |
| `24c0b51e04c69d790cfb600cebabc3df` | 8.2 s, under the 10 s floor |

### The 10 s floor and the `pets` exception

Landing clips run longer than 10 s so a tile does not read as a stuttering GIF.
`pets.mp4` is 6.1 s and is the one approved exception - it was chosen deliberately over leaving the tile empty.
Nothing special is done to disguise the loop: it restarts more often than its neighbours, which is visible if you watch that tile alone, but on a six-tile wall where every clip loops on its own cycle it does not stand out.
