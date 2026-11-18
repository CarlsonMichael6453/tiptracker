import { compareStubToShifts, parsePayStub, payPeriodContaining, taxTotalCents, SAMPLE_KROWD_STUB, type StubDraft } from "../src/calc/payStub";

describe("pay stub parsing", () => {
  test("reads a synthetic KrowD stub, including Oregon transit tax", () => {
    const draft = parsePayStub(SAMPLE_KROWD_STUB);
    expect(draft.periodStart).toBe("2026-11-09");
    expect(draft.periodEnd).toBe("2026-11-15");
    expect(draft.payDate).toBe("2026-11-20");
    expect(draft.regularHours).toBe(31.5);
    expect(draft.overtimeHours).toBe(2);
    expect(draft.hourlyRateCents).toBe(1650);
    expect(draft.grossWagesCents).toBe(56925);
    expect(draft.cashTipsCents).toBe(12000);
    expect(draft.cardTipsCents).toBe(34000);
    expect(draft.grossPayCents).toBe(56925);
    expect(draft.netPayCents).toBe(44264);
    expect(draft.otherDeductionsCents).toBe(1200);
    expect(draft.taxes.map((line) => line.name)).toEqual(["Federal income", "Social Security", "Medicare", "State", "Transit"]);
    expect(taxTotalCents(draft)).toBe(11461);
    expect(draft.confidence.periodStart).toBeGreaterThan(0.9);
  });

  test("a generic labeled stub still fills the same fields", () => {
    const draft = parsePayStub(`
      Pay period 2026-11-09 to 2026-11-15
      Pay date 2026-11-20
      Regular hours: 31.50
      Overtime hours: 0
      Hourly rate: $16.50
      Gross wages: $519.75
      Cash tips: $10.00
      Card tips: $20.00
      Gross pay: $519.75
      Federal income tax: $40.00
      Net pay: $479.75
    `);
    expect(draft.periodStart).toBe("2026-11-09");
    expect(draft.regularHours).toBe(31.5);
    expect(draft.hourlyRateCents).toBe(1650);
    expect(draft.taxes[0]?.name).toBe("Federal income");
    expect(draft.netPayCents).toBe(47975);
  });
});

describe("pay stub cross-check", () => {
  test("flags hours and card tips that do not match the log", () => {
    const draft: StubDraft = {
      ...parsePayStub("Pay period 2026-11-09 to 2026-11-15\nPay date 2026-11-20\n"),
      periodStart: "2026-11-09",
      periodEnd: "2026-11-15",
      regularHours: 31.5,
      overtimeHours: 0,
      hourlyRateCents: 1650,
      grossWagesCents: 51975,
      cardTipsCents: 29800,
      cashTipsCents: 12000,
      confidence: { regularHours: 0.9 },
    };
    const result = compareStubToShifts({
      draft,
      shifts: [
        {
          shiftDate: "2026-11-10",
          durationMinutes: 34 * 60,
          wageEarningsCents: 56100,
          cashTipsCents: 12000,
          cardTipsCents: 34000,
        },
        {
          shiftDate: "2026-11-20",
          durationMinutes: 8 * 60,
          wageEarningsCents: 13200,
          cashTipsCents: 0,
          cardTipsCents: 9000,
        },
      ],
    });
    expect(result.mismatches.map((item) => item.message)).toEqual([
      "Stub shows 31.5 hrs; you logged 34.0: 2.5 hrs may be missing (about $41.25)",
      "Card tips on stub are $42 lower than logged",
    ]);
    expect(result.taxCents).toBe(0);
  });

  test("a Friday weekly pay period is not the Wednesday week", () => {
    expect(payPeriodContaining("2026-11-20", 5, 1)).toEqual({ start: "2026-11-20", end: "2026-11-26" });
    expect(payPeriodContaining("2026-11-18", 3, 1).start).toBe("2026-11-18");
  });

  test("tax total is the sum of the lines", () => {
    const draft = parsePayStub(SAMPLE_KROWD_STUB);
    expect(taxTotalCents(draft)).toBe(draft.taxes.reduce((sum, line) => sum + line.cents, 0));
    const compared = compareStubToShifts({ draft, shifts: [] });
    expect(compared.taxCents).toBe(11461);
    expect(compared.taxPercent).toBe(20.1);
  });
});
