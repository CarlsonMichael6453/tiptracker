import type { SQLiteDatabase } from "expo-sqlite";
import { nextBalance } from "../calc/goals";
import { nowIso } from "../db/time";
import { isWebDatabase, type AppDatabase, type WebDatabase } from "../db/types";
import type { GoalEntry, GoalEntryKind, GoalHorizon, GoalStatus, SavingsGoal } from "../domain/types";
import { newId } from "./ids";

export type GoalWrite = {
  profileId: string;
  name: string;
  targetCents: number;
  targetDate: string | null;
  horizon: GoalHorizon;
  weeklySetAsideCents: number;
};

export type GoalPatch = Partial<Omit<GoalWrite, "profileId">> & { status?: GoalStatus };

export async function listGoals(db: AppDatabase, profileId: string): Promise<SavingsGoal[]> {
  if (isWebDatabase(db)) {
    return db.read((state) =>
      (state.goals ?? [])
        .filter((goal) => goal.profileId === profileId)
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    );
  }
  const rows = await db.getAllAsync<GoalRow>("SELECT * FROM savings_goal WHERE profile_id = ? ORDER BY created_at ASC", profileId);
  return rows.map(mapGoal);
}

export async function listGoalEntries(db: AppDatabase, goalId: string): Promise<GoalEntry[]> {
  if (isWebDatabase(db)) {
    return db.read((state) =>
      (state.goalEntries ?? [])
        .filter((entry) => entry.goalId === goalId)
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    );
  }
  const rows = await db.getAllAsync<EntryRow>("SELECT * FROM goal_entry WHERE goal_id = ? ORDER BY created_at DESC", goalId);
  return rows.map(mapEntry);
}

export async function getGoal(db: AppDatabase, id: string): Promise<SavingsGoal | null> {
  if (isWebDatabase(db)) return db.read((state) => (state.goals ?? []).find((goal) => goal.id === id) ?? null);
  const row = await db.getFirstAsync<GoalRow>("SELECT * FROM savings_goal WHERE id = ?", id);
  return row ? mapGoal(row) : null;
}

export async function createGoal(db: AppDatabase, input: GoalWrite): Promise<string> {
  const id = newId();
  const created = nowIso();
  const goal: SavingsGoal = {
    id,
    profileId: input.profileId,
    name: input.name.trim(),
    targetCents: input.targetCents,
    targetDate: input.targetDate,
    horizon: input.horizon,
    weeklySetAsideCents: input.weeklySetAsideCents,
    savedCents: 0,
    status: "active",
    celebrated: false,
    createdAt: created,
    updatedAt: created,
  };
  if (isWebDatabase(db)) {
    await db.update((state) => {
      state.goals = state.goals ?? [];
      state.goals.push(goal);
    });
    return id;
  }
  await insertGoal(db, goal);
  return id;
}

export async function updateGoal(db: AppDatabase, id: string, patch: GoalPatch): Promise<SavingsGoal | null> {
  const current = await getGoal(db, id);
  if (!current) return null;
  const next: SavingsGoal = {
    ...current,
    name: patch.name?.trim() || current.name,
    targetCents: patch.targetCents && patch.targetCents > 0 ? patch.targetCents : current.targetCents,
    targetDate: "targetDate" in patch ? patch.targetDate ?? null : current.targetDate,
    horizon: patch.horizon ?? current.horizon,
    weeklySetAsideCents: patch.weeklySetAsideCents != null && patch.weeklySetAsideCents >= 0 ? patch.weeklySetAsideCents : current.weeklySetAsideCents,
    status: patch.status ?? current.status,
    updatedAt: nowIso(),
  };
  const met = next.savedCents >= next.targetCents;
  next.celebrated = met ? true : false;
  await writeGoal(db, next);
  return next;
}

export async function deleteGoal(db: AppDatabase, id: string): Promise<void> {
  if (isWebDatabase(db)) {
    await db.update((state) => {
      state.goals = (state.goals ?? []).filter((goal) => goal.id !== id);
      state.goalEntries = (state.goalEntries ?? []).filter((entry) => entry.goalId !== id);
    });
    return;
  }
  await db.runAsync("DELETE FROM savings_goal WHERE id = ?", id);
}

export async function addGoalEntry(
  db: AppDatabase,
  goalId: string,
  input: { kind: GoalEntryKind; amountCents: number; weekStart: string | null },
): Promise<SavingsGoal | null> {
  const current = await getGoal(db, goalId);
  if (!current) return null;
  const savedCents = nextBalance(current.savedCents, input.kind, input.amountCents);
  const met = savedCents >= current.targetCents;
  const next: SavingsGoal = {
    ...current,
    savedCents,
    celebrated: met,
    status: current.status === "active" && met ? current.status : current.status,
    updatedAt: nowIso(),
  };
  const entry: GoalEntry = {
    id: newId(),
    goalId,
    kind: input.kind,
    amountCents: input.kind === "adjust" ? input.amountCents : input.kind === "skip" ? 0 : Math.abs(input.amountCents),
    weekStart: input.weekStart,
    createdAt: next.updatedAt,
  };
  if (isWebDatabase(db)) {
    await db.update((state) => {
      state.goalEntries = state.goalEntries ?? [];
      state.goalEntries.push(entry);
      state.goals = (state.goals ?? []).map((goal) => (goal.id === goalId ? next : goal));
    });
    return next;
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO goal_entry (id, goal_id, kind, amount_cents, week_start, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      entry.id,
      entry.goalId,
      entry.kind,
      entry.amountCents,
      entry.weekStart,
      entry.createdAt,
    );
    await writeGoal(db, next);
  });
  return next;
}

async function writeGoal(db: AppDatabase, goal: SavingsGoal): Promise<void> {
  if (isWebDatabase(db)) {
    await (db as WebDatabase).update((state) => {
      state.goals = (state.goals ?? []).map((item) => (item.id === goal.id ? goal : item));
    });
    return;
  }
  await (db as SQLiteDatabase).runAsync(
    `UPDATE savings_goal SET name = ?, target_cents = ?, target_date = ?, horizon = ?, weekly_set_aside_cents = ?, saved_cents = ?, status = ?, celebrated = ?, updated_at = ? WHERE id = ?`,
    goal.name,
    goal.targetCents,
    goal.targetDate,
    goal.horizon,
    goal.weeklySetAsideCents,
    goal.savedCents,
    goal.status,
    goal.celebrated ? 1 : 0,
    goal.updatedAt,
    goal.id,
  );
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

type GoalRow = {
  id: string;
  profile_id: string;
  name: string;
  target_cents: number;
  target_date: string | null;
  horizon: GoalHorizon;
  weekly_set_aside_cents: number;
  saved_cents: number;
  status: GoalStatus;
  celebrated: number;
  created_at: string;
  updated_at: string;
};

type EntryRow = {
  id: string;
  goal_id: string;
  kind: GoalEntryKind;
  amount_cents: number;
  week_start: string | null;
  created_at: string;
};

function mapGoal(row: GoalRow): SavingsGoal {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    targetCents: row.target_cents,
    targetDate: row.target_date,
    horizon: row.horizon,
    weeklySetAsideCents: row.weekly_set_aside_cents,
    savedCents: row.saved_cents,
    status: row.status,
    celebrated: row.celebrated === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEntry(row: EntryRow): GoalEntry {
  return {
    id: row.id,
    goalId: row.goal_id,
    kind: row.kind,
    amountCents: row.amount_cents,
    weekStart: row.week_start,
    createdAt: row.created_at,
  };
}
