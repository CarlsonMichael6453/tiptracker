import type { AppearanceSettings } from "../domain/types";
import { defaultAppearance } from "../ui/appearance";

/** One pass, about 1.1s each. Nothing here is saved. */
export const APPEARANCE_TOUR_MS = 1100;

export const APPEARANCE_TOUR_PAIRS = [
  { colorTheme: "sunset", font: "fredoka", themeLabel: "Sunset", fontLabel: "Fredoka" },
  { colorTheme: "mint", font: "nunito", themeLabel: "Mint", fontLabel: "Nunito" },
  { colorTheme: "neon", font: "comic-neue", themeLabel: "Neon Night", fontLabel: "Comic Neue" },
  { colorTheme: "bubblegum", font: "source-serif", themeLabel: "Bubblegum", fontLabel: "Source Serif 4" },
] as const;

export const APPEARANCE_STEP_COPY = {
  title: "Settings",
  body: "This is Settings, where you can change the layout, colors, fonts, and more.",
};

export const REPLAY_TOUR_LABEL = "Replay tour";

/** Window Y, in points, where the fonts and colors block should sit during the last tour step. */
export const APPEARANCE_TOUR_FOCUS_Y = 72;

/**
 * Which preview is on screen. Null means the pass is over, or motion is reduced,
 * so the caller shows the real appearance again.
 */
export function appearanceTourIndex(elapsedMs: number, reduceMotion: boolean): number | null {
  if (reduceMotion) return null;
  if (elapsedMs < 0) return 0;
  const index = Math.floor(elapsedMs / APPEARANCE_TOUR_MS);
  if (index >= APPEARANCE_TOUR_PAIRS.length) return null;
  return index;
}

/** A temporary look. Callers must not write this to the profile. */
export function appearanceTourLook(index: number): AppearanceSettings {
  const pair = APPEARANCE_TOUR_PAIRS[index] ?? APPEARANCE_TOUR_PAIRS[0];
  return { ...defaultAppearance(), colorTheme: pair.colorTheme, font: pair.font, animateBackground: false };
}

/** Scroll animation is off when the user asked for less motion. */
export function appearanceTourScrollAnimated(reduceMotion: boolean): boolean {
  return !reduceMotion;
}

/** New content offset that places a measured window Y at the desired window Y. */
export function scrollYToWindowTarget(currentScrollY: number, measuredWindowY: number, targetWindowY: number): number {
  return Math.max(0, Math.round(currentScrollY + measuredWindowY - targetWindowY));
}

export type TourRect = { x: number; y: number; width: number; height: number };

/** Keep a spotlight hole on screen, even when the target is taller than the window. */
export function clampTourRect(
  rect: TourRect,
  screenW: number,
  screenH: number,
  pad = 8,
): { x: number; y: number; w: number; h: number } | null {
  const x = Math.max(0, rect.x - pad);
  const y = Math.max(0, rect.y - pad);
  const right = Math.min(screenW, rect.x + rect.width + pad);
  const bottom = Math.min(screenH, rect.y + rect.height + pad);
  const w = right - x;
  const h = bottom - y;
  if (w <= 1 || h <= 1) return null;
  return { x, y, w, h };
}
