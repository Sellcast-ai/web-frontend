import type {
  ProductSummary,
  ProductDetail,
  ProductDraft,
  ProductCreate,
  ImportPreview,
  ImportCandidates,
  ImportJob,
  Avatar,
  AvatarCreate,
  VideoJob,
  VideoJobCreate,
  VideoJobEventCreate,
  Storyboard,
  CurrentUser,
  PhoneCodeSendResponse,
  LikeStatus,
  UserProfileUpdate,
  Usage,
  ReferencePresign,
  ShopifyAvailability,
  VideoCapabilities,
  VideoQuote,
  VideoQuoteParams,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Structured machine-readable error code from the backend body
     * (`error_type`), when present - match on this, never on message prose. */
    public errorType?: string,
    /** The human-readable message the response body itself carried, when it
     * carried one. `message` may instead be a client-side English generic (a
     * status phrase, a parse failure, a dead socket), which must never reach a
     * user in any of the nine locales - render through `apiErrorMessage`. */
    public serverMessage?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The string to show a user for a failed call: the server's own message when
 * it sent one meant for users, else the caller's already-localized fallback.
 * A 5xx body message without a structured `error_type` is not "meant for
 * users" (see `errorFrom`), so it never wins over the fallback here. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  return (err instanceof ApiError && err.serverMessage) || fallback;
}

/** Whether a failed call may still succeed later without anything changing.
 * A 4xx is the backend's settled answer about this exact request - the route
 * isn't deployed (404), the tuple is refused (422) - and every repeat buys the
 * same answer; a 5xx, a dead socket or an unparseable body is the deployment
 * or the network, which recovers on its own. Retrying, polling and any copy
 * that says we are still trying all belong to the transient side only. */
export function isTransientError(err: unknown): boolean {
  return !(err instanceof ApiError) || err.status < 400 || err.status >= 500;
}

type ErrorBody = {
  detail?: unknown;
  error?: unknown;
  message?: unknown;
  error_type?: unknown;
} | null;

/**
 * Error bodies are not always JSON - a gateway or edge error page answers with
 * HTML - and `res.status` still has to reach `ApiError` for the status-keyed
 * branches (e.g. the send-code 503 phone latch), so an unparseable body is
 * simply "no structured fields".
 */
