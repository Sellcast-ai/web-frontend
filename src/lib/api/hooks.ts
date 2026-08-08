"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError, api, apiErrorMessage } from "./client";
import { isOutOfCreditsError } from "@/lib/quota-error";
import { isQuotable } from "@/lib/render-quote";
import { toast } from "@/lib/toast";
import type {
  AvatarCreate,
  ImportStatus,
  ProductCreate,
  ProductSummary,
  Storyboard,
  VideoJob,
  VideoJobCreate,
  VideoJobStatus,
  VideoQuoteParams,
} from "./types";

export const qk = {
  me: ["me"] as const,
  myProducts: ["my-products"] as const,
  product: (id: string) => ["product", id] as const,
  jobs: (p: Record<string, unknown>) => ["jobs", p] as const,
  job: (id: string) => ["job", id] as const,
  videoCapabilities: ["video-capabilities"] as const,
  /** One key per priced configuration. Re-quoting when a picker moves is this
   * key changing, not an effect — and flipping back to a configuration already
   * priced is served from cache, so a user sweeping the pickers costs one
   * request per distinct render, not one per click. */
  quote: (p: VideoQuoteParams) =>
    [
      "video-quote",
      p.mode,
      p.duration_seconds,
      p.resolution,
      p.aspect_ratio,
      p.video_model ?? null,
    ] as const,
  import: (id: string) => ["import", id] as const,
  importCandidates: (storeDomain: string) => ["import-candidates", storeDomain] as const,
  shopifyAvailability: ["shopify-availability"] as const,
};

/** Statuses where the job is still live: the worker owns it, or it is parked
 *  on the user at a review gate. This is the polling definition - Studio's
 *  active-jobs cap pre-flight deliberately counts a narrower set
 *  (CAP_ACTIVE_JOB_STATUSES there), because the backend's cap excludes the
 *  parked gates. */
export const ACTIVE_JOB_STATUSES: VideoJobStatus[] = [
  "queued",
  "submitted",
  "in_progress",
  "awaiting_storyboard",
  "awaiting_review",
];

const ACTIVE = ACTIVE_JOB_STATUSES;

const VIDEO_JOBS_PAGE_SIZE = 50;

/* ------------------------------------------------------------------ reads */

export function useCurrentUser() {
  return useQuery({ queryKey: qk.me, queryFn: api.me, staleTime: 60_000 });
}

export function useUsage() {
  return useQuery({ queryKey: ["usage"], queryFn: api.getUsage, staleTime: 15_000 });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: qk.product(id),
    queryFn: () => api.getProduct(id),
    enabled: Boolean(id),
    // a 404 (bogus or foreign id) never recovers — fail fast so Studio can
    // show its error branch and the job page its deleted-product badge
    // instead of burning a retry on "Loading…" (P2-2).
    retry: retryUnlessNotFound,
  });
}

export function retryUnlessNotFound(failureCount: number, err: unknown) {
  return !(err instanceof ApiError && err.status === 404) && failureCount < 1;
}

export function useMyProducts() {
  return useQuery({ queryKey: qk.myProducts, queryFn: api.listMyProducts });
}

export function useAvatars() {
  return useQuery({ queryKey: ["avatars"], queryFn: api.listAvatars });
}

/** Probes whether the Shopify connect flow works end to end on the deployed
 * backend. Each probe costs a backend round trip, so it stays fresh longer
 * than the global default. */
export function useShopifyAvailability() {
  return useQuery({
    queryKey: qk.shopifyAvailability,
    queryFn: api.getShopifyAvailability,
    staleTime: 60_000,
  });
}

export function useCreateAvatar(
  messages: { saveError: string },
  onProgress?: (fraction: number) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvatarCreate) => api.createAvatar(payload, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avatars"] }),
    onError: (err) => toast.error(apiErrorMessage(err, messages.saveError)),
  });
}

export function useDeleteAvatar(messages: { deleteError: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAvatar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avatars"] }),
    onError: (err) => toast.error(apiErrorMessage(err, messages.deleteError)),
  });
}

export function useVideoJobs(
  params: { product_id?: string } = {},
  refetchInterval?: (jobs: VideoJob[] | undefined) => number | false,
) {
  return useQuery({
    queryKey: qk.jobs(params),
    queryFn: () => api.listVideoJobs(params),
    refetchInterval: refetchInterval
      ? (query) => refetchInterval(query.state.data)
      : undefined,
  });
}

