import { parseAppearance, defaultAppearance } from "../src/ui/appearance";
import { COLOR_CHOICES, FONT_CHOICES, fontChoice } from "../src/ui/colorThemes";
import { meetsBodyContrast } from "../src/ui/contrast";

describe("type and color themes", () => {
  test("a profile remembers the font and color theme", () => {
    const parsed = parseAppearance({ ...defaultAppearance(), font: "nunito", colorTheme: "mint" });
    expect(parsed.font).toBe("nunito");
    expect(parsed.colorTheme).toBe("mint");
    expect(parseAppearance({ style: "light" }).font).toBe("system");
    expect(parseAppearance({ style: "light" }).colorTheme).toBe("system");
  });

  test("every named theme keeps body text readable on the card and the background", () => {
    for (const theme of COLOR_CHOICES) {
      if (!theme.palette) continue;
      expect(meetsBodyContrast(theme.palette.text, theme.palette.card)).toBe(true);
      expect(meetsBodyContrast(theme.palette.text, theme.palette.bg)).toBe(true);
    }
  });

  test("Pacifico is headings only", () => {
    const pacifico = fontChoice("pacifico");
    expect(pacifico.heading).toBe("Pacifico_400Regular");
    expect(pacifico.body).not.toBe("Pacifico_400Regular");
    expect(FONT_CHOICES.filter((font) => font.group === "professional").map((font) => font.label)).toContain("Inter");
    expect(FONT_CHOICES.filter((font) => font.group === "fun").map((font) => font.label)).toContain("Pacifico");
  });
});
