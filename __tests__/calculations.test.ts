import { DEFAULT_DOUBLE_THRESHOLD_MINUTES, DEFAULT_LUNCH_CUTOFF_MINUTES, resolveDouble, resolveMeal } from "../src/calc/classify";
import { addDays, defaultShiftDate, trailing28, weekRange, weekdayIndex } from "../src/calc/dates";
import { formatHoursPhrase, formatMoney, formatTipPercent } from "../src/calc/format";
import { clockDurationMinutes, parseDurationInput } from "../src/calc/hours";
import { parseMoney, roundDiv } from "../src/calc/money";
import { periodTotals, personTotals, weekdayBreakdown, type PeriodShift } from "../src/calc/period";
import { computeShift, tipOutLineAmount, wageEarnings, type ShiftCalcInput } from "../src/calc/shift";
import { validateShift, type ValidatableShift } from "../src/calc/validate";

const WAGE = 1650;

function serverDinner(overrides: Partial<ShiftCalcInput> = {}): ShiftCalcInput {
  return {
    durationMinutes: 390,
    wageCents: WAGE,
    tipsMode: "split",
    tipsTotalCents: null,
    cashTipsCents: 4000,
    cardTipsCents: 14000,
    salesCents: 120000,
    tipShareMode: "none",
    tipShareTotalCents: null,
    tipShareLines: [],
    tipOutLines: [{ label: null, kind: "percent_of_sales", basisPoints: 400, amountCents: null }],
    settlement: "cash",
    ...overrides,
  };
}

describe("rounding and hours", () => {
  test("roundDiv is half away from zero", () => {
    expect(roundDiv(1, 2)).toBe(1);
    expect(roundDiv(3333 * 400, 10000)).toBe(133);
    expect(roundDiv(120000 * 400, 10000)).toBe(4800);
    expect(roundDiv(65 * 60, 10)).toBe(390);
  });

  test("decimal 6.5 hours is 390 minutes", () => {
    expect(parseDurationInput("6.5", "")).toEqual({ ok: true, minutes: 390 });
    expect(parseDurationInput("6", "30")).toEqual({ ok: true, minutes: 390 });
  });

  test("clock times", () => {
    expect(clockDurationMinutes(16 * 60, 22 * 60 + 30)).toBe(390);
    expect(clockDurationMinutes(17 * 60, 30)).toBe(450);
    expect(clockDurationMinutes(17 * 60, 17 * 60)).toBeNull();
  });

  test("duration bounds", () => {
    expect(parseDurationInput("", "")).toEqual({ ok: false, problem: "blank" });
    expect(parseDurationInput("0", "")).toEqual({ ok: false, problem: "zero" });
    expect(parseDurationInput("0", "0")).toEqual({ ok: false, problem: "zero" });
    expect(parseDurationInput("24", "")).toEqual({ ok: true, minutes: 1440 });
    expect(parseDurationInput("25", "")).toEqual({ ok: false, problem: "over24" });
  });

  test("money rejects negatives and keeps cents", () => {
    expect(parseMoney("16.50")).toEqual({ status: "ok", cents: 1650 });
    expect(parseMoney("")).toEqual({ status: "blank" });
    expect(parseMoney("-1")).toEqual({ status: "negative" });
  });
});

