import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { todayCivil } from "../calc/dates";
import { formatMoneyInput } from "../calc/format";
import { parseMoney } from "../calc/money";
import { paceReport, speakMoney, type PaceShift } from "../calc/tipJar";
import { requestReviewMoment } from "../feedback/reviewBus";
import { listShifts } from "../repo/repository";
import { useApp } from "../state/AppState";
import { SavingsPanel } from "./SavingsGoals";
import { useTheme } from "./theme";
import { useBackgroundMotion } from "./useBackgroundMotion";
import { Text, TextInput } from "./text";

const SPARKS = [
  { x: -22, y: -30 },
  { x: 18, y: -28 },
  { x: -30, y: -6 },
  { x: 28, y: -4 },
  { x: -8, y: -38 },
  { x: 6, y: -36 },
  { x: -16, y: 12 },
  { x: 16, y: 14 },
];

export function TipJar() {
  const { db, activeProfile, saveTipJar } = useApp();
  const { palette } = useTheme();
  const { reduceMotion } = useBackgroundMotion();
  const [open, setOpen] = useState(false);
  const [shifts, setShifts] = useState<PaceShift[]>([]);
  const [goalDraft, setGoalDraft] = useState("");
  const [goalError, setGoalError] = useState("");
  const [burst, setBurst] = useState(false);

  const load = useCallback(async () => {
    if (!db || !activeProfile) return;
    const rows = await listShifts(db, activeProfile.id);
    setShifts(rows.map((shift) => ({ shiftDate: shift.shiftDate, takeHomeCents: shift.takeHomeCents })));
  }, [db, activeProfile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const report = useMemo(() => {
    if (!activeProfile) return null;
    return paceReport({
      today: todayCivil(),
      weekStartsOn: activeProfile.weekStartsOn,
      shifts,
      goalCents: activeProfile.weeklyGoalCents,
    });
  }, [activeProfile, shifts]);

  useEffect(() => {
    if (!activeProfile?.showTipJar || !report?.progress.met) return;
    if (activeProfile.tipJarCelebratedWeek === report.weekStart) return;
    if (!reduceMotion) setBurst(true);
    requestReviewMoment("jar");
    void saveTipJar({ tipJarCelebratedWeek: report.weekStart });
  }, [activeProfile, reduceMotion, report, saveTipJar]);

  if (!activeProfile?.showTipJar || !report) return null;

  const progress = report.progress;
  const label = progress.hasGoal
    ? `Tip jar, ${speakMoney(report.takeHomeCents)} of ${speakMoney(progress.goalCents ?? 0)}`
    : "Tip jar, set a weekly goal";

  const openSheet = () => {
    setGoalDraft(progress.goalCents ? formatMoneyInput(progress.goalCents) : "");
    setGoalError("");
    setOpen(true);
  };

  const saveGoal = async () => {
    if (goalDraft.trim() === "") {
      await saveTipJar({ weeklyGoalCents: null });
      setGoalError("");
      return;
    }
    const parsed = parseMoney(goalDraft);
    if (parsed.status !== "ok" || parsed.cents <= 0) {
      setGoalError("Enter a goal above $0.");
      return;
    }
    await saveTipJar({ weeklyGoalCents: parsed.cents });
    setGoalError("");
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={openSheet}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.line,
        }}
      >
        <JarGraphic fill={progress.fill} size={28} reduceMotion={reduceMotion} />
        {burst ? <Sparkle reduceMotion={reduceMotion} /> : null}
      </Pressable>
      <Modal visible={open} transparent animationType={reduceMotion ? "none" : "fade"} onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close tip jar" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(20, 22, 16, 0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: palette.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88%" }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: "center", gap: 8 }}>
              <View>
                <JarGraphic fill={progress.fill} size={112} reduceMotion={reduceMotion} />
                {burst ? <Sparkle reduceMotion={reduceMotion} /> : null}
              </View>
              <Text style={{ color: palette.text, fontSize: 22, fontWeight: "800" }}>
                {progress.hasGoal ? `${speakMoney(report.takeHomeCents)} of ${speakMoney(progress.goalCents ?? 0)}` : speakMoney(report.takeHomeCents)}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 15, textAlign: "center" }}>
                {progress.hasGoal
                  ? progress.met
                    ? "Goal reached"
                    : `${speakMoney(progress.remainingCents ?? 0)} to go`
                  : "Set a weekly take-home goal"}
              </Text>
              <Text style={{ color: palette.text, fontSize: 16, textAlign: "center" }}>{report.paceLine}</Text>
              {report.goalLine ? <Text style={{ color: palette.muted, fontSize: 15, textAlign: "center" }}>{report.goalLine}</Text> : null}
            </View>
            <Text style={{ color: palette.muted, fontWeight: "600" }}>Weekly goal</Text>
            <TextInput
              value={goalDraft}
              onChangeText={setGoalDraft}
              placeholder="800"
              placeholderTextColor={palette.faint}
              keyboardType="decimal-pad"
              accessibilityLabel="Weekly goal"
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: palette.line,
                borderRadius: 12,
                paddingHorizontal: 14,
                color: palette.text,
                backgroundColor: palette.input,
                fontSize: 20,
              }}
            />
            <Text style={{ color: palette.faint, fontSize: 13 }}>Take-home for this week. Wages plus tips, minus tip-outs.</Text>
            {goalError ? <Text style={{ color: palette.danger }}>{goalError}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={progress.hasGoal ? "Save goal" : "Set goal"}
              onPress={() => void saveGoal()}
              style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary }}
            >
              <Text style={{ color: palette.onPrimary, fontWeight: "700", fontSize: 17 }}>{progress.hasGoal ? "Save goal" : "Set goal"}</Text>
            </Pressable>
            <SavingsPanel onNavigate={() => setOpen(false)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setOpen(false)}
              style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line }}
            >
              <Text style={{ color: palette.text, fontWeight: "700", fontSize: 17 }}>Close</Text>
            </Pressable>
          </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function JarGraphic({ fill, size, reduceMotion }: { fill: number; size: number; reduceMotion: boolean }) {
  const { palette } = useTheme();
  const scale = useRef(new Animated.Value(reduceMotion ? fill : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(fill);
      return;
    }
    Animated.timing(scale, { toValue: fill, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fill, reduceMotion, scale]);
  const inner = Math.round(size * 0.62);
  const translateY = scale.interpolate({ inputRange: [0, 1], outputRange: [inner / 2, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: "center" }}>
      <View style={{ width: size * 0.46, height: size * 0.1, borderRadius: 3, backgroundColor: palette.text, marginBottom: 1 }} />
      <View
        style={{
          width: size * 0.72,
          height: inner,
          borderRadius: size * 0.16,
          borderWidth: 2,
          borderColor: palette.text,
          backgroundColor: palette.input,
          overflow: "hidden",
          justifyContent: "flex-end",
        }}
      >
        <Animated.View
          style={{
            height: inner,
            backgroundColor: palette.primary,
            transform: [{ translateY }, { scaleY: scale }],
          }}
        />
      </View>
    </View>
  );
}

function Sparkle({ reduceMotion }: { reduceMotion: boolean }) {
  const { palette } = useTheme();
  const values = useRef(SPARKS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reduceMotion) return;
    values.forEach((value) => value.setValue(0));
    Animated.stagger(
      20,
      values.map((value) =>
        Animated.timing(value, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ),
    ).start();
  }, [reduceMotion, values]);
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
      {SPARKS.map((spark, index) => {
        const value = values[index];
        if (!value) return null;
        return (
          <Animated.View
            key={`${spark.x}-${spark.y}`}
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: index % 2 === 0 ? palette.accent : palette.primary,
              opacity: value.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, spark.x] }) },
                { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, spark.y] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