export function usePagedVideoJobs(params: { product_id?: string } = {}) {
  return useInfiniteQuery({
    queryKey: qk.jobs({ ...params, limit: VIDEO_JOBS_PAGE_SIZE }),
    queryFn: ({ pageParam }) =>
      api.listVideoJobs({
        ...params,
        limit: VIDEO_JOBS_PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === VIDEO_JOBS_PAGE_SIZE
        ? allPages.length * VIDEO_JOBS_PAGE_SIZE
        : undefined,
  });
}

/** Import-job poll interval: keep polling while the catalog pull is in
 * flight, stop the moment it reaches a terminal status. No status at all is
 * not terminal - it's the first poll, a cache garbage-collected while the
 * caller was unmounted, or a failing GET - so it keeps polling too, or one
 * failed request strands the progress card (which suppresses the rest of the
 * page) on a spinner for the page's lifetime. */
const IMPORT_ACTIVE: ImportStatus[] = ["queued", "running"];
const IMPORT_POLL_MS = 2500;

export function importPollInterval(status: ImportStatus | undefined): number | false {
  return !status || IMPORT_ACTIVE.includes(status) ? IMPORT_POLL_MS : false;
}

/** Polls every 2.5s while the store import is queued/running, or while it has
 * no status to read at all (report §4.2) - see `importPollInterval`. */
export function useImportJob(id: string) {
  return useQuery({
    queryKey: qk.import(id),
    queryFn: () => api.getImport(id),
    enabled: Boolean(id),
    refetchInterval: (query) => importPollInterval(query.state.data?.status),
  });
}

/** The store catalog the review step chooses from. A *query*, not a mutation, so
 * the walk is cached and the list survives a remount. It is cached under the
 * normalized `domain`, not the pasted `storeUrl`: keyed on the raw string,
 * `shop.example.com` and `https://shop.example.com` are two cache entries, and
 * the second spelling buys a second billed walk for a catalog already in hand.
 * Every automatic trigger is off: the walk runs a billed third-party parser, so
 * it may only ever start from a click (entering the review step, or the explicit
 * "Try again" button) - never from a retry, a reconnect, or a refocus. */
export function useImportCandidates(
  target: { storeUrl: string; domain: string; platform?: string } | null,
) {
  return useQuery({
    queryKey: qk.importCandidates(target?.domain ?? ""),
    queryFn: () => api.listImportCandidates(target!.storeUrl, target?.platform),
    enabled: Boolean(target?.storeUrl),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnReconnect: false,
  });
}

/** Polls every 4s while the job is still working. */
export function useVideoJob(id: string) {
  return useQuery({
    queryKey: qk.job(id),
    queryFn: () => api.getVideoJob(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE.includes(status) ? 4000 : false;
    },
  });
}

/** Render capability metadata changes only when backend/provider config changes.
 * A slow or failed read must not block Studio, so callers treat missing data as
 * the static picker constants.
 *
 * A failed one does keep trying, though, because two surfaces degrade until it
 * lands and neither can recover on its own: Studio holds its price back until
 * the repair has something to narrow with, and the storyboard approve bar can't
 * resolve the job's `provider_model` to a quotable model key. Both say the cost
 * is unknown "right now", and with the app-wide `refetchOnWindowFocus: false`
 * and `retry: 1` that would otherwise be a lie for the life of the page. Only
 * while errored - a read that landed is deployment config and doesn't move
 * under a working user. */
export function useVideoCapabilities() {
  return useQuery({
    queryKey: qk.videoCapabilities,
    queryFn: api.getVideoCapabilities,
    staleTime: 30 * 60_000,
    refetchInterval: (query) => (query.state.status === "error" ? 60_000 : false),
  });
}

/** What the configured render would cost, from the backend's own quote endpoint
 * (`GET /video-jobs/quote`, read-only and free). Priced per configuration, so
 * `data` is only ever the price of the CURRENT one: no `placeholderData`, on
 * purpose - carrying the previous quote across a picker change would put a
 * stale price under settings that no longer produce it, which is worse than a
 * moment with no price at all.
 *
 * A slow or failed read must never block anything: callers treat missing data
 * as "no price known" (`affordability` in `src/lib/render-quote.ts`) and leave
 * the action enabled for the backend to judge. `null` params disable the query
 * for a surface that has nothing to price yet, and so does an incomplete tuple
 * - `isQuotable` is the one gate, here rather than at each call site, so no
 * caller can send a field the backend never returned as "undefined". */
export function useVideoQuote(params: VideoQuoteParams | null) {
  const quotable = isQuotable(params);
  return useQuery({
    queryKey: quotable ? qk.quote(params) : ["video-quote", "idle"],
    queryFn: () => api.getVideoQuote(params!),
    enabled: quotable,
    // Pricing is deployment configuration; it moves on a backend deploy,
    // not while a user works. Same reasoning as `useVideoCapabilities`.
    staleTime: 30 * 60_000,
    // A tuple the backend rejects as invalid is rejected identically on every
    // retry, so a bad configuration costs one request, not four with backoff.
    retry: false,
  });
}

/* -------------------------------------------------------------- mutations */

export function useToggleLike(messages: { updateError: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked ? api.unlikeProduct(id) : api.likeProduct(id),
    // optimistic: flip cached detail + any product lists immediately,
    // roll back from the snapshot (with a toast) if the request fails
    onMutate: async ({ id, liked }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: qk.product(id) }),
        qc.cancelQueries({ queryKey: qk.myProducts }),
      ]);
      const snapshot = snapshotProductQueries(qc, id);
      qc.setQueryData<ProductSummary | undefined>(qk.product(id), (p) =>
        p ? { ...p, is_liked: !liked } : p,
      );
      patchProductLists(qc, id, !liked);
      return snapshot;
    },
    onError: (_err, _vars, snapshot) => {
      snapshot?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(messages.updateError);
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: qk.product(id) });
      qc.invalidateQueries({ queryKey: qk.myProducts });
    },
  });
}

