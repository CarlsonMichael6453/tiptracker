import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { openDatabase } from "../db/database";
import type { AppDatabase } from "../db/types";
import type { Appearance, AppearanceSettings, Profile } from "../domain/types";
import {
  getActiveProfileId,
  getAppearance,
  getProfile,
  listProfiles,
  setActiveProfileId,
  setAppearance as saveAppearance,
  updateProfile,
} from "../repo/repository";
import { markWelcomeSeen as persistWelcomeSeen, readWelcomeSeen } from "../repo/welcomeState";

type AppContextValue = {
  ready: boolean;
  bootError: string | null;
  db: AppDatabase | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  appearance: Appearance;
  reload: () => Promise<void>;
  setActive: (id: string) => Promise<void>;
  updateAppearance: (value: Appearance) => Promise<void>;
  saveProfileAppearance: (value: AppearanceSettings) => Promise<void>;
  saveTipJar: (patch: Partial<Pick<Profile, "weeklyGoalCents" | "showTipJar" | "tipJarCelebratedWeek">>) => Promise<void>;
  welcomeSeen: boolean;
  markWelcomeSeen: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [appearance, setAppearanceState] = useState<Appearance>("system");
  const [welcomeSeen, setWelcomeSeen] = useState(false);

  const reload = useCallback(async () => {
    const database = db ?? (await openDatabase());
    if (!db) setDb(database);
    const [list, activeId, appearanceValue, seen] = await Promise.all([
      listProfiles(database),
      getActiveProfileId(database),
      getAppearance(database),
      readWelcomeSeen(database),
    ]);
    let active = activeId ? await getProfile(database, activeId) : null;
    if (!active && list[0]) {
      active = list[0];
      await setActiveProfileId(database, list[0].id);
    }
    setProfiles(list);
    setActiveProfile(active);
    setAppearanceState(appearanceValue);
    setWelcomeSeen(seen);
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const database = await openDatabase();
        if (cancelled) return;
        setDb(database);
        const [list, activeId, appearanceValue, seen] = await Promise.all([
          listProfiles(database),
          getActiveProfileId(database),
          getAppearance(database),
          readWelcomeSeen(database),
        ]);
        let active = activeId ? list.find((profile) => profile.id === activeId) ?? null : null;
        if (!active && list[0]) {
          active = list[0];
          await setActiveProfileId(database, list[0].id);
        }
        if (cancelled) return;
        setProfiles(list);
        setActiveProfile(active);
        setAppearanceState(appearanceValue);
        setWelcomeSeen(seen);
        setReady(true);
      } catch (error) {
        if (cancelled) return;
        setBootError(error instanceof Error ? error.message : "Could not open Tip Tracker.");
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActive = useCallback(
    async (id: string) => {
      if (!db) return;
      await setActiveProfileId(db, id);
      await reload();
    },
    [db, reload],
  );

  const updateAppearance = useCallback(
    async (value: Appearance) => {
      if (!db) return;
      await saveAppearance(db, value);
      setAppearanceState(value);
    },
    [db],
  );

  const saveTipJar = useCallback(
    async (patch: Partial<Pick<Profile, "weeklyGoalCents" | "showTipJar" | "tipJarCelebratedWeek">>) => {
      if (!db || !activeProfile) return;
      const next = { ...activeProfile, ...patch };
      setActiveProfile(next);
      setProfiles((list) => list.map((profile) => (profile.id === next.id ? next : profile)));
      await updateProfile(db, next.id, patch);
    },
    [db, activeProfile],
  );

  const saveProfileAppearance = useCallback(
    async (value: AppearanceSettings) => {
      if (!db || !activeProfile) return;
      const next = { ...activeProfile, appearance: value };
      setActiveProfile(next);
      setProfiles((list) => list.map((profile) => (profile.id === next.id ? next : profile)));
      await updateProfile(db, next.id, { appearance: value });
    },
    [db, activeProfile],
  );

  const markWelcomeSeen = useCallback(async () => {
    if (!db) return;
    setWelcomeSeen(true);
    await persistWelcomeSeen(db);
  }, [db]);

  const value = useMemo(
    () => ({
      ready,
      bootError,
      db,
      profiles,
      activeProfile,
      appearance,
      reload,
      setActive,
      updateAppearance,
      saveProfileAppearance,
      saveTipJar,
      welcomeSeen,
      markWelcomeSeen,
    }),
    [ready, bootError, db, profiles, activeProfile, appearance, reload, setActive, updateAppearance, saveProfileAppearance, saveTipJar, welcomeSeen, markWelcomeSeen],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}
