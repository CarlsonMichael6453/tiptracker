import { resolveDouble, resolveMeal, type Meal } from "../../calc/classify";
import { formatClock, formatHoursPhrase, formatMoney, formatMoneyInput, formatPercent, formatPercentInput } from "../../calc/format";
import { clockDurationMinutes, clockToMinutes, minutesToClock, parseDurationInput } from "../../calc/hours";
import { parseMoney, parsePercent } from "../../calc/money";
import { computeShift, type ShiftCalcInput, type ShiftSnapshot, type TipOutKind } from "../../calc/shift";
import { validateShift, type FieldTipOut, type FieldTipShare, type ValidatableShift } from "../../calc/validate";
import { effectivePosture } from "../../domain/roleDefaults";
import type { Profile, Role, ShiftRecord } from "../../domain/types";
import type { RoleTipOutWrite, ShiftWrite } from "../../repo/repository";

export type DraftLine = {
  key: string;
  label: string;
  amountText: string;
  percentText: string;
};

export type ShiftDraft = {
  date: string;
  roleId: string | null;
  orphanRoleName: string | null;
  hoursMode: "clock" | "duration";
  startHour: string;
  startMinute: string;
  startAmPm: "am" | "pm";
  endHour: string;
  endMinute: string;
  endAmPm: "am" | "pm";
  hoursText: string;
  minutesText: string;
  wageText: string;
  saveUsualWage: boolean;
  tipsMode: "total" | "split";
  tipsTotalText: string;
  cashText: string;
  cardText: string;
  notesOpen: boolean;
  notes: string;
  salesOpen: boolean;
  salesText: string;
  tipOutOpen: boolean;
  tipOutKind: TipOutKind;
  tipOutLines: DraftLine[];
  saveUsualTipOut: boolean;
  settlement: "cash" | "paycheck";
  tipShareOpen: boolean;
  tipShareTotalText: string;
  tipShareLines: DraftLine[];
  classificationOpen: boolean;
  mealChoice: "infer" | "lunch" | "dinner";
  doubleChoice: "infer" | "double" | "single";
  wageTouched: boolean;
  tipOutTouched: boolean;
  settlementTouched: boolean;
  tipShareTouched: boolean;
};

export type LiveFigures = {
  hoursLabel: string;
  tipOutLabel: string;
  netLabel: string;
  takeHomeLabel: string;
  hourlyLabel: string;
};

let lineKey = 0;
export function nextLineKey(): string {
  lineKey += 1;
  return `line-${lineKey}`;
}

export function emptyLine(): DraftLine {
  return { key: nextLineKey(), label: "", amountText: "", percentText: "" };
}

export function createDraft(profile: Profile, roles: Role[], date: string): ShiftDraft {
  const role = roles.find((item) => item.id === profile.lastRoleId) ?? roles[0] ?? null;
  const draft = blankDraft(date);
  return role ? applyRole(draft, role, profile, { copySaved: true }) : draft;
}

