"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Link2, Loader2, Plus, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMyProducts } from "@/lib/api/hooks";
import { toast } from "@/lib/toast";
import { PathHeader } from "@/components/app/path-header";
import { ProductCard } from "@/components/app/product-card";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/ui/motion";

export default function MyProductsPage() {
  const t = useTranslations("app.products");
  const router = useRouter();
  const { data, isError, isFetching, refetch, errorUpdatedAt } = useMyProducts();
  const [url, setUrl] = useState("");
  const products = data ?? [];
  // a list we've never received is the only "not loaded" state: `isLoading` is
  // false for a query paused offline, which would read as an empty catalog
  const loaded = data !== undefined;
  const showEmptyState = loaded && products.length === 0;
  const showStoreImportPrompt = loaded && products.length > 0 && products.length <= 3;
  // the error card only speaks for a list that never arrived; a refetch that
  // fails over cached products is a toast, not a banner above those products
  const showLoadError = isError && !loaded;
  const toastedErrorAt = useRef(0);

  useEffect(() => {
    if (!isError || !loaded || errorUpdatedAt === toastedErrorAt.current) return;
    toastedErrorAt.current = errorUpdatedAt;
    toast.error(t("refreshError"));
  }, [isError, loaded, errorUpdatedAt, t]);

  function goCreate() {
    const trimmed = url.trim();
    router.push(
      trimmed
        ? `/app/products/new?url=${encodeURIComponent(trimmed)}`
        : "/app/products/new",
    );
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button href="/app/products/new" size="md">
          <Plus className="h-4 w-4" />
          {t("addProduct")}
        </Button>
      </div>

      {/* Single-product paste box; whole-store imports use the prompt below. */}
      <form
        className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft focus-within:border-brand-300"
        onSubmit={(e) => {
          e.preventDefault();
          goCreate();
        }}
      >
        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("pastePlaceholder")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button size="sm" type="submit" disabled={!url.trim()}>
          {t("readLink")}
        </Button>
      </form>

      {showLoadError && (
        <section
          role="alert"
          className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft"
        >
          <p className="flex items-start gap-2 font-display font-semibold text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
            {t("loadErrorTitle")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("loadErrorDescription")}</p>
          <Button size="md" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("retry")}
          </Button>
        </section>
      )}

      {/* one empty state, whose primary action is bringing the whole store in */}
      {showEmptyState && (
        <section className="mt-6 rounded-2xl border border-brand-200 bg-accent/70 p-6 text-center shadow-soft">
          <PathHeader
            icon={Store}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            centered
          />
          <Button href="/app/products/new" size="md" className="mt-4">
            <Store className="h-4 w-4" />
            {t("storeImportCta")}
          </Button>
        </section>
      )}

      {showStoreImportPrompt && (
        <section className="mt-6 rounded-2xl border border-brand-200 bg-accent/70 p-5 shadow-soft sm:flex sm:items-center sm:justify-between sm:gap-6">
          <PathHeader
            icon={Store}
            title={t("storeImportTitle")}
            description={t("storeImportDescription")}
          />
          <Button href="/app/products/new" size="md" className="mt-4 w-full sm:mt-0 sm:w-auto">
            <Store className="h-4 w-4" />
            {t("storeImportCta")}
          </Button>
        </section>
      )}

      {!loaded && !isError && (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {products.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <StaggerItem key={p.id} index={i} className="h-full">
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </div>
      )}
    </div>
  );
}
