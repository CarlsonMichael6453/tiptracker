import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Platform, View } from "react-native";
import { useApp } from "../state/AppState";
import { relativeLuminance } from "./contrast";
import { buildPalette, colorsFor, defaultAppearance, isDecorative, prefersDarkUi, type AppearanceSettings } from "./appearance";
import { colorChoice, fontChoice } from "./colorThemes";
import { useAppFonts } from "./loadFonts";
import { SceneBackground } from "./SceneBackground";
import type { Palette } from "./themePalette";

type ThemeValue = {
  palette: Palette;
  scheme: "light" | "dark";
  decorative: boolean;
  appearance: AppearanceSettings;
  /** Regular face for navigation chrome. Undefined means the system font. */
  fontFamily?: string;
  /** Bold face for tab labels and screen titles. */
  boldFontFamily?: string;
};

const ThemeContext = createContext<ThemeValue>({
  palette: buildPalette(defaultAppearance()),
  scheme: "light",
  decorative: false,
  appearance: defaultAppearance(),
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { activeProfile } = useApp();
  useAppFonts();
  const appearance = activeProfile?.appearance ?? defaultAppearance();
  const named = colorChoice(appearance.colorTheme);
  const fonts = fontChoice(appearance.font);
  const palette = named.palette ?? buildPalette(appearance);
  const scheme = named.palette ? (relativeLuminance(palette.bg) < 0.4 ? "dark" : "light") : prefersDarkUi(appearance) ? "dark" : "light";
  const decorative = !named.palette && isDecorative(appearance.style);
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      let node = document.getElementById("tiptracker-font");
      if (!node) {
        node = document.createElement("style");
        node.id = "tiptracker-font";
        document.head.appendChild(node);
      }
      const family = fonts.body ? `${fonts.body}, sans-serif` : "";
      node.textContent = family
        ? `#root, #root button, #root input, #root textarea, #root [role="tab"] { font-family: ${family}; }`
        : "";
    }
  }, [fonts.body]);
  return (
    <ThemeContext.Provider value={{ palette, scheme, decorative, appearance, fontFamily: fonts.body, boldFontFamily: fonts.bold }}>
      <View style={{ flex: 1, backgroundColor: named.palette ? palette.bg : colorsFor(appearance)[0] }}>
        {decorative ? <SceneBackground settings={appearance} /> : null}
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export type { Palette };
