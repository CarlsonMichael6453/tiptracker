import { emptyBudget, type BudgetLedger } from "../budget/types";
import type { BillFrequency, BudgetBill } from "./budget";
import type { WebState } from "../db/types";
import type {
  AppearanceSettings,
  GoalEntry,
  GoalEntryKind,
  PayStub,
  Profile,
  Role,
  SavingsGoal,
  ShiftRecord,
  TipOutDefault,
  TipOutLineRecord,
  TipShareLineRecord,
} from "../domain/types";
import { isCivilDate } from "./dates";
import { parseAppearance } from "../ui/appearance";
import { resolveGoalStyle } from "./goalStyle";

export const BACKUP_FORMAT = "tiptracker-backup";
export const BACKUP_VERSION = 1;

export type BackupDocument = WebState & {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
};

export type ParseBackupResult = { ok: true; backup: BackupDocument } | { ok: false; error: string };

export function backupFilename(now = new Date()): string {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `tip-tracker-backup-${day}.json`;
}

export function serializeBackup(state: WebState, exportedAt = new Date().toISOString()): string {
  const document: BackupDocument = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    profiles: state.profiles,
    roles: state.roles,
    shifts: state.shifts,
    goals: state.goals ?? [],
    goalEntries: state.goalEntries ?? [],
    payStubs: state.payStubs ?? [],
    budgets: state.budgets ?? [],
    kv: state.kv ?? {},
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function ledgerFromBackup(backup: BackupDocument): WebState {
  return {
    profiles: backup.profiles,
    roles: backup.roles,
    shifts: backup.shifts,
    goals: backup.goals,
    goalEntries: backup.goalEntries,
    payStubs: backup.payStubs,
    budgets: backup.budgets,
    kv: backup.kv,
  };
}

export function shiftTotals(shifts: ShiftRecord[]): {
  count: number;
  takeHomeCents: number;
  tipOutTotalCents: number;
  wageEarningsCents: number;
} {
  return {
    count: shifts.length,
    takeHomeCents: shifts.reduce((sum, shift) => sum + shift.takeHomeCents, 0),
    tipOutTotalCents: shifts.reduce((sum, shift) => sum + shift.tipOutTotalCents, 0),
    wageEarningsCents: shifts.reduce((sum, shift) => sum + shift.wageEarningsCents, 0),
  };
}

export function parseBackup(json: string): ParseBackupResult {
  const trimmed = json.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return fail("This backup is empty.");
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return fail("This file is not a Tip Tracker backup.");
  }
  if (!isRecord(raw)) return fail("This file is not a Tip Tracker backup.");
  if (raw.format !== BACKUP_FORMAT) return fail("This file is not a Tip Tracker backup.");
  if (typeof raw.version !== "number" || !Number.isInteger(raw.version)) {
    return fail("This file is not a Tip Tracker backup.");
  }
  if (raw.version !== BACKUP_VERSION) {
    return fail(raw.version > BACKUP_VERSION ? "This backup is from a newer Tip Tracker." : "This backup is too old for this copy of Tip Tracker.");
  }
  if (!Array.isArray(raw.profiles) || !Array.isArray(raw.roles) || !Array.isArray(raw.shifts)) {
    return fail("This backup is missing profiles, roles, or shifts.");
  }

  const profiles: Profile[] = [];
  const profileIds = new Set<string>();
  for (const item of raw.profiles) {
    const profile = readProfile(item);
    if (!profile) return fail("This backup has a profile that cannot be read.");
    if (profileIds.has(profile.id)) return fail("This backup has two profiles with the same id.");
    profileIds.add(profile.id);
    profiles.push(profile);
  }

  const roles: Role[] = [];
  const roleIds = new Set<string>();
  const roleNames = new Set<string>();
  for (const item of raw.roles) {
    const role = readRole(item, profileIds);
    if (!role) return fail("This backup has a role that cannot be read.");
    if (roleIds.has(role.id)) return fail("This backup has two roles with the same id.");
    const nameKey = `${role.profileId}:${role.name.toLowerCase()}`;
    if (roleNames.has(nameKey)) return fail("This backup has two roles with the same name on one profile.");
    roleIds.add(role.id);
    roleNames.add(nameKey);
    roles.push(role);
  }

  const shifts: ShiftRecord[] = [];
  const shiftIds = new Set<string>();
  for (const item of raw.shifts) {
    const shift = readShift(item, profileIds, roleIds);
    if (!shift) return fail("This backup has a shift that cannot be read.");
    if (shiftIds.has(shift.id)) return fail("This backup has two shifts with the same id.");
    shiftIds.add(shift.id);
    shifts.push(shift);
  }

  const goals: SavingsGoal[] = [];
  const goalIds = new Set<string>();
  const rawGoals = Array.isArray(raw.goals) ? raw.goals : [];
  for (const item of rawGoals) {
    const goal = readGoal(item, profileIds);
    if (!goal) return fail("This backup has a savings goal that cannot be read.");
    if (goalIds.has(goal.id)) return fail("This backup has two savings goals with the same id.");
    goalIds.add(goal.id);
    goals.push(goal);
  }

  const goalEntries: GoalEntry[] = [];
  const entryIds = new Set<string>();
  const rawEntries = Array.isArray(raw.goalEntries) ? raw.goalEntries : [];
  for (const item of rawEntries) {
    const entry = readGoalEntry(item, goalIds);
    if (!entry) return fail("This backup has a goal entry that cannot be read.");
    if (entryIds.has(entry.id)) return fail("This backup has two goal entries with the same id.");
    entryIds.add(entry.id);
    goalEntries.push(entry);
  }

  const payStubs: PayStub[] = [];
  const stubIds = new Set<string>();
  const rawStubs = Array.isArray(raw.payStubs) ? raw.payStubs : [];
  for (const item of rawStubs) {
    const stub = readPayStub(item, profileIds);
    if (!stub) return fail("This backup has a pay stub that cannot be read.");
    if (stubIds.has(stub.id)) return fail("This backup has two pay stubs with the same id.");
    stubIds.add(stub.id);
    payStubs.push(stub);
  }

  const budgets: BudgetLedger[] = [];
  const budgetProfiles = new Set<string>();
  const rawBudgets = Array.isArray(raw.budgets) ? raw.budgets : [];
  for (const item of rawBudgets) {
    const ledger = readBudget(item, profileIds);
    if (!ledger) return fail("This backup has a budget that cannot be read.");
    if (budgetProfiles.has(ledger.profileId)) return fail("This backup has two budgets for the same profile.");
    budgetProfiles.add(ledger.profileId);
    budgets.push(ledger);
  }

  const kv = readKv(raw.kv);
  if (!kv) return fail("This backup has settings that cannot be read.");

  const exportedAt = typeof raw.exportedAt === "string" && raw.exportedAt.trim() ? raw.exportedAt : new Date().toISOString();
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      profiles,
      roles,
      shifts,
      goals,
      goalEntries,
      payStubs,
      budgets,
      kv,
    },
  };
}

