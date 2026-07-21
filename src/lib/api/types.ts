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
  | "shopify"
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

/* ------------------------------------------------------- store batch import */

/** One sample product shown on the preview card (a few of the ~N found). */
export interface ImportSampleItem {
  title: string;
  image: string | null;
}

/** Fast one-page probe of a pasted store URL — count is an estimate string
 * (e.g. "~248" or "250+"), not an exact catalog walk. */
export interface ImportPreview {
  platform: string;
  store_domain: string;
  product_count_estimate: string;
  sample: ImportSampleItem[];
}

export type ImportStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "partial";

/** A store-import job's live state — returned by both enqueue and polling. */
export interface ImportJob {
  job_id: string;
  status: ImportStatus;
  store_url: string;
  products_found: number;
  products_upserted: number;
  products_failed: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
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

/** The "feeling" of the video — the hero creation control. Feeds the backend's
 * script conditioning (PR-A `VIBES`); style now auto-derives from mode. Keys
 * are snake_case to match the backend enum exactly. */
export type VideoVibe =
  | "premium_clean"
  | "fun_fast"
  | "cozy_personal"
  | "bold_punchy"
  | "clean_demo";

export type VideoJobStatus =
  | "queued"
  | "submitted"
  | "in_progress"
  | "awaiting_storyboard"
  | "awaiting_review"
  | "completed"
  | "failed";

/** How a shot cuts to the next one; drives the concat/editor. */
export type ShotTransition = "cut" | "dissolve" | "slide" | "fade" | "match_cut";

/** When the product is on screen during a shot (storyboard-review signal). */
export type ProductVisibility = "start" | "throughout" | "end" | "none";

/** The plain-language outcome taps the seller picks per shot; the backend
 * DERIVES the raw camera fields from these (deterministic map in
 * `script_generation.OUTCOME_NUDGES`), so the value strings must match it
 * exactly. */
export type OutcomeNudge =
  | "Closer on the product"
  | "Show the whole scene"
  | "Focus on the person"
  | "More energy"
  | "Slow & lingering";

export const OUTCOME_NUDGES: OutcomeNudge[] = [
  "Closer on the product",
  "Show the whole scene",
  "Focus on the person",
  "More energy",
  "Slow & lingering",
];

/** One shot in the storyboard (VideoScript.shots[]). Mirrors backend
 * `script_generation.Shot`. `technique`/`transition_out`/`product_visible`
 * are derived from `outcome_nudges`/`nudge_note` (the main-path controls) and
 * default on legacy scripts, so treat them all as always-present. */
export interface Shot {
  duration: 10 | 15;
  visual: string;
  dialogue: string | null;
  ambient_audio: string;
  on_screen_text: string | null;
  outcome_nudges: OutcomeNudge[];
  nudge_note: string;
  technique: string;
  transition_out: ShotTransition;
  product_visible: ProductVisibility;
}

/** The parsed shot-list the user reviews at the storyboard gate; the exact
 * shape PATCH /video-jobs/{id}/storyboard accepts back (mirrors backend
 * `script_generation.VideoScript`). */
export interface Storyboard {
  audience: string;
  buying_points: string[];
  hook_angle: string;
  persona: string;
  shots: Shot[];
}

export type BeatReviewStatus =
  | "pending"
  | "auto_approved"
  | "user_approved"
  | "regen_requested";

/** The three subject locks surfaced on the job so the storyboard can show
 * "this is your product / host / scene". */
export type SubjectKind = "product" | "person" | "scene";

/** One locked subject the storyboard subject-strip renders. Mirrors backend
 * `VideoJobSubjectResponse` — note the payload carries no `id`, and `image_url`
 * is null for an `asset://` digital-character person (use `asset_id`). */
export interface SubjectLock {
  kind: SubjectKind;
  image_url: string | null;
  asset_id: string | null;
  label: string;
  locked: boolean;
  source: string;
}

export interface VideoJobCreate {
  product_id: string;
  mode: VideoMode;
  style: VideoStyle;
  /** The hero creation choice. Style auto-derives from mode; vibe drives the
   * feel/energy/pacing register the backend scripts in. */
  vibe?: VideoVibe;
  /** Optional "make it like this" reference. Backend learns vibe/energy only. */
  reference_url?: string;
  duration_seconds?: VideoDuration;
  review_mode?: boolean;
  /** Gated server-side by SELLCAST_ENABLED_LANGUAGES (voice-QA'd languages only). */
  language?: VideoLanguage;
  /** Chosen on-screen identity for ai_avatar mode; null → AI-invented. */
  avatar_id?: string | null;
  /** Video model (Studio picker). Applied server-side only when the active
   * provider is BytePlus/Volcano; omit to use the server default. */
  video_model?: VideoModelKey;
  /** Render resolution (Studio picker). 1080p needs a 1080p-capable model
   * (Seedance 2.0); on fast/mini the server clamps it to 720p. */
  resolution?: VideoResolution;
}

/** Presigned direct-to-storage handshake for reference-clip uploads. The
 * browser PUTs the bytes straight to `upload_url` (bypassing the BFF so large
 * clips don't hit serverless body limits), then sends `public_url` as the
 * job's `reference_url`. */
export interface ReferencePresign {
  upload_url: string;
  public_url: string;
  key: string;
}

export type VideoModelKey = "seedance-2.0";

/** Models shown in the Studio picker. `value`/`enabled` must mirror the
 * backend's settings.selectable_video_models (SELLCAST_VIDEO_MODELS). Seedance
 * 2.0 (standard) only — avatars use the preset library; up to 1080p. */
export const VIDEO_MODELS: {
  value: VideoModelKey;
  label: string;
  blurb: string;
  enabled: boolean;
}[] = [
  { value: "seedance-2.0", label: "Seedance 2.0", blurb: "Newest · up to 1080p", enabled: true },
];

export type VideoResolution = "480p" | "720p" | "1080p";

/** Resolutions shown in the Studio picker — mirror settings.selectable_video_
 * resolutions. 1080p only renders on Seedance 2.0 (standard); the server clamps
 * it to 720p on fast/mini and charges the 1080p credit multiplier. */
export const VIDEO_RESOLUTIONS: {
  value: VideoResolution;
  label: string;
  blurb: string;
  enabled: boolean;
}[] = [
  { value: "480p", label: "480p", blurb: "Draft · cheapest", enabled: true },
  { value: "720p", label: "720p", blurb: "HD · standard", enabled: true },
  { value: "1080p", label: "1080p", blurb: "Full HD · needs Seedance 2.0", enabled: true },
];

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

export type VideoLanguage =
  | "en"
  | "es"
  | "zh"
  | "ja"
  | "ko"
  | "pt"
  | "id"
  | "th";

/** Languages shown in Studio. `enabled` must mirror the backend's
 * SELLCAST_ENABLED_LANGUAGES — flip an entry on only after its voiceover
 * passes scripts/voice_qa_languages.py. */
export const VIDEO_LANGUAGES: {
  value: VideoLanguage;
  label: string;
  enabled: boolean;
}[] = [
  { value: "en", label: "English", enabled: true },
  { value: "es", label: "Español", enabled: true },
  { value: "zh", label: "简体中文", enabled: true },
  { value: "ja", label: "日本語", enabled: true },
  { value: "ko", label: "한국어", enabled: true },
  { value: "pt", label: "Português", enabled: true },
  { value: "id", label: "Bahasa Indonesia", enabled: true },
  { value: "th", label: "ไทย", enabled: true },
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
  /** Parsed shot-list from script_json — the artifact reviewed/approved at the
   * storyboard gate. Null until the worker has written the script. */
  storyboard: Storyboard | null;
  /** Explicit product/host/scene locks, written by the worker at the image
   * step. Empty until then, and on jobs that predate the feature — the
   * subject strip is omitted when empty. */
  subjects: SubjectLock[];
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

/** The vibe picker — the hero creation control. Blurbs read as a *feeling*,
 * not camera jargon (the technique the vibe implies is derived server-side). */
export const VIDEO_VIBES: { value: VideoVibe; label: string; blurb: string }[] = [
  { value: "premium_clean", label: "Premium & clean", blurb: "Slow, elegant, controlled." },
  { value: "fun_fast", label: "Fun & fast", blurb: "Quick, playful, high energy." },
  { value: "cozy_personal", label: "Cozy & personal", blurb: "Warm, intimate, like a friend." },
  { value: "bold_punchy", label: "Bold & punchy", blurb: "Loud, snappy, impossible to scroll past." },
  { value: "clean_demo", label: "Clean demo", blurb: "Steady and clear — the product does the talking." },
];

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
