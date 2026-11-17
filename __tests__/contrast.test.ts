import {
  APPEARANCE_STYLES,
  COLOR_ROWS,
  COLOR_SWATCHES,
  DECORATIVE_STYLES,
  THEME_PRESETS,
  appearanceContentWidth,
  applyPreset,
  buildPalette,
  defaultAppearance,
  parseAppearance,
  rememberColor,
  shouldAnimateBackground,
  styleCanAnimate,
  themeGrid,
  withPair,
  withStyle,
} from "../src/ui/appearance";
import { patternMotion, webPaint } from "../src/ui/scenePatterns";
import { contrastRatio, meetsBodyContrast, normalizeHex, pickTextColor, relativeLuminance } from "../src/ui/contrast";
import { createMemoryWebDatabase } from "../src/db/webStore";
import * as web from "../src/repo/webRepository";

describe("contrast", () => {
  test("black on white is 21:1 and white on black is 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  test("normalizeHex accepts short and long forms", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex("24301a")).toBe("#24301A");
    expect(normalizeHex("nope")).toBeNull();
  });

  test("picks dark text on a light ground and light text on a dark ground", () => {
    expect(relativeLuminance("#FFFFFF")).toBeGreaterThan(relativeLuminance("#000000"));
    expect(pickTextColor("#F4EFE4")).toBe("#1C1E17");
    expect(pickTextColor("#12140F")).toBe("#F4F1E6");
    expect(meetsBodyContrast(pickTextColor("#F4EFE4"), "#F4EFE4")).toBe(true);
    expect(meetsBodyContrast(pickTextColor("#12140F"), "#12140F")).toBe(true);
  });

  test("body text on cards meets WCAG AA for every default style and for harsh colors", () => {
    for (const style of APPEARANCE_STYLES) {
      const palette = buildPalette(withStyle(defaultAppearance(), style));
      expect(meetsBodyContrast(palette.text, palette.card)).toBe(true);
    }
    const harsh = withPair(withStyle(defaultAppearance(), "twotone"), ["#000000", "#FFFFFF"]);
    const palette = buildPalette(harsh);
    expect(meetsBodyContrast(palette.text, palette.card)).toBe(true);
  });
});

describe("theme grid", () => {
  test("every pattern wraps onto the screen on a 320, 375, and 390 phone", () => {
    expect(APPEARANCE_STYLES).toHaveLength(14);
    for (const screen of [320, 375, 390]) {
      const row = appearanceContentWidth(screen);
      const grid = themeGrid(row);
      expect(grid.columns).toBe(3);
      expect(grid.tileWidth).toBeGreaterThanOrEqual(64);
      expect(grid.columns * grid.tileWidth + (grid.columns - 1) * grid.gap).toBeLessThanOrEqual(row);
      expect(Math.ceil(APPEARANCE_STYLES.length / grid.columns)).toBe(5);
    }
  });

  test("a wide window uses five columns and does not overflow", () => {
    const row = appearanceContentWidth(900);
    const grid = themeGrid(row);
    expect(grid.columns).toBe(5);
    expect(grid.columns * grid.tileWidth + (grid.columns - 1) * grid.gap).toBeLessThanOrEqual(row);
  });
});

