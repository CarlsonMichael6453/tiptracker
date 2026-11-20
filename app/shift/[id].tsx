import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";
import { doubleSource, mealSource, resolveDouble, resolveMeal } from "../../src/calc/classify";
import { formatClock, formatHoursPhrase, formatMoney, formatPercent, formatRate, formatTipPercent } from "../../src/calc/format";
import { formatWeekdayDate } from "../../src/calc/dates";
import { centsPerHour, roundDiv } from "../../src/calc/money";
import { cashSplitOf } from "../../src/calc/shift";
import type { ShiftRecord } from "../../src/domain/types";
import { deleteShift, getShift } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { Button, Card, Muted, Screen, Title } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";
import { Text } from "../../src/ui/text";

export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();
  const [shift, setShift] = useState<ShiftRecord | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!db || !id) return;
    setShift(await getShift(db, id));
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!activeProfile || shift === undefined) return null;
  if (!shift) {
    return (
      <Screen withHeader>
        <Muted>That shift isn’t on this phone.</Muted>
      </Screen>
    );
  }
  const record = shift;

  const meal = resolveMeal({
    mealOverride: shift.mealOverride,
    startMinutes: shift.startMinutes,
    lunchCutoffMinutes: activeProfile.lunchCutoffMinutes,
  });
  const length = resolveDouble({
    doubleOverride: shift.doubleOverride,
    durationMinutes: shift.durationMinutes,
    doubleThresholdMinutes: activeProfile.doubleThresholdMinutes,
  });
  const mealFrom = mealSource({ mealOverride: shift.mealOverride, startMinutes: shift.startMinutes });
  const lengthFrom = doubleSource(shift.doubleOverride);
  const crossed = shift.startMinutes != null && shift.endMinutes != null && shift.endMinutes < shift.startMinutes;
  const split =
    shift.tipsMode === "split"
      ? cashSplitOf({
          tipsMode: "split",
          cashTipsCents: shift.cashTipsCents ?? 0,
          cardTipsCents: shift.cardTipsCents ?? 0,
          tipShareCents: shift.tipShareCents,
          tipOutTotalCents: shift.tipOutTotalCents,
          wageEarningsCents: shift.wageEarningsCents,
          settlement: shift.tipOutSettlement,
        })
      : null;
  function confirmDelete() {
    Alert.alert(`Delete the ${record.roleName} shift on ${formatWeekdayDate(record.shiftDate)}? This can’t be undone.`, undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (!db) return;
          void deleteShift(db, record.id).then(() => router.back());
        },
      },
    ]);
  }

  return (
    <Screen withHeader>
      <Title>{shift.roleName}</Title>
      <Muted>{formatWeekdayDate(shift.shiftDate)}</Muted>
      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>{formatHoursPhrase(shift.durationMinutes)}</Text>
        {shift.hoursMode === "clock" && shift.startMinutes != null && shift.endMinutes != null ? (
          <Muted>
            {formatClock(shift.startMinutes)} – {formatClock(shift.endMinutes)}
            {crossed ? " · crossed midnight" : ""}
          </Muted>
        ) : (
          <Muted>Total hours entered.</Muted>
        )}
        {meal !== "unknown" && mealFrom ? (
          <Muted>
            {meal === "lunch" ? "Lunch" : "Dinner"} · {mealFrom}
          </Muted>
        ) : (
          <Muted>Meal not set</Muted>
        )}
        <Muted>{length === "double" ? "Double / all-day" : "Single"} · {lengthFrom}</Muted>
      </Card>
      <Card>
        <Line label="Wage" value={`${formatMoney(shift.wageCents)}/hr`} />
        <Line label="Wage earnings" value={formatMoney(shift.wageEarningsCents)} />
        <Line label="Guest tips" value={formatMoney(shift.guestTipsCents)} />
        {shift.tipsMode === "split" ? (
          <>
            <Line label="Cash" value={formatMoney(shift.cashTipsCents ?? 0)} />
            <Line label="Card" value={formatMoney(shift.cardTipsCents ?? 0)} />
          </>
        ) : null}
        {shift.tipShareMode !== "none" ? <Line label="Tip share" value={formatMoney(shift.tipShareCents)} /> : null}
        {shift.tipShareLines.map((line) => (
          <Line key={line.id} label={line.label ? `From ${line.label}` : "From"} value={formatMoney(line.amountCents)} />
        ))}
        {shift.salesCents != null ? <Line label="Sales" value={formatMoney(shift.salesCents)} /> : null}
        {shift.salesCents != null && shift.salesCents > 0 ? (
          <Line label="Tips of sales" value={formatTipPercent(roundDiv(shift.guestTipsCents * 1000, shift.salesCents))} />
        ) : null}
        {shift.tipOutLines.map((line) => (
          <Line key={line.id} label={tipOutLabel(line)} value={formatMoney(line.amountCents)} />
        ))}
        <Line label="Net tips" value={formatMoney(shift.netTipsCents)} />
        <Line label="Take-home" value={formatMoney(shift.takeHomeCents)} strong />
        <Line label="Real hourly" value={formatRate(centsPerHour(shift.takeHomeCents, shift.durationMinutes))} />
        <Line label="Tips per hour" value={formatRate(centsPerHour(shift.netTipsCents, shift.durationMinutes))} />
      </Card>
      {shift.notes ? (
        <Card>
          <Muted>Note</Muted>
          <Text style={{ color: palette.text, fontSize: 16 }}>{shift.notes}</Text>
        </Card>
      ) : null}
      {split ? (
        <Card>
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Cash tonight and paycheck</Text>
          <Line label="Cash left tonight" value={formatMoney(split.cashLeftTonightCents)} />
          <Line label="Paycheck" value={formatMoney(split.paycheckCents)} />
          <Muted>
            {shift.tipOutSettlement === "cash"
              ? "Tip-out was paid in cash. Tip share counts as cash. These two lines add up to take-home."
              : "Tip-out was taken from the paycheck. Tip share counts as cash. These two lines add up to take-home."}
          </Muted>
        </Card>
      ) : null}
      <Button label="Edit" onPress={() => router.push(`/shift/edit/${shift.id}`)} />
      <Button label="Delete" kind="danger" onPress={confirmDelete} />
    </Screen>
  );
}

function tipOutLabel(line: ShiftRecord["tipOutLines"][number]): string {
  const base = line.kind === "percent_of_sales" ? "sales" : "tips";
  if (line.kind === "flat") return line.label ?? "Tip-out";
  const rate = formatPercent(line.basisPoints ?? 0);
  return line.label ? `${line.label} · ${rate} of ${base}` : `${rate} of ${base}`;
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 3 }}>
      <Text style={{ color: palette.muted, flex: 1 }}>{label}</Text>
      <Text style={{ color: strong ? palette.accent : palette.text, fontWeight: "700", fontSize: strong ? 18 : 15 }}>{value}</Text>
    </View>
  );
}
