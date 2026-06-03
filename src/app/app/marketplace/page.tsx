"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, PackageOpen } from "lucide-react";
import { useProducts } from "@/lib/api/hooks";
import { ProductCard } from "@/components/app/product-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Beauty & Personal Care",
  "Health & Wellness",
  "Women'S Fashion",
  "Sports & Outdoors",
  "Home Textiles",
  "Household Essentials",
  "Mobile & Electronics",
  "Food & Beverage",
  "Men'S Fashion",
  "Toys & Hobbies",
];

export default function MarketplacePage() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(24);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  // reset paging when filters change
  useEffect(() => setLimit(24), [q, category]);

  const { data, isLoading, isFetching } = useProducts({ q, category, limit });
  const products = data ?? [];
  const canLoadMore = useMemo(
    () => products.length >= limit,
    [products.length, limit],
  );

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold text-ink">Marketplace</h1>
        <p className="text-muted-foreground">
          Trending TikTok Shop products — pick one to turn into a video.
        </p>
      </div>

      {/* search */}
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft focus-within:border-brand-300">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search products or paste a TikTok link"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-brand-400" />}
      </div>

      {/* category pills */}
      <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto pb-2">
        <Pill active={!category} onClick={() => setCategory(undefined)}>
          All
        </Pill>
        {CATEGORIES.map((c) => (
          <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
            {c.replace("'S", "'s")}
          </Pill>
        ))}
      </div>

      {/* grid */}
      {isLoading ? (
        <SkeletonGrid />
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {canLoadMore && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => setLimit((l) => l + 24)}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-brand-300 bg-accent text-accent-foreground"
          : "border-border bg-card text-muted-foreground hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-card border border-border bg-card"
        >
          <div className="aspect-square animate-pulse bg-muted" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PackageOpen className="h-7 w-7" />
      </div>
      <p className="mt-4 font-display text-lg font-semibold text-ink">
        No products found
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Try a different search or category.
      </p>
    </div>
  );
}