describe("fixture A — server dinner, 4% of sales, tip-out paid in cash", () => {
  const snap = computeShift(serverDinner());

  test("hours, meal, and length", () => {
    expect(snap.durationMinutes).toBe(390);
    expect(formatHoursPhrase(390)).toBe("6.5 hours");
    const start = 16 * 60;
    expect(start).toBe(DEFAULT_LUNCH_CUTOFF_MINUTES);
    expect(resolveMeal({ mealOverride: null, startMinutes: start, lunchCutoffMinutes: DEFAULT_LUNCH_CUTOFF_MINUTES })).toBe("dinner");
    expect(resolveDouble({ doubleOverride: null, durationMinutes: 390, doubleThresholdMinutes: DEFAULT_DOUBLE_THRESHOLD_MINUTES })).toBe("single");
  });

  test("money", () => {
    expect(snap.wageEarningsCents).toBe(10725);
    expect(snap.guestTipsCents).toBe(18000);
    expect(snap.tipOutTotalCents).toBe(4800);
    expect(snap.netTipsCents).toBe(13200);
    expect(snap.takeHomeCents).toBe(23925);
    expect(snap.realHourlyCents).toBe(3681);
    expect(snap.tipsPerHourCents).toBe(2031);
    expect(snap.tipPercentTenths).toBe(150);
    expect(formatTipPercent(150)).toBe("15.0%");
    expect(formatMoney(23925)).toBe("$239.25");
  });

  test("cash tonight and paycheck", () => {
    expect(snap.cashSplit).toEqual({ cashLeftTonightCents: -800, paycheckCents: 24725 });
  });

  test("the same night taken from the paycheck", () => {
    const paycheck = computeShift(serverDinner({ settlement: "paycheck" }));
    expect(paycheck.takeHomeCents).toBe(23925);
    expect(paycheck.cashSplit).toEqual({ cashLeftTonightCents: 4000, paycheckCents: 19925 });
  });
});

describe("fixture B — flat tip-out, no sales", () => {
  const snap = computeShift(
    serverDinner({
      salesCents: null,
      tipOutLines: [
        { label: "Busser", kind: "flat", basisPoints: null, amountCents: 1500 },
        { label: "Bar", kind: "flat", basisPoints: null, amountCents: 1000 },
      ],
    }),
  );

  test("results", () => {
    expect(snap.tipOutTotalCents).toBe(2500);
    expect(snap.netTipsCents).toBe(15500);
    expect(snap.takeHomeCents).toBe(26225);
    expect(snap.realHourlyCents).toBe(4035);
    expect(snap.tipsPerHourCents).toBe(2385);
    expect(snap.tipPercentTenths).toBeNull();
  });
});

describe("fixture C — overnight, no tips", () => {
  test("7.5 hours stays on the start date’s weekday", () => {
    expect(clockDurationMinutes(17 * 60, 30)).toBe(450);
    expect(weekdayIndex("2025-11-14")).toBe(5);
    const snap = computeShift(
      serverDinner({
        durationMinutes: 450,
        tipsMode: "total",
        tipsTotalCents: 0,
        cashTipsCents: null,
        cardTipsCents: null,
        salesCents: null,
        tipOutLines: [],
      }),
    );
    expect(snap.wageEarningsCents).toBe(12375);
    expect(snap.takeHomeCents).toBe(12375);
    expect(snap.realHourlyCents).toBe(1650);
    expect(snap.tipsPerHourCents).toBe(0);
    expect(resolveMeal({ mealOverride: null, startMinutes: 17 * 60, lunchCutoffMinutes: DEFAULT_LUNCH_CUTOFF_MINUTES })).toBe("dinner");
  });
});

describe("fixture D — stiffed, percent of sales", () => {
  const snap = computeShift(
    serverDinner({
      durationMinutes: 300,
      tipsMode: "total",
      tipsTotalCents: 2000,
      cashTipsCents: null,
      cardTipsCents: null,
      salesCents: 87500,
    }),
  );

  test("negative net tips are kept", () => {
    expect(snap.tipOutTotalCents).toBe(3500);
    expect(snap.netTipsCents).toBe(-1500);
    expect(snap.wageEarningsCents).toBe(8250);
    expect(snap.takeHomeCents).toBe(6750);
    expect(snap.realHourlyCents).toBe(1350);
    expect(snap.tipsPerHourCents).toBe(-300);
  });
});

