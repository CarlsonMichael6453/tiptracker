import { clockDurationMinutes } from "./hours";
import { guestTipsOf, tipOutLineAmount, tipShareOf, type ShiftCalcInput, type TipOutInput } from "./shift";

export type FieldTipOut = {
  label: string | null;
  kind: TipOutInput["kind"];
  basisPoints: number | null;
  amountCents: number | null;
  percentInvalid: boolean;
  amountInvalid: boolean;
  negative: boolean;
};

export type FieldTipShare = {
  label: string | null;
  amountCents: number | null;
  amountInvalid: boolean;
  negative: boolean;
};

export type ValidatableShift = {
  shiftDate: string;
  today: string;
  hoursMode: "clock" | "duration";
  startMinutes: number | null;
  endMinutes: number | null;
  durationMinutes: number | null;
  durationProblem: "blank" | "zero" | "over24" | "invalid" | "both" | "missing-clock" | "bad-clock" | null;
  wageCents: number | null;
  wageProblem: "blank" | "negative" | "invalid" | null;
  tipsMode: "total" | "split";
  tipsTotalCents: number | null;
  cashTipsCents: number | null;
  cardTipsCents: number | null;
  tipsProblem: "negative" | "invalid" | null;
  salesCents: number | null;
  salesEntered: boolean;
  salesProblem: "negative" | "invalid" | null;
  tipOutLines: FieldTipOut[];
  tipShareMode: "none" | "total" | "itemized";
  tipShareTotalCents: number | null;
  tipShareProblem: "negative" | "invalid" | null;
  tipShareLines: FieldTipShare[];
  notes: string | null;
  settlement: "cash" | "paycheck";
};

export type Validation = {
  errors: string[];
  warnings: string[];
};

const LONG_SHIFT = "That’s a long shift. Save it if it’s right.";
const HIGH_PERCENT = "That’s a high tip-out percent. Save it if it’s right.";
const TIP_OUT_OVER_TIPS = "Tip-out is more than your tips. Net tips will be negative.";
const DOUBLE_CHECK = "Double-check that amount.";
const SALES_ZERO = "Sales are $0, so this percent tip-out is $0.";

