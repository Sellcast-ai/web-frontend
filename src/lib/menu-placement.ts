// Floor for a capped menu: a couple of scrollable rows.
export const MIN_MENU_HEIGHT = 96;

// Must match the menu's `mt-2`/`mb-2` offset from its trigger.
const GAP = 8;
const VIEWPORT_EDGE = 8;

/** Placement for a popover anchored under (or over) its trigger.
 *
 * Opens downward by default and flips up only when the menu's real height does
 * not fit below and there is more room above. `maxHeight` is the space actually
 * available on the chosen side, so a menu taller than the viewport scrolls
 * instead of spilling past the fold where nothing can reach it. It never drops
 * below `MIN_MENU_HEIGHT`, so a very short viewport degrades to a couple of
 * scrollable rows rather than a collapsed, invisible menu. */
export function menuPlacement({
  triggerTop,
  triggerBottom,
  viewportHeight,
  menuHeight,
}: {
  triggerTop: number;
  triggerBottom: number;
  viewportHeight: number;
  menuHeight: number;
}): { up: boolean; maxHeight: number } {
  const below = viewportHeight - triggerBottom - GAP - VIEWPORT_EDGE;
  const above = triggerTop - GAP - VIEWPORT_EDGE;
  const up = menuHeight > below && above > below;
  return { up, maxHeight: Math.max(MIN_MENU_HEIGHT, up ? above : below) };
}

/** Pixels a right-edge-anchored menu must shift right so its left edge clears
 * `VIEWPORT_EDGE`. Menus anchor to the trigger's right edge, so only left-edge
 * overflow is possible (a trigger sitting in the viewport's left sliver, e.g.
 * the 320px marketing header). */
export function menuShiftX({
  triggerRight,
  menuWidth,
}: {
  triggerRight: number;
  menuWidth: number;
}): number {
  return Math.max(0, VIEWPORT_EDGE - (triggerRight - menuWidth));
}
