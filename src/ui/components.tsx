import { useEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { addDays, compareCivil, formatWeekdayDate, isCivilDate, WEEKDAY_SHORT } from "../calc/dates";
import { colorsFor, shouldAnimateBackground } from "./appearance";
import { useBackgroundMotion } from "./useBackgroundMotion";
import { SceneBackground } from "./SceneBackground";
import { ScanButton } from "./ScanButton";
import { TipJar } from "./TipJar";
import { useTheme } from "./theme";

export function Screen({
  children,
  footer,
  scroll = true,
  withHeader = false,
  tipJar = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  withHeader?: boolean;
  tipJar?: boolean;
}) {
  const { appearance } = useTheme();
  const motion = useBackgroundMotion();
  const animate = shouldAnimateBackground({
    style: appearance.style,
    enabled: appearance.animateBackground,
    reduceMotion: motion.reduceMotion,
    appVisible: motion.appVisible,
  });
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" style={styles.fill}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.fill}>{children}</View>
  );
  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: colorsFor(appearance)[0] }]}
      edges={withHeader ? ["left", "right"] : ["top", "left", "right"]}
    >
      <SceneBackground settings={appearance} animate={animate} />
      {tipJar ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 4, zIndex: 2 }}>
          <ScanButton />
          <TipJar />
        </View>
      ) : null}
      {body}
      {footer}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const { palette, decorative } = useTheme();
  return (
    <Text
      style={[
        styles.title,
        {
          color: palette.text,
          backgroundColor: decorative ? palette.card : "transparent",
          alignSelf: "flex-start",
          paddingHorizontal: decorative ? 10 : 0,
          borderRadius: decorative ? 10 : 0,
        },
      ]}
    >
      {children}
    </Text>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { palette, decorative } = useTheme();
  return (
    <Text
      style={[
        styles.muted,
        { color: palette.muted },
        decorative
          ? { backgroundColor: palette.card, alignSelf: "flex-start", paddingHorizontal: 6, borderRadius: 6 }
          : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { palette } = useTheme();
  return <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const { palette } = useTheme();
  const background =
    kind === "primary" ? palette.primary : kind === "danger" ? palette.card : kind === "secondary" ? palette.cardAlt : palette.cardAlt;
  const color = kind === "primary" ? palette.onPrimary : kind === "danger" ? palette.danger : palette.text;
  const borderColor = kind === "danger" ? palette.danger : kind === "secondary" ? palette.line : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  keyboard = "decimal-pad",
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  hint?: string;
  keyboard?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.faint}
        keyboardType={keyboard}
        multiline={multiline}
        maxLength={maxLength}
        style={[
          styles.input,
          {
            color: palette.text,
            backgroundColor: palette.input,
            borderColor: palette.line,
            minHeight: multiline ? 88 : 48,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
      {hint ? <Text style={[styles.hint, { color: palette.faint }]}>{hint}</Text> : null}
    </View>
  );
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: palette.cardAlt, borderColor: palette.line }]}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.value)}
            style={[styles.segmentItem, { backgroundColor: on ? palette.chipOn : "transparent" }]}
          >
            <Text style={[styles.segmentText, { color: on ? palette.chipOnText : palette.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, { backgroundColor: on ? palette.chipOn : palette.chip, borderColor: palette.line }]}
          >
            <Text style={[styles.chipText, { color: on ? palette.chipOnText : palette.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CheckRow({ label, hint, checked, onPress }: { label: string; hint?: string; checked: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress} style={styles.check}>
      <View style={[styles.box, { borderColor: palette.accent, backgroundColor: checked ? palette.accent : "transparent" }]}>
        {checked ? <Text style={{ color: palette.onAccent, fontWeight: "700" }}>✓</Text> : null}
      </View>
      <View style={styles.fill}>
        <Text style={[styles.checkLabel, { color: palette.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: palette.faint }]}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

export function DateStepper({ value, onChange, max }: { value: string; onChange: (value: string) => void; max?: string }) {
  const { palette } = useTheme();
  const nextDisabled = max != null && compareCivil(value, max) >= 0;
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  useEffect(() => {
    if (!isCivilDate(value)) return;
    const [y, m, d] = value.split("-");
    setYear(y);
    setMonth(String(Number(m)));
    setDay(String(Number(d)));
  }, [value]);
  function edit(y: string, m: string, d: string) {
    setYear(y);
    setMonth(m);
    setDay(d);
    if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d)) return;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (!isCivilDate(iso)) return;
    if (max && compareCivil(iso, max) > 0) return;
    onChange(iso);
  }
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.muted }]}>Date</Text>
      <View style={styles.dateRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => onChange(addDays(value, -1))} style={[styles.step, { borderColor: palette.line }]}>
          <Text style={[styles.stepText, { color: palette.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.dateLabel, { color: palette.text }]}>{isCivilDate(value) ? formatWeekdayDate(value) : "Date"}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          disabled={nextDisabled}
          onPress={() => onChange(addDays(value, 1))}
          style={[styles.step, { borderColor: palette.line, opacity: nextDisabled ? 0.35 : 1 }]}
        >
          <Text style={[styles.stepText, { color: palette.text }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.dateNumbers}>
        <Mini label="Month" value={month} onChange={(text) => edit(year, text.replace(/[^\d]/g, "").slice(0, 2), day)} paletteText={palette.text} paletteMuted={palette.muted} border={palette.line} bg={palette.input} />
        <Mini label="Day" value={day} onChange={(text) => edit(year, month, text.replace(/[^\d]/g, "").slice(0, 2))} paletteText={palette.text} paletteMuted={palette.muted} border={palette.line} bg={palette.input} />
        <Mini label="Year" value={year} onChange={(text) => edit(text.replace(/[^\d]/g, "").slice(0, 4), month, day)} paletteText={palette.text} paletteMuted={palette.muted} border={palette.line} bg={palette.input} wide />
      </View>
    </View>
  );
}

function Mini({
  label,
  value,
  onChange,
  paletteText,
  paletteMuted,
  border,
  bg,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  paletteText: string;
  paletteMuted: string;
  border: string;
  bg: string;
  wide?: boolean;
}) {
  return (
    <View style={{ width: wide ? 96 : 72 }}>
      <Text style={[styles.hint, { color: paletteMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        style={[styles.input, { color: paletteText, borderColor: border, backgroundColor: bg, minHeight: 44 }]}
      />
    </View>
  );
}

export function TimeField({
  label,
  hour,
  minute,
  ampm,
  onChange,
}: {
  label: string;
  hour: string;
  minute: string;
  ampm: "am" | "pm";
  onChange: (next: { hour: string; minute: string; ampm: "am" | "pm" }) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
      <View style={styles.timeRow}>
        <TextInput
          accessibilityLabel={`${label} hour`}
          value={hour}
          onChangeText={(text) => onChange({ hour: text.replace(/[^\d]/g, "").slice(0, 2), minute, ampm })}
          keyboardType="number-pad"
          placeholder="4"
          placeholderTextColor={palette.faint}
          style={[styles.timeInput, { color: palette.text, borderColor: palette.line, backgroundColor: palette.input }]}
        />
        <Text style={[styles.colon, { color: palette.text }]}>:</Text>
        <TextInput
          accessibilityLabel={`${label} minute`}
          value={minute}
          onChangeText={(text) => onChange({ hour, minute: text.replace(/[^\d]/g, "").slice(0, 2), ampm })}
          keyboardType="number-pad"
          placeholder="00"
          placeholderTextColor={palette.faint}
          style={[styles.timeInput, { color: palette.text, borderColor: palette.line, backgroundColor: palette.input }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} ${ampm}`}
          onPress={() => onChange({ hour, minute, ampm: ampm === "am" ? "pm" : "am" })}
          style={[styles.ampm, { backgroundColor: palette.chipOn }]}
        >
          <Text style={[styles.buttonText, { color: palette.chipOnText }]}>{ampm.toUpperCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function WeekStartPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <Chips
      value={String(value)}
      onChange={(next) => onChange(Number(next))}
      options={WEEKDAY_SHORT.map((label, index) => ({ value: String(index), label }))}
    />
  );
}

export function Footer({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={[styles.footer, { backgroundColor: palette.card, borderColor: palette.line, paddingBottom: Math.max(insets.bottom, 12) }]}>{children}</View>;
}

export function ErrorList({ errors }: { errors: string[] }) {
  const { palette } = useTheme();
  if (errors.length === 0) return null;
  return (
    <View style={styles.errorBox}>
      {errors.map((error) => (
        <Text key={error} style={[styles.error, { color: palette.danger }]}>
          {error}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32, gap: 16 },
  title: { fontSize: 32, fontWeight: "700", letterSpacing: -0.6 },
  muted: { fontSize: 15, lineHeight: 21 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  button: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderWidth: 1 },
  buttonText: { fontSize: 17, fontWeight: "700" },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", letterSpacing: 0.2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 20 },
  hint: { fontSize: 13, lineHeight: 18 },
  segment: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  segmentText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 15, fontWeight: "600" },
  check: { flexDirection: "row", gap: 12, alignItems: "flex-start", minHeight: 44 },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 2 },
  checkLabel: { fontSize: 16, fontWeight: "600" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateLabel: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" },
  step: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 28, lineHeight: 30 },
  dateNumbers: { flexDirection: "row", gap: 8 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeInput: { width: 72, minHeight: 48, borderWidth: 1, borderRadius: 12, textAlign: "center", fontSize: 22 },
  colon: { fontSize: 24, fontWeight: "700" },
  ampm: { minWidth: 64, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  errorBox: { gap: 4 },
  error: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
});
