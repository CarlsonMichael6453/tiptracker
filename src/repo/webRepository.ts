import { DEFAULT_DOUBLE_THRESHOLD_MINUTES, DEFAULT_LUNCH_CUTOFF_MINUTES } from "../calc/classify";
import { defaultAppearance } from "../ui/appearance";
import { nowIso } from "../db/time";
import type { WebDatabase, WebState } from "../db/types";
import { resolveGoalStyle } from "../calc/goalStyle";
import { effectivePosture, STARTER_ROLES } from "../domain/roleDefaults";
import type { Appearance, Posture, Profile, Role, ShiftRecord, TipOutDefault } from "../domain/types";
import type { RoleTipOutWrite, ShiftWrite } from "./repository";

const STARTERS = STARTER_ROLES;

function nid(): string {
  return globalThis.crypto.randomUUID();
}

export function listProfiles(db: WebDatabase): Promise<Profile[]> {
  return db.read((state) =>
    state.profiles.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
  );
}

export function getProfile(db: WebDatabase, id: string): Promise<Profile | null> {
  return db.read((state) => state.profiles.find((profile) => profile.id === id) ?? null);
}

export function createProfile(
  db: WebDatabase,
  input: { name: string; wageCents: number; weekStartsOn: number; usualRoleName: string },
): Promise<string> {
  return db.update((state) => {
    const id = nid();
    const created = nowIso();
    const usualIndex = Math.max(0, STARTERS.findIndex((role) => role.name === input.usualRoleName));
    const roles: Role[] = STARTERS.map((starter, index) => ({
      id: nid(),
      profileId: id,
      name: starter.name,
      posture: starter.posture,
      defaultWageCents: null,
      tipOutSettlement: "cash",
      sortOrder: index,
      tipOutCustomized: false,
      tipOutDefaults: [],
    }));
    state.profiles.push({
      id,
      name: input.name.trim(),
      defaultWageCents: input.wageCents,
      weekStartsOn: input.weekStartsOn,
      lunchCutoffMinutes: DEFAULT_LUNCH_CUTOFF_MINUTES,
      doubleThresholdMinutes: DEFAULT_DOUBLE_THRESHOLD_MINUTES,
      lastRoleId: roles[usualIndex]?.id ?? roles[0]?.id ?? null,
      appearance: defaultAppearance(),
      weeklyGoalCents: null,
      showTipJar: true,
      goalIndicator: "jar",
      tipJarCelebratedWeek: null,
      payPeriodStartsOn: 5,
      payPeriodWeeks: 1,
      createdAt: created,
      updatedAt: created,
    });
    state.roles.push(...roles);
    state.kv.active_profile_id = id;
    return id;
  });
}

export function updateProfile(
  db: WebDatabase,
  id: string,
  patch: Partial<Pick<Profile, "name" | "defaultWageCents" | "weekStartsOn" | "lunchCutoffMinutes" | "doubleThresholdMinutes" | "appearance" | "weeklyGoalCents" | "showTipJar" | "tipJarCelebratedWeek" | "goalIndicator" | "payPeriodStartsOn" | "payPeriodWeeks">>,
): Promise<void> {
  return db.update((state) => {
    const current = state.profiles.find((profile) => profile.id === id);
    if (!current) throw new Error("That profile is gone.");
    if (patch.name != null) current.name = patch.name.trim();
    if (patch.defaultWageCents != null) current.defaultWageCents = patch.defaultWageCents;
    if (patch.weekStartsOn != null) current.weekStartsOn = patch.weekStartsOn;
    if (patch.lunchCutoffMinutes != null) current.lunchCutoffMinutes = patch.lunchCutoffMinutes;
    if (patch.doubleThresholdMinutes != null) current.doubleThresholdMinutes = patch.doubleThresholdMinutes;
    if (patch.appearance != null) current.appearance = patch.appearance;
    if ("weeklyGoalCents" in patch) current.weeklyGoalCents = patch.weeklyGoalCents && patch.weeklyGoalCents > 0 ? patch.weeklyGoalCents : null;
    if (patch.goalIndicator != null) {
      current.goalIndicator = resolveGoalStyle(patch.goalIndicator, patch.goalIndicator !== "off");
      current.showTipJar = current.goalIndicator !== "off";
    } else if (patch.showTipJar != null) {
      current.showTipJar = patch.showTipJar;
      if (!current.goalIndicator) current.goalIndicator = patch.showTipJar ? "jar" : "off";
    }
    if ("tipJarCelebratedWeek" in patch) current.tipJarCelebratedWeek = patch.tipJarCelebratedWeek ?? null;
    if (patch.payPeriodStartsOn != null) current.payPeriodStartsOn = patch.payPeriodStartsOn;
    if (patch.payPeriodWeeks === 1 || patch.payPeriodWeeks === 2) current.payPeriodWeeks = patch.payPeriodWeeks;
    current.updatedAt = nowIso();
  });
}

