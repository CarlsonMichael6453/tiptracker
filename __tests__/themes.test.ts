import { parseAppearance, defaultAppearance } from "../src/ui/appearance";
import { COLOR_CHOICES, FONT_CHOICES, appliedFontFamily, fontChoice } from "../src/ui/colorThemes";
import { meetsBodyContrast } from "../src/ui/contrast";

describe("type and color themes", () => {
  test("a profile remembers the font and color theme", () => {
    const parsed = parseAppearance({ ...defaultAppearance(), font: "nunito", colorTheme: "mint" });
    expect(parsed.font).toBe("nunito");
    expect(parsed.colorTheme).toBe("mint");
    expect(parseAppearance({ style: "light" }).font).toBe("system");
    expect(parseAppearance({ style: "light" }).colorTheme).toBe("system");
    expect(parseAppearance({ font: "pacifico", colorTheme: "nope" }).font).toBe("system");
    expect(parseAppearance({ font: "pacifico", colorTheme: "nope" }).colorTheme).toBe("system");
  });

  test("every named theme keeps body text readable on the card and the background", () => {
    for (const theme of COLOR_CHOICES) {
      if (!theme.palette) continue;
      expect(meetsBodyContrast(theme.palette.text, theme.palette.card)).toBe(true);
      expect(meetsBodyContrast(theme.palette.text, theme.palette.bg)).toBe(true);
    }
  });

  test("fonts and color themes are each one list", () => {
    expect(FONT_CHOICES.map((font) => font.label)).toEqual([
      "System default",
      "Inter",
      "Roboto",
      "Source Serif 4",
      "IBM Plex Sans",
      "Nunito",
      "Baloo 2",
      "Fredoka",
      "Comic Neue",
    ]);
    expect(FONT_CHOICES.some((font) => font.id === ("pacifico" as string) || "group" in font)).toBe(false);
    expect(COLOR_CHOICES.map((theme) => theme.label)).toEqual([
      "System light/dark",
      "Classic Light",
      "Slate Dark",
      "Navy",
      "Forest",
      "Sunset",
      "Mint",
      "Grape",
      "Neon Night",
      "Bubblegum",
    ]);
    expect(fontChoice("pacifico").id).toBe("system");
  });

  test("the shared Text and TextInput components apply the chosen font", () => {
    expect(appliedFontFamily("nunito", { fontWeight: "700" })).toBe("Nunito_700Bold");
    expect(appliedFontFamily("nunito", { fontSize: 28 } as { fontWeight?: string })).toBe("Nunito_400Regular");
    expect(appliedFontFamily("inter", { fontWeight: 800 })).toBe("Inter_700Bold");
    expect(appliedFontFamily("roboto", {})).toBe("Roboto_400Regular");
    expect(appliedFontFamily("system", { fontWeight: "700" })).toBeUndefined();
    expect(appliedFontFamily("fredoka", { fontFamily: "system-ui", fontWeight: "700" })).toBe("system-ui");

    const textSource = readUtf8("src/ui/text.tsx");
    expect(textSource).toContain("export function Text");
    expect(textSource).toContain("export function TextInput");
    expect(textSource).toContain("appliedFontFamily");

    const offenders = sourceFiles(["app", "src"]).filter((file) => {
      const source = readUtf8(file);
      return importsNameFromReactNative(source, "Text") || importsNameFromReactNative(source, "TextInput");
    });
    expect(offenders.map((file) => file.split(/[/\\]/).join("/"))).toEqual(["src/ui/text.tsx"]);
  });
});

const fs = require("fs") as {
  readFileSync: (file: string, encoding: "utf8") => string;
  readdirSync: (dir: string) => string[];
  statSync: (file: string) => { isDirectory: () => boolean };
};
const path = require("path") as { join: (...parts: string[]) => string };

function readUtf8(file: string): string {
  return fs.readFileSync(file, "utf8");
}

function sourceFiles(roots: string[]): string[] {
  const out: string[] = [];
  for (const root of roots) {
    for (const name of fs.readdirSync(root)) {
      const file = path.join(root, name);
      if (fs.statSync(file).isDirectory()) out.push(...sourceFiles([file]));
      else if (file.endsWith(".tsx")) out.push(file);
    }
  }
  return out;
}

function importsNameFromReactNative(source: string, name: string): boolean {
  const match = source.match(/import\s*\{([\s\S]*?)\}\s*from\s*["']react-native["']/);
  if (!match) return false;
  const names = match[1].split(",").map((part) => part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]);
  return names.includes(name);
}
