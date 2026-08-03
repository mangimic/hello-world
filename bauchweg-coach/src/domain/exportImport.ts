import type { DailyEntry, Mood, Profile, TrainingType } from './types';
import { TRAINING_LABELS } from './types';

/** Struktur der JSON-Export-Datei. */
export interface ExportPayload {
  app: 'bauchweg-coach';
  schemaVersion: 1;
  exportedAt: string;
  profile: Profile | null;
  entries: DailyEntry[];
}

export function buildExportJson(profile: Profile | null, entries: readonly DailyEntry[]): string {
  const payload: ExportPayload = {
    app: 'bauchweg-coach',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile,
    entries: [...entries].sort((a, b) => a.date.localeCompare(b.date)),
  };
  return JSON.stringify(payload, null, 2);
}

const CSV_HEADER = [
  'Datum',
  'Gewicht (kg)',
  'Bauchumfang (cm)',
  'Schlaf (h)',
  'Schlafqualität (1-5)',
  'Energie (1-5)',
  'Hunger (1-5)',
  'Stimmung',
  'Essen Vortag',
  'Wasser (l)',
  'Training',
  'Trainingsdauer (min)',
  'Notiz',
].join(';');

function csvEscape(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvNumber(value: number | undefined): string {
  if (typeof value !== 'number') return '';
  // de-DE: Dezimalkomma, Semikolon als Spaltentrenner.
  return String(value).replace('.', ',');
}

/** CSV-Export mit Semikolon-Trennung und Dezimalkomma (de-DE, Excel-kompatibel). */
export function buildExportCsv(entries: readonly DailyEntry[]): string {
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) =>
      [
        e.date,
        csvNumber(e.weightKg),
        csvNumber(e.waistCm),
        csvNumber(e.sleepHours),
        csvNumber(e.sleepQuality),
        csvNumber(e.energy),
        csvNumber(e.hunger),
        e.mood ?? '',
        csvEscape(e.foodYesterday ?? ''),
        csvNumber(e.waterLiters),
        TRAINING_LABELS[e.trainingType],
        csvNumber(e.trainingMinutes),
        csvEscape(e.note ?? ''),
      ].join(';'),
    );
  return [CSV_HEADER, ...rows].join('\r\n');
}

export interface ImportResult {
  profile: Profile | null;
  entries: DailyEntry[];
}

