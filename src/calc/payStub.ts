import { addDays, isCivilDate, weekRange } from "./dates";
import { speakMoney } from "./tipJar";

/** A made-up KrowD / PeopleSoft stub. No real person or paycheck. */
export const SAMPLE_KROWD_STUB = `KrowD PeopleSoft Payroll
Company: Sample Restaurant
Pay Group: Weekly Friday

Pay Period: 11/09/2026 - 11/15/2026
Pay Date: 11/20/2026

Earnings
Description     Hours    Rate     Amount
Regular         31.50    16.50    519.75
Overtime         2.00    24.75     49.50
Gross Wages                       569.25

Tips
Cash Tips Declared               120.00
Charged Tips                     340.00

Gross Pay                        569.25

Taxes
Federal Withholding               42.10
Social Security                   35.29
Medicare                           8.25
OR State Income Tax               28.40
OR Statewide Transit Tax           0.57

Other Deductions
Meal Deduction                    12.00

Net Pay                          442.64
`;

export type TaxLine = { name: string; cents: number };

export type StubDraft = {
  periodStart: string | null;
  periodEnd: string | null;
  payDate: string | null;
  regularHours: number | null;
  overtimeHours: number | null;
  hourlyRateCents: number | null;
  grossWagesCents: number | null;
  cashTipsCents: number | null;
  cardTipsCents: number | null;
  grossPayCents: number | null;
  taxes: TaxLine[];
  otherDeductionsCents: number | null;
  netPayCents: number | null;
  confidence: Record<string, number>;
};

export type LoggedSlice = {
  shiftDate: string;
  durationMinutes: number;
  wageEarningsCents: number;
  cashTipsCents: number | null;
  cardTipsCents: number | null;
};

export type StubMismatch = { id: string; message: string };

const HOUR_TOLERANCE = 0.25;
const MONEY_TOLERANCE = 500;

export function emptyDraft(): StubDraft {
  return {
    periodStart: null,
    periodEnd: null,
    payDate: null,
    regularHours: null,
    overtimeHours: null,
    hourlyRateCents: null,
    grossWagesCents: null,
    cashTipsCents: null,
    cardTipsCents: null,
    grossPayCents: null,
    taxes: [],
    otherDeductionsCents: null,
    netPayCents: null,
    confidence: {},
  };
}

export function parsePayStub(text: string): StubDraft {
  const draft = emptyDraft();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const krowd = /krowd|peoplesoft/i.test(text);
  const base = krowd ? 0.9 : 0.8;

  for (const line of lines) {
    if (/pay\s*period/i.test(line)) {
      const dates = datesIn(line);
      if (dates[0]) {
        draft.periodStart = dates[0];
        draft.confidence.periodStart = dates.length >= 2 ? 0.95 : 0.55;
      }
      if (dates[1]) {
        draft.periodEnd = dates[1];
        draft.confidence.periodEnd = 0.95;
      }
      continue;
    }
    if (/pay\s*date|check\s*date/i.test(line)) {
      const date = datesIn(line)[0];
      if (date) {
        draft.payDate = date;
        draft.confidence.payDate = 0.95;
      }
      continue;
    }
    if (/^regular\b/i.test(line) && !/gross/i.test(line)) {
      const nums = numbersIn(line);
      if (nums.length >= 1) {
        draft.regularHours = nums[0] ?? null;
        draft.confidence.regularHours = base;
      }
      if (nums.length >= 2 && draft.hourlyRateCents == null) {
        draft.hourlyRateCents = toCents(nums[1] ?? 0);
        draft.confidence.hourlyRateCents = base;
      }
      continue;
    }
    if (/regular\s*hours/i.test(line)) {
      const value = firstNumber(line);
      if (value != null) {
        draft.regularHours = value;
        draft.confidence.regularHours = 0.92;
      }
      continue;
    }
    if (/^overtime\b/i.test(line) || /overtime\s*hours/i.test(line)) {
      const value = firstNumber(line);
      if (value != null) {
        draft.overtimeHours = value;
        draft.confidence.overtimeHours = /hours/i.test(line) ? 0.92 : base;
      }
      continue;
    }
    if (/hourly\s*rate|pay\s*rate/i.test(line)) {
      const money = lastMoney(line);
      if (money != null) {
        draft.hourlyRateCents = money;
        draft.confidence.hourlyRateCents = 0.92;
      }
      continue;
    }
    if (/gross\s*wages/i.test(line)) {
      const money = lastMoney(line);
      if (money != null) {
        draft.grossWagesCents = money;
        draft.confidence.grossWagesCents = 0.93;
      }
      continue;
    }
    if (/cash\s*tips|declared\s*tips|tips\s*declared/i.test(line)) {
      const money = lastMoney(line);
      if (money != null) {
        draft.cashTipsCents = money;
        draft.confidence.cashTipsCents = 0.9;
      }
      continue;
    }
    if (/charged\s*tips|charge\s*tips|card\s*tips|credit\s*card\s*tips/i.test(line)) {
      const money = lastMoney(line);
      if (money != null) {
        draft.cardTipsCents = money;
        draft.confidence.cardTipsCents = 0.9;
      }
      continue;
    }
    if (/gross\s*pay/i.test(line)) {
      const money = lastMoney(line);
      if (money != null) {
        draft.grossPayCents = money;
        draft.confidence.grossPayCents = 0.93;
      }
      continue;
    }
    if (/net\s*pay/i.test(line)) {
      const money = lastMoney(line);
      if (money != null) {
        draft.netPayCents = money;
        draft.confidence.netPayCents = 0.95;
      }
      continue;
    }
    const tax = taxFromLine(line);
    if (tax) {
      draft.taxes.push(tax);
      draft.confidence[`tax:${tax.name}`] = 0.88;
      continue;
    }
    if (/deduction/i.test(line)) {
      const money = lastMoney(line);
      if (money != null) draft.otherDeductionsCents = (draft.otherDeductionsCents ?? 0) + money;
      draft.confidence.otherDeductionsCents = 0.8;
    }
  }

  if (draft.overtimeHours == null) {
    draft.overtimeHours = 0;
    draft.confidence.overtimeHours = 0.4;
  }
  if (draft.grossWagesCents == null && draft.regularHours != null && draft.hourlyRateCents != null) {
    const regular = Math.round(draft.regularHours * draft.hourlyRateCents);
    const overtime = Math.round((draft.overtimeHours ?? 0) * draft.hourlyRateCents * 1.5);
    draft.grossWagesCents = regular + overtime;
    draft.confidence.grossWagesCents = 0.45;
  }
  return draft;
}

