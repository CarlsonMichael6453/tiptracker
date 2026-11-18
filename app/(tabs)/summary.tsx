import { useFocusEffect } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { formatHoursPhrase, formatMoney, formatRate } from "../../src/calc/format";
import {
  daysInclusive,
  formatLongDate,
  monthRange,
  previousMonthRange,
  todayCivil,
  trailing28,
  weekRange,
} from "../../src/calc/dates";
import { periodTotals, personTotals, weekdayBreakdown, type PeriodShift } from "../../src/calc/period";
import { buildInsights, type InsightShift } from "../../src/insights/insights";
import type { ShiftRecord } from "../../src/domain/types";
import { listShifts, listShiftsInRange } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { Card, Chips, DateStepper, Muted, Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

type RangeKey = "week" | "month" | "all" | "custom";

export default function Summary() {
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();
  const [range, setRange] = useState<RangeKey>("week");
  const [customStart, setCustomStart] = useState(() => monthRange(todayCivil()).start);
  const [customEnd, setCustomEnd] = useState(() => todayCivil());
  const [body, setBody] = useState<ReactNode>(null);

  const load = useCallback(async () => {
    if (!db || !activeProfile) return;
    const today = todayCivil();
    let shifts: ShiftRecord[] = [];
    let phrase = "this week";
    let kind: "week" | "month" | "all" | "custom" = range;
    let customDays = 0;
    let previous: ShiftRecord[] = [];
    let last28: ShiftRecord[] = [];
    let prior28: ShiftRecord[] = [];
    let emptyCopy = "No shifts in this week.";

    if (range === "week") {
      const week = weekRange(today, activeProfile.weekStartsOn);
      shifts = await listShiftsInRange(db, activeProfile.id, week.start, week.end);
      phrase = "this week";
      emptyCopy = "No shifts in this week.";
    } else if (range === "month") {
      const month = monthRange(today);
      const prev = previousMonthRange(today);
      const both = await listShiftsInRange(db, activeProfile.id, prev.start, month.end);
      shifts = both.filter((shift) => shift.shiftDate >= month.start && shift.shiftDate <= month.end);
      previous = both.filter((shift) => shift.shiftDate >= prev.start && shift.shiftDate <= prev.end);
      phrase = "this month";
      emptyCopy = "No shifts in this month.";
    } else if (range === "all") {
      shifts = await listShifts(db, activeProfile.id);
      const windows = trailing28(today);
      last28 = shifts.filter((shift) => shift.shiftDate >= windows.latest.start && shift.shiftDate <= windows.latest.end);
      prior28 = shifts.filter((shift) => shift.shiftDate >= windows.prior.start && shift.shiftDate <= windows.prior.end);
      const earliest = [...shifts].sort((a, b) => (a.shiftDate < b.shiftDate ? -1 : 1))[0];
      phrase = earliest ? `since ${formatLongDate(earliest.shiftDate)}` : "all time";
      emptyCopy = "No shifts yet.";
    } else {
      if (customEnd < customStart) {
        setBody(<Muted>End date is before the start date.</Muted>);
        return;
      }
      shifts = await listShiftsInRange(db, activeProfile.id, customStart, customEnd);
      customDays = daysInclusive(customStart, customEnd);
      phrase = `from ${formatLongDate(customStart)} to ${formatLongDate(customEnd)}`;
      emptyCopy = "No shifts in this range.";
    }

    const totals = periodTotals(shifts.map(toPeriod));
    const days = weekdayBreakdown(shifts.map(toPeriod), activeProfile.weekStartsOn);
    const tipOutPeople = personTotals(shifts.map(toPeriod), "tip_out");
    const tipSharePeople = personTotals(shifts.map(toPeriod), "tip_share");
    const insights = buildInsights({
      rangeKind: kind,
      customDayCount: customDays,
      rangePhrase: phrase,
      shifts: shifts.map(toInsight),
      lunchCutoffMinutes: activeProfile.lunchCutoffMinutes,
      doubleThresholdMinutes: activeProfile.doubleThresholdMinutes,
      previousShifts: previous.map(toInsight),
      last28: last28.map(toInsight),
      prior28: prior28.map(toInsight),
    });

    setBody(
      <View style={{ gap: 16 }}>
        <Card>
          {shifts.length === 0 ? <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>{emptyCopy}</Text> : null}
          <Row label="Shifts" value={String(totals.shifts)} />
          <Row label="Hours" value={formatHoursPhrase(totals.minutes)} />
          <Row label="Wage earnings" value={formatMoney(totals.wageEarningsCents)} />
          <Row label="Guest tips" value={formatMoney(totals.guestTipsCents)} />
          <Row label="Tip share" value={formatMoney(totals.tipShareCents)} />
          <Row label="Tips" value={formatMoney(totals.tipsCents)} />
          <Row label="Tip-out" value={formatMoney(totals.tipOutCents)} />
          <Row label="Net tips" value={formatMoney(totals.netTipsCents)} />
          <Row label="Take-home" value={formatMoney(totals.takeHomeCents)} strong />
          <Row label="Real hourly" value={formatRate(totals.realHourlyCents)} />
          <Row label="Tips per hour" value={formatRate(totals.tipsPerHourCents)} />
          <Text style={{ color: palette.faint, fontSize: 13 }}>Real hourly = (wages + tips − tip-outs) ÷ hours. Tips per hour is net tips, after tip-out.</Text>
        </Card>
        <Card>
          {insights.map((line) => (
            <Text key={line.id + line.text} style={{ color: palette.text, fontSize: 16, lineHeight: 22 }}>
              {line.text}
            </Text>
          ))}
        </Card>
        <Card>
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>By day</Text>
          {days.map((day) => (
            <View key={day.name} style={{ paddingVertical: 6 }}>
              <Text style={{ color: palette.text, fontWeight: "700" }}>{day.name}</Text>
              <Text style={{ color: palette.muted }}>
                {day.shifts === 0
                  ? "No shifts"
                  : `${day.shifts} ${day.shifts === 1 ? "shift" : "shifts"} · ${formatHoursPhrase(day.minutes)} · ${formatMoney(day.takeHomeCents)} · avg ${day.avgTakeHomeCents == null ? "—" : formatMoney(day.avgTakeHomeCents)} · ${formatRate(day.realHourlyCents)}`}
              </Text>
            </View>
          ))}
        </Card>
        {tipOutPeople.length > 0 ? (
          <Card>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Tip-out by person</Text>
            {tipOutPeople.map((person) => (
              <Row key={person.label} label={person.label} value={formatMoney(person.amountCents)} />
            ))}
          </Card>
        ) : null}
        {tipSharePeople.length > 0 ? (
          <Card>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Tip share by person</Text>
            {tipSharePeople.map((person) => (
              <Row key={person.label} label={person.label} value={formatMoney(person.amountCents)} />
            ))}
          </Card>
        ) : null}
      </View>,
    );
  }, [db, activeProfile, range, customStart, customEnd, palette]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen tipJar>
      <Chips
        value={range}
        onChange={(value) => setRange(value as RangeKey)}
        options={[
          { value: "week", label: "This week" },
          { value: "month", label: "This month" },
          { value: "all", label: "All time" },
          { value: "custom", label: "Custom" },
        ]}
      />
      {range === "custom" ? (
        <View style={{ gap: 12 }}>
          <DateStepper value={customStart} onChange={setCustomStart} />
          <DateStepper value={customEnd} max={todayCivil()} onChange={setCustomEnd} />
        </View>
      ) : null}
      {body}
    </Screen>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, minHeight: 28, alignItems: "center" }}>
      <Text style={{ color: palette.muted, fontSize: strong ? 17 : 15 }}>{label}</Text>
      <Text style={{ color: strong ? palette.accent : palette.text, fontSize: strong ? 20 : 16, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function toPeriod(shift: ShiftRecord): PeriodShift {
  return {
    shiftDate: shift.shiftDate,
    createdAt: shift.createdAt,
    durationMinutes: shift.durationMinutes,
    wageEarningsCents: shift.wageEarningsCents,
    guestTipsCents: shift.guestTipsCents,
    tipShareCents: shift.tipShareCents,
    tipOutTotalCents: shift.tipOutTotalCents,
    netTipsCents: shift.netTipsCents,
    takeHomeCents: shift.takeHomeCents,
    tipOutLines: shift.tipOutLines.map((line) => ({ label: line.label, amountCents: line.amountCents })),
    tipShareLines: shift.tipShareLines.map((line) => ({ label: line.label, amountCents: line.amountCents })),
  };
}

function toInsight(shift: ShiftRecord): InsightShift {
  return {
    shiftDate: shift.shiftDate,
    durationMinutes: shift.durationMinutes,
    takeHomeCents: shift.takeHomeCents,
    roleName: shift.roleName,
    startMinutes: shift.startMinutes,
    mealOverride: shift.mealOverride,
    doubleOverride: shift.doubleOverride,
  };
}
