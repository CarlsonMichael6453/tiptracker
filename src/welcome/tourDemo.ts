import type { BudgetLedger } from "../budget/types";
import { DEFAULT_DOUBLE_THRESHOLD_MINUTES, DEFAULT_LUNCH_CUTOFF_MINUTES, DEFAULT_WEEK_STARTS_ON } from "../calc/classify";
import { addDays, daysInclusive, weekRange } from "../calc/dates";
import { periodTotals, type PeriodTotals } from "../calc/period";
import { computeShift } from "../calc/shift";
import { paceReport } from "../calc/tipJar";
import type { Profile, ShiftRecord } from "../domain/types";
import { defaultAppearance } from "../ui/appearance";

/** Shown on screen while the coach-mark tour is running. Never stored. */
export const EXAMPLE_DATA_LABEL = "Example data";

/** Every demo id starts with this. A write that carries one is refused. */
export const TOUR_DEMO_PREFIX = "tour-demo-";

/** Stand-in profile so the tour can run before anyone is saved. Never written. */
export const TOUR_GUEST_ID = `${TOUR_DEMO_PREFIX}guest`;

export const TOUR_GUEST_PROFILE: Profile = {
  id: TOUR_GUEST_ID,
  name: "Example",
  defaultWageCents: 0,
  weekStartsOn: DEFAULT_WEEK_STARTS_ON,
  lunchCutoffMinutes: DEFAULT_LUNCH_CUTOFF_MINUTES,
  doubleThresholdMinutes: DEFAULT_DOUBLE_THRESHOLD_MINUTES,
  lastRoleId: null,
  appearance: defaultAppearance(),
  weeklyGoalCents: null,
  showTipJar: true,
  goalIndicator: "jar",
  tipJarCelebratedWeek: null,
  payPeriodStartsOn: 5,
  payPeriodWeeks: 1,
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
};

const WAGE_CENTS = 1650;
const GOAL_CENTS = 90000;

export type TourDemo = {
  shifts: ShiftRecord[];
  goalCents: number;
  budget: BudgetLedger;
};

export type HomeSnapshot = {
  totals: PeriodTotals | null;
  paceLine: string;
  latest: ShiftRecord | null;
};

/**
 * Sample server week, prior weeks for the pace line, and a sample budget.
 * Pure: it does not read or write the database.
 */
export function buildTourDemo(input: { today: string; weekStartsOn: number; profileId: string }): TourDemo {
  const dates = datesThisWeek(input.today, input.weekStartsOn);
  const recipes = [DINNER, LUNCH, WEEKNIGHT];
  const shifts: ShiftRecord[] = dates.map((date, index) => {
    const recipe = recipes[index] ?? DINNER;
    return serverShift({ ...recipe, id: `${TOUR_DEMO_PREFIX}${recipe.id}`, profileId: input.profileId, date });
  });
  for (const back of [7, 14]) {
    shifts.push(
      serverShift({
        ...PRIOR,
        id: `${TOUR_DEMO_PREFIX}prior-${back}`,
        profileId: input.profileId,
        date: addDays(input.today, -back),
      }),
    );
  }
  const dueDay = Number(input.today.slice(8, 10));
  const budget: BudgetLedger = {
    profileId: input.profileId,
    baselineMode: "floor",
    floorCents: 42000,
    taxBps: 1500,
    bufferCents: 0,
    reminders: false,
    bills: [
      { id: `${TOUR_DEMO_PREFIX}bill-phone`, name: "Phone", amountCents: 4800, frequency: "monthly", dueDay, dueMonth: null, sinking: false },
      { id: `${TOUR_DEMO_PREFIX}bill-electric`, name: "Electric", amountCents: 6200, frequency: "monthly", dueDay, dueMonth: null, sinking: false },
    ],
    envelopes: [
      { id: `${TOUR_DEMO_PREFIX}env-groceries`, name: "Groceries", weeklyCents: 4000 },
      { id: `${TOUR_DEMO_PREFIX}env-gas`, name: "Gas", weeklyCents: 2500 },
      { id: `${TOUR_DEMO_PREFIX}env-fun`, name: "Fun", weeklyCents: 2000 },
    ],
    spends: [],
    cash: shifts
      .filter((shift) => shift.id.includes("prior-"))
      .map((shift) => ({
        id: `${TOUR_DEMO_PREFIX}cash-${shift.id}`,
        shiftId: shift.id,
        cents: shift.cashTipsCents ?? 0,
        deposited: true,
        date: shift.shiftDate,
      })),
    taxEntries: [],
  };
  return { shifts, goalCents: GOAL_CENTS, budget };
}

/** What a screen renders. The demo is used only while the tour is running. */
export function viewWhileTouring<T>(running: boolean, real: T, demo: T): T {
  return running ? demo : real;
}

/**
 * Get started and a reload leave the tour. Replay and Replay from Settings
 * start it again, so the example shows for that pass and is still not stored.
 */
export function runningAfter(event: "get-started" | "replay" | "reload" | "settings-replay"): boolean {
  return event === "replay" || event === "settings-replay";
}

