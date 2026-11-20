import { Pressable, View } from "react-native";
import { COLOR_CHOICES, FONT_CHOICES, type ColorThemeId, type FontId } from "./colorThemes";
import type { AppearanceSettings } from "./appearance";
import { Text } from "./text";
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FONT_CHOICES.map((font) => {
          const on = value.font === font.id;
          return (
            <Pressable
              key={font.id}
              accessibilityRole="button"
              accessibilityLabel={font.label}
              accessibilityState={{ selected: on }}
              onPress={() => onChange({ ...value, font: font.id satisfies FontId })}
              style={{
                minHeight: 44,
                paddingHorizontal: 12,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: on ? palette.accent : palette.line,
                backgroundColor: palette.card,
              }}
            >
              <Text style={{ color: palette.text, fontWeight: "700", fontFamily: font.body ?? "system-ui" }}>{font.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: palette.text, fontWeight: "700" }}>Color theme</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {COLOR_CHOICES.map((theme) => (
          <ThemeSwatch key={theme.id} id={theme.id} selected={value.colorTheme === theme.id} onPick={(colorTheme) => onChange({ ...value, colorTheme })} />
        ))}
      </View>
    </View>
  );
}

function ThemeSwatch({ id, selected, onPick }: { id: ColorThemeId; selected: boolean; onPick: (id: ColorThemeId) => void }) {
  const { palette } = useTheme();
  const theme = COLOR_CHOICES.find((item) => item.id === id)!;
  const swatch = theme.palette;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={theme.label}
      accessibilityState={{ selected }}
      onPress={() => onPick(id)}
      style={{
        width: 104,
        minHeight: 72,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: selected ? palette.accent : palette.line,
        backgroundColor: swatch?.card ?? palette.card,
        padding: 8,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: "row", gap: 4 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: swatch?.bg ?? palette.bg }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: swatch?.accent ?? palette.accent }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: swatch?.olive ?? palette.olive }} />
      </View>
      <Text style={{ color: swatch?.text ?? palette.text, fontWeight: "700", fontSize: 12 }}>{theme.label}</Text>
    </Pressable>
  );
}
