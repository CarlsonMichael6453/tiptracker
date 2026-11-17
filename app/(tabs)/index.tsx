import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { formatHoursPhrase, formatMoney, formatRate } from "../../src/calc/format";
import { formatWeekdayDate, todayCivil, weekRange } from "../../src/calc/dates";
import { periodTotals } from "../../src/calc/period";
import type { ShiftRecord } from "../../src/domain/types";
import { listShiftsInRange } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { Button, Card, Muted, Screen, Title } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

export default function Home() {
  const { db, activeProfile, profiles, setActive } = useApp();
  const { palette } = useTheme();
  const [latest, setLatest] = useState<ShiftRecord | null>(null);
  const [weekLabel, setWeekLabel] = useState("No shifts this week.");
  const [takeHome, setTakeHome] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [openSwitcher, setOpenSwitcher] = useState(false);

  const load = useCallback(async () => {
    if (!db || !activeProfile) return;
    const today = todayCivil();
    const week = weekRange(today, activeProfile.weekStartsOn);
    const shifts = await listShiftsInRange(db, activeProfile.id, week.start, week.end);
    if (shifts.length === 0) {
      setTakeHome(null);
      setWeekLabel("No shifts this week.");
      setDetail("");
    } else {
      const totals = periodTotals(shifts);
      setTakeHome(formatMoney(totals.takeHomeCents));
      setWeekLabel("");
      setDetail(
        `${formatRate(totals.realHourlyCents)} · ${formatHoursPhrase(totals.minutes)} · ${totals.shifts} ${totals.shifts === 1 ? "shift" : "shifts"}`,
      );
    }
    const recent = await listShiftsInRange(db, activeProfile.id, "0001-01-01", "9999-12-31");
    setLatest(recent[0] ?? null);
  }, [db, activeProfile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!activeProfile) return null;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <Title>{activeProfile.name}</Title>
        {profiles.length > 1 ? (
          <Button label="Switch" kind="secondary" onPress={() => setOpenSwitcher((open) => !open)} />
        ) : null}
      </View>
      {openSwitcher ? (
        <Card>
          {profiles.map((profile) => (
            <Pressable
              key={profile.id}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${profile.name}`}
              onPress={() => {
                void setActive(profile.id);
                setOpenSwitcher(false);
              }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: profile.id === activeProfile.id ? palette.accent : palette.text, fontSize: 17, fontWeight: "700" }}>
                {profile.name}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
      <Button label="Log shift" onPress={() => router.push("/shift/new")} />
      <Card>
        <Muted>This week</Muted>
        {takeHome == null ? (
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: "700" }}>{weekLabel}</Text>
        ) : (
          <>
            <Text style={{ color: palette.accent, fontSize: 40, fontWeight: "800" }}>{takeHome}</Text>
            <Text style={{ color: palette.text, fontSize: 16 }}>{detail}</Text>
          </>
        )}
        <Text style={{ color: palette.faint, fontSize: 13 }}>Real hourly = (wages + tips − tip-outs) ÷ hours.</Text>
      </Card>
      {latest ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(`/shift/${latest.id}`)}>
          <Card>
            <Muted>Latest shift</Muted>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>
              {formatWeekdayDate(latest.shiftDate)} · {latest.roleName}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 16 }}>
              {formatHoursPhrase(latest.durationMinutes)} · {formatMoney(latest.takeHomeCents)}
            </Text>
          </Card>
        </Pressable>
      ) : (
        <Muted>No shifts yet. Log tonight when you clock out.</Muted>
      )}
    </Screen>
  );
}