export function deleteProfile(db: WebDatabase, id: string): Promise<void> {
  return db.update((state) => {
    const removed = new Set((state.goals ?? []).filter((goal) => goal.profileId === id).map((goal) => goal.id));
    state.profiles = state.profiles.filter((profile) => profile.id !== id);
    state.roles = state.roles.filter((role) => role.profileId !== id);
    state.shifts = state.shifts.filter((shift) => shift.profileId !== id);
    state.goals = (state.goals ?? []).filter((goal) => goal.profileId !== id);
    state.goalEntries = (state.goalEntries ?? []).filter((entry) => !removed.has(entry.goalId));
    state.payStubs = (state.payStubs ?? []).filter((stub) => stub.profileId !== id);
    state.budgets = (state.budgets ?? []).filter((row) => row.profileId !== id);
    if (state.kv.active_profile_id === id) {
      const next = state.profiles.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))[0];
      if (next) state.kv.active_profile_id = next.id;
      else delete state.kv.active_profile_id;
    }
  });
}

export function deleteAllShifts(db: WebDatabase, profileId: string): Promise<void> {
  return db.update((state) => {
    state.shifts = state.shifts.filter((shift) => shift.profileId !== profileId);
  });
}

export function deleteAllData(db: WebDatabase): Promise<void> {
  return db.update((state) => {
    state.profiles = [];
    state.roles = [];
    state.shifts = [];
    state.goals = [];
    state.goalEntries = [];
    state.payStubs = [];
    state.budgets = [];
    delete state.kv.active_profile_id;
    delete state.kv.review_last_asked;
    delete state.kv.review_ask_count;
    delete state.kv.welcome_seen;
  });
}

export function countShifts(db: WebDatabase, profileId: string): Promise<number> {
  return db.read((state) => state.shifts.filter((shift) => shift.profileId === profileId).length);
}

export function countAll(db: WebDatabase): Promise<{ profiles: number; shifts: number }> {
  return db.read((state) => ({ profiles: state.profiles.length, shifts: state.shifts.length }));
}

export function listRoles(db: WebDatabase, profileId: string): Promise<Role[]> {
  return db.read((state) => rolesFor(state, profileId));
}

export function getRole(db: WebDatabase, id: string): Promise<Role | null> {
  return db.read((state) => {
    const role = state.roles.find((item) => item.id === id);
    return role ? presentRole(role) : null;
  });
}

export function createRole(
  db: WebDatabase,
  input: {
    profileId: string;
    name: string;
    posture: Posture;
    defaultWageCents: number | null;
    tipOutSettlement: "cash" | "paycheck";
    tipOutDefaults: RoleTipOutWrite[];
  },
): Promise<string> {
  return db.update((state) => {
    assertUniqueRoleName(state, input.profileId, input.name);
    const id = nid();
    const sortOrder = state.roles.filter((role) => role.profileId === input.profileId).reduce((max, role) => Math.max(max, role.sortOrder), -1) + 1;
    state.roles.push({
      id,
      profileId: input.profileId,
      name: input.name.trim(),
      posture: input.posture,
      defaultWageCents: input.defaultWageCents,
      tipOutSettlement: input.tipOutSettlement,
      sortOrder,
      tipOutCustomized: true,
      tipOutDefaults: defaultsFrom(input.tipOutDefaults),
    });
    return id;
  });
}

