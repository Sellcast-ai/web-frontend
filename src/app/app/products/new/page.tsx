/* eslint-disable @next/next/no-img-element */
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Link2,
  Loader2,
  ImagePlus,
  Sparkles,
  AlertTriangle,
  Check,
  ArrowLeft,
  PencilLine,
} from "lucide-react";
import { useParseProduct, useCreateProduct } from "@/lib/api/hooks";
import type { ProductDraft, SourcePlatform } from "@/lib/api/types";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 12;
const MAX_UPLOAD_MB = 8;

const PLATFORM_LABELS: Record<SourcePlatform, string> = {
  amazon: "Amazon",
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
  walmart: "Walmart",
  lazada: "Lazada",
  aliexpress: "AliExpress",
  temu: "Temu",
  alibaba: "Alibaba",
  taobao: "Taobao",
  mercadolibre: "Mercado Libre",
  etsy: "Etsy",
  ebay: "eBay",
  generic: "Web store",
  manual: "Manual",
};

type Upload = { filename: string; dataUrl: string; base64: string };

type Draft = {
  source_platform: SourcePlatform;
  source_url: string | null;
  title: string;
  description: string;
  category: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  warnings: string[];
  /** Scraped image URLs with their review-card selection state. */
  parsedImages: { url: string; selected: boolean }[];
  uploads: Upload[];
};

function emptyDraft(sourceUrl: string | null): Draft {
  return {
    source_platform: "manual",
    source_url: sourceUrl,
    title: "",
    description: "",
    category: null,
    price_min: null,
    price_max: null,
    currency: "USD",
    warnings: [],
    parsedImages: [],
    uploads: [],
  };
}

function draftFromParse(parsed: ProductDraft): Draft {
  return {
    source_platform: parsed.source_platform,
    source_url: parsed.source_url,
    title: parsed.title,
    description: parsed.description,
    category: parsed.suggested_category,
    price_min: parsed.price_min,
    price_max: parsed.price_max,
    currency: parsed.currency ?? "USD",
    warnings: parsed.warnings,
    parsedImages: parsed.image_urls.map((url) => ({ url, selected: true })),
    uploads: [],
  };
}

function readImageFile(file: File): Promise<Upload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        filename: file.name,
        dataUrl,
        base64: dataUrl.split(",")[1] ?? "",
      });
    };
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      }
    >
      <NewProductInner />
    </Suspense>
  );
}

function NewProductInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const parse = useParseProduct();
  const create = useCreateProduct();

  const [url, setUrl] = useState(sp.get("url") ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const autoParsed = useRef(false);

  const runParse = useCallback(
    (target: string) => {
      const trimmed = target.trim();
      if (!trimmed) return;
      parse.mutate(trimmed, {
        onSuccess: (parsed) => setDraft(draftFromParse(parsed)),
      });
    },
    [parse],
  );

  // ?url= deep link (from the marketplace search box) parses on arrival
  useEffect(() => {
    const fromQuery = sp.get("url");
    if (fromQuery && !autoParsed.current) {
      autoParsed.current = true;
      runParse(fromQuery);
    }
  }, [sp, runParse]);

  async function addFiles(files: FileList | File[]) {
    if (!files.length) return;
    setUploadError(null);
    const current = draft ?? emptyDraft(null);
    const room =
      MAX_IMAGES -
      current.uploads.length -
      current.parsedImages.filter((i) => i.selected).length;
    const accepted: Upload[] = [];
    for (const file of Array.from(files).slice(0, Math.max(room, 0))) {
      if (!file.type.startsWith("image/")) {
        setUploadError(`${file.name} isn't an image.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        setUploadError(`${file.name} is over ${MAX_UPLOAD_MB}MB.`);
        continue;
      }
      accepted.push(await readImageFile(file));
    }
    if (accepted.length) {
      setDraft({ ...current, uploads: [...current.uploads, ...accepted] });
    }
  }

  async function submit() {
    if (!draft) return;
    const imageUrls = draft.parsedImages.filter((i) => i.selected).map((i) => i.url);
    const product = await create.mutateAsync({
      title: draft.title.trim(),
      description: draft.description.trim(),
      category_display: draft.category,
      source_platform: draft.source_platform,
      source_url: draft.source_url,
      price_min: draft.price_min,
      price_max: draft.price_max,
      currency: draft.currency,
      image_urls: imageUrls,
      uploaded_images: draft.uploads.map((u) => ({
        filename: u.filename,
        data_base64: u.base64,
      })),
    });
    router.push(`/app/studio?product=${product.id}`);
  }

  const selectedCount = draft
    ? draft.parsedImages.filter((i) => i.selected).length + draft.uploads.length
    : 0;
  const canSubmit =
    !!draft && draft.title.trim().length >= 2 && selectedCount > 0 && !create.isPending;

  return (
    <div className="container-page max-w-3xl py-8">
      {draft === null ? (
        <>
          <h1 className="font-display text-3xl font-bold text-ink">Add a product</h1>
          <p className="mt-1 text-muted-foreground">
            Paste any product link — Amazon, Walmart, Shopee, Lazada, TikTok Shop,
            Etsy, eBay, or your own store — or start from photos. Lumi reads the page;
            you confirm before anything renders.
          </p>

          {/* URL omnibox */}
          <form
            className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft focus-within:border-brand-300"
            onSubmit={(e) => {
              e.preventDefault();
              runParse(url);
            }}
          >
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://… product link"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <Button size="sm" type="submit" disabled={parse.isPending || !url.trim()}>
              {parse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Read link"}
            </Button>
          </form>
          {parse.isError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
              <div>
                <p className="text-ink">{(parse.error as Error)?.message}</p>
                <button
                  type="button"
                  className="mt-1 font-semibold text-brand-700"
                  onClick={() => setDraft(emptyDraft(url.trim() || null))}
                >
                  Add it manually instead →
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* manual / photo start */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setDraft(emptyDraft(null));
                setTimeout(() => fileInput.current?.click(), 0);
              }}
              className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-left transition-colors hover:border-brand-400"
            >
              <ImagePlus className="h-6 w-6 text-brand-600" />
              <p className="mt-2 font-display font-semibold text-ink">Start from photos</p>
              <p className="text-xs text-muted-foreground">
                Upload product shots; describe it on the next step.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDraft(emptyDraft(null))}
              className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-left transition-colors hover:border-brand-400"
            >
              <PencilLine className="h-6 w-6 text-brand-600" />
              <p className="mt-2 font-display font-semibold text-ink">Start from scratch</p>
              <p className="text-xs text-muted-foreground">
                Type the details yourself, add photos as you go.
              </p>
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              parse.reset();
            }}
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Start over
          </button>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            Check the details
          </h1>
          <p className="mt-1 text-muted-foreground">
            This is what the video will be based on — 10 seconds here saves a bad render.
          </p>

          {draft.source_url && (
            <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              {PLATFORM_LABELS[draft.source_platform]}
              <span className="truncate font-normal opacity-80">{draft.source_url}</span>
            </p>
          )}

          {draft.warnings.length > 0 && (
            <div className="mt-4 space-y-1 rounded-xl border border-border bg-card p-3">
              {draft.warnings.map((w) => (
                <p key={w} className="flex items-start gap-2 text-sm text-ink">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  {w}
                </p>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-6">
            <Field label="Title">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Product name"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand-300"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What it is, who it's for, why it's good — facts only, the script is written from this."
                rows={5}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand-300"
              />
            </Field>

            <Field label="Category">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, category: draft.category === c ? null : c })
                    }
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors",
                      draft.category === c
                        ? "border-brand-300 bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-ink",
                    )}
                  >
                    {categoryLabel(c)}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label={`Photos · ${selectedCount} selected`}
              hint="First selected photo is the hero the video is built around. Untick size charts and banners."
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {draft.parsedImages.map((image, index) => (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => {
                      const next = [...draft.parsedImages];
                      next[index] = { ...image, selected: !image.selected };
                      setDraft({ ...draft, parsedImages: next });
                    }}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-xl border-2 transition-all",
                      image.selected
                        ? "border-brand-400"
                        : "border-border opacity-40 grayscale",
                    )}
                  >
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                    {image.selected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
                {draft.uploads.map((upload, index) => (
                  <div
                    key={`${upload.filename}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-xl border-2 border-brand-400"
                  >
                    <img src={upload.dataUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          uploads: draft.uploads.filter((_, i) => i !== index),
                        })
                      }
                      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-brand-400 hover:text-brand-700"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs font-semibold">Add</span>
                </button>
              </div>
              {uploadError && <p className="mt-2 text-xs text-rose">{uploadError}</p>}
            </Field>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Button size="lg" onClick={submit} disabled={!canSubmit}>
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Save & make a video
                </>
              )}
            </Button>
            {selectedCount === 0 && (
              <p className="text-xs text-muted-foreground">
                Add at least one real product photo first.
              </p>
            )}
          </div>
          {create.isError && (
            <p className="mt-3 text-sm text-rose">
              {(create.error as Error)?.message || "Couldn't save the product. Try again."}
            </p>
          )}
        </>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600">
        {label}
      </h2>
      {hint && <p className="-mt-1 mb-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}