export function validateShift(input: ValidatableShift): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.shiftDate)) {
    errors.push("Enter the date.");
  } else if (input.shiftDate > input.today) {
    errors.push("That date is in the future.");
  }

  let duration: number | null = null;
  if (input.hoursMode === "clock") {
    if (input.durationProblem === "missing-clock" || input.startMinutes == null || input.endMinutes == null) {
      errors.push("Enter a start and end time.");
    } else if (input.startMinutes === input.endMinutes) {
      errors.push("End time matches start time. If you worked a full 24 hours, use Total hours.");
    } else if (input.durationProblem === "bad-clock") {
      errors.push("Enter a start and end time.");
    } else {
      duration = clockDurationMinutes(input.startMinutes, input.endMinutes);
      if (duration == null) errors.push("Enter a start and end time.");
    }
  } else if (input.durationProblem === "over24") {
    errors.push("A shift can’t be longer than 24 hours.");
  } else if (input.durationProblem === "both") {
    errors.push("Enter 6.5 or hours and minutes, not both.");
  } else if (input.durationProblem != null || input.durationMinutes == null || input.durationMinutes === 0) {
    errors.push("Enter how long you worked.");
  } else {
    duration = input.durationMinutes;
  }

  if (duration != null && duration > 14 * 60) warnings.push(LONG_SHIFT);

  if (input.wageProblem === "blank" || input.wageCents == null) {
    if (input.wageProblem !== "negative" && input.wageProblem !== "invalid") {
      errors.push("Enter your hourly wage.");
    }
  }
  if (input.wageProblem === "negative") errors.push("Amount can’t be negative.");
  if (input.wageProblem === "invalid") errors.push("Enter your hourly wage.");
  if (input.wageCents != null && input.wageCents > 15000) warnings.push(DOUBLE_CHECK);

  if (input.tipsProblem === "negative" || input.salesProblem === "negative") {
    errors.push("Amount can’t be negative.");
  }
  if (input.tipsProblem === "invalid") errors.push("Enter a dollar amount.");
  if (input.salesProblem === "negative") {
    /* already recorded */
  } else if (input.salesProblem === "invalid") {
    errors.push("Enter a dollar amount.");
  }

  const tipOutLines = input.tipOutLines.filter((line) => !isEmptyTipOut(line));
  const kind = tipOutLines[0]?.kind;
  const percentOfSales = tipOutLines.some((line) => line.kind === "percent_of_sales");
  if (tipOutLines.length > 0 && kind && tipOutLines.some((line) => line.kind !== kind)) {
    errors.push("Tip-out lines have to share one base.");
  }

  let namedBlank = false;
  let amountNoName = false;
  let percentInvalid = false;
  let amountInvalid = false;
  let negative = false;
  let over100 = false;
  let over20 = false;
  const multi = tipOutLines.length > 1;
  for (const line of tipOutLines) {
    if (line.negative) negative = true;
    if (line.kind === "flat") {
      if (line.amountInvalid) amountInvalid = true;
      const named = line.label != null && line.label.trim() !== "";
      const blankAmount = line.amountCents == null && !line.amountInvalid && !line.negative;
      if (named && blankAmount) namedBlank = true;
      if (multi && !named && (line.amountCents != null || line.amountInvalid)) amountNoName = true;
    } else {
      if (line.percentInvalid) percentInvalid = true;
      if (line.basisPoints == null && !line.percentInvalid && !line.negative) {
        if (line.label?.trim()) namedBlank = true;
        else percentInvalid = true;
      }
      if (line.basisPoints != null && line.basisPoints > 10000) over100 = true;
      else if (line.basisPoints != null && line.basisPoints > 2000) over20 = true;
      const named = line.label != null && line.label.trim() !== "";
      if (multi && !named && line.basisPoints != null) amountNoName = true;
    }
    if (line.label != null && line.label.trim().length > 30) {
      errors.push("A name can’t be longer than 30 characters.");
    }
  }
  if (negative) errors.push("Amount can’t be negative.");
  if (amountInvalid) errors.push("Enter the amount.");
  if (percentInvalid || namedBlank) errors.push("Enter the amount.");
  if (amountNoName) errors.push("Who was this for?");
  if (over100) errors.push("Tip-out percent can’t be over 100%.");
  if (over20) warnings.push(HIGH_PERCENT);

  if (percentOfSales && !over100) {
    if (!input.salesEntered || input.salesCents == null) {
      if (input.salesProblem == null) {
        errors.push("Enter sales to calculate this tip-out, or switch it to a dollar amount.");
      }
    } else if (input.salesCents === 0) {
      warnings.push(SALES_ZERO);
    }
  }
  if (input.salesCents != null && input.salesCents > 2_000_000) warnings.push(DOUBLE_CHECK);

  if (input.tipShareProblem === "negative") errors.push("Amount can’t be negative.");
  if (input.tipShareProblem === "invalid") errors.push("Enter a dollar amount.");
  let shareBlank = false;
  let shareInvalid = false;
  let shareNegative = false;
  for (const line of input.tipShareLines) {
    if (line.negative) shareNegative = true;
    if (line.amountInvalid) shareInvalid = true;
    if (line.label?.trim() && line.amountCents == null && !line.amountInvalid && !line.negative) shareBlank = true;
    if (line.label != null && line.label.trim().length > 30) {
      errors.push("A name can’t be longer than 30 characters.");
    }
  }
  if (shareNegative) errors.push("Amount can’t be negative.");
  if (shareInvalid || shareBlank) errors.push("Enter the amount.");

  if (input.notes != null && input.notes.length > 500) {
    errors.push("A note can’t be longer than 500 characters.");
  }

  const guest = guestTipsCents(input);
  if (guest > 500_000) warnings.push(DOUBLE_CHECK);

  if (errors.length === 0 && duration != null && input.wageCents != null) {
    try {
      const lines = computableLines(tipOutLines);
      const guestTips = guest;
      const tipOut = lines.reduce(
        (sum, line) => sum + tipOutLineAmount(line, input.salesCents, guestTips),
        0,
      );
      const share = tipShareCents(input);
      if (tipOut > guestTips + share) warnings.push(TIP_OUT_OVER_TIPS);
    } catch {
      /* A blocking problem already collected above. */
    }
  }

  return { errors: unique(errors), warnings: unique(warnings) };
}

