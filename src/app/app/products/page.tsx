"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, PackagePlus, Plus } from "lucide-react";
import { useMyProducts } from "@/lib/api/hooks";
import { ProductCard } from "@/components/app/product-card";
import { Button } from "@/components/ui/button";

export default function MyProductsPage() {
  const router = useRouter();
  const { data, isLoading } = useMyProducts();
  const [url, setUrl] = useState("");
  const products = data ?? [];

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
          <h1 className="font-display text-3xl font-bold text-ink">My Products</h1>
          <p className="text-muted-foreground">
            Your own products — pasted from a link or uploaded. Only you can see these.
          </p>
        </div>
        <Button href="/app/products/new" size="md">
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      {/* paste omnibox — anything droppable in: Amazon, Shopee, TikTok Shop, any store */}
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
          placeholder="Paste a product link — Amazon, Walmart, Shopee, Lazada, TikTok Shop, Etsy, or any store"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button size="sm" type="submit" disabled={!url.trim()}>
          Read link
        </Button>
      </form>

      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <PackagePlus className="h-7 w-7" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-ink">
            No products yet
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Paste a product link above, or add one from photos — then turn it into a
            video in the Studio.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
