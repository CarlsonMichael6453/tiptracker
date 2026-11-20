import type { Palette } from "./themePalette";
import { darkPalette, lightPalette } from "./themePalette";

export const FONT_IDS = [
  "system",
  "inter",
  "roboto",
  "source-serif",
  "ibm-plex",
  "nunito",
  "baloo",
  "fredoka",
  "pacifico",
  "comic-neue",
] as const;

export type FontId = (typeof FONT_IDS)[number];

export const COLOR_THEME_IDS = [
  "system",
  "classic",
  "slate",
  "navy",
  "forest",
  "sunset",
  "mint",
  "grape",
  "neon",
  "bubblegum",
] as const;

export type ColorThemeId = (typeof COLOR_THEME_IDS)[number];

export type FontChoice = {
  id: FontId;
  label: string;
  group: "professional" | "fun";
  body: string | undefined;
  heading: string | undefined;
};

export const FONT_CHOICES: FontChoice[] = [
  { id: "system", label: "System default", group: "professional", body: undefined, heading: undefined },
  { id: "inter", label: "Inter", group: "professional", body: "Inter_400Regular", heading: "Inter_700Bold" },
  { id: "roboto", label: "Roboto", group: "professional", body: "Roboto_400Regular", heading: "Roboto_700Bold" },
  { id: "source-serif", label: "Source Serif 4", group: "professional", body: "SourceSerif4_400Regular", heading: "SourceSerif4_700Bold" },
  { id: "ibm-plex", label: "IBM Plex Sans", group: "professional", body: "IBMPlexSans_400Regular", heading: "IBMPlexSans_700Bold" },
  { id: "nunito", label: "Nunito", group: "fun", body: "Nunito_400Regular", heading: "Nunito_700Bold" },
  { id: "baloo", label: "Baloo 2", group: "fun", body: "Baloo2_400Regular", heading: "Baloo2_700Bold" },
  { id: "fredoka", label: "Fredoka", group: "fun", body: "Fredoka_400Regular", heading: "Fredoka_700Bold" },
  { id: "pacifico", label: "Pacifico", group: "fun", body: "Nunito_400Regular", heading: "Pacifico_400Regular" },
  { id: "comic-neue", label: "Comic Neue", group: "fun", body: "ComicNeue_400Regular", heading: "ComicNeue_700Bold" },
];

export type ColorChoice = {
  id: ColorThemeId;
  label: string;
  group: "professional" | "fun" | "system";
  palette: Palette | null;
};

const classic = paint(lightPalette(), {
  bg: "#F3EEE4",
  card: "#FFFCF7",
  cardAlt: "#F7F1E4",
  text: "#1C1E17",
  muted: "#3E4436",
  accent: "#24301A",
  warning: "#8A5410",
  olive: "#2F4A22",
  primary: "#24301A",
  onPrimary: "#F6F1E6",
  input: "#FFFFFF",
});

const slate = paint(darkPalette(), {
  bg: "#121418",
  card: "#1C2128",
  cardAlt: "#262C34",
  text: "#F4F1E6",
  muted: "#C2BEB0",
  accent: "#E2B15A",
  warning: "#E2B15A",
  olive: "#8FA36A",
  primary: "#E2B15A",
  onPrimary: "#1A1408",
  input: "#10140E",
});

const navy = paint(darkPalette(), {
  bg: "#0E1C38",
  card: "#14233F",
  cardAlt: "#1A2C4E",
  text: "#F4F1E6",
  muted: "#C9D4E4",
  accent: "#8AABCC",
  warning: "#E2B15A",
  olive: "#7DCFC8",
  primary: "#8AABCC",
  onPrimary: "#0E1C38",
  input: "#0C1830",
});

const forest = paint(darkPalette(), {
  bg: "#14301A",
  card: "#1A3320",
  cardAlt: "#23402A",
  text: "#F4F1E6",
  muted: "#D5E3C6",
  accent: "#C5D59A",
  warning: "#E2B15A",
  olive: "#8FA36A",
  primary: "#C5D59A",
  onPrimary: "#14301A",
  input: "#102616",
});

const sunset = paint(darkPalette(), {
  bg: "#3A1A14",
  card: "#4E241C",
  cardAlt: "#5C2C22",
  text: "#FFF6EE",
  muted: "#F6D7C4",
  accent: "#E2B15A",
  warning: "#F0A35A",
  olive: "#C5D59A",
  primary: "#E2B15A",
  onPrimary: "#3A1A14",
  input: "#2C140F",
});

const mint = paint(lightPalette(), {
  bg: "#E7F4EF",
  card: "#F7FFFC",
  cardAlt: "#E7F6F2",
  text: "#12302C",
  muted: "#1E4A44",
  accent: "#1A6A68",
  warning: "#8A5410",
  olive: "#1A6A68",
  primary: "#1A6A68",
  onPrimary: "#F7FFFC",
  input: "#FFFFFF",
});

const grape = paint(darkPalette(), {
  bg: "#2C1844",
  card: "#3A2258",
  cardAlt: "#4A2C6C",
  text: "#F6F1FA",
  muted: "#E6D8F2",
  accent: "#E6D8F2",
  warning: "#E2B15A",
  olive: "#7DCFC8",
  primary: "#E6D8F2",
  onPrimary: "#2C1844",
  input: "#241238",
});

const neon = paint(darkPalette(), {
  bg: "#12140F",
  card: "#1A1E16",
  cardAlt: "#242A1E",
  text: "#F4F1E6",
  muted: "#C2BEB0",
  accent: "#2E9A94",
  warning: "#E2C14A",
  olive: "#7DCFC8",
  primary: "#2E9A94",
  onPrimary: "#F4F1E6",
  input: "#10140E",
});

const bubblegum = paint(lightPalette(), {
  bg: "#F8DEE6",
  card: "#FFF7F9",
  cardAlt: "#F8DEE6",
  text: "#3A1824",
  muted: "#6A3044",
  accent: "#A34566",
  warning: "#8A5410",
  olive: "#1A6A68",
  primary: "#A34566",
  onPrimary: "#FFF7F9",
  input: "#FFFFFF",
});

export const COLOR_CHOICES: ColorChoice[] = [
  { id: "system", label: "System light/dark", group: "system", palette: null },
  { id: "classic", label: "Classic Light", group: "professional", palette: classic },
  { id: "slate", label: "Slate Dark", group: "professional", palette: slate },
  { id: "navy", label: "Navy", group: "professional", palette: navy },
  { id: "forest", label: "Forest", group: "professional", palette: forest },
  { id: "sunset", label: "Sunset", group: "fun", palette: sunset },
  { id: "mint", label: "Mint", group: "fun", palette: mint },
  { id: "grape", label: "Grape", group: "fun", palette: grape },
  { id: "neon", label: "Neon Night", group: "fun", palette: neon },
  { id: "bubblegum", label: "Bubblegum", group: "fun", palette: bubblegum },
];

export function fontChoice(id: string | undefined): FontChoice {
  return FONT_CHOICES.find((font) => font.id === id) ?? FONT_CHOICES[0]!;
}

export function colorChoice(id: string | undefined): ColorChoice {
  return COLOR_CHOICES.find((theme) => theme.id === id) ?? COLOR_CHOICES[0]!;
}

function paint(base: Palette, over: Partial<Palette>): Palette {
  return { ...base, ...over };
}
