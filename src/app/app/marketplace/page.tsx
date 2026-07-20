"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2, PackageOpen, Link2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProducts } from "@/lib/api/hooks";
import { ProductCard } from "@/components/app/product-card";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/ui/motion";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

type CategoryLabelKey =
  | "beautyPersonalCare"
  | "healthWellness"
  | "womensFashion"
  | "sportsOutdoors"
  | "homeTextiles"
  | "householdEssentials"
  | "mobileElectronics"
  | "foodBeverage"
  | "mensFashion"
  | "toysHobbies";

const CATEGORY_LABEL_KEYS: Record<string, CategoryLabelKey> = {
  "Beauty & Personal Care": "beautyPersonalCare",
  "Health & Wellness": "healthWellness",
  "Women'S Fashion": "womensFashion",
  "Sports & Outdoors": "sportsOutdoors",
  "Home Textiles": "homeTextiles",
  "Household Essentials": "householdEssentials",
  "Mobile & Electronics": "mobileElectronics",
  "Food & Beverage": "foodBeverage",
  "Men'S Fashion": "mensFashion",
  "Toys & Hobbies": "toysHobbies",
};

export default function MarketplacePage() {
  const t = useTranslations("app.marketplace");
  const tc = useTranslations("app.categories");
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(24);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  // "/" focuses search (unless already typing somewhere)
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // reset paging when filters change (adjust-state-during-render pattern)
  const filterKey = `${q}\u0000${category ?? ""}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setLimit(24);
  }

  const { data, isLoading, isFetching } = useProducts({ q, category, limit });
  const products = data ?? [];
  const canLoadMore = useMemo(
    () => products.length >= limit,
    [products.length, limit],
  );

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* search */}
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft focus-within:border-brand-300">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={searchRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-brand-400" />}
        <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground sm:block">
          /
        </kbd>
      </div>

      {/* pasted a URL? that's a product to ingest, not a search */}
      {/^https?:\/\/\S+$/.test(input.trim()) && (
        <Link
          href={`/app/products/new?url=${encodeURIComponent(input.trim())}`}
          className="mt-3 flex items-center gap-3 rounded-2xl border border-brand-300 bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:brightness-95"
        >
          <Link2 className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {t("linkCta")}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      {/* category pills */}
      <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto pb-2">
        <Pill active={!category} onClick={() => setCategory(undefined)}>
          {t("allCategories")}
        </Pill>
        {CATEGORIES.map((c) => (
          <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
            {tc(CATEGORY_LABEL_KEYS[c])}
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
            {products.map((p, i) => (
              <StaggerItem key={p.id} index={i} className="h-full">
                <ProductCard product={p} />
              </StaggerItem>
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
                    t("loadMore")
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
  const t = useTranslations("app.marketplace.empty");
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PackageOpen className="h-7 w-7" />
      </div>
      <p className="mt-4 font-display text-lg font-semibold text-ink">
        {t("title")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("description")}
      </p>
    </div>
  );
}