export function snapshotProductQueries(
  qc: QueryClient,
  id: string,
): [readonly unknown[], unknown][] {
  return [
    [qk.product(id), qc.getQueryData(qk.product(id))],
    [qk.myProducts, qc.getQueryData(qk.myProducts)],
  ];
}

export function patchProductLists(qc: QueryClient, id: string, isLiked: boolean) {
  qc.setQueryData<ProductSummary[] | undefined>(qk.myProducts, (data) =>
    Array.isArray(data)
      ? data.map((p) => (p.id === id ? { ...p, is_liked: isLiked } : p))
      : data,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isPagedVideoJobsKey(queryKey: readonly unknown[]) {
  return (
    queryKey[0] === "jobs" &&
    isRecord(queryKey[1]) &&
    queryKey[1].limit === VIDEO_JOBS_PAGE_SIZE
  );
}

export function removeJobFromCachedLists(qc: QueryClient, id: string) {
  qc.setQueriesData<VideoJob[] | undefined>(
    {
      queryKey: ["jobs"],
      predicate: (query) => !isPagedVideoJobsKey(query.queryKey),
    },
    (data) => {
      if (Array.isArray(data)) {
        return data.filter((job) => job.id !== id);
      }
      return data;
    },
  );
  qc.removeQueries({
    queryKey: ["jobs"],
    predicate: (query) => isPagedVideoJobsKey(query.queryKey),
  });
}

export function useParseProduct() {
  return useMutation({ mutationFn: (url: string) => api.parseProductUrl(url) });
}

export function usePreviewImport() {
  return useMutation({ mutationFn: (storeUrl: string) => api.previewImport(storeUrl) });
}

export function useStartImport(messages: { startError: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { storeUrl: string; sourceUrls?: string[]; platform?: string }) =>
      api.startImport(vars.storeUrl, vars.sourceUrls, vars.platform),
    onSuccess: (job) => qc.setQueryData(qk.import(job.job_id), job),
    onError: (err) => toast.error(apiErrorMessage(err, messages.startError)),
  });
}

export function useCreateProduct(
  messages: { saveError: string },
  onProgress?: (fraction: number) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductCreate) => api.createProduct(payload, onProgress),
    onSuccess: (product) => {
      qc.setQueryData(qk.product(product.id), product);
      qc.invalidateQueries({ queryKey: qk.myProducts });
    },
    onError: (err) => toast.error(apiErrorMessage(err, messages.saveError)),
  });
}

/** The credit refusal is the one 4xx whose prose we drop: the backend still
 * meters seconds, so its detail spells out the retired "1 credit = 1 second"
 * arithmetic, in English, right beside Studio's `outOfQuota` notice, which
 * carries the balance already. It gets its own localized copy rather than the
 * generic "please try again" fallback, which would name no cause and invite a
 * click that fails identically. Every other 4xx keeps its curated server
 * message. Use this for every metered call - create, retry, regenerate - so
 * the seconds prose has no path to a user. */
export function renderFailureMessage(
  err: unknown,
  messages: { fallback: string; outOfCredits: string },
): string {
  return isOutOfCreditsError(err)
    ? messages.outOfCredits
    : apiErrorMessage(err, messages.fallback);
}