export function draftFromShift(shift: ShiftRecord): ShiftDraft {
  const draft = blankDraft(shift.shiftDate);
  draft.roleId = shift.roleId;
  draft.orphanRoleName = shift.roleId ? null : shift.roleName;
  draft.hoursMode = shift.hoursMode;
  if (shift.startMinutes != null) {
    const start = minutesToClock(shift.startMinutes);
    draft.startHour = start.hour;
    draft.startMinute = start.minute;
    draft.startAmPm = start.ampm;
  }
  if (shift.endMinutes != null) {
    const end = minutesToClock(shift.endMinutes);
    draft.endHour = end.hour;
    draft.endMinute = end.minute;
    draft.endAmPm = end.ampm;
  }
  const hours = Math.floor(shift.durationMinutes / 60);
  const mins = shift.durationMinutes % 60;
  draft.hoursText = String(hours);
  draft.minutesText = mins === 0 ? "" : String(mins);
  draft.wageText = formatMoneyInput(shift.wageCents);
  draft.tipsMode = shift.tipsMode;
  draft.tipsTotalText = shift.tipsTotalCents == null ? "" : formatMoneyInput(shift.tipsTotalCents);
  draft.cashText = shift.cashTipsCents == null ? "" : formatMoneyInput(shift.cashTipsCents);
  draft.cardText = shift.cardTipsCents == null ? "" : formatMoneyInput(shift.cardTipsCents);
  draft.notes = shift.notes ?? "";
  draft.notesOpen = Boolean(shift.notes);
  draft.salesText = shift.salesCents == null ? "" : formatMoneyInput(shift.salesCents);
  draft.salesOpen = shift.salesCents != null;
  draft.tipOutOpen = shift.tipOutLines.length > 0;
  draft.tipOutKind = shift.tipOutLines[0]?.kind ?? "percent_of_sales";
  draft.tipOutLines =
    shift.tipOutLines.length > 0
      ? shift.tipOutLines.map((line) => ({
          key: nextLineKey(),
          label: line.label ?? "",
          amountText: line.kind === "flat" ? formatMoneyInput(line.amountCents) : "",
          percentText: line.basisPoints == null ? "" : formatPercentInput(line.basisPoints),
        }))
      : [emptyLine()];
  draft.settlement = shift.tipOutSettlement;
  draft.tipShareOpen = shift.tipShareMode !== "none";
  draft.tipShareTotalText = shift.tipShareMode === "total" ? formatMoneyInput(shift.tipShareCents) : "";
  draft.tipShareLines =
    shift.tipShareMode === "itemized"
      ? shift.tipShareLines.map((line) => ({
          key: nextLineKey(),
          label: line.label ?? "",
          amountText: formatMoneyInput(line.amountCents),
          percentText: "",
        }))
      : [];
  draft.mealChoice = shift.mealOverride ?? "infer";
  draft.doubleChoice = shift.doubleOverride === 1 ? "double" : shift.doubleOverride === 0 ? "single" : "infer";
  draft.classificationOpen = shift.mealOverride != null || shift.doubleOverride != null;
  return draft;
}

export function applyRole(draft: ShiftDraft, role: Role, profile: Profile, options?: { copySaved?: boolean }): ShiftDraft {
  const copySaved = options?.copySaved === true;
  const next: ShiftDraft = {
    ...draft,
    roleId: role.id,
    orphanRoleName: null,
    wageText: draft.wageText,
    saveUsualWage: false,
    wageTouched: draft.wageTouched,
    settlement: role.tipOutSettlement,
    settlementTouched: false,
    tipOutTouched: false,
    tipShareTouched: false,
    saveUsualTipOut: false,
    tipShareTotalText: "",
    tipShareLines: [],
  };
  const posture = effectivePosture(role);
  const defaults = role.tipOutDefaults;
  next.tipOutKind = defaults[0]?.kind ?? (posture === "tips_out" ? "percent_of_sales" : "flat");
  next.tipOutLines =
    copySaved && defaults.length > 0
      ? defaults.map((line) => ({
          key: nextLineKey(),
          label: line.label ?? "",
          amountText: line.kind === "flat" && line.amountCents != null ? formatMoneyInput(line.amountCents) : "",
          percentText: line.basisPoints != null ? formatPercentInput(line.basisPoints) : "",
        }))
      : [emptyLine()];
  if (posture === "tips_out") {
    next.tipOutOpen = true;
    next.tipShareOpen = false;
    next.salesOpen = next.tipOutKind === "percent_of_sales";
  } else if (posture === "receives_share") {
    next.tipOutOpen = false;
    next.tipShareOpen = true;
    next.salesOpen = false;
  } else {
    next.tipOutOpen = true;
    next.tipShareOpen = true;
    next.salesOpen = next.tipOutKind === "percent_of_sales";
  }
  return next;
}

export function roleIsTouched(draft: ShiftDraft): boolean {
  return draft.wageTouched || draft.tipOutTouched || draft.settlementTouched || draft.tipShareTouched;
}