function parseErrorBody(text: string): ErrorBody {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** The one place a failed response becomes an `ApiError`, so every transport
 * (fetch and XHR alike) carries the same message chain and `error_type`.
 * The message is never empty: `statusText` is "" over HTTP/2, and call sites
 * that render `err.message` verbatim would otherwise show nothing at all.
 * Only a message the *body* carried is marked displayable - a status phrase
 * ("Bad Gateway") and the generic are untranslated English. */
function errorFrom(status: number, statusText: string, text: string): ApiError {
  const data = parseErrorBody(text);
  const fromBody = data && (data.detail || data.error || data.message);
  const errorType =
    data && typeof data.error_type === "string" ? data.error_type : undefined;
  // A 5xx `detail` is operator prose ("Unexpected server error", "Database
  // operation failed") - untranslated English never written for users - so it
  // is displayable only when a structured `error_type` vouches for it (the
  // backend marks its deliberate user-facing 5xx messages that way, e.g. the
  // SMS-unconfigured 503). 4xx messages stay displayable: curated backend
  // prose is deliberate there.
  const serverMessage =
    typeof fromBody === "string" && fromBody && (status < 500 || errorType)
      ? fromBody
      : undefined;
  return new ApiError(
    status,
    serverMessage || statusText || "Request failed",
    errorType,
    serverMessage,
  );
}

/** Mirror of `errorFrom` for the success path: a 2xx whose body isn't the JSON
 * the caller expects still has to surface as an `ApiError`, so every call site
 * branching on `err instanceof ApiError` keeps the status and message. */
function parseSuccessBody<T>(status: number, text: string): T {
  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    throw new ApiError(status, "Malformed response from the server.");
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
  if (!res.ok) throw errorFrom(res.status, res.statusText, text);
  return parseSuccessBody<T>(res.status, text);
}

/**
 * POST with real upload progress via XHR (fetch can't observe request-body
 * progress). Used for the base64-image payloads on product/avatar creation.
 * `onProgress` receives the uploaded fraction in [0, 1].
 */
export function bffUpload<T>(
  path: string,
  json: unknown,
  onProgress?: (fraction: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/bff/${path.replace(/^\/+/, "")}`);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(parseSuccessBody<T>(xhr.status, xhr.responseText));
        } catch (e) {
          reject(e);
        }
        return;
      }
      reject(errorFrom(xhr.status, xhr.statusText, xhr.responseText));
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error — please try again."));
    xhr.send(JSON.stringify(json));
  });
}

/**
 * PUT raw file bytes directly to a presigned storage URL (R2/S3), bypassing the
 * BFF and the app server so large clips don't hit serverless body limits.
 * `Content-Type` must match what the presign was issued for. Progress via XHR;
 * `onProgress` receives the uploaded fraction in [0, 1].
 */
function putFileWithProgress(
  url: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new ApiError(xhr.status, xhr.statusText || "Upload failed"));
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error — please try again."));
    xhr.send(file);
  });
}

export const api = {
  /* --- products --- */
  getProduct: (id: string) => bff<ProductDetail>(`products/${id}`),
  listMyProducts: () => bff<ProductSummary[]>(`products/mine`),
  parseProductUrl: (url: string) =>
    bff<ProductDraft>(`products/parse`, { method: "POST", json: { url } }),
  previewImport: (storeUrl: string) =>
    bff<ImportPreview>(`products/import/preview`, {
      method: "POST",
      json: { store_url: storeUrl },
    }),
  listImportCandidates: (storeUrl: string, platform?: string) =>
    bff<ImportCandidates>(`products/import/candidates`, {
      method: "POST",
      json: { store_url: storeUrl, platform },
    }),
  /** `sourceUrls` is the reviewed subset; omitting it keeps the old
   * import-the-whole-catalog behaviour. */
  startImport: (storeUrl: string, sourceUrls?: string[], platform?: string) =>
    bff<ImportJob>(`products/import`, {
      method: "POST",
      json: { store_url: storeUrl, platform, source_urls: sourceUrls },
    }),
  getImport: (jobId: string) => bff<ImportJob>(`products/import/${jobId}`),
  createProduct: (payload: ProductCreate, onProgress?: (fraction: number) => void) =>
    bffUpload<ProductDetail>(`products`, payload, onProgress),
  likeProduct: (id: string) =>
    bff<LikeStatus>(`products/${id}/like`, { method: "PUT" }),
  unlikeProduct: (id: string) =>
    bff<LikeStatus>(`products/${id}/like`, { method: "DELETE" }),

  /* --- avatars --- */
  listAvatars: () => bff<Avatar[]>(`avatars`),
  createAvatar: (payload: AvatarCreate, onProgress?: (fraction: number) => void) =>
    bffUpload<Avatar>(`avatars`, payload, onProgress),
  deleteAvatar: (id: string) =>
    bff<void>(`avatars/${id}`, { method: "DELETE" }),

  /* --- video jobs --- */
  getVideoCapabilities: () => bff<VideoCapabilities>(`video/capabilities`),
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
  /** Read-only price preview — charges nothing. `video_model` is omitted when
   * unset so the backend prices the mode's own default model. */
  getVideoQuote: (params: VideoQuoteParams) => {
    const qs = new URLSearchParams({
      mode: params.mode,
      duration_seconds: String(params.duration_seconds),
      resolution: params.resolution,
      aspect_ratio: params.aspect_ratio,
    });
    if (params.video_model) qs.set("video_model", params.video_model);
    return bff<VideoQuote>(`video-jobs/quote?${qs.toString()}`);
  },
  createVideoJob: (payload: VideoJobCreate) =>
    bff<VideoJob>(`video-jobs`, { method: "POST", json: payload }),
  uploadReferenceVideo: async (
    file: File,
    onProgress?: (fraction: number) => void,
  ): Promise<{ url: string }> => {
    const { upload_url, public_url } = await bff<ReferencePresign>(
      `uploads/reference-video/presign`,
      {
        method: "POST",
        json: { filename: file.name, content_type: file.type, size: file.size },
      },
    );
    await putFileWithProgress(upload_url, file, onProgress);
    return { url: public_url };
  },
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
  approveStoryboard: (id: string) =>
    bff<VideoJob>(`video-jobs/${id}/storyboard/approve`, { method: "POST" }),
  patchStoryboard: (id: string, storyboard: Storyboard) =>
    bff<VideoJob>(`video-jobs/${id}/storyboard`, {
      method: "PATCH",
      json: storyboard,
    }),

  /* --- users --- */
  updateProfile: (payload: UserProfileUpdate) =>
    bff<CurrentUser>(`users/me`, { method: "PATCH", json: payload }),
  getUsage: () => bff<Usage>(`users/me/usage`),

  /* --- store connections --- */
  /** Availability probe for the Shopify connect flow - the page gates its
   * connect button on this, so a card never offers an action the backend
   * can't actually perform. */
  getShopifyAvailability: () => bff<ShopifyAvailability>(`auth/shopify/status`),

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
