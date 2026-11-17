import { createContext, useContext, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import type { Appearance } from "../domain/types";

export type Palette = {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  muted: string;
  faint: string;
  line: string;
  accent: string;
  onAccent: string;
  olive: string;
  danger: string;
  warning: string;
  input: string;
  chip: string;
  chipOn: string;
  chipOnText: string;
  primary: string;
  onPrimary: string;
};

const dark: Palette = {
  bg: "#12140F",
  card: "#1C2118",
  cardAlt: "#262C20",
  text: "#F4F1E6",
  muted: "#C2BEB0",
  faint: "#8E8B7C",
  line: "#343A2E",
  accent: "#E2B15A",
  onAccent: "#1A1408",
  olive: "#C5D59A",
  danger: "#F0A090",
  warning: "#E2B15A",
  input: "#10140E",
  chip: "#2C3326",
  chipOn: "#E2B15A",
  chipOnText: "#1A1408",
  primary: "#E2B15A",
  onPrimary: "#1A1408",
};

const light: Palette = {
  bg: "#F3EEE4",
  card: "#FFFCF7",
  cardAlt: "#F7F1E4",
  text: "#1C1E17",
  muted: "#5A5E50",
  faint: "#8A8474",
  line: "#E3DAC8",
  accent: "#8A5410",
  onAccent: "#FFF8EC",
  olive: "#2F4A22",
  danger: "#9C3418",
  warning: "#8A5410",
  input: "#FFFFFF",
  chip: "#E8E0D0",
  chipOn: "#24301A",
  chipOnText: "#F6F1E6",
  primary: "#24301A",
  onPrimary: "#F6F1E6",
};

const ThemeContext = createContext<{ palette: Palette; scheme: "light" | "dark" }>({
  palette: light,
  scheme: "light",
});

export function ThemeProvider({ appearance, children }: { appearance: Appearance; children: ReactNode }) {
  const system = useColorScheme();
  const scheme = appearance === "system" ? (system === "dark" ? "dark" : "light") : appearance;
  const palette = scheme === "dark" ? dark : light;
  return <ThemeContext.Provider value={{ palette, scheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
