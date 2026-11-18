import type { SQLiteDatabase } from "expo-sqlite";
import type { GoalEntry, PayStub, Profile, Role, SavingsGoal, ShiftRecord } from "../domain/types";

/** The whole ledger, as kept by the browser build. */
export type WebState = {
  profiles: Profile[];
  roles: Role[];
  shifts: ShiftRecord[];
  goals: SavingsGoal[];
  goalEntries: GoalEntry[];
  payStubs: PayStub[];
  kv: Record<string, string>;
};

export function emptyWebState(): WebState {
  return { profiles: [], roles: [], shifts: [], goals: [], goalEntries: [], payStubs: [], kv: {} };
}

/**
 * Browser stand-in for the SQLite file. GitHub Pages cannot send the
 * cross-origin isolation headers expo-sqlite needs for its wasm file,
 * so the web build persists this document in IndexedDB (localStorage if
 * IndexedDB is blocked).
 */
export type WebDatabase = {
  kind: "web";
  read<T>(fn: (state: WebState) => T): Promise<T>;
  update<T>(fn: (state: WebState) => T): Promise<T>;
};

export type AppDatabase = SQLiteDatabase | WebDatabase;

export function isWebDatabase(db: AppDatabase): db is WebDatabase {
  return (db as WebDatabase).kind === "web";
}
