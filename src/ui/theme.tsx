import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Platform, Text, TextInput, View } from "react-native";
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
  headingFont?: string;
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
    const style = fonts.body ? { fontFamily: fonts.body } : undefined;
    const text = Text as unknown as { defaultProps?: { style?: object } };
    const input = TextInput as unknown as { defaultProps?: { style?: object } };
    text.defaultProps = { ...text.defaultProps, style };
    input.defaultProps = { ...input.defaultProps, style };
    if (Platform.OS === "web" && typeof document !== "undefined") {
      let node = document.getElementById("tiptracker-font");
      if (!node) {
        node = document.createElement("style");
        node.id = "tiptracker-font";
        document.head.appendChild(node);
      }
      node.textContent = fonts.body ? `#root, #root input, #root textarea { font-family: ${fonts.body}, sans-serif; }` : "";
    }
  }, [fonts.body]);
  return (
    <ThemeContext.Provider value={{ palette, scheme, decorative, appearance, headingFont: fonts.heading }}>
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
