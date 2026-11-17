import type { SQLiteDatabase } from "expo-sqlite";
import { DEFAULT_DOUBLE_THRESHOLD_MINUTES, DEFAULT_LUNCH_CUTOFF_MINUTES } from "../calc/classify";
import type { Meal } from "../calc/classify";
import type { ShiftSnapshot, TipOutKind } from "../calc/shift";
import { defaultAppearance, parseAppearance } from "../ui/appearance";
import { nowIso } from "../db/time";
import { isWebDatabase, type AppDatabase } from "../db/types";
import * as webDb from "./webRepository";
import type {
  Appearance,
  Posture,
  Profile,
  Role,
  ShiftRecord,
  TipOutDefault,
  TipOutLineRecord,
  TipShareLineRecord,
} from "../domain/types";
import { newId } from "./ids";

const STARTERS: { name: string; posture: Posture }[] = [
  { name: "Server", posture: "tips_out" },
  { name: "Bartender", posture: "receives_share" },
  { name: "Busser", posture: "receives_share" },
  { name: "Host", posture: "receives_share" },
];

export async function listProfiles(db: AppDatabase): Promise<Profile[]> {
  if (isWebDatabase(db)) return webDb.listProfiles(db);
  const rows = await db.getAllAsync<ProfileRow>("SELECT * FROM profile ORDER BY created_at ASC");
  return rows.map(mapProfile);
}

export async function getProfile(db: AppDatabase, id: string): Promise<Profile | null> {
  if (isWebDatabase(db)) return webDb.getProfile(db, id);
  const row = await db.getFirstAsync<ProfileRow>("SELECT * FROM profile WHERE id = ?", id);
  return row ? mapProfile(row) : null;
}

export async function createProfile(
  db: AppDatabase,
  input: { name: string; wageCents: number; weekStartsOn: number; usualRoleName: string },
): Promise<string> {
  const id = newId();
  const created = nowIso();
  const roleIds = STARTERS.map(() => newId());
  const usualIndex = Math.max(0, STARTERS.findIndex((role) => role.name === input.usualRoleName));
  if (isWebDatabase(db)) return webDb.createProfile(db, input);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO profile (id, name, default_wage_cents, week_starts_on, lunch_cutoff_minutes, double_threshold_minutes, last_role_id, appearance_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name.trim(),
      input.wageCents,
      input.weekStartsOn,
      DEFAULT_LUNCH_CUTOFF_MINUTES,
      DEFAULT_DOUBLE_THRESHOLD_MINUTES,
      roleIds[usualIndex],
      JSON.stringify(defaultAppearance()),
      created,
      created,
    );
    for (let i = 0; i < STARTERS.length; i += 1) {
      const starter = STARTERS[i];
      await db.runAsync(
        `INSERT INTO role (id, profile_id, name, posture, default_wage_cents, tip_out_settlement, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, 'cash', ?, ?, ?)`,
        roleIds[i],
        id,
        starter.name,
        starter.posture,
        i,
        created,
        created,
      );
    }
    await db.runAsync(
      `INSERT INTO role_tip_out_default (id, role_id, label, kind, amount_cents, basis_points, sort_order)
       VALUES (?, ?, NULL, 'percent_of_sales', NULL, 400, 0)`,
      newId(),
      roleIds[0],
    );
    await setKv(db, "active_profile_id", id);
  });
  return id;
}

export async function updateProfile(
  db: AppDatabase,
  id: string,
  patch: Partial<Pick<Profile, "name" | "defaultWageCents" | "weekStartsOn" | "lunchCutoffMinutes" | "doubleThresholdMinutes" | "appearance">>,
): Promise<void> {
  if (isWebDatabase(db)) return webDb.updateProfile(db, id, patch);
  const current = await getProfile(db, id);
  if (!current) throw new Error("That profile is gone.");
  const next = {
    name: patch.name?.trim() ?? current.name,
    defaultWageCents: patch.defaultWageCents ?? current.defaultWageCents,
    weekStartsOn: patch.weekStartsOn ?? current.weekStartsOn,
    lunchCutoffMinutes: patch.lunchCutoffMinutes ?? current.lunchCutoffMinutes,
    doubleThresholdMinutes: patch.doubleThresholdMinutes ?? current.doubleThresholdMinutes,
    appearance: patch.appearance ?? current.appearance,
  };
  await db.runAsync(
    `UPDATE profile SET name = ?, default_wage_cents = ?, week_starts_on = ?, lunch_cutoff_minutes = ?, double_threshold_minutes = ?, appearance_json = ?, updated_at = ? WHERE id = ?`,
    next.name,
    next.defaultWageCents,
    next.weekStartsOn,
    next.lunchCutoffMinutes,
    next.doubleThresholdMinutes,
    JSON.stringify(next.appearance),
    nowIso(),
    id,
  );
}

