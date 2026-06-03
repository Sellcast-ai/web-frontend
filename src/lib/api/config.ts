/** Server-only config for the BFF layer. Never import into client components. */

export const API_BASE =
  process.env.SELLCAST_API_BASE ?? "http://127.0.0.1:8000/api/v1";

export const COOKIE = {
  access: "lumi_at",
  refresh: "lumi_rt",
} as const;

/** Access token lives ~30m (backend default); refresh ~30d. */
export const COOKIE_MAX_AGE = {
  access: 60 * 60, // 1h cushion over the 30m token
  refresh: 60 * 60 * 24 * 30,
} as const;