export function isTourDemoPayload(value: unknown): boolean {
  const ids: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.id === "string") ids.push(record.id);
    for (const child of Object.values(record)) walk(child);
  };
  walk(value);
  return ids.some((id) => id.startsWith(TOUR_DEMO_PREFIX));
}

/** Refuses the write while the tour is running, and refuses any payload that still carries demo ids. */
export async function commitTourSafe(running: boolean, payload: unknown, write: () => Promise<void>): Promise<boolean> {
  if (running || isTourDemoPayload(payload)) return false;
  await write();
  return true;
}

export function homeSnapshot(shifts: ShiftRecord[], today: string, weekStartsOn: number, goalCents: number | null): HomeSnapshot {
  const week = weekRange(today, weekStartsOn);
  const weekShifts = shifts.filter((shift) => shift.shiftDate >= week.start && shift.shiftDate <= week.end);
  const totals = weekShifts.length > 0 ? periodTotals(weekShifts) : null;
  const latest = shifts.slice().sort(byRecent)[0] ?? null;
  const paceLine = paceReport({
    today,
    weekStartsOn,
    goalCents,
    shifts: shifts.map((shift) => ({ shiftDate: shift.shiftDate, takeHomeCents: shift.takeHomeCents })),
  }).paceLine;
  return { totals, paceLine, latest };
}

type Recipe = {
  id: string;
  startMinutes: number;
  durationMinutes: number;
  cashTipsCents: number;
  cardTipsCents: number;
  salesCents: number;
};

const DINNER: Recipe = { id: "dinner", startMinutes: 16 * 60, durationMinutes: 390, cashTipsCents: 6800, cardTipsCents: 14200, salesCents: 125000 };
const LUNCH: Recipe = { id: "lunch", startMinutes: 11 * 60, durationMinutes: 300, cashTipsCents: 4200, cardTipsCents: 7800, salesCents: 86000 };
const WEEKNIGHT: Recipe = { id: "weeknight", startMinutes: 17 * 60, durationMinutes: 270, cashTipsCents: 3600, cardTipsCents: 6400, salesCents: 72000 };
const PRIOR: Recipe = { id: "prior", startMinutes: 16 * 60, durationMinutes: 300, cashTipsCents: 4000, cardTipsCents: 7000, salesCents: 70000 };

function datesThisWeek(today: string, weekStartsOn: number): string[] {
  const week = weekRange(today, weekStartsOn);
  const count = daysInclusive(week.start, today) >= 3 ? 3 : 2;
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = addDays(today, -i);
    dates.push(date < week.start ? today : date);
  }
  return dates;
}

function serverShift(input: Recipe & { id: string; profileId: string; date: string }): ShiftRecord {
  const end = input.startMinutes + input.durationMinutes;
  const snap = computeShift({
    durationMinutes: input.durationMinutes,
    wageCents: WAGE_CENTS,
    tipsMode: "split",
    tipsTotalCents: null,
    cashTipsCents: input.cashTipsCents,
    cardTipsCents: input.cardTipsCents,
    salesCents: input.salesCents,
    tipShareMode: "none",
    tipShareTotalCents: null,
    tipShareLines: [],
    tipOutLines: [{ label: "Support", kind: "percent_of_sales", basisPoints: 400, amountCents: null }],
    settlement: "cash",
  });
  return {
    id: input.id,
    profileId: input.profileId,
    roleId: null,
    roleName: "Server",
    shiftDate: input.date,
    hoursMode: "clock",
    startMinutes: input.startMinutes,
    endMinutes: end >= 1440 ? end - 1440 : end,
    durationMinutes: snap.durationMinutes,
    wageCents: WAGE_CENTS,
    tipsMode: "split",
    tipsTotalCents: null,
    cashTipsCents: input.cashTipsCents,
    cardTipsCents: input.cardTipsCents,
    salesCents: input.salesCents,
    tipShareMode: "none",
    mealOverride: null,
    doubleOverride: null,
    tipOutSettlement: "cash",
    notes: null,
    guestTipsCents: snap.guestTipsCents,
    tipShareCents: snap.tipShareCents,
    grossTipsCents: snap.grossTipsCents,
    tipOutTotalCents: snap.tipOutTotalCents,
    wageEarningsCents: snap.wageEarningsCents,
    netTipsCents: snap.netTipsCents,
    takeHomeCents: snap.takeHomeCents,
    createdAt: `${input.date}T18:00:00.000Z`,
    updatedAt: `${input.date}T18:00:00.000Z`,
    tipOutLines: snap.tipOutLines.map((line, index) => ({
      id: `${input.id}-out-${index}`,
      label: line.label,
      kind: line.kind,
      basisPoints: line.basisPoints,
      amountCents: line.amountCents,
      sortOrder: index,
    })),
    tipShareLines: [],
  };
}

function byRecent(a: ShiftRecord, b: ShiftRecord): number {
  if (a.shiftDate !== b.shiftDate) return a.shiftDate < b.shiftDate ? 1 : -1;
  return (b.startMinutes ?? 0) - (a.startMinutes ?? 0);
}
