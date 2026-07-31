import { describe, expect, it } from "vitest";
import { MIN_MENU_HEIGHT, menuPlacement, menuShiftX } from "./menu-placement";

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

  it("keeps a usable scrollable height when no side has room", () => {
    expect(
      menuPlacement({
        triggerTop: 0,
        triggerBottom: 36,
        viewportHeight: 30,
        menuHeight: 332,
      }).maxHeight,
    ).toBe(MIN_MENU_HEIGHT);
  });
});

describe("menuShiftX", () => {
  it("leaves a menu alone when its left edge already clears the viewport edge", () => {
    // AppShell: trigger at the right edge of a 320px viewport.
    expect(menuShiftX({ triggerRight: 312, menuWidth: 176 })).toBe(0);
  });

  it("shifts a left-sliver trigger's menu back on-screen (the 320px marketing header)", () => {
    // measured live pre-fix: menu rendered at left -37.7
    expect(menuShiftX({ triggerRight: 138.3, menuWidth: 176 })).toBeCloseTo(45.7);
  });

  it("never shifts left", () => {
    expect(menuShiftX({ triggerRight: 500, menuWidth: 44 })).toBe(0);
  });
});
