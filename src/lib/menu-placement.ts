/** Placement for a popover anchored under (or over) its trigger.
 *
 * Opens downward by default and flips up only when the menu's real height does
 * not fit below and there is more room above. `maxHeight` is the space actually
 * available on the chosen side, so a menu taller than the viewport scrolls
 * instead of spilling past the fold where nothing can reach it. It never drops
 * below `MIN_MENU_HEIGHT`, so a very short viewport degrades to a couple of
 * scrollable rows rather than a collapsed, invisible menu. */
export const MIN_MENU_HEIGHT = 96;

export function menuPlacement({
  triggerTop,
  triggerBottom,
  viewportHeight,
  menuHeight,
  gap = 8,
  edge = 8,
}: {
  triggerTop: number;
  triggerBottom: number;
  viewportHeight: number;
  menuHeight: number;
  gap?: number;
  edge?: number;
}): { up: boolean; maxHeight: number } {
  const below = viewportHeight - triggerBottom - gap - edge;
  const above = triggerTop - gap - edge;
  const up = menuHeight > below && above > below;
  return { up, maxHeight: Math.max(MIN_MENU_HEIGHT, up ? above : below) };
}
