import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DailyEntry, IsoDate, Profile } from '../domain/types';
import * as db from '../db/database';

interface AppDataContextValue {
  ready: boolean;
  profile: Profile | null;
  entries: DailyEntry[];
  saveProfile: (profile: Profile) => Promise<void>;
  saveEntry: (entry: DailyEntry) => Promise<void>;
  saveEntries: (entries: DailyEntry[]) => Promise<void>;
  deleteEntry: (date: IsoDate) => Promise<void>;
  deleteAllData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [loadedProfile, loadedEntries] = await Promise.all([
        db.loadProfile(),
        db.loadAllEntries(),
      ]);
      if (!cancelled) {
        setProfile(loadedProfile);
        setEntries(loadedEntries);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = useCallback(async (next: Profile) => {
    await db.saveProfile(next);
    setProfile(next);
  }, []);

  const saveEntry = useCallback(async (entry: DailyEntry) => {
    await db.saveEntry(entry);
    setEntries((prev) => {
      const others = prev.filter((e) => e.date !== entry.date);
      return [...others, entry].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const saveEntries = useCallback(async (newEntries: DailyEntry[]) => {
    await db.saveEntries(newEntries);
    setEntries((prev) => {
      const dates = new Set(newEntries.map((e) => e.date));
      const others = prev.filter((e) => !dates.has(e.date));
      return [...others, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const deleteEntry = useCallback(async (date: IsoDate) => {
    await db.deleteEntry(date);
    setEntries((prev) => prev.filter((e) => e.date !== date));
  }, []);

  const deleteAllData = useCallback(async () => {
    await db.deleteAllData();
    setProfile(null);
    setEntries([]);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      profile,
      entries,
      saveProfile,
      saveEntry,
      saveEntries,
      deleteEntry,
      deleteAllData,
    }),
    [ready, profile, entries, saveProfile, saveEntry, saveEntries, deleteEntry, deleteAllData],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData muss innerhalb von AppDataProvider verwendet werden.');
  return ctx;
}
