import type { AppearanceSettings } from "../domain/types";
import { defaultAppearance } from "../ui/appearance";

/** One pass, about 0.6s each. Nothing here is saved. */
export const APPEARANCE_TOUR_MS = 600;

export const APPEARANCE_TOUR_PAIRS = [
  { colorTheme: "sunset", font: "fredoka", themeLabel: "Sunset", fontLabel: "Fredoka" },
  { colorTheme: "mint", font: "nunito", themeLabel: "Mint", fontLabel: "Nunito" },
  { colorTheme: "neon", font: "comic-neue", themeLabel: "Neon Night", fontLabel: "Comic Neue" },
  { colorTheme: "bubblegum", font: "source-serif", themeLabel: "Bubblegum", fontLabel: "Source Serif 4" },
] as const;

export const APPEARANCE_STEP_COPY = {
  title: "Appearance",
  body: "Here's how fonts and colors can look. Pick yours anytime in Settings.",
};

export const REPLAY_TOUR_LABEL = "Replay tour";

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