export function taxTotalCents(draft: Pick<StubDraft, "taxes">): number {
  return draft.taxes.reduce((sum, line) => sum + line.cents, 0);
}

export function isLowConfidence(draft: StubDraft, field: string): boolean {
  const score = draft.confidence[field];
  return score == null || score < 0.75;
}

export function payPeriodContaining(date: string, startsOn: number, weeks: number): { start: string; end: string } {
  const span = weeks === 2 ? 14 : 7;
  const anchor = weekRange(date, startsOn).start;
  if (span === 7) return { start: anchor, end: addDays(anchor, 6) };
  const origin = "2024-01-05";
  const originStart = weekRange(origin, startsOn).start;
  const days = Math.round((Date.parse(`${anchor}T00:00:00Z`) - Date.parse(`${originStart}T00:00:00Z`)) / 86400000);
  const block = Math.floor(days / 14);
  const start = addDays(originStart, block * 14);
  return { start, end: addDays(start, 13) };
}

export function compareStubToShifts(input: {
  draft: StubDraft;
  shifts: LoggedSlice[];
}): { mismatches: StubMismatch[]; loggedHours: number; stubHours: number; taxCents: number; taxPercent: number | null } {
  const { draft } = input;
  const start = draft.periodStart;
  const end = draft.periodEnd;
  const inPeriod = start && end ? input.shifts.filter((shift) => shift.shiftDate >= start && shift.shiftDate <= end) : input.shifts;
  const loggedMinutes = inPeriod.reduce((sum, shift) => sum + shift.durationMinutes, 0);
  const loggedHours = loggedMinutes / 60;
  const stubHours = (draft.regularHours ?? 0) + (draft.overtimeHours ?? 0);
  const mismatches: StubMismatch[] = [];
  const rate = draft.hourlyRateCents ?? 0;

  if (draft.regularHours != null && Math.abs(stubHours - loggedHours) > HOUR_TOLERANCE) {
    const diff = Math.abs(stubHours - loggedHours);
    const about = rate > 0 ? ` (about ${speakMoney(Math.round(diff * rate))})` : "";
    const stubLabel = formatHours(stubHours);
    const loggedLabel = formatHours(loggedHours);
    if (loggedHours > stubHours) {
      mismatches.push({
        id: "hours",
        message: `Stub shows ${stubLabel} hrs; you logged ${loggedLabel}: ${formatHours(diff)} hrs may be missing${about}`,
      });
    } else {
      mismatches.push({
        id: "hours",
        message: `Stub shows ${stubLabel} hrs; you logged ${loggedLabel}: ${formatHours(diff)} hrs are on the stub but not in your shifts${about}`,
      });
    }
  }

  if (draft.hourlyRateCents != null && draft.grossWagesCents != null && draft.regularHours != null) {
    const expected = Math.round(draft.regularHours * draft.hourlyRateCents + (draft.overtimeHours ?? 0) * draft.hourlyRateCents * 1.5);
    const gap = Math.abs(expected - draft.grossWagesCents);
    if (gap > MONEY_TOLERANCE) {
      mismatches.push({
        id: "wages",
        message: `Gross wages are ${speakMoney(gap)} ${expected > draft.grossWagesCents ? "under" : "over"} rate times hours, with overtime at time and a half`,
      });
    }
  }

  const loggedCard = sumTips(inPeriod, "cardTipsCents");
  if (draft.cardTipsCents != null && loggedCard.count > 0 && Math.abs(draft.cardTipsCents - loggedCard.cents) > MONEY_TOLERANCE) {
    const gap = Math.abs(draft.cardTipsCents - loggedCard.cents);
    mismatches.push({
      id: "card",
      message: `Card tips on stub are ${speakMoney(gap)} ${draft.cardTipsCents < loggedCard.cents ? "lower" : "higher"} than logged`,
    });
  }

  const loggedCash = sumTips(inPeriod, "cashTipsCents");
  if (draft.cashTipsCents != null && loggedCash.count > 0 && Math.abs(draft.cashTipsCents - loggedCash.cents) > MONEY_TOLERANCE) {
    const gap = Math.abs(draft.cashTipsCents - loggedCash.cents);
    mismatches.push({
      id: "cash",
      message: `Declared cash tips on the stub are ${speakMoney(gap)} ${draft.cashTipsCents < loggedCash.cents ? "lower" : "higher"} than the cash tips you logged`,
    });
  }

  const taxCents = taxTotalCents(draft);
  const gross = draft.grossPayCents ?? draft.grossWagesCents;
  const taxPercent = gross && gross > 0 ? Math.round((taxCents / gross) * 1000) / 10 : null;
  return { mismatches, loggedHours, stubHours, taxCents, taxPercent };
}

