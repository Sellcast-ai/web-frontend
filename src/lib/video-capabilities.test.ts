import { describe, expect, it } from "vitest";
import {
  repairMode,
  studioCapabilityState,
  type StudioCapabilitySelection,
} from "./video-capabilities";
import type { VideoCapabilities } from "./api/types";

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
    expect(enabledValues(state.models)).toEqual([
      "seedance-2.0",
      "seedance-2.0-fast",
    ]);
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

    const seedanceOnly = studioCapabilityState(
      [{ ...capabilities[0], models: [capabilities[0].models[0]] }],
      baseSelection,
    );
    expect(
      seedanceOnly.models.find((model) => model.value === "seedance-2.0-fast")
        ?.enabled,
    ).toBe(false);
  });

  it("uses the selected model's resolution ceiling", () => {
    const state = studioCapabilityState(capabilities, {
      ...baseSelection,
      videoModel: "seedance-2.0-fast",
      resolution: "1080p",
    });

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

    expect(state.modeKnownUnavailable).toBe(true);
    expect(state.canSubmit).toBe(false);
    expect(repairMode(capabilities, "ai_avatar")).toBe("product_only");
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
      mode: "ai_avatar",
      videoModel: "seedance-2.0",
      resolution: "1080p",
      aspectRatio: "4:3",
      language: "es",
    });
    expect(state.canSubmit).toBe(true);
  });
});
