import { Pressable, View } from "react-native";
import { GOAL_STYLES, GOAL_STYLE_LABELS, type GoalStyle } from "../calc/goalStyle";
import { Text } from "./text";
import { useTheme } from "./theme";

export function GoalMark({ kind, fill, size }: { kind: GoalStyle; fill: number; size: number }) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fill) ? fill : 0));
  if (kind === "off") return <OffMark size={size} />;
  if (kind === "jar") return <JarMark fill={clamped} size={size} />;
  if (kind === "ring") return <RingMark fill={clamped} size={size} />;
  if (kind === "gauge") return <GaugeMark fill={clamped} size={size} />;
  if (kind === "thermometer") return <ThermoMark fill={clamped} size={size} />;
  if (kind === "cash") return <CashMark fill={clamped} size={size} />;
  if (kind === "bar") return <BarMark fill={clamped} size={size} />;
  if (kind === "cup") return <CupMark fill={clamped} size={size} />;
  return <BatteryMark fill={clamped} size={size} />;
}

export function GoalStylePicker({ value, onChange }: { value: GoalStyle; onChange: (next: GoalStyle) => void }) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: palette.text, fontWeight: "700", fontSize: 16 }}>Weekly goal</Text>
      <Text style={{ color: palette.muted, fontSize: 13 }}>The mark in the top right fills toward this week’s goal.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {GOAL_STYLES.map((kind) => {
          const on = value === kind;
          return (
            <Pressable
              key={kind}
              accessibilityRole="button"
              accessibilityLabel={GOAL_STYLE_LABELS[kind]}
              accessibilityState={{ selected: on }}
              onPress={() => onChange(kind)}
              style={{
                width: 104,
                minHeight: 88,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: on ? palette.accent : palette.line,
                backgroundColor: palette.card,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: 8,
              }}
            >
              <GoalMark kind={kind} fill={0.62} size={36} />
              <Text style={{ color: palette.text, fontSize: 12, fontWeight: "700", textAlign: "center" }}>{GOAL_STYLE_LABELS[kind]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function OffMark({ size }: { size: number }) {
  const { palette } = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: palette.line }} />;
}

function JarMark({ fill, size }: { fill: number; size: number }) {
  const { palette } = useTheme();
  const inner = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: "center" }}>
      <View style={{ width: size * 0.46, height: size * 0.1, borderRadius: 3, backgroundColor: palette.text, marginBottom: 1 }} />
      <View style={{ width: size * 0.72, height: inner, borderRadius: size * 0.16, borderWidth: 2, borderColor: palette.text, backgroundColor: palette.input, overflow: "hidden", justifyContent: "flex-end" }}>
        <View style={{ height: inner * fill, backgroundColor: palette.primary }} />
      </View>
    </View>
  );
}

function RingMark({ fill, size }: { fill: number; size: number }) {
  const { palette } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: palette.input, borderWidth: 2, borderColor: palette.line, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: size * fill, backgroundColor: palette.accent }} />
      <View style={{ width: size * 0.52, height: size * 0.52, borderRadius: size, backgroundColor: palette.card }} />
    </View>
  );
}

function GaugeMark({ fill, size }: { fill: number; size: number }) {
  const { palette } = useTheme();
  return (
    <View style={{ width: size, height: size * 0.56, overflow: "hidden" }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: palette.line, backgroundColor: palette.input }} />
      <View style={{ position: "absolute", width: size, height: size, alignItems: "center", transform: [{ rotate: `${-90 + fill * 180}deg` }] }}>
        <View style={{ width: 3, height: size * 0.42, backgroundColor: palette.accent, marginTop: 4, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function ThermoMark({ fill, size }: { fill: number; size: number }) {
  const { palette } = useTheme();
  return (
    <View style={{ width: size * 0.5, height: size, alignItems: "center", justifyContent: "flex-end" }}>
      <View style={{ width: size * 0.28, height: size * 0.7, borderRadius: 8, borderWidth: 2, borderColor: palette.text, backgroundColor: palette.input, overflow: "hidden", justifyContent: "flex-end" }}>
        <View style={{ height: `${fill * 100}%`, backgroundColor: palette.accent }} />
      </View>
      <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: size, backgroundColor: palette.accent, marginTop: -size * 0.1 }} />
    </View>
  );
}

function CashMark({ fill, size }: { fill: number; size: number }) {
  const { palette } = useTheme();
  const shown = Math.round(fill * 5);
  return (
    <View style={{ width: size * 0.86, height: size, justifyContent: "flex-end" }}>
      {Array.from({ length: 5 }, (_, index) => {
        const on = index < shown;
        return (
          <View
            key={index}
            style={{
              height: size * 0.18,
              marginTop: index === 0 ? 0 : -2,
              borderRadius: 2,
              backgroundColor: on ? palette.accent : palette.line,
              borderWidth: 1,
              borderColor: palette.text,
            }}
          />
        );
      })}
    </View>
  );
}

function BarMark({ fill, size }: { fill: number; size: number }) {
  const { palette } = useTheme();
  return (
    <View style={{ width: size, height: Math.max(8, size * 0.28), borderRadius: 6, backgroundColor: palette.line, overflow: "hidden" }}>
      <View style={{ width: `${fill * 100}%`, height: "100%", backgroundColor: palette.accent }} />
    </View>
  );
}

function CupMark({ fill, size }: { fill: number; size: number }) {
  const { palette } = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size * 0.68, height: size * 0.74, marginTop: size * 0.12, borderWidth: 2, borderColor: palette.text, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: palette.input, overflow: "hidden", justifyContent: "flex-end" }}>
        <View style={{ height: `${fill * 100}%`, backgroundColor: palette.accent }} />
      </View>
      <View style={{ position: "absolute", right: size * 0.08, top: size * 0.28, width: size * 0.18, height: size * 0.28, borderWidth: 2, borderColor: palette.text, borderRadius: 8 }} />
    </View>
  );
}

function BatteryMark({ fill, size }: { fill: number; size: number }) {
  const { palette } = useTheme();
  return (
    <View style={{ width: size, height: size, flexDirection: "row", alignItems: "center" }}>
      <View style={{ flex: 1, height: size * 0.48, borderWidth: 2, borderColor: palette.text, borderRadius: 4, backgroundColor: palette.input, overflow: "hidden" }}>
        <View style={{ width: `${fill * 100}%`, height: "100%", backgroundColor: palette.accent }} />
      </View>
      <View style={{ width: size * 0.08, height: size * 0.18, marginLeft: 1, backgroundColor: palette.text, borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
    </View>
  );
}
