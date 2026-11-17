import { resolveDouble, resolveMeal, type Meal } from "../calc/classify";
import { formatClock, formatHoursPhrase, formatMoney } from "../calc/format";
import { centsPerHour, roundDiv, roundDivSigned } from "../calc/money";

export type InsightRangeKind = "week" | "month" | "all" | "custom";

export type InsightShift = {
  shiftDate: string;
  durationMinutes: number;
  takeHomeCents: number;
  roleName: string;
  startMinutes: number | null;
  mealOverride: Meal | null;
  doubleOverride: 0 | 1 | null;
};

export type InsightRequest = {
  rangeKind: InsightRangeKind;
  /** Inclusive length of a custom range. Month rules start at 21 days. */
  customDayCount?: number;
  /** "this week", "this month", "since Mar 2, 2026", "from Mar 2 to Apr 2, 2026". */
  rangePhrase: string;
  shifts: InsightShift[];
  lunchCutoffMinutes: number;
  doubleThresholdMinutes: number;
  /** Previous calendar month. Used for a month trend. */
  previousShifts?: InsightShift[];
  /** Latest 28 days and the 28 before, for an all-time trend. */
  last28?: InsightShift[];
  prior28?: InsightShift[];
};

export type InsightLine = {
  id: string;
  text: string;
};

type Agg = {
  count: number;
  minutes: number;
  takeHome: number;
  realHourly: number | null;
  avgTakeHome: number | null;
};

function agg(shifts: InsightShift[]): Agg {
  const count = shifts.length;
  const minutes = shifts.reduce((sum, shift) => sum + shift.durationMinutes, 0);
  const takeHome = shifts.reduce((sum, shift) => sum + shift.takeHomeCents, 0);
  return {
    count,
    minutes,
    takeHome,
    realHourly: centsPerHour(takeHome, minutes),
    avgTakeHome: count === 0 ? null : roundDivSigned(takeHome, count),
  };
}

/** Tie when the gap is under max($1.00, 5% of the lower rate). */
export function ratesTie(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  const lower = Math.min(a, b);
  const five = lower > 0 ? roundDiv(lower * 5, 100) : 0;
  return diff < Math.max(100, five);
}

function monthRules(req: InsightRequest): boolean {
  if (req.rangeKind === "month" || req.rangeKind === "all") return true;
  if (req.rangeKind === "custom") return (req.customDayCount ?? 0) >= 21;
  return false;
}

