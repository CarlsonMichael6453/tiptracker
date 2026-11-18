import { addDays, daysInclusive, weekRange, weekdayIndex, WEEKDAY_NAMES } from "./dates";
import { roundDivSigned } from "./money";

export type PaceShift = { shiftDate: string; takeHomeCents: number };

export type GoalProgress = {
  hasGoal: boolean;
  takeHomeCents: number;
  goalCents: number | null;
  /** 0 to 1. The jar never draws past full. */
  fill: number;
  remainingCents: number | null;
  met: boolean;
};

export type PaceReport = {
  weekStart: string;
  offset: number;
  takeHomeCents: number;
  comparableWeeks: number;
  averageCents: number | null;
  deltaCents: number | null;
  paceLine: string;
  goalLine: string | null;
  progress: GoalProgress;
};

const PACE_BAND_CENTS = 500;
const MAX_PRIOR_WEEKS = 8;
const BEST_WEEK_MINIMUM = 4;

/** Dollars without cents when the amount is whole. */
export function speakMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  if (abs % 100 === 0) {
    const dollars = (abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${sign}$${dollars}`;
  }
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rem = (abs % 100).toString().padStart(2, "0");
  return `${sign}$${dollars}.${rem}`;
}

export function goalProgress(takeHomeCents: number, goalCents: number | null): GoalProgress {
  const hasGoal = goalCents != null && goalCents > 0;
  if (!hasGoal || goalCents == null) {
    return { hasGoal: false, takeHomeCents, goalCents: null, fill: 0, remainingCents: null, met: false };
  }
  const met = takeHomeCents >= goalCents;
  const remainingCents = Math.max(0, goalCents - takeHomeCents);
  const fill = takeHomeCents <= 0 ? 0 : Math.min(1, takeHomeCents / goalCents);
  return { hasGoal: true, takeHomeCents, goalCents, fill, remainingCents, met };
}

/**
 * Week-to-date take-home versus the same day-offset in prior weeks.
 * A prior week counts only when it has a shift by that same point.
 * The last 8 such weeks are used. Fewer than 2 means there is no pace yet.
 */
export function paceReport(input: {
  today: string;
  weekStartsOn: number;
  shifts: PaceShift[];
  goalCents: number | null;
}): PaceReport {
  const week = weekRange(input.today, input.weekStartsOn);
  const offset = daysInclusive(week.start, input.today) - 1;
  const takeHomeCents = throughOffset(input.shifts, week.start, offset);
  const prior: number[] = [];
  for (let back = 1; back <= 60 && prior.length < MAX_PRIOR_WEEKS; back += 1) {
    const start = addDays(week.start, -7 * back);
    if (!hasShiftThrough(input.shifts, start, offset)) continue;
    prior.push(throughOffset(input.shifts, start, offset));
  }
  const progress = goalProgress(takeHomeCents, input.goalCents);
  const goalLine = goalPaceLine(progress, takeHomeCents, offset);
  if (prior.length < 2) {
    return {
      weekStart: week.start,
      offset,
      takeHomeCents,
      comparableWeeks: prior.length,
      averageCents: null,
      deltaCents: null,
      paceLine: "Log a couple of weeks to see your pace",
      goalLine,
      progress,
    };
  }
  const averageCents = roundDivSigned(
    prior.reduce((sum, value) => sum + value, 0),
    prior.length,
  );
  const deltaCents = takeHomeCents - averageCents;
  const best = prior.length >= BEST_WEEK_MINIMUM && prior.every((value) => takeHomeCents > value);
  return {
    weekStart: week.start,
    offset,
    takeHomeCents,
    comparableWeeks: prior.length,
    averageCents,
    deltaCents,
    paceLine: best ? "Best week in a month" : paceLine(deltaCents, input.today, offset),
    goalLine,
    progress,
  };
}

function throughOffset(shifts: PaceShift[], weekStart: string, offset: number): number {
  const end = addDays(weekStart, offset);
  return shifts.reduce((sum, shift) => (shift.shiftDate >= weekStart && shift.shiftDate <= end ? sum + shift.takeHomeCents : sum), 0);
}

function hasShiftThrough(shifts: PaceShift[], weekStart: string, offset: number): boolean {
  const end = addDays(weekStart, offset);
  return shifts.some((shift) => shift.shiftDate >= weekStart && shift.shiftDate <= end);
}

function paceLine(deltaCents: number, today: string, offset: number): string {
  if (Math.abs(deltaCents) <= PACE_BAND_CENTS) return "Right on pace";
  if (deltaCents > 0) return `${speakMoney(deltaCents)} ahead of your usual week`;
  const day = WEEKDAY_NAMES[weekdayIndex(today)];
  const behind = `${speakMoney(-deltaCents)} behind your average ${day}-to-date`;
  if (offset >= 6) return `${behind}`;
  const next = WEEKDAY_NAMES[weekdayIndex(addDays(today, 1))];
  return `${behind}, a good ${next} catches you up`;
}

function goalPaceLine(progress: GoalProgress, takeHomeCents: number, offset: number): string | null {
  if (!progress.hasGoal || progress.goalCents == null) return null;
  if (progress.met) return `You hit ${speakMoney(progress.goalCents)}`;
  const elapsed = offset + 1;
  const projected = roundDivSigned(takeHomeCents * 7, elapsed);
  if (projected >= progress.goalCents) return `On track to hit ${speakMoney(progress.goalCents)}`;
  return `Behind the pace for ${speakMoney(progress.goalCents)}`;
}
