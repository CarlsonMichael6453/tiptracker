import {
  baselineIncome,
  billsDueInPeriod,
  drawFromBuffer,
  leftAfterBills,
  percentile25,
  safeToSpend,
  sweepToBuffer,
  taxJarCents,
  type BudgetBill,
} from "../src/calc/budget";
import { canAdd, isPro, limitFor } from "../src/config/pro";

const rent: BudgetBill = { id: "rent", name: "Rent", amountCents: 80000, frequency: "monthly", dueDay: 12, dueMonth: null, sinking: false };
const phone: BudgetBill = { id: "phone", name: "Phone", amountCents: 4000, frequency: "weekly", dueDay: 5, dueMonth: null, sinking: false };

describe("budget math", () => {
  test("the slow-week baseline is the 25th percentile, or the floor the user set", () => {
    expect(percentile25([40000, 80000, 60000, 20000])).toBe(20000);
    expect(baselineIncome("percentile", 30000, [40000, 80000, 60000, 20000])).toBe(20000);
    expect(baselineIncome("floor", 35000, [80000])).toBe(35000);
    expect(baselineIncome("percentile", 35000, [])).toBe(35000);
  });

  test("a bill is due when its day falls in the pay period", () => {
    const due = billsDueInPeriod([rent, phone], "2026-11-09", "2026-11-15");
    expect(due.map((bill) => bill.name).sort()).toEqual(["Phone", "Rent"]);
    expect(billsDueInPeriod([rent], "2026-11-16", "2026-11-22")).toEqual([]);
  });

  test("left after bills and the tax jar use this week's take-home", () => {
    expect(leftAfterBills(52000, 12000)).toBe(40000);
    expect(taxJarCents(52000, 1500)).toBe(7800);
    expect(taxJarCents(0, 1500)).toBe(0);
  });

  test("safe to spend subtracts bills, tax, goals, and envelopes", () => {
    const safe = safeToSpend({
      incomeCents: 80000,
      billsCents: 20000,
      taxCents: 8000,
      goalSetAsideCents: 4000,
      envelopeRemainingCents: 6000,
    });
    expect(safe.leftCents).toBe(42000);
  });

  test("surplus above baseline sweeps into the buffer and a slow week can draw it", () => {
    const swept = sweepToBuffer(80000, 50000, 10000);
    expect(swept).toEqual({ sweptCents: 30000, bufferCents: 40000 });
    const drawn = drawFromBuffer(20000, 50000, swept.bufferCents);
    expect(drawn).toEqual({ drawnCents: 30000, bufferCents: 10000 });
  });
});

describe("pro gating", () => {
  test("testing keeps Pro unlocked, and the free caps still exist", () => {
    expect(isPro()).toBe(true);
    expect(limitFor("goals", true)).toBe(Number.POSITIVE_INFINITY);
    expect(limitFor("bills", false)).toBe(8);
    expect(limitFor("envelopes", false)).toBe(6);
    expect(limitFor("goals", false)).toBe(2);
    expect(canAdd("goals", 2, false)).toBe(false);
    expect(canAdd("goals", 2, true)).toBe(true);
  });
});