function fail(error: string): ParseBackupResult {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 80;
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isNonNegInt(value: unknown): value is number {
  return isInt(value) && value >= 0;
}

function optionalString(value: unknown): string | null | undefined {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

function readProfile(raw: unknown): Profile | null {
  if (!isRecord(raw) || !isId(raw.id) || typeof raw.name !== "string") return null;
  const name = raw.name.trim();
  if (name.length < 1 || name.length > 40) return null;
  if (!isNonNegInt(raw.defaultWageCents)) return null;
  if (!isInt(raw.weekStartsOn) || raw.weekStartsOn < 0 || raw.weekStartsOn > 6) return null;
  if (!isInt(raw.lunchCutoffMinutes) || raw.lunchCutoffMinutes < 0 || raw.lunchCutoffMinutes > 1439) return null;
  if (!isInt(raw.doubleThresholdMinutes) || raw.doubleThresholdMinutes < 360 || raw.doubleThresholdMinutes > 720) return null;
  if (raw.lastRoleId != null && !isId(raw.lastRoleId)) return null;
  if (typeof raw.createdAt !== "string" || typeof raw.updatedAt !== "string") return null;
  const weekly = raw.weeklyGoalCents;
  const celebrated = raw.tipJarCelebratedWeek;
  const appearance: AppearanceSettings = parseAppearance(raw.appearance);
  return {
    id: raw.id,
    name,
    defaultWageCents: raw.defaultWageCents,
    weekStartsOn: raw.weekStartsOn,
    lunchCutoffMinutes: raw.lunchCutoffMinutes,
    doubleThresholdMinutes: raw.doubleThresholdMinutes,
    lastRoleId: raw.lastRoleId == null ? null : raw.lastRoleId,
    appearance,
    weeklyGoalCents: isInt(weekly) && weekly > 0 ? weekly : null,
    showTipJar: raw.showTipJar === false ? false : true,
    goalIndicator: resolveGoalStyle(typeof raw.goalIndicator === "string" ? raw.goalIndicator : undefined, raw.showTipJar !== false),
    tipJarCelebratedWeek: typeof celebrated === "string" && isCivilDate(celebrated) ? celebrated : null,
    payPeriodStartsOn: isInt(raw.payPeriodStartsOn) && raw.payPeriodStartsOn >= 0 && raw.payPeriodStartsOn <= 6 ? raw.payPeriodStartsOn : 5,
    payPeriodWeeks: raw.payPeriodWeeks === 2 ? 2 : 1,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function readRole(raw: unknown, profileIds: Set<string>): Role | null {
  if (!isRecord(raw) || !isId(raw.id) || !isId(raw.profileId) || !profileIds.has(raw.profileId)) return null;
  if (typeof raw.name !== "string" || !raw.name.trim()) return null;
  if (raw.posture !== "tips_out" && raw.posture !== "receives_share" && raw.posture !== "both") return null;
  if (raw.defaultWageCents != null && !isNonNegInt(raw.defaultWageCents)) return null;
  if (raw.tipOutSettlement !== "cash" && raw.tipOutSettlement !== "paycheck") return null;
  if (!isInt(raw.sortOrder)) return null;
  if (!Array.isArray(raw.tipOutDefaults)) return null;
  const tipOutDefaults: TipOutDefault[] = [];
  for (const line of raw.tipOutDefaults) {
    const read = readTipOutDefault(line);
    if (!read) return null;
    tipOutDefaults.push(read);
  }
  return {
    id: raw.id,
    profileId: raw.profileId,
    name: raw.name.trim(),
    posture: raw.posture,
    defaultWageCents: raw.defaultWageCents ?? null,
    tipOutSettlement: raw.tipOutSettlement,
    sortOrder: raw.sortOrder,
    tipOutDefaults,
    tipOutCustomized: raw.tipOutCustomized === true,
  };
}

function readTipOutDefault(raw: unknown): TipOutDefault | null {
  if (!isRecord(raw) || !isId(raw.id)) return null;
  if (raw.kind !== "flat" && raw.kind !== "percent_of_sales" && raw.kind !== "percent_of_tips") return null;
  if (raw.amountCents != null && !isNonNegInt(raw.amountCents)) return null;
  if (raw.basisPoints != null && !isNonNegInt(raw.basisPoints)) return null;
  if (!isInt(raw.sortOrder)) return null;
  const label = optionalString(raw.label);
  if (label === undefined) return null;
  return {
    id: raw.id,
    label,
    kind: raw.kind,
    amountCents: raw.amountCents ?? null,
    basisPoints: raw.basisPoints ?? null,
    sortOrder: raw.sortOrder,
  };
}

function readShift(raw: unknown, profileIds: Set<string>, roleIds: Set<string>): ShiftRecord | null {
  if (!isRecord(raw) || !isId(raw.id) || !isId(raw.profileId) || !profileIds.has(raw.profileId)) return null;
  if (typeof raw.roleName !== "string" || !raw.roleName.trim()) return null;
  if (typeof raw.shiftDate !== "string" || !isCivilDate(raw.shiftDate)) return null;
  if (raw.hoursMode !== "clock" && raw.hoursMode !== "duration") return null;
  if (raw.hoursMode === "clock") {
    if (!isNonNegInt(raw.startMinutes) || !isNonNegInt(raw.endMinutes) || raw.startMinutes === raw.endMinutes) return null;
    if (!isInt(raw.durationMinutes) || raw.durationMinutes < 1 || raw.durationMinutes > 1439) return null;
  } else {
    if (raw.startMinutes != null || raw.endMinutes != null) return null;
    if (!isInt(raw.durationMinutes) || raw.durationMinutes < 1 || raw.durationMinutes > 1440) return null;
  }
  if (!isNonNegInt(raw.wageCents)) return null;
  if (raw.tipsMode !== "total" && raw.tipsMode !== "split") return null;
  if (raw.tipsMode === "total") {
    if (!isNonNegInt(raw.tipsTotalCents) || raw.cashTipsCents != null || raw.cardTipsCents != null) return null;
  } else if (raw.tipsTotalCents != null || !isNonNegInt(raw.cashTipsCents) || !isNonNegInt(raw.cardTipsCents)) {
    return null;
  }
  if (raw.salesCents != null && !isNonNegInt(raw.salesCents)) return null;
  if (raw.tipShareMode !== "none" && raw.tipShareMode !== "total" && raw.tipShareMode !== "itemized") return null;
  if (raw.mealOverride != null && raw.mealOverride !== "lunch" && raw.mealOverride !== "dinner") return null;
  if (raw.doubleOverride != null && raw.doubleOverride !== 0 && raw.doubleOverride !== 1) return null;
  if (raw.tipOutSettlement !== "cash" && raw.tipOutSettlement !== "paycheck") return null;
  const notes = optionalString(raw.notes);
  if (notes === undefined || (notes != null && notes.length > 500)) return null;
  if (!isInt(raw.guestTipsCents) || !isNonNegInt(raw.tipShareCents) || !isInt(raw.grossTipsCents)) return null;
  if (!isNonNegInt(raw.tipOutTotalCents) || !isInt(raw.wageEarningsCents) || !isInt(raw.netTipsCents) || !isInt(raw.takeHomeCents)) {
    return null;
  }
  if (raw.tipShareMode === "none" && raw.tipShareCents !== 0) return null;
  if (typeof raw.createdAt !== "string" || typeof raw.updatedAt !== "string") return null;
  // A missing role (deleted after the shift was logged) keeps the name and drops the id.
  let resolvedRoleId: string | null;
  if (raw.roleId == null) resolvedRoleId = null;
  else if (isId(raw.roleId) && roleIds.has(raw.roleId)) resolvedRoleId = raw.roleId;
  else if (isId(raw.roleId)) resolvedRoleId = null;
  else return null;
  if (!Array.isArray(raw.tipOutLines) || !Array.isArray(raw.tipShareLines)) return null;
  const tipOutLines: TipOutLineRecord[] = [];
  for (const line of raw.tipOutLines) {
    const read = readTipOutLine(line);
    if (!read) return null;
    tipOutLines.push(read);
  }
  const tipShareLines: TipShareLineRecord[] = [];
  for (const line of raw.tipShareLines) {
    const read = readTipShareLine(line);
    if (!read) return null;
    tipShareLines.push(read);
  }
  return {
    id: raw.id,
    profileId: raw.profileId,
    roleId: resolvedRoleId,
    roleName: raw.roleName,
    shiftDate: raw.shiftDate,
    hoursMode: raw.hoursMode,
    startMinutes: raw.hoursMode === "clock" ? (raw.startMinutes as number) : null,
    endMinutes: raw.hoursMode === "clock" ? (raw.endMinutes as number) : null,
    durationMinutes: raw.durationMinutes as number,
    wageCents: raw.wageCents as number,
    tipsMode: raw.tipsMode,
    tipsTotalCents: raw.tipsMode === "total" ? (raw.tipsTotalCents as number) : null,
    cashTipsCents: raw.tipsMode === "split" ? (raw.cashTipsCents as number) : null,
    cardTipsCents: raw.tipsMode === "split" ? (raw.cardTipsCents as number) : null,
    salesCents: raw.salesCents ?? null,
    tipShareMode: raw.tipShareMode,
    mealOverride: raw.mealOverride ?? null,
    doubleOverride: raw.doubleOverride === 0 || raw.doubleOverride === 1 ? raw.doubleOverride : null,
    tipOutSettlement: raw.tipOutSettlement,
    notes,
    guestTipsCents: raw.guestTipsCents,
    tipShareCents: raw.tipShareCents,
    grossTipsCents: raw.grossTipsCents,
    tipOutTotalCents: raw.tipOutTotalCents,
    wageEarningsCents: raw.wageEarningsCents,
    netTipsCents: raw.netTipsCents,
    takeHomeCents: raw.takeHomeCents,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    tipOutLines,
    tipShareLines,
  };
}

function readTipOutLine(raw: unknown): TipOutLineRecord | null {
  if (!isRecord(raw) || !isId(raw.id)) return null;
  if (raw.kind !== "flat" && raw.kind !== "percent_of_sales" && raw.kind !== "percent_of_tips") return null;
  if (raw.basisPoints != null && !isNonNegInt(raw.basisPoints)) return null;
  if (!isNonNegInt(raw.amountCents) || !isInt(raw.sortOrder)) return null;
  const label = optionalString(raw.label);
  if (label === undefined) return null;
  return { id: raw.id, label, kind: raw.kind, basisPoints: raw.basisPoints ?? null, amountCents: raw.amountCents, sortOrder: raw.sortOrder };
}

function readTipShareLine(raw: unknown): TipShareLineRecord | null {
  if (!isRecord(raw) || !isId(raw.id) || !isNonNegInt(raw.amountCents) || !isInt(raw.sortOrder)) return null;
  const label = optionalString(raw.label);
  if (label === undefined) return null;
  return { id: raw.id, label, amountCents: raw.amountCents, sortOrder: raw.sortOrder };
}

function readGoal(raw: unknown, profileIds: Set<string>): SavingsGoal | null {
  if (!isRecord(raw) || !isId(raw.id) || !isId(raw.profileId) || !profileIds.has(raw.profileId)) return null;
  if (typeof raw.name !== "string" || !raw.name.trim()) return null;
  if (!isInt(raw.targetCents) || raw.targetCents <= 0) return null;
  if (raw.targetDate != null && (typeof raw.targetDate !== "string" || !isCivilDate(raw.targetDate))) return null;
  if (raw.horizon !== "short" && raw.horizon !== "long") return null;
  if (!isNonNegInt(raw.weeklySetAsideCents) || !isNonNegInt(raw.savedCents)) return null;
  if (raw.status !== "active" && raw.status !== "complete" && raw.status !== "archived") return null;
  if (typeof raw.createdAt !== "string" || typeof raw.updatedAt !== "string") return null;
  return {
    id: raw.id,
    profileId: raw.profileId,
    name: raw.name.trim().slice(0, 40),
    targetCents: raw.targetCents,
    targetDate: raw.targetDate ?? null,
    horizon: raw.horizon,
    weeklySetAsideCents: raw.weeklySetAsideCents,
    savedCents: raw.savedCents,
    status: raw.status,
    celebrated: raw.celebrated === true,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function readGoalEntry(raw: unknown, goalIds: Set<string>): GoalEntry | null {
  if (!isRecord(raw) || !isId(raw.id) || !isId(raw.goalId) || !goalIds.has(raw.goalId)) return null;
  const kinds: GoalEntryKind[] = ["set_aside", "add", "withdraw", "adjust", "skip"];
  if (!kinds.includes(raw.kind as GoalEntryKind) || !isInt(raw.amountCents)) return null;
  if (raw.weekStart != null && (typeof raw.weekStart !== "string" || !isCivilDate(raw.weekStart))) return null;
  if (typeof raw.createdAt !== "string") return null;
  return {
    id: raw.id,
    goalId: raw.goalId,
    kind: raw.kind as GoalEntryKind,
    amountCents: raw.amountCents,
    weekStart: raw.weekStart ?? null,
    createdAt: raw.createdAt,
  };
}

function readPayStub(raw: unknown, profileIds: Set<string>): PayStub | null {
  if (!isRecord(raw) || !isId(raw.id) || !isId(raw.profileId) || !profileIds.has(raw.profileId)) return null;
  if (typeof raw.periodStart !== "string" || !isCivilDate(raw.periodStart)) return null;
  if (typeof raw.periodEnd !== "string" || !isCivilDate(raw.periodEnd)) return null;
  if (raw.payDate != null && (typeof raw.payDate !== "string" || !isCivilDate(raw.payDate))) return null;
  const numbers = [
    raw.regularMinutes,
    raw.overtimeMinutes,
    raw.hourlyRateCents,
    raw.grossWagesCents,
    raw.cashTipsCents,
    raw.cardTipsCents,
    raw.grossPayCents,
    raw.otherDeductionsCents,
    raw.netPayCents,
  ];
  if (!numbers.every(isInt) || typeof raw.createdAt !== "string") return null;
  const regularMinutes = raw.regularMinutes as number;
  const overtimeMinutes = raw.overtimeMinutes as number;
  const hourlyRateCents = raw.hourlyRateCents as number;
  const grossWagesCents = raw.grossWagesCents as number;
  const cashTipsCents = raw.cashTipsCents as number;
  const cardTipsCents = raw.cardTipsCents as number;
  const grossPayCents = raw.grossPayCents as number;
  const otherDeductionsCents = raw.otherDeductionsCents as number;
  const netPayCents = raw.netPayCents as number;
  if (!Array.isArray(raw.taxes) || !isRecord(raw.confidence)) return null;
  const taxes: { name: string; cents: number }[] = [];
  for (const tax of raw.taxes) {
    if (!isRecord(tax) || typeof tax.name !== "string" || !isInt(tax.cents)) return null;
    taxes.push({ name: tax.name, cents: tax.cents });
  }
  const confidence: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw.confidence)) {
    if (typeof value !== "number") return null;
    confidence[key] = value;
  }
  if (raw.photoDataUrl != null && typeof raw.photoDataUrl !== "string") return null;
  return {
    id: raw.id,
    profileId: raw.profileId,
    periodStart: raw.periodStart,
    periodEnd: raw.periodEnd,
    payDate: raw.payDate ?? null,
    regularMinutes,
    overtimeMinutes,
    hourlyRateCents,
    grossWagesCents,
    cashTipsCents,
    cardTipsCents,
    grossPayCents,
    otherDeductionsCents,
    netPayCents,
    taxes,
    confidence,
    photoDataUrl: raw.photoDataUrl ?? null,
    createdAt: raw.createdAt,
  };
}

function readBudget(raw: unknown, profileIds: Set<string>): BudgetLedger | null {
  if (!isRecord(raw) || !isId(raw.profileId) || !profileIds.has(raw.profileId)) return null;
  const base = emptyBudget(raw.profileId);
  const baselineMode = raw.baselineMode === "floor" || raw.baselineMode === "percentile" ? raw.baselineMode : base.baselineMode;
  if (raw.floorCents != null && !isNonNegInt(raw.floorCents)) return null;
  if (raw.taxBps != null && !isNonNegInt(raw.taxBps)) return null;
  if (raw.bufferCents != null && !isNonNegInt(raw.bufferCents)) return null;
  if (raw.bills != null && !Array.isArray(raw.bills)) return null;
  if (raw.envelopes != null && !Array.isArray(raw.envelopes)) return null;
  if (raw.spends != null && !Array.isArray(raw.spends)) return null;
  if (raw.cash != null && !Array.isArray(raw.cash)) return null;
  if (raw.taxEntries != null && !Array.isArray(raw.taxEntries)) return null;

  const bills: BudgetBill[] = [];
  for (const bill of (raw.bills ?? []) as unknown[]) {
    if (!isRecord(bill) || !isId(bill.id) || typeof bill.name !== "string" || !isNonNegInt(bill.amountCents)) return null;
    if (bill.frequency !== "weekly" && bill.frequency !== "monthly" && bill.frequency !== "yearly") return null;
    const frequency: BillFrequency = bill.frequency;
    if (!isInt(bill.dueDay)) return null;
    if (bill.dueMonth != null && (!isInt(bill.dueMonth) || bill.dueMonth < 1 || bill.dueMonth > 12)) return null;
    bills.push({
      id: bill.id,
      name: bill.name,
      amountCents: bill.amountCents,
      frequency,
      dueDay: bill.dueDay,
      dueMonth: bill.dueMonth ?? null,
      sinking: bill.sinking === true,
    });
  }
  const envelopes = [];
  for (const envelope of (raw.envelopes ?? []) as unknown[]) {
    if (!isRecord(envelope) || !isId(envelope.id) || typeof envelope.name !== "string" || !isNonNegInt(envelope.weeklyCents)) return null;
    envelopes.push({ id: envelope.id, name: envelope.name, weeklyCents: envelope.weeklyCents });
  }
  const spends = [];
  for (const spend of (raw.spends ?? []) as unknown[]) {
    if (!isRecord(spend) || !isId(spend.id) || typeof spend.name !== "string" || !isInt(spend.cents)) return null;
    if (typeof spend.date !== "string" || !isCivilDate(spend.date) || typeof spend.category !== "string") return null;
    if (spend.envelopeId != null && !isId(spend.envelopeId)) return null;
    spends.push({
      id: spend.id,
      envelopeId: spend.envelopeId ?? null,
      name: spend.name,
      cents: spend.cents,
      date: spend.date,
      work: spend.work === true,
      category: spend.category,
    });
  }
  const cash = [];
  for (const chip of (raw.cash ?? []) as unknown[]) {
    if (!isRecord(chip) || !isId(chip.id) || !isInt(chip.cents) || typeof chip.date !== "string" || !isCivilDate(chip.date)) return null;
    if (chip.shiftId != null && !isId(chip.shiftId)) return null;
    cash.push({ id: chip.id, shiftId: chip.shiftId ?? null, cents: chip.cents, deposited: chip.deposited === true, date: chip.date });
  }
  const taxEntries = [];
  for (const entry of (raw.taxEntries ?? []) as unknown[]) {
    if (!isRecord(entry) || !isId(entry.id) || typeof entry.weekStart !== "string" || !isCivilDate(entry.weekStart) || !isInt(entry.cents)) {
      return null;
    }
    taxEntries.push({ id: entry.id, weekStart: entry.weekStart, cents: entry.cents });
  }
  return {
    profileId: raw.profileId,
    baselineMode,
    floorCents: isNonNegInt(raw.floorCents) ? raw.floorCents : base.floorCents,
    taxBps: isNonNegInt(raw.taxBps) ? raw.taxBps : base.taxBps,
    bufferCents: isNonNegInt(raw.bufferCents) ? raw.bufferCents : base.bufferCents,
    reminders: raw.reminders === true,
    bills,
    envelopes,
    spends,
    cash,
    taxEntries,
  };
}

function readKv(raw: unknown): Record<string, string> | null {
  if (raw == null) return {};
  if (!isRecord(raw)) return null;
  const kv: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string") return null;
    kv[key] = value;
  }
  return kv;
}
