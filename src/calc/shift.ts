import { centsPerHour, roundDiv } from "./money";

export type TipOutKind = "flat" | "percent_of_sales" | "percent_of_tips";
export type TipsMode = "total" | "split";
export type TipShareMode = "none" | "total" | "itemized";
export type HoursMode = "clock" | "duration";
export type Settlement = "cash" | "paycheck";

export type TipOutInput = {
  label: string | null;
  kind: TipOutKind;
  /** Set for percent kinds. */
  basisPoints: number | null;
  /** Set for flat. Ignored for percent kinds; those amounts are computed. */
  amountCents: number | null;
};

export type TipShareInput = {
  label: string | null;
  amountCents: number;
};

export type ShiftCalcInput = {
  durationMinutes: number;
  wageCents: number;
  tipsMode: TipsMode;
  tipsTotalCents: number | null;
  cashTipsCents: number | null;
  cardTipsCents: number | null;
  salesCents: number | null;
  tipShareMode: TipShareMode;
  tipShareTotalCents: number | null;
  tipShareLines: TipShareInput[];
  tipOutLines: TipOutInput[];
  settlement: Settlement;
};

export type ComputedTipOutLine = {
  label: string | null;
  kind: TipOutKind;
  basisPoints: number | null;
  amountCents: number;
};

export type CashSplit = {
  cashLeftTonightCents: number;
  paycheckCents: number;
};

export type ShiftSnapshot = {
  durationMinutes: number;
  guestTipsCents: number;
  tipShareCents: number;
  grossTipsCents: number;
  tipOutLines: ComputedTipOutLine[];
  tipOutTotalCents: number;
  wageEarningsCents: number;
  netTipsCents: number;
  takeHomeCents: number;
  realHourlyCents: number | null;
  tipsPerHourCents: number | null;
  /** Tenths of a percent. 150 = 15.0%. Null when sales is blank or zero. */
  tipPercentTenths: number | null;
  cashSplit: CashSplit | null;
};

export function guestTipsOf(input: Pick<
  ShiftCalcInput,
  "tipsMode" | "tipsTotalCents" | "cashTipsCents" | "cardTipsCents"
>): number {
  if (input.tipsMode === "total") return input.tipsTotalCents ?? 0;
  return (input.cashTipsCents ?? 0) + (input.cardTipsCents ?? 0);
}

export function tipShareOf(input: Pick<
  ShiftCalcInput,
  "tipShareMode" | "tipShareTotalCents" | "tipShareLines"
>): number {
  if (input.tipShareMode === "none") return 0;
  if (input.tipShareMode === "total") return input.tipShareTotalCents ?? 0;
  return input.tipShareLines.reduce((sum, line) => sum + line.amountCents, 0);
}

export function tipOutLineAmount(
  line: TipOutInput,
  salesCents: number | null,
  guestTipsCents: number,
): number {
  if (line.kind === "flat") return line.amountCents ?? 0;
  if (line.basisPoints == null) {
    throw new Error("A percent tip-out needs a rate");
  }
  if (line.kind === "percent_of_sales") {
    if (salesCents == null) throw new Error("Percent of sales needs sales");
    return roundDiv(salesCents * line.basisPoints, 10000);
  }
  return roundDiv(guestTipsCents * line.basisPoints, 10000);
}

export function cashSplitOf(args: {
  tipsMode: TipsMode;
  cashTipsCents: number;
  cardTipsCents: number;
  tipShareCents: number;
  tipOutTotalCents: number;
  wageEarningsCents: number;
  settlement: Settlement;
}): CashSplit | null {
  if (args.tipsMode !== "split") return null;
  if (args.settlement === "cash") {
    return {
      cashLeftTonightCents: args.cashTipsCents + args.tipShareCents - args.tipOutTotalCents,
      paycheckCents: args.wageEarningsCents + args.cardTipsCents,
    };
  }
  return {
    cashLeftTonightCents: args.cashTipsCents + args.tipShareCents,
    paycheckCents: args.wageEarningsCents + args.cardTipsCents - args.tipOutTotalCents,
  };
}

export function computeShift(input: ShiftCalcInput): ShiftSnapshot {
  if (input.durationMinutes < 1 || input.durationMinutes > 1440) {
    throw new Error("Duration must be 1 to 1440 minutes");
  }
  const guestTipsCents = guestTipsOf(input);
  const tipShareCents = tipShareOf(input);
  const grossTipsCents = guestTipsCents + tipShareCents;
  const tipOutLines: ComputedTipOutLine[] = input.tipOutLines.map((line) => ({
    label: line.label,
    kind: line.kind,
    basisPoints: line.kind === "flat" ? null : line.basisPoints,
    amountCents: tipOutLineAmount(line, input.salesCents, guestTipsCents),
  }));
  const tipOutTotalCents = tipOutLines.reduce((sum, line) => sum + line.amountCents, 0);
  const wageEarningsCents = roundDiv(input.wageCents * input.durationMinutes, 60);
  const netTipsCents = grossTipsCents - tipOutTotalCents;
  const takeHomeCents = wageEarningsCents + netTipsCents;
  const tipPercentTenths =
    input.salesCents != null && input.salesCents > 0
      ? roundDiv(guestTipsCents * 1000, input.salesCents)
      : null;
  return {
    durationMinutes: input.durationMinutes,
    guestTipsCents,
    tipShareCents,
    grossTipsCents,
    tipOutLines,
    tipOutTotalCents,
    wageEarningsCents,
    netTipsCents,
    takeHomeCents,
    realHourlyCents: centsPerHour(takeHomeCents, input.durationMinutes),
    tipsPerHourCents: centsPerHour(netTipsCents, input.durationMinutes),
    tipPercentTenths,
    cashSplit: cashSplitOf({
      tipsMode: input.tipsMode,
      cashTipsCents: input.cashTipsCents ?? 0,
      cardTipsCents: input.cardTipsCents ?? 0,
      tipShareCents,
      tipOutTotalCents,
      wageEarningsCents,
      settlement: input.settlement,
    }),
  };
}

export function wageEarnings(wageCents: number, durationMinutes: number): number {
  return roundDiv(wageCents * durationMinutes, 60);
}
