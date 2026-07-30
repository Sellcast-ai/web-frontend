import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE } from "@/lib/api/config";
import { APP_HOME_HREF } from "@/lib/launch-routes";

/**
 * Presence of a session cookie - the single session predicate for server
 * components (existence only; the BFF proxy owns validity/refresh).
 */
export async function hasSession() {
  const store = await cookies();
  return Boolean(store.get(COOKIE.access) || store.get(COOKIE.refresh));
}

/**
 * Auth pages (`/login`, `/signup`) are for visitors only: a user who already
 * holds a session is sent to the app, so no authenticated user can ever land
 * on signup from any CTA.
 */
export async function redirectIfAuthenticated() {
  if (await hasSession()) redirect(APP_HOME_HREF);
}
