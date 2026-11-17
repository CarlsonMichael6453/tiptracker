import { createContext, useContext, type ReactNode } from "react";
import { View } from "react-native";
import { useApp } from "../state/AppState";
import { buildPalette, colorsFor, defaultAppearance, prefersDarkUi, type AppearanceSettings } from "./appearance";
import { SceneBackground } from "./SceneBackground";
import type { Palette } from "./themePalette";

type ThemeValue = {
  palette: Palette;
  scheme: "light" | "dark";
  decorative: boolean;
  appearance: AppearanceSettings;
};

const ThemeContext = createContext<ThemeValue>({
  palette: buildPalette(defaultAppearance()),
  scheme: "light",
  decorative: false,
  appearance: defaultAppearance(),
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { activeProfile } = useApp();
  const appearance = activeProfile?.appearance ?? defaultAppearance();
  const palette = buildPalette(appearance);
  const scheme = prefersDarkUi(appearance) ? "dark" : "light";
  const decorative = appearance.style !== "light" && appearance.style !== "dark";
  return (
    <ThemeContext.Provider value={{ palette, scheme, decorative, appearance }}>
      <View style={{ flex: 1, backgroundColor: colorsFor(appearance)[0] }}>
        <SceneBackground settings={appearance} />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export type { Palette };
