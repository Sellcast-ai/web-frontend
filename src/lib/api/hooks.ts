"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import type {
  ProductSummary,
  VideoJob,
  VideoJobCreate,
  VideoJobStatus,
} from "./types";

export const qk = {
  me: ["me"] as const,
  products: (p: Record<string, unknown>) => ["products", p] as const,
  product: (id: string) => ["product", id] as const,
  jobs: (p: Record<string, unknown>) => ["jobs", p] as const,
  job: (id: string) => ["job", id] as const,
};

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
    onSuccess: (_data, { id, liked }) => {
      // flip cached detail + any product lists
      qc.setQueryData<ProductSummary | undefined>(qk.product(id), (p) =>
        p ? { ...p, is_liked: !liked } : p,
      );
      patchProductLists(qc, id, !liked);
    },
  });
}

function patchProductLists(qc: QueryClient, id: string, isLiked: boolean) {
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

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VideoJobCreate) => api.createVideoJob(payload),
    onSuccess: (job) => {
      qc.setQueryData(qk.job(job.id), job);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
    },
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