describe("fixture E — busser", () => {
  const snap = computeShift({
    durationMinutes: 300,
    wageCents: WAGE,
    tipsMode: "total",
    tipsTotalCents: 0,
    cashTipsCents: null,
    cardTipsCents: null,
    salesCents: null,
    tipShareMode: "itemized",
    tipShareTotalCents: null,
    tipShareLines: [{ label: "Servers", amountCents: 6000 }],
    tipOutLines: [],
    settlement: "cash",
  });

  test("tip share is the tips", () => {
    expect(snap.grossTipsCents).toBe(6000);
    expect(snap.takeHomeCents).toBe(14250);
    expect(snap.realHourlyCents).toBe(2850);
    expect(snap.tipsPerHourCents).toBe(1200);
    expect(snap.cashSplit).toBeNull();
  });
});

describe("fixture F — each tip-out line rounds, then the lines add", () => {
  test("two 2% lines are not the same cent as one 4% line", () => {
    expect(tipOutLineAmount({ label: "A", kind: "percent_of_sales", basisPoints: 200, amountCents: null }, 2525, 0)).toBe(51);
    const two = computeShift(
      serverDinner({
        salesCents: 2525,
        tipsMode: "total",
        tipsTotalCents: 0,
        cashTipsCents: null,
        cardTipsCents: null,
        tipOutLines: [
          { label: "A", kind: "percent_of_sales", basisPoints: 200, amountCents: null },
          { label: "B", kind: "percent_of_sales", basisPoints: 200, amountCents: null },
        ],
      }),
    );
    const one = computeShift(
      serverDinner({
        salesCents: 2525,
        tipsMode: "total",
        tipsTotalCents: 0,
        cashTipsCents: null,
        cardTipsCents: null,
        tipOutLines: [{ label: null, kind: "percent_of_sales", basisPoints: 400, amountCents: null }],
      }),
    );
    expect(two.tipOutLines.map((line) => line.amountCents)).toEqual([51, 51]);
    expect(two.tipOutTotalCents).toBe(102);
    expect(one.tipOutTotalCents).toBe(101);
  });

  test("2.5% and 1.5% of $1,000", () => {
    const snap = computeShift(
      serverDinner({
        salesCents: 100000,
        tipsMode: "total",
        tipsTotalCents: 0,
        cashTipsCents: null,
        cardTipsCents: null,
        tipOutLines: [
          { label: "Busser", kind: "percent_of_sales", basisPoints: 250, amountCents: null },
          { label: "Bar", kind: "percent_of_sales", basisPoints: 150, amountCents: null },
        ],
      }),
    );
    expect(snap.tipOutLines.map((line) => line.amountCents)).toEqual([2500, 1500]);
    expect(snap.tipOutTotalCents).toBe(4000);
  });
});

describe("fixture G — period weighting", () => {
  const friday = computeShift(serverDinner());
  const saturday = computeShift(
    serverDinner({
      durationMinutes: 240,
      tipsMode: "total",
      tipsTotalCents: 6000,
      cashTipsCents: null,
      cardTipsCents: null,
      salesCents: null,
      tipOutLines: [],
    }),
  );

  test("Saturday and the combined rate", () => {
    expect(saturday.wageEarningsCents).toBe(6600);
    expect(saturday.takeHomeCents).toBe(12600);
    expect(wageEarnings(WAGE, 240)).toBe(6600);
    const period = periodTotals([
      toPeriod("2025-11-14", friday),
      toPeriod("2025-11-15", saturday),
    ]);
    expect(period.minutes).toBe(630);
    expect(period.takeHomeCents).toBe(36525);
    expect(period.realHourlyCents).toBe(3479);
    const averageOfRates = Math.round(((3681 + 3150) / 2));
    expect(period.realHourlyCents).not.toBe(averageOfRates);
  });

  test("weekday rows keep Friday and Saturday apart", () => {
    const rows = weekdayBreakdown(
      [toPeriod("2025-11-14", friday), toPeriod("2025-11-15", saturday)],
      3,
    );
    const fri = rows.find((row) => row.name === "Friday");
    const sat = rows.find((row) => row.name === "Saturday");
    expect(fri?.shifts).toBe(1);
    expect(fri?.takeHomeCents).toBe(23925);
    expect(sat?.shifts).toBe(1);
    expect(sat?.takeHomeCents).toBe(12600);
    expect(rows[0]?.name).toBe("Wednesday");
    expect(rows.filter((row) => row.shifts === 0)).toHaveLength(5);
  });
});

