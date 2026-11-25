import type { SQLiteDatabase } from "expo-sqlite";
import { emptyBudget, type BudgetLedger } from "../budget/types";
import { ledgerFromBackup, parseBackup, serializeBackup, type ParseBackupResult } from "../calc/backup";
import { nowIso } from "../db/time";
import { isWebDatabase, type AppDatabase, type WebState } from "../db/types";
import type { GoalEntry, PayStub, Profile, Role, SavingsGoal, ShiftRecord } from "../domain/types";
import { getBudget } from "./budget";
import { listGoalEntries, listGoals } from "./goals";
import { listPayStubs } from "./payStubs";
import { listProfiles, listRoles, listShifts } from "./repository";

/** JSON text of every profile, role, shift, budget, goal, pay stub, and setting. */
export async function exportBackup(db: AppDatabase): Promise<string> {
  return serializeBackup(await readLedger(db));
}

/**
 * Replaces everything in the database with a valid backup.
 * Returns the parse error and leaves existing data alone when the file is invalid.
 */
export async function importBackup(db: AppDatabase, json: string): Promise<ParseBackupResult> {
  const parsed = parseBackup(json);
  if (!parsed.ok) return parsed;
  await writeLedger(db, ledgerFromBackup(parsed.backup));
  return parsed;
}

async function readLedger(db: AppDatabase): Promise<WebState> {
  if (isWebDatabase(db)) {
    return db.read((state) => ({
      profiles: state.profiles,
      roles: state.roles,
      shifts: state.shifts,
      goals: state.goals ?? [],
      goalEntries: state.goalEntries ?? [],
      payStubs: state.payStubs ?? [],
      budgets: state.budgets ?? [],
      kv: state.kv ?? {},
    }));
  }
  const profiles = await listProfiles(db);
  const roles: Role[] = [];
  const shifts: ShiftRecord[] = [];
  const goals: SavingsGoal[] = [];
  const goalEntries: GoalEntry[] = [];
  const payStubs: PayStub[] = [];
  const budgets: BudgetLedger[] = [];
  for (const profile of profiles) {
    roles.push(...(await listRoles(db, profile.id)));
    shifts.push(...(await listShifts(db, profile.id)));
    const listedGoals = await listGoals(db, profile.id);
    goals.push(...listedGoals);
    for (const goal of listedGoals) {
      goalEntries.push(...(await listGoalEntries(db, goal.id)));
    }
    payStubs.push(...(await listPayStubs(db, profile.id)));
    const budget = await getBudget(db, profile.id);
    if (!isDefaultBudget(budget)) budgets.push(budget);
  }
  const kvRows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_kv");
  const kv: Record<string, string> = {};
  for (const row of kvRows) kv[row.key] = row.value;
  return { profiles, roles, shifts, goals, goalEntries, payStubs, budgets, kv };
}

async function writeLedger(db: AppDatabase, state: WebState): Promise<void> {
  if (isWebDatabase(db)) {
    await db.update((current) => {
      current.profiles = state.profiles;
      current.roles = state.roles;
      current.shifts = state.shifts;
      current.goals = state.goals;
      current.goalEntries = state.goalEntries;
      current.payStubs = state.payStubs;
      current.budgets = state.budgets;
      current.kv = { ...state.kv };
    });
    return;
  }
  const sqlite = db;
  const stamped = nowIso();
  await sqlite.withTransactionAsync(async () => {
    await sqlite.runAsync("DELETE FROM profile");
    await sqlite.runAsync("DELETE FROM app_kv");
    for (const profile of state.profiles) await insertProfile(sqlite, profile);
    for (const role of state.roles) await insertRole(sqlite, role, stamped);
    for (const shift of state.shifts) await insertShift(sqlite, shift);
    for (const goal of state.goals) await insertGoal(sqlite, goal);
    for (const entry of state.goalEntries) await insertGoalEntry(sqlite, entry);
    for (const stub of state.payStubs) await insertPayStub(sqlite, stub);
    for (const ledger of state.budgets) {
      await sqlite.runAsync(
        "INSERT INTO budget_ledger (profile_id, json) VALUES (?, ?)",
        ledger.profileId,
        JSON.stringify(ledger),
      );
    }
    for (const [key, value] of Object.entries(state.kv)) {
      await sqlite.runAsync("INSERT INTO app_kv (key, value) VALUES (?, ?)", key, value);
    }
  });
}

function isDefaultBudget(ledger: BudgetLedger): boolean {
  const empty = emptyBudget(ledger.profileId);
  return (
    ledger.baselineMode === empty.baselineMode &&
    ledger.floorCents === empty.floorCents &&
    ledger.taxBps === empty.taxBps &&
    ledger.bufferCents === empty.bufferCents &&
    ledger.reminders === empty.reminders &&
    ledger.bills.length === 0 &&
    ledger.envelopes.length === 0 &&
    ledger.spends.length === 0 &&
    ledger.cash.length === 0 &&
    ledger.taxEntries.length === 0
  );
}

