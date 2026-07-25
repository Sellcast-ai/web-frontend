import { describe, expect, it } from "vitest";
import { menuPlacement } from "./menu-placement";

const header = { triggerTop: 24, triggerBottom: 60, menuHeight: 332 };

describe("menuPlacement", () => {
  it("opens downward when the menu fits below", () => {
    expect(menuPlacement({ ...header, viewportHeight: 900 })).toEqual({
      up: false,
      maxHeight: 824,
    });
  });

  it("stays downward but capped when a sticky-header menu overflows a short viewport", () => {
    // Landscape phone: not enough room either way, below is still the roomier
    // side, so the menu scrolls rather than running off the fold.
    const { up, maxHeight } = menuPlacement({ ...header, viewportHeight: 375 });
    expect(up).toBe(false);
    expect(maxHeight).toBe(299);
  });

  it("flips up when the menu misses below and there is more room above", () => {
    expect(
      menuPlacement({
        triggerTop: 700,
        triggerBottom: 736,
        viewportHeight: 800,
        menuHeight: 332,
      }),
    ).toEqual({ up: true, maxHeight: 684 });
  });

  it("never reports negative space", () => {
    expect(
      menuPlacement({
        triggerTop: 0,
        triggerBottom: 36,
        viewportHeight: 30,
        menuHeight: 332,
      }).maxHeight,
    ).toBe(0);
  });
});