export function usualTipOutQuestion(role: Role): string {
  const lines = role.tipOutDefaults;
  if (lines.length === 0) return `${role.name} usually has no tip-out. Use that?`;
  if (lines.length === 1) {
    const line = lines[0];
    const who = line.label ? `${line.label} ` : "";
    if (line.kind === "flat") return `${role.name} usually tips out ${who}${formatMoney(line.amountCents ?? 0)}. Use that?`;
    const base = line.kind === "percent_of_sales" ? "sales" : "tips";
    return `${role.name} usually tips out ${who}${formatPercent(line.basisPoints ?? 0)} of ${base}. Use that?`;
  }
  const kind = lines[0]?.kind;
  if (kind === "flat") {
    const parts = lines.map((line) => `${line.label ?? "Someone"} ${formatMoney(line.amountCents ?? 0)}`);
    return `${role.name} usually tips out ${joinAnd(parts)}. Use that?`;
  }
  const base = kind === "percent_of_sales" ? "sales" : "tips";
  const parts = lines.map((line) => `${line.label ?? "Someone"} ${formatPercent(line.basisPoints ?? 0)}`);
  return `${role.name} usually tips out ${joinAnd(parts)} of ${base}. Use that?`;
}

export function draftSignature(draft: ShiftDraft): string {
  const { wageTouched, tipOutTouched, settlementTouched, tipShareTouched, ...rest } = draft;
  return JSON.stringify(rest);
}

export function showSalesField(draft: ShiftDraft): boolean {
  return (draft.tipOutOpen && draft.tipOutKind === "percent_of_sales") || draft.salesOpen || draft.salesText.trim() !== "";
}

export function wageDiffersFromRole(draft: ShiftDraft, role: Role | undefined, profile: Profile): boolean {
  const parsed = parseMoney(draft.wageText);
  if (!role || parsed.status !== "ok") return false;
  const usual = role.defaultWageCents ?? profile.defaultWageCents;
  return parsed.cents !== usual;
}

export type PreparedShift = {
  errors: string[];
  warnings: string[];
  live: LiveFigures;
  write: ShiftWrite | null;
  counted: string;
};

export function prepareShift(draft: ShiftDraft, profile: Profile, roles: Role[], today: string): PreparedShift {
  const role = roles.find((item) => item.id === draft.roleId) ?? null;
  const parsed = toValidatable(draft, today);
  const validation = validateShift(parsed);
  const errors = [...validation.errors];
  if (!role) errors.unshift("Choose a role.");

  const duration = resolveDuration(draft);
  const live = liveFrom(draft, parsed, duration);
  const counted = countedLabel(draft, profile, duration);

  if (errors.length > 0 || !role || duration == null) {
    return { errors, warnings: validation.warnings, live, write: null, counted };
  }

  const calc = toCalcInput(draft, parsed, duration);
  let snapshot: ShiftSnapshot;
  try {
    snapshot = computeShift(calc);
  } catch {
    return {
      errors: [...errors, "Enter sales to calculate this tip-out, or switch it to a dollar amount."],
      warnings: validation.warnings,
      live,
      write: null,
      counted,
    };
  }

  const tipShareLines =
    calc.tipShareMode === "itemized"
      ? calc.tipShareLines.map((line) => ({ label: line.label, amountCents: line.amountCents }))
      : [];

  const write: ShiftWrite = {
    profileId: profile.id,
    roleId: role.id,
    roleName: role.name,
    shiftDate: draft.date,
    hoursMode: draft.hoursMode,
    startMinutes: draft.hoursMode === "clock" ? clockToMinutes(draft.startHour, draft.startMinute, draft.startAmPm) : null,
    endMinutes: draft.hoursMode === "clock" ? clockToMinutes(draft.endHour, draft.endMinute, draft.endAmPm) : null,
    wageCents: parsed.wageCents ?? 0,
    saveUsualWage: draft.saveUsualWage,
    tipsMode: draft.tipsMode,
    tipsTotalCents: calc.tipsTotalCents,
    cashTipsCents: calc.cashTipsCents,
    cardTipsCents: calc.cardTipsCents,
    salesCents: calc.salesCents,
    tipShareMode: calc.tipShareMode,
    mealOverride: parsedMeal(draft),
    doubleOverride: parsedDouble(draft),
    tipOutSettlement: draft.settlement,
    notes: draft.notes.trim() ? draft.notes.trim().slice(0, 500) : null,
    saveUsualTipOut: draft.saveUsualTipOut && draft.tipOutOpen,
    usualTipOut: usualLinesFromDraft(draft),
    snapshot,
    tipShareLines,
  };

  return {
    errors,
    warnings: validation.warnings,
    live: {
      hoursLabel: formatHoursPhrase(snapshot.durationMinutes),
      tipOutLabel: formatMoney(snapshot.tipOutTotalCents),
      netLabel: formatMoney(snapshot.netTipsCents),
      takeHomeLabel: formatMoney(snapshot.takeHomeCents),
      hourlyLabel: snapshot.realHourlyCents == null ? "—" : `${formatMoney(snapshot.realHourlyCents)}/hr`,
    },
    write,
    counted,
  };
}