describe("fixture H — not saved", () => {
  test("equal clock times, zero duration, blank sales, 150%", () => {
    const equal = validateShift(baseValid({ hoursMode: "clock", startMinutes: 17 * 60, endMinutes: 17 * 60, durationMinutes: null }));
    expect(equal.errors).toContain("End time matches start time. If you worked a full 24 hours, use Total hours.");

    const zero = validateShift(baseValid({ durationProblem: "zero", durationMinutes: null }));
    expect(zero.errors).toContain("Enter how long you worked.");

    const blankSales = validateShift(
      baseValid({
        salesEntered: false,
        salesCents: null,
        tipOutLines: [
          { label: null, kind: "percent_of_sales", basisPoints: 400, amountCents: null, percentInvalid: false, amountInvalid: false, negative: false },
        ],
      }),
    );
    expect(blankSales.errors).toContain("Enter sales to calculate this tip-out, or switch it to a dollar amount.");

    const tooHigh = validateShift(
      baseValid({
        tipOutLines: [
          { label: null, kind: "percent_of_sales", basisPoints: 15000, amountCents: null, percentInvalid: false, amountInvalid: false, negative: false },
        ],
      }),
    );
    expect(tooHigh.errors).toContain("Tip-out percent can’t be over 100%.");
  });
});

