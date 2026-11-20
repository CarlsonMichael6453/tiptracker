import { emptyBudget, type BudgetLedger } from "../budget/types";
import { isWebDatabase, type AppDatabase } from "../db/types";

export async function getBudget(db: AppDatabase, profileId: string): Promise<BudgetLedger> {
  if (isWebDatabase(db)) {
    return db.read((state) => (state.budgets ?? []).find((row) => row.profileId === profileId) ?? emptyBudget(profileId));
  }
  const row = await db.getFirstAsync<{ json: string }>("SELECT json FROM budget_ledger WHERE profile_id = ?", profileId);
  if (!row) return emptyBudget(profileId);
  try {
    return { ...emptyBudget(profileId), ...JSON.parse(row.json), profileId };
  } catch {
    return emptyBudget(profileId);
  }
}

export async function saveBudget(db: AppDatabase, ledger: BudgetLedger): Promise<void> {
  if (isWebDatabase(db)) {
    await db.update((state) => {
      state.budgets = state.budgets ?? [];
      const index = state.budgets.findIndex((row) => row.profileId === ledger.profileId);
      if (index >= 0) state.budgets[index] = ledger;
      else state.budgets.push(ledger);
    });
    return;
  }
  const json = JSON.stringify(ledger);
  await db.runAsync(
    "INSERT INTO budget_ledger (profile_id, json) VALUES (?, ?) ON CONFLICT(profile_id) DO UPDATE SET json = excluded.json",
    ledger.profileId,
    json,
  );
}
