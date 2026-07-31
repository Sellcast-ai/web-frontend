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

## Localization

Message catalogs live in `messages/*.json`; `messages/en.json` is the source of
truth and all nine catalogs must keep the same key and placeholder structure.
Run the message parity tests after changing catalog keys.

Backend failure fields are not localized user copy. Failed video reasons and
store-import failure toasts must go through `src/lib/failure-messages.ts`, which
maps known backend strings to catalog keys and falls back to translated generic
messages for anything unknown. API call failures should render through
`apiErrorMessage(err, localizedFallback)`, not `ApiError.message`; bare 5xx body
messages are treated as operator prose unless a structured `error_type` is
present.

## Deployment

Deploy the app on Vercel and point `SELLCAST_API_BASE` at the deployed backend.
See `DEPLOY.md` for the launch checklist, including Google auth, optional phone
OTP, optional Shopify Stores setup, media origin, and site-origin configuration.
