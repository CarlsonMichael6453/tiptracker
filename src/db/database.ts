import * as SQLite from "expo-sqlite";
import { SCHEMA_SQL } from "./schema";

const DATABASE_NAME = "tiptracker.db";
const SCHEMA_VERSION = 1;

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!opening) opening = openAndMigrate();
  return opening;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync("PRAGMA foreign_keys = ON;");
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const version = row?.user_version ?? 0;
  if (version === 0) {
    await db.execAsync(SCHEMA_SQL);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  } else if (version !== SCHEMA_VERSION) {
    throw new Error(`This Tip Tracker file is version ${version}. This app reads version ${SCHEMA_VERSION}.`);
  } else {
    await db.execAsync("PRAGMA foreign_keys = ON;");
  }
  return db;
}

export function nowIso(): string {
  return new Date().toISOString();
}