export function formatHours(hours: number): string {
  return (Math.round(hours * 10) / 10).toFixed(1);
}

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

function sumTips(shifts: LoggedSlice[], key: "cashTipsCents" | "cardTipsCents"): { cents: number; count: number } {
  return shifts.reduce(
    (acc, shift) => {
      const value = shift[key];
      if (value == null) return acc;
      return { cents: acc.cents + value, count: acc.count + 1 };
    },
    { cents: 0, count: 0 },
  );
}

function taxFromLine(line: string): TaxLine | null {
  const money = lastMoney(line);
  if (money == null) return null;
  if (/federal|f\.?i\.?t\b|fed\s*income/i.test(line)) return { name: "Federal income", cents: money };
  if (/social\s*security|oasdi/i.test(line)) return { name: "Social Security", cents: money };
  if (/medicare/i.test(line)) return { name: "Medicare", cents: money };
  if (/transit/i.test(line)) return { name: "Transit", cents: money };
  if (/state\s*(income|tax|withholding)|\bOR\b.*tax/i.test(line)) return { name: "State", cents: money };
  if (/\blocal\b/i.test(line) && /tax/i.test(line)) return { name: "Local", cents: money };
  return null;
}

function datesIn(line: string): string[] {
  const found: string[] = [];
  const pattern = /(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  for (const match of line.matchAll(pattern)) {
    const iso = match[1]
      ? `${match[1]}-${match[2]}-${match[3]}`
      : `${match[6]}-${match[4]!.padStart(2, "0")}-${match[5]!.padStart(2, "0")}`;
    if (isCivilDate(iso)) found.push(iso);
  }
  return found;
}

function numbersIn(line: string): number[] {
  return [...line.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g)].map((match) => Number(match[0].replace(/,/g, ""))).filter((value) => Number.isFinite(value));
}

function firstNumber(line: string): number | null {
  return numbersIn(line)[0] ?? null;
}

function lastMoney(line: string): number | null {
  const matches = [...line.matchAll(/\$?\d{1,3}(?:,\d{3})*\.\d{2}\b/g)];
  const last = matches[matches.length - 1];
  if (!last) return null;
  return toCents(Number(last[0].replace(/[$,]/g, "")));
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}