describe("theme colors and presets", () => {
  test("the palette has 48 unique swatches grouped by hue", () => {
    expect(COLOR_SWATCHES).toHaveLength(48);
    expect(new Set(COLOR_SWATCHES).size).toBe(48);
    expect(COLOR_ROWS.map((row) => row.name)).toEqual([
      "Reds",
      "Oranges",
      "Yellows",
      "Greens",
      "Teals",
      "Blues",
      "Purples",
      "Pinks",
      "Neutrals",
      "Metallics",
    ]);
  });

  test("a preset sets the style and both colors, and recent colors stay newest-first", () => {
    const ocean = THEME_PRESETS.find((preset) => preset.label === "Ocean");
    expect(ocean).toBeTruthy();
    const next = applyPreset(defaultAppearance(), ocean!);
    expect(next.style).toBe("waves");
    expect(next.waves).toEqual(["#0F3334", "#7DCFC8"]);
    expect(next.recent.slice(0, 2)).toEqual(["#0F3334", "#7DCFC8"]);
    const again = rememberColor(rememberColor(next, "#ff0000"), "FF0000");
    expect(again.recent[0]).toBe("#FF0000");
    expect(again.recent.filter((color) => color === "#FF0000")).toHaveLength(1);
    expect(again.recent.length).toBeLessThanOrEqual(8);
  });

  test("saved patterns from older profiles still load, and every new pattern can animate slowly", () => {
    expect(parseAppearance({ style: "stripes", stripes: ["#abcdef", "#123456"], recent: ["nope", "#fff", "#fff"] }).stripes).toEqual([
      "#ABCDEF",
      "#123456",
    ]);
    expect(parseAppearance({ style: "stripes", recent: ["#fff", "#fff"] }).recent).toEqual(["#FFFFFF"]);
    expect(styleCanAnimate("light")).toBe(false);
    for (const style of DECORATIVE_STYLES) {
      expect(styleCanAnimate(style)).toBe(true);
      const motion = patternMotion(style);
      expect(motion).toBeTruthy();
      expect(Number(motion!.duration.replace("s", ""))).toBeGreaterThanOrEqual(16);
    }
    const paint = webPaint("stripes", "#112233", "#ABCDEF");
    expect(`${paint.backgroundColor} ${paint.backgroundImage}`).toContain("#112233");
    expect(paint.backgroundImage).toContain("#ABCDEF");
    const waves = webPaint("waves", "#112233", "#ABCDEF");
    expect(waves.backgroundImage).toContain("%23112233");
    expect(waves.backgroundImage).toContain("%23ABCDEF");
    expect(patternMotion("light")).toBeNull();
    expect(patternMotion("dark")).toBeNull();
  });
});

describe("appearance storage", () => {
  test("missing appearance data falls back to Light with the built-in colors", () => {
    const parsed = parseAppearance(null);
    expect(parsed.style).toBe("light");
    expect(parsed.animateBackground).toBe(false);
    expect(parsed.polka[1]).toBe("#24301A");
    expect(parseAppearance({ style: "polka", polka: ["#fff", "nope"] }).polka[1]).toBe("#24301A");
    expect(parseAppearance({ style: "nope" }).style).toBe("light");
  });

  test("animate background stays off unless this profile turned it on, and never runs for Light or Dark", () => {
    expect(parseAppearance({ style: "gradient", animateBackground: true }).animateBackground).toBe(true);
    expect(parseAppearance({ style: "polka" }).animateBackground).toBe(false);
    expect(styleCanAnimate("light")).toBe(false);
    expect(styleCanAnimate("dark")).toBe(false);
    expect(styleCanAnimate("polka")).toBe(true);
    const ready = { enabled: true, reduceMotion: false, appVisible: true };
    expect(shouldAnimateBackground({ style: "gradient", ...ready })).toBe(true);
    expect(shouldAnimateBackground({ style: "polka", ...ready, enabled: false })).toBe(false);
    expect(shouldAnimateBackground({ style: "twotone", ...ready, reduceMotion: true })).toBe(false);
    expect(shouldAnimateBackground({ style: "gradient", ...ready, appVisible: false })).toBe(false);
    expect(shouldAnimateBackground({ style: "light", ...ready })).toBe(false);
    expect(shouldAnimateBackground({ style: "dark", ...ready })).toBe(false);
  });

  test("each profile keeps its own scheme across a reload", async () => {
    const db = createMemoryWebDatabase();
    const first = await web.createProfile(db, {
      name: "Olive Garden",
      wageCents: 1650,
      weekStartsOn: 3,
      usualRoleName: "Server",
    });
    const second = await web.createProfile(db, {
      name: "The bar",
      wageCents: 1800,
      weekStartsOn: 3,
      usualRoleName: "Bartender",
    });
    const polka = withPair(withStyle(defaultAppearance(), "polka"), ["#F4EFE4", "#6B2D3C"]);
    const gradient = withStyle(defaultAppearance(), "gradient");
    await web.updateProfile(db, first, { appearance: { ...polka, animateBackground: true } });
    await web.updateProfile(db, second, { appearance: gradient });
    const stored = await db.read((state) => state);
    const reloaded = createMemoryWebDatabase(structuredClone(stored));
    expect((await web.getProfile(reloaded, first))?.appearance).toEqual({ ...polka, animateBackground: true });
    expect((await web.getProfile(reloaded, second))?.appearance.animateBackground).toBe(false);
    expect((await web.getProfile(reloaded, second))?.appearance.style).toBe("gradient");
    expect((await web.getProfile(reloaded, second))?.appearance.gradient).toEqual(defaultAppearance().gradient);
  });
});
