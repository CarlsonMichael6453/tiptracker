import { buildInsights, type InsightShift } from "../src/insights/insights";

const CUTOFF = 16 * 60;
const THRESHOLD = 8 * 60;

function shift(partial: Partial<InsightShift> & Pick<InsightShift, "shiftDate" | "durationMinutes" | "takeHomeCents">): InsightShift {
  return {
    roleName: "Server",
    startMinutes: null,
    mealOverride: null,
    doubleOverride: null,
    ...partial,
  };
}

function repeat(
  date: string,
  count: number,
  minutes: number,
  takeHomeCents: number,
  extra: Partial<InsightShift> = {},
): InsightShift[] {
  return Array.from({ length: count }, () => shift({ shiftDate: date, durationMinutes: minutes, takeHomeCents, ...extra }));
}

describe("insights templates", () => {
  test("no shifts", () => {
    const lines = buildInsights({
      rangeKind: "month",
      rangePhrase: "this month",
      shifts: [],
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
    });
    expect(lines).toEqual([{ id: "empty", text: "No shifts in this period." }]);
  });

  test("week recap does not rank a single week", () => {
    const lines = buildInsights({
      rangeKind: "week",
      rangePhrase: "this week",
      shifts: [
        shift({ shiftDate: "2026-11-11", durationMinutes: 360, takeHomeCents: 18550 }),
        shift({ shiftDate: "2026-11-12", durationMinutes: 360, takeHomeCents: 18550 }),
        shift({ shiftDate: "2026-11-13", durationMinutes: 360, takeHomeCents: 18550 }),
        shift({ shiftDate: "2026-11-14", durationMinutes: 300, takeHomeCents: 18550 }),
      ],
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
    });
    expect(lines.map((line) => line.id)).toEqual(["week-recap"]);
    expect(lines[0]?.text).toBe(
      "This week: 4 shifts, 23 hours, $742.00 take-home, $32.26 an hour. Day and meal rankings need several of the same kind of shift. Open Month or All time once they’re logged.",
    );
  });

  test("not enough meals names the closest miss", () => {
    const shifts = [
      ...repeat("2026-03-06", 1, 240, 10000, { mealOverride: "lunch" }),
      ...repeat("2026-03-06", 6, 240, 10000, { mealOverride: "dinner" }),
    ];
    const lines = buildInsights({
      rangeKind: "month",
      rangePhrase: "this month",
      shifts,
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
      previousShifts: [],
    });
    expect(lines.map((line) => line.id)).toEqual(["meal-not-enough"]);
    expect(lines[0]?.text).toBe(
      "Not enough lunches to compare meals yet (1 lunch, 6 dinners). Insights waits for at least 3 of each.",
    );
  });

  test("best day", () => {
    const shifts = [
      ...repeat("2026-03-06", 5, 60, 3840),
      ...repeat("2026-03-03", 4, 60, 3230),
    ];
    const lines = buildInsights({
      rangeKind: "month",
      rangePhrase: "this month",
      shifts,
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
      previousShifts: [],
    });
    const best = lines.find((line) => line.id === "best-day");
    expect(best?.text).toBe(
      "Friday is your best day this month: $38.40 an hour across 5 shifts, about $6.10 more than Tuesday (4 shifts).",
    );
  });

  test("tie", () => {
    const shifts = [
      ...repeat("2026-03-06", 3, 60, 3420),
      ...repeat("2026-03-07", 3, 60, 3360),
    ];
    const lines = buildInsights({
      rangeKind: "month",
      rangePhrase: "this month",
      shifts,
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
      previousShifts: [],
    });
    const tie = lines.find((line) => line.id === "weekday-tie");
    expect(tie?.text).toBe("Friday and Saturday are about the same this month: $34.20 and $33.60 an hour.");
  });

  test("doubles / all-day worth it on the hourly rate", () => {
    const shifts = [
      ...repeat("2026-03-06", 3, 600, 37500),
      ...repeat("2026-03-06", 9, 240, 12400),
    ];
    const lines = buildInsights({
      rangeKind: "month",
      rangePhrase: "this month",
      shifts,
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
      previousShifts: [],
    });
    expect(lines.map((line) => line.id)).toContain("double-worth-it");
    expect(lines.find((line) => line.id === "double-worth-it")?.text).toBe(
      "Doubles / all-day were worth it on the hourly rate this month: $37.50 an hour (3 doubles / all-day) vs $31.00 (9 singles). A double / all-day also brought home more per shift ($375.00 vs $124.00).",
    );
  });

  test("doubles / all-day weaker per hour", () => {
    const shifts = [
      ...repeat("2026-03-06", 2, 600, 29500),
      ...repeat("2026-03-06", 8, 240, 13600),
    ];
    const lines = buildInsights({
      rangeKind: "month",
      rangePhrase: "this month",
      shifts,
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
      previousShifts: [],
    });
    expect(lines.find((line) => line.id === "double-weaker")?.text).toBe(
      "Doubles / all-day brought home more per shift ($295.00 vs $136.00) but less per hour ($29.50 vs $34.00, 2 doubles / all-day and 8 singles). The extra hours were the weaker hours.",
    );
  });

  test("exactly 8 hours is not a double / all-day", () => {
    const shifts = [
      ...repeat("2026-03-06", 2, 480, 20000),
      ...repeat("2026-03-06", 3, 240, 8000),
    ];
    const lines = buildInsights({
      rangeKind: "month",
      rangePhrase: "this month",
      shifts,
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
      previousShifts: [],
    });
    expect(lines.some((line) => line.id === "double-worth-it" || line.id === "double-weaker")).toBe(false);
    expect(lines.some((line) => line.id === "double-not-enough")).toBe(true);
  });

  test("all-time best day names the first shift’s range", () => {
    const shifts = [
      ...repeat("2026-03-06", 5, 60, 3680),
      ...repeat("2026-03-08", 5, 60, 3010),
    ];
    const lines = buildInsights({
      rangeKind: "all",
      rangePhrase: "since Mar 6, 2026",
      shifts,
      lunchCutoffMinutes: CUTOFF,
      doubleThresholdMinutes: THRESHOLD,
      last28: [],
      prior28: [],
    });
    expect(lines.find((line) => line.id === "best-day")?.text).toBe(
      "Since Mar 6, 2026, Friday has paid best: $36.80 an hour across 5 shifts, ahead of Sunday at $30.10 (5 shifts).",
    );
  });
});
