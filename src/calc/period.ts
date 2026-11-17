import { WEEKDAY_NAMES, weekdayIndex, weekdayOrder } from "./dates";
import { centsPerHour, roundDivSigned } from "./money";

export type PeriodShift = {
  shiftDate: string;
  createdAt?: string;
  durationMinutes: number;
  wageEarningsCents: number;
  guestTipsCents: number;
  tipShareCents: number;
  tipOutTotalCents: number;
  netTipsCents: number;
  takeHomeCents: number;
  tipOutLines: { label: string | null; amountCents: number }[];
  tipShareLines: { label: string | null; amountCents: number }[];
};

export type PeriodTotals = {
  shifts: number;
  minutes: number;
  wageEarningsCents: number;
  guestTipsCents: number;
  tipShareCents: number;
  tipsCents: number;
  tipOutCents: number;
  netTipsCents: number;
  takeHomeCents: number;
  realHourlyCents: number | null;
  tipsPerHourCents: number | null;
};

export type WeekdayRow = {
  weekday: number;
  name: string;
  shifts: number;
  minutes: number;
  takeHomeCents: number;
  avgTakeHomeCents: number | null;
  realHourlyCents: number | null;
};

export type PersonTotal = {
  label: string;
  amountCents: number;
};

export function periodTotals(shifts: PeriodShift[]): PeriodTotals {
  const totals = shifts.reduce(
    (acc, shift) => {
      acc.minutes += shift.durationMinutes;
      acc.wageEarningsCents += shift.wageEarningsCents;
      acc.guestTipsCents += shift.guestTipsCents;
      acc.tipShareCents += shift.tipShareCents;
      acc.tipOutCents += shift.tipOutTotalCents;
      acc.netTipsCents += shift.netTipsCents;
      acc.takeHomeCents += shift.takeHomeCents;
      return acc;
    },
    {
      minutes: 0,
      wageEarningsCents: 0,
      guestTipsCents: 0,
      tipShareCents: 0,
      tipOutCents: 0,
      netTipsCents: 0,
      takeHomeCents: 0,
    },
  );
  return {
    shifts: shifts.length,
    ...totals,
    tipsCents: totals.guestTipsCents + totals.tipShareCents,
    realHourlyCents: centsPerHour(totals.takeHomeCents, totals.minutes),
    tipsPerHourCents: centsPerHour(totals.netTipsCents, totals.minutes),
  };
}

export function weekdayBreakdown(shifts: PeriodShift[], weekStartsOn: number): WeekdayRow[] {
  const buckets = weekdayOrder(weekStartsOn).map((weekday) => ({
    weekday,
    name: WEEKDAY_NAMES[weekday],
    shifts: [] as PeriodShift[],
  }));
  for (const shift of shifts) {
    const weekday = weekdayIndex(shift.shiftDate);
    const bucket = buckets.find((row) => row.weekday === weekday);
    if (bucket) bucket.shifts.push(shift);
  }
  return buckets.map((bucket) => {
    const minutes = bucket.shifts.reduce((sum, shift) => sum + shift.durationMinutes, 0);
    const takeHomeCents = bucket.shifts.reduce((sum, shift) => sum + shift.takeHomeCents, 0);
    const count = bucket.shifts.length;
    return {
      weekday: bucket.weekday,
      name: bucket.name,
      shifts: count,
      minutes,
      takeHomeCents,
      avgTakeHomeCents: count === 0 ? null : roundDivSigned(takeHomeCents, count),
      realHourlyCents: centsPerHour(takeHomeCents, minutes),
    };
  });
}

function personKey(label: string | null): string {
  if (label == null) return "";
  const trimmed = label.trim();
  return trimmed === "" ? "" : trimmed.toLowerCase();
}

function stamp(shift: PeriodShift): string {
  return `${shift.shiftDate}T${shift.createdAt ?? ""}`;
}

/**
 * Group money by trimmed, case-insensitive name.
 * Display uses the capitalization from the most recent line.
 * A null label, and a positive total with no lines, land in Unspecified.
 */
export function personTotals(
  shifts: PeriodShift[],
  kind: "tip_out" | "tip_share",
): PersonTotal[] {
  const map = new Map<string, { label: string; amountCents: number; stamp: string }>();
  const ordered = [...shifts].sort((a, b) => (stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : 0));
  for (const shift of ordered) {
    const lines = kind === "tip_out" ? shift.tipOutLines : shift.tipShareLines;
    const total = kind === "tip_out" ? shift.tipOutTotalCents : shift.tipShareCents;
    const entries =
      lines.length === 0 && total > 0
        ? [{ label: null as string | null, amountCents: total }]
        : lines;
    for (const line of entries) {
      if (line.amountCents === 0 && personKey(line.label) === "") continue;
      const key = personKey(line.label);
      const display = key === "" ? "Unspecified" : (line.label ?? "").trim();
      const current = map.get(key);
      if (!current) {
        map.set(key, { label: display, amountCents: line.amountCents, stamp: stamp(shift) });
      } else {
        current.amountCents += line.amountCents;
        if (stamp(shift) >= current.stamp && display !== "Unspecified") {
          current.label = display;
          current.stamp = stamp(shift);
        }
      }
    }
  }
  const rows = [...map.entries()].map(([key, value]) => ({
    key,
    label: value.label,
    amountCents: value.amountCents,
  }));
  rows.sort((a, b) => b.amountCents - a.amountCents || a.label.localeCompare(b.label));
  return rows
    .filter((row) => row.amountCents !== 0)
    .map(({ label, amountCents }) => ({ label, amountCents }));
}
