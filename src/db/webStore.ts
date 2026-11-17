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

function parseState(json: string): WebState {
  const data = JSON.parse(json) as Partial<WebState>;
  if (!data || !Array.isArray(data.profiles) || !Array.isArray(data.roles) || !Array.isArray(data.shifts)) {
    return emptyWebState();
  }
  return {
    profiles: data.profiles,
    roles: data.roles,
    shifts: data.shifts,
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
