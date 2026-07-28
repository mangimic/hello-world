import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DailyEntry, IsoDate, Profile } from '../domain/types';

interface BauchwegDB extends DBSchema {
  profile: {
    key: string;
    value: Profile;
  };
  entries: {
    key: IsoDate;
    value: DailyEntry;
  };
}

const DB_NAME = 'bauchweg-coach';
const DB_VERSION = 1;
const PROFILE_KEY = 'me';

let dbPromise: Promise<IDBPDatabase<BauchwegDB>> | null = null;

function getDb(): Promise<IDBPDatabase<BauchwegDB>> {
  dbPromise ??= openDB<BauchwegDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile');
      }
      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'date' });
      }
    },
  });
  return dbPromise;
}

export async function loadProfile(): Promise<Profile | null> {
  const db = await getDb();
  return (await db.get('profile', PROFILE_KEY)) ?? null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDb();
  await db.put('profile', profile, PROFILE_KEY);
}

export async function loadAllEntries(): Promise<DailyEntry[]> {
  const db = await getDb();
  const entries = await db.getAll('entries');
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export async function loadEntry(date: IsoDate): Promise<DailyEntry | null> {
  const db = await getDb();
  return (await db.get('entries', date)) ?? null;
}

export async function saveEntry(entry: DailyEntry): Promise<void> {
  const db = await getDb();
  await db.put('entries', entry);
}

export async function saveEntries(entries: readonly DailyEntry[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('entries', 'readwrite');
  await Promise.all([...entries.map((e) => tx.store.put(e)), tx.done]);
}

export async function deleteEntry(date: IsoDate): Promise<void> {
  const db = await getDb();
  await db.delete('entries', date);
}

/** Löscht sämtliche Daten (Profil und Einträge). */
export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['profile', 'entries'], 'readwrite');
  await Promise.all([
    tx.objectStore('profile').clear(),
    tx.objectStore('entries').clear(),
    tx.done,
  ]);
}
