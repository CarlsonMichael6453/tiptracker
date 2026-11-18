import * as SQLite from "expo-sqlite";
import { SCHEMA_SQL } from "./schema";
import type { AppDatabase } from "./types";

const DATABASE_NAME = "tiptracker.db";
const SCHEMA_VERSION = 3;

const MIGRATION_V2 = `
ALTER TABLE profile ADD COLUMN appearance_json TEXT;
`;

const MIGRATION_V3 = `
ALTER TABLE profile ADD COLUMN weekly_goal_cents INTEGER;
ALTER TABLE profile ADD COLUMN show_tip_jar INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profile ADD COLUMN tip_jar_celebrated_week TEXT;
`;

let opening: Promise<AppDatabase> | null = null;

export function openDatabase(): Promise<AppDatabase> {
  if (!opening) opening = openAndMigrate();
  return opening;
}

async function openAndMigrate(): Promise<AppDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync("PRAGMA foreign_keys = ON;");
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const version = row?.user_version ?? 0;
  if (version === 0) {
    await db.execAsync(SCHEMA_SQL);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  } else if (version < SCHEMA_VERSION) {
    if (version < 2) await db.execAsync(MIGRATION_V2);
    if (version < 3) await db.execAsync(MIGRATION_V3);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  } else if (version !== SCHEMA_VERSION) {
    throw new Error(`This Tip Tracker file is version ${version}. This app reads version ${SCHEMA_VERSION}.`);
  } else {
    await db.execAsync("PRAGMA foreign_keys = ON;");
  }
  return db;
}