function cap(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function rate(cents: number): string {
  return `${formatMoney(cents)} an hour`;
}

type Group = { key: string; shifts: InsightShift[] };

function byKey(shifts: InsightShift[], keyOf: (shift: InsightShift) => string): Group[] {
  const map = new Map<string, InsightShift[]>();
  for (const shift of shifts) {
    const key = keyOf(shift);
    const list = map.get(key);
    if (list) list.push(shift);
    else map.set(key, [shift]);
  }
  return [...map.entries()].map(([key, group]) => ({ key, shifts: group }));
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekdayName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const index = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return WEEKDAY[index] ?? "Day";
}

export function buildInsights(req: InsightRequest): InsightLine[] {
  if (req.shifts.length === 0) {
    return [{ id: "empty", text: "No shifts in this period." }];
  }

  const claims: InsightLine[] = [];
  const misses: { order: number; shortfall: number; line: InsightLine }[] = [];
  const long = monthRules(req);

  if (long) {
    const weekday = weekdayInsight(req);
    if (weekday.claim) claims.push(weekday.claim);
    else if (weekday.miss) misses.push({ order: 0, shortfall: weekday.miss.shortfall, line: weekday.miss.line });
  }

  const meal = mealInsight(req);
  if (meal.claim) claims.push(meal.claim);
  else if (meal.miss) misses.push({ order: 1, shortfall: meal.miss.shortfall, line: meal.miss.line });

  const doubles = doubleInsight(req);
  if (doubles.claim) claims.push(doubles.claim);
  else if (doubles.miss) misses.push({ order: 2, shortfall: doubles.miss.shortfall, line: doubles.miss.line });

  if (req.rangeKind === "month" || req.rangeKind === "all") {
    const trend = trendInsight(req);
    if (trend.claim) claims.push(trend.claim);
    else if (trend.miss) misses.push({ order: 3, shortfall: trend.miss.shortfall, line: trend.miss.line });
  }

  const role = roleInsight(req);
  if (role.claim) claims.push(role.claim);
  else if (role.miss) misses.push({ order: 4, shortfall: role.miss.shortfall, line: role.miss.line });

  let capped = claims;
  if (capped.length >= 5) {
    capped = capped.filter((line) => !line.id.startsWith("role"));
  }
  capped = capped.slice(0, 4);

  const lines: InsightLine[] = [];
  if (!long) lines.push(weekRecap(req, capped.length === 0));
  lines.push(...capped);

  let showedMealMiss = false;
  if (capped.length === 0 && long) {
    misses.sort((a, b) => a.shortfall - b.shortfall || a.order - b.order);
    if (misses[0]) {
      lines.push(misses[0].line);
      showedMealMiss = misses[0].line.id.startsWith("meal");
    }
  }

  const showedMeal = capped.some((line) => line.id.startsWith("meal")) || showedMealMiss;
  if (meal.footnote && showedMeal) lines.push(meal.footnote);

  return lines;
}

function weekRecap(req: InsightRequest, explain: boolean): InsightLine {
  const totals = agg(req.shifts);
  const hourly = totals.realHourly == null ? "—" : rate(totals.realHourly);
  const lead = `${cap(req.rangePhrase)}: ${plural(totals.count, "shift", "shifts")}, ${formatHoursPhrase(totals.minutes)}, ${formatMoney(totals.takeHome)} take-home, ${hourly}.`;
  if (!explain) return { id: "week-recap-short", text: lead };
  return {
    id: "week-recap",
    text: `${lead} Day and meal rankings need several of the same kind of shift. Open Month or All time once they’re logged.`,
  };
}

function weekdayInsight(req: InsightRequest): {
  claim: InsightLine | null;
  miss: { shortfall: number; line: InsightLine } | null;
} {
  const groups = byKey(req.shifts, (shift) => weekdayName(shift.shiftDate))
    .map((group) => ({ ...group, totals: agg(group.shifts) }))
    .filter((group) => group.totals.realHourly != null && group.totals.count > 0);
  const qualified = groups.filter((group) => group.totals.count >= 3 && group.totals.realHourly != null);
  const ranked = [...groups].sort((a, b) => b.totals.count - a.totals.count);
  const first = ranked[0]?.totals.count ?? 0;
  const second = ranked[1]?.totals.count ?? 0;
  const shortfall = Math.max(0, 3 - first) + Math.max(0, 3 - second);
  if (qualified.length < 2) {
    const detail = groups
      .sort((a, b) => b.totals.count - a.totals.count)
      .slice(0, 3)
      .map((group) => `${group.key} ${group.totals.count}`)
      .join(", ");
    const extra = detail ? ` (${detail})` : "";
    return {
      claim: null,
      miss: {
        shortfall: Math.max(shortfall, 1),
        line: {
          id: "weekday-not-enough",
          text: `Not enough shifts on different days to rank weekdays yet${extra}. Insights waits for at least 3 shifts on each of two weekdays.`,
        },
      },
    };
  }

  const byRate = [...qualified].sort((a, b) => (b.totals.realHourly ?? 0) - (a.totals.realHourly ?? 0));
  const leader = byRate[0];
  const tied = byRate.filter((group) => ratesTie(group.totals.realHourly ?? 0, leader.totals.realHourly ?? 0));
  if (tied.length >= 2) {
    const names = tied.map((group) => group.key);
    const label = names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    const rates = tied.map((group) => formatMoney(group.totals.realHourly ?? 0)).join(" and ");
    const same = tied.length === 2 ? rates : tied.map((group) => formatMoney(group.totals.realHourly ?? 0)).join(", ");
    return {
      claim: {
        id: "weekday-tie",
        text: `${label} are about the same ${req.rangePhrase}: ${same} an hour.`,
      },
      miss: null,
    };
  }

  const runner = byRate[1];
  const leaderRate = leader.totals.realHourly ?? 0;
  const runnerRate = runner.totals.realHourly ?? 0;
  const higherTakeHome = groups
    .filter((group) => group.key !== leader.key && group.totals.count > 0 && group.totals.avgTakeHome != null)
    .filter((group) => group.totals.takeHome * leader.totals.count > leader.totals.takeHome * group.totals.count)
    .sort(
      (a, b) =>
        b.totals.takeHome * a.totals.count - a.totals.takeHome * b.totals.count,
    )[0];

  if (higherTakeHome && higherTakeHome.totals.avgTakeHome != null && leader.totals.avgTakeHome != null) {
    return {
      claim: {
        id: "best-day-take-home",
        text: `Per hour, ${leader.key} paid best ${req.rangePhrase} (${rate(leaderRate)}, ${plural(leader.totals.count, "shift", "shifts")}). ${higherTakeHome.key} still brought home more per shift (${formatMoney(higherTakeHome.totals.avgTakeHome)} vs ${formatMoney(leader.totals.avgTakeHome)}) because those shifts were longer.`,
      },
      miss: null,
    };
  }

  const steadier = leader.totals.count * 2 < runner.totals.count && runner.totals.count >= 6;
  if (steadier) {
    return {
      claim: {
        id: "best-day-steadier",
        text: `${leader.key} is highest ${req.rangePhrase} at ${rate(leaderRate)}, from ${plural(leader.totals.count, "shift", "shifts")}. ${runner.key} has ${plural(runner.totals.count, "shift", "shifts")} at ${rate(runnerRate)} and is the steadier result.`,
      },
      miss: null,
    };
  }

  const ahead = leaderRate - runnerRate;
  if (req.rangeKind === "all") {
    return {
      claim: {
        id: "best-day",
        text: `${cap(req.rangePhrase)}, ${leader.key} has paid best: ${rate(leaderRate)} across ${plural(leader.totals.count, "shift", "shifts")}, ahead of ${runner.key} at ${formatMoney(runnerRate)} (${plural(runner.totals.count, "shift", "shifts")}).`,
      },
      miss: null,
    };
  }
  return {
    claim: {
      id: "best-day",
      text: `${leader.key} is your best day ${req.rangePhrase}: ${rate(leaderRate)} across ${plural(leader.totals.count, "shift", "shifts")}, about ${formatMoney(ahead)} more than ${runner.key} (${plural(runner.totals.count, "shift", "shifts")}).`,
    },
    miss: null,
  };
}

function classifyMeal(shift: InsightShift, cutoff: number): Meal | "unknown" {
  return resolveMeal({
    mealOverride: shift.mealOverride,
    startMinutes: shift.startMinutes,
    lunchCutoffMinutes: cutoff,
  });
}

function mealInsight(req: InsightRequest): {
  claim: InsightLine | null;
  miss: { shortfall: number; line: InsightLine } | null;
  footnote: InsightLine | null;
} {
  let lunch: InsightShift[] = [];
  let dinner: InsightShift[] = [];
  let unknown = 0;
  for (const shift of req.shifts) {
    const meal = classifyMeal(shift, req.lunchCutoffMinutes);
    if (meal === "lunch") lunch.push(shift);
    else if (meal === "dinner") dinner.push(shift);
    else unknown += 1;
  }
  const footnote =
    unknown > 0
      ? {
          id: "meal-footnote",
          text:
            unknown === 1
              ? "1 shift had no start time and wasn’t counted as lunch or dinner."
              : `${unknown} shifts had no start time and weren’t counted as lunch or dinner.`,
        }
      : null;
  const cutoff = formatClock(req.lunchCutoffMinutes);
  const known = lunch.length + dinner.length;

  if (known > 0 && (lunch.length === 0 || dinner.length === 0)) {
    const dinnerSide = dinner.length > 0;
    const which = dinnerSide ? "dinners" : "lunches";
    const one = dinnerSide ? "dinner" : "lunch";
    const side = dinnerSide ? `start at ${cutoff} or later` : `start before ${cutoff}`;
    const other = dinnerSide ? "lunch" : "dinner";
    const lead =
      known === 1
        ? `The only shift ${req.rangePhrase} was a ${one} (${side}).`
        : `All ${known} shifts ${req.rangePhrase} were ${which} (${side}).`;
    return {
      claim: {
        id: "meal-all-one",
        text: `${lead} There’s no ${other} comparison. Change the lunch cutoff in Settings if a shift landed on the wrong side.`,
      },
      miss: null,
      footnote,
    };
  }

  if (lunch.length >= 3 && dinner.length >= 3) {
    const l = agg(lunch);
    const d = agg(dinner);
    const lRate = l.realHourly ?? 0;
    const dRate = d.realHourly ?? 0;
    if (ratesTie(lRate, dRate)) {
      return {
        claim: {
          id: "meal-tie",
          text: `Lunch and dinner paid about the same ${req.rangePhrase}: ${rate(lRate)} and ${rate(dRate)}. Lunch is a start before ${cutoff}.`,
        },
        miss: null,
        footnote,
      };
    }
    const dinnerWins = dRate > lRate;
    const winner = dinnerWins ? "Dinner" : "Lunch";
    const loser = dinnerWins ? "lunch" : "dinner";
    const wRate = dinnerWins ? dRate : lRate;
    const lRateShown = dinnerWins ? lRate : dRate;
    const wCount = dinnerWins ? d.count : l.count;
    const lCount = dinnerWins ? l.count : d.count;
    return {
      claim: {
        id: "meal",
        text: `${winner} paid more per hour ${req.rangePhrase} than ${loser}: ${formatMoney(wRate)} (${plural(wCount, "shift", "shifts")}) vs ${formatMoney(lRateShown)} (${plural(lCount, "shift", "shifts")}). Lunch is a start before ${cutoff}.`,
      },
      miss: null,
      footnote,
    };
  }

  const shortfall = Math.max(0, 3 - lunch.length) + Math.max(0, 3 - dinner.length);
  const lunchWord = lunch.length === 1 ? "lunch" : "lunches";
  const dinnerWord = dinner.length === 1 ? "dinner" : "dinners";
  let text: string;
  if (lunch.length < 3 && dinner.length >= 3) {
    text = `Not enough lunches to compare meals yet (${lunch.length} ${lunchWord}, ${dinner.length} ${dinnerWord}). Insights waits for at least 3 of each.`;
  } else if (dinner.length < 3 && lunch.length >= 3) {
    text = `Not enough dinners to compare meals yet (${lunch.length} ${lunchWord}, ${dinner.length} ${dinnerWord}). Insights waits for at least 3 of each.`;
  } else if (known === 0) {
    text = `No shifts ${req.rangePhrase} have a start time or a meal marked, so there’s no lunch comparison.`;
  } else {
    text = `Not enough lunches or dinners to compare meals yet (${lunch.length} ${lunchWord}, ${dinner.length} ${dinnerWord}). Insights waits for at least 3 of each.`;
  }
  return {
    claim: null,
    miss: { shortfall: Math.max(shortfall, 1), line: { id: "meal-not-enough", text } },
    footnote,
  };
}

function doubleInsight(req: InsightRequest): {
  claim: InsightLine | null;
  miss: { shortfall: number; line: InsightLine } | null;
} {
  const doubles: InsightShift[] = [];
  const singles: InsightShift[] = [];
  for (const shift of req.shifts) {
    const length = resolveDouble({
      doubleOverride: shift.doubleOverride,
      durationMinutes: shift.durationMinutes,
      doubleThresholdMinutes: req.doubleThresholdMinutes,
    });
    if (length === "double") doubles.push(shift);
    else singles.push(shift);
  }
  if (doubles.length >= 2 && singles.length >= 3) {
    const d = agg(doubles);
    const s = agg(singles);
    const dRate = d.realHourly ?? 0;
    const sRate = s.realHourly ?? 0;
    const dAvg = d.avgTakeHome ?? 0;
    const sAvg = s.avgTakeHome ?? 0;
    const counts = `${plural(d.count, "double / all-day", "doubles / all-day")} and ${plural(s.count, "single", "singles")}`;
    if (ratesTie(dRate, sRate)) {
      if (d.takeHome * s.count > s.takeHome * d.count) {
        return {
          claim: {
            id: "double-tie-longer",
            text: `The hourly rate for doubles / all-day and singles was about the same ${req.rangePhrase} (${rate(dRate)} vs ${rate(sRate)}). A double / all-day pays more per shift (${formatMoney(dAvg)} vs ${formatMoney(sAvg)}) because it is longer.`,
          },
          miss: null,
        };
      }
      return {
        claim: {
          id: "double-tie",
          text: `The hourly rate for doubles / all-day and singles was about the same ${req.rangePhrase} (${rate(dRate)} vs ${rate(sRate)}, ${counts}).`,
        },
        miss: null,
      };
    }
    if (dRate > sRate) {
      const more = d.takeHome * s.count > s.takeHome * d.count;
      const less = d.takeHome * s.count < s.takeHome * d.count;
      const tail = more
        ? ` A double / all-day also brought home more per shift (${formatMoney(dAvg)} vs ${formatMoney(sAvg)}).`
        : less
          ? ` A double / all-day brought home less per shift (${formatMoney(dAvg)} vs ${formatMoney(sAvg)}).`
          : "";
      return {
        claim: {
          id: "double-worth-it",
          text: `Doubles / all-day were worth it on the hourly rate ${req.rangePhrase}: ${rate(dRate)} (${plural(d.count, "double / all-day", "doubles / all-day")}) vs ${formatMoney(sRate)} (${plural(s.count, "single", "singles")}).${tail}`,
        },
        miss: null,
      };
    }
    const more = d.takeHome * s.count > s.takeHome * d.count;
    const verb = more ? "more" : "less";
    const joiner = more ? "but" : "and";
    return {
      claim: {
        id: "double-weaker",
        text: `Doubles / all-day brought home ${verb} per shift (${formatMoney(dAvg)} vs ${formatMoney(sAvg)}) ${joiner} less per hour (${formatMoney(dRate)} vs ${formatMoney(sRate)}, ${counts}). The extra hours were the weaker hours.`,
      },
      miss: null,
    };
  }

  const shortfall = Math.max(0, 2 - doubles.length) + Math.max(0, 3 - singles.length);
  let text: string;
  if (doubles.length === 0) {
    text = `No doubles / all-day ${req.rangePhrase}, so Insights won’t say whether doubles are worth it yet. It waits for 2 doubles and 3 singles.`;
  } else if (doubles.length === 1) {
    text = `Only 1 double / all-day ${req.rangePhrase}, so Insights won’t say whether doubles are worth it yet. It waits for 2 doubles and 3 singles.`;
  } else if (doubles.length < 2) {
    text = `Only ${doubles.length} doubles / all-day ${req.rangePhrase}, so Insights won’t say whether doubles are worth it yet. It waits for 2 doubles and 3 singles.`;
  } else {
    text = `Only ${plural(singles.length, "single", "singles")} ${req.rangePhrase}, so Insights won’t say whether doubles are worth it yet. It waits for 2 doubles and 3 singles.`;
  }
  return {
    claim: null,
    miss: { shortfall: Math.max(shortfall, 1), line: { id: "double-not-enough", text } },
  };
}

function trendInsight(req: InsightRequest): {
  claim: InsightLine | null;
  miss: { shortfall: number; line: InsightLine } | null;
} {
  const current = req.rangeKind === "all" ? (req.last28 ?? []) : req.shifts;
  const previous = req.rangeKind === "all" ? (req.prior28 ?? []) : (req.previousShifts ?? []);
  const cur = agg(current);
  const prev = agg(previous);
  const shortfall = Math.max(0, 4 - cur.count) + Math.max(0, 4 - prev.count);
  if (cur.count < 4 || prev.count < 4 || cur.realHourly == null || prev.realHourly == null) {
    const text =
      req.rangeKind === "all"
        ? `Not enough shifts to compare the last 28 days yet (${cur.count} in the last 28 days, ${prev.count} in the 28 days before). Insights waits for at least 4 in each.`
        : `Not enough shifts to compare with last month yet (${cur.count} this month, ${prev.count} last month). Insights waits for at least 4 in each.`;
    return { claim: null, miss: { shortfall: Math.max(shortfall, 1), line: { id: "trend-not-enough", text } } };
  }
  if (ratesTie(cur.realHourly, prev.realHourly)) {
    const text =
      req.rangeKind === "all"
        ? `Your real hourly over the last 28 days (${formatMoney(cur.realHourly)}) is about the same as the 28 days before (${formatMoney(prev.realHourly)}).`
        : `Your real hourly ${req.rangePhrase} (${formatMoney(cur.realHourly)}) is about the same as last month (${formatMoney(prev.realHourly)}).`;
    return { claim: { id: "trend-flat", text }, miss: null };
  }
  const up = cur.realHourly > prev.realHourly;
  const diff = Math.abs(cur.realHourly - prev.realHourly);
  const word = up ? "up" : "down";
  const text =
    req.rangeKind === "all"
      ? `Over the last 28 days your real hourly is ${formatMoney(cur.realHourly)}, ${word} ${formatMoney(diff)} from the 28 days before (${cur.count} shifts vs ${prev.count}).`
      : `Your real hourly ${req.rangePhrase} is ${formatMoney(cur.realHourly)}, ${word} ${formatMoney(diff)} from last month (${cur.count} shifts vs ${prev.count}).`;
  return { claim: { id: up ? "trend-up" : "trend-down", text }, miss: null };
}

function roleInsight(req: InsightRequest): {
  claim: InsightLine | null;
  miss: { shortfall: number; line: InsightLine } | null;
} {
  const groups = byKey(req.shifts, (shift) => shift.roleName.trim() || "Role").map((group) => ({
    ...group,
    totals: agg(group.shifts),
  }));
  const qualified = groups.filter((group) => group.totals.count >= 3 && group.totals.realHourly != null);
  if (groups.length < 2) {
    return {
      claim: null,
      miss: {
        shortfall: 3,
        line: {
          id: "role-not-enough",
          text: `Only one role ${req.rangePhrase}, so there’s no role comparison yet.`,
        },
      },
    };
  }
  if (qualified.length < 2) {
    const ranked = [...groups].sort((a, b) => b.totals.count - a.totals.count);
    const shortfall = Math.max(0, 3 - (ranked[0]?.totals.count ?? 0)) + Math.max(0, 3 - (ranked[1]?.totals.count ?? 0));
    const detail = groups
      .map((group) => `${group.key} ${group.totals.count}`)
      .join(", ");
    return {
      claim: null,
      miss: {
        shortfall: Math.max(shortfall, 1),
        line: {
          id: "role-not-enough",
          text: `Not enough shifts to compare roles yet (${detail}). Insights waits for at least 3 shifts in each of two roles.`,
        },
      },
    };
  }
  const byRate = [...qualified].sort((a, b) => (b.totals.realHourly ?? 0) - (a.totals.realHourly ?? 0));
  const first = byRate[0];
  const second = byRate[1];
  if (ratesTie(first.totals.realHourly ?? 0, second.totals.realHourly ?? 0)) {
    return {
      claim: {
        id: "role-tie",
        text: `${first.key} and ${second.key} shifts paid about the same ${req.rangePhrase}: ${rate(first.totals.realHourly ?? 0)} and ${rate(second.totals.realHourly ?? 0)}.`,
      },
      miss: null,
    };
  }
  return {
    claim: {
      id: "role",
      text: `${first.key} shifts paid ${rate(first.totals.realHourly ?? 0)} ${req.rangePhrase} (${plural(first.totals.count, "shift", "shifts")}). ${second.key} shifts paid ${rate(second.totals.realHourly ?? 0)} (${plural(second.totals.count, "shift", "shifts")}).`,
    },
    miss: null,
  };
}
