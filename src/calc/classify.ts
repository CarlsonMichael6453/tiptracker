export type Meal = "lunch" | "dinner";
export type LengthClass = "double" | "single";

export const DEFAULT_LUNCH_CUTOFF_MINUTES = 16 * 60;
export const DEFAULT_DOUBLE_THRESHOLD_MINUTES = 8 * 60;
export const DEFAULT_WEEK_STARTS_ON = 3;

export function resolveMeal(args: {
  mealOverride: Meal | null;
  startMinutes: number | null;
  lunchCutoffMinutes: number;
}): Meal | "unknown" {
  if (args.mealOverride) return args.mealOverride;
  if (args.startMinutes == null) return "unknown";
  return args.startMinutes < args.lunchCutoffMinutes ? "lunch" : "dinner";
}

/**
 * A double / all-day is strictly longer than the threshold.
 * Eight hours against an 8-hour threshold is a single.
 */
export function resolveDouble(args: {
  doubleOverride: 0 | 1 | null;
  durationMinutes: number;
  doubleThresholdMinutes: number;
}): LengthClass {
  if (args.doubleOverride === 1) return "double";
  if (args.doubleOverride === 0) return "single";
  return args.durationMinutes > args.doubleThresholdMinutes ? "double" : "single";
}

export function mealSource(args: {
  mealOverride: Meal | null;
  startMinutes: number | null;
}): "you marked this" | "from start time" | null {
  if (args.mealOverride) return "you marked this";
  if (args.startMinutes == null) return null;
  return "from start time";
}

export function doubleSource(doubleOverride: 0 | 1 | null): "you marked this" | "from length" {
  return doubleOverride == null ? "from length" : "you marked this";
}