export async function deleteProfile(db: AppDatabase, id: string): Promise<void> {
  if (isWebDatabase(db)) return webDb.deleteProfile(db, id);
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM profile WHERE id = ?", id);
    const active = await getKv(db, "active_profile_id");
    if (active === id) {
      const next = await db.getFirstAsync<{ id: string }>("SELECT id FROM profile ORDER BY created_at ASC LIMIT 1");
      if (next) await setKv(db, "active_profile_id", next.id);
      else await db.runAsync("DELETE FROM app_kv WHERE key = ?", "active_profile_id");
    }
  });
}

export async function deleteAllShifts(db: AppDatabase, profileId: string): Promise<void> {
  if (isWebDatabase(db)) return webDb.deleteAllShifts(db, profileId);
  await db.runAsync("DELETE FROM shift WHERE profile_id = ?", profileId);
}

export async function deleteAllData(db: AppDatabase): Promise<void> {
  if (isWebDatabase(db)) return webDb.deleteAllData(db);
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM profile");
    await db.runAsync("DELETE FROM app_kv WHERE key = ?", "active_profile_id");
  });
}

export async function countShifts(db: AppDatabase, profileId: string): Promise<number> {
  if (isWebDatabase(db)) return webDb.countShifts(db, profileId);
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM shift WHERE profile_id = ?", profileId);
  return row?.n ?? 0;
}

export async function countAll(db: AppDatabase): Promise<{ profiles: number; shifts: number }> {
  if (isWebDatabase(db)) return webDb.countAll(db);
  const profiles = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM profile");
  const shifts = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM shift");
  return { profiles: profiles?.n ?? 0, shifts: shifts?.n ?? 0 };
}

export async function listRoles(db: AppDatabase, profileId: string): Promise<Role[]> {
  if (isWebDatabase(db)) return webDb.listRoles(db, profileId);
  const rows = await db.getAllAsync<RoleRow>(
    "SELECT * FROM role WHERE profile_id = ? ORDER BY sort_order ASC, created_at ASC",
    profileId,
  );
  if (rows.length === 0) return [];
  const defaults = await db.getAllAsync<TipOutDefaultRow>(
    `SELECT d.* FROM role_tip_out_default d
     JOIN role r ON r.id = d.role_id
     WHERE r.profile_id = ?
     ORDER BY d.sort_order ASC`,
    profileId,
  );
  return rows.map((row) => mapRole(row, defaults.filter((line) => line.role_id === row.id)));
}

export async function getRole(db: AppDatabase, id: string): Promise<Role | null> {
  if (isWebDatabase(db)) return webDb.getRole(db, id);
  const row = await db.getFirstAsync<RoleRow>("SELECT * FROM role WHERE id = ?", id);
  if (!row) return null;
  const defaults = await db.getAllAsync<TipOutDefaultRow>(
    "SELECT * FROM role_tip_out_default WHERE role_id = ? ORDER BY sort_order ASC",
    id,
  );
  return mapRole(row, defaults);
}

export type RoleTipOutWrite = {
  label: string | null;
  kind: TipOutKind;
  amountCents: number | null;
  basisPoints: number | null;
};