const TRAINING_TYPES: readonly TrainingType[] = [
  'kein_training',
  'krafttraining',
  'tennis',
  'laufen',
  'spaziergang',
  'radfahren',
  'anderes',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseEntry(raw: unknown): DailyEntry | null {
  if (!isRecord(raw)) return null;
  const date = raw['date'];
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const trainingType = raw['trainingType'];
  const training: TrainingType = TRAINING_TYPES.includes(trainingType as TrainingType)
    ? (trainingType as TrainingType)
    : 'kein_training';

  const scale = (value: unknown): 1 | 2 | 3 | 4 | 5 | undefined => {
    const n = optionalNumber(value);
    return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 ? n : undefined;
  };

  const mood = optionalString(raw['mood']);
  const validMoods = ['gut', 'neutral', 'angespannt', 'niedergeschlagen'];

  const entry: DailyEntry = {
    date,
    trainingType: training,
    createdAt: optionalString(raw['createdAt']) ?? new Date().toISOString(),
    updatedAt: optionalString(raw['updatedAt']) ?? new Date().toISOString(),
  };
  const weightKg = optionalNumber(raw['weightKg']);
  if (weightKg !== undefined) entry.weightKg = weightKg;
  const waistCm = optionalNumber(raw['waistCm']);
  if (waistCm !== undefined) entry.waistCm = waistCm;
  const sleepHours = optionalNumber(raw['sleepHours']);
  if (sleepHours !== undefined) entry.sleepHours = sleepHours;
  const sleepQuality = scale(raw['sleepQuality']);
  if (sleepQuality !== undefined) entry.sleepQuality = sleepQuality;
  const energy = scale(raw['energy']);
  if (energy !== undefined) entry.energy = energy;
  const hunger = scale(raw['hunger']);
  if (hunger !== undefined) entry.hunger = hunger;
  if (mood && validMoods.includes(mood)) entry.mood = mood as Mood;
  const foodYesterday = optionalString(raw['foodYesterday']);
  if (foodYesterday !== undefined) entry.foodYesterday = foodYesterday;
  const waterLiters = optionalNumber(raw['waterLiters']);
  if (waterLiters !== undefined) entry.waterLiters = waterLiters;
  const trainingMinutes = optionalNumber(raw['trainingMinutes']);
  if (trainingMinutes !== undefined) entry.trainingMinutes = trainingMinutes;
  const note = optionalString(raw['note']);
  if (note !== undefined) entry.note = note;
  if (raw['isDemo'] === true) entry.isDemo = true;
  return entry;
}

function parseProfile(raw: unknown): Profile | null {
  if (!isRecord(raw)) return null;
  const age = optionalNumber(raw['age']);
  const heightCm = optionalNumber(raw['heightCm']);
  const startWeightKg = optionalNumber(raw['startWeightKg']);
  if (age === undefined || heightCm === undefined || startWeightKg === undefined) return null;

  const genders = ['weiblich', 'maennlich', 'divers', 'keine_angabe'];
  const bodyTypes = ['schlank', 'mittel', 'kraeftig', 'keine_angabe'];
  const activities = ['sitzend', 'leicht_aktiv', 'aktiv', 'sehr_aktiv'];
  const frequencies = ['nie', 'selten', '1_2_pro_woche', '3_plus_pro_woche'];

  const gender = optionalString(raw['gender']);
  const bodyType = optionalString(raw['bodyType']);
  const activityLevel = optionalString(raw['activityLevel']);
  const trainingFrequency = optionalString(raw['trainingFrequency']);

  const profile: Profile = {
    gender: genders.includes(gender ?? '') ? (gender as Profile['gender']) : 'keine_angabe',
    age,
    heightCm,
    startWeightKg,
    bodyType: bodyTypes.includes(bodyType ?? '')
      ? (bodyType as Profile['bodyType'])
      : 'keine_angabe',
    activityLevel: activities.includes(activityLevel ?? '')
      ? (activityLevel as Profile['activityLevel'])
      : 'leicht_aktiv',
    trainingFrequency: frequencies.includes(trainingFrequency ?? '')
      ? (trainingFrequency as Profile['trainingFrequency'])
      : 'selten',
    habitsNotes: optionalString(raw['habitsNotes']) ?? '',
    createdAt: optionalString(raw['createdAt']) ?? new Date().toISOString(),
    updatedAt: optionalString(raw['updatedAt']) ?? new Date().toISOString(),
  };
  const bodyFat = optionalNumber(raw['bodyFatPercent']);
  if (bodyFat !== undefined) profile.bodyFatPercent = bodyFat;
  return profile;
}

/**
 * Liest eine JSON-Export-Datei wieder ein.
 * Wirft einen Error mit deutscher Meldung bei ungültigem Format.
 * Ungültige Einzeleinträge werden übersprungen, Duplikate (gleiches Datum) dedupliziert.
 */
export function parseImportJson(json: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  if (!isRecord(data) || data['app'] !== 'bauchweg-coach') {
    throw new Error('Die Datei stammt nicht aus BauchWeg Coach (Feld „app“ fehlt).');
  }
  const rawEntries = Array.isArray(data['entries']) ? data['entries'] : [];
  const seen = new Set<string>();
  const entries: DailyEntry[] = [];
  for (const raw of rawEntries) {
    const entry = parseEntry(raw);
    if (entry && !seen.has(entry.date)) {
      seen.add(entry.date);
      entries.push(entry);
    }
  }
  return {
    profile: parseProfile(data['profile']),
    entries: entries.sort((a, b) => a.date.localeCompare(b.date)),
  };
}
