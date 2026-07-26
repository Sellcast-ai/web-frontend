<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lumi Web

Next.js 16 (App Router) frontend for Lumi (lumi.sellcast.ai) - turns product listings into shoppable videos.
The browser never talks to the backend directly; all data flows through the BFF routes under `/api/bff/*`, which proxy to the Sellcast FastAPI backend (separate repo/dir: `../backend`, dev default `http://127.0.0.1:8000/api/v1`).

## Commands

- `npm run dev` - dev server (npm; `package-lock.json` is the lockfile)
- `npm run build` / `npm run start`
- `npm run lint` - ESLint 9 flat config (`eslint.config.mjs`, eslint-config-next)
- `npm run test` - vitest (config in `vitest.config.ts`, tests co-located as `*.test.ts`)
- No formatter script.

## Stack

- Next.js 16.2.6, React 19, TypeScript, Tailwind CSS v4 (via `@tailwindcss/postcss`, theme in `src/app/globals.css`)
- TanStack Query v5 for client state (provider in `src/components/providers.tsx`; query keys in `src/lib/api/hooks.ts` as `qk`)
- `class-variance-authority` + `clsx` + `tailwind-merge` (`cn()` in `src/lib/utils.ts`), lucide-react icons
- framer-motion (`motion` package, imported from `motion/react`) for animation; shared primitives/tokens in `src/components/ui/motion.tsx`, app-wide `<MotionConfig reducedMotion="user">` in `providers.tsx` (plus a `prefers-reduced-motion` guard for CSS keyframes in `globals.css`)
- Path alias `@/*` -> `src/*`

## Structure

