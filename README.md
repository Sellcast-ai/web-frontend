# Lumi Web

Next.js 16 App Router frontend for Lumi, a Sellcast product that turns product
listings into shoppable videos. The browser talks only to the BFF routes under
`/api/bff/*`; those routes proxy the Sellcast FastAPI backend.

## Stack

- Next.js 16.2.6, React 19, TypeScript
- Tailwind CSS v4
- next-intl v4 for cookie-based UI localization
- TanStack Query v5 for API state
- lucide-react icons and Motion for animations

## Development

Install dependencies with npm, then start the local server:

```bash
npm install
npm run dev
```

The dev server runs at [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run test
npm run build
```

## Configuration

The web app needs the backend API origin and OAuth/media settings:

- `SELLCAST_API_BASE` - backend API base, for example `http://127.0.0.1:8000/api/v1`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google Web OAuth client id
- `NEXT_PUBLIC_MEDIA_ORIGIN` - media origin when backend-returned media paths need one
- `NEXT_PUBLIC_SITE_URL` - optional canonical site origin; leave unset until a custom domain is attached

The canonical site origin is centralized in `src/lib/site-url.ts`; do not
hardcode deployment hostnames.

## App Notes

Authenticated users land in `/app/products`. The launch app includes products,
studio, videos, jobs, avatars, profile, and Stores. Marketplace routes are
hidden from the web surface and old marketplace URLs redirect to My Products.

Store connection flows live under `src/app/app/connections/` and
`src/app/api/bff/auth/shopify/*`. Shopify is the only connectable platform
today, and its card is gated by a backend availability probe; WooCommerce and
TikTok Shop are shown as unavailable until their flows work end to end.
Connecting only authorizes access: the OAuth round trip stores a real Admin API
token, but no backend code reads it yet, so nothing imports or syncs from a
connected store. The only working catalog import is the public-JSON crawler on
`/app/products/new`, which is unrelated to the connection. The page subtitle, a
persistent notice under "Connect a store", and the post-OAuth banner all say so;
keep those three honest together when the Admin sync lands.

My Videos is managed through four status tabs:

- Needs you: `awaiting_storyboard`, `awaiting_review`
- On the way: `queued`, `submitted`, `in_progress`
- Failed: `failed`
- Success: `completed`

The tab mapping lives in `src/lib/video-tabs.ts` and must stay aligned with the
backend `VideoJobStatus` state machine. Video deletion is permanent and does not
refund credits; the job detail page confirms that before deleting. Videos outlive
products, so the job page links to the source product when it still exists and
shows a non-link "Product deleted" badge when the product fetch returns 404.

Everything that names a job's stage comes from one place. `jobProgressDisplay`
in `src/lib/job-progress.ts` returns the tracker step (Script, Review, Shots,
Render, Ready, in backend order), the status-badge label, and the waiting
screen's title and description together, so the badge, the tracker position, and
the body copy cannot disagree. Only the three worker statuses (`queued`,
`submitted`, `in_progress`) name a stage; the review gates, the terminal states,
and any status the client does not know get neutral copy. `StatusBadge` takes
the whole job, and its `compact` mode - used on the My Videos thumbnails, where
the full stage sentence would wrap - shortens a claimed job to the tracker's own
step label and a parked one to "Queued", while self-naming states keep saying so.
The backend reports no queue position, so the waiting screen names a stage,
never a position or an ETA.

A render waits at the storyboard gate until the seller approves it, so the job
detail page has to show what is about to be rendered. Above the shot list it
shows the script's hook angle and audience, and only the ones the storyboard
actually carries. Each shot card shows the spoken line and the shot's visual
plan at equal weight, each with an icon and a screen-reader label rather than
quote marks, and keeps the row with an italic placeholder when a field is empty.
Both are shown as the backend wrote them. The visual plan is read-only; the
spoken line changes in the shot edit drawer, never through a display filter.

Studio asks the backend what it can actually render. `GET /video/capabilities`
(through the generic BFF, `useVideoCapabilities`) narrows the mode, model,
resolution, size, and language pickers to the selected mode, and
`src/lib/video-capabilities.ts` is the only place that decides what to trust
from that payload. It can only narrow the static lists in
`src/lib/api/types.ts`, never enable an entry those lists flag off. A mode the
backend reports unavailable is disabled and blocks Generate while it stays
selected; the user is never moved off it. Sub-options do repair themselves when
the mode changes, and a missing, slow, or unreadable capability read leaves
Studio behaving exactly like the old hardcoded constants, so Generate stays
usable. The backend's own refusal remains the real gate.

Credits track real render cost, so they never convert to seconds of video: what
one render costs depends on its model, resolution, and aspect ratio. The free
grant is 300 credits one-time at signup and does not renew; paid plans renew
monthly, which is why the profile usage card swaps heading, summary, and
exhausted notice together by plan (`RENEWING_PLANS` in `src/lib/api/types.ts`).
Studio never prices a render itself - the only out-of-credits signals it trusts
are a drained meter and the backend's own refusal. `AGENTS.md` holds the full
copy rules these claims are bound to.

## Localization

Message catalogs live in `messages/*.json`; `messages/en.json` is the source of
truth and all nine catalogs must keep the same key and placeholder structure.
The non-English catalogs are seeded with `scripts/translate-messages.mjs`, whose
`MANUAL_OVERRIDES` preserve hand-verified translations and money-surface copy
that the machine translation has historically misread. The script refuses to run
while a pin names a key `en.json` no longer has, so rename pins along with their
keys. A normal run is incremental: it only retranslates leaves whose English
moved since the commit that last wrote that catalog, and keeps everything else.
`--force` rebuilds a whole catalog from machine output and clobbers hand-refined
strings, so use it only when seeding a locale from scratch. `AGENTS.md` explains
where that incremental baseline errs stale. Run the message parity tests after
changing catalog keys.

Backend failure fields are not localized user copy. Failed video reasons and
store-import failure toasts must go through `src/lib/failure-messages.ts`, which
maps known backend strings to catalog keys and falls back to translated generic
messages for anything unknown. The same holds for storyboard shot nudges: the
backend can return free-form phrases outside the five canonical taps, so the shot
card, the shot editor, and the `PATCH /storyboard` payload all filter
`Shot.outcome_nudges` through `src/lib/outcome-nudges.ts` and simply drop the
rest. API call failures should render through
`apiErrorMessage(err, localizedFallback)`, not `ApiError.message`; bare 5xx body
messages are treated as operator prose unless a structured `error_type` is
present. Metered calls (video create, retry, shot regenerate) render through
`renderFailureMessage` in `src/lib/api/hooks.ts`, which shows the localized
out-of-credits copy for the credit meter's own refusal and falls through to
`apiErrorMessage` for every other failure.

## Deployment

Deploy the app on Vercel and point `SELLCAST_API_BASE` at the deployed backend.
See `DEPLOY.md` for the launch checklist, including Google auth, optional phone
OTP, optional Shopify Stores setup, media origin, and site-origin configuration.
