import { addDays, daysInclusive, isCivilDate, weekRange, MONTH_SHORT } from "./dates";
import { roundDiv } from "./money";
import { speakMoney } from "./tipJar";

export type GoalHorizon = "short" | "long";
export type GoalStatus = "active" | "complete" | "archived";
export type GoalEntryKind = "set_aside" | "add" | "withdraw" | "adjust" | "skip";

export type GoalEntryLike = {
  kind: GoalEntryKind;
  amountCents: number;
  weekStart: string | null;
};

/** About three months. A nearer target date suggests short-term. The person still chooses. */
export const SHORT_TERM_DAYS = 92;

export type GoalProgress = {
  savedCents: number;
  targetCents: number;
  fill: number;
  percent: number;
  remainingCents: number;
  met: boolean;
};

export type GoalPace = {
  weeklyNeededCents: number | null;
  onTrack: boolean | null;
  paceLine: string | null;
  trackLine: string | null;
};

export function suggestHorizon(targetDate: string | null, today: string): GoalHorizon | null {
  if (!targetDate || !isCivilDate(targetDate) || !isCivilDate(today)) return null;
  const days = daysInclusive(today, targetDate) - 1;
  return days <= SHORT_TERM_DAYS ? "short" : "long";
}

export function goalFill(savedCents: number, targetCents: number): GoalProgress {
  const saved = Math.max(0, savedCents);
  const target = Math.max(0, targetCents);
  const met = target > 0 && saved >= target;
  const remainingCents = Math.max(0, target - saved);
  const fill = target <= 0 || saved <= 0 ? 0 : Math.min(1, saved / target);
  const percent = target <= 0 ? 0 : Math.min(100, Math.round((saved / target) * 100));
  return { savedCents: saved, targetCents: target, fill, percent, remainingCents, met };
}

/** How many week-starts from this week through the target date's week, inclusive. */
export function weeksUntil(today: string, targetDate: string, weekStartsOn: number): number {
  if (targetDate < today) return 0;
  const start = weekRange(today, weekStartsOn).start;
  const end = weekRange(targetDate, weekStartsOn).start;
  return Math.max(1, (daysInclusive(start, end) - 1) / 7 + 1);
}

export function goalPace(input: {
  savedCents: number;
  targetCents: number;
  targetDate: string | null;
  today: string;
  weekStartsOn: number;
  weeklySetAsideCents: number;
}): GoalPace {
  const progress = goalFill(input.savedCents, input.targetCents);
  if (progress.met) {
    return { weeklyNeededCents: 0, onTrack: true, paceLine: "Goal reached", trackLine: null };
  }
  if (!input.targetDate || !isCivilDate(input.targetDate)) {
    return { weeklyNeededCents: null, onTrack: null, paceLine: null, trackLine: null };
  }
  if (input.targetDate < input.today) {
    return {
      weeklyNeededCents: null,
      onTrack: false,
      paceLine: `The date has passed. ${speakMoney(progress.remainingCents)} still to go.`,
      trackLine: null,
    };
  }
  const weeks = weeksUntil(input.today, input.targetDate, input.weekStartsOn);
  const weeklyNeededCents = roundDiv(progress.remainingCents, weeks);
  const onTrack = input.weeklySetAsideCents >= weeklyNeededCents;
  return {
    weeklyNeededCents,
    onTrack,
    paceLine: `About ${speakMoney(weeklyNeededCents)}/week to hit it by ${shortDate(input.targetDate)}`,
    trackLine: onTrack ? "This week’s set-aside is on track" : "Set-aside is short of that pace",
  };
}

export function nextBalance(savedCents: number, kind: GoalEntryKind, amountCents: number): number {
  const saved = Math.max(0, savedCents);
  if (kind === "skip") return saved;
  if (kind === "withdraw") return Math.max(0, saved - Math.abs(amountCents));
  if (kind === "adjust") return Math.max(0, saved + amountCents);
  return saved + Math.abs(amountCents);
}

export function setAsidePending(entries: GoalEntryLike[], weekStart: string, weeklySetAsideCents: number, status: GoalStatus): boolean {
  if (status !== "active" || weeklySetAsideCents <= 0) return false;
  return !entries.some((entry) => entry.weekStart === weekStart && (entry.kind === "set_aside" || entry.kind === "skip"));
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const now = new Date();
  const label = `${MONTH_SHORT[m - 1]} ${d}`;
  return y === now.getUTCFullYear() ? label : `${label}, ${y}`;
}

export function currentWeekStart(today: string, weekStartsOn: number): string {
  return weekRange(today, weekStartsOn).start;
}

export function addDaysIso(iso: string, days: number): string {
  return addDays(iso, days);
}
