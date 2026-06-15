/** Types mirroring the Sellcast FastAPI contract (/api/v1, OpenAPI). */

/* ----------------------------------------------------------------- products */

export interface ProductSummary {
  id: string;
  external_product_id: string | null;
  title: string;
  subtitle: string;
  category_display: string | null;
  category_path: string | null;
  shop_name: string | null;
  status: string | null;
  country_code: string | null;
  price_min: number | null;
  price_max: number | null;
  commission_rate: number | null;
  monthly_sales: number | null;
  total_sales: number | null;
  total_revenue: number | null;
  creator_count_active: number | null;
  total_views: number | null;
  sales_mom_pct: number | null;
  cover_image_url: string | null;
  hero_image_urls: string[];
  detail_image_urls: string[];
  is_liked: boolean;
  /** User-created ("My Products") rows; all null for marketplace rows. */
  owner_user_id: string | null;
  source_platform: SourcePlatform | null;
  source_url: string | null;
}

export type SourcePlatform =
  | "amazon"
  | "shopee"
  | "tiktok_shop"
  | "walmart"
  | "lazada"
  | "aliexpress"
  | "temu"
  | "alibaba"
  | "taobao"
  | "mercadolibre"
  | "etsy"
  | "ebay"
  | "generic"
  | "manual";

/** What /products/parse extracted — shown on the review card, nothing saved yet. */
export interface ProductDraft {
  source_platform: SourcePlatform;
  source_url: string;
  title: string;
  description: string;
  price_min: number | null;
  price_max: number | null;
  currency: string | null;
  image_urls: string[];
  suggested_category: string | null;
  warnings: string[];
}

export interface UploadedImagePayload {
  filename: string;
  data_base64: string;
}

export interface ProductCreate {
  title: string;
  description?: string;
  category_display?: string | null;
  source_platform?: SourcePlatform;
  source_url?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string;
  image_urls?: string[];
  uploaded_images?: UploadedImagePayload[];
}

export interface SourceSnapshot {
  source: string;
  captured_at: string | null;
  monthly_sales: number | null;
  video_sales: number | null;
  creator_count: number | null;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  creator_hook: string;
  currency: string;
  sales_revenue: number | null;
  shop_total_sales: number | null;
  creator_count_total: number | null;
  total_likes: number | null;
  top_video_title: string | null;
  top_video_url: string | null;
  fastmoss_product_url: string | null;
  tiktok_product_url: string | null;
  fastmoss_shop_url: string | null;
  listed_at: string | null;
  sources: SourceSnapshot[];
}

export interface LikeStatus {
  product_id: string;
  user_id: string;
  is_liked: boolean;
}

/* -------------------------------------------------------------- video jobs */

export type VideoMode = "ai_avatar" | "product_only";

export type VideoStyle =
  | "avatar_talking_intro"
  | "avatar_demo_explainer"
  | "avatar_testimonial"
  | "avatar_host_product"
  | "product_clean_showcase"
  | "product_feature_highlights"
  | "product_unboxing"
  | "product_offer_focused";

export type VideoDuration = 10 | 15 | 20 | 25 | 30;

export type VideoJobStatus =
  | "queued"
  | "submitted"
  | "in_progress"
  | "awaiting_review"
  | "completed"
  | "failed";

export type BeatReviewStatus =
  | "pending"
  | "auto_approved"
  | "user_approved"
  | "regen_requested";

export interface VideoJobCreate {
  product_id: string;
  mode: VideoMode;
  style: VideoStyle;
  duration_seconds?: VideoDuration;
  review_mode?: boolean;
  /** Gated server-side by SELLCAST_ENABLED_LANGUAGES (voice-QA'd languages only). */
  language?: VideoLanguage;
  /** Chosen on-screen identity for ai_avatar mode; null → AI-invented. */
  avatar_id?: string | null;
}

/* ----------------------------------------------------------------- avatars */

export type AvatarKind = "uploaded" | "digital_character";

export interface Avatar {
  id: string;
  kind: AvatarKind;
  name: string;
  image_url: string | null;
  /** True for the shared digital-character library (no delete). */
  is_shared: boolean;
}

