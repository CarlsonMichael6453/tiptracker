import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { BudgetLedger, CashChip } from "../../src/budget/types";
import {
  baselineIncome,
  billsDueInPeriod,
  budgetCsv,
  drawFromBuffer,
  envelopeRemaining,
  leftAfterBills,
  realAfterExpenses,
  safeToSpend,
  surplusAboveBaseline,
  sweepToBuffer,
  taxJarCents,
  type BudgetBill,
} from "../../src/calc/budget";
import { addDays, todayCivil, WEEKDAY_SHORT, weekRange } from "../../src/calc/dates";
import { formatMoney, formatRate } from "../../src/calc/format";
import { periodTotals } from "../../src/calc/period";
import { canAdd, isPro } from "../../src/config/pro";
import type { SavingsGoal, ShiftRecord } from "../../src/domain/types";
import { getBudget, saveBudget } from "../../src/repo/budget";
import { listGoals } from "../../src/repo/goals";
import { newId } from "../../src/repo/ids";
import { listShifts } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { Button, Card, Chips, Field, Muted, Screen, Segment, Title } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";
import { Text } from "../../src/ui/text";

export default function BudgetScreen() {
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();
  const [ledger, setLedger] = useState<BudgetLedger | null>(null);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [breakdown, setBreakdown] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [csv, setCsv] = useState<string | null>(null);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billFrequency, setBillFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [dueDay, setDueDay] = useState("");
  const [weekday, setWeekday] = useState("5");
  const [dueMonth, setDueMonth] = useState("");
  const [envName, setEnvName] = useState("");
  const [envAmount, setEnvAmount] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const pro = isPro();

  const load = useCallback(async () => {
    if (!db || !activeProfile) return;
    const [budget, history, saved] = await Promise.all([
      getBudget(db, activeProfile.id),
      listShifts(db, activeProfile.id),
      listGoals(db, activeProfile.id),
    ]);
    setLedger(budget);
    setShifts(history);
    setGoals(saved);
  }, [db, activeProfile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!activeProfile || !ledger) return null;

  const today = todayCivil();
  const period = weekRange(today, activeProfile.weekStartsOn);
  const weekShifts = shifts.filter((shift) => shift.shiftDate >= period.start && shift.shiftDate <= period.end);
  const week = periodTotals(weekShifts);
  const recentWeeks = weekTotals(shifts, activeProfile.weekStartsOn).slice(0, 12);
  const baseline = baselineIncome(ledger.baselineMode, ledger.floorCents, recentWeeks);
  const income = week.takeHomeCents > 0 ? week.takeHomeCents : baseline;
  const due = billsDueInPeriod(ledger.bills, period.start, period.end);
  const billCents = due.reduce((sum, bill) => sum + bill.amountCents, 0);
  const tax = taxJarCents(income, ledger.taxBps);
  const weekSpends = ledger.spends.filter((spend) => spend.date >= period.start && spend.date <= period.end);
  const envelopeLeft = ledger.envelopes.reduce((sum, envelope) => {
    const spent = weekSpends.filter((spend) => spend.envelopeId === envelope.id).reduce((total, spend) => total + spend.cents, 0);
    return sum + envelopeRemaining(envelope.weeklyCents, spent);
  }, 0);
  const goalSetAside = goals.filter((goal) => goal.status === "active").reduce((sum, goal) => sum + goal.weeklySetAsideCents, 0);
  const safe = safeToSpend({
    incomeCents: income,
    billsCents: billCents,
    taxCents: tax,
    goalSetAsideCents: goalSetAside,
    envelopeRemainingCents: envelopeLeft,
  });
  const left = leftAfterBills(income, billCents);
  const workExpenses = weekSpends.filter((spend) => spend.work).reduce((sum, spend) => sum + spend.cents, 0);
  const real = realAfterExpenses(week.takeHomeCents, workExpenses);
  const cash = cashOnHand(ledger, shifts);
  const held = cash.filter((chip) => !chip.deposited).reduce((sum, chip) => sum + chip.cents, 0);
  const surplus = surplusAboveBaseline(week.takeHomeCents, baseline);

  async function persist(next: BudgetLedger) {
    if (!db) return;
    setLedger(next);
    await saveBudget(db, next);
  }

  function addBill(sinking: boolean) {
    if (!ledger) return;
    const cents = dollarsToCents(billAmount);
    if (!billName.trim() || cents <= 0) return;
    if (!canAdd("bills", ledger.bills.length, pro)) {
      router.push("/pro");
      return;
    }
    const frequency = sinking ? "yearly" : billFrequency;
    const monthDay = Math.round(Number(dueDay));
    if (frequency !== "weekly" && (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31)) return;
    const month = Math.round(Number(dueMonth));
    if (frequency === "yearly" && (!Number.isInteger(month) || month < 1 || month > 12)) return;
    const bill: BudgetBill = {
      id: newId(),
      name: billName.trim(),
      amountCents: cents,
      frequency,
      dueDay: frequency === "weekly" ? Math.min(6, Math.max(0, Math.round(Number(weekday) || 0))) : monthDay,
      dueMonth: frequency === "yearly" ? month : null,
      sinking,
    };
    void persist({ ...ledger, bills: [...ledger.bills, bill] });
    setBillName("");
    setBillAmount("");
  }

  return (
    <Screen tipJar>
      <Title>Budget</Title>
      <Muted>Built for weeks that are not the same size. Money stays on this device.</Muted>

      <Card>
        <Text style={{ color: palette.muted, fontWeight: "700" }}>Baseline for a slow week</Text>
        <Text style={{ color: palette.text, fontSize: 28, fontWeight: "800" }}>{formatMoney(baseline)}</Text>
        <Muted>
          {ledger.baselineMode === "floor"
            ? "Using the floor you set."
            : recentWeeks.length
              ? "The lower quarter of your recent weeks. A slow week still has to cover the bills."
              : "Log a few weeks and this becomes your slow-week average. Until then it uses your floor."}
        </Muted>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label="Slow weeks" kind={ledger.baselineMode === "percentile" ? "primary" : "secondary"} onPress={() => void persist({ ...ledger, baselineMode: "percentile" })} />
          <Button label="My floor" kind={ledger.baselineMode === "floor" ? "primary" : "secondary"} onPress={() => void persist({ ...ledger, baselineMode: "floor" })} />
        </View>
        {ledger.baselineMode === "floor" ? (
          <Field label="Weekly floor" value={ledger.floorCents > 0 ? String(ledger.floorCents / 100) : ""} onChangeText={(text) => void persist({ ...ledger, floorCents: dollarsToCents(text) })} />
        ) : null}
        <Muted>
          This week’s take-home is {formatMoney(week.takeHomeCents)}. Surplus above the baseline is {formatMoney(surplus)}. The extra can go to the buffer or a goal.
        </Muted>
      </Card>

      <Card>
        <Text style={{ color: palette.muted, fontWeight: "700" }}>Left after this week’s bills</Text>
        <Text style={{ color: left >= 0 ? palette.text : palette.danger, fontSize: 28, fontWeight: "800" }}>{formatMoney(left)}</Text>
        <Muted>
          {formatMoney(income)} income minus {formatMoney(billCents)} due {period.start.slice(5)}–{period.end.slice(5)}.
        </Muted>
        {pro ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: palette.accent, fontWeight: "800" }}>Pro · Safe to spend this week</Text>
            <Text style={{ color: safe.leftCents >= 0 ? palette.text : palette.danger, fontSize: 28, fontWeight: "800" }}>{formatMoney(safe.leftCents)}</Text>
            <Button label={breakdown ? "Hide breakdown" : "Why this number"} kind="secondary" onPress={() => setBreakdown((value) => !value)} />
            {breakdown ? (
              <View style={{ gap: 4 }}>
                <Line label="Income used" cents={safe.incomeCents} />
                <Line label="Bills due" cents={-safe.billsCents} />
                <Line label="Tax jar" cents={-safe.taxCents} />
                <Line label="Goal set-asides" cents={-safe.goalsCents} />
                <Line label="Envelopes still to keep" cents={-safe.envelopesCents} />
              </View>
            ) : null}
          </View>
        ) : (
          <Button label="Pro · Safe to spend" kind="secondary" onPress={() => router.push("/pro")} />
        )}
      </Card>

      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>Bills</Text>
        <Muted>Due this pay period are marked. Free keeps 8. Pro, unlocked while testing, does not cap them.</Muted>
        {ledger.bills.map((bill) => {
          const hits = due.some((item) => item.id === bill.id);
          return (
            <View key={bill.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, minHeight: 44, alignItems: "center" }}>
              <Text style={{ color: palette.text, flex: 1 }}>
                {bill.name} · {formatMoney(bill.amountCents)} · {describeDue(bill)}
                {bill.sinking ? ` · set aside ${formatMoney(Math.round(bill.amountCents / 52))}/week` : ""}
                {hits ? " · due this pay period" : ""}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${bill.name}`} onPress={() => void persist({ ...ledger, bills: ledger.bills.filter((item) => item.id !== bill.id) })}>
                <Text style={{ color: palette.danger, fontWeight: "700" }}>Remove</Text>
              </Pressable>
            </View>
          );
        })}
        <Field label="Bill name" value={billName} onChangeText={setBillName} keyboard="default" />
        <Field label="Amount" value={billAmount} onChangeText={setBillAmount} />
        <Segment
          value={billFrequency}
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ]}
          onChange={setBillFrequency}
        />
        {billFrequency === "weekly" ? (
          <Chips value={weekday} onChange={setWeekday} options={WEEKDAY_SHORT.map((label, index) => ({ value: String(index), label }))} />
        ) : (
          <Field label="Day of the month" value={dueDay} onChangeText={setDueDay} />
        )}
        {billFrequency === "yearly" ? <Field label="Month (1–12)" value={dueMonth} onChangeText={setDueMonth} /> : null}
        <Button label={canAdd("bills", ledger.bills.length, pro) ? "Add monthly bill" : "Bill limit on the free plan"} onPress={() => addBill(false)} />
        {pro ? <Button label="Add as a sinking fund" kind="secondary" onPress={() => addBill(true)} /> : null}
      </Card>

      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>Cash wallet</Text>
        <Muted>Cash tips land here until you mark them deposited. Still in your pocket: {formatMoney(held)}.</Muted>
        {cash.filter((chip) => !chip.deposited).map((chip) => (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${formatMoney(chip.cents)} deposited`}
            onPress={() => void persist(markDeposited(ledger, chip))}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: palette.text }}>{formatMoney(chip.cents)} · {chip.date} · tap when deposited</Text>
          </Pressable>
        ))}
        <Button
          label="Add $20 still in cash"
          kind="secondary"
          onPress={() => void persist({ ...ledger, cash: [...ledger.cash, { id: newId(), shiftId: null, cents: 2000, deposited: false, date: today }] })}
        />
      </Card>

      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>Tax jar</Text>
        <Muted>Set aside {ledger.taxBps / 100}% of this week: {formatMoney(tax)}. Not tax advice. A jar is a reminder, not a filing.</Muted>
        <Field label="Percent of the week" value={ledger.taxBps > 0 ? String(ledger.taxBps / 100) : ""} onChangeText={(text) => void persist({ ...ledger, taxBps: percentToBps(text) })} />
      </Card>

      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>Envelopes</Text>
        <Muted>A weekly amount, then what you already spent. Free keeps 6.</Muted>
        {ledger.envelopes.map((envelope) => {
          const spent = weekSpends.filter((spend) => spend.envelopeId === envelope.id).reduce((sum, spend) => sum + spend.cents, 0);
          return (
            <Text key={envelope.id} style={{ color: palette.text }}>
              {envelope.name}: {formatMoney(envelopeRemaining(envelope.weeklyCents, spent))} left of {formatMoney(envelope.weeklyCents)}
            </Text>
          );
        })}
        <Field label="Envelope" value={envName} onChangeText={setEnvName} keyboard="default" />
        <Field label="Weekly amount" value={envAmount} onChangeText={setEnvAmount} />
        <Button
          label={canAdd("envelopes", ledger.envelopes.length, pro) ? "Add envelope" : "Envelope limit on the free plan"}
          onPress={() => {
            if (!canAdd("envelopes", ledger.envelopes.length, pro)) {
              router.push("/pro");
              return;
            }
            if (!envName.trim()) return;
            void persist({
              ...ledger,
              envelopes: [...ledger.envelopes, { id: newId(), name: envName.trim(), weeklyCents: dollarsToCents(envAmount) }],
            });
            setEnvName("");
            setEnvAmount("");
          }}
        />
        <Field label="Spend this week" value={spendAmount} onChangeText={setSpendAmount} />
        <Button
          label="Log a spend"
          kind="secondary"
          onPress={() => {
            const cents = dollarsToCents(spendAmount);
            if (cents <= 0) return;
            void persist({
              ...ledger,
              spends: [...ledger.spends, { id: newId(), envelopeId: ledger.envelopes[0]?.id ?? null, name: "Spend", cents, date: today, work: false, category: "general" }],
            });
            setSpendAmount("");
          }}
        />
      </Card>

      {pro ? (
        <>
          <Card>
            <Text style={{ color: palette.accent, fontWeight: "800" }}>Pro · Slow-week buffer</Text>
            <Text style={{ color: palette.text, fontSize: 22, fontWeight: "800" }}>{formatMoney(ledger.bufferCents)}</Text>
            <Muted>A good week sweeps the surplus above your baseline. A short week can draw it back.</Muted>
            <Button label="Sweep this week’s surplus" onPress={() => void persist({ ...ledger, bufferCents: sweepToBuffer(week.takeHomeCents, baseline, ledger.bufferCents).bufferCents })} />
            <Button label="Draw if this week is short" kind="secondary" onPress={() => void persist({ ...ledger, bufferCents: drawFromBuffer(week.takeHomeCents, baseline, ledger.bufferCents).bufferCents })} />
          </Card>
          <Card>
            <Text style={{ color: palette.accent, fontWeight: "800" }}>Pro · Cash-flow calendar</Text>
            <Muted>Bills against payday. A week that cannot cover a bill before payday is marked.</Muted>
            <Button label={calendar ? "Hide calendar" : "Show the next four weeks"} kind="secondary" onPress={() => setCalendar((value) => !value)} />
            {calendar
              ? Array.from({ length: 4 }, (_, index) => {
                  const start = addDays(period.start, index * 7);
                  const end = addDays(start, 6);
                  const hits = billsDueInPeriod(ledger.bills, start, end);
                  const dueCents = hits.reduce((sum, bill) => sum + bill.amountCents, 0);
                  const short = dueCents > baseline;
                  return (
                    <Text key={start} style={{ color: short ? palette.danger : palette.text }}>
                      {start.slice(5)}–{end.slice(5)} payday {end.slice(5)} · {hits.map((bill) => bill.name).join(", ") || "no bills"}
                      {short ? " · may not clear" : ""}
                    </Text>
                  );
                })
              : null}
            <Pressable accessibilityRole="button" onPress={() => void persist({ ...ledger, reminders: !ledger.reminders })} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: palette.text }}>{ledger.reminders ? "Bill reminder on" : "Bill reminder off"} · shown on the calendar the day before</Text>
            </Pressable>
          </Card>
          <Card>
            <Text style={{ color: palette.accent, fontWeight: "800" }}>Pro · Work expenses</Text>
            <Muted>
              Gas, meals, uniforms, and mileage come out of real take-home. After {formatMoney(workExpenses)}: {formatMoney(real)}
              {week.minutes > 0 ? ` · ${formatRate(Math.round((real * 60) / week.minutes))}` : ""}.
            </Muted>
            <Field label="Work expense" value={expenseAmount} onChangeText={setExpenseAmount} />
            <Button
              label="Subtract from this week"
              onPress={() => {
                const cents = dollarsToCents(expenseAmount);
                if (cents <= 0) return;
                void persist({
                  ...ledger,
                  spends: [...ledger.spends, { id: newId(), envelopeId: null, name: "Work expense", cents, date: today, work: true, category: "work" }],
                });
                setExpenseAmount("");
              }}
            />
          </Card>
          <Card>
            <Text style={{ color: palette.accent, fontWeight: "800" }}>Pro · Report</Text>
            <Button
              label="Build a CSV you can copy"
              kind="secondary"
              onPress={() =>
                setCsv(
                  budgetCsv([
                    ...ledger.bills.map((bill) => ({ type: "bill", date: period.start, name: bill.name, cents: bill.amountCents })),
                    ...ledger.spends.map((spend) => ({ type: spend.work ? "work" : "spend", date: spend.date, name: spend.name, cents: spend.cents })),
                    ...ledger.cash.map((chip) => ({ type: chip.deposited ? "deposited" : "cash", date: chip.date, name: "Cash", cents: chip.cents })),
                  ]),
                )
              }
            />
            {csv ? (
              <Text selectable style={{ color: palette.text }}>
                {csv}
              </Text>
            ) : null}
          </Card>
        </>
      ) : (
        <Button label="See Pro" onPress={() => router.push("/pro")} />
      )}
    </Screen>
  );
}