- `src/app/(marketing)/` - public pages (landing, pricing, features, legal, blog...)
- `src/app/(auth)/` - login/signup (phone OTP + Google OAuth). Phone is not a guaranteed path: when `send-code` answers with the `development` delivery channel (see `src/lib/phone-auth.ts`), the form latches into an unavailable state and points at Google instead.
- `src/app/app/` - authenticated product app (products, studio, videos, jobs, avatars, profile). Marketplace is deliberately off the launch surface: the route is deleted and a temporary `redirects()` entry in `next.config.ts` sends `/app/marketplace/:path*` to `/app/products` so old bookmarks keep working; `src/lib/launch-routes.ts` owns the shared entry hrefs (`APP_HOME_HREF` is `/app/products`) and documents the restore path. Only the web surface is hidden - the backend marketplace endpoints stay reachable through the generic BFF proxy, and marketplace-sourced product rows (no `owner_user_id`) still exist, so the product detail page keeps its commission/sales-analytics blocks behind that check. `app/layout.tsx` redirects to `/login` when session cookies are absent (no middleware.ts), and sets the `Studio` title default + `TITLE_TEMPLATE`; each route owns a thin `layout.tsx` whose `generateMetadata` pulls its title from the catalog (page files are client components, so they can't export metadata themselves). A segment that declares `title.default` drops the inherited template for its children, so `products/layout.tsx` re-declares `TITLE_TEMPLATE` to keep `products/new` and `products/[id]` suffixed.
- `src/app/api/bff/` - BFF route handlers:
  - `[...path]/route.ts` - generic authenticated proxy (`maxDuration = 180` for slow Apify product parses)
  - `auth/google`, `auth/phone/send-code`, `auth/phone/verify`, `auth/logout` - set/clear session cookies
- `src/lib/api/` - the API layer:
  - `config.ts` - server-only config: `SELLCAST_API_BASE`, cookie names (`lumi_at`/`lumi_rt`)
  - `server.ts` - server-only (`import "server-only"`): `callBackend`, `proxy` with automatic refresh-token retry on 401, cookie set/clear
  - `client.ts` - browser `api` object hitting `/api/bff/*`, throws `ApiError`; `bffUpload` is an XHR-based POST used by product/avatar creation to report real upload progress (fetch can't). `uploadReferenceVideo` instead presigns via the BFF (`ReferencePresign`) then PUTs the bytes straight to storage (`putFileWithProgress`), bypassing the app server so large clips dodge serverless body limits, and returns the `public_url` to send as `reference_url`
  - `hooks.ts` - React Query hooks wrapping `client.ts`
  - `types.ts` - shared API types mirroring backend schemas
- `src/lib/toast.ts` - framework-free toast store (`toast.success/error/info` from any event handler or mutation callback); rendered by `ui/toaster.tsx`, mounted app-wide in `providers.tsx`
- `src/lib/use-dropzone.ts` - shared drag-and-drop hook (spread `props` on the drop target, style via `over`)
- `src/lib/subjects.ts` - pure helper for the storyboard locked-subjects strip (`orderedSubjects` sorts Product -> Host -> Scene and omits when empty; `SUBJECT_HEADING_KEYS` maps kind to catalog key)
- `src/lib/job-progress.ts` - pure helper for the job-detail progress tracker (`STEP_LABEL_KEYS` + `stepIndex` map `job.status` to a stage; storyboard-present on a queued/submitted job means the review gate is behind us, so it shows Render, never backtracking to Script/Beats)
- `src/lib/phone-auth.ts` - `isDevDeliveryChannel` / `DEV_DELIVERY_CHANNEL`, the single place that knows the backend's `development` SMS provider literal (`PhoneDeliveryChannel` in `types.ts`); keep it in sync with backend `app/services/sms.py` rather than string-matching the channel at call sites
- `src/lib/import-selection.ts` - pure helpers for the store-import review step (sessionStorage persistence of the *deselected* set, `selectedUrls`, and `importOutcome`, which derives the finished-import toast from the counters rather than `job.status` so a partial never reads as a clean success). The store flow is preview -> review -> commit: `POST products/import/candidates` lists the catalog, and `POST products/import` carries `source_urls` (the reviewed subset; omit it and the backend imports everything), which must report `products_found == len(source_urls)` when `source_urls` is present - the progress bar and the finished-import toast both quote that total. `candidates` must also return a `platform` drawn from the import adapter registry (currently `shopify` | `woocommerce`), because the client forwards it verbatim as the import's `platform` and `adapter_for()` raises -> 422 on anything outside that registry. And `candidates`' own page cap must be `>=` the import worker's cap: the review step is now the only way in, so anything the walk doesn't list can't be imported at all, and "select all" has to still mean everything the old whole-catalog import would have taken. All four are pending on the backend - the web side ships first, so a live store import 404s on candidates until that lands; until then the client's own `importRequested` covers the total, and the review step never re-enters the (billed) catalog walk without a click.
- `src/lib/metadata.ts` - `TITLE_TEMPLATE` (`%s · Lumi Studio`) shared by the app-shell layouts; the marketing/root template stays `%s · Lumi` in `src/app/layout.tsx`
- `src/lib/menu-placement.ts` - pure helper picking which side a popover opens on and its `maxHeight` from the trigger rect + viewport (never below `MIN_MENU_HEIGHT`), so tall menus scroll instead of spilling past the fold
- `src/lib/vibe.ts` - `defaultStyleForMode` derives the (now non-user-facing) `style` from mode. Vibe (`VIDEO_VIBES` in `types.ts`) is the hero creation control in Studio; style demotion is a locked product decision - keep sending a valid `style` in the create payload so the backend schema stays intact. Studio also has an optional "Make it like this" reference input with two tabs - paste a supported social link, or upload a clip (`api.uploadReferenceVideo` presigns + streams direct to storage) - that adds `reference_url` to the create payload only when a valid link is entered or an upload completes; Generate is gated while an upload is in flight or the link is invalid. It's additive, so no reference means the body is unchanged; the seller-facing framing is that Lumi learns vibe/energy only, never the reference's shots.
- Shot edit drawer (`ShotEditor` in `src/app/app/jobs/[id]/page.tsx`) is plain-language first: spoken line, on-screen text, the `OUTCOME_NUDGES` taps (`Shot.outcome_nudges`) and a free-text `nudge_note`; raw camera fields (`technique`/`transition_out`/`product_visible`) hide behind the "Pro mode" disclosure. The backend derives the camera fields from the taps/note (deterministic map + single-shot GPT re-derive, all via the existing `PATCH /storyboard` sending the full `VideoScript`), so the `OutcomeNudge` value strings are canonical English the backend keys on exactly - don't reword them, and don't leak camera jargon onto the main read-first path (the shot card hint shows applied taps/note, not `technique`).
- `src/components/` - `ui/` (button, badge, motion primitives, `overlay.tsx` Modal/Drawer on native `<dialog>`, toaster, upload-progress), `app/`, `auth/`, `marketing/`, theme provider/toggle

## i18n (UI language)

App-interface localization uses **next-intl v4**, cookie-based (no `[locale]` URL segment yet). Config in `src/i18n/request.ts` (`getRequestConfig` reads the `lumi-locale` cookie, default `en`; v4 requires returning `locale`), wired via `createNextIntlPlugin` in `next.config.ts`. Root `layout.tsx` is async: `getLocale()` sets `<html lang>` and `NextIntlClientProvider` (prop-less, inherits messages) wraps the client tree.

- Catalogs: `messages/<locale>.json` at repo root, `en.json` is the source of truth. All 9 UI catalogs (`en, es, zh, ja, ko, pt, id, vi, th`) mirror the same key/placeholder structure; `src/i18n/messages.test.ts` enforces parity. The 8 non-English catalogs are an AI-translated seed regenerated from `en.json` via `node scripts/translate-messages.mjs [locale...]` (protects brand names, ICU/simple placeholders, and rich-text tags; `MANUAL_OVERRIDES` in that script pins strings the machine gets wrong) - re-run after editing `en.json` keys, then refine by hand. Exception: `marketing.landing` (+ footer tagline) was hand-translated in all 8 locales (July 2026, landing rebuild) - patch those keys surgically rather than regenerating the whole catalog, which would clobber them with machine output.
- For enum/data label maps, translate at the render site: pure `lib/*` helpers expose stable catalog keys (for example `STEP_LABEL_KEYS`, `SUBJECT_HEADING_KEYS`, or `SOURCE_LABEL_KEYS` in `app/product-card.tsx`) and components call `t(key)`. Do not import next-intl hooks into `lib/*` or `hooks.ts`. Mutation hooks in `hooks.ts` that show toasts take a `messages` object of already-translated fallback strings (under `app.toasts.*`) supplied by the calling render component, so `hooks.ts` never touches the catalog itself.
- Switcher: `src/components/language-switcher.tsx` (globe dropdown, writes `lumi-locale` cookie + `router.refresh()`), mounted in the marketing `SiteHeader` (`compactOnSmall` drops the label below `sm`, keeping the aria-label) and beside `ThemeToggle` in `AppShell`. Menu direction/height are measured at open and on resize/scroll via `lib/menu-placement.ts`, so it always scrolls inside the viewport instead of clipping a locale - never wrap it in an `overflow-hidden` container or hardcode its height. Lists and enables all 9 target locales by endonym. This UI-language enablement is independent from `VIDEO_LANGUAGES` (the video-output axis, whose availability is backend/voice-QA controlled).
- **Separate from video-output language**: never route `VIDEO_LANGUAGES` labels through the catalog, and never wire the UI locale into the video-create `language` payload. See the i18n plan (PR sequence PR-1..PR-R) for remaining migration.
- Reading the cookie at the root layout makes marketing pages render dynamically; static + `hreflang` SEO is restored later by the `[locale]` prefix PR (PR-R).

## Marketing vs app styling (split posture)

The marketing surface and the logged-in app deliberately diverge (UI-sophistication PR series V1..V7).
The marketing layout wraps its tree in a `.marketing` class (`src/app/(marketing)/layout.tsx`); the scoped block in `globals.css` overrides `--font-display` to the editorial grotesk (Geist), defines `--font-accent` (Instrument Serif italic) + tighter tracking, and narrows `.container-page` to 64rem there only (the app keeps its wider 76rem).
The app never enters `.marketing`, so it keeps the SF-Rounded/Nunito cream system untouched - keep any editorial type/palette-restraint treatment scoped to `.marketing`, never at `:root` or in `app/*`.
Serif accent phrases in marketing headings use `<Accent>` (`src/components/marketing/accent.tsx`), one phrase per major heading (the `<highlight>` tag in catalog strings).
Marketing palette is monochrome + one accent (the teal `brand` ramp for CTAs; green means live/approved only - `--color-live` on the fixed-dark panels); do not reintroduce decorative rose/gold/orange or gradient headline text.
The landing (V4+V5) is banded: light hero with the simulated-pipeline stage (`marketing/pipeline-hero.tsx`, a client state machine replaying link -> pattern -> storyboard approval -> render while in view; static finished state under reduced motion), capability chip marquee, dark fake-UI media cards, one dark inset story panel, output wall, pricing, FAQ, dark CTA panel with ghost wordmark.
Showcase footage is wired through `marketing/showcase.ts` (`HERO_OUTPUT_VIDEO`, `OUTPUT_WALL_VIDEOS`) and played by `marketing/showcase-video.tsx` (poster first, bytes only near the viewport, still under reduced motion); a null slot renders the designed placeholder instead.
Those slots hold real Lumi renders (provenance in `docs/marketing-showcase-sources.md`, deliberately outside the publicly served `public/` tree), so the page carries no stock-footage disclaimer; if a slot ever falls back to stock, that copy comes back with it - never let stock read as Lumi output, or Lumi output read as stock.
Only `HERO_OUTPUT_VIDEO` and the `beauty` tile are filled; the other five wall slots are `null` on purpose until their own renders exist.
The clips carry voice, so `showcase-video.tsx` plays them muted behind a corner sound toggle that is client-only (hydration-safe) and module-scoped, so unmuting one clip mutes any other.
The marketing header is deliberately slim (logo, Pricing, language switcher, Sign in, one CTA; server component, no menu state); below `sm` the Pricing and Sign in links drop out so the row can't overflow at 320px, leaving logo + switcher + CTA (both links stay reachable from the footer, which also keeps its own sign-in link), and the theme toggle is app-only.

## Brand & share metadata

Icons and share cards are file-convention based, so there is no hand-written `<link rel="icon">` anywhere.
`src/app/favicon.ico` + `src/app/apple-icon.png` (opaque full-bleed square - iOS applies its own rounded mask and composites any transparency onto black) are picked up by Next; the 512px `public/icon.png` and `public/icon-maskable.png` deliberately live in `public/` and are referenced only from `src/app/manifest.ts`, because an `icon.png` in `src/app/` would emit a second `<link rel="icon">` competing with the favicon.
`public/lumi-mark.svg` is the vector source the raster icons were exported from - it is not loaded at runtime; re-export the PNGs from it when the mark changes.
`src/app/opengraph-image.tsx` renders the 1200x630 card with `next/og` (its inline mark must keep matching `bg-brand-gradient`); it serves Twitter/X too, so do not add a separate `twitter-image` route.
The teal gradients in `globals.css` (`bg-hero`, `bg-brand-gradient`) carry white text on the surfaces that use them (avatar initials, step badges, dark panels) - both stops must stay dark enough for 4.5:1, so do not brighten the end stop back toward the iOS aqua.

## Auth model

JWTs from the FastAPI backend are stored as httpOnly cookies (`lumi_at` access ~30m, `lumi_rt` refresh ~30d) by the BFF auth routes; tokens never reach client JS.
The catch-all proxy transparently refreshes on 401 and re-issues cookies, clearing them if refresh fails.
Google is the only path guaranteed to work in every environment: `send-code` returning `delivery_channel: "development"` means the backend only logs codes, so `AuthForm` latches the phone step into a disabled "Phone unavailable" state (`auth.phoneUnavailable*` catalog keys) instead of advancing to code entry.
That check is post-submit - availability is only known from the first send response, so the user spends one attempt before seeing it; a pre-flight availability endpoint would remove that.

## Environment

See `.env.production.example` (Vercel) and `.env.local` (dev):

- `SELLCAST_API_BASE` - server-only, backend base URL for the BFF
- `NEXT_PUBLIC_MEDIA_ORIGIN` - origin prefixed onto relative media paths returned by the backend
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - enables the "Continue with Google" button

## Deployment

Vercel (this app) -> Render (FastAPI API + video worker) -> Postgres + Cloudflare R2. See `DEPLOY.md` for the full launch checklist.

## Conventions

- Never import `src/lib/api/config.ts` or `server.ts` into client components (server-only).
- Add new backend calls to `src/lib/api/client.ts` + a hook in `hooks.ts`; the generic BFF proxy means most endpoints need no new route handler (only auth flows that touch cookies do).
- Keep types in `src/lib/api/types.ts` in sync with backend Pydantic schemas.
- Reuse the shared UI primitives instead of one-offs: mutations surface success/failure via `toast.*`, overlays go through `Modal`/`Drawer` in `ui/overlay.tsx`, animations use the tokens/primitives in `ui/motion.tsx`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