export function tipOutPreview(draft: ShiftDraft): string {
  if (!draft.tipOutOpen) return "No tip-out";
  const entered = draft.tipOutLines.filter((line) => line.label.trim() || line.percentText.trim() || line.amountText.trim());
  if (entered.length === 0) return "No tip-out";
  const sales = parseMoney(draft.salesText);
  const guest = guestCents(draft);
  const salesCents = sales.status === "ok" ? sales.cents : null;
  if (draft.tipOutKind === "percent_of_sales" && salesCents == null) {
    return entered
      .map((line) => {
        const who = line.label.trim() ? `${line.label.trim()} ` : "";
        const percent = parsePercent(line.percentText);
        const rate = percent.status === "ok" ? formatPercent(percent.basisPoints) : "…";
        return `${who}${rate} of sales`;
      })
      .join(", ");
  }
  try {
    const computed = computeShift({
      durationMinutes: 60,
      wageCents: 0,
      tipsMode: "total",
      tipsTotalCents: guest,
      cashTipsCents: null,
      cardTipsCents: null,
      salesCents: draft.tipOutKind === "percent_of_sales" ? salesCents : null,
      tipShareMode: "none",
      tipShareTotalCents: null,
      tipShareLines: [],
      tipOutLines: activeTipOutLines(draft),
      settlement: draft.settlement,
    });
    if (computed.tipOutLines.length === 1 && !computed.tipOutLines[0]?.label) {
      const line = computed.tipOutLines[0];
      if (line.kind === "flat") return formatMoney(line.amountCents);
      const base = line.kind === "percent_of_sales" ? "sales" : "tips";
      return `${formatPercent(line.basisPoints ?? 0)} of ${base} = ${formatMoney(line.amountCents)}`;
    }
    return computed.tipOutLines
      .map((line) => {
        const who = line.label ? `${line.label} ` : "";
        if (line.kind === "flat") return `${who}${formatMoney(line.amountCents)}`;
        const base = line.kind === "percent_of_sales" ? "sales" : "tips";
        return `${who}${formatPercent(line.basisPoints ?? 0)} of ${base} (${formatMoney(line.amountCents)})`;
      })
      .join(", ");
  } catch {
    return "Enter sales to calculate this tip-out.";
  }
}

function blankDraft(date: string): ShiftDraft {
  return {
    date,
    roleId: null,
    orphanRoleName: null,
    hoursMode: "duration",
    startHour: "",
    startMinute: "",
    startAmPm: "pm",
    endHour: "",
    endMinute: "",
    endAmPm: "pm",
    hoursText: "",
    minutesText: "",
    wageText: "",
    saveUsualWage: false,
    tipsMode: "total",
    tipsTotalText: "",
    cashText: "",
    cardText: "",
    notesOpen: false,
    notes: "",
    salesOpen: false,
    salesText: "",
    tipOutOpen: false,
    tipOutKind: "percent_of_sales",
    tipOutLines: [emptyLine()],
    saveUsualTipOut: false,
    settlement: "cash",
    tipShareOpen: false,
    tipShareTotalText: "",
    tipShareLines: [],
    classificationOpen: false,
    mealChoice: "infer",
    doubleChoice: "infer",
    wageTouched: false,
    tipOutTouched: false,
    settlementTouched: false,
    tipShareTouched: false,
  };
}