export function updateRole(
  db: WebDatabase,
  id: string,
  input: {
    name: string;
    posture: Posture;
    defaultWageCents: number | null;
    tipOutSettlement: "cash" | "paycheck";
    tipOutDefaults: RoleTipOutWrite[];
  },
): Promise<void> {
  return db.update((state) => {
    const role = state.roles.find((item) => item.id === id);
    if (!role) throw new Error("That role is gone.");
    assertUniqueRoleName(state, role.profileId, input.name, id);
    role.name = input.name.trim();
    role.posture = input.posture;
    role.tipOutCustomized = true;
    role.defaultWageCents = input.defaultWageCents;
    role.tipOutSettlement = input.tipOutSettlement;
    role.tipOutDefaults = defaultsFrom(input.tipOutDefaults);
  });
}

export function deleteRole(db: WebDatabase, id: string): Promise<void> {
  return db.update((state) => {
    const role = state.roles.find((item) => item.id === id);
    if (!role) return;
    const remaining = state.roles.filter((item) => item.profileId === role.profileId);
    if (remaining.length <= 1) throw new Error("You need at least one role.");
    for (const profile of state.profiles) {
      if (profile.lastRoleId === id) {
        profile.lastRoleId = null;
        profile.updatedAt = nowIso();
      }
    }
    for (const shift of state.shifts) {
      if (shift.roleId === id) shift.roleId = null;
    }
    state.roles = state.roles.filter((item) => item.id !== id);
  });
}

export function reorderRoles(db: WebDatabase, orderedIds: string[]): Promise<void> {
  return db.update((state) => {
    orderedIds.forEach((id, index) => {
      const role = state.roles.find((item) => item.id === id);
      if (role) role.sortOrder = index;
    });
  });
}

export function getActiveProfileId(db: WebDatabase): Promise<string | null> {
  return db.read((state) => state.kv.active_profile_id ?? null);
}

export function setActiveProfileId(db: WebDatabase, id: string): Promise<void> {
  return db.update((state) => {
    state.kv.active_profile_id = id;
  });
}

export function getAppearance(db: WebDatabase): Promise<Appearance> {
  return db.read((state) => {
    const value = state.kv.appearance;
    if (value === "light" || value === "dark" || value === "system") return value;
    return "system";
  });
}

export function setAppearance(db: WebDatabase, appearance: Appearance): Promise<void> {
  return db.update((state) => {
    state.kv.appearance = appearance;
  });
}

export function saveNewShift(db: WebDatabase, input: ShiftWrite): Promise<string> {
  return db.update((state) => {
    const id = nid();
    const created = nowIso();
    state.shifts.push(shiftFromWrite(id, input, created, created));
    afterShiftSave(state, input, created);
    return id;
  });
}

export function updateShift(db: WebDatabase, id: string, input: ShiftWrite): Promise<void> {
  return db.update((state) => {
    const existing = state.shifts.find((shift) => shift.id === id);
    if (!existing) throw new Error("That shift is gone.");
    const updated = nowIso();
    state.shifts = state.shifts.filter((shift) => shift.id !== id);
    state.shifts.push(shiftFromWrite(id, input, existing.createdAt, updated));
    afterShiftSave(state, input, updated);
  });
}

export function deleteShift(db: WebDatabase, id: string): Promise<void> {
  return db.update((state) => {
    state.shifts = state.shifts.filter((shift) => shift.id !== id);
  });
}

export function getShift(db: WebDatabase, id: string): Promise<ShiftRecord | null> {
  return db.read((state) => state.shifts.find((shift) => shift.id === id) ?? null);
}

export function listShifts(db: WebDatabase, profileId: string): Promise<ShiftRecord[]> {
  return db.read((state) => sortedShifts(state.shifts.filter((shift) => shift.profileId === profileId)));
}

export function listShiftsInRange(
  db: WebDatabase,
  profileId: string,
  start: string | null,
  end: string | null,
): Promise<ShiftRecord[]> {
  return db.read((state) =>
    sortedShifts(
      state.shifts.filter((shift) => {
        if (shift.profileId !== profileId) return false;
        if (start && end) return shift.shiftDate >= start && shift.shiftDate <= end;
        return true;
      }),
    ),
  );
}

