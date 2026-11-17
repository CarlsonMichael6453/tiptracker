import type { AppDatabase } from "./types";
import { openWebDatabase } from "./webStore";

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Web entry. Native builds use SQLite in database.ts. This file is what
 * Metro loads for the browser, including the GitHub Pages copy.
 */
export function openDatabase(): Promise<AppDatabase> {
  return openWebDatabase();
}
