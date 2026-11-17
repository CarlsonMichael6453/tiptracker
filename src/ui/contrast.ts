/** WCAG relative luminance and contrast. Body text needs 4.5:1. */

export const BODY_CONTRAST = 4.5;
export const INK = "#1C1E17";
export const PAPER = "#F4F1E6";

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((ch) => ch + ch)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normal = normalizeHex(hex);
  if (!normal) throw new Error(`Not a color: ${hex}`);
  return {
    r: Number.parseInt(normal.slice(1, 3), 16),
    g: Number.parseInt(normal.slice(3, 5), 16),
    b: Number.parseInt(normal.slice(5, 7), 16),
  };
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Near-black or near-white, whichever clears the background better. */
export function pickTextColor(background: string, dark = INK, light = PAPER): string {
  return contrastRatio(dark, background) >= contrastRatio(light, background) ? dark : light;
}

export function meetsBodyContrast(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= BODY_CONTRAST;
}

export function mixHex(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = Math.min(1, Math.max(0, amount));
  const channelAt = (start: number, end: number) => Math.round(start + (end - start) * t);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(channelAt(a.r, b.r))}${hex(channelAt(a.g, b.g))}${hex(channelAt(a.b, b.b))}`.toUpperCase();
}
