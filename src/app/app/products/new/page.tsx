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
  useCurrentUser,
  qk,
} from "@/lib/api/hooks";
import { apiErrorMessage } from "@/lib/api/client";
import type { ImportCandidate, ProductDraft, SourcePlatform } from "@/lib/api/types";
import { CATEGORIES } from "@/lib/categories";
import { priceRange } from "@/lib/format";
import {
  beginSelection,
  clearSelection,
  importOutcome,
  saveSelection,
  selectedUrls,
} from "@/lib/import-selection";
import { toast } from "@/lib/toast";
import { PathHeader } from "@/components/app/path-header";
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

/** Everything about a store import that has to outlive `StoreImport`, which is
 * unmounted the moment the manual editor takes the screen: without this the
 * guard against a second import would reset on the way back, and the backend
 * would answer that second start with the job already running. Component
 * lifetime only - a reload still drops the card, and the import still finishes
 * server-side, which is what the "keeps going in the background" copy says. */
function useImportSlot() {
  /** The running import: its handle and exactly how many `source_urls` it
   * carries, as one value so a job can never be watched without its total. */
  const [running, setRunning] = useState<{ jobId: string; requested: number } | null>(null);
  /** The live progress card was dismissed ("add something else while this
   * runs"). The handle stays: the backend hands the caller's active job back
   * instead of enqueueing a second, so a start now would silently re-label this
   * import as another store's. It is released when the job lands. */
  const [dismissed, setDismissed] = useState(false);
  /** Guards the finish effect, so a remount can't re-announce a landed job. */
  const doneRef = useRef(false);
  /** Where a selection gesture writes the pass, and which store's pass a
   * finished import clears. A ref so the memoized rows keep one stable
   * `onToggle` across the whole catalog. */
  const persistToRef = useRef<{ userId: string; storeDomain: string } | null>(null);
  return { running, setRunning, dismissed, setDismissed, doneRef, persistToRef };
}