function toValidatable(draft: ShiftDraft, today: string): ValidatableShift {
  const wage = moneyProblem(draft.wageText);
  const duration = durationFields(draft);
  const tips = tipsFields(draft);
  const sales = moneyProblem(draft.salesText);
  const share = shareFields(draft);
  return {
    shiftDate: draft.date,
    today,
    hoursMode: draft.hoursMode,
    startMinutes: duration.start,
    endMinutes: duration.end,
    durationMinutes: duration.minutes,
    durationProblem: duration.problem,
    wageCents: wage.cents,
    wageProblem: wage.problem === "blank" ? "blank" : wage.problem,
    tipsMode: draft.tipsMode,
    tipsTotalCents: tips.total,
    cashTipsCents: tips.cash,
    cardTipsCents: tips.card,
    tipsProblem: tips.problem,
    salesCents: draft.salesText.trim() === "" ? null : sales.cents,
    salesEntered: draft.salesText.trim() !== "",
    salesProblem: draft.salesText.trim() === "" ? null : sales.problem === "blank" ? null : sales.problem,
    tipOutLines: draft.tipOutOpen ? tipOutFields(draft) : [],
    tipShareMode: share.mode,
    tipShareTotalCents: share.total,
    tipShareProblem: share.problem,
    tipShareLines: share.lines,
    notes: draft.notes.trim() ? draft.notes.trim() : null,
    settlement: draft.settlement,
  };
}

function durationFields(draft: ShiftDraft): {
  start: number | null;
  end: number | null;
  minutes: number | null;
  problem: ValidatableShift["durationProblem"];
} {
  if (draft.hoursMode === "clock") {
    const startBlank = draft.startHour.trim() === "" && draft.startMinute.trim() === "";
    const endBlank = draft.endHour.trim() === "" && draft.endMinute.trim() === "";
    if (startBlank || endBlank) return { start: null, end: null, minutes: null, problem: "missing-clock" };
    const start = clockToMinutes(draft.startHour, draft.startMinute, draft.startAmPm);
    const end = clockToMinutes(draft.endHour, draft.endMinute, draft.endAmPm);
    if (start == null || end == null) return { start, end, minutes: null, problem: "bad-clock" };
    return { start, end, minutes: clockDurationMinutes(start, end), problem: null };
  }
  const parsed = parseDurationInput(draft.hoursText, draft.minutesText);
  if (!parsed.ok) return { start: null, end: null, minutes: null, problem: parsed.problem };
  return { start: null, end: null, minutes: parsed.minutes, problem: null };
}

function moneyProblem(text: string): { cents: number | null; problem: "blank" | "negative" | "invalid" | null } {
  const parsed = parseMoney(text);
  if (parsed.status === "blank") return { cents: null, problem: "blank" };
  if (parsed.status === "negative") return { cents: null, problem: "negative" };
  if (parsed.status === "invalid") return { cents: null, problem: "invalid" };
  return { cents: parsed.cents, problem: null };
}

function optionalMoney(text: string): { cents: number; problem: "negative" | "invalid" | null } {
  const parsed = moneyProblem(text);
  if (parsed.problem === "blank" || parsed.problem == null) return { cents: parsed.cents ?? 0, problem: null };
  return { cents: 0, problem: parsed.problem };
}

function tipsFields(draft: ShiftDraft): {
  total: number | null;
  cash: number | null;
  card: number | null;
  problem: "negative" | "invalid" | null;
} {
  if (draft.tipsMode === "total") {
    const money = optionalMoney(draft.tipsTotalText);
    return { total: money.problem ? null : money.cents, cash: null, card: null, problem: money.problem };
  }
  const cash = optionalMoney(draft.cashText);
  const card = optionalMoney(draft.cardText);
  const problem = cash.problem ?? card.problem;
  return { total: null, cash: problem ? null : cash.cents, card: problem ? null : card.cents, problem };
}

