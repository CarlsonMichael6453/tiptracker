import { Pressable, Text, View } from "react-native";
import { COLOR_CHOICES, FONT_CHOICES, type ColorThemeId, type FontId } from "./colorThemes";
import type { AppearanceSettings } from "./appearance";
import { useTheme } from "./theme";

export function AppearanceType({
  value,
  onChange,
}: {
  value: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: palette.text, fontWeight: "700" }}>Font</Text>
      <Group title="Professional" fonts={FONT_CHOICES.filter((font) => font.group === "professional")} selected={value.font} onPick={(font) => onChange({ ...value, font })} />
      <Group title="Fun" fonts={FONT_CHOICES.filter((font) => font.group === "fun")} selected={value.font} onPick={(font) => onChange({ ...value, font })} />
      <Text style={{ color: palette.faint, fontSize: 13 }}>Pacifico is for headings. Body text stays in Nunito so a paragraph stays readable.</Text>
      <Text style={{ color: palette.text, fontWeight: "700" }}>Color theme</Text>
      <ThemeRow title="Default" ids={["system"]} selected={value.colorTheme} onPick={(colorTheme) => onChange({ ...value, colorTheme })} />
      <ThemeRow title="Professional" ids={["classic", "slate", "navy", "forest"]} selected={value.colorTheme} onPick={(colorTheme) => onChange({ ...value, colorTheme })} />
      <ThemeRow title="Fun" ids={["sunset", "mint", "grape", "neon", "bubblegum"]} selected={value.colorTheme} onPick={(colorTheme) => onChange({ ...value, colorTheme })} />
    </View>
  );
}

function Group({
  title,
  fonts,
  selected,
  onPick,
}: {
  title: string;
  fonts: { id: FontId; label: string; heading?: string }[];
  selected: string;
  onPick: (id: FontId) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {fonts.map((font) => {
          const on = selected === font.id;
          return (
            <Pressable key={font.id} accessibilityRole="button" accessibilityLabel={font.label} accessibilityState={{ selected: on }} onPress={() => onPick(font.id)} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: on ? palette.accent : palette.line, backgroundColor: palette.card }}>
              <Text style={{ color: palette.text, fontWeight: "700", fontFamily: font.heading }}>{font.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ThemeRow({
  title,
  ids,
  selected,
  onPick,
}: {
  title: string;
  ids: ColorThemeId[];
  selected: string;
  onPick: (id: ColorThemeId) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ids.map((id) => {
          const theme = COLOR_CHOICES.find((item) => item.id === id)!;
          const on = selected === id;
          const swatch = theme.palette;
          return (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={theme.label} accessibilityState={{ selected: on }} onPress={() => onPick(id)} style={{ width: 104, minHeight: 72, borderRadius: 12, borderWidth: 2, borderColor: on ? palette.accent : palette.line, backgroundColor: swatch?.card ?? palette.card, padding: 8, gap: 4 }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: swatch?.bg ?? palette.bg }} />
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: swatch?.accent ?? palette.accent }} />
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: swatch?.olive ?? palette.olive }} />
              </View>
              <Text style={{ color: swatch?.text ?? palette.text, fontWeight: "700", fontSize: 12 }}>{theme.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
