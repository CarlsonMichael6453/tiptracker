import { isCivilDate } from "../calc/dates";
import { nextReviewRecord, type ReviewRecord } from "../feedback/message";
import { isWebDatabase, type AppDatabase } from "../db/types";

const LAST_KEY = "review_last_asked";
const COUNT_KEY = "review_ask_count";

export async function readReviewRecord(db: AppDatabase): Promise<ReviewRecord> {
  if (isWebDatabase(db)) {
    return db.read((state) => normalize(state.kv[LAST_KEY], state.kv[COUNT_KEY]));
  }
  const last = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_kv WHERE key = ?", LAST_KEY);
  const count = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_kv WHERE key = ?", COUNT_KEY);
  return normalize(last?.value, count?.value);
}

export async function recordReviewAsk(db: AppDatabase, today: string): Promise<ReviewRecord> {
  const next = nextReviewRecord(await readReviewRecord(db), today);
  if (isWebDatabase(db)) {
    await db.update((state) => {
      state.kv[LAST_KEY] = next.lastAsked ?? "";
      state.kv[COUNT_KEY] = String(next.askCount);
    });
    return next;
  }
  await db.runAsync(
    "INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    LAST_KEY,
    next.lastAsked ?? "",
  );
  await db.runAsync(
    "INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    COUNT_KEY,
    String(next.askCount),
  );
  return next;
}

export const REVIEW_KV_KEYS = [LAST_KEY, COUNT_KEY];

function normalize(last: string | undefined, count: string | undefined): ReviewRecord {
  const askCount = Number(count ?? 0);
  return {
    lastAsked: last && isCivilDate(last) ? last : null,
    askCount: Number.isInteger(askCount) && askCount > 0 ? askCount : 0,
  };
}
