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
- [ ] **Twilio** *(optional for beta)* — only if you want phone-OTP SMS; Google login alone is enough to launch
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
1. Vercel → **Import** the repo → set **Root Directory = `web`**.
2. Env vars (see `web/.env.production.example`):
   - `SELLCAST_API_BASE = https://<lumi-api>.onrender.com/api/v1`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID = <google web client id>`
   - `NEXT_PUBLIC_MEDIA_ORIGIN = https://<lumi-api>.onrender.com`
3. Deploy. (Next.js 16 is auto-detected; no extra config.)

## 3. Auth
- **Google (recommended primary for beta):** in Google Cloud create an OAuth
  **Web** client; Authorized JavaScript origins = your Vercel URL. Put the client
  id in BOTH `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (web) and `SELLCAST_GOOGLE_IOS_CLIENT_ID`
  (backend — it's the `aud` we verify).
- **Phone OTP:** works once Twilio creds are set; otherwise leave it (Google covers login).

## 4. Verify before announcing
- [ ] `curl -H 'X-User-Id: x' https://<api>/api/v1/products` → **401** (dev bypass is OFF)
- [ ] Sign in with Google on the live site → lands in `/app/marketplace`
- [ ] Create a video → worker renders it → plays on the job page
- [ ] Hit the monthly limit (`SELLCAST_FREE_TIER_MONTHLY_VIDEOS`) → create is blocked with "See plans"

## Cost control (free beta)
Each rendered video spends OpenAI + FAL credit. The guardrail is the per-user
monthly cap (`SELLCAST_FREE_TIER_MONTHLY_VIDEOS`, default 10) enforced on
`POST /video-jobs`. Lower it if you want a tighter budget. Set a hard spend cap
on the OpenAI + FAL accounts as a backstop.

## When you're ready to charge (later)
Add Stripe: a `plan` column on `users`, a checkout + webhook that sets the plan,
and the quota map in `app/services/quota.py` already keys off `plan` → just set
it. The pricing page + tiers are already built.