export async function createRole(
  db: AppDatabase,
  input: {
    profileId: string;
    name: string;
    posture: Posture;
    defaultWageCents: number | null;
    tipOutSettlement: "cash" | "paycheck";
    tipOutDefaults: RoleTipOutWrite[];
  },
): Promise<string> {
  if (isWebDatabase(db)) return webDb.createRole(db, input);
  const id = newId();
  const created = nowIso();
  const orderRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM role WHERE profile_id = ?",
    input.profileId,
  );
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO role (id, profile_id, name, posture, default_wage_cents, tip_out_settlement, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.profileId,
      input.name.trim(),
      input.posture,
      input.defaultWageCents,
      input.tipOutSettlement,
      orderRow?.n ?? 0,
      created,
      created,
    );
    await replaceRoleTipOut(db, id, input.tipOutDefaults);
  });
  return id;
}

export async function updateRole(
  db: AppDatabase,
  id: string,
  input: {
    name: string;
    posture: Posture;
    defaultWageCents: number | null;
    tipOutSettlement: "cash" | "paycheck";
    tipOutDefaults: RoleTipOutWrite[];
  },
): Promise<void> {
  if (isWebDatabase(db)) return webDb.updateRole(db, id, input);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE role SET name = ?, posture = ?, default_wage_cents = ?, tip_out_settlement = ?, updated_at = ? WHERE id = ?`,
      input.name.trim(),
      input.posture,
      input.defaultWageCents,
      input.tipOutSettlement,
      nowIso(),
      id,
    );
    await replaceRoleTipOut(db, id, input.tipOutDefaults);
  });
}

export async function deleteRole(db: AppDatabase, id: string): Promise<void> {
  if (isWebDatabase(db)) return webDb.deleteRole(db, id);
  const role = await getRole(db, id);
  if (!role) return;
  const count = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM role WHERE profile_id = ?", role.profileId);
  if ((count?.n ?? 0) <= 1) throw new Error("You need at least one role.");
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE profile SET last_role_id = NULL, updated_at = ? WHERE last_role_id = ?", nowIso(), id);
    await db.runAsync("DELETE FROM role WHERE id = ?", id);
  });
}

export async function reorderRoles(db: AppDatabase, orderedIds: string[]): Promise<void> {
  if (isWebDatabase(db)) return webDb.reorderRoles(db, orderedIds);
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await db.runAsync("UPDATE role SET sort_order = ?, updated_at = ? WHERE id = ?", i, nowIso(), orderedIds[i]);
    }
  });
}

export async function getActiveProfileId(db: AppDatabase): Promise<string | null> {
  if (isWebDatabase(db)) return webDb.getActiveProfileId(db);
  return getKv(db, "active_profile_id");
}

export async function setActiveProfileId(db: AppDatabase, id: string): Promise<void> {
  if (isWebDatabase(db)) return webDb.setActiveProfileId(db, id);
  await setKv(db, "active_profile_id", id);
}

export async function getAppearance(db: AppDatabase): Promise<Appearance> {
  if (isWebDatabase(db)) return webDb.getAppearance(db);
  const value = await getKv(db, "appearance");
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export async function setAppearance(db: AppDatabase, appearance: Appearance): Promise<void> {
  if (isWebDatabase(db)) return webDb.setAppearance(db, appearance);
  await setKv(db, "appearance", appearance);
}

export type ShiftWrite = {
  profileId: string;
  roleId: string;
  roleName: string;
  shiftDate: string;
  hoursMode: "clock" | "duration";
  startMinutes: number | null;
  endMinutes: number | null;
  wageCents: number;
  saveUsualWage: boolean;
  tipsMode: "total" | "split";
  tipsTotalCents: number | null;
  cashTipsCents: number | null;
  cardTipsCents: number | null;
  salesCents: number | null;
  tipShareMode: "none" | "total" | "itemized";
  mealOverride: Meal | null;
  doubleOverride: 0 | 1 | null;
  tipOutSettlement: "cash" | "paycheck";
  notes: string | null;
  saveUsualTipOut: boolean;
  usualTipOut: RoleTipOutWrite[];
  snapshot: ShiftSnapshot;
  tipShareLines: { label: string | null; amountCents: number }[];
};

export async function saveNewShift(db: AppDatabase, input: ShiftWrite): Promise<string> {
  if (isWebDatabase(db)) return webDb.saveNewShift(db, input);
  const id = newId();
  const created = nowIso();
  await db.withTransactionAsync(async () => {
    await insertShift(db, id, input, created, created);
    await insertLines(db, id, input);
    await afterShiftSave(db, input, created);
  });
  return id;
}

export async function updateShift(db: AppDatabase, id: string, input: ShiftWrite): Promise<void> {
  if (isWebDatabase(db)) return webDb.updateShift(db, id, input);
  const existing = await db.getFirstAsync<{ created_at: string }>("SELECT created_at FROM shift WHERE id = ?", id);
  if (!existing) throw new Error("That shift is gone.");
  const updated = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM tip_out_line WHERE shift_id = ?", id);
    await db.runAsync("DELETE FROM tip_share_line WHERE shift_id = ?", id);
    await db.runAsync("DELETE FROM shift WHERE id = ?", id);
    await insertShift(db, id, input, existing.created_at, updated);
    await insertLines(db, id, input);
    await afterShiftSave(db, input, updated);
  });
}

export async function deleteShift(db: AppDatabase, id: string): Promise<void> {
  if (isWebDatabase(db)) return webDb.deleteShift(db, id);
  await db.runAsync("DELETE FROM shift WHERE id = ?", id);
}

export async function getShift(db: AppDatabase, id: string): Promise<ShiftRecord | null> {
  if (isWebDatabase(db)) return webDb.getShift(db, id);
  const row = await db.getFirstAsync<ShiftRow>("SELECT * FROM shift WHERE id = ?", id);
  if (!row) return null;
  const [tipOut, tipShare] = await Promise.all([
    db.getAllAsync<TipOutLineRow>("SELECT * FROM tip_out_line WHERE shift_id = ? ORDER BY sort_order ASC", id),
    db.getAllAsync<TipShareLineRow>("SELECT * FROM tip_share_line WHERE shift_id = ? ORDER BY sort_order ASC", id),
  ]);
  return mapShift(row, tipOut, tipShare);
}

export async function listShifts(db: AppDatabase, profileId: string): Promise<ShiftRecord[]> {
  if (isWebDatabase(db)) return webDb.listShifts(db, profileId);
  return loadShifts(db, "WHERE s.profile_id = ?", [profileId]);
}

export async function listShiftsInRange(
  db: AppDatabase,
  profileId: string,
  start: string | null,
  end: string | null,
): Promise<ShiftRecord[]> {
  if (isWebDatabase(db)) return webDb.listShiftsInRange(db, profileId, start, end);
  if (start && end) return loadShifts(db, "WHERE s.profile_id = ? AND s.shift_date >= ? AND s.shift_date <= ?", [profileId, start, end]);
  return listShifts(db, profileId);
}

async function loadShifts(db: SQLiteDatabase, where: string, params: (string | number)[]): Promise<ShiftRecord[]> {
  const rows = await db.getAllAsync<ShiftRow>(
    `SELECT s.* FROM shift s ${where}
     ORDER BY s.shift_date DESC,
       CASE WHEN s.start_minutes IS NULL THEN 1 ELSE 0 END,
       s.start_minutes DESC,
       s.created_at DESC`,
    ...params,
  );
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const tipOut = await db.getAllAsync<TipOutLineRow>(
    `SELECT * FROM tip_out_line WHERE shift_id IN (${placeholders}) ORDER BY sort_order ASC`,
    ...ids,
  );
  const tipShare = await db.getAllAsync<TipShareLineRow>(
    `SELECT * FROM tip_share_line WHERE shift_id IN (${placeholders}) ORDER BY sort_order ASC`,
    ...ids,
  );
  return rows.map((row) =>
    mapShift(
      row,
      tipOut.filter((line) => line.shift_id === row.id),
      tipShare.filter((line) => line.shift_id === row.id),
    ),
  );
}

async function insertShift(db: SQLiteDatabase, id: string, input: ShiftWrite, createdAt: string, updatedAt: string) {
  const snap = input.snapshot;
  await db.runAsync(
    `INSERT INTO shift (
      id, profile_id, role_id, role_name, shift_date, hours_mode, start_minutes, end_minutes, duration_minutes,
      wage_cents, tips_mode, tips_total_cents, cash_tips_cents, card_tips_cents, sales_cents, tip_share_mode,
      meal_override, double_override, tip_out_settlement, notes,
      guest_tips_cents, tip_share_cents, gross_tips_cents, tip_out_total_cents, wage_earnings_cents, net_tips_cents, take_home_cents,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.profileId,
    input.roleId,
    input.roleName,
    input.shiftDate,
    input.hoursMode,
    input.startMinutes,
    input.endMinutes,
    snap.durationMinutes,
    input.wageCents,
    input.tipsMode,
    input.tipsTotalCents,
    input.cashTipsCents,
    input.cardTipsCents,
    input.salesCents,
    input.tipShareMode,
    input.mealOverride,
    input.doubleOverride,
    input.tipOutSettlement,
    input.notes,
    snap.guestTipsCents,
    snap.tipShareCents,
    snap.grossTipsCents,
    snap.tipOutTotalCents,
    snap.wageEarningsCents,
    snap.netTipsCents,
    snap.takeHomeCents,
    createdAt,
    updatedAt,
  );
}

