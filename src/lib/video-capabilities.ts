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

// Keyed by the union so a new `VideoMode` literal fails to compile here rather
// than being silently dropped by `asVideoMode` - which would report a mode the
// backend positively offered as off.
const KNOWN_MODES = Object.keys({
  product_only: true,
  ai_avatar: true,
} satisfies Record<VideoMode, true>) as readonly VideoMode[];
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
 * field and the backend picks its own default. `selectedModel` is the card that
 * still reads as chosen in that state, so a mode reported off greys the row
 * without erasing the user's pick, exactly like the other three pickers. */
export type StudioCapabilityState = {
  modeAvailable: boolean;
  modelPickerVisible: boolean;
  models: CapabilityOption<VideoModelKey>[];
  selectedModel: VideoModelKey;
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
 * payload, or for the single mode whose entry is the bad one or missing - so
 * Studio degrades to the static picker constants instead of throwing mid-render
 * or reporting a mode off that the backend never said was off. */
type ModeCapability = {
  mode: VideoMode;
  /** false when the entry was present but didn't conform. That mode's
   * capabilities are unknown, which is never the same as unavailable. */
  readable: boolean;
  available: boolean;
  aspectRatios: string[];
  languages: string[] | null;
  maxResolution: string | null;
  /** `modelId` is the provider model id the backend renders on - the same value
   * a job row carries as `provider_model`, and the only bridge back from a
   * finished job's model to the picker key a quote can be asked for. */
  models: { key: string; modelId: string | null; maxResolution: string | null }[];
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** A name outside Studio's own mode literals says nothing about the modes
 * Studio has - a renamed entry describes some other vocabulary - so the entry
 * is no read at all, and the mode it might have been keeps its constants. */
function asVideoMode(value: unknown): VideoMode | null {
  return typeof value === "string" && (KNOWN_MODES as readonly string[]).includes(value)
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
          modelId: optionalString((model as Record<string, unknown>).model_id),
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
 * provably share one snapshot. An entry a mode has no match in means nothing was
 * read for it, so an empty snapshot needs no separate spelling. */
export type VideoCapabilitySnapshot = ModeCapability[];

export function normalizeVideoCapabilities(raw: unknown): VideoCapabilitySnapshot {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeMode)
    .filter((entry): entry is ModeCapability => entry !== null);
}

/** The three states a picker narrows by, so no call site can hold a mode that
 * is both unreadable and available, or an entry it must re-check for. This is
 * the one lookup every export shares. Only `available: false` is the backend
 * saying no; a missing entry, an unparseable one and an entry naming a mode
 * Studio doesn't have are all the same thing - nothing was read for that mode,
 * so it keeps the static constants. Studio's gate is a courtesy on top of the
 * backend's own refusal, and a courtesy must never brick the product over a
 * payload it couldn't read. */
type ModeNarrowing =
  | { kind: "unknown" }
  | { kind: "off" }
  | { kind: "narrow"; cap: ModeCapability };

function modeNarrowing(caps: VideoCapabilitySnapshot, mode: VideoMode): ModeNarrowing {
  const cap = caps.find((entry) => entry.mode === mode);
  if (!cap || !cap.readable) return { kind: "unknown" };
  return cap.available ? { kind: "narrow", cap } : { kind: "off" };
}

/** The picker key that names a provider model id, from the capability read's
 * own `model_id` -> `key` pairing.
 *
 * A job row records `provider_model`, but `GET /video-jobs/quote` prices a
 * Studio picker key - so without this bridge a job can only be quoted on its
 * mode's DEFAULT model, which is the render's real model only by coincidence.
 * Availability is deliberately not consulted: this answers what an already
 * created render runs on, and a mode the backend has since switched off still
 * has jobs parked at the storyboard gate waiting to be priced.
 *
 * Null when nothing was read for the mode, or when it lists no model with that
 * id. The caller then quotes without a model and must check `VideoQuote.
 * model_id` against `provider_model` before showing the number - which it has
 * to do anyway, since only the backend can confirm what it priced. */
export function videoModelKeyForProviderModel(
  caps: VideoCapabilitySnapshot,
  mode: VideoMode,
  providerModel: string,
): string | null {
  const cap = caps.find((entry) => entry.mode === mode);
  if (!cap?.readable || !providerModel) return null;
  return cap.models.find((model) => model.modelId === providerModel)?.key ?? null;
}

export function isModeKnownUnavailable(
  caps: VideoCapabilitySnapshot,
  mode: VideoMode,
): boolean {
  return modeNarrowing(caps, mode).kind === "off";
}

export function studioCapabilityState(
  caps: VideoCapabilitySnapshot,
  selection: StudioCapabilitySelection,
): StudioCapabilityState {
  const narrowing = modeNarrowing(caps, selection.mode);
  const modeAvailable = narrowing.kind !== "off";
  const models = modelOptions(narrowing);
  const modelPickerVisible = models.length > 0;
  const selectedModel = repairOption(selection.videoModel, models, DEFAULT_MODEL);
  const repairedModel = enabledOnly(selectedModel, models);
  const resolutions = resolutionOptions(narrowing, repairedModel);
  const aspectRatios = aspectRatioOptions(narrowing);
  const languages = languageOptions(narrowing);

  return {
    modeAvailable,
    modelPickerVisible,
    models,
    selectedModel,
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
  // The mode card carries the whole explanation, so the row goes quiet rather
  // than blaming each model - and stays put, keeping the user's pick visible
  // instead of collapsing the section out from under them.
  if (narrowing.kind === "off") return inertOptions(released);
  if (narrowing.cap.models.length === 0) return [];
  const supported = new Set(narrowing.cap.models.map((model) => model.key));
  const narrowed = released.map((model) =>
    option(model.value, supported.has(model.value), "unsupported"),
  );
  // Nothing the backend offers has a label here, so there is no model to show
  // or to send: the picker hides and the create payload omits the field (see
  // `videoModel: null` above) rather than blocking Generate behind a dead row.
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
