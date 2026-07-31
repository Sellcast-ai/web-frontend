# Lumi Web

Next.js 16 App Router frontend for Lumi, a web app that turns product listings
into shoppable videos. The browser talks only to BFF routes under `/api/bff/*`;
those routes proxy the Sellcast FastAPI backend.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In local development the
BFF defaults to `http://127.0.0.1:8000/api/v1`; override it with
`SELLCAST_API_BASE` when the backend runs elsewhere.

## Main Surfaces

- Marketing pages live under `src/app/(marketing)/`.
- Login and signup live under `src/app/(auth)/`.
- The authenticated app lives under `src/app/app/`: Products, Stores, Studio,
  Videos, Avatars, and Profile.
- Store connection flows live under `src/app/app/connections/` and
  `src/app/api/bff/auth/shopify/*`. Shopify is the only connectable platform
  today, and its card is gated by a backend availability probe; WooCommerce and
  TikTok Shop are shown as unavailable until their flows work end to end.

## Commands

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - run the production server
- `npm run lint` - run ESLint
- `npm run test` - run Vitest

## Deployment

Deploy the app on Vercel and point `SELLCAST_API_BASE` at the deployed backend.
See `DEPLOY.md` for the launch checklist, including Google auth, optional phone
OTP, optional Shopify Stores setup, media origin, and site-origin configuration.
