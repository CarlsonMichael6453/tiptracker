import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { isCivilDate, todayCivil } from "../../src/calc/dates";
import { formatMoneyInput } from "../../src/calc/format";
import { goalPace, suggestHorizon, type GoalHorizon } from "../../src/calc/goals";
import { parseMoney } from "../../src/calc/money";
import { speakMoney } from "../../src/calc/tipJar";
import type { GoalEntry, SavingsGoal } from "../../src/domain/types";
import { addGoalEntry, deleteGoal, getGoal, listGoalEntries, updateGoal } from "../../src/repo/goals";
import { useApp } from "../../src/state/AppState";
import { Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("short");
  const [weekly, setWeekly] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [balanceDraft, setBalanceDraft] = useState("");
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  const load = useCallback(async () => {
    if (!db || !id) return;
    const row = await getGoal(db, id);
    setGoal(row);
    setEntries(row ? await listGoalEntries(db, row.id) : []);
    if (row) {
      setName(row.name);
      setTarget(formatMoneyInput(row.targetCents));
      setDate(row.targetDate ?? "");
      setHorizon(row.horizon);
      setWeekly(formatMoneyInput(row.weeklySetAsideCents));
      setBalanceDraft(formatMoneyInput(row.savedCents));
    }
  }, [db, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const draftTarget = parseMoney(target);
  const draftWeekly = weekly.trim() === "" ? { status: "ok" as const, cents: 0 } : parseMoney(weekly);
  const targetCents = draftTarget.status === "ok" ? draftTarget.cents : goal?.targetCents ?? 0;
  const weeklyCents = draftWeekly.status === "ok" ? draftWeekly.cents : goal?.weeklySetAsideCents ?? 0;
  const targetDate = date.trim() === "" ? null : isCivilDate(date.trim()) ? date.trim() : goal?.targetDate ?? null;
  const pace = useMemo(() => {
    if (!activeProfile || !goal) return null;
    return goalPace({
      savedCents: goal.savedCents,
      targetCents,
      targetDate,
      today: todayCivil(),
      weekStartsOn: activeProfile.weekStartsOn,
      weeklySetAsideCents: weeklyCents,
    });
  }, [activeProfile, goal, targetCents, targetDate, weeklyCents]);

  if (!goal || !db || !activeProfile || !pace) return null;

  const note = (message: string, next: SavingsGoal | null) => {
    if (next && next.savedCents >= next.targetCents && !goal.celebrated) setBanner(`You reached ${next.name}`);
    else setBanner("");
    setError(message);
  };

  const saveDetails = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError("Enter a name, up to 40 characters.");
      return;
    }
    if (draftTarget.status !== "ok" || draftTarget.cents <= 0) {
      setError("Enter a target above $0.");
      return;
    }
    if (date.trim() !== "" && !isCivilDate(date.trim())) {
      setError("Use a real date, like 2027-06-01, or leave it blank.");
      return;
    }
    if (draftWeekly.status !== "ok" || draftWeekly.cents < 0) {
      setError("Enter a weekly set-aside of $0 or more.");
      return;
    }
    const next = await updateGoal(db, goal.id, {
      name: trimmed,
      targetCents: draftTarget.cents,
      targetDate: date.trim() === "" ? null : date.trim(),
      horizon,
      weeklySetAsideCents: draftWeekly.cents,
    });
    note("", next);
    await load();
  };

  const move = async (kind: "add" | "withdraw" | "adjust", text: string) => {
    if (kind === "adjust") {
      const parsed = parseMoney(text);
      if (parsed.status !== "ok" || parsed.cents < 0) {
        setError("Enter the new saved balance.");
        return;
      }
      const delta = parsed.cents - goal.savedCents;
      if (delta === 0) return;
      const next = await addGoalEntry(db, goal.id, { kind: "adjust", amountCents: delta, weekStart: null });
      note("", next);
      await load();
      return;
    }
    const parsed = parseMoney(text);
    if (parsed.status !== "ok" || parsed.cents <= 0) {
      setError(kind === "add" ? "Enter an amount to add." : "Enter an amount to withdraw.");
      return;
    }
    const next = await addGoalEntry(db, goal.id, { kind, amountCents: parsed.cents, weekStart: null });
    if (kind === "add") setAddAmount("");
    else setWithdrawAmount("");
    note("", next);
    await load();
  };

  const suggestion = suggestHorizon(targetDate, todayCivil());

  return (
    <Screen withHeader>
      {banner ? <Text style={{ color: palette.text, fontWeight: "800", fontSize: 18 }}>{banner}</Text> : null}
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: "800" }}>{speakMoney(goal.savedCents)} of {speakMoney(targetCents || goal.targetCents)}</Text>
      {pace.paceLine ? <Text style={{ color: palette.text, fontSize: 16 }}>{pace.paceLine}</Text> : null}
      {pace.trackLine ? <Text style={{ color: palette.muted }}>{pace.trackLine}</Text> : null}
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Target amount" value={target} onChange={setTarget} numeric />
      <Field label="Target date" value={date} onChange={setDate} placeholder="2027-06-01" />
      <Text style={{ color: palette.faint, fontSize: 13 }}>{suggestion ? `Suggestion from the date: ${suggestion === "short" ? "short-term" : "long-term"}. You can pick either.` : "Leave the date blank if there isn’t one."}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Choice label="Short-term" selected={horizon === "short"} onPress={() => setHorizon("short")} />
        <Choice label="Long-term" selected={horizon === "long"} onPress={() => setHorizon("long")} />
      </View>
      <Field label="Weekly set-aside" value={weekly} onChange={setWeekly} numeric />
      <Text style={{ color: palette.faint, fontSize: 13 }}>Changing these updates the pace above. Save to keep them.</Text>
      {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Save changes" onPress={() => void saveDetails()} style={primary(palette.primary)}>
        <Text style={{ color: palette.onPrimary, fontWeight: "700" }}>Save changes</Text>
      </Pressable>
      <Text style={{ color: palette.text, fontWeight: "800", fontSize: 18 }}>Saved balance</Text>
      <Field label="Add money" value={addAmount} onChange={setAddAmount} numeric />
      <Pressable accessibilityRole="button" accessibilityLabel="Add money" onPress={() => void move("add", addAmount)} style={secondary(palette.line)}>
        <Text style={{ color: palette.text, fontWeight: "700" }}>Add money</Text>
      </Pressable>
      <Field label="Withdraw" value={withdrawAmount} onChange={setWithdrawAmount} numeric />
      <Pressable accessibilityRole="button" accessibilityLabel="Withdraw" onPress={() => void move("withdraw", withdrawAmount)} style={secondary(palette.line)}>
        <Text style={{ color: palette.text, fontWeight: "700" }}>Withdraw</Text>
      </Pressable>
      <Field label="New balance" value={balanceDraft} onChange={setBalanceDraft} numeric />
      <Pressable accessibilityRole="button" accessibilityLabel="Set balance" onPress={() => void move("adjust", balanceDraft)} style={secondary(palette.line)}>
        <Text style={{ color: palette.text, fontWeight: "700" }}>Set balance</Text>
      </Pressable>
      <Text style={{ color: palette.muted, fontSize: 13 }}>Add, withdraw, and set balance keep a history. Nothing is added unless you confirm it.</Text>
      <Text style={{ color: palette.text, fontWeight: "800", fontSize: 18 }}>History</Text>
      {entries.length === 0 ? <Text style={{ color: palette.muted }}>No entries yet.</Text> : entries.map((entry) => (
        <Text key={entry.id} style={{ color: palette.text }}>{entryLabel(entry)}</Text>
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel={goal.status === "complete" ? "Reopen goal" : "Mark complete"} onPress={() => void updateGoal(db, goal.id, { status: goal.status === "complete" ? "active" : "complete" }).then(load)} style={secondary(palette.line)}>
        <Text style={{ color: palette.text, fontWeight: "700" }}>{goal.status === "complete" ? "Reopen goal" : "Mark complete"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={goal.status === "archived" ? "Unarchive" : "Archive"} onPress={() => void updateGoal(db, goal.id, { status: goal.status === "archived" ? "active" : "archived" }).then(load)} style={secondary(palette.line)}>
        <Text style={{ color: palette.text, fontWeight: "700" }}>{goal.status === "archived" ? "Unarchive" : "Archive"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete goal" onPress={() => Alert.alert(`Delete ${goal.name}?`, "The saved history goes with it.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete goal", style: "destructive", onPress: () => { void deleteGoal(db, goal.id).then(() => router.back()); } },
      ])} style={secondary(palette.danger)}>
        <Text style={{ color: palette.danger, fontWeight: "700" }}>Delete goal</Text>
      </Pressable>
    </Screen>
  );
}

function entryLabel(entry: GoalEntry): string {
  if (entry.kind === "set_aside") return `Set aside ${speakMoney(entry.amountCents)}`;
  if (entry.kind === "add") return `Added ${speakMoney(entry.amountCents)}`;
  if (entry.kind === "withdraw") return `Withdrew ${speakMoney(entry.amountCents)}`;
  if (entry.kind === "skip") return "Skipped the weekly set-aside";
  const sign = entry.amountCents < 0 ? "−" : "+";
  return `Adjusted ${sign}${speakMoney(Math.abs(entry.amountCents))}`;
}

function Field({ label, value, onChange, placeholder, numeric = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; numeric?: boolean }) {
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

function primary(color: string) {
  return { minHeight: 48, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: color };
}

function secondary(color: string) {
  return { minHeight: 48, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1, borderColor: color };
}
