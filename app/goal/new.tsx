import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { isCivilDate, todayCivil } from "../../src/calc/dates";
import { suggestHorizon, type GoalHorizon } from "../../src/calc/goals";
import { parseMoney } from "../../src/calc/money";
import { canAdd } from "../../src/config/pro";
import { createGoal, listGoals } from "../../src/repo/goals";
import { useApp } from "../../src/state/AppState";
import { Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

export default function NewGoal() {
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("short");
  const [picked, setPicked] = useState(false);
  const [weekly, setWeekly] = useState("");
  const [error, setError] = useState("");

  const suggestion = suggestHorizon(isCivilDate(date) ? date : null, todayCivil());
  const shown = picked ? horizon : suggestion ?? horizon;

  const save = async () => {
    if (!db || !activeProfile) return;
    const trimmed = name.trim();
    const parsedTarget = parseMoney(target);
    const parsedWeekly = weekly.trim() === "" ? { status: "ok" as const, cents: 0 } : parseMoney(weekly);
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError("Enter a name, up to 40 characters.");
      return;
    }
    if (parsedTarget.status !== "ok" || parsedTarget.cents <= 0) {
      setError("Enter a target above $0.");
      return;
    }
    if (date.trim() !== "" && !isCivilDate(date.trim())) {
      setError("Use a real date, like 2027-06-01, or leave it blank.");
      return;
    }
    if (parsedWeekly.status !== "ok" || parsedWeekly.cents < 0) {
      setError("Enter a weekly set-aside, or leave it blank.");
      return;
    }
    const existing = await listGoals(db, activeProfile.id);
    if (!canAdd("goals", existing.filter((goal) => goal.status !== "archived").length)) {
      setError("The free plan keeps 2 savings goals. Pro removes the cap.");
      return;
    }
    const id = await createGoal(db, {
      profileId: activeProfile.id,
      name: trimmed,
      targetCents: parsedTarget.cents,
      targetDate: date.trim() === "" ? null : date.trim(),
      horizon: shown,
      weeklySetAsideCents: parsedWeekly.cents,
    });
    router.replace(`/goal/${id}`);
  };

  return (
    <Screen withHeader>
      <Text style={{ color: palette.muted }}>This fills only when you set money aside. Logged take-home stays separate.</Text>
      <Field label="Name" value={name} onChange={setName} placeholder="New phone" />
      <Field label="Target amount" value={target} onChange={setTarget} placeholder="800" numeric />
      <Field label="Target date" value={date} onChange={(value) => { setDate(value); setPicked(false); }} placeholder="2027-06-01" />
      <Text style={{ color: palette.faint, fontSize: 13 }}>
        {suggestion === "short" ? "That date is inside about three months, so short-term is the suggestion." : suggestion === "long" ? "That date is further out, so long-term is the suggestion." : "Optional. A date within about three months suggests short-term."} You pick.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Choice label="Short-term" selected={shown === "short"} onPress={() => { setHorizon("short"); setPicked(true); }} />
        <Choice label="Long-term" selected={shown === "long"} onPress={() => { setHorizon("long"); setPicked(true); }} />
      </View>
      <Field label="Weekly set-aside" value={weekly} onChange={setWeekly} placeholder="40" numeric />
      {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Create goal" onPress={() => void save()} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary }}>
        <Text style={{ color: palette.onPrimary, fontWeight: "700", fontSize: 17 }}>Create goal</Text>
      </Pressable>
    </Screen>
  );
}

function Field({ label, value, onChange, placeholder, numeric = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; numeric?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: palette.muted, fontWeight: "600" }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={palette.faint} keyboardType={numeric ? "decimal-pad" : "default"} accessibilityLabel={label} autoCapitalize="none" style={{ minHeight: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 12, paddingHorizontal: 12, color: palette.text, backgroundColor: palette.input, fontSize: 18 }} />
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: selected ? palette.primary : palette.card, borderWidth: 1, borderColor: selected ? palette.primary : palette.line }}>
      <Text style={{ color: selected ? palette.onPrimary : palette.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