async function insertLines(db: SQLiteDatabase, shiftId: string, input: ShiftWrite) {
  for (let i = 0; i < input.snapshot.tipOutLines.length; i += 1) {
    const line = input.snapshot.tipOutLines[i];
    await db.runAsync(
      `INSERT INTO tip_out_line (id, shift_id, label, kind, basis_points, amount_cents, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      shiftId,
      line.label,
      line.kind,
      line.basisPoints,
      line.amountCents,
      i,
    );
  }
  if (input.tipShareMode === "itemized") {
    for (let i = 0; i < input.tipShareLines.length; i += 1) {
      const line = input.tipShareLines[i];
      await db.runAsync(
        `INSERT INTO tip_share_line (id, shift_id, label, amount_cents, sort_order) VALUES (?, ?, ?, ?, ?)`,
        newId(),
        shiftId,
        line.label,
        line.amountCents,
        i,
      );
    }
  }
}

async function afterShiftSave(db: SQLiteDatabase, input: ShiftWrite, updatedAt: string) {
  await db.runAsync("UPDATE profile SET last_role_id = ?, updated_at = ? WHERE id = ?", input.roleId, updatedAt, input.profileId);
  if (input.saveUsualWage) {
    await db.runAsync(
      "UPDATE role SET default_wage_cents = ?, updated_at = ? WHERE id = ?",
      input.wageCents,
      updatedAt,
      input.roleId,
    );
  }
  if (input.saveUsualTipOut) {
    await replaceRoleTipOut(db, input.roleId, input.usualTipOut);
    await db.runAsync(
      "UPDATE role SET tip_out_settlement = ?, updated_at = ? WHERE id = ?",
      input.tipOutSettlement,
      updatedAt,
      input.roleId,
    );
  }
}

async function replaceRoleTipOut(db: SQLiteDatabase, roleId: string, lines: RoleTipOutWrite[]) {
  await db.runAsync("DELETE FROM role_tip_out_default WHERE role_id = ?", roleId);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    await db.runAsync(
      `INSERT INTO role_tip_out_default (id, role_id, label, kind, amount_cents, basis_points, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      roleId,
      line.label,
      line.kind,
      line.kind === "flat" ? line.amountCents : null,
      line.kind === "flat" ? null : line.basisPoints,
      i,
    );
  }
}

async function getKv(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_kv WHERE key = ?", key);
  return row?.value ?? null;
}

async function setKv(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync("INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
}

type ProfileRow = {
  id: string;
  name: string;
  default_wage_cents: number;
  week_starts_on: number;
  lunch_cutoff_minutes: number;
  double_threshold_minutes: number;
  last_role_id: string | null;
  appearance_json: string | null;
  created_at: string;
  updated_at: string;
};

type RoleRow = {
  id: string;
  profile_id: string;
  name: string;
  posture: Posture;
  default_wage_cents: number | null;
  tip_out_settlement: "cash" | "paycheck";
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type TipOutDefaultRow = {
  id: string;
  role_id: string;
  label: string | null;
  kind: TipOutKind;
  amount_cents: number | null;
  basis_points: number | null;
  sort_order: number;
};

type ShiftRow = {
  id: string;
  profile_id: string;
  role_id: string | null;
  role_name: string;
  shift_date: string;
  hours_mode: "clock" | "duration";
  start_minutes: number | null;
  end_minutes: number | null;
  duration_minutes: number;
  wage_cents: number;
  tips_mode: "total" | "split";
  tips_total_cents: number | null;
  cash_tips_cents: number | null;
  card_tips_cents: number | null;
  sales_cents: number | null;
  tip_share_mode: "none" | "total" | "itemized";
  meal_override: Meal | null;
  double_override: number | null;
  tip_out_settlement: "cash" | "paycheck";
  notes: string | null;
  guest_tips_cents: number;
  tip_share_cents: number;
  gross_tips_cents: number;
  tip_out_total_cents: number;
  wage_earnings_cents: number;
  net_tips_cents: number;
  take_home_cents: number;
  created_at: string;
  updated_at: string;
};

type TipOutLineRow = {
  id: string;
  shift_id: string;
  label: string | null;
  kind: TipOutKind;
  basis_points: number | null;
  amount_cents: number;
  sort_order: number;
};

type TipShareLineRow = {
  id: string;
  shift_id: string;
  label: string | null;
  amount_cents: number;
  sort_order: number;
};

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    defaultWageCents: row.default_wage_cents,
    weekStartsOn: row.week_starts_on,
    lunchCutoffMinutes: row.lunch_cutoff_minutes,
    doubleThresholdMinutes: row.double_threshold_minutes,
    lastRoleId: row.last_role_id,
    appearance: parseAppearance(parseJson(row.appearance_json)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRole(row: RoleRow, defaults: TipOutDefaultRow[]): Role {
  const tipOutDefaults: TipOutDefault[] = defaults.map((line) => ({
    id: line.id,
    label: line.label,
    kind: line.kind,
    amountCents: line.amount_cents,
    basisPoints: line.basis_points,
    sortOrder: line.sort_order,
  }));
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    posture: row.posture,
    defaultWageCents: row.default_wage_cents,
    tipOutSettlement: row.tip_out_settlement,
    sortOrder: row.sort_order,
    tipOutDefaults,
  };
}

function mapShift(row: ShiftRow, tipOut: TipOutLineRow[], tipShare: TipShareLineRow[]): ShiftRecord {
  const tipOutLines: TipOutLineRecord[] = tipOut.map((line) => ({
    id: line.id,
    label: line.label,
    kind: line.kind,
    basisPoints: line.basis_points,
    amountCents: line.amount_cents,
    sortOrder: line.sort_order,
  }));
  const tipShareLines: TipShareLineRecord[] = tipShare.map((line) => ({
    id: line.id,
    label: line.label,
    amountCents: line.amount_cents,
    sortOrder: line.sort_order,
  }));
  return {
    id: row.id,
    profileId: row.profile_id,
    roleId: row.role_id,
    roleName: row.role_name,
    shiftDate: row.shift_date,
    hoursMode: row.hours_mode,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    durationMinutes: row.duration_minutes,
    wageCents: row.wage_cents,
    tipsMode: row.tips_mode,
    tipsTotalCents: row.tips_total_cents,
    cashTipsCents: row.cash_tips_cents,
    cardTipsCents: row.card_tips_cents,
    salesCents: row.sales_cents,
    tipShareMode: row.tip_share_mode,
    mealOverride: row.meal_override,
    doubleOverride: row.double_override === 0 || row.double_override === 1 ? row.double_override : null,
    tipOutSettlement: row.tip_out_settlement,
    notes: row.notes,
    guestTipsCents: row.guest_tips_cents,
    tipShareCents: row.tip_share_cents,
    grossTipsCents: row.gross_tips_cents,
    tipOutTotalCents: row.tip_out_total_cents,
    wageEarningsCents: row.wage_earnings_cents,
    netTipsCents: row.net_tips_cents,
    takeHomeCents: row.take_home_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tipOutLines,
    tipShareLines,
  };
}
