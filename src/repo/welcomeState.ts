import { isWebDatabase, type AppDatabase } from "../db/types";

export const WELCOME_SEEN_KEY = "welcome_seen";

export async function readWelcomeSeen(db: AppDatabase): Promise<boolean> {
  if (isWebDatabase(db)) return db.read((state) => state.kv[WELCOME_SEEN_KEY] === "1");
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_kv WHERE key = ?", WELCOME_SEEN_KEY);
  return row?.value === "1";
}

export async function markWelcomeSeen(db: AppDatabase): Promise<void> {
  if (isWebDatabase(db)) {
    await db.update((state) => {
      state.kv[WELCOME_SEEN_KEY] = "1";
    });
    return;
  }
  await db.runAsync(
    "INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    WELCOME_SEEN_KEY,
    "1",
  );
}