function Line({ label, cents }: { label: string; cents: number }) {
  const { palette } = useTheme();
  return (
    <Text style={{ color: palette.text }}>
      {label}: {formatMoney(cents)}
    </Text>
  );
}

function weekTotals(shifts: ShiftRecord[], weekStartsOn: number): number[] {
  const byWeek = new Map<string, ShiftRecord[]>();
  for (const shift of shifts) {
    const range = weekRange(shift.shiftDate, weekStartsOn);
    const list = byWeek.get(range.start) ?? [];
    list.push(shift);
    byWeek.set(range.start, list);
  }
  return [...byWeek.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, week]) => periodTotals(week).takeHomeCents);
}

function cashOnHand(ledger: BudgetLedger, shifts: ShiftRecord[]): CashChip[] {
  const known = new Set(ledger.cash.map((chip) => chip.shiftId).filter((value): value is string => Boolean(value)));
  const fromShifts: CashChip[] = shifts
    .filter((shift) => (shift.cashTipsCents ?? 0) > 0 && !known.has(shift.id))
    .map((shift) => ({ id: `shift-${shift.id}`, shiftId: shift.id, cents: shift.cashTipsCents ?? 0, deposited: false, date: shift.shiftDate }));
  return [...ledger.cash, ...fromShifts];
}

function markDeposited(ledger: BudgetLedger, chip: CashChip): BudgetLedger {
  if (ledger.cash.some((item) => item.id === chip.id)) {
    return { ...ledger, cash: ledger.cash.map((item) => (item.id === chip.id ? { ...item, deposited: true } : item)) };
  }
  return { ...ledger, cash: [...ledger.cash, { ...chip, id: chip.shiftId ? `cash-${chip.shiftId}` : newId(), deposited: true }] };
}

function describeDue(bill: BudgetBill): string {
  if (bill.frequency === "weekly") return `weekly ${WEEKDAY_SHORT[bill.dueDay] ?? ""}`.trim();
  if (bill.frequency === "yearly") return `yearly month ${bill.dueMonth ?? "?"} day ${bill.dueDay}`;
  return `monthly day ${bill.dueDay}`;
}

function dollarsToCents(text: string): number {
  const amount = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function percentToBps(text: string): number {
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}
