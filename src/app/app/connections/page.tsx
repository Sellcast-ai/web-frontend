"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Plug, Store, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopifyAvailability } from "@/lib/api/hooks";
import { SHOPIFY_CONNECTED_COOKIE, normalizeShopDomain } from "@/lib/shopify-shop";
import { NEW_PRODUCT_HREF } from "@/lib/launch-routes";

/**
 * The platform grid is data-driven: adding a platform later is a new entry
 * here (with its brand mark vendored under public/platforms/) plus a catalog
 * name key (app.connections.platforms.<id>.name), not a page rewrite. `connectable` marks the platforms with a real end-to-end connect
 * flow - everything else renders an honest "not available yet" badge and no
 * action, so no card ever offers something the product can't do. End to end
 * means the authorization completes, not that a catalog arrives: nothing
 * reads the stored token yet, which is what connectNotice below says.
 */
const PLATFORMS = [
  { id: "shopify", connectable: true, logo: "/platforms/shopify.svg" },
  { id: "woocommerce", connectable: false, logo: "/platforms/woocommerce.svg" },
  { id: "tiktokShop", connectable: false, logo: "/platforms/tiktok-shop.svg" },
] as const;

const ERROR_KEYS = ["invalid-shop", "unavailable", "failed"] as const;
type ErrorCode = (typeof ERROR_KEYS)[number];

function isErrorCode(value: string | null): value is ErrorCode {
  return ERROR_KEYS.includes(value as ErrorCode);
}

function cookieValue(name: string): string | null {
  const prefix = `${name}=`;
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/app/connections; SameSite=Lax`;
}

export default function ConnectionsPage() {
  const t = useTranslations("app.connections");

  return (
    <div className="container-page max-w-4xl py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Suspense fallback={null}>
        <OutcomeBanner />
      </Suspense>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {t("connectHeading")}
        </h2>
        {/* Persistent, and deliberately outside both gates: not the post-OAuth
          * banner (a merchant who connected last week still needs to know no
          * import is coming) and not behind the availability probe (the fact
          * holds whether or not the button renders). */}
        <p className="mt-1 text-sm text-muted-foreground">
          {t.rich("connectNotice", {
            link: (chunks) => (
              <Link
                href={NEW_PRODUCT_HREF}
                className="font-semibold text-accent-foreground underline underline-offset-4"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {t("yourStores")}
        </h2>
        <div className="mt-3 flex items-start gap-3 rounded-card border border-dashed border-border bg-card p-5">
          <Store className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          <p className="text-sm text-muted-foreground">{t("listUnavailable")}</p>
        </div>
      </section>
    </div>
  );
}

/** Success/error landing after the Shopify OAuth round trip. The success query
 * only arms the banner when paired with the callback's short-lived cookie, so a
 * bare URL param cannot claim a store connected. Read once into state, then
 * scrub the URL so a reload doesn't replay the banner. */
function OutcomeBanner() {
  const t = useTranslations("app.connections");
  const sp = useSearchParams();
  const router = useRouter();
  const consumed = useRef(false);
  const [outcome, setOutcome] = useState<{
    connected: string | null;
    error: ErrorCode | null;
  }>({ connected: null, error: null });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;
    const error = isErrorCode(sp.get("error")) ? (sp.get("error") as ErrorCode) : null;
    const connected = sp.has("connected") ? cookieValue(SHOPIFY_CONNECTED_COOKIE) : null;
    if (connected) clearCookie(SHOPIFY_CONNECTED_COOKIE);
    setOutcome({ connected, error });
    if (sp.has("connected") || error) {
      router.replace("/app/connections", { scroll: false });
    }
  }, [router, sp]);

  if (dismissed || (outcome.connected === null && !outcome.error)) return null;

  const ok = outcome.connected !== null;
  const message =
    outcome.connected !== null
      ? t("connectedBanner", { shop: outcome.connected })
      : t(`errors.${outcome.error ?? "failed"}`);
  return (
    <div
      role="status"
      className={
        ok
          ? "mt-6 flex items-start gap-3 rounded-card border border-brand-300 bg-accent p-4"
          : "mt-6 flex items-start gap-3 rounded-card border border-rose/40 bg-rose/10 p-4"
      }
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose" />
      )}
      <p className="flex-1 text-sm text-ink">{message}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("dismiss")}
        className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function PlatformCard({ platform }: { platform: (typeof PLATFORMS)[number] }) {
  const t = useTranslations("app.connections");
  const name = t(`platforms.${platform.id}.name`);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        {/* White tile (not a theme token) so the brand marks read in both
          * themes - the TikTok glyph is near-black and would vanish on a
          * dark card. */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark, no optimization needed */}
          <img src={platform.logo} alt="" aria-hidden className="h-6 w-6" />
        </span>
        <p className="font-semibold text-ink">{name}</p>
        {!platform.connectable && (
          <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {t("notAvailableYet")}
          </span>
        )}
      </div>
      {platform.connectable && <ShopifyConnect />}
    </div>
  );
}

/** The only live connect action. Gated on the availability probe: the button
 * renders only when the backend confirms the OAuth round trip can start, so
 * the merchant never clicks into a flow that 404s or isn't configured. */
function ShopifyConnect() {
  const t = useTranslations("app.connections");
  const { data, isLoading } = useShopifyAvailability();
  const [shop, setShop] = useState("");

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
        {t("checkingAvailability")}
      </p>
    );
  }

  if (!data?.available) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        {t("shopifyUnavailable")}
      </p>
    );
  }

  const domain = normalizeShopDomain(shop);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!domain) return;
        window.location.assign(
          `/api/bff/auth/shopify/start?shop=${encodeURIComponent(domain)}`,
        );
      }}
    >
      <label htmlFor="shopify-shop" className="text-xs font-semibold text-ink-soft">
        {t("shopDomainLabel")}
      </label>
      <input
        id="shopify-shop"
        type="text"
        value={shop}
        onChange={(e) => setShop(e.target.value)}
        placeholder={t("shopDomainPlaceholder")}
        autoComplete="off"
        spellCheck={false}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-ink placeholder:text-muted-foreground focus:border-brand-400 focus:outline-none"
      />
      <Button type="submit" size="sm" disabled={!domain} className="mt-1 self-start">
        <Plug className="h-4 w-4" />
        {t("connect")}
      </Button>
    </form>
  );
}
