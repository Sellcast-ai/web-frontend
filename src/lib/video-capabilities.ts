import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_LANGUAGES,
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
  type VideoAspectRatio,
  type VideoLanguage,
  type VideoMode,
  type VideoModelKey,
  type VideoResolution,
} from "@/lib/api/types";

const MODE_ORDER: VideoMode[] = ["product_only", "ai_avatar"];
const DEFAULT_MODEL = VIDEO_MODELS[0].value;
const DEFAULT_RESOLUTION: VideoResolution = "720p";
const DEFAULT_ASPECT_RATIO: VideoAspectRatio = "9:16";
const DEFAULT_LANGUAGE: VideoLanguage = "en";
const RESOLUTION_RANK: Record<VideoResolution, number> = {
  "480p": 480,
  "720p": 720,
  "1080p": 1080,
};

/** Why an option can't be picked: `soon` is the static inventory flag (built
 * but not offered yet), `unsupported` is the selected mode's own capability
 * narrowing. They read very differently to a seller, so never share copy. */
export type OptionUnavailableReason = "soon" | "unsupported";

export type CapabilityOption<T extends string | number> = {
  value: T;
  enabled: boolean;
  reason: OptionUnavailableReason | null;
};

export type StudioCapabilitySelection = {
  mode: VideoMode;
  videoModel: VideoModelKey;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  language: VideoLanguage;
};

export type StudioCapabilityState = {
  modeAvailable: boolean;
  modelPickerVisible: boolean;
  models: CapabilityOption<VideoModelKey>[];
  resolutions: CapabilityOption<VideoResolution>[];
  aspectRatios: CapabilityOption<VideoAspectRatio>[];
  languages: CapabilityOption<VideoLanguage>[];
  repaired: StudioCapabilitySelection;
  canSubmit: boolean;
};

/** What this module trusts from the payload, after validation. A capability
 * read that doesn't conform is treated as no read at all, so Studio degrades
 * to the static picker constants instead of throwing mid-render. */
type ModeCapability = {
  mode: string;
  available: boolean;
  aspectRatios: string[];
  languages: string[] | null;
  maxResolution: string | null;
  models: { key: string; maxResolution: string | null }[];
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeMode(raw: unknown): ModeCapability | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  if (typeof entry.mode !== "string" || typeof entry.available !== "boolean") return null;
  if (!Array.isArray(entry.aspect_ratios) || !Array.isArray(entry.models)) return null;
  if (entry.languages != null && !Array.isArray(entry.languages)) return null;
  return {
    mode: entry.mode,
    available: entry.available,
    aspectRatios: strings(entry.aspect_ratios),
    languages: entry.languages == null ? null : strings(entry.languages),
    maxResolution: optionalString(entry.max_resolution),
    models: entry.models
      .map((model) => {
        if (!model || typeof model !== "object") return null;
        const key = (model as Record<string, unknown>).key;
        if (typeof key !== "string") return null;
        return {
          key,
          maxResolution: optionalString(
            (model as Record<string, unknown>).max_resolution,
          ),
        };
      })
      .filter((model): model is ModeCapability["models"][number] => model !== null),
  };
}

function normalizeCapabilities(raw: unknown): ModeCapability[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const entries = raw
    .map(normalizeMode)
    .filter((entry): entry is ModeCapability => entry !== null);
  return entries.length > 0 ? entries : undefined;
}

/** Once a usable payload exists, a mode it doesn't positively report as
 * available is unavailable - an omitted entry is not a green light. */
function modeAvailableIn(caps: ModeCapability[], mode: VideoMode): boolean {
  return Boolean(caps.find((entry) => entry.mode === mode)?.available);
}

export function isModeKnownUnavailable(capabilities: unknown, mode: VideoMode): boolean {
  const caps = normalizeCapabilities(capabilities);
  return caps !== undefined && !modeAvailableIn(caps, mode);
}

export function repairMode(capabilities: unknown, mode: VideoMode): VideoMode {
  const caps = normalizeCapabilities(capabilities);
  if (!caps || modeAvailableIn(caps, mode)) return mode;
  return MODE_ORDER.find((candidate) => modeAvailableIn(caps, candidate)) ?? mode;
}

export function optionFor<T extends string | number>(
  options: CapabilityOption<T>[],
  value: T,
): CapabilityOption<T> {
  return (
    options.find((option) => option.value === value) ?? { value, enabled: true, reason: null }
  );
}

export function studioCapabilityState(
  capabilities: unknown,
  selection: StudioCapabilitySelection,
): StudioCapabilityState {
  const caps = normalizeCapabilities(capabilities);
  const cap = caps?.find((entry) => entry.mode === selection.mode);
  const modeAvailable = !caps || Boolean(cap?.available);
  const models = modelOptions(caps, cap, modeAvailable);
  const modelPickerVisible = models.length > 0;
  const repairedModel = repairOption(selection.videoModel, models, DEFAULT_MODEL);
  const resolutions = resolutionOptions(
    caps,
    cap,
    modeAvailable,
    modelPickerVisible ? repairedModel : null,
  );
  const aspectRatios = aspectRatioOptions(caps, cap, modeAvailable);
  const languages = languageOptions(caps, cap, modeAvailable);

  return {
    modeAvailable,
    modelPickerVisible,
    models,
    resolutions,
    aspectRatios,
    languages,
    repaired: {
      mode: selection.mode,
      videoModel: repairedModel,
      resolution: repairOption(selection.resolution, resolutions, DEFAULT_RESOLUTION),
      aspectRatio: repairOption(selection.aspectRatio, aspectRatios, DEFAULT_ASPECT_RATIO),
      language: repairOption(selection.language, languages, DEFAULT_LANGUAGE),
    },
    canSubmit:
      modeAvailable &&
      hasEnabled(aspectRatios) &&
      hasEnabled(resolutions) &&
      hasEnabled(languages) &&
      (!modelPickerVisible || hasEnabled(models)),
  };
}

