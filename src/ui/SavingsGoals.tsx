import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { todayCivil, weekRange } from "../calc/dates";
import { formatMoneyInput } from "../calc/format";
import { goalFill, goalPace, setAsidePending } from "../calc/goals";
import { speakMoney } from "../calc/tipJar";
import { parseMoney } from "../calc/money";
import type { GoalEntry, SavingsGoal } from "../domain/types";
import { addGoalEntry, listGoalEntries, listGoals } from "../repo/goals";
import { useApp } from "../state/AppState";
import { useTheme } from "./theme";

export function SavingsPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [entries, setEntries] = useState<Record<string, GoalEntry[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!db || !activeProfile) return;
    const rows = await listGoals(db, activeProfile.id);
    const grouped: Record<string, GoalEntry[]> = {};
    for (const goal of rows) grouped[goal.id] = await listGoalEntries(db, goal.id);
    setGoals(rows);
    setEntries(grouped);
  }, [db, activeProfile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!activeProfile) return null;
  const today = todayCivil();
  const weekStart = weekRange(today, activeProfile.weekStartsOn).start;
  const pending = goals.filter((goal) => setAsidePending(entries[goal.id] ?? [], weekStart, goal.weeklySetAsideCents, goal.status));
  const open = (id: string) => {
    onNavigate?.();
    router.push(`/goal/${id}`);
  };

  const answer = async (goal: SavingsGoal, kind: "set_aside" | "skip") => {
    if (!db) return;
    let amount = goal.weeklySetAsideCents;
    if (kind === "set_aside") {
      const parsed = parseMoney(drafts[goal.id] ?? speakMoney(goal.weeklySetAsideCents).replace("$", ""));
      if (parsed.status !== "ok" || parsed.cents < 0) {
        setError(`Enter an amount for ${goal.name}.`);
        return;
      }
      amount = parsed.cents;
    }
    setError("");
    await addGoalEntry(db, goal.id, {
      kind: amount === 0 ? "skip" : kind,
      amountCents: amount,
      weekStart,
    });
    await load();
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>Savings goals</Text>
      {pending.map((goal) => (
        <View key={goal.id} style={{ gap: 8, borderWidth: 1, borderColor: palette.line, borderRadius: 14, padding: 12 }}>
          <Text style={{ color: palette.text, fontWeight: "700" }}>Set aside {speakMoney(goal.weeklySetAsideCents)} for {goal.name} this week?</Text>
          <TextInput
            value={drafts[goal.id] ?? formatMoneyInput(goal.weeklySetAsideCents)}
            onChangeText={(text) => setDrafts((current) => ({ ...current, [goal.id]: text }))}
            keyboardType="decimal-pad"
            accessibilityLabel={`Amount for ${goal.name}`}
            style={{ minHeight: 44, borderWidth: 1, borderColor: palette.line, borderRadius: 12, paddingHorizontal: 12, color: palette.text, backgroundColor: palette.input, fontSize: 18 }}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Set aside for ${goal.name}`} onPress={() => void answer(goal, "set_aside")} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary }}>
              <Text style={{ color: palette.onPrimary, fontWeight: "700" }}>Set aside</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Skip ${goal.name} this week`} onPress={() => void answer(goal, "skip")} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line }}>
              <Text style={{ color: palette.text, fontWeight: "700" }}>Skip</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
      <GoalGroup title="Short-term" goals={goals.filter((goal) => goal.horizon === "short" && goal.status === "active")} today={today} weekStartsOn={activeProfile.weekStartsOn} onOpen={open} />
      <GoalGroup title="Long-term" goals={goals.filter((goal) => goal.horizon === "long" && goal.status === "active")} today={today} weekStartsOn={activeProfile.weekStartsOn} onOpen={open} />
      {goals.some((goal) => goal.status !== "active") ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: palette.muted, fontWeight: "700" }}>Done and archived</Text>
          {goals
            .filter((goal) => goal.status !== "active")
            .map((goal) => (
              <Pressable key={goal.id} accessibilityRole="button" accessibilityLabel={goal.name} onPress={() => open(goal.id)} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ color: palette.text }}>{goal.name} · {goal.status === "complete" ? "Complete" : "Archived"}</Text>
              </Pressable>
            ))}
        </View>
      ) : null}
      {goals.length === 0 ? <Text style={{ color: palette.muted }}>Money set aside on purpose. It does not come out of logged take-home.</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Add a savings goal" onPress={() => { onNavigate?.(); router.push("/goal/new"); }} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line }}>
        <Text style={{ color: palette.text, fontWeight: "700" }}>Add a savings goal</Text>
      </Pressable>
    </View>
  );
}

function GoalGroup({
  title,
  goals,
  today,
  weekStartsOn,
  onOpen,
}: {
  title: string;
  goals: SavingsGoal[];
  today: string;
  weekStartsOn: number;
  onOpen: (id: string) => void;
}) {
  const { palette } = useTheme();
  if (goals.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: palette.muted, fontWeight: "700" }}>{title}</Text>
      {goals.map((goal) => {
        const fill = goalFill(goal.savedCents, goal.targetCents);
        const pace = goalPace({
          savedCents: goal.savedCents,
          targetCents: goal.targetCents,
          targetDate: goal.targetDate,
          today,
          weekStartsOn,
          weeklySetAsideCents: goal.weeklySetAsideCents,
        });
        return (
          <Pressable key={goal.id} accessibilityRole="button" accessibilityLabel={`${goal.name}, ${speakMoney(goal.savedCents)} of ${speakMoney(goal.targetCents)}`} onPress={() => onOpen(goal.id)} style={{ gap: 4 }}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>{goal.name}</Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>{speakMoney(goal.savedCents)} of {speakMoney(goal.targetCents)} · {fill.percent}%</Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.line, overflow: "hidden" }}>
              <View style={{ width: `${fill.percent}%`, height: 8, backgroundColor: palette.primary }} />
            </View>
            {pace.paceLine ? <Text style={{ color: palette.text, fontSize: 13 }}>{pace.paceLine}</Text> : null}
            {pace.trackLine ? <Text style={{ color: palette.muted, fontSize: 13 }}>{pace.trackLine}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