function tipOutFields(draft: ShiftDraft): FieldTipOut[] {
  return draft.tipOutLines.map((line) => {
    const percent = parsePercent(line.percentText);
    const amount = parseMoney(line.amountText);
    return {
      label: line.label.trim() ? line.label.trim() : null,
      kind: draft.tipOutKind,
      basisPoints: draft.tipOutKind === "flat" ? null : percent.status === "ok" ? percent.basisPoints : null,
      amountCents: draft.tipOutKind === "flat" && amount.status === "ok" ? amount.cents : null,
      percentInvalid: draft.tipOutKind !== "flat" && percent.status === "invalid",
      amountInvalid: draft.tipOutKind === "flat" && amount.status === "invalid",
      negative: percent.status === "negative" || amount.status === "negative",
    };
  });
}

function shareFields(draft: ShiftDraft): {
  mode: "none" | "total" | "itemized";
  total: number | null;
  problem: "negative" | "invalid" | null;
  lines: FieldTipShare[];
} {
  if (!draft.tipShareOpen) return { mode: "none", total: null, problem: null, lines: [] };
  const filled = draft.tipShareLines.filter((line) => line.label.trim() !== "" || line.amountText.trim() !== "");
  if (filled.length > 0) {
    const lines: FieldTipShare[] = filled.map((line) => {
      const amount = parseMoney(line.amountText);
      return {
        label: line.label.trim() ? line.label.trim() : null,
        amountCents: amount.status === "ok" ? amount.cents : null,
        amountInvalid: amount.status === "invalid",
        negative: amount.status === "negative",
      };
    });
    return { mode: "itemized", total: null, problem: null, lines };
  }
  const total = optionalMoney(draft.tipShareTotalText);
  return { mode: "total", total: total.problem ? null : total.cents, problem: total.problem, lines: [] };
}

function resolveDuration(draft: ShiftDraft): number | null {
  const fields = durationFields(draft);
  if (draft.hoursMode === "clock") {
    if (fields.start == null || fields.end == null) return null;
    return clockDurationMinutes(fields.start, fields.end);
  }
  return fields.minutes;
}

function guestCents(draft: ShiftDraft): number {
  if (draft.tipsMode === "total") {
    const parsed = parseMoney(draft.tipsTotalText);
    return parsed.status === "ok" ? parsed.cents : 0;
  }
  const cash = parseMoney(draft.cashText);
  const card = parseMoney(draft.cardText);
  return (cash.status === "ok" ? cash.cents : 0) + (card.status === "ok" ? card.cents : 0);
}

function activeTipOutLines(draft: ShiftDraft): ShiftCalcInput["tipOutLines"] {
  const lines: ShiftCalcInput["tipOutLines"] = [];
  for (const line of draft.tipOutLines) {
    const label = line.label.trim() ? line.label.trim() : null;
    if (draft.tipOutKind === "flat") {
      const amount = parseMoney(line.amountText);
      if (amount.status !== "ok" || amount.cents === 0) continue;
      lines.push({ label, kind: "flat", basisPoints: null, amountCents: amount.cents });
      continue;
    }
    const percent = parsePercent(line.percentText);
    if (percent.status !== "ok") continue;
    lines.push({ label, kind: draft.tipOutKind, basisPoints: percent.basisPoints, amountCents: null });
  }
  return lines;
}

