/* eslint-disable @next/next/no-img-element */
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Link2,
  Loader2,
  ImagePlus,
  Sparkles,
  AlertTriangle,
  Check,
  ArrowLeft,
  PencilLine,
  Store,
} from "lucide-react";
import {
  useParseProduct,
  useCreateProduct,
  usePreviewImport,
  useStartImport,
  useImportJob,
  qk,
} from "@/lib/api/hooks";
import type { ProductDraft, SourcePlatform } from "@/lib/api/types";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/components/ui/upload-progress";
import { useDropzone } from "@/lib/use-dropzone";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 12;
const MAX_UPLOAD_MB = 8;

type PlatformLabelKey =
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

const PLATFORM_LABEL_KEYS: Record<SourcePlatform, PlatformLabelKey> = {
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
  const t = useTranslations("app.productsNew");
  const tc = useTranslations("app.categories");
  const tp = useTranslations("app.platforms");
  const tt = useTranslations("app.toasts");
  const router = useRouter();
  const sp = useSearchParams();
  const parse = useParseProduct();
  const [progress, setProgress] = useState(0);
  const create = useCreateProduct({ saveError: tt("saveProductFailed") }, setProgress);

  const [url, setUrl] = useState(sp.get("url") ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const autoParsed = useRef(false);
  // only one screen renders at a time, so both drop targets share this
  const drop = useDropzone((files) => void addFiles(files));

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
    setReading(true);
    try {
      const current = draft ?? emptyDraft(null);
      const room =
        MAX_IMAGES -
        current.uploads.length -
        current.parsedImages.filter((i) => i.selected).length;
      const accepted: Upload[] = [];
      for (const file of Array.from(files).slice(0, Math.max(room, 0))) {
        if (!file.type.startsWith("image/")) {
          setUploadError(t("upload.notImageError", { filename: file.name }));
          continue;
        }
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
          setUploadError(
            t("upload.tooLargeError", { filename: file.name, max: MAX_UPLOAD_MB }),
          );
          continue;
        }
        accepted.push(await readImageFile(file));
      }
      if (accepted.length) {
        setDraft({ ...current, uploads: [...current.uploads, ...accepted] });
      }
    } finally {
      setReading(false);
    }
  }

  async function submit() {
    if (!draft) return;
    setProgress(0);
    const imageUrls = draft.parsedImages.filter((i) => i.selected).map((i) => i.url);
    // failure is surfaced as a toast by useCreateProduct
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
    }).catch(() => null);
    if (product) router.push(`/app/studio?product=${product.id}`);
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
          <h1 className="font-display text-3xl font-bold text-ink">{t("startTitle")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("startSubtitle")}
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
              placeholder={t("productLinkPlaceholder")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <Button size="sm" type="submit" disabled={parse.isPending || !url.trim()}>
              {parse.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("readLink")
              )}
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
                  {t("addManuallyInstead")}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* manual / photo start */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              {...drop.props}
              onClick={() => {
                setDraft(emptyDraft(null));
                setTimeout(() => fileInput.current?.click(), 0);
              }}
              className={cn(
                "rounded-2xl border-2 border-dashed bg-card p-6 text-left transition-colors",
                drop.over
                  ? "border-brand-400 bg-accent/50"
                  : "border-border hover:border-brand-400",
              )}
            >
              {reading ? (
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              ) : (
                <ImagePlus className="h-6 w-6 text-brand-600" />
              )}
              <p className="mt-2 font-display font-semibold text-ink">
                {t("startFromPhotos")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("startFromPhotosDescription")}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDraft(emptyDraft(null))}
              className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-left transition-colors hover:border-brand-400"
            >
              <PencilLine className="h-6 w-6 text-brand-600" />
              <p className="mt-2 font-display font-semibold text-ink">
                {t("startFromScratch")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("startFromScratchDescription")}
              </p>
            </button>
          </div>
          {uploadError && <p className="mt-2 text-xs text-rose">{uploadError}</p>}

          <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <StoreImport />
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
            <ArrowLeft className="h-4 w-4" /> {t("startOver")}
          </button>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            {t("detailsTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t("detailsSubtitle")}
          </p>

          {draft.source_url && (
            <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              {tp(PLATFORM_LABEL_KEYS[draft.source_platform])}
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
            <Field label={t("fields.title")}>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder={t("fields.titlePlaceholder")}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand-300"
              />
            </Field>

            <Field label={t("fields.description")}>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder={t("fields.descriptionPlaceholder")}
                rows={5}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand-300"
              />
            </Field>

            <Field label={t("fields.category")}>
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
                    {tc(CATEGORY_LABEL_KEYS[c])}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label={t("fields.photos", { count: selectedCount })}
              hint={t("fields.photosHint")}
            >
              <div
                {...drop.props}
                className={cn(
                  "grid grid-cols-3 gap-3 rounded-xl transition-colors sm:grid-cols-4",
                  drop.over &&
                    "bg-accent/50 outline-2 outline-offset-4 outline-dashed outline-brand-400",
                )}
              >
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
                      aria-label={t("removePhoto")}
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
                  {reading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  <span className="text-xs font-semibold">{t("addPhoto")}</span>
                </button>
              </div>
              {uploadError && <p className="mt-2 text-xs text-rose">{uploadError}</p>}
            </Field>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Button size="lg" onClick={submit} disabled={!canSubmit}>
              {create.isPending ? (
                <UploadProgress progress={progress} />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("saveAndMakeVideo")}
                </>
              )}
            </Button>
            {selectedCount === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("needPhoto")}
              </p>
            )}
          </div>
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

/** "Import your whole store" — paste a store URL, preview the catalog, then
 * kick off a batch import and watch it fill up My Products (report §4). */
function StoreImport() {
  const t = useTranslations("app.productsNew.storeImport");
  const tt = useTranslations("app.toasts");
  const router = useRouter();
  const qc = useQueryClient();
  const preview = usePreviewImport();
  const start = useStartImport({ startError: tt("startImportFailed") });
  const [storeUrl, setStoreUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: job } = useImportJob(jobId ?? "");
  const done = useRef(false);

  // route to My Products (and refresh it) the moment the import finishes
  useEffect(() => {
    if (!job || done.current) return;
    if (job.status === "succeeded" || job.status === "partial") {
      done.current = true;
      qc.invalidateQueries({ queryKey: qk.myProducts });
      toast.success(
        job.status === "partial"
          ? tt("importPartial", { count: job.products_upserted })
          : tt("importSucceeded", { count: job.products_upserted }),
      );
      router.push("/app/products");
    } else if (job.status === "failed") {
      toast.error(job.error ?? tt("importFailed"));
    }
  }, [job, qc, router, tt]);

  const previewData = preview.data;

  // step 3 — an import is running: live progress from upserted / found
  // (a failed job falls through to the preview step so the user can retry)
  if (jobId && job && job.status !== "failed") {
    const active = job.status === "queued" || job.status === "running";
    const fraction = job.products_found > 0 ? job.products_upserted / job.products_found : 0;
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-2 font-display font-semibold text-ink">
          <Store className="h-4 w-4 text-brand-600" />
          {t("importingTitle")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {active
            ? t("importingProgress", {
                upserted: job.products_upserted,
                found: job.products_found,
              })
            : t("wrappingUp")}
        </p>
        <div className="mt-4">
          <Button size="lg" disabled className="w-full sm:w-auto">
            <UploadProgress progress={active ? fraction : 1} label={t("importingLabel")} />
          </Button>
        </div>
      </div>
    );
  }

  // step 2 — preview succeeded: confirm before pulling the whole catalog
  if (previewData) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="font-display font-semibold text-ink">
          {t("previewFound", {
            count: previewData.product_count_estimate,
            domain: previewData.store_domain,
          })}
        </p>
        {previewData.sample.length > 0 && (
          <div className="mt-3 flex gap-2">
            {previewData.sample.map((s, i) => (
              <div
                key={`${s.image ?? s.title}-${i}`}
                className="h-16 w-16 overflow-hidden rounded-xl border border-border bg-accent"
              >
                {s.image && (
                  <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button
            size="lg"
            disabled={start.isPending}
            onClick={() =>
              start.mutate(storeUrl.trim(), {
                onSuccess: (created) => setJobId(created.job_id),
              })
            }
          >
            {start.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Store className="h-4 w-4" />
                {t("importAllProducts")}
              </>
            )}
          </Button>
          <button
            type="button"
            className="text-sm font-semibold text-muted-foreground hover:text-ink"
            onClick={() => preview.reset()}
          >
            {t("tryDifferentStore")}
          </button>
        </div>
      </div>
    );
  }

  // step 1 — paste a store URL and preview it
  return (
    <>
      <form
        className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft focus-within:border-brand-300"
        onSubmit={(e) => {
          e.preventDefault();
          if (storeUrl.trim()) preview.mutate(storeUrl.trim());
        }}
      >
        <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={storeUrl}
          onChange={(e) => setStoreUrl(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button size="sm" type="submit" disabled={preview.isPending || !storeUrl.trim()}>
          {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("preview")}
        </Button>
      </form>
      {preview.isError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
          <p className="text-ink">{(preview.error as Error)?.message}</p>
        </div>
      )}
    </>
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
