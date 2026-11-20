import type { AppearanceSettings, AppearanceStyle, ColorPair, DecorativeStyle } from "../domain/types";
import { COLOR_THEME_IDS, FONT_IDS } from "./colorThemes";
import type { Palette } from "./themePalette";
import { darkPalette, lightPalette } from "./themePalette";
import { mixHex, normalizeHex, pickTextColor, relativeLuminance } from "./contrast";

export const APPEARANCE_STYLES = [
  "light",
  "dark",
  "polka",
  "gradient",
  "twotone",
  "stripes",
  "waves",
  "checker",
  "confetti",
  "radial",
  "stars",
  "bokeh",
  "plaid",
  "mesh",
] as const satisfies readonly AppearanceStyle[];

export const DECORATIVE_STYLES = [
  "polka",
  "gradient",
  "twotone",
  "stripes",
  "waves",
  "checker",
  "confetti",
  "radial",
  "stars",
  "bokeh",
  "plaid",
  "mesh",
] as const satisfies readonly DecorativeStyle[];

export type { AppearanceSettings, AppearanceStyle, ColorPair, DecorativeStyle };

export const STYLE_LABELS: Record<AppearanceStyle, string> = {
  light: "Light",
  dark: "Dark",
  polka: "Polka Dot",
  gradient: "Gradient",
  twotone: "Two-Tone",
  stripes: "Stripes",
  waves: "Waves",
  checker: "Checkerboard",
  confetti: "Confetti",
  radial: "Radial Glow",
  stars: "Stars",
  bokeh: "Bokeh",
  plaid: "Plaid",
  mesh: "Aurora",
};

const COLOR_LABELS: Record<DecorativeStyle, [string, string]> = {
  polka: ["Base", "Dots"],
  gradient: ["Start", "End"],
  twotone: ["One half", "Other half"],
  stripes: ["Stripe", "Gap"],
  waves: ["Crest", "Trough"],
  checker: ["One square", "Other square"],
  confetti: ["Ground", "Flecks"],
  radial: ["Edge", "Glow"],
  stars: ["Night", "Stars"],
  bokeh: ["Ground", "Orbs"],
  plaid: ["Across", "Down"],
  mesh: ["Deep", "Bright"],
};

const THEME_GRID_GAP = 8;
const RECENT_LIMIT = 8;

/** Inner width of the Appearance card: screen padding, card padding, and the card border. */
export function appearanceContentWidth(screenWidth: number): number {
  return screenWidth - 20 * 2 - 16 * 2 - 2;
}

/**
 * Tile size for the theme choices. Phones from 320px wide get three columns,
 * so every pattern wraps onto the screen instead of hiding in a sideways scroll.
 * A wide window uses five columns and still wraps.
 */
export function themeGrid(rowWidth: number): { columns: number; tileWidth: number; gap: number } {
  const gap = THEME_GRID_GAP;
  if (!(rowWidth > 0)) return { columns: 3, tileWidth: 0, gap };
  const five = Math.floor((rowWidth - gap * 4) / 5);
  if (five >= 104) return { columns: 5, tileWidth: five, gap };
  const three = Math.floor((rowWidth - gap * 2) / 3);
  if (three >= 64) return { columns: 3, tileWidth: three, gap };
  const two = Math.floor((rowWidth - gap) / 2);
  return { columns: 2, tileWidth: Math.max(two, 0), gap };
}

export const COLOR_ROWS: { name: string; colors: string[] }[] = [
  { name: "Reds", colors: ["#6E1A22", "#A82832", "#D4534A", "#E8887C", "#F6C9C2"] },
  { name: "Oranges", colors: ["#7A3410", "#C45A16", "#E07A2F", "#F0A35A", "#F8D2A8"] },
  { name: "Yellows", colors: ["#6E5810", "#C4A024", "#E2C14A", "#F0DE86", "#F8F1C4"] },
  { name: "Greens", colors: ["#1A3320", "#3E5628", "#5E7A3C", "#8FA36A", "#D5E3C6"] },
  { name: "Teals", colors: ["#0F3334", "#1A6A68", "#2E9A94", "#7DCFC8", "#D4F1EE"] },
  { name: "Blues", colors: ["#14233F", "#2A4A78", "#4C6A92", "#8AABCC", "#D5E4F2"] },
  { name: "Purples", colors: ["#2C1844", "#5A3488", "#7E58A8", "#B396CC", "#E6D8F2"] },
  { name: "Pinks", colors: ["#4E1C30", "#A34566", "#D46B88", "#E8A8B8", "#F8DEE6"] },
  { name: "Neutrals", colors: ["#1C1E17", "#5C5E54", "#A7A89C", "#F7F3EA"] },
  { name: "Metallics", colors: ["#8A6A32", "#C4A35A", "#E2B15A", "#C5CCD6"] },
];

export const COLOR_SWATCHES = COLOR_ROWS.flatMap((row) => row.colors);

