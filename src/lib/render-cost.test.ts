import { describe, expect, it } from "vitest";
import { VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS, VIDEO_RESOLUTIONS } from "./api/types";
import { renderCostCredits } from "./render-cost";

describe("renderCostCredits", () => {
  it("prices the rate the pricing copy is anchored to", () => {
    // "about 3/10/25 videos" on the pricing page only holds if a 20s Seedance
    // 2.0 720p render is 300 credits.
    expect(
      renderCostCredits({
        model: "seedance-2.0",
        resolution: "720p",
        aspectRatio: "9:16",
        durationSeconds: 20,
      }),
    ).toBe(300);
  });

  it("scales with duration and resolution", () => {
    const at = (resolution: "480p" | "720p" | "1080p", durationSeconds: number) =>
      renderCostCredits({
        model: "seedance-2.0",
        resolution,
        aspectRatio: "9:16",
        durationSeconds,
      });
    expect(at("480p", 10)).toBe(70);
    expect(at("720p", 10)).toBe(150);
    expect(at("1080p", 10)).toBe(370);
    expect(at("720p", 30)).toBe(450);
  });

  it("charges the same for a frame turned on its side", () => {
    const portrait = renderCostCredits({
      model: "seedance-2.0",
      resolution: "720p",
      aspectRatio: "9:16",
      durationSeconds: 15,
    });
    const landscape = renderCostCredits({
      model: "seedance-2.0",
      resolution: "720p",
      aspectRatio: "16:9",
      durationSeconds: 15,
    });
    expect(portrait).toBe(landscape);
    expect(
      renderCostCredits({
        model: "seedance-2.0",
        resolution: "720p",
        aspectRatio: "3:4",
        durationSeconds: 15,
      }),
    ).toBe(
      renderCostCredits({
        model: "seedance-2.0",
        resolution: "720p",
        aspectRatio: "4:3",
        durationSeconds: 15,
      }),
    );
  });

  it("quotes a positive whole cost for every combination the picker offers", () => {
    for (const model of ["seedance-2.0"] as const) {
      for (const resolution of VIDEO_RESOLUTIONS) {
        for (const aspectRatio of VIDEO_ASPECT_RATIOS) {
          for (const durationSeconds of VIDEO_DURATIONS) {
            const cost = renderCostCredits({
              model,
              resolution: resolution.value,
              aspectRatio: aspectRatio.value,
              durationSeconds,
            });
            expect(Number.isInteger(cost)).toBe(true);
            expect(cost).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