type ImportSlot = ReturnType<typeof useImportSlot>;

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
  /** A catalog walk or review is the one part of the store flow this page can't
   * see: it belongs to `StoreImport`, which has to keep it (a remount holding a
   * review would re-run the billed catalog walk the moment its cache goes
   * stale), so it is reported up. The running import is already ours. */
  const [reviewing, setReviewing] = useState(false);
  const importSlot = useImportSlot();
  /** A catalog walk, review or running import owns the start screen: the two
   * single-product paths step aside so nothing adjacent can drop a review. */
  const storeFlowActive =
    reviewing || (importSlot.running !== null && !importSlot.dismissed);
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
    <div className="container-page max-w-3xl py-6 sm:py-8">
      {draft === null ? (
        <>
          <h1 className="font-display text-3xl font-bold text-ink">{t("startTitle")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("startSubtitle")}
          </p>

          <section className="mt-5 sm:mt-7">
            <PathHeader
              icon={Store}
              title={t("storePathTitle")}
              description={t("storePathDescription")}
            />
            <div className="mt-3 sm:mt-4">
              <StoreImport slot={importSlot} onReviewingChange={setReviewing} />
            </div>
          </section>

          {!storeFlowActive && (
            <>
              <section className="mt-6 sm:mt-8">
                <PathHeader
                  icon={Link2}
                  tone="accent"
                  title={t("singleProductTitle")}
                  description={t("singleProductDescription")}
                  descriptionClassName="hidden sm:block"
                />

                {/* URL omnibox */}
                <form
                  className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft focus-within:border-brand-300 sm:mt-4"
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
                  />
                  <Button size="sm" type="submit" disabled={parse.isPending || !url.trim()}>
                    {parse.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("readLink")
                    )}
                  </Button>
                </form>
              </section>
              {parse.isError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
                  <div>
                    <p className="text-ink">
                      {apiErrorMessage(parse.error, tt("readLinkFailed"))}
                    </p>
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

              {/* manual/photo start: one blank editor destination, with drag-start still
                * supported and photos reachable in one click for keyboard/touch */}
              <section className="mt-6 sm:mt-8">
                <PathHeader
                  icon={PencilLine}
                  tone="accent"
                  title={t("manualPathTitle")}
                />
                <div
                  {...drop.props}
                  className={cn(
                    "mt-3 rounded-2xl border-2 border-dashed bg-card p-6 transition-colors sm:mt-4",
                    drop.over ? "border-brand-400 bg-accent/50" : "border-border",
                  )}
                >
                  <p className="text-sm text-muted-foreground">
                    {t("startManualEditorDescription")}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <Button size="md" onClick={() => setDraft(emptyDraft(null))}>
                      <PencilLine className="h-4 w-4" />
                      {t("startManualEditor")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                    >
                      {reading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      {t("startWithPhotos")}
                    </button>
                  </div>
                </div>
                {uploadError && <p className="mt-2 text-xs text-rose">{uploadError}</p>}
              </section>
            </>
          )}
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

/** Paste a store URL, preview the catalog, review which products to keep, then
 * kick off a batch import of just those and watch it fill up My Products. */
function StoreImport({
  slot,
  onReviewingChange,
}: {
  slot: ImportSlot;
  onReviewingChange: (reviewing: boolean) => void;
}) {
  const t = useTranslations("app.productsNew.storeImport");
  const tt = useTranslations("app.toasts");
  const router = useRouter();
  const qc = useQueryClient();
  const preview = usePreviewImport();
  const start = useStartImport({ startError: tt("startImportFailed") });
  const [storeUrl, setStoreUrl] = useState("");
  // held by the page, so opening the manual editor and coming back can't forget
  // an import that is still running (see `useImportSlot`)
  const { running, setRunning, dismissed, setDismissed, doneRef, persistToRef } = slot;
  // `AppShell` holds a spinner until the session resolves, so this is never undefined here
  const userId = useCurrentUser().data!.id;

  /** The store under review: `storeUrl` is what the requests carry, `domain` is
   * the normalized identity the pass and the catalog cache are keyed on. */
  const [review, setReview] = useState<
    { storeUrl: string; platform: string; domain: string } | null
  >(null);
  /** Everything arrives selected, so the review step tracks the opt-*outs*. */
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const { data: job } = useImportJob(running?.jobId ?? "");

  const candidates = useImportCandidates(review);
  const candidateData = candidates.data;

  /** The walk/review half of "the store flow owns the page" — the running half
   * is the page's own. The cleanup covers the unmount, which drops the review
   * here, so a remount can't leave the single-product paths hidden for a flow
   * nothing is running. */
  useEffect(() => {
    onReviewingChange(review !== null);
    return () => onReviewingChange(false);
  }, [review, onReviewingChange]);

  // route to My Products (and refresh it) the moment the import finishes
  useEffect(() => {
    if (!job || !running || doneRef.current) return;
    if (job.status === "queued" || job.status === "running") return;
    doneRef.current = true;
    if (job.status === "failed") {
      toast.error(job.error ?? tt("importFailed"));
      return;
    }
    qc.invalidateQueries({ queryKey: qk.myProducts });
    const outcome = importOutcome(job, running.requested);
    if (outcome.key === "importNone") {
      // nothing landed: report it honestly and keep the stored pass, rather
      // than routing to an unchanged product list (see `jobFellThrough`)
      toast.error(tt(outcome.key, outcome.values));
      return;
    }
    clearSelection(persistToRef.current);
    // an import that didn't stick to the chosen subset isn't a success to
    // celebrate: the user still has to go find what they didn't pick
    const ignoredSelection =
      outcome.key === "importOvershoot" || outcome.key === "importIgnoredSelection";
    const announce = ignoredSelection ? toast.info : toast.success;
    announce(tt(outcome.key, outcome.values));
    // the user dropped the progress card and moved on: the toast tells them it
    // landed, routing them off what they're now doing would not
    if (!dismissed) router.push("/app/products");
  }, [job, running, dismissed, doneRef, persistToRef, qc, router, tt]);

  const previewData = preview.data;
  const untitledLabel = t("untitledProduct");

  /** A deliberate selection gesture, the *only* thing allowed to persist. The
   * write sits in the updater because that is where the new pass exists; nothing
   * on a mount, a restore or a render path can reach it, so however a read comes
   * back empty it can't overwrite what's stored. */
  const applySelection = useCallback((update: (prev: Set<string>) => Set<string>) => {
    setDeselected((prev) => {
      const next = update(prev);
      const target = persistToRef.current;
      if (target) saveSelection({ ...target, deselected: [...next] });
      return next;
    });
  }, [persistToRef]);

  // stable across renders so the memoized rows don't all invalidate on a toggle
  const toggleCandidate = useCallback(
    (sourceUrl: string) =>
      applySelection((prev) => {
        const next = new Set(prev);
        if (!next.delete(sourceUrl)) next.add(sourceUrl);
        return next;
      }),
    [applySelection],
  );

  /** The only way into the catalog walk, so it can never fire without a click.
   * The stored pass is read here rather than at mount: by the time there is a
   * click the current user is known, so a pass belonging to whoever used the tab
   * before is discarded instead of restored. */
  function reviewStore(url: string, platform: string, domain: string) {
    setDeselected(new Set(beginSelection(userId, domain)));
    persistToRef.current = { userId, storeDomain: domain };
    setRunning(null);
    doneRef.current = false;
    setReview({ storeUrl: url, platform, domain });
  }

  /** Dropping the live progress card so the rest of the page comes back. Only
   * the card goes: the import carries on server-side, and its handle (and the
   * store its pass belongs to) is kept so the store path can say it's busy
   * instead of offering a second import the backend would answer with this
   * very job. */
  function dismissProgress() {
    setReview(null);
    setDeselected(new Set());
    setDismissed(true);
    preview.reset();
  }

  /** Backing out of a catalog walk that never landed. The user wanted out of
   * the wait, not out of their deselection pass, so the stored pass stays. */
  function leaveWalk() {
    setReview(null);
    persistToRef.current = null;
    setDeselected(new Set());
    setRunning(null);
    doneRef.current = false;
    preview.reset();
  }

  /** Leaving a review the user has actually seen: they're moving on, so the
   * stored pass goes with it. */
  function discardReview() {
    clearSelection(persistToRef.current);
    leaveWalk();
  }

  function runImport(store: string, sourceUrls: string[], platform: string) {
    // no client-side pre-flight guard against a double start: the backend hands
    // back the caller's existing active job instead of enqueueing a second, so a
    // reload-then-click can't buy the same import twice
    start.mutate(
      { storeUrl: store, sourceUrls, platform },
      {
        onSuccess: (created) => {
          doneRef.current = false;
          setDismissed(false);
          setRunning({ jobId: created.job_id, requested: sourceUrls.length });
        },
      },
    );
  }

  /** A job that failed outright, or finished without importing a single product,
   * has nothing to show on the progress card. With the card still up, that drops
   * back to the review step it was started from, selection intact, ready to
   * retry. Once the card has been dismissed the review is gone with it, so the
   * store path returns to the paste form — the pass itself survives in
   * sessionStorage and `beginSelection` carries it into the next review. */
  const jobFellThrough =
    !!job &&
    (job.status === "failed" ||
      ((job.status === "succeeded" || job.status === "partial") &&
        job.products_upserted === 0));

  /** Still in flight, so a start now would come back as this very job. Once it
   * lands the handle stops meaning anything and the store path opens again. */
  const importInFlight =
    !!running && (!job || job.status === "queued" || job.status === "running");

  // in flight with the progress card dismissed: a second import can't work, so
  // the store path says so and points back at the progress it came from rather
  // than offering a paste form whose result would be mislabelled
  if (importInFlight && dismissed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-2 font-display font-semibold text-ink">
          <Store className="h-4 w-4 shrink-0 text-brand-600" />
          {t("alreadyImportingTitle")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("alreadyImportingDescription")}</p>
        <Button size="lg" className="mt-4" onClick={() => setDismissed(false)}>
          {t("showProgress")}
        </Button>
      </div>
    );
  }

  // step 4 — an import is running: live progress against the requested subset.
  // The job handle can be missing while it resolves (the first poll, a cache
  // garbage-collected while the manual editor held the screen, a failing GET),
  // and a start would still come back as this very job — so the card renders
  // without counts rather than falling through to a paste form whose result
  // would be mislabelled.
  if (running && !jobFellThrough && !dismissed) {
    const active = !job || job.status === "queued" || job.status === "running";
    // the same `running.requested` the finished-import toast reads, so the bar
    // and the toast can never quote different totals — an import that overshoots
    // the chosen subset still reads its real total, only the bar stops at full
    const total = running.requested;
    const fraction = job && total > 0 ? Math.min(job.products_upserted / total, 1) : 0;
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-2 font-display font-semibold text-ink">
          <Store className="h-4 w-4 text-brand-600" />
          {t("importingTitle")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {!job
            ? t("importingUnknown")
            : active
              ? t("importingProgress", {
                  upserted: job.products_upserted,
                  found: total,
                })
              : t("wrappingUp")}
        </p>
        {/* the import runs server-side for as long as it takes, so the card that
          * suppresses every other path on the page carries its own way out */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled className="w-full sm:w-auto">
            {job ? (
              <UploadProgress progress={active ? fraction : 1} label={t("importingLabel")} />
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("importingLabel")}
              </>
            )}
          </Button>
          <button
            type="button"
            className="text-sm font-semibold text-muted-foreground hover:text-ink"
            onClick={dismissProgress}
          >
            {t("importingLeave")}
          </button>
        </div>
      </div>
    );
  }

  // step 3 — walking the catalog for review
  if (review && !candidateData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-2 font-display font-semibold text-ink">
          <Store className="h-4 w-4 shrink-0 text-brand-600" />
          {t("reviewTitle", { domain: review.domain })}
        </p>
        {/* `isError` stays true for the whole of a retry (only `fetchStatus`
          * moves), so the card has to read the fetch itself — otherwise it sits
          * unchanged with an armed button for up to the BFF's 180s and every
          * impatient click buys another billed walk. */}
        {candidates.isError && !candidates.isFetching ? (
          <>
            <p className="mt-2 flex items-start gap-2 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
              {apiErrorMessage(candidates.error, tt("listCandidatesFailed"))}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button size="lg" onClick={() => candidates.refetch()}>
                {t("retryReview")}
              </Button>
              <button
                type="button"
                className="text-sm font-semibold text-muted-foreground hover:text-ink"
                onClick={leaveWalk}
              >
                {t("tryDifferentStore")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              {t("readingCatalog")}
            </p>
            {/* the walk can run for the BFF's full 180s, so the wrong store is
              * never a three-minute wait with no way out */}
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-muted-foreground hover:text-ink"
              onClick={leaveWalk}
            >
              {t("tryDifferentStore")}
            </button>
          </>
        )}
      </div>
    );
  }

  // step 3 — review: everything the store has, all selected, user opts products out
  if (review && candidateData) {
    const list = candidateData.candidates;
    const chosen = selectedUrls(list, deselected);
    // a walk that succeeded but listed nothing: say so, don't render an empty
    // box over "0 of 0 selected"
    if (list.length === 0) {
      return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 font-display font-semibold text-ink">
            <Store className="h-4 w-4 shrink-0 text-brand-600" />
            {t("reviewTitle", { domain: review.domain })}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t("reviewEmpty")}</p>
          <div className="mt-4">
            <Button size="lg" onClick={discardReview}>
              {t("tryDifferentStore")}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-2 font-display font-semibold text-ink">
          <Store className="h-4 w-4 shrink-0 text-brand-600" />
          {t("reviewTitle", { domain: review.domain })}
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
              onClick={() => applySelection(() => new Set())}
              disabled={chosen.length === list.length}
              className="text-brand-700 disabled:text-muted-foreground disabled:opacity-50"
            >
              {t("selectAll")}
            </button>
            <button
              type="button"
              onClick={() => applySelection(() => new Set(list.map((c) => c.source_url)))}
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
            disabled={start.isPending || (running !== null && !jobFellThrough) || chosen.length === 0}
            onClick={() => runImport(review.storeUrl, chosen, candidateData.platform)}
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
            onClick={discardReview}
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
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
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
            onClick={() =>
              reviewStore(storeUrl.trim(), previewData.platform, previewData.store_domain)
            }
          >
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
        className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft focus-within:border-brand-300"
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
          <p className="text-ink">
            {apiErrorMessage(preview.error, tt("previewStoreFailed"))}
          </p>
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
