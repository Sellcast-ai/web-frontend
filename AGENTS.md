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
  - `client.ts` - browser `api` object hitting `/api/bff/*`, throws `ApiError`
  - `hooks.ts` - React Query hooks wrapping `client.ts`
  - `types.ts` - shared API types mirroring backend schemas
- `src/components/` - `ui/` (button, badge), `app/`, `auth/`, `marketing/`, theme provider/toggle

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