function option<T extends string | number>(
  value: T,
  enabled: boolean,
  reason: OptionUnavailableReason,
): CapabilityOption<T> {
  return { value, enabled, reason: enabled ? null : reason };
}

function modelOptions(
  caps: ModeCapability[] | undefined,
  cap: ModeCapability | undefined,
  modeAvailable: boolean,
): CapabilityOption<VideoModelKey>[] {
  if (!caps) {
    return VIDEO_MODELS.filter((model) => model.enabled).map((model) =>
      option(model.value, true, "soon"),
    );
  }
  if (!cap || cap.models.length === 0) return [];
  if (!modeAvailable) {
    return VIDEO_MODELS.map((model) => option(model.value, false, "unsupported"));
  }
  const supported = new Set(cap.models.map((model) => model.key));
  const narrowed = VIDEO_MODELS.map((model) =>
    option(model.value, supported.has(model.value), "unsupported"),
  );
  // Nothing the backend offers has a label here - hide the picker and keep the
  // current model rather than blocking Generate behind an all-disabled row.
  return hasEnabled(narrowed) ? narrowed : [];
}

function resolutionOptions(
  caps: ModeCapability[] | undefined,
  cap: ModeCapability | undefined,
  modeAvailable: boolean,
  selectedModel: VideoModelKey | null,
): CapabilityOption<VideoResolution>[] {
  const staticOptions = (enabled: boolean) =>
    VIDEO_RESOLUTIONS.map((resolution) =>
      option(resolution.value, resolution.enabled && enabled, resolution.enabled ? "unsupported" : "soon"),
    );
  if (!caps) return staticOptions(true);
  if (!modeAvailable) return staticOptions(false);
  const modelCap = selectedModel
    ? cap?.models.find((model) => model.key === selectedModel)
    : undefined;
  const maxResolution = asResolution(modelCap?.maxResolution ?? cap?.maxResolution);
  if (!maxResolution) return staticOptions(true);
  return VIDEO_RESOLUTIONS.map((resolution) =>
    resolution.enabled
      ? option(
          resolution.value,
          RESOLUTION_RANK[resolution.value] <= RESOLUTION_RANK[maxResolution],
          "unsupported",
        )
      : option(resolution.value, false, "soon"),
  );
}

function aspectRatioOptions(
  caps: ModeCapability[] | undefined,
  cap: ModeCapability | undefined,
  modeAvailable: boolean,
): CapabilityOption<VideoAspectRatio>[] {
  const staticOptions = (enabled: boolean) =>
    VIDEO_ASPECT_RATIOS.map((ratio) => option(ratio.value, enabled, "unsupported"));
  if (!caps) return staticOptions(true);
  if (!modeAvailable) return staticOptions(false);
  const supported = new Set(cap?.aspectRatios ?? []);
  const narrowed = VIDEO_ASPECT_RATIOS.map((ratio) =>
    option(ratio.value, supported.has(ratio.value), "unsupported"),
  );
  // An empty or foreign-notation list ("9x16") would otherwise disable every
  // size and dead-end Generate; an available mode falls back to the constants.
  return hasEnabled(narrowed) ? narrowed : staticOptions(true);
}

function languageOptions(
  caps: ModeCapability[] | undefined,
  cap: ModeCapability | undefined,
  modeAvailable: boolean,
): CapabilityOption<VideoLanguage>[] {
  const staticOptions = (enabled: boolean) =>
    VIDEO_LANGUAGES.map((language) =>
      option(language.value, language.enabled && enabled, language.enabled ? "unsupported" : "soon"),
    );
  if (!caps) return staticOptions(true);
  if (!modeAvailable) return staticOptions(false);
  if (!cap || cap.languages === null) return staticOptions(true);
  const supported = new Set(cap.languages);
  const narrowed = VIDEO_LANGUAGES.map((language) =>
    language.enabled
      ? option(language.value, supported.has(language.value), "unsupported")
      : option(language.value, false, "soon"),
  );
  return hasEnabled(narrowed) ? narrowed : staticOptions(true);
}

function repairOption<T extends string | number>(
  current: T,
  options: CapabilityOption<T>[],
  preferred: T,
): T {
  if (options.some((option) => option.value === current && option.enabled)) {
    return current;
  }
  if (options.some((option) => option.value === preferred && option.enabled)) {
    return preferred;
  }
  return options.find((option) => option.enabled)?.value ?? current;
}

function hasEnabled(options: CapabilityOption<string | number>[]): boolean {
  return options.some((option) => option.enabled);
}

function asResolution(value: string | null | undefined): VideoResolution | null {
  return value && value in RESOLUTION_RANK ? (value as VideoResolution) : null;
}