async function insertProfile(db: SQLiteDatabase, profile: Profile): Promise<void> {
  await db.runAsync(
    `INSERT INTO profile (
      id, name, default_wage_cents, week_starts_on, lunch_cutoff_minutes, double_threshold_minutes,
      last_role_id, appearance_json, weekly_goal_cents, show_tip_jar, tip_jar_celebrated_week,
      goal_indicator, pay_period_starts_on, pay_period_weeks, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    profile.id,
    profile.name,
    profile.defaultWageCents,
    profile.weekStartsOn,
    profile.lunchCutoffMinutes,
    profile.doubleThresholdMinutes,
    profile.lastRoleId,
    JSON.stringify(profile.appearance),
    profile.weeklyGoalCents,
    profile.showTipJar ? 1 : 0,
    profile.tipJarCelebratedWeek,
    profile.goalIndicator,
    profile.payPeriodStartsOn,
    profile.payPeriodWeeks,
    profile.createdAt,
    profile.updatedAt,
  );
}

async function insertRole(db: SQLiteDatabase, role: Role, stamped: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO role (id, profile_id, name, posture, default_wage_cents, tip_out_settlement, tip_out_customized, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    role.id,
    role.profileId,
    role.name,
    role.posture,
    role.defaultWageCents,
    role.tipOutSettlement,
    role.tipOutCustomized ? 1 : 0,
    role.sortOrder,
    stamped,
    stamped,
  );
  for (const line of role.tipOutDefaults) {
    await db.runAsync(
      `INSERT INTO role_tip_out_default (id, role_id, label, kind, amount_cents, basis_points, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      line.id,
      role.id,
      line.label,
      line.kind,
      line.amountCents,
      line.basisPoints,
      line.sortOrder,
    );
  }
}

async function insertShift(db: SQLiteDatabase, shift: ShiftRecord): Promise<void> {
  await db.runAsync(
    `INSERT INTO shift (
      id, profile_id, role_id, role_name, shift_date, hours_mode, start_minutes, end_minutes, duration_minutes,
      wage_cents, tips_mode, tips_total_cents, cash_tips_cents, card_tips_cents, sales_cents, tip_share_mode,
      meal_override, double_override, tip_out_settlement, notes,
      guest_tips_cents, tip_share_cents, gross_tips_cents, tip_out_total_cents, wage_earnings_cents, net_tips_cents, take_home_cents,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    shift.id,
    shift.profileId,
    shift.roleId,
    shift.roleName,
    shift.shiftDate,
    shift.hoursMode,
    shift.startMinutes,
    shift.endMinutes,
    shift.durationMinutes,
    shift.wageCents,
    shift.tipsMode,
    shift.tipsTotalCents,
    shift.cashTipsCents,
    shift.cardTipsCents,
    shift.salesCents,
    shift.tipShareMode,
    shift.mealOverride,
    shift.doubleOverride,
    shift.tipOutSettlement,
    shift.notes,
    shift.guestTipsCents,
    shift.tipShareCents,
    shift.grossTipsCents,
    shift.tipOutTotalCents,
    shift.wageEarningsCents,
    shift.netTipsCents,
    shift.takeHomeCents,
    shift.createdAt,
    shift.updatedAt,
  );
  for (const line of shift.tipOutLines) {
    await db.runAsync(
      `INSERT INTO tip_out_line (id, shift_id, label, kind, basis_points, amount_cents, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      line.id,
      shift.id,
      line.label,
      line.kind,
      line.basisPoints,
      line.amountCents,
      line.sortOrder,
    );
  }
  for (const line of shift.tipShareLines) {
    await db.runAsync(
      `INSERT INTO tip_share_line (id, shift_id, label, amount_cents, sort_order) VALUES (?, ?, ?, ?, ?)`,
      line.id,
      shift.id,
      line.label,
      line.amountCents,
      line.sortOrder,
    );
  }
}

async function insertGoal(db: SQLiteDatabase, goal: SavingsGoal): Promise<void> {
  await db.runAsync(
    `INSERT INTO savings_goal (id, profile_id, name, target_cents, target_date, horizon, weekly_set_aside_cents, saved_cents, status, celebrated, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    goal.id,
    goal.profileId,
    goal.name,
    goal.targetCents,
    goal.targetDate,
    goal.horizon,
    goal.weeklySetAsideCents,
    goal.savedCents,
    goal.status,
    goal.celebrated ? 1 : 0,
    goal.createdAt,
    goal.updatedAt,
  );
}

async function insertGoalEntry(db: SQLiteDatabase, entry: GoalEntry): Promise<void> {
  await db.runAsync(
    `INSERT INTO goal_entry (id, goal_id, kind, amount_cents, week_start, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.goalId,
    entry.kind,
    entry.amountCents,
    entry.weekStart,
    entry.createdAt,
  );
}

async function insertPayStub(db: SQLiteDatabase, stub: PayStub): Promise<void> {
  await db.runAsync(
    `INSERT INTO pay_stub (id, profile_id, period_start, period_end, pay_date, regular_minutes, overtime_minutes, hourly_rate_cents, gross_wages_cents, cash_tips_cents, card_tips_cents, gross_pay_cents, other_deductions_cents, net_pay_cents, taxes_json, confidence_json, photo_data_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    stub.id,
    stub.profileId,
    stub.periodStart,
    stub.periodEnd,
    stub.payDate,
    stub.regularMinutes,
    stub.overtimeMinutes,
    stub.hourlyRateCents,
    stub.grossWagesCents,
    stub.cashTipsCents,
    stub.cardTipsCents,
    stub.grossPayCents,
    stub.otherDeductionsCents,
    stub.netPayCents,
    JSON.stringify(stub.taxes),
    JSON.stringify(stub.confidence),
    stub.photoDataUrl,
    stub.createdAt,
  );
}