export interface AvatarCreate {
  name: string;
  filename: string;
  data_base64: string;
  consent: boolean;
}

export type VideoLanguage = "en" | "id" | "th" | "vi" | "es";

/** Languages shown in Studio. `enabled` must mirror the backend's
 * SELLCAST_ENABLED_LANGUAGES — flip an entry on only after its voiceover
 * passes scripts/voice_qa_languages.py. */
export const VIDEO_LANGUAGES: {
  value: VideoLanguage;
  label: string;
  enabled: boolean;
}[] = [
  { value: "en", label: "English", enabled: true },
  { value: "id", label: "Bahasa Indonesia", enabled: false },
  { value: "th", label: "ไทย (Thai)", enabled: false },
  { value: "vi", label: "Tiếng Việt", enabled: false },
  { value: "es", label: "Español", enabled: false },
];

export interface VideoJobBeat {
  beat_index: number;
  reference_image_url: string | null;
  review_status: BeatReviewStatus;
  regeneration_count: number;
  final_video_url: string | null;
  dialogue_drift_score: number | null;
  // Structured script content for this beat (from script_json).
  duration: number | null;
  dialogue: string | null;
  on_screen_text: string | null;
  scene: string | null;
}

export interface VideoJob {
  id: string;
  user_id: string;
  product_id: string;
  provider: string;
  provider_model: string;
  status: VideoJobStatus;
  mode: VideoMode;
  style: VideoStyle;
  duration_seconds: number;
  aspect_ratio: string;
  prompt: string;
  video_url: string | null;
  /** Same video presigned with attachment disposition — forces save-as. */
  download_url: string | null;
  thumbnail_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  product_name: string | null;
  product_image_url: string | null;
  reference_used: boolean;
  reference_video_source: string | null;
  synthesized_prompt: string | null;
  review_mode: boolean;
  beats: VideoJobBeat[];
}

export type VideoJobEventType =
  | "saved"
  | "posted"
  | "regenerated"
  | "abandoned"
  | "rated";

export interface VideoJobEventCreate {
  event_type: VideoJobEventType;
  metadata?: Record<string, unknown> | null;
}

/* -------------------------------------------------------------------- auth */

export interface AuthIdentity {
  provider: string;
  provider_user_id: string | null;
  created_at: string | null;
}

export interface CurrentUser {
  id: string;
  external_user_id: string;
  username: string | null;
  display_name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  status: string;
  identities: AuthIdentity[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  session_id: string;
}

export interface AuthSuccess {
  user: CurrentUser;
  session: AuthTokens;
}

export interface PhoneCodeSendResponse {
  verification_id: string;
  expires_at: string;
  delivery_channel: string;
  dev_code: string | null;
}

export interface UserProfileUpdate {
  username?: string | null;
  display_name: string;
  email?: string | null;
}

export interface Usage {
  plan: string;
  /** All quantities are in credits (1 credit = 1 second of 720p video). */
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
  unit?: string;
}

/* ----------------------------------------------------------------- presets */

export const VIDEO_DURATIONS: VideoDuration[] = [10, 15, 20, 25, 30];

export const VIDEO_STYLES: Record<
  VideoMode,
  { value: VideoStyle; label: string; blurb: string }[]
> = {
  ai_avatar: [
    { value: "avatar_talking_intro", label: "Talking intro", blurb: "Presenter hooks the viewer head-on." },
    { value: "avatar_demo_explainer", label: "Demo explainer", blurb: "Avatar walks through how it works." },
    { value: "avatar_testimonial", label: "Testimonial", blurb: "First-person 'this changed my…' story." },
    { value: "avatar_host_product", label: "Host + product", blurb: "Presenter holds and showcases it." },
  ],
  product_only: [
    { value: "product_clean_showcase", label: "Clean showcase", blurb: "Crisp studio beauty shots." },
    { value: "product_feature_highlights", label: "Feature highlights", blurb: "Callouts on each key feature." },
    { value: "product_unboxing", label: "Unboxing", blurb: "Satisfying reveal energy." },
    { value: "product_offer_focused", label: "Offer focused", blurb: "Price/deal front and center." },
  ],
};
