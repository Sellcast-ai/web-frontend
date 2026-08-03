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

/** `videoModel` is null when this mode offers no model Studio can stand behind:
 * there is nothing honest to pick or to send, so the create payload omits the
 * field and the backend picks its own default. */
export type StudioCapabilityState = {
  modeAvailable: boolean;
  modelPickerVisible: boolean;
  models: CapabilityOption<VideoModelKey>[];
  resolutions: CapabilityOption<VideoResolution>[];
  aspectRatios: CapabilityOption<VideoAspectRatio>[];
  languages: CapabilityOption<VideoLanguage>[];
  repaired: Omit<StudioCapabilitySelection, "mode" | "videoModel"> & {
    videoModel: VideoModelKey | null;
  };
  canSubmit: boolean;
};

/** What this module trusts from the payload, after validation. A capability
 * read that doesn't conform is treated as no read at all - for the whole
 * payload, or for the single mode whose entry is the bad one - so Studio
 * degrades to the static picker constants instead of throwing mid-render or
 * reporting a mode off that the backend never said was off. */
type ModeCapability = {
  mode: VideoMode;
  /** false when the entry was present but didn't conform. That mode's
   * capabilities are unknown, which is never the same as unavailable. */
  readable: boolean;
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

/** A name outside Studio's own mode literals says nothing about the modes
 * Studio has - a backend rename would otherwise read as every mode reported
 * off, disabling Generate for everyone - so the entry is no read at all. */
function asVideoMode(value: unknown): VideoMode | null {
  return typeof value === "string" && (MODE_ORDER as string[]).includes(value)
    ? (value as VideoMode)
    : null;
}

function normalizeMode(raw: unknown): ModeCapability | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const mode = asVideoMode(entry.mode);
  if (!mode) return null;
  const unreadable: ModeCapability = {
    mode,
    readable: false,
    available: false,
    aspectRatios: [],
    languages: null,
    maxResolution: null,
    models: [],
  };
  if (typeof entry.available !== "boolean") return unreadable;
  if (!Array.isArray(entry.aspect_ratios) || !Array.isArray(entry.models)) return unreadable;
  if (entry.languages != null && !Array.isArray(entry.languages)) return unreadable;
  return {
    mode,
    readable: true,
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

/** The validated payload every entry point reads. Normalize once per capability
 * read and pass the result around, so the mode gate, the repair and the pickers
 * provably share one snapshot. `undefined` means no usable read. */
export type VideoCapabilitySnapshot = ModeCapability[];

export function normalizeVideoCapabilities(
  raw: unknown,
): VideoCapabilitySnapshot | undefined {
  if (!Array.isArray(raw)) return undefined;
  const entries = raw
    .map(normalizeMode)
    .filter((entry): entry is ModeCapability => entry !== null);
  return entries.length > 0 ? entries : undefined;
}

/** The three states a picker narrows by, so no call site can hold a mode that
 * is both unreadable and available, or an entry it must re-check for. This is
 * the one lookup every export shares. An entry that was there but didn't parse
 * says nothing about the mode, and unknown must read as "no capability data"
 * for it, never as a backend saying no; once a usable payload exists, a mode it
 * doesn't positively report as available is off - an omitted entry is not a
 * green light. */
type ModeNarrowing =
  | { kind: "unknown" }
  | { kind: "off" }
  | { kind: "narrow"; cap: ModeCapability };

function modeNarrowing(
  caps: VideoCapabilitySnapshot | undefined,
  mode: VideoMode,
): ModeNarrowing {
  if (!caps) return { kind: "unknown" };
  const cap = caps.find((entry) => entry.mode === mode);
  if (cap && !cap.readable) return { kind: "unknown" };
  return cap?.available ? { kind: "narrow", cap } : { kind: "off" };
}

export function isModeKnownUnavailable(
  caps: VideoCapabilitySnapshot | undefined,
  mode: VideoMode,
): boolean {
  return modeNarrowing(caps, mode).kind === "off";
}

export function studioCapabilityState(
  caps: VideoCapabilitySnapshot | undefined,
  selection: StudioCapabilitySelection,
): StudioCapabilityState {
  const narrowing = modeNarrowing(caps, selection.mode);
  const modeAvailable = narrowing.kind !== "off";
  const models = modelOptions(narrowing);
  const modelPickerVisible = models.length > 0;
  const repairedModel = enabledOnly(
    repairOption(selection.videoModel, models, DEFAULT_MODEL),
    models,
  );
  const resolutions = resolutionOptions(narrowing, repairedModel);
  const aspectRatios = aspectRatioOptions(narrowing);
  const languages = languageOptions(narrowing);

  return {
    modeAvailable,
    modelPickerVisible,
    models,
    resolutions,
    aspectRatios,
    languages,
    repaired: {
      videoModel: repairedModel,
      resolution: repairOption(selection.resolution, resolutions, DEFAULT_RESOLUTION),
      aspectRatio: repairOption(selection.aspectRatio, aspectRatios, DEFAULT_ASPECT_RATIO),
      language: repairOption(selection.language, languages, DEFAULT_LANGUAGE),
    },
    canSubmit:
      modeAvailable &&
      hasEnabled(aspectRatios) &&
      hasEnabled(resolutions) &&
      hasEnabled(languages),
  };
}

function option<T extends string | number>(
  value: T,
  enabled: boolean,
  reason: OptionUnavailableReason,
): CapabilityOption<T> {
  return { value, enabled, reason: enabled ? null : reason };
}

/** The mode card already carries the whole explanation when a mode is off, so
 * the options under it go quiet rather than each blaming itself for it. */
function inertOptions<T extends string | number>(
  values: readonly { value: T }[],
): CapabilityOption<T>[] {
  return values.map(({ value }) => ({ value, enabled: false, reason: null }));
}

function modelOptions(narrowing: ModeNarrowing): CapabilityOption<VideoModelKey>[] {
  // One shape whether or not capabilities have landed: the static inventory
  // decides which models exist at all, capabilities only decide which of those
  // this mode can pick. A card that appeared a moment after load would read as
  // the backend offering something new when it offered what it always did.
  const released = VIDEO_MODELS.filter((model) => model.enabled);
  if (narrowing.kind === "unknown") {
    return released.map((model) => option(model.value, true, "unsupported"));
  }
  // The mode card already says the whole mode is off; a row of models under it
  // would only restate that, so hide the picker either way.
  if (narrowing.kind === "off") return [];
  if (narrowing.cap.models.length === 0) return [];
  const supported = new Set(narrowing.cap.models.map((model) => model.key));
  const narrowed = released.map((model) =>
    option(model.value, supported.has(model.value), "unsupported"),
  );
  // Nothing the backend offers has a label here - hide the picker and keep the
  // current model rather than blocking Generate behind an all-disabled row.
  return hasEnabled(narrowed) ? narrowed : [];
}

function resolutionOptions(
  narrowing: ModeNarrowing,
  selectedModel: VideoModelKey | null,
): CapabilityOption<VideoResolution>[] {
  const staticOptions = () =>
    VIDEO_RESOLUTIONS.map((resolution) =>
      option(resolution.value, resolution.enabled, "soon"),
    );
  if (narrowing.kind === "unknown") return staticOptions();
  if (narrowing.kind === "off") return inertOptions(VIDEO_RESOLUTIONS);
  const { cap } = narrowing;
  // A ceiling this module can't read is a reason for more caution, not less:
  // an unparseable one drops to the same lowest-offered height as sending no
  // model at all, never up to the mode's aggregate maximum.
  const maxResolution =
    (selectedModel
      ? asResolution(
          cap.models.find((model) => model.key === selectedModel)?.maxResolution,
        )
      : null) ??
    lowestOfferedResolution(cap) ??
    asResolution(cap.maxResolution);
  if (!maxResolution) return staticOptions();
  const narrowed = VIDEO_RESOLUTIONS.map((resolution) =>
    resolution.enabled
      ? option(
          resolution.value,
          RESOLUTION_RANK[resolution.value] <= RESOLUTION_RANK[maxResolution],
          "unsupported",
        )
      : option(resolution.value, false, "soon"),
  );
  return hasEnabled(narrowed) ? narrowed : staticOptions();
}

function aspectRatioOptions(
  narrowing: ModeNarrowing,
): CapabilityOption<VideoAspectRatio>[] {
  const staticOptions = () =>
    VIDEO_ASPECT_RATIOS.map((ratio) => option(ratio.value, true, "unsupported"));
  if (narrowing.kind === "unknown") return staticOptions();
  if (narrowing.kind === "off") return inertOptions(VIDEO_ASPECT_RATIOS);
  const supported = new Set(narrowing.cap.aspectRatios);
  const narrowed = VIDEO_ASPECT_RATIOS.map((ratio) =>
    option(ratio.value, supported.has(ratio.value), "unsupported"),
  );
  // An empty or foreign-notation list ("9x16") would otherwise disable every
  // size and dead-end Generate; an available mode falls back to the constants.
  return hasEnabled(narrowed) ? narrowed : staticOptions();
}

function languageOptions(narrowing: ModeNarrowing): CapabilityOption<VideoLanguage>[] {
  const staticOptions = () =>
    VIDEO_LANGUAGES.map((language) => option(language.value, language.enabled, "soon"));
  if (narrowing.kind === "unknown") return staticOptions();
  if (narrowing.kind === "off") return inertOptions(VIDEO_LANGUAGES);
  if (narrowing.cap.languages === null) return staticOptions();
  const supported = new Set(narrowing.cap.languages);
  const narrowed = VIDEO_LANGUAGES.map((language) =>
    language.enabled
      ? option(language.value, supported.has(language.value), "unsupported")
      : option(language.value, false, "soon"),
  );
  return hasEnabled(narrowed) ? narrowed : staticOptions();
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

function enabledOnly<T extends string | number>(
  value: T,
  options: CapabilityOption<T>[],
): T | null {
  return options.some((option) => option.value === value && option.enabled) ? value : null;
}

function hasEnabled(options: CapabilityOption<string | number>[]): boolean {
  return options.some((option) => option.enabled);
}

/** No model is being sent, so the backend picks one and the mode's aggregate
 * ceiling would over-promise: the only height Studio can stand behind is the
 * lowest among the models this mode offers. */
function lowestOfferedResolution(cap: ModeCapability): VideoResolution | null {
  const ceilings = cap.models
    .map((model) => asResolution(model.maxResolution))
    .filter((value): value is VideoResolution => value !== null);
  return ceilings.length === 0
    ? null
    : ceilings.reduce((lowest, value) =>
        RESOLUTION_RANK[value] < RESOLUTION_RANK[lowest] ? value : lowest,
      );
}

function asResolution(value: string | null | undefined): VideoResolution | null {
  return value && value in RESOLUTION_RANK ? (value as VideoResolution) : null;
}
