import { isCivilDate } from "../calc/dates";
import type { GoalEntry, GoalEntryKind, GoalHorizon, GoalStatus, Profile, SavingsGoal } from "../domain/types";
import { resolveGoalStyle } from "../calc/goalStyle";
import { parseAppearance } from "../ui/appearance";
import { emptyWebState, type WebDatabase, type WebState } from "./types";

const IDB_NAME = "tiptracker";
const IDB_STORE = "ledger";
const IDB_KEY = "state";
const LS_KEY = "tiptracker.v1";

export function createMemoryWebDatabase(initial?: WebState): WebDatabase {
  return createQueuedDatabase(initial ?? emptyWebState(), async () => undefined);
}

export async function openWebDatabase(): Promise<WebDatabase> {
  return createQueuedDatabase(await loadState(), persistState);
}

function createQueuedDatabase(initial: WebState, persist: (state: WebState) => Promise<void>): WebDatabase {
  let memory = initial;
  let queue = Promise.resolve();
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const run = queue.then(work, work);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
  return {
    kind: "web",
    read(fn) {
      return enqueue(async () => fn(structuredClone(memory)));
    },
    update(fn) {
      return enqueue(async () => {
        const draft = structuredClone(memory);
        const result = fn(draft);
        memory = draft;
        await persist(memory);
        return result === undefined ? (undefined as typeof result) : structuredClone(result);
      });
    },
  };
}

async function loadState(): Promise<WebState> {
  try {
    const fromIdb = await idbGet();
    if (fromIdb) return parseState(fromIdb);
  } catch {
    /* IndexedDB can be blocked. localStorage is the fallback. */
  }
  try {
    const fromLocal = globalThis.localStorage?.getItem(LS_KEY);
    if (fromLocal) return parseState(fromLocal);
  } catch {
    /* Private mode can throw on localStorage. */
  }
  return emptyWebState();
}

async function persistState(state: WebState): Promise<void> {
  const json = JSON.stringify(state);
  try {
    await idbSet(json);
    return;
  } catch {
    /* Fall through to localStorage. */
  }
  globalThis.localStorage.setItem(LS_KEY, json);
}

function normalizeProfile(profile: Profile): Profile {
  const goal = profile.weeklyGoalCents;
  const celebrated = profile.tipJarCelebratedWeek;
  return {
    ...profile,
    appearance: parseAppearance(profile.appearance),
    weeklyGoalCents: typeof goal === "number" && Number.isInteger(goal) && goal > 0 ? goal : null,
    showTipJar: profile.showTipJar === false ? false : true,
    goalIndicator: resolveGoalStyle(profile.goalIndicator, profile.showTipJar !== false),
    tipJarCelebratedWeek: typeof celebrated === "string" && isCivilDate(celebrated) ? celebrated : null,
    payPeriodStartsOn: profile.payPeriodStartsOn >= 0 && profile.payPeriodStartsOn <= 6 ? profile.payPeriodStartsOn : 5,
    payPeriodWeeks: profile.payPeriodWeeks === 2 ? 2 : 1,
  };
}

function normalizeGoal(raw: SavingsGoal): SavingsGoal | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.profileId !== "string") return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name || typeof raw.targetCents !== "number" || raw.targetCents <= 0) return null;
  const horizon: GoalHorizon = raw.horizon === "long" ? "long" : "short";
  const status: GoalStatus = raw.status === "complete" || raw.status === "archived" ? raw.status : "active";
  return {
    id: raw.id,
    profileId: raw.profileId,
    name: name.slice(0, 40),
    targetCents: raw.targetCents,
    targetDate: typeof raw.targetDate === "string" && isCivilDate(raw.targetDate) ? raw.targetDate : null,
    horizon,
    weeklySetAsideCents: typeof raw.weeklySetAsideCents === "number" && raw.weeklySetAsideCents > 0 ? Math.round(raw.weeklySetAsideCents) : 0,
    savedCents: typeof raw.savedCents === "number" && raw.savedCents > 0 ? Math.round(raw.savedCents) : 0,
    status,
    celebrated: raw.celebrated === true,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeEntry(raw: GoalEntry): GoalEntry | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.goalId !== "string") return null;
  const kinds: GoalEntryKind[] = ["set_aside", "add", "withdraw", "adjust", "skip"];
  if (!kinds.includes(raw.kind) || typeof raw.amountCents !== "number") return null;
  return {
    id: raw.id,
    goalId: raw.goalId,
    kind: raw.kind,
    amountCents: Math.round(raw.amountCents),
    weekStart: typeof raw.weekStart === "string" && isCivilDate(raw.weekStart) ? raw.weekStart : null,
    createdAt: raw.createdAt,
  };
}

function parseState(json: string): WebState {
  const data = JSON.parse(json) as Partial<WebState>;
  if (!data || !Array.isArray(data.profiles) || !Array.isArray(data.roles) || !Array.isArray(data.shifts)) {
    return emptyWebState();
  }
  return {
    profiles: data.profiles.map((profile) => normalizeProfile(profile)),
    roles: data.roles,
    shifts: data.shifts,
    goals: Array.isArray(data.goals) ? data.goals.map(normalizeGoal).filter((goal): goal is SavingsGoal => goal != null) : [],
    goalEntries: Array.isArray(data.goalEntries) ? data.goalEntries.map(normalizeEntry).filter((entry): entry is GoalEntry => entry != null) : [],
    payStubs: Array.isArray(data.payStubs) ? data.payStubs : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    kv: data.kv && typeof data.kv === "object" ? data.kv : {},
  };
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage"));
  });
}

async function idbGet(): Promise<string | null> {
  const db = await idbOpen();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const request = tx.objectStore(IDB_STORE).get(IDB_KEY);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function idbSet(json: string): Promise<void> {
  const db = await idbOpen();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(json, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Browser storage write was aborted"));
    });
  } finally {
    db.close();
  }
}
