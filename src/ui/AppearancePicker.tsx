import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import {
  APPEARANCE_STYLES,
  COLOR_SWATCHES,
  colorLabels,
  colorsFor,
  STYLE_LABELS,
  styleCanAnimate,
  withPair,
  withStyle,
  type AppearanceSettings,
  type AppearanceStyle,
  type ColorPair,
} from "./appearance";
import { normalizeHex } from "./contrast";
import { PreviewTile } from "./SceneBackground";
import { useTheme } from "./theme";

export function AppearancePicker({
  value,
  onChange,
}: {
  value: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
}) {
  const { palette } = useTheme();
  const labels = colorLabels(value.style);
  const pair = colorsFor(value);
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {APPEARANCE_STYLES.map((style) => {
          const selected = value.style === style;
          const preview = withStyle(value, style);
          return (
            <Pressable
              key={style}
              accessibilityRole="button"
              accessibilityLabel={STYLE_LABELS[style]}
              accessibilityState={{ selected }}
              onPress={() => onChange(withStyle(value, style))}
              style={{
                width: 112,
                minHeight: 92,
                borderRadius: 16,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? palette.accent : palette.line,
                backgroundColor: palette.card,
                padding: 8,
                gap: 6,
              }}
            >
              <PreviewTile settings={preview} />
              <Text style={{ color: palette.text, fontWeight: "700", fontSize: 13 }}>{STYLE_LABELS[style]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {labels ? (
        <View style={{ gap: 10 }}>
          <ColorField key={`${value.style}-a`} label={labels[0]} color={pair[0]} onChange={(color) => onChange(withPair(value, [color, pair[1]]))} />
          <ColorField key={`${value.style}-b`} label={labels[1]} color={pair[1]} onChange={(color) => onChange(withPair(value, [pair[0], color]))} />
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: palette.text, fontWeight: "700", fontSize: 16 }}>Animate background</Text>
          {styleCanAnimate(value.style) ? (
            <Text style={{ color: palette.muted, fontSize: 13 }}>A slow drift of the backdrop only. Cards stay still.</Text>
          ) : (
            <Text style={{ color: palette.muted, fontSize: 13 }}>Light and Dark stay still.</Text>
          )}
        </View>
        <Switch
          accessibilityLabel="Animate background"
          value={styleCanAnimate(value.style) && value.animateBackground}
          disabled={!styleCanAnimate(value.style)}
          onValueChange={(on) => onChange({ ...value, animateBackground: on })}
          trackColor={{ false: palette.line, true: palette.accent }}
          thumbColor={palette.card}
        />
      </View>
    </View>
  );
}

function ColorField({ label, color, onChange }: { label: string; color: string; onChange: (color: string) => void }) {
  const { palette } = useTheme();
  const [draft, setDraft] = useState(color);
  useEffect(() => setDraft(color), [color]);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: palette.muted, fontWeight: "600" }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {COLOR_SWATCHES.map((swatch) => {
          const selected = swatch.toUpperCase() === color.toUpperCase();
          return (
            <Pressable
              key={swatch}
              accessibilityRole="button"
              accessibilityLabel={swatch}
              onPress={() => {
                setDraft(swatch);
                onChange(swatch);
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: swatch,
                borderWidth: selected ? 3 : 1,
                borderColor: selected ? palette.accent : palette.line,
              }}
            />
          );
        })}
      </View>
      <TextInput
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          const next = normalizeHex(text);
          if (next) onChange(next);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="#24301A"
        placeholderTextColor={palette.faint}
        style={{
          minHeight: 44,
          borderWidth: 1,
          borderColor: palette.line,
          borderRadius: 12,
          paddingHorizontal: 12,
          color: palette.text,
          backgroundColor: palette.input,
          fontSize: 16,
        }}
      />
    </View>
  );
}

export function pairFor(style: AppearanceStyle, settings: AppearanceSettings): ColorPair {
  return colorsFor(withStyle(settings, style));
}
