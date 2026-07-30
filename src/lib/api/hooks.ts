"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api, apiErrorMessage } from "./client";
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
} from "./types";

export const qk = {
  me: ["me"] as const,
  myProducts: ["my-products"] as const,
  product: (id: string) => ["product", id] as const,
  jobs: (p: Record<string, unknown>) => ["jobs", p] as const,
  job: (id: string) => ["job", id] as const,
  import: (id: string) => ["import", id] as const,
  importCandidates: (storeDomain: string) => ["import-candidates", storeDomain] as const,
  shopifyAvailability: ["shopify-availability"] as const,
};

const ACTIVE: VideoJobStatus[] = [
  "queued",
  "submitted",
  "in_progress",
  "awaiting_storyboard",
  "awaiting_review",
];

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
  });
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

export function useVideoJobs(params: { product_id?: string } = {}) {
  return useQuery({
    queryKey: qk.jobs(params),
    queryFn: () => api.listVideoJobs(params),
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

export function useCreateJob(messages: { startError: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VideoJobCreate) => api.createVideoJob(payload),
    onSuccess: (job) => {
      qc.setQueryData(qk.job(job.id), job);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, messages.startError)),
  });
}

export function useBeatAction(
  jobId: string,
  messages: { approveError: string; regenerateError: string },
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
        apiErrorMessage(
          err,
          action === "approve" ? messages.approveError : messages.regenerateError,
        ),
      ),
  });
}

export function useApproveStoryboard(
  jobId: string,
  messages: { approveError: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.approveStoryboard(jobId),
    onSuccess: (job: VideoJob) => qc.setQueryData(qk.job(job.id), job),
    onError: (err) => toast.error(apiErrorMessage(err, messages.approveError)),
  });
}

export function usePatchStoryboard(jobId: string, messages: { saveError: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyboard: Storyboard) => api.patchStoryboard(jobId, storyboard),
    onSuccess: (job: VideoJob) => qc.setQueryData(qk.job(job.id), job),
    onError: (err) => toast.error(apiErrorMessage(err, messages.saveError)),
  });
}

export function useRetryJob(messages: { retryError: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.retryVideoJob(id),
    onSuccess: (job) => {
      qc.setQueryData(qk.job(job.id), job);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, messages.retryError)),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteVideoJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (user) => qc.setQueryData(qk.me, user),
  });
}
