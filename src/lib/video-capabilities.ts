import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_LANGUAGES,
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
  type VideoAspectRatio,
  type VideoCapabilities,
  type VideoLanguage,
  type VideoMode,
  type VideoModeCapabilities,
  type VideoModelKey,
  type VideoResolution,
} from "@/lib/api/types";

const MODE_ORDER: VideoMode[] = ["ai_avatar", "product_only"];
const DEFAULT_MODEL = VIDEO_MODELS[0].value;
const DEFAULT_RESOLUTION: VideoResolution = "720p";
const DEFAULT_ASPECT_RATIO: VideoAspectRatio = "9:16";
const DEFAULT_LANGUAGE: VideoLanguage = "en";
const RESOLUTION_RANK: Record<VideoResolution, number> = {
  "480p": 480,
  "720p": 720,
  "1080p": 1080,
};

export type CapabilityOption<T extends string | number> = {
  value: T;
  enabled: boolean;
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
  modeKnownUnavailable: boolean;
  modelPickerVisible: boolean;
  models: CapabilityOption<VideoModelKey>[];
  resolutions: CapabilityOption<VideoResolution>[];
  aspectRatios: CapabilityOption<VideoAspectRatio>[];
  languages: CapabilityOption<VideoLanguage>[];
  repaired: StudioCapabilitySelection;
  canSubmit: boolean;
};

export function capabilityForMode(
  capabilities: VideoCapabilities | undefined,
  mode: VideoMode,
): VideoModeCapabilities | undefined {
  return capabilities?.find((entry) => entry.mode === mode);
}

export function isModeKnownUnavailable(
  capabilities: VideoCapabilities | undefined,
  mode: VideoMode,
): boolean {
  const cap = capabilityForMode(capabilities, mode);
  return Boolean(capabilities && cap && !cap.available);
}

export function repairMode(
  capabilities: VideoCapabilities | undefined,
  mode: VideoMode,
): VideoMode {
  if (!isModeKnownUnavailable(capabilities, mode)) return mode;
  return (
    MODE_ORDER.find((candidate) => !isModeKnownUnavailable(capabilities, candidate)) ??
    mode
  );
}

export function studioCapabilityState(
  capabilities: VideoCapabilities | undefined,
  selection: StudioCapabilitySelection,
): StudioCapabilityState {
  const cap = capabilityForMode(capabilities, selection.mode);
  const modeAvailable = !isModeKnownUnavailable(capabilities, selection.mode);
  const models = modelOptions(capabilities, cap, modeAvailable);
  const modelPickerVisible = models.length > 0;
  const repairedModel = repairOption(selection.videoModel, models, DEFAULT_MODEL);
  const resolutions = resolutionOptions(
    capabilities,
    cap,
    modeAvailable,
    modelPickerVisible ? repairedModel : null,
  );
  const aspectRatios = aspectRatioOptions(capabilities, cap, modeAvailable);
  const languages = languageOptions(capabilities, cap, modeAvailable);
  const repaired = {
    mode: selection.mode,
    videoModel: repairedModel,
    resolution: repairOption(selection.resolution, resolutions, DEFAULT_RESOLUTION),
    aspectRatio: repairOption(selection.aspectRatio, aspectRatios, DEFAULT_ASPECT_RATIO),
    language: repairOption(selection.language, languages, DEFAULT_LANGUAGE),
  };
  const canSubmit =
    modeAvailable &&
    hasEnabled(aspectRatios) &&
    hasEnabled(resolutions) &&
    hasEnabled(languages) &&
    (!modelPickerVisible || hasEnabled(models));

  return {
    modeAvailable,
    modeKnownUnavailable: isModeKnownUnavailable(capabilities, selection.mode),
    modelPickerVisible,
    models,
    resolutions,
    aspectRatios,
    languages,
    repaired,
    canSubmit,
  };
}

function modelOptions(
  capabilities: VideoCapabilities | undefined,
  cap: VideoModeCapabilities | undefined,
  modeAvailable: boolean,
): CapabilityOption<VideoModelKey>[] {
  if (!capabilities || !cap) {
    return VIDEO_MODELS.filter((model) => model.enabled).map((model) => ({
      value: model.value,
      enabled: model.enabled,
    }));
  }
  if (!modeAvailable || cap.models.length === 0) {
    return cap.models.length === 0
      ? []
      : VIDEO_MODELS.map((model) => ({ value: model.value, enabled: false }));
  }
  const supported = new Set(cap.models.map((model) => model.key));
  return VIDEO_MODELS.map((model) => ({
    value: model.value,
    enabled: supported.has(model.value),
  }));
}

function resolutionOptions(
  capabilities: VideoCapabilities | undefined,
  cap: VideoModeCapabilities | undefined,
  modeAvailable: boolean,
  selectedModel: VideoModelKey | null,
): CapabilityOption<VideoResolution>[] {
  if (!capabilities || !cap) {
    return VIDEO_RESOLUTIONS.map((resolution) => ({
      value: resolution.value,
      enabled: resolution.enabled,
    }));
  }
  if (!modeAvailable) {
    return VIDEO_RESOLUTIONS.map((resolution) => ({
      value: resolution.value,
      enabled: false,
    }));
  }
  const modelCap = selectedModel
    ? cap.models.find((model) => model.key === selectedModel)
    : undefined;
  const maxResolution = asResolution(modelCap?.max_resolution ?? cap.max_resolution);
  if (!maxResolution) {
    return VIDEO_RESOLUTIONS.map((resolution) => ({
      value: resolution.value,
      enabled: resolution.enabled,
    }));
  }
  return VIDEO_RESOLUTIONS.map((resolution) => ({
    value: resolution.value,
    enabled:
      resolution.enabled &&
      RESOLUTION_RANK[resolution.value] <= RESOLUTION_RANK[maxResolution],
  }));
}

function aspectRatioOptions(
  capabilities: VideoCapabilities | undefined,
  cap: VideoModeCapabilities | undefined,
  modeAvailable: boolean,
): CapabilityOption<VideoAspectRatio>[] {
  if (!capabilities || !cap) {
    return VIDEO_ASPECT_RATIOS.map((ratio) => ({ value: ratio.value, enabled: true }));
  }
  const supported = new Set(cap.aspect_ratios);
  return VIDEO_ASPECT_RATIOS.map((ratio) => ({
    value: ratio.value,
    enabled: modeAvailable && supported.has(ratio.value),
  }));
}

function languageOptions(
  capabilities: VideoCapabilities | undefined,
  cap: VideoModeCapabilities | undefined,
  modeAvailable: boolean,
): CapabilityOption<VideoLanguage>[] {
  if (!capabilities || !cap || cap.languages === null) {
    return VIDEO_LANGUAGES.map((language) => ({
      value: language.value,
      enabled: language.enabled && modeAvailable,
    }));
  }
  const supported = new Set(cap.languages);
  return VIDEO_LANGUAGES.map((language) => ({
    value: language.value,
    enabled: language.enabled && modeAvailable && supported.has(language.value),
  }));
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

function asResolution(value: string): VideoResolution | null {
  return value in RESOLUTION_RANK ? (value as VideoResolution) : null;
}
