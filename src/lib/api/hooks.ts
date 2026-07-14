"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { toast } from "@/lib/toast";
import type {
  AvatarCreate,
  ProductCreate,
  ProductSummary,
  VideoJob,
  VideoJobCreate,
  VideoJobStatus,
} from "./types";

export const qk = {
  me: ["me"] as const,
  products: (p: Record<string, unknown>) => ["products", p] as const,
  myProducts: ["my-products"] as const,
  product: (id: string) => ["product", id] as const,
  jobs: (p: Record<string, unknown>) => ["jobs", p] as const,
  job: (id: string) => ["job", id] as const,
};

/** Backend error message when it's human-readable, else the fallback. */
function errMsg(err: unknown, fallback: string): string {
  return (err instanceof Error && err.message) || fallback;
}

const ACTIVE: VideoJobStatus[] = [
  "queued",
  "submitted",
  "in_progress",
  "awaiting_review",
];

/* ------------------------------------------------------------------ reads */

export function useCurrentUser() {
  return useQuery({ queryKey: qk.me, queryFn: api.me, staleTime: 60_000 });
}

export function useUsage() {
  return useQuery({ queryKey: ["usage"], queryFn: api.getUsage, staleTime: 15_000 });
}

export function useProducts(params: {
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: qk.products(params),
    queryFn: () => api.listProducts(params),
    placeholderData: (prev) => prev,
  });
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

export function useCreateAvatar(onProgress?: (fraction: number) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvatarCreate) => api.createAvatar(payload, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avatars"] }),
    onError: (err) => toast.error(errMsg(err, "Couldn't save the avatar.")),
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAvatar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avatars"] }),
    onError: (err) => toast.error(errMsg(err, "Couldn't delete the avatar.")),
  });
}

export function useVideoJobs(params: { product_id?: string } = {}) {
  return useQuery({
    queryKey: qk.jobs(params),
    queryFn: () => api.listVideoJobs(params),
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

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked ? api.unlikeProduct(id) : api.likeProduct(id),
    // optimistic: flip cached detail + any product lists immediately,
    // roll back from the snapshot (with a toast) if the request fails
    onMutate: async ({ id, liked }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: qk.product(id) }),
        qc.cancelQueries({ queryKey: ["products"] }),
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
      toast.error("Couldn't update like. Please try again.");
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: qk.product(id) });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function snapshotProductQueries(
  qc: QueryClient,
  id: string,
): [readonly unknown[], unknown][] {
  const entries: [readonly unknown[], unknown][] = [
    [qk.product(id), qc.getQueryData(qk.product(id))],
  ];
  qc.getQueryCache()
    .findAll({ queryKey: ["products"] })
    .forEach((q) => entries.push([q.queryKey, q.state.data]));
  return entries;
}

export function patchProductLists(qc: QueryClient, id: string, isLiked: boolean) {
  qc.getQueryCache()
    .findAll({ queryKey: ["products"] })
    .forEach((q) => {
      const data = q.state.data as ProductSummary[] | undefined;
      if (!Array.isArray(data)) return;
      qc.setQueryData(
        q.queryKey,
        data.map((p) => (p.id === id ? { ...p, is_liked: isLiked } : p)),
      );
    });
}

export function useParseProduct() {
  return useMutation({ mutationFn: (url: string) => api.parseProductUrl(url) });
}

export function useCreateProduct(onProgress?: (fraction: number) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductCreate) => api.createProduct(payload, onProgress),
    onSuccess: (product) => {
      qc.setQueryData(qk.product(product.id), product);
      qc.invalidateQueries({ queryKey: qk.myProducts });
    },
    onError: (err) =>
      toast.error(errMsg(err, "Couldn't save the product. Please try again.")),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VideoJobCreate) => api.createVideoJob(payload),
    onSuccess: (job) => {
      qc.setQueryData(qk.job(job.id), job);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
    },
    onError: (err) =>
      toast.error(errMsg(err, "Couldn't start the video. Please try again.")),
  });
}

export function useBeatAction(jobId: string) {
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
        errMsg(
          err,
          action === "approve"
            ? "Couldn't approve the shot. Please try again."
            : "Couldn't regenerate the shot. Please try again.",
        ),
      ),
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.retryVideoJob(id),
    onSuccess: (job) => {
      qc.setQueryData(qk.job(job.id), job);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
    },
    onError: (err) =>
      toast.error(errMsg(err, "Couldn't retry the job. Please try again.")),
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