function toCalcInput(draft: ShiftDraft, parsed: ValidatableShift, duration: number): ShiftCalcInput {
  const shareLines = parsed.tipShareLines
    .filter((line) => (line.amountCents ?? 0) > 0)
    .map((line) => ({ label: line.label, amountCents: line.amountCents ?? 0 }));
  let tipShareMode = parsed.tipShareMode;
  if (tipShareMode === "itemized" && shareLines.length === 0) tipShareMode = "none";
  return {
    durationMinutes: duration,
    wageCents: parsed.wageCents ?? 0,
    tipsMode: parsed.tipsMode,
    tipsTotalCents: parsed.tipsMode === "total" ? (parsed.tipsTotalCents ?? 0) : null,
    cashTipsCents: parsed.tipsMode === "split" ? (parsed.cashTipsCents ?? 0) : null,
    cardTipsCents: parsed.tipsMode === "split" ? (parsed.cardTipsCents ?? 0) : null,
    salesCents: parsed.salesEntered ? parsed.salesCents : null,
    tipShareMode,
    tipShareTotalCents: tipShareMode === "total" ? (parsed.tipShareTotalCents ?? 0) : null,
    tipShareLines: tipShareMode === "itemized" ? shareLines : [],
    tipOutLines: activeTipOutLines(draft),
    settlement: draft.settlement,
  };
}

function usualLinesFromDraft(draft: ShiftDraft): RoleTipOutWrite[] {
  if (!draft.tipOutOpen) return [];
  const lines: RoleTipOutWrite[] = [];
  for (const line of draft.tipOutLines) {
    const label = line.label.trim() ? line.label.trim() : null;
    if (draft.tipOutKind === "flat") {
      const amount = parseMoney(line.amountText);
      if (amount.status !== "ok" || amount.cents === 0) continue;
      lines.push({ label, kind: "flat", amountCents: amount.cents, basisPoints: null });
      continue;
    }
    const percent = parsePercent(line.percentText);
    if (percent.status !== "ok") continue;
    lines.push({ label, kind: draft.tipOutKind, amountCents: null, basisPoints: percent.basisPoints });
  }
  return lines;
}

function parsedMeal(draft: ShiftDraft): Meal | null {
  if (draft.mealChoice === "lunch" || draft.mealChoice === "dinner") return draft.mealChoice;
  return null;
}

function parsedDouble(draft: ShiftDraft): 0 | 1 | null {
  if (draft.doubleChoice === "double") return 1;
  if (draft.doubleChoice === "single") return 0;
  return null;
}

function liveFrom(draft: ShiftDraft, parsed: ValidatableShift, duration: number | null): LiveFigures {
  const dash = "—";
  const hoursLabel = duration == null ? dash : formatHoursPhrase(duration);
  if (duration == null || parsed.wageCents == null) {
    return { hoursLabel, tipOutLabel: dash, netLabel: dash, takeHomeLabel: dash, hourlyLabel: dash };
  }
  try {
    const snapshot = computeShift(toCalcInput(draft, parsed, duration));
    return {
      hoursLabel,
      tipOutLabel: formatMoney(snapshot.tipOutTotalCents),
      netLabel: formatMoney(snapshot.netTipsCents),
      takeHomeLabel: formatMoney(snapshot.takeHomeCents),
      hourlyLabel: snapshot.realHourlyCents == null ? dash : `${formatMoney(snapshot.realHourlyCents)}/hr`,
    };
  } catch {
    return { hoursLabel, tipOutLabel: dash, netLabel: dash, takeHomeLabel: dash, hourlyLabel: dash };
  }
}

function countedLabel(draft: ShiftDraft, profile: Profile, duration: number | null): string {
  const start = draft.hoursMode === "clock" ? clockToMinutes(draft.startHour, draft.startMinute, draft.startAmPm) : null;
  const meal = resolveMeal({
    mealOverride: parsedMeal(draft),
    startMinutes: start,
    lunchCutoffMinutes: profile.lunchCutoffMinutes,
  });
  const mealText = meal === "unknown" ? "Meal not set" : meal === "lunch" ? "Lunch" : "Dinner";
  if (duration == null) return `${mealText}. Enter hours to count a double / all-day.`;
  const length = resolveDouble({
    doubleOverride: parsedDouble(draft),
    durationMinutes: duration,
    doubleThresholdMinutes: profile.doubleThresholdMinutes,
  });
  const lengthText = length === "double" ? "Double / all-day" : "Single";
  return `Counted as ${mealText}, ${lengthText}.`;
}

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function formatThreshold(minutes: number): string {
  return formatHoursPhrase(minutes);
}

export function formatCutoff(minutes: number): string {
  return formatClock(minutes);
}