const DEFAULT_PAIRS: Record<DecorativeStyle, ColorPair> = {
  polka: ["#F4EFE4", "#24301A"],
  gradient: ["#1B2420", "#D4B483"],
  twotone: ["#24301A", "#F3E6C8"],
  stripes: ["#F4EFE4", "#24301A"],
  waves: ["#14585A", "#E7D7C1"],
  checker: ["#F3E6C8", "#3A2A22"],
  confetti: ["#1A2744", "#E2B15A"],
  radial: ["#1B2420", "#E2B15A"],
  stars: ["#12140F", "#F2DE7A"],
  bokeh: ["#1A2744", "#E08AA0"],
  plaid: ["#F4EFE4", "#6B2D3C"],
  mesh: ["#14301A", "#D4B483"],
};

export type ThemePreset = {
  id: string;
  label: string;
  style: DecorativeStyle;
  pair: ColorPair;
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "sunset", label: "Sunset", style: "gradient", pair: ["#C73E3A", "#E2B15A"] },
  { id: "ocean", label: "Ocean", style: "waves", pair: ["#0F3334", "#7DCFC8"] },
  { id: "mint", label: "Mint", style: "mesh", pair: ["#E7F4EF", "#1A6A68"] },
  { id: "neon", label: "Neon Night", style: "stars", pair: ["#12140F", "#2E9A94"] },
  { id: "espresso", label: "Espresso", style: "stripes", pair: ["#3A2A22", "#C4A35A"] },
  { id: "rose", label: "Rosé", style: "bokeh", pair: ["#F8DEE6", "#A34566"] },
  { id: "forest", label: "Forest", style: "polka", pair: ["#1A3320", "#8FA36A"] },
  { id: "midnight", label: "Midnight Gold", style: "radial", pair: ["#12140F", "#E2B15A"] },
];

export function defaultAppearance(): AppearanceSettings {
  return {
    style: "light",
    ...DEFAULT_PAIRS,
    recent: [],
    animateBackground: false,
    font: "system",
    colorTheme: "system",
  };
}

export function isDecorative(style: AppearanceStyle): style is DecorativeStyle {
  return style !== "light" && style !== "dark";
}

/** Light and Dark have nothing to drift. Every other pattern can. */
export function styleCanAnimate(style: AppearanceStyle): boolean {
  return isDecorative(style);
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
  if (!isDecorative(style)) return null;
  return COLOR_LABELS[style];
}

export function colorsFor(settings: AppearanceSettings): ColorPair {
  if (settings.style === "dark") return ["#12140F", "#12140F"];
  if (!isDecorative(settings.style)) return ["#F3EEE4", "#F3EEE4"];
  return settings[settings.style];
}

export function parseAppearance(value: unknown): AppearanceSettings {
  const base = defaultAppearance();
  if (!value || typeof value !== "object") return base;
  const raw = value as Record<string, unknown>;
  const style = APPEARANCE_STYLES.includes(raw.style as AppearanceStyle) ? (raw.style as AppearanceStyle) : "light";
  const pairs = {} as Record<DecorativeStyle, ColorPair>;
  for (const key of DECORATIVE_STYLES) pairs[key] = parsePair(raw[key], base[key]);
  return {
    style,
    ...pairs,
    recent: parseRecent(raw.recent),
    animateBackground: raw.animateBackground === true,
    font: typeof raw.font === "string" && (FONT_IDS as readonly string[]).includes(raw.font) ? raw.font : "system",
    colorTheme: typeof raw.colorTheme === "string" && (COLOR_THEME_IDS as readonly string[]).includes(raw.colorTheme) ? raw.colorTheme : "system",
  };
}

function parsePair(value: unknown, fallback: ColorPair): ColorPair {
  if (!Array.isArray(value) || value.length < 2) return fallback;
  return [normalizeHex(String(value[0])) ?? fallback[0], normalizeHex(String(value[1])) ?? fallback[1]];
}

function parseRecent(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const hex = normalizeHex(String(item));
    if (!hex || out.includes(hex)) continue;
    out.push(hex);
    if (out.length === RECENT_LIMIT) break;
  }
  return out;
}

export function withStyle(settings: AppearanceSettings, style: AppearanceStyle): AppearanceSettings {
  return { ...settings, style };
}

export function withPair(settings: AppearanceSettings, pair: ColorPair): AppearanceSettings {
  if (!isDecorative(settings.style)) return settings;
  return { ...settings, [settings.style]: pair };
}

export function rememberColor(settings: AppearanceSettings, color: string): AppearanceSettings {
  const hex = normalizeHex(color);
  if (!hex) return settings;
  const recent = [hex, ...settings.recent.filter((item) => item.toUpperCase() !== hex.toUpperCase())].slice(0, RECENT_LIMIT);
  return { ...settings, recent };
}

export function applyPreset(settings: AppearanceSettings, preset: ThemePreset): AppearanceSettings {
  return rememberColor(rememberColor(withPair(withStyle(settings, preset.style), preset.pair), preset.pair[1]), preset.pair[0]);
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