describe("edge cases", () => {
  test("4% of $33.33 and 4% of $180 guest tips", () => {
    expect(tipOutLineAmount({ label: null, kind: "percent_of_sales", basisPoints: 400, amountCents: null }, 3333, 0)).toBe(133);
    expect(tipOutLineAmount({ label: null, kind: "percent_of_tips", basisPoints: 400, amountCents: null }, null, 18000)).toBe(720);
  });

  test("percent of tips ignores tip share", () => {
    const snap = computeShift({
      durationMinutes: 300,
      wageCents: WAGE,
      tipsMode: "total",
      tipsTotalCents: 10000,
      cashTipsCents: null,
      cardTipsCents: null,
      salesCents: null,
      tipShareMode: "total",
      tipShareTotalCents: 5000,
      tipShareLines: [],
      tipOutLines: [{ label: null, kind: "percent_of_tips", basisPoints: 1000, amountCents: null }],
      settlement: "cash",
    });
    expect(snap.tipOutTotalCents).toBe(1000);
    expect(snap.grossTipsCents).toBe(15000);
    expect(snap.netTipsCents).toBe(14000);
  });

  test("percent of tips on $0 guest tips is $0", () => {
    const snap = computeShift(
      serverDinner({
        tipsMode: "total",
        tipsTotalCents: 0,
        cashTipsCents: null,
        cardTipsCents: null,
        salesCents: null,
        tipOutLines: [{ label: null, kind: "percent_of_tips", basisPoints: 400, amountCents: null }],
      }),
    );
    expect(snap.tipOutTotalCents).toBe(0);
  });

  test("wage of $0 leaves take-home equal to net tips", () => {
    const snap = computeShift(serverDinner({ wageCents: 0 }));
    expect(snap.wageEarningsCents).toBe(0);
    expect(snap.takeHomeCents).toBe(snap.netTipsCents);
  });

  test("blank sales stays null and hides the tip percent", () => {
    const snap = computeShift(serverDinner({ salesCents: null, tipOutLines: [] }));
    expect(snap.tipPercentTenths).toBeNull();
  });

  test("a double / all-day is longer than 8 hours", () => {
    expect(DEFAULT_DOUBLE_THRESHOLD_MINUTES).toBe(480);
    expect(resolveDouble({ doubleOverride: null, durationMinutes: 480, doubleThresholdMinutes: 480 })).toBe("single");
    expect(resolveDouble({ doubleOverride: null, durationMinutes: 481, doubleThresholdMinutes: 480 })).toBe("double");
    expect(resolveDouble({ doubleOverride: 1, durationMinutes: 60, doubleThresholdMinutes: 480 })).toBe("double");
    expect(resolveDouble({ doubleOverride: 0, durationMinutes: 600, doubleThresholdMinutes: 480 })).toBe("single");
  });

  test("lunch is a start before the cutoff", () => {
    expect(resolveMeal({ mealOverride: null, startMinutes: 959, lunchCutoffMinutes: 960 })).toBe("lunch");
    expect(resolveMeal({ mealOverride: null, startMinutes: 960, lunchCutoffMinutes: 960 })).toBe("dinner");
    expect(resolveMeal({ mealOverride: "lunch", startMinutes: 1200, lunchCutoffMinutes: 960 })).toBe("lunch");
    expect(resolveMeal({ mealOverride: null, startMinutes: null, lunchCutoffMinutes: 960 })).toBe("unknown");
  });

  test("bar and Bar share a bucket, and a blank name is Unspecified", () => {
    const rows = personTotals(
      [
        periodShell("2025-11-01", "2025-11-01T01:00:00.000Z", {
          tipOutTotalCents: 1000,
          tipOutLines: [{ label: "bar", amountCents: 1000 }],
        }),
        periodShell("2025-11-08", "2025-11-08T01:00:00.000Z", {
          tipOutTotalCents: 500,
          tipOutLines: [{ label: "Bar ", amountCents: 500 }],
        }),
        periodShell("2025-11-14", "2025-11-14T01:00:00.000Z", {
          tipOutTotalCents: 4800,
          tipOutLines: [{ label: null, amountCents: 4800 }],
        }),
      ],
      "tip_out",
    );
    expect(rows).toEqual([
      { label: "Unspecified", amountCents: 4800 },
      { label: "Bar", amountCents: 1500 },
    ]);
  });

  test("a positive tip-out with no lines is Unspecified", () => {
    const rows = personTotals(
      [periodShell("2025-11-14", "2025-11-14T01:00:00.000Z", { tipOutTotalCents: 1500, tipOutLines: [] })],
      "tip_out",
    );
    expect(rows).toEqual([{ label: "Unspecified", amountCents: 1500 }]);
  });

  test("zero hours blanks the rates", () => {
    const totals = periodTotals([]);
    expect(totals.takeHomeCents).toBe(0);
    expect(totals.realHourlyCents).toBeNull();
    expect(totals.tipsPerHourCents).toBeNull();
  });

  test("week starts Wednesday", () => {
    expect(weekdayIndex("2026-11-17")).toBe(2);
    expect(weekRange("2026-11-17", 3)).toEqual({ start: "2026-11-11", end: "2026-11-17" });
    expect(weekRange("2026-11-18", 3)).toEqual({ start: "2026-11-18", end: "2026-11-24" });
  });

  test("a new shift before 4:00am defaults to yesterday", () => {
    expect(defaultShiftDate(new Date(2026, 10, 17, 3, 59))).toBe("2026-11-16");
    expect(defaultShiftDate(new Date(2026, 10, 17, 4, 0))).toBe("2026-11-17");
  });

  test("trailing 28-day windows do not overlap", () => {
    const windows = trailing28("2026-11-17");
    expect(windows.latest).toEqual({ start: "2026-10-21", end: "2026-11-17" });
    expect(windows.prior.end < windows.latest.start).toBe(true);
    expect(addDays(windows.prior.end, 1)).toBe(windows.latest.start);
  });

  test("high percent and tip-out over tips warn and still allow a snapshot", () => {
    const high = validateShift(
      baseValid({
        tipOutLines: [
          { label: null, kind: "percent_of_sales", basisPoints: 2500, amountCents: null, percentInvalid: false, amountInvalid: false, negative: false },
        ],
      }),
    );
    expect(high.errors).toHaveLength(0);
    expect(high.warnings).toContain("That’s a high tip-out percent. Save it if it’s right.");

    const stiff = validateShift(
      baseValid({
        tipsMode: "total",
        tipsTotalCents: 2000,
        cashTipsCents: null,
        cardTipsCents: null,
        salesCents: 87500,
        salesEntered: true,
      }),
    );
    expect(stiff.errors).toHaveLength(0);
    expect(stiff.warnings).toContain("Tip-out is more than your tips. Net tips will be negative.");
  });

  test("a named line needs an amount, and a second line needs a name", () => {
    const named = validateShift(
      baseValid({
        salesEntered: false,
        salesCents: null,
        tipOutLines: [
          { label: "Busser", kind: "flat", basisPoints: null, amountCents: null, percentInvalid: false, amountInvalid: false, negative: false },
        ],
      }),
    );
    expect(named.errors).toContain("Enter the amount.");

    const unnamed = validateShift(
      baseValid({
        salesEntered: false,
        salesCents: null,
        tipOutLines: [
          { label: "Busser", kind: "flat", basisPoints: null, amountCents: 1000, percentInvalid: false, amountInvalid: false, negative: false },
          { label: null, kind: "flat", basisPoints: null, amountCents: 500, percentInvalid: false, amountInvalid: false, negative: false },
        ],
      }),
    );
    expect(unnamed.errors).toContain("Who was this for?");
  });

  test("blank wage cannot save and a future date cannot save", () => {
    const wage = validateShift(baseValid({ wageCents: null, wageProblem: "blank" }));
    expect(wage.errors).toContain("Enter your hourly wage.");
    const future = validateShift(baseValid({ shiftDate: "2026-11-18", today: "2026-11-17" }));
    expect(future.errors).toContain("That date is in the future.");
  });
});

