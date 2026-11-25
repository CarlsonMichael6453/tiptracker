import { centsToPlain, csvCell, shiftsToCsv, SHIFT_CSV_HEADER } from "../src/calc/shiftExport";
import type { ShiftRecord } from "../src/domain/types";

function shift(over: Partial<ShiftRecord>): ShiftRecord {
  return {
    id: "s1",
    profileId: "p1",
    roleId: null,
    roleName: "Server",
    shiftDate: "2026-11-20",
    hoursMode: "clock",
    startMinutes: 17 * 60,
    endMinutes: 23 * 60 + 30,
    durationMinutes: 390,
    wageCents: 500,
    tipsMode: "total",
    tipsTotalCents: 20000,
    cashTipsCents: null,
    cardTipsCents: null,
    salesCents: 90000,
    tipShareMode: "none",
    mealOverride: null,
    doubleOverride: null,
    tipOutSettlement: "cash",
    notes: null,
    guestTipsCents: 20000,
    tipShareCents: 0,
    grossTipsCents: 20000,
    tipOutTotalCents: 4500,
    wageEarningsCents: 3250,
    netTipsCents: 15500,
    takeHomeCents: 18750,
    createdAt: "2026-11-20T23:40:00.000Z",
    updatedAt: "2026-11-20T23:40:00.000Z",
    tipOutLines: [],
    tipShareLines: [],
    ...over,
  };
}

describe("shift CSV export", () => {
  test("formats cents without floating point", () => {
    expect(centsToPlain(0)).toBe("0.00");
    expect(centsToPlain(5)).toBe("0.05");
    expect(centsToPlain(18750)).toBe("187.50");
    expect(centsToPlain(-1234)).toBe("-12.34");
  });

  test("quotes commas and quotes, and defuses formulas", () => {
    expect(csvCell("Great, busy")).toBe('"Great, busy"');
    expect(csvCell('said "hi"')).toBe('"said ""hi"""');
    expect(csvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  test("writes a header and one row per shift, oldest first", () => {
    const csv = shiftsToCsv([shift({ id: "b", shiftDate: "2026-11-21", notes: "Slow, rainy" }), shift({ id: "a" })]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(SHIFT_CSV_HEADER);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("2026-11-20,Server,5:00pm,11:30pm,390,5.00,200.00,0.00,45.00,32.50,187.50,");
    expect(lines[2].endsWith('"Slow, rainy"')).toBe(true);
  });

  test("leaves times blank when a shift only has a duration", () => {
    const row = shiftsToCsv([shift({ startMinutes: null, endMinutes: null })]).split("\n")[1];
    expect(row.split(",").slice(2, 4)).toEqual(["", ""]);
  });
});