export function useCreateJob(messages: { startError: string; outOfCredits: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VideoJobCreate) => api.createVideoJob(payload),
    onSuccess: (job) => {
      qc.setQueryData(qk.job(job.id), job);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
    },
    onError: (err) => {
      // A rejected create (429 out of credits, 409 at the active-jobs cap) means
      // the meter the user just read was wrong — refresh it, or Studio keeps
      // offering a Generate that re-429s every click (audit L4 P2-3).
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
      toast.error(
        renderFailureMessage(err, {
          fallback: messages.startError,
          outOfCredits: messages.outOfCredits,
        }),
      );
    },
  });
}

export function useBeatAction(
  jobId: string,
  messages: {
    approveError: string;
    regenerateError: string;
    outOfCredits: string;
  },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      beatIndex,
      action,
    }: {
      beatIndex: number;
      action: "approve" | "regenerate";
    }) =>
      action === "approve"
        ? api.approveBeat(jobId, beatIndex)
        : api.regenerateBeat(jobId, beatIndex),
    onSuccess: (job: VideoJob) => qc.setQueryData(qk.job(job.id), job),
    onError: (err, { action }) =>
      toast.error(
        renderFailureMessage(err, {
          fallback:
            action === "approve" ? messages.approveError : messages.regenerateError,
          outOfCredits: messages.outOfCredits,
        }),
      ),
  });
}

/** Storyboard approval is where the render is actually charged - create and
 * retry's `["usage"]` invalidations were written when create was the charge
 * point, and this one was left behind. It is a metered call like any other, so
 * it takes the same two obligations: `renderFailureMessage` (never the raw
 * backend prose, which spells the balance out in English on a nine-locale
 * surface), and a usage refresh on BOTH outcomes - success debited hundreds of
 * credits, and a refusal proves the meter the user last read was wrong.
 *
 * Split out from the hook so the handlers can be exercised directly: the test
 * environment is `node`, with no renderer to mount a hook in. */
export function approveStoryboardOptions(
  qc: QueryClient,
  jobId: string,
  messages: { approveError: string; outOfCredits: string },
) {
  return {
    mutationFn: () => api.approveStoryboard(jobId),
    onSuccess: (job: VideoJob) => {
      qc.setQueryData(qk.job(job.id), job);
      qc.invalidateQueries({ queryKey: ["usage"] });
    },
    onError: (err: unknown) => {
      qc.invalidateQueries({ queryKey: ["usage"] });
      toast.error(
        renderFailureMessage(err, {
          fallback: messages.approveError,
          outOfCredits: messages.outOfCredits,
        }),
      );
    },
  };
}

export function useApproveStoryboard(
  jobId: string,
  messages: { approveError: string; outOfCredits: string },
) {
  const qc = useQueryClient();
  return useMutation(approveStoryboardOptions(qc, jobId, messages));
}

export function usePatchStoryboard(jobId: string, messages: { saveError: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyboard: Storyboard) => api.patchStoryboard(jobId, storyboard),
    onSuccess: (job: VideoJob) => qc.setQueryData(qk.job(job.id), job),
    onError: (err) => toast.error(apiErrorMessage(err, messages.saveError)),
  });
}

export function useRetryJob(messages: { retryError: string; outOfCredits: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.retryVideoJob(id),
    onSuccess: (job) => {
      qc.setQueryData(qk.job(job.id), job);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
    },
    onError: (err) =>
      toast.error(
        renderFailureMessage(err, {
          fallback: messages.retryError,
          outOfCredits: messages.outOfCredits,
        }),
      ),
  });
}

/** DELETE /video-jobs/{id}, treating a 404 as success: the job is already
 *  gone (deleted from another tab, or a repeat request landing after the first
 *  one won), which is exactly the end state the user asked for. Without this,
 *  the repeat 404 leaves the user stranded on the deleted video's page with
 *  live-looking controls (audit L4 P1-1). The backend is making the delete
 *  idempotent on its side too; this client handling stands alone. */
export async function deleteVideoJobOrGone(id: string): Promise<void> {
  try {
    await api.deleteVideoJob(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}

export function useDeleteJob(messages: { deleteError: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVideoJobOrGone(id),
    // qk.job(id) is ["job", id] — the ["jobs"] invalidation never reaches it,
    // so the deleted job's own entry has to be dropped or Back re-renders a
    // permanently deleted video from cache as if it were live.
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: qk.job(id) });
      removeJobFromCachedLists(qc, id);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, messages.deleteError)),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (user) => qc.setQueryData(qk.me, user),
  });
}