function toPeriod(date: string, snap: ReturnType<typeof computeShift>): PeriodShift {
  return {
    shiftDate: date,
    createdAt: `${date}T12:00:00.000Z`,
    durationMinutes: snap.durationMinutes,
    wageEarningsCents: snap.wageEarningsCents,
    guestTipsCents: snap.guestTipsCents,
    tipShareCents: snap.tipShareCents,
    tipOutTotalCents: snap.tipOutTotalCents,
    netTipsCents: snap.netTipsCents,
    takeHomeCents: snap.takeHomeCents,
    tipOutLines: snap.tipOutLines.map((line) => ({ label: line.label, amountCents: line.amountCents })),
    tipShareLines: [],
  };
}

function periodShell(date: string, createdAt: string, extra: Partial<PeriodShift>): PeriodShift {
  return {
    shiftDate: date,
    createdAt,
    durationMinutes: 60,
    wageEarningsCents: 0,
    guestTipsCents: 0,
    tipShareCents: 0,
    tipOutTotalCents: 0,
    netTipsCents: 0,
    takeHomeCents: 0,
    tipOutLines: [],
    tipShareLines: [],
    ...extra,
  };
}

function baseValid(overrides: Partial<ValidatableShift> = {}): ValidatableShift {
  return {
    shiftDate: "2025-11-14",
    today: "2026-11-17",
    hoursMode: "duration",
    startMinutes: null,
    endMinutes: null,
    durationMinutes: 390,
    durationProblem: null,
    wageCents: 1650,
    wageProblem: null,
    tipsMode: "split",
    tipsTotalCents: null,
    cashTipsCents: 4000,
    cardTipsCents: 14000,
    tipsProblem: null,
    salesCents: 120000,
    salesEntered: true,
    salesProblem: null,
    tipOutLines: [
      {
        label: null,
        kind: "percent_of_sales",
        basisPoints: 400,
        amountCents: null,
        percentInvalid: false,
        amountInvalid: false,
        negative: false,
      },
    ],
    tipShareMode: "none",
    tipShareTotalCents: null,
    tipShareProblem: null,
    tipShareLines: [],
    notes: null,
    settlement: "cash",
    ...overrides,
  };
}
