# Lumi — Free-Beta Launch Guide

Everything is coded for a free public beta (quota-capped, no payments). What's
left is creating accounts + plugging in keys + deploying. ~1–2 hours.

Architecture: **Vercel** (Next.js web + BFF) → **Render** (FastAPI API + video
worker) → **Postgres** (prod) → **Cloudflare R2** (rendered media).

---

## 0. Accounts you create
- [ ] **Vercel** (web hosting) — free tier fine to start
- [ ] **Render** (API + worker) — Starter (~$7/svc)  *(or Fly/Railway)*
- [ ] **Prod Postgres** — a new Neon project/branch (NOT the dev one), or Render Postgres
- [ ] **Google Cloud OAuth** — a **Web** OAuth client (free) → enables Google login
- [ ] **Twilio** *(optional for beta)* — only if you want phone-OTP SMS; Google login alone is enough to launch (without it the web signup form shows phone as unavailable, see §3)
- [ ] **Shopify Partner app** *(optional for beta)* — only if Stores should offer Shopify connect; without deployed backend routes and OAuth config the web card shows "not available yet" instead of a failing button. Connecting authorizes access only, it does not import a catalog yet (see §3)
- [ ] **Cloudflare R2** — already configured (reuse the dev bucket or make a prod one)
- [ ] A **domain** (optional; Vercel/Render give free subdomains)

## 1. Backend (Render)
1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo → it reads `backend/render.yaml`
   (creates `lumi-api` web service + `lumi-worker`).
3. In the `lumi-shared` env group, fill every `sync: false` secret (see
   `backend/.env.production.example`). **Confirm `SELLCAST_AUTH_DEV_MODE=false`.**
4. Initialize the prod DB (one-off shell on lumi-api):
   ```
   PYTHONPATH=. python scripts/bootstrap_db.py
   PYTHONPATH=. python scripts/seed_database.py
   ```
   Note the dev DB had 3 hand-added columns + the `videojobstatus` `AWAITING_REVIEW`
   enum + `video_job_beats` table; a fresh `bootstrap_db.py` creates them all, so
   no manual migration needed on a clean DB.
5. `lumi-api` health check: `GET /api/v1/health` → `{"status":"ok"}`.

## 2. Web (Vercel)
1. Vercel → **Import** the `Sellcast-ai/web-frontend` repo → **Root Directory = repo root** (leave default; the Next.js app is at the repo root, not under `web/`).
2. Env vars:
   - `SELLCAST_API_BASE = https://<lumi-api>.onrender.com/api/v1`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID = <google web client id>`
   - `NEXT_PUBLIC_MEDIA_ORIGIN = https://<lumi-api>.onrender.com`
   - `NEXT_PUBLIC_SITE_URL` - **leave unset** while there's no custom domain; `SITE_URL`
     (`src/lib/site-url.ts`) falls back to the Vercel deployment origin. Set it to the real
     origin (e.g. `https://lumi.example.com`) the day a domain is attached - that one var
     drives `metadataBase`, `/robots.txt` and `/sitemap.xml`.
3. Deploy. (Next.js 16 is auto-detected; no extra config.)

## 3. Auth
- **Google (recommended primary for beta):** in Google Cloud create an OAuth
  **Web** client; Authorized JavaScript origins = your Vercel URL. Put the client
  id in BOTH `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (web) and `SELLCAST_GOOGLE_IOS_CLIENT_ID`
  (backend — it's the `aud` we verify).
- **Shopify Stores:** the web BFF exposes `/api/bff/auth/shopify/start`,
  `/callback`, and `/status`, but it only enables the Stores connect form when
  the backend `connections/shopify/start` route returns a real Shopify authorize
  redirect. Configure the backend Shopify OAuth secrets and set the Shopify app
  callback URL to the web origin's `/api/bff/auth/shopify/callback`; otherwise
  `/app/connections` intentionally shows Shopify as unavailable. A completed
  connect stores a real encrypted Admin API token and nothing else: no backend
  code reads it yet, so a connected store imports and syncs nothing. The page
  says that in three places (subtitle, the persistent notice under "Connect a
  store", the post-OAuth banner) and points merchants at the one import that
  works today, the public-JSON crawler on `/app/products/new`. Nothing here is
  a misconfiguration to chase.
- **Phone OTP:** works once Twilio creds are set. Until then the web form disables
  the phone step with a "Phone unavailable" message pointing at Google, so an
  unconfigured phone path never looks broken, it just looks closed. Two backend
  answers latch that same state: `delivery_channel: "development"` (codes logged,
  never sent, dev/staging), and a `503` carrying `error_type: "SmsNotConfiguredError"`
  from a production API with no SMS provider - see `src/lib/phone-auth.ts`, which
  matches the structured `error_type` *or* any 503 from `send-code`, never message
  prose. Note the form only learns this from the first send response, so the user
  spends one attempt before seeing it.

## 4. Verify before announcing
- [ ] `curl -H 'X-User-Id: x' https://<api>/api/v1/products` → **401** (dev bypass is OFF)
- [ ] Sign in with Google on the live site → lands in `/app/products`
- [ ] Open `/app/connections` while signed in. If Shopify OAuth is configured on
  the backend, the Shopify card accepts `your-shop.myshopify.com` and returns
  with a success banner only after the backend reports an active connection; if
  it is not configured, the card honestly reads unavailable. No products appear
  in My Products afterwards - that is the current state, not a bad deploy, and
  the banner must not claim otherwise (§3). Check the notice under "Connect a
  store" is on the page before any connect attempt and its link reaches
  `/app/products/new`
