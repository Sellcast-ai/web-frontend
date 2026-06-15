import type {
  ProductSummary,
  ProductDetail,
  ProductDraft,
  ProductCreate,
  Avatar,
  AvatarCreate,
  VideoJob,
  VideoJobCreate,
  VideoJobEventCreate,
  CurrentUser,
  PhoneCodeSendResponse,
  LikeStatus,
  UserProfileUpdate,
  Usage,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function bff<T>(
  path: string,
  init: (RequestInit & { json?: unknown }) = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api/bff/${path.replace(/^\/+/, "")}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (data && (data.detail || data.error || data.message)) || res.statusText;
    throw new ApiError(res.status, typeof msg === "string" ? msg : "Request failed");
  }
  return data as T;
}

export const api = {
  /* --- products --- */
  listProducts: (
    params: { q?: string; category?: string; limit?: number; offset?: number } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category) qs.set("category", params.category);
    qs.set("limit", String(params.limit ?? 24));
    qs.set("offset", String(params.offset ?? 0));
    return bff<ProductSummary[]>(`products?${qs.toString()}`);
  },
  getProduct: (id: string) => bff<ProductDetail>(`products/${id}`),
  listMyProducts: () => bff<ProductSummary[]>(`products/mine`),
  parseProductUrl: (url: string) =>
    bff<ProductDraft>(`products/parse`, { method: "POST", json: { url } }),
  createProduct: (payload: ProductCreate) =>
    bff<ProductDetail>(`products`, { method: "POST", json: payload }),
  likeProduct: (id: string) =>
    bff<LikeStatus>(`products/${id}/like`, { method: "PUT" }),
  unlikeProduct: (id: string) =>
    bff<LikeStatus>(`products/${id}/like`, { method: "DELETE" }),

  /* --- avatars --- */
  listAvatars: () => bff<Avatar[]>(`avatars`),
  createAvatar: (payload: AvatarCreate) =>
    bff<Avatar>(`avatars`, { method: "POST", json: payload }),
  deleteAvatar: (id: string) =>
    bff<void>(`avatars/${id}`, { method: "DELETE" }),

  /* --- video jobs --- */
  listVideoJobs: (
    params: { product_id?: string; limit?: number; offset?: number } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.product_id) qs.set("product_id", params.product_id);
    qs.set("limit", String(params.limit ?? 50));
    qs.set("offset", String(params.offset ?? 0));
    return bff<VideoJob[]>(`video-jobs?${qs.toString()}`);
  },
  getVideoJob: (id: string) => bff<VideoJob>(`video-jobs/${id}`),
  createVideoJob: (payload: VideoJobCreate) =>
    bff<VideoJob>(`video-jobs`, { method: "POST", json: payload }),
  deleteVideoJob: (id: string) =>
    bff<void>(`video-jobs/${id}`, { method: "DELETE" }),
  retryVideoJob: (id: string) =>
    bff<VideoJob>(`video-jobs/${id}/retry`, { method: "POST" }),
  recordEvent: (id: string, payload: VideoJobEventCreate) =>
    bff<unknown>(`video-jobs/${id}/events`, { method: "POST", json: payload }),
  approveBeat: (id: string, beatIndex: number) =>
    bff<VideoJob>(`video-jobs/${id}/beats/${beatIndex}/approve`, {
      method: "POST",
    }),
  regenerateBeat: (id: string, beatIndex: number) =>
    bff<VideoJob>(`video-jobs/${id}/beats/${beatIndex}/regenerate`, {
      method: "POST",
    }),

  /* --- users --- */
  updateProfile: (payload: UserProfileUpdate) =>
    bff<CurrentUser>(`users/me`, { method: "PATCH", json: payload }),
  getUsage: () => bff<Usage>(`users/me/usage`),

  /* --- auth --- */
  me: async (): Promise<CurrentUser | null> => {
    try {
      return await bff<CurrentUser>(`auth/me`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  sendPhoneCode: (phone_number: string, purpose: "login" | "signup" = "login") =>
    bff<PhoneCodeSendResponse>(`auth/phone/send-code`, {
      method: "POST",
      json: { phone_number, purpose },
    }),
  verifyPhoneCode: (
    phone_number: string,
    code: string,
    purpose: "login" | "signup" = "login",
  ) =>
    bff<{ user: CurrentUser }>(`auth/phone/verify`, {
      method: "POST",
      json: { phone_number, code, purpose },
    }),
  googleLogin: (id_token: string) =>
    bff<{ user: CurrentUser }>(`auth/google`, {
      method: "POST",
      json: { id_token },
    }),
  logout: () => bff<{ ok: boolean }>(`auth/logout`, { method: "POST" }),
};
