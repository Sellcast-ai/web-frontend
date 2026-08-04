import { describe, expect, it } from "vitest";
import {
  isModeKnownUnavailable as modeKnownUnavailableIn,
  normalizeVideoCapabilities,
  studioCapabilityState as capabilityStateIn,
  type StudioCapabilitySelection,
} from "./video-capabilities";
import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_LANGUAGES,
  type VideoCapabilities,
  type VideoMode,
} from "./api/types";

// The module takes one validated snapshot; these cases start from the raw
// payload shape the backend sends, so they normalize on the way in.
const studioCapabilityState = (raw: unknown, selection: StudioCapabilitySelection) =>
  capabilityStateIn(normalizeVideoCapabilities(raw), selection);
const isModeKnownUnavailable = (raw: unknown, mode: VideoMode) =>
  modeKnownUnavailableIn(normalizeVideoCapabilities(raw), mode);

const baseSelection: StudioCapabilitySelection = {
  mode: "product_only",
  videoModel: "seedance-2.0",
  resolution: "720p",
  aspectRatio: "9:16",
  language: "en",
};

const capabilities: VideoCapabilities = [
  {
    mode: "product_only",
    available: true,
    aspect_ratios: ["9:16", "16:9"],
    languages: null,
    beat_durations: [5, 10],
    max_resolution: "1080p",
    models: [
      {
        key: "seedance-2.0",
        label: "Seedance 2.0",
        model_id: "doubao-seedance-2-0-260128",
        max_resolution: "1080p",
        beat_durations: [5, 10],
      },
      {
        key: "seedance-2.0-fast",
        label: "Seedance 2.0 Fast",
        model_id: "doubao-seedance-2-0-fast-260128",
        max_resolution: "720p",
        beat_durations: [5, 10],
      },
    ],
  },
  {
    mode: "ai_avatar",
    available: false,
    aspect_ratios: ["9:16", "16:9", "1:1"],
    languages: ["en"],
    beat_durations: [5, 10],
    max_resolution: "720p",
    models: [],
  },
];

function enabledValues<T extends string | number>(
  options: { value: T; enabled: boolean }[],
): T[] {
  return options.filter((option) => option.enabled).map((option) => option.value);
}

