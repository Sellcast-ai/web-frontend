/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, Suspense, useCallback, useEffect, useRef, useState } from "react";
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
  useImportCandidates,
  useStartImport,
  useImportJob,
  qk,
} from "@/lib/api/hooks";
import type { ImportCandidate, ProductDraft, SourcePlatform } from "@/lib/api/types";
import { CATEGORIES } from "@/lib/categories";
import { priceRange } from "@/lib/format";
import {
  clearSelection,
  importOutcome,
  importRequested,
  loadSelection,
  saveSelection,
  selectedUrls,
} from "@/lib/import-selection";
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

  // ?url= deep link (from the Products paste box) parses on arrival
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

/** "Import your whole store" — paste a store URL, preview the catalog, review
 * which products to keep, then kick off a batch import of just those and watch
 * it fill up My Products (report §4). */
function StoreImport() {
  const t = useTranslations("app.productsNew.storeImport");
  const tt = useTranslations("app.toasts");
  const router = useRouter();
  const qc = useQueryClient();
  const preview = usePreviewImport();
  const start = useStartImport({ startError: tt("startImportFailed") });
  const [storeUrl, setStoreUrl] = useState("");
  const done = useRef(false);

  /* A reload mid-review shouldn't cost the user their deselection pass, so the
   * opt-outs (and any import they were already committed as) seed from
   * sessionStorage. Read once, lazily: the restored value changes no markup
   * until a query resolves, so it can't desync from the server-rendered HTML.
   * What it deliberately does *not* restore is the review target: re-entering
   * the catalog walk costs real money at the parser, so it only ever starts
   * from a click (`reviewStore`), never from a mount. */
  const [saved, setSaved] = useState(loadSelection);
  const [review, setReview] = useState<{ storeUrl: string; platform?: string } | null>(null);
  /** Everything arrives selected, so the review step tracks the opt-*outs*. */
  const [deselected, setDeselected] = useState<Set<string>>(
    () => new Set(saved?.deselected ?? []),
  );
  const [jobId, setJobId] = useState<string | null>(() => saved?.jobId ?? null);
  /** Exactly how many `source_urls` the running import carries. */
  const [requested, setRequested] = useState<number | null>(() => saved?.requested ?? null);
  const { data: job } = useImportJob(jobId ?? "");

  const candidates = useImportCandidates(review);
  const candidateData = candidates.data;

  const ownedStoreUrl = review?.storeUrl ?? saved?.storeUrl ?? null;
  const ownedPlatform = review?.platform ?? saved?.platform;

  useEffect(() => {
    if (!ownedStoreUrl) return;
    saveSelection({
      storeUrl: ownedStoreUrl,
      platform: ownedPlatform,
      deselected: [...deselected],
      jobId,
      requested,
    });
  }, [ownedStoreUrl, ownedPlatform, deselected, jobId, requested]);

  // route to My Products (and refresh it) the moment the import finishes
  useEffect(() => {
    if (!job || done.current) return;
    if (job.status === "succeeded" || job.status === "partial") {
      done.current = true;
      qc.invalidateQueries({ queryKey: qk.myProducts });
      const outcome = importOutcome(job, requested);
      if (outcome.key === "importNone") {
        // nothing landed: report it honestly and leave the user on the review
        // step (see `jobFellThrough`) rather than on an unchanged product list
        toast.error(tt(outcome.key, outcome.values));
        return;
      }
      clearSelection();
      toast.success(tt(outcome.key, outcome.values));
      router.push("/app/products");
    } else if (job.status === "failed") {
      toast.error(job.error ?? tt("importFailed"));
    }
  }, [job, requested, qc, router, tt]);

  const previewData = preview.data;
  const untitledLabel = t("untitledProduct");

  // stable across renders so the memoized rows don't all invalidate on a toggle
  const toggleCandidate = useCallback((sourceUrl: string) => {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (!next.delete(sourceUrl)) next.add(sourceUrl);
      return next;
    });
  }, []);

  /** The only way into the catalog walk, so it can never fire without a click.
   * Opt-outs carry over only for the store they were made against; a different
   * store starts all-selected. */
  function reviewStore(url: string, platform?: string) {
    setDeselected(new Set(saved?.storeUrl === url ? saved.deselected : []));
    setReview({ storeUrl: url, platform });
  }

  function leaveReview() {
    clearSelection();
    setSaved(null);
    setReview(null);
    setDeselected(new Set());
    // only reachable once the job has nothing left to show (`jobFellThrough`),
    // so drop it rather than carrying a dead handle into the next store
    setJobId(null);
    setRequested(null);
    done.current = false;
    preview.reset();
  }

  function runImport(sourceUrls: string[], platform: string) {
    start.mutate(
      { storeUrl: review?.storeUrl ?? storeUrl, sourceUrls, platform },
      {
        onSuccess: (created) => {
          done.current = false;
          setRequested(sourceUrls.length);
          setJobId(created.job_id);
        },
      },
    );
  }

  /** A job that failed outright, or finished without importing a single product,
   * has nothing to show on the progress card — drop back to the review step with
   * the selection intact so the user can retry it. */
  const jobFellThrough =
    !!job &&
    (job.status === "failed" ||
      ((job.status === "succeeded" || job.status === "partial") &&
        job.products_upserted === 0));

  // step 4 — an import is running: live progress against the requested subset
  if (jobId && job && !jobFellThrough) {
    const active = job.status === "queued" || job.status === "running";
    // same helper the finished-import toast uses, so the bar and the toast can
    // never quote different totals
    const total = importRequested(job, requested);
    const fraction = total > 0 ? job.products_upserted / total : 0;
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
                found: total,
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

  // step 3 — walking the catalog for review (also the reload-restore path)
  if (review && !candidateData) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-2 font-display font-semibold text-ink">
          <Store className="h-4 w-4 shrink-0 text-brand-600" />
          {t("reviewTitle", { domain: review.storeUrl })}
        </p>
        {candidates.isError ? (
          <>
            <p className="mt-2 flex items-start gap-2 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
              {(candidates.error as Error)?.message || tt("listCandidatesFailed")}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button size="lg" onClick={() => candidates.refetch()}>
                {t("retryReview")}
              </Button>
              <button
                type="button"
                className="text-sm font-semibold text-muted-foreground hover:text-ink"
                onClick={leaveReview}
              >
                {t("tryDifferentStore")}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            {t("readingCatalog")}
          </p>
        )}
      </div>
    );
  }

  // step 3 — review: everything the store has, all selected, user opts products out
  if (candidateData) {
    const list = candidateData.candidates;
    const chosen = selectedUrls(list, deselected);
    // a walk that succeeded but listed nothing: say so, don't render an empty
    // box over "0 of 0 selected"
    if (list.length === 0) {
      return (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 font-display font-semibold text-ink">
            <Store className="h-4 w-4 shrink-0 text-brand-600" />
            {t("reviewTitle", { domain: candidateData.store_domain })}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t("reviewEmpty")}</p>
          <div className="mt-4">
            <Button size="lg" onClick={leaveReview}>
              {t("tryDifferentStore")}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-2 font-display font-semibold text-ink">
          <Store className="h-4 w-4 shrink-0 text-brand-600" />
          {t("reviewTitle", { domain: candidateData.store_domain })}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("reviewSubtitle")}</p>
        {candidateData.truncated && (
          <p className="mt-2 flex items-start gap-2 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            {t("reviewTruncated", { count: list.length })}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p aria-live="polite" className="text-sm font-semibold text-ink">
            {t("selectedCount", { selected: chosen.length, total: list.length })}
          </p>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setDeselected(new Set())}
              disabled={chosen.length === list.length}
              className="text-brand-700 disabled:text-muted-foreground disabled:opacity-50"
            >
              {t("selectAll")}
            </button>
            <button
              type="button"
              onClick={() => setDeselected(new Set(list.map((c) => c.source_url)))}
              disabled={chosen.length === 0}
              className="text-brand-700 disabled:text-muted-foreground disabled:opacity-50"
            >
              {t("deselectAll")}
            </button>
          </div>
        </div>

        {/* The whole catalog renders — no page cap, so select/deselect all can
         * never mean "just the ones you can see". `content-visibility` plus lazy
         * images keep the offscreen rows off the layout/network bill, and the row
         * is memoized so one checkbox doesn't re-render the other 200. */}
        <div className="mt-3 max-h-[26rem] overflow-y-auto rounded-xl border border-border">
          {list.map((c) => (
            <CandidateRow
              key={c.source_url}
              candidate={c}
              selected={!deselected.has(c.source_url)}
              untitledLabel={untitledLabel}
              onToggle={toggleCandidate}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={start.isPending || chosen.length === 0}
            onClick={() => runImport(chosen, candidateData.platform)}
          >
            {start.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Store className="h-4 w-4" />
                {t("importSelected", { count: chosen.length })}
              </>
            )}
          </Button>
          <button
            type="button"
            className="text-sm font-semibold text-muted-foreground hover:text-ink"
            onClick={leaveReview}
          >
            {t("tryDifferentStore")}
          </button>
        </div>
      </div>
    );
  }

  // step 2 — preview succeeded: confirm before walking the catalog for review
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
          <Button size="lg" onClick={() => reviewStore(storeUrl.trim(), previewData.platform)}>
            <Store className="h-4 w-4" />
            {t("chooseProducts")}
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
      {/* An unfinished deselection pass is one click from where it was - the
        * click is the point, since the walk behind it is billed. */}
      {saved && (!jobId || jobFellThrough) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
          <p className="text-muted-foreground">
            {t("resumeReview", { domain: saved.storeUrl })}
          </p>
          <button
            type="button"
            className="font-semibold text-brand-700"
            onClick={() => reviewStore(saved.storeUrl, saved.platform)}
          >
            {t("resumeReviewAction")}
          </button>
          <button
            type="button"
            className="font-semibold text-muted-foreground hover:text-ink"
            onClick={leaveReview}
          >
            {t("discardReview")}
          </button>
        </div>
      )}
    </>
  );
}

/** One reviewable store product: enough to decide on without opening anything
 * (image, title, price). Memoized because the review list renders the store's
 * whole catalog, so an unmemoized row makes every checkbox O(catalog). */
const CandidateRow = memo(function CandidateRow({
  candidate,
  selected,
  untitledLabel,
  onToggle,
}: {
  candidate: ImportCandidate;
  selected: boolean;
  untitledLabel: string;
  onToggle: (sourceUrl: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-accent/40 [contain-intrinsic-size:auto_64px] [content-visibility:auto]">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(candidate.source_url)}
        className="h-4 w-4 shrink-0 accent-brand-500"
      />
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-accent">
        {candidate.image && (
          <img
            src={candidate.image}
            alt=""
            loading="lazy"
            className={cn(
              "h-full w-full object-cover",
              !selected && "opacity-40 grayscale",
            )}
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-medium text-ink",
            !selected && "text-muted-foreground line-through",
          )}
        >
          {candidate.title || untitledLabel}
        </span>
        <span className="block text-xs text-muted-foreground">
          {priceRange(candidate.price_min, candidate.price_max, candidate.currency ?? "USD")}
        </span>
      </span>
    </label>
  );
});

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
