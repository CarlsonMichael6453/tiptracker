import { addDays, weekdayIndex } from "./dates";
import { roundDiv } from "./money";

export type BaselineMode = "floor" | "percentile";
export type BillFrequency = "weekly" | "monthly" | "yearly";

export type BudgetBill = {
  id: string;
  name: string;
  amountCents: number;
  frequency: BillFrequency;
  /** Weekday 0–6 when weekly. Day of month 1–31 otherwise. */
  dueDay: number;
  /** 1–12 when yearly. */
  dueMonth: number | null;
  sinking: boolean;
};

export function percentile25(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * 0.25);
  return sorted[index] ?? null;
}

export function baselineIncome(mode: BaselineMode, floorCents: number, recentWeekTakeHome: number[]): number {
  if (mode === "floor") return Math.max(0, floorCents);
  return percentile25(recentWeekTakeHome) ?? Math.max(0, floorCents);
}

export function surplusAboveBaseline(takeHomeCents: number, baselineCents: number): number {
  return Math.max(0, takeHomeCents - baselineCents);
}

export function taxJarCents(takeHomeCents: number, basisPoints: number): number {
  if (takeHomeCents <= 0 || basisPoints <= 0) return 0;
  return roundDiv(takeHomeCents * basisPoints, 10000);
}

export function billsDueInPeriod(bills: BudgetBill[], start: string, end: string): BudgetBill[] {
  const due = new Set<string>();
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 40) {
    for (const bill of bills) {
      if (billHits(bill, cursor)) due.add(bill.id);
    }
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return bills.filter((bill) => due.has(bill.id));
}

export function leftAfterBills(incomeCents: number, billCents: number): number {
  return incomeCents - billCents;
}

export type SafeToSpend = {
  leftCents: number;
  incomeCents: number;
  billsCents: number;
  taxCents: number;
  goalsCents: number;
  envelopesCents: number;
};

export function safeToSpend(input: {
  incomeCents: number;
  billsCents: number;
  taxCents: number;
  goalSetAsideCents: number;
  envelopeRemainingCents: number;
}): SafeToSpend {
  const leftCents = input.incomeCents - input.billsCents - input.taxCents - input.goalSetAsideCents - input.envelopeRemainingCents;
  return {
    leftCents,
    incomeCents: input.incomeCents,
    billsCents: input.billsCents,
    taxCents: input.taxCents,
    goalsCents: input.goalSetAsideCents,
    envelopesCents: input.envelopeRemainingCents,
  };
}

export function sweepToBuffer(takeHomeCents: number, baselineCents: number, bufferCents: number): { sweptCents: number; bufferCents: number } {
  const sweptCents = surplusAboveBaseline(takeHomeCents, baselineCents);
  return { sweptCents, bufferCents: bufferCents + sweptCents };
}

export function drawFromBuffer(takeHomeCents: number, baselineCents: number, bufferCents: number): { drawnCents: number; bufferCents: number } {
  const need = Math.max(0, baselineCents - takeHomeCents);
  const drawnCents = Math.min(Math.max(0, bufferCents), need);
  return { drawnCents, bufferCents: Math.max(0, bufferCents) - drawnCents };
}

export function envelopeRemaining(weeklyCents: number, spentCents: number): number {
  return Math.max(0, weeklyCents - spentCents);
}

export function realAfterExpenses(takeHomeCents: number, expenseCents: number): number {
  return takeHomeCents - expenseCents;
}

export function budgetCsv(rows: { type: string; date: string; name: string; cents: number }[]): string {
  const lines = ["type,date,name,amount"];
  for (const row of rows) {
    const amount = (row.cents / 100).toFixed(2);
    lines.push(`${row.type},${row.date},${csvCell(row.name)},${amount}`);
  }
  return lines.join("\n");
}

function billHits(bill: BudgetBill, iso: string): boolean {
  if (bill.frequency === "weekly") return weekdayIndex(iso) === bill.dueDay;
  const [, month, day] = iso.split("-").map(Number);
  if (bill.frequency === "monthly") return day === bill.dueDay;
  return month === bill.dueMonth && day === bill.dueDay;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