function rolesFor(state: WebState, profileId: string): Role[] {
  return state.roles
    .filter((role) => role.profileId === profileId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1))
    .map(presentRole);
}

function presentRole(role: Role): Role {
  return { ...role, posture: effectivePosture(role) };
}

function assertUniqueRoleName(state: WebState, profileId: string, name: string, exceptId?: string) {
  const key = name.trim().toLowerCase();
  const clash = state.roles.some(
    (role) => role.profileId === profileId && role.id !== exceptId && role.name.trim().toLowerCase() === key,
  );
  if (clash) throw new Error("UNIQUE constraint failed: role.name");
}

function defaultsFrom(lines: RoleTipOutWrite[]): TipOutDefault[] {
  return lines.map((line, index) => ({
    id: nid(),
    label: line.label,
    kind: line.kind,
    amountCents: line.kind === "flat" ? line.amountCents : null,
    basisPoints: line.kind === "flat" ? null : line.basisPoints,
    sortOrder: index,
  }));
}

function shiftFromWrite(id: string, input: ShiftWrite, createdAt: string, updatedAt: string): ShiftRecord {
  const snap = input.snapshot;
  return {
    id,
    profileId: input.profileId,
    roleId: input.roleId,
    roleName: input.roleName,
    shiftDate: input.shiftDate,
    hoursMode: input.hoursMode,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    durationMinutes: snap.durationMinutes,
    wageCents: input.wageCents,
    tipsMode: input.tipsMode,
    tipsTotalCents: input.tipsTotalCents,
    cashTipsCents: input.cashTipsCents,
    cardTipsCents: input.cardTipsCents,
    salesCents: input.salesCents,
    tipShareMode: input.tipShareMode,
    mealOverride: input.mealOverride,
    doubleOverride: input.doubleOverride,
    tipOutSettlement: input.tipOutSettlement,
    notes: input.notes,
    guestTipsCents: snap.guestTipsCents,
    tipShareCents: snap.tipShareCents,
    grossTipsCents: snap.grossTipsCents,
    tipOutTotalCents: snap.tipOutTotalCents,
    wageEarningsCents: snap.wageEarningsCents,
    netTipsCents: snap.netTipsCents,
    takeHomeCents: snap.takeHomeCents,
    createdAt,
    updatedAt,
    tipOutLines: snap.tipOutLines.map((line, index) => ({
      id: nid(),
      label: line.label,
      kind: line.kind,
      basisPoints: line.basisPoints,
      amountCents: line.amountCents,
      sortOrder: index,
    })),
    tipShareLines:
      input.tipShareMode === "itemized"
        ? input.tipShareLines.map((line, index) => ({
            id: nid(),
            label: line.label,
            amountCents: line.amountCents,
            sortOrder: index,
          }))
        : [],
  };
}

function afterShiftSave(state: WebState, input: ShiftWrite, updatedAt: string) {
  const profile = state.profiles.find((item) => item.id === input.profileId);
  if (profile) {
    profile.lastRoleId = input.roleId;
    profile.updatedAt = updatedAt;
  }
  const role = state.roles.find((item) => item.id === input.roleId);
  if (!role) return;
  if (input.saveUsualWage) role.defaultWageCents = input.wageCents;
  if (input.saveUsualTipOut) {
    role.tipOutDefaults = defaultsFrom(input.usualTipOut);
    role.tipOutSettlement = input.tipOutSettlement;
  }
}

function sortedShifts(shifts: ShiftRecord[]): ShiftRecord[] {
  return shifts.slice().sort((a, b) => {
    if (a.shiftDate !== b.shiftDate) return a.shiftDate < b.shiftDate ? 1 : -1;
    const aTimed = a.startMinutes == null ? 1 : 0;
    const bTimed = b.startMinutes == null ? 1 : 0;
    if (aTimed !== bTimed) return aTimed - bTimed;
    if (a.startMinutes != null && b.startMinutes != null && a.startMinutes !== b.startMinutes) {
      return b.startMinutes - a.startMinutes;
    }
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return 0;
  });
}
