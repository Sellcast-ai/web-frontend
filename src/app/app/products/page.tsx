"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Plus, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMyProducts } from "@/lib/api/hooks";
import { ProductCard } from "@/components/app/product-card";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/ui/motion";

export default function MyProductsPage() {
  const t = useTranslations("app.products");
  const router = useRouter();
  const { data, isLoading } = useMyProducts();
  const [url, setUrl] = useState("");
  const products = data ?? [];
  const showStoreImportPrompt = !isLoading && products.length <= 3;

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

      {showStoreImportPrompt && (
        <section className="mt-6 rounded-2xl border border-brand-200 bg-accent/70 p-5 shadow-soft sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                {t("storeImportTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("storeImportDescription")}
              </p>
            </div>
          </div>
          <Button href="/app/products/new" size="md" className="mt-4 w-full sm:mt-0 sm:w-auto">
            <Store className="h-4 w-4" />
            {t("storeImportCta")}
          </Button>
        </section>
      )}

      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : (
        products.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <StaggerItem key={p.id} index={i} className="h-full">
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </div>
        )
      )}
    </div>
  );
}
