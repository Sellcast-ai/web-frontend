/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Heart, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductSummary, SourcePlatform } from "@/lib/api/types";
import { useToggleLike } from "@/lib/api/hooks";
import { compact, priceRange, commission, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

type SourceLabelKey =
  | "amazon"
  | "shopee"
  | "tiktokShop"
  | "walmart"
  | "lazada"
  | "aliexpress"
  | "temu"
  | "alibaba"
  | "taobao"
  | "mercadolibre"
  | "etsy"
  | "ebay"
  | "shopify"
  | "generic"
  | "manual";

const SOURCE_LABEL_KEYS: Record<SourcePlatform, SourceLabelKey> = {
  amazon: "amazon",
  shopee: "shopee",
  tiktok_shop: "tiktokShop",
  walmart: "walmart",
  lazada: "lazada",
  aliexpress: "aliexpress",
  temu: "temu",
  alibaba: "alibaba",
  taobao: "taobao",
  mercadolibre: "mercadolibre",
  etsy: "etsy",
  ebay: "ebay",
  shopify: "shopify",
  generic: "generic",
  manual: "manual",
};

export function ProductCard({ product }: { product: ProductSummary }) {
  const t = useTranslations("app.productCard");
  const tt = useTranslations("app.toasts");
  const like = useToggleLike({ updateError: tt("updateLikeFailed") });
  const img = product.cover_image_url || product.hero_image_urls?.[0];

  return (
    <Link
      href={`/app/products/${product.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {img ? (
          <img
            src={img}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="bg-brand-gradient h-full w-full" />
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            like.mutate({ id: product.id, liked: product.is_liked });
          }}
          aria-label={product.is_liked ? t("unsave") : t("save")}
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full glass"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              product.is_liked ? "fill-rose text-rose" : "text-ink",
            )}
          />
        </button>

        {product.sales_mom_pct != null && product.sales_mom_pct > 0 && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[11px] font-bold text-success">
            <TrendingUp className="h-3 w-3" />
            {percent(product.sales_mom_pct)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
          {product.category_display ?? t("productFallback")}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink">
          {product.title}
        </h3>
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-base font-bold text-ink">
              {priceRange(product.price_min, product.price_max)}
            </span>
            {product.owner_user_id ? (
              <span className="text-xs text-muted-foreground">
                {t(`source.${SOURCE_LABEL_KEYS[product.source_platform ?? "manual"] ?? "manual"}`)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("commissionShort", { rate: commission(product.commission_rate) })}
              </span>
            )}
          </div>
          {/* marketplace rows carry sales analytics; user-created rows don't */}
          {!product.owner_user_id && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("soldPerMonth", { count: compact(product.monthly_sales) })}</span>
              <span>·</span>
              <span>{t("creators", { count: compact(product.creator_count_active) })}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
