import type { DailyEntry, IsoDate } from './types';

/** Formatiert ein Date als lokales ISO-Datum (YYYY-MM-DD). */
export function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/**
 * 7-Tage-Durchschnitt des Gewichts bis einschließlich `date`.
 * Berücksichtigt nur Tage mit Gewichtseintrag im Fenster [date-6, date].
 * Liefert null, wenn kein Gewichtswert im Fenster liegt.
 */
export function rollingWeightAverage(
  entries: readonly DailyEntry[],
  date: IsoDate,
  windowDays = 7,
): number | null {
  const from = addDays(date, -(windowDays - 1));
  const weights = entries
    .filter((e) => e.date >= from && e.date <= date && typeof e.weightKg === 'number')
    .map((e) => e.weightKg as number);
  if (weights.length === 0) return null;
  const sum = weights.reduce((acc, w) => acc + w, 0);
  return sum / weights.length;
}

/**
 * Differenz des Tagesgewichts zum 7-Tage-Durchschnitt (inkl. des Tages selbst).
 * Positiv = über dem Durchschnitt. Null, wenn kein Vergleich möglich ist.
 */
export function diffToRollingAverage(
  entries: readonly DailyEntry[],
  date: IsoDate,
): { diffKg: number; averageKg: number; sampleSize: number } | null {
  const entry = entries.find((e) => e.date === date);
  if (!entry || typeof entry.weightKg !== 'number') return null;
  const from = addDays(date, -6);
  const window = entries.filter(
    (e) => e.date >= from && e.date <= date && typeof e.weightKg === 'number',
  );
  const average = rollingWeightAverage(entries, date);
  if (average === null) return null;
  return {
    diffKg: entry.weightKg - average,
    averageKg: average,
    sampleSize: window.length,
  };
}

/** Zeitreihe mit gleitendem 7-Tage-Durchschnitt für Diagramme. */
export interface TrendPoint {
  date: IsoDate;
  weightKg: number | null;
  average7: number | null;
  waistCm: number | null;
  sleepHours: number | null;
  energy: number | null;
  trainingMinutes: number;
  trainingType: DailyEntry['trainingType'] | null;
}

export function buildTrendSeries(entries: readonly DailyEntry[], days: number): TrendPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.at(-1);
  if (!last) return [];
  const end = last.date;
  const start = addDays(end, -(days - 1));
  const points: TrendPoint[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const entry = sorted.find((e) => e.date === d);
    points.push({
      date: d,
      weightKg: entry?.weightKg ?? null,
      average7: rollingWeightAverage(sorted, d),
      waistCm: entry?.waistCm ?? null,
      sleepHours: entry?.sleepHours ?? null,
      energy: entry?.energy ?? null,
      trainingMinutes: entry?.trainingMinutes ?? 0,
      trainingType: entry?.trainingType ?? null,
    });
  }
  return points;
}
