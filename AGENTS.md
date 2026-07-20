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
- `src/app/(auth)/` - login/signup (phone OTP + Google OAuth)
- `src/app/app/` - authenticated product app (marketplace, products, studio, videos, jobs, avatars, profile). `app/layout.tsx` redirects to `/login` when session cookies are absent (no middleware.ts).
- `src/app/api/bff/` - BFF route handlers:
  - `[...path]/route.ts` - generic authenticated proxy (`maxDuration = 180` for slow Apify product parses)
  - `auth/google`, `auth/phone/send-code`, `auth/phone/verify`, `auth/logout` - set/clear session cookies
- `src/lib/api/` - the API layer:
  - `config.ts` - server-only config: `SELLCAST_API_BASE`, cookie names (`lumi_at`/`lumi_rt`)
  - `server.ts` - server-only (`import "server-only"`): `callBackend`, `proxy` with automatic refresh-token retry on 401, cookie set/clear
  - `client.ts` - browser `api` object hitting `/api/bff/*`, throws `ApiError`; `bffUpload` is an XHR-based POST used by product/avatar creation to report real upload progress (fetch can't)
  - `hooks.ts` - React Query hooks wrapping `client.ts`
  - `types.ts` - shared API types mirroring backend schemas
- `src/lib/toast.ts` - framework-free toast store (`toast.success/error/info` from any event handler or mutation callback); rendered by `ui/toaster.tsx`, mounted app-wide in `providers.tsx`
- `src/lib/use-dropzone.ts` - shared drag-and-drop hook (spread `props` on the drop target, style via `over`)
- `src/lib/subjects.ts` - pure helper for the storyboard locked-subjects strip (`orderedSubjects` sorts Product -> Host -> Scene and omits when empty; `SUBJECT_HEADING_KEYS` maps kind to catalog key)
- `src/lib/job-progress.ts` - pure helper for the job-detail progress tracker (`STEP_LABEL_KEYS` + `stepIndex` map `job.status` to a stage; storyboard-present on a queued/submitted job means the review gate is behind us, so it shows Render, never backtracking to Script/Beats)
- `src/lib/vibe.ts` - `defaultStyleForMode` derives the (now non-user-facing) `style` from mode. Vibe (`VIDEO_VIBES` in `types.ts`) is the hero creation control in Studio; style demotion is a locked product decision - keep sending a valid `style` in the create payload so the backend schema stays intact.
- `src/components/` - `ui/` (button, badge, motion primitives, `overlay.tsx` Modal/Drawer on native `<dialog>`, toaster, upload-progress), `app/`, `auth/`, `marketing/`, theme provider/toggle

## i18n (UI language)

App-interface localization uses **next-intl v4**, cookie-based (no `[locale]` URL segment yet). Config in `src/i18n/request.ts` (`getRequestConfig` reads the `lumi-locale` cookie, default `en`; v4 requires returning `locale`), wired via `createNextIntlPlugin` in `next.config.ts`. Root `layout.tsx` is async: `getLocale()` sets `<html lang>` and `NextIntlClientProvider` (prop-less, inherits messages) wraps the client tree.

- Catalogs: `messages/<locale>.json` at repo root, `en.json` is the source of truth. Namespaced by area (`nav`, `app.nav`, ...). Migrate a literal by adding a key and calling `t()` (server: `getTranslations`, client: `useTranslations`); un-migrated areas keep hardcoded English.
- For enum/data label maps, translate at the render site: pure `lib/*` helpers expose stable catalog keys (for example `STEP_LABEL_KEYS`, `SUBJECT_HEADING_KEYS`, or `SOURCE_LABEL_KEYS` in `app/product-card.tsx`) and components call `t(key)`. Do not import next-intl hooks into `lib/*` or `hooks.ts`. Mutation hooks in `hooks.ts` that show toasts take a `messages` object of already-translated fallback strings (under `app.toasts.*`) supplied by the calling render component, so `hooks.ts` never touches the catalog itself.
- Switcher: `src/components/language-switcher.tsx` (globe dropdown, writes `lumi-locale` cookie + `router.refresh()`), mounted beside `ThemeToggle` in `SiteHeader` and `AppShell`. Lists all 9 target locales by endonym; only `en` is enabled (`enabled` flag gates the rest until their catalogs land). This UI-language `enabled` gate is independent from `VIDEO_LANGUAGES` (the video-output axis, which now enables all 8 backend-supported languages and omits `vi`).
- **Separate from video-output language**: never route `VIDEO_LANGUAGES` labels through the catalog, and never wire the UI locale into the video-create `language` payload. See the i18n plan (PR sequence PR-1..PR-R) for remaining migration.
- Reading the cookie at the root layout makes marketing pages render dynamically; static + `hreflang` SEO is restored later by the `[locale]` prefix PR (PR-R).

## Marketing vs app styling (split posture)

The marketing surface and the logged-in app deliberately diverge (UI-sophistication PR series V1..V7).
The marketing layout wraps its tree in a `.marketing` class (`src/app/(marketing)/layout.tsx`); the scoped block in `globals.css` overrides `--font-display` to the editorial grotesk (Geist), defines `--font-accent` (Instrument Serif italic) + tighter tracking, and narrows `.container-page` to 64rem there only (the app keeps its wider 76rem).
The app never enters `.marketing`, so it keeps the SF-Rounded/Nunito cream system untouched - keep any editorial type/palette-restraint treatment scoped to `.marketing`, never at `:root` or in `app/*`.
Serif accent phrases in marketing headings use `<Accent>` (`src/components/marketing/accent.tsx`), one phrase per major heading.
Marketing palette is monochrome + one accent (the teal `brand` ramp for CTAs; green for success/live only); do not reintroduce decorative rose/gold/orange or gradient headline text.

## Auth model

JWTs from the FastAPI backend are stored as httpOnly cookies (`lumi_at` access ~30m, `lumi_rt` refresh ~30d) by the BFF auth routes; tokens never reach client JS.
The catch-all proxy transparently refreshes on 401 and re-issues cookies, clearing them if refresh fails.

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