function guestTipsCents(input: ValidatableShift): number {
  if (input.tipsMode === "total") return input.tipsTotalCents ?? 0;
  return (input.cashTipsCents ?? 0) + (input.cardTipsCents ?? 0);
}

function tipShareCents(input: ValidatableShift): number {
  if (input.tipShareMode === "none") return 0;
  if (input.tipShareMode === "total") return input.tipShareTotalCents ?? 0;
  return input.tipShareLines.reduce((sum, line) => sum + (line.amountCents ?? 0), 0);
}

function isEmptyTipOut(line: FieldTipOut): boolean {
  if (line.label?.trim() || line.negative) return false;
  if (line.kind === "flat") return line.amountCents == null && !line.amountInvalid;
  return line.basisPoints == null && !line.percentInvalid;
}

function computableLines(lines: FieldTipOut[]): TipOutInput[] {
  return lines
    .filter((line) => {
      if (line.kind === "flat") return (line.amountCents ?? 0) > 0 || (line.label?.trim() ?? "") !== "";
      return line.basisPoints != null;
    })
    .map((line) => ({
      label: line.label?.trim() ? line.label.trim() : null,
      kind: line.kind,
      basisPoints: line.kind === "flat" ? null : line.basisPoints,
      amountCents: line.kind === "flat" ? (line.amountCents ?? 0) : null,
    }));
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function toCalcInput(input: ValidatableShift, durationMinutes: number): ShiftCalcInput {
  const lines = input.tipOutLines
    .filter((line) => {
      if (line.kind === "flat") return (line.amountCents ?? 0) > 0;
      return line.basisPoints != null;
    })
    .map((line) => ({
      label: line.label?.trim() ? line.label.trim() : null,
      kind: line.kind,
      basisPoints: line.kind === "flat" ? null : line.basisPoints,
      amountCents: line.kind === "flat" ? line.amountCents : null,
    }));
  const shareLines = input.tipShareLines
    .filter((line) => (line.amountCents ?? 0) > 0 || (line.label?.trim() ?? "") !== "")
    .filter((line) => (line.amountCents ?? 0) > 0)
    .map((line) => ({
      label: line.label?.trim() ? line.label.trim() : null,
      amountCents: line.amountCents ?? 0,
    }));
  const calc: ShiftCalcInput = {
    durationMinutes,
    wageCents: input.wageCents ?? 0,
    tipsMode: input.tipsMode,
    tipsTotalCents: input.tipsMode === "total" ? (input.tipsTotalCents ?? 0) : null,
    cashTipsCents: input.tipsMode === "split" ? (input.cashTipsCents ?? 0) : null,
    cardTipsCents: input.tipsMode === "split" ? (input.cardTipsCents ?? 0) : null,
    salesCents: input.salesEntered ? input.salesCents : null,
    tipShareMode: input.tipShareMode === "itemized" && shareLines.length === 0 ? "total" : input.tipShareMode,
    tipShareTotalCents: input.tipShareMode === "total" ? (input.tipShareTotalCents ?? 0) : null,
    tipShareLines: input.tipShareMode === "itemized" ? shareLines : [],
    tipOutLines: lines,
    settlement: input.settlement,
  };
  if (calc.tipShareMode === "itemized" && calc.tipShareLines.length === 0) {
    calc.tipShareMode = "none";
  }
  return calc;
}

export function describedGuest(input: ValidatableShift): number {
  return guestTipsOf({
    tipsMode: input.tipsMode,
    tipsTotalCents: input.tipsTotalCents,
    cashTipsCents: input.cashTipsCents,
    cardTipsCents: input.cardTipsCents,
  });
}

export function describedShare(input: ValidatableShift): number {
  return tipShareOf({
    tipShareMode: input.tipShareMode,
    tipShareTotalCents: input.tipShareTotalCents,
    tipShareLines: input.tipShareLines
      .filter((line) => line.amountCents != null)
      .map((line) => ({ label: line.label, amountCents: line.amountCents ?? 0 })),
  });
}
