import { useState } from "react";
import { Pressable, Switch, useWindowDimensions, View } from "react-native";
import {
  APPEARANCE_STYLES,
  COLOR_ROWS,
  THEME_PRESETS,
  appearanceContentWidth,
  applyPreset,
  colorLabels,
  colorsFor,
  rememberColor,
  STYLE_LABELS,
  styleCanAnimate,
  themeGrid,
  withPair,
  withStyle,
  type AppearanceSettings,
  type AppearanceStyle,
  type ColorPair,
  type ThemePreset,
} from "./appearance";
import { PreviewTile } from "./SceneBackground";
import { Text } from "./text";
import { useTheme } from "./theme";

export function AppearancePicker({
  value,
  onChange,
}: {
  value: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
}) {
  const { palette } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const grid = themeGrid(rowWidth || appearanceContentWidth(windowWidth));
  const labels = colorLabels(value.style);
  const tilePad = 6;
  return (
    <View style={{ gap: 12 }}>
      <View
        onLayout={(event) => {
          const next = Math.floor(event.nativeEvent.layout.width);
          if (next > 0 && next !== rowWidth) setRowWidth(next);
        }}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: grid.gap }}
      >
        {APPEARANCE_STYLES.map((style) => {
          const selected = value.style === style;
          const preview = withStyle(value, style);
          const previewWidth = Math.max((grid.tileWidth || 96) - tilePad * 2, 48);
          return (
            <Pressable
              key={style}
              accessibilityRole="button"
              accessibilityLabel={STYLE_LABELS[style]}
              accessibilityState={{ selected }}
              onPress={() => onChange(withStyle(value, style))}
              style={{
                width: grid.tileWidth || "31%",
                minHeight: 72,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: selected ? palette.accent : palette.line,
                backgroundColor: palette.card,
                padding: tilePad,
                gap: 4,
              }}
            >
              <PreviewTile settings={preview} width={previewWidth} height={26} />
              <Text numberOfLines={2} style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>
                {style === "checker" ? "Checker\nboard" : STYLE_LABELS[style]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {THEME_PRESETS.map((preset) => {
          const selected = presetMatches(value, preset);
          return (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityLabel={preset.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(applyPreset(value, preset))}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                minHeight: 44,
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: selected ? palette.accent : palette.line,
                backgroundColor: palette.card,
              }}
            >
              <PreviewTile settings={withPair(withStyle(value, preset.style), preset.pair)} width={28} height={28} />
              <Text style={{ color: palette.text, fontWeight: "700", fontSize: 13 }}>{preset.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {labels ? <ColorEditor value={value} labels={labels} onChange={onChange} /> : null}
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

function presetMatches(value: AppearanceSettings, preset: ThemePreset): boolean {
  if (value.style !== preset.style) return false;
  const pair = colorsFor(value);
  return pair[0].toUpperCase() === preset.pair[0].toUpperCase() && pair[1].toUpperCase() === preset.pair[1].toUpperCase();
}

function ColorEditor({
  value,
  labels,
  onChange,
}: {
  value: AppearanceSettings;
  labels: [string, string];
  onChange: (next: AppearanceSettings) => void;
}) {
  const { palette } = useTheme();
  const pair = colorsFor(value);
  const [slot, setSlot] = useState<0 | 1>(0);
  const active = pair[slot];

  const paint = (color: string, remember: boolean) => {
    const nextPair: ColorPair = slot === 0 ? [color, pair[1]] : [pair[0], color];
    const painted = withPair(value, nextPair);
    onChange(remember ? rememberColor(painted, color) : painted);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {labels.map((label, index) => {
          const selected = slot === index;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => setSlot(index as 0 | 1)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected ? palette.accent : palette.line,
                backgroundColor: palette.card,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 10,
              }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: pair[index], borderWidth: 1, borderColor: palette.line }} />
              <Text style={{ color: palette.text, fontWeight: "700", fontSize: 13 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {value.recent.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}>Recent colors</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {value.recent.map((swatch) => (
              <Swatch
                key={swatch}
                color={swatch}
                selected={swatch.toUpperCase() === active.toUpperCase()}
                label={`Recent ${swatch}`}
                onPress={() => paint(swatch, true)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {COLOR_ROWS.map((row) => (
        <View key={row.name} style={{ gap: 6 }}>
          <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}>{row.name}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {row.colors.map((swatch) => (
              <Swatch
                key={swatch}
                color={swatch}
                selected={swatch.toUpperCase() === active.toUpperCase()}
                label={`${row.name} ${swatch}`}
                onPress={() => paint(swatch, true)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Swatch({ color, selected, label, onPress }: { color: string; selected: boolean; label: string; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: color,
        borderWidth: selected ? 3 : 1,
        borderColor: selected ? palette.accent : palette.line,
      }}
    />
  );
}

export function pairFor(style: AppearanceStyle, settings: AppearanceSettings): ColorPair {
  return colorsFor(withStyle(settings, style));
}
