/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Sparkles,
  TrendingUp,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useProduct, useToggleLike } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DUR, EASE_OUT } from "@/components/ui/motion";
import {
  compact,
  commission,
  money,
  percent,
  priceRange,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: product, isLoading, isError } = useProduct(id);
  const like = useToggleLike();

  const images = useMemo(() => {
    if (!product) return [];
    const all = [
      product.cover_image_url,
      ...(product.hero_image_urls ?? []),
      ...(product.detail_image_urls ?? []),
    ].filter(Boolean) as string[];
    return Array.from(new Set(all));
  }, [product]);

  const [active, setActive] = useState(0);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }
  if (isError || !product) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Button href="/app/marketplace" variant="outline" size="md" className="mt-4">
          Back to marketplace
        </Button>
      </div>
    );
  }

  const metrics = [
    { label: "Monthly sales", value: compact(product.monthly_sales) },
    { label: "Total revenue", value: money(product.total_revenue) },
    { label: "Active creators", value: compact(product.creator_count_active) },
    { label: "Total views", value: compact(product.total_views) },
  ];

  return (
    <div className="container-page py-8">
      <Link
        href="/app/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Marketplace
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-card border border-border bg-muted">
            {images[active] ? (
              <AnimatePresence initial={false}>
                <motion.img
                  key={images[active]}
                  src={images[active]}
                  alt={product.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DUR.base, ease: EASE_OUT }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
            ) : (
              <div className="bg-brand-gradient h-full w-full" />
            )}
            {product.sales_mom_pct != null && product.sales_mom_pct > 0 && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                <TrendingUp className="h-3.5 w-3.5" />
                {percent(product.sales_mom_pct)} MoM
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.slice(0, 8).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                    active === i
                      ? "border-brand-400"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* info */}
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <Badge variant="brand">{product.category_display ?? "Product"}</Badge>
            <button
              type="button"
              onClick={() => like.mutate({ id: product.id, liked: product.is_liked })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
              aria-label={product.is_liked ? "Unsave" : "Save"}
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  product.is_liked ? "fill-rose text-rose" : "text-ink",
                )}
              />
            </button>
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
            {product.title}
          </h1>
          {product.shop_name && (
            <p className="mt-1 text-sm text-muted-foreground">
              by {product.shop_name}
            </p>
          )}

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-ink">
              {priceRange(product.price_min, product.price_max, product.currency)}
            </span>
            <Badge variant="success">{commission(product.commission_rate)} commission</Badge>
          </div>

          {/* metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </p>
                <p className="mt-1 font-display text-lg font-bold text-brand-700">
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {product.creator_hook && (
            <div className="mt-6 rounded-2xl bg-accent p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-accent-foreground">
                Creator hook
              </p>
              <p className="mt-1 text-sm text-ink">{product.creator_hook}</p>
            </div>
          )}

          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-ink-soft">
              {product.description}
            </p>
          )}

          {/* external links */}
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            {product.tiktok_product_url && (
              <a
                href={product.tiktok_product_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
              >
                TikTok Shop <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {product.fastmoss_product_url && (
              <a
                href={product.fastmoss_product_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
              >
                FastMoss <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* CTA */}
          <div className="mt-auto pt-8">
            <Button
              href={`/app/studio?product=${product.id}`}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              Create a video from this product
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