describe("studioCapabilityState", () => {
  it("narrows pickers to the selected mode's capability response", () => {
    const state = studioCapabilityState(capabilities, baseSelection);

    expect(enabledValues(state.aspectRatios)).toEqual(["9:16", "16:9"]);
    expect(enabledValues(state.models)).toEqual(["seedance-2.0"]);
    expect(enabledValues(state.languages)).toEqual([
      "en",
      "es",
      "zh",
      "ja",
      "ko",
      "pt",
      "id",
      "th",
    ]);
    expect(state.canSubmit).toBe(true);
  });

  it("marks unsupported options disabled instead of selectable", () => {
    const state = studioCapabilityState(capabilities, baseSelection);

    expect(state.aspectRatios.find((ratio) => ratio.value === "4:3")?.enabled).toBe(
      false,
    );
    expect(state.aspectRatios.find((ratio) => ratio.value === "3:4")?.enabled).toBe(
      false,
    );
  });

  it("uses the selected model's resolution ceiling", () => {
    const state = studioCapabilityState(
      [
        {
          ...capabilities[0],
          max_resolution: "1080p",
          models: [{ ...capabilities[0].models[0], max_resolution: "720p" }],
        },
      ],
      { ...baseSelection, resolution: "1080p" },
    );

    expect(state.repaired.videoModel).toBe("seedance-2.0");
    expect(enabledValues(state.resolutions)).toEqual(["480p", "720p"]);
    expect(state.repaired.resolution).toBe("720p");
  });

  it("switching mode re-narrows and repairs invalid selections", () => {
    const availableAvatar: VideoCapabilities = [
      capabilities[0],
      { ...capabilities[1], available: true },
    ];
    const state = studioCapabilityState(availableAvatar, {
      ...baseSelection,
      mode: "ai_avatar",
      resolution: "1080p",
      aspectRatio: "4:3",
      language: "es",
    });

    expect(state.modelPickerVisible).toBe(false);
    expect(enabledValues(state.resolutions)).toEqual(["480p", "720p"]);
    expect(enabledValues(state.aspectRatios)).toEqual(["9:16", "16:9", "1:1"]);
    expect(enabledValues(state.languages)).toEqual(["en"]);
    expect(state.repaired).toMatchObject({
      resolution: "720p",
      aspectRatio: "9:16",
      language: "en",
    });
    expect(state.canSubmit).toBe(true);
  });

  it("surfaces an unavailable mode and makes it unsubmittable", () => {
    const state = studioCapabilityState(capabilities, {
      ...baseSelection,
      mode: "ai_avatar",
    });

    expect(state.modeAvailable).toBe(false);
    expect(state.canSubmit).toBe(false);
  });

  it("treats a mode the payload omits as unknown, not unavailable", () => {
    // Only `available: false` is the backend saying no. A payload that just
    // doesn't mention a mode - a rename, a different mode set - says nothing
    // about it, so that mode keeps the constants instead of blocking Generate.
    const productOnly = [capabilities[0]];

    expect(isModeKnownUnavailable(productOnly, "ai_avatar")).toBe(false);
    expect(studioCapabilityState(productOnly, { ...baseSelection, mode: "ai_avatar" }))
      .toMatchObject({ modeAvailable: true, canSubmit: true });
  });

  it("keeps a positively reported mode's verdict through a partial rename", () => {
    // `product_only` renamed away, `ai_avatar` still spelled as Studio has it:
    // the renamed one is unknown (constants), the named one still counts.
    const partiallyRenamed = [
      { ...capabilities[0], mode: "product" },
      capabilities[1],
    ];

    expect(isModeKnownUnavailable(partiallyRenamed, "product_only")).toBe(false);
    expect(studioCapabilityState(partiallyRenamed, baseSelection)).toMatchObject({
      modeAvailable: true,
      canSubmit: true,
    });
    expect(isModeKnownUnavailable(partiallyRenamed, "ai_avatar")).toBe(true);
  });

  it("never moves the user off an unavailable mode", () => {
    // Sub-options fall back on their own, but the mode is the user's choice of
    // what to ship: an off mode blocks Generate until they click another one.
    const avatarOnly: VideoCapabilities = [
      { ...capabilities[0], available: false },
      { ...capabilities[1], available: true },
    ];
    const state = studioCapabilityState(avatarOnly, baseSelection);

    expect(state.modeAvailable).toBe(false);
    expect(state.canSubmit).toBe(false);
    expect(isModeKnownUnavailable(avatarOnly, "ai_avatar")).toBe(false);
  });

  it("falls back to the constants rather than dead-ending an available mode", () => {
    const foreignNotation: VideoCapabilities = [
      { ...capabilities[0], aspect_ratios: ["9x16"], languages: ["klingon"] },
    ];
    const state = studioCapabilityState(foreignNotation, baseSelection);

    expect(enabledValues(state.aspectRatios)).toEqual(
      VIDEO_ASPECT_RATIOS.map((ratio) => ratio.value),
    );
    expect(enabledValues(state.languages)).toEqual(
      VIDEO_LANGUAGES.filter((language) => language.enabled).map((l) => l.value),
    );
    expect(state.canSubmit).toBe(true);

    const emptyLists = studioCapabilityState(
      [{ ...capabilities[0], aspect_ratios: [], languages: [] }],
      baseSelection,
    );
    expect(emptyLists.canSubmit).toBe(true);
  });

  it("labels why an option is unpickable", () => {
    const state = studioCapabilityState(capabilities, baseSelection);

    expect(state.aspectRatios.find((ratio) => ratio.value === "4:3")).toMatchObject({
      enabled: false,
      reason: "unsupported",
    });
    expect(state.aspectRatios.find((ratio) => ratio.value === "9:16")?.reason).toBe(
      null,
    );
  });

  it("keeps one picker shape whether or not capabilities have landed", () => {
    // Fast is `enabled: false` in the static inventory, so it is not offered
    // anywhere yet - a payload naming it must not grow a second card.
    const listed = (state: { models: { value: string }[] }) =>
      state.models.map((model) => model.value);

    expect(listed(studioCapabilityState(undefined, baseSelection))).toEqual([
      "seedance-2.0",
    ]);
    expect(listed(studioCapabilityState(capabilities, baseSelection))).toEqual([
      "seedance-2.0",
    ]);
  });

  it("blames the mode, not each option, when the mode is off", () => {
    const state = studioCapabilityState(capabilities, {
      ...baseSelection,
      mode: "ai_avatar",
    });

    for (const options of [
      state.models,
      state.resolutions,
      state.aspectRatios,
      state.languages,
    ]) {
      expect(options.length).toBeGreaterThan(0);
      expect(options.every((option) => !option.enabled)).toBe(true);
      expect(options.every((option) => option.reason === null)).toBe(true);
    }
  });

  it("uses the lowest offered ceiling when no model is being sent", () => {
    const state = studioCapabilityState(
      [
        {
          ...capabilities[0],
          max_resolution: "1080p",
          models: [
            { ...capabilities[0].models[0], key: "veo-9", max_resolution: "1080p" },
            { ...capabilities[0].models[1], key: "veo-mini", max_resolution: "720p" },
          ],
        },
      ],
      { ...baseSelection, resolution: "1080p" },
    );

    expect(state.repaired.videoModel).toBeNull();
    expect(enabledValues(state.resolutions)).toEqual(["480p", "720p"]);
    expect(state.repaired.resolution).toBe("720p");
  });

  it.each([null, "ultra-hd", undefined])(
    "drops to the lowest offered ceiling when the picked model declares %s",
    (unreadable) => {
      // The mode says 1080p in aggregate, but the model being sent declares no
      // ceiling this module can read - trusting the aggregate would offer a
      // height the server clamps while still charging the 1080p multiplier.
      const state = studioCapabilityState(
        [
          {
            ...capabilities[0],
            max_resolution: "1080p",
            models: [
              { ...capabilities[0].models[0], max_resolution: unreadable },
              capabilities[0].models[1],
            ],
          },
        ],
        { ...baseSelection, resolution: "1080p" },
      );

      expect(state.repaired.videoModel).toBe("seedance-2.0");
      expect(enabledValues(state.resolutions)).toEqual(["480p", "720p"]);
      expect(state.repaired.resolution).toBe("720p");
    },
  );

  it("degrades to the constants when the payload is malformed", () => {
    for (const malformed of [
      { modes: [] },
      [{ mode: "product_only" }],
      ["product_only"],
      [],
      null,
    ]) {
      const state = studioCapabilityState(malformed, baseSelection);

      expect(state.modeAvailable).toBe(true);
      expect(state.canSubmit).toBe(true);
      expect(enabledValues(state.models)).toEqual(["seedance-2.0"]);
      expect(isModeKnownUnavailable(malformed, "product_only")).toBe(false);
    }
  });

  it("treats a payload naming no mode Studio has as no read at all", () => {
    // A backend rename must never report every mode off and strand every user
    // behind a disabled Generate.
    const renamed = capabilities.map((entry) => ({
      ...entry,
      mode: entry.mode.replace("_", "-"),
      available: true,
    }));
    const state = studioCapabilityState(renamed, baseSelection);

    expect(isModeKnownUnavailable(renamed, "product_only")).toBe(false);
    expect(isModeKnownUnavailable(renamed, "ai_avatar")).toBe(false);
    expect(state.modeAvailable).toBe(true);
    expect(state.canSubmit).toBe(true);
    expect(enabledValues(state.aspectRatios)).toEqual(
      VIDEO_ASPECT_RATIOS.map((ratio) => ratio.value),
    );
  });

  it("survives a payload whose entries are partly junk", () => {
    const state = studioCapabilityState(
      [
        { ...capabilities[0], models: [null, { label: "no key" }, capabilities[0].models[0]] },
        "junk",
      ],
      baseSelection,
    );

    expect(enabledValues(state.models)).toEqual(["seedance-2.0"]);
    expect(state.canSubmit).toBe(true);
  });

  it.each([
    { available: "yes" },
    { models: { "seedance-2.0": {} } },
    { aspect_ratios: { "0": "9:16" } },
    { languages: "en" },
  ])("treats an unparseable entry for the selected mode as unknown, not off", (bad) => {
    // One bad entry beside a valid sibling must not hard-block the mode the
    // user is on: nothing is known about it, so it degrades to the constants.
    const caps = [{ ...capabilities[0], ...bad }, capabilities[1]];
    const state = studioCapabilityState(caps, baseSelection);

    expect(isModeKnownUnavailable(caps, "product_only")).toBe(false);
    expect(state.modeAvailable).toBe(true);
    expect(state.canSubmit).toBe(true);
    expect(enabledValues(state.aspectRatios)).toEqual(
      VIDEO_ASPECT_RATIOS.map((ratio) => ratio.value),
    );
    // The sibling entry still parses, so its own verdict stands.
    expect(isModeKnownUnavailable(caps, "ai_avatar")).toBe(true);
  });

  it("keeps the model row visible but inert for an unavailable mode", () => {
    const state = studioCapabilityState(
      [{ ...capabilities[0], available: false }],
      baseSelection,
    );

    expect(state.modelPickerVisible).toBe(true);
    expect(state.models.every((model) => !model.enabled)).toBe(true);
    // The user's pick still reads as chosen, but nothing is sent for a mode the
    // backend just said is off.
    expect(state.selectedModel).toBe("seedance-2.0");
    expect(state.repaired.videoModel).toBeNull();
    expect(state.canSubmit).toBe(false);
  });

  it("hides the model picker when no offered model has a label", () => {
    const state = studioCapabilityState(
      [
        {
          ...capabilities[0],
          models: [{ ...capabilities[0].models[0], key: "veo-9" }],
        },
      ],
      baseSelection,
    );

    expect(state.modelPickerVisible).toBe(false);
    // Nothing here Studio can stand behind, so there is no model to send: the
    // create payload drops the field and the backend picks its own default.
    expect(state.repaired.videoModel).toBeNull();
    expect(state.canSubmit).toBe(true);
  });

  it("sends no model when the offered set doesn't contain the selection", () => {
    for (const caps of [
      // Mode offers models, none of which Studio can label.
      [{ ...capabilities[0], models: [{ ...capabilities[0].models[0], key: "veo-9" }] }],
      // Mode offers no models at all.
      [{ ...capabilities[0], models: [] }],
      // Mode itself is unavailable, so no model is offered either.
      capabilities.map((entry) => ({ ...entry, available: false })),
    ]) {
      const { videoModel } = studioCapabilityState(caps, baseSelection).repaired;

      expect(videoModel).toBeNull();
      expect(videoModel).not.toBe("");
    }
  });

  it("falls back to today's constants when capabilities are unavailable", () => {
    const state = studioCapabilityState(undefined, {
      ...baseSelection,
      mode: "ai_avatar",
      resolution: "1080p",
      aspectRatio: "4:3",
      language: "es",
    });

    expect(state.modeAvailable).toBe(true);
    expect(state.modelPickerVisible).toBe(true);
    expect(enabledValues(state.models)).toEqual(["seedance-2.0"]);
    expect(state.models.map((model) => model.value)).toEqual(["seedance-2.0"]);
    expect(state.repaired).toMatchObject({
      videoModel: "seedance-2.0",
      resolution: "1080p",
      aspectRatio: "4:3",
      language: "es",
    });
    expect(state.canSubmit).toBe(true);
  });
});
