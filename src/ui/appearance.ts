import type { AppearanceSettings, AppearanceStyle, ColorPair } from "../domain/types";
import type { Palette } from "./themePalette";
import { darkPalette, lightPalette } from "./themePalette";
import { mixHex, normalizeHex, pickTextColor, relativeLuminance } from "./contrast";

export const APPEARANCE_STYLES = ["light", "dark", "polka", "gradient", "twotone"] as const satisfies readonly AppearanceStyle[];
export type { AppearanceSettings, AppearanceStyle, ColorPair };

export const STYLE_LABELS: Record<AppearanceStyle, string> = {
  light: "Light",
  dark: "Dark",
  polka: "Polka Dot",
  gradient: "Gradient",
  twotone: "Two-Tone",
};

export const COLOR_SWATCHES = [
  "#1C1E17",
  "#24301A",
  "#3E5628",
  "#8FA36A",
  "#E7D7C1",
  "#F4EFE4",
  "#FFFCF7",
  "#E2B15A",
  "#8A5410",
  "#C46B4A",
  "#6B2D3C",
  "#1A2744",
  "#4C6A92",
  "#F7F1E4",
  "#5C4033",
  "#D4B483",
];

export function defaultAppearance(): AppearanceSettings {
  return {
    style: "light",
    polka: ["#F4EFE4", "#24301A"],
    gradient: ["#1B2420", "#D4B483"],
    twotone: ["#24301A", "#F3E6C8"],
    animateBackground: false,
  };
}

/** Light and Dark have nothing to drift. */
export function styleCanAnimate(style: AppearanceStyle): boolean {
  return style === "polka" || style === "gradient" || style === "twotone";
}

/**
 * Animation runs only when this profile asked for it, the style has a moving
 * backdrop, the system is not asking for less motion, and the app is on screen.
 */
export function shouldAnimateBackground(args: {
  style: AppearanceStyle;
  enabled: boolean;
  reduceMotion: boolean;
  appVisible: boolean;
}): boolean {
  return args.enabled && args.appVisible && !args.reduceMotion && styleCanAnimate(args.style);
}

export function colorLabels(style: AppearanceStyle): [string, string] | null {
  if (style === "polka") return ["Base", "Dots"];
  if (style === "gradient") return ["Start", "End"];
  if (style === "twotone") return ["One half", "Other half"];
  return null;
}

export function colorsFor(settings: AppearanceSettings): ColorPair {
  if (settings.style === "polka") return settings.polka;
  if (settings.style === "gradient") return settings.gradient;
  if (settings.style === "twotone") return settings.twotone;
  return settings.style === "dark" ? ["#12140F", "#12140F"] : ["#F3EEE4", "#F3EEE4"];
}

export function parseAppearance(value: unknown): AppearanceSettings {
  const base = defaultAppearance();
  if (!value || typeof value !== "object") return base;
  const raw = value as {
    style?: unknown;
    polka?: unknown;
    gradient?: unknown;
    twotone?: unknown;
    animateBackground?: unknown;
  };
  const style = APPEARANCE_STYLES.includes(raw.style as AppearanceStyle) ? (raw.style as AppearanceStyle) : "light";
  return {
    style,
    polka: parsePair(raw.polka, base.polka),
    gradient: parsePair(raw.gradient, base.gradient),
    twotone: parsePair(raw.twotone, base.twotone),
    animateBackground: raw.animateBackground === true,
  };
}

function parsePair(value: unknown, fallback: ColorPair): ColorPair {
  if (!Array.isArray(value) || value.length < 2) return fallback;
  return [normalizeHex(String(value[0])) ?? fallback[0], normalizeHex(String(value[1])) ?? fallback[1]];
}

export function withStyle(settings: AppearanceSettings, style: AppearanceStyle): AppearanceSettings {
  return { ...settings, style };
}

export function withPair(settings: AppearanceSettings, pair: ColorPair): AppearanceSettings {
  if (settings.style === "polka") return { ...settings, polka: pair };
  if (settings.style === "gradient") return { ...settings, gradient: pair };
  if (settings.style === "twotone") return { ...settings, twotone: pair };
  return settings;
}

/** Dark cards when the backdrop is mostly dark, light cards otherwise. */
export function prefersDarkUi(settings: AppearanceSettings): boolean {
  if (settings.style === "dark") return true;
  if (settings.style === "light") return false;
  const [a, b] = colorsFor(settings);
  return (relativeLuminance(a) + relativeLuminance(b)) / 2 < 0.42;
}

export function buildPalette(settings: AppearanceSettings): Palette {
  const darkUi = prefersDarkUi(settings);
  const base = darkUi ? darkPalette() : lightPalette();
  const text = pickTextColor(base.card);
  const muted = pickTextColor(base.card) === text ? (darkUi ? "#C2BEB0" : "#5A5E50") : text;
  return { ...base, text, muted };
}

export function gradientStops(from: string, to: string, count = 18): string[] {
  if (count < 2) return [from, to];
  return Array.from({ length: count }, (_, index) => mixHex(from, to, index / (count - 1)));
}