- [ ] Create a video → worker renders it → it appears under My Videos **Success** and plays on the job page. Leave the mode on Studio's **Product only** default; **AI Avatar** reads "Temporarily unavailable" and blocks **Generate** when the backend's `GET /video/capabilities` reports it off, and is otherwise still selectable without producing a working render, so a failure there is expected, not a bad deploy (see `AGENTS.md`)
- [ ] Open Studio against a backend without `GET /video/capabilities` (or with it failing) → the mode, model, resolution, size and language pickers still show the full static lists and **Generate** still works. Capability data may only narrow those pickers, so a picker that came back empty or a blocked Generate with no unavailable mode selected is a bug, not a backend outage
- [ ] Check My Videos management: `awaiting_storyboard` / `awaiting_review` jobs show under **Needs you**, `queued` / `submitted` / `in_progress` jobs under **On the way**, failed jobs under **Failed**, and deleting a job requires the permanent/no-refund confirmation before it disappears from the list.
- [ ] Drain the credit meter (`SELLCAST_FREE_TIER_MONTHLY_VIDEOS`) → Studio disables **Generate** at zero remaining and says why, and a create the backend refuses shows the localized out-of-credits toast, never the backend's English refusal prose. "See plans" → `/pricing` offers the signed-in user the "Billing isn't self-serve yet" dialog with a `mailto:` to `BILLING_EMAIL` (`src/lib/contact.ts`), **not** a signup link or a checkout
- [ ] Open `/app/profile` on a free account → the usage card reads as a one-time credit grant, never "this month" / "resets"; only a plan literal in `RENEWING_PLANS` (`src/lib/api/types.ts`, mirroring the backend's `settings.plan_monthly_credits`) earns the monthly wording, and an unrecognised one claims neither
- [ ] While signed in, browse the marketing pages → header and every CTA read "Open Studio"; opening `/signup` or `/login` directly redirects into the app
- [ ] Paste the live URL into Slack/X → the Lumi share card renders (`/opengraph-image`), and the tab favicon is the Lumi mark, not the Next.js default. `metadataBase` resolves from `SITE_URL` (`src/lib/site-url.ts`), which defaults to the Vercel deployment origin - once a real domain is attached, set `NEXT_PUBLIC_SITE_URL` to it in Vercel (all environments) and redeploy, or the card URL keeps pointing at the old origin.

## Cost control (free beta)
Each rendered video spends OpenAI + FAL credit, and shot regenerations during
review spend 1 credit each from the same balance. The guardrail is the per-user
cap (`SELLCAST_FREE_TIER_MONTHLY_VIDEOS`, default 10) enforced on
`POST /video-jobs`. Lower it if you want a tighter budget. Set a hard spend cap
on the OpenAI + FAL accounts as a backstop.

**The backend credit lane is a launch prerequisite.** The web copy already
states the 2026-08-01 credit model (credits track real render cost, decided by
model, resolution and aspect ratio; the free grant is 300 credits one-time and
never renews; paid plans are Creator 900 / Pro 3,000 / Scale 7,500 per month),
while the deployed backend still meters rendered seconds under the cap above.
That copy was approved as ahead-of-backend, so flipping the grant and the plan
allowances happens before announcing, not after (credit section of `AGENTS.md`).

## When you're ready to charge (later)
Add Stripe: a `plan` column on `users`, a checkout + webhook that sets the plan,
and the quota map in `app/services/quota.py` already keys off `plan` → just set
it. The pricing page + tiers are already built; until checkout exists a signed-in
visitor clicking a paid tier gets the "Billing isn't self-serve yet" dialog
(`marketing.pricing.upgrade.*`) mailing `BILLING_EMAIL`, and the pricing FAQ
(`faq.a3`/`.a4`) says the same. Point those at the checkout when it lands, in all
nine catalogs, and keep dialog and FAQ telling the same story.
