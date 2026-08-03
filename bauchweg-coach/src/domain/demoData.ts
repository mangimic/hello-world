import type { DailyEntry, Scale1to5, TrainingType } from './types';
import { addDays, todayIso } from './stats';

/**
 * Erzeugt 30 Tage Demo-Daten mit realistischen täglichen Gewichtsschwankungen
 * und einem leicht fallenden Trend (ca. 0,25 kg pro Woche).
 * Deterministisch, damit die Demo reproduzierbar bleibt.
 */
export function buildDemoEntries(endDate = todayIso(), days = 30): DailyEntry[] {
  const startWeight = 84.6;
  const trendPerDay = 0.035;

  // Deterministische Pseudo-Schwankung (kein Math.random, reproduzierbar).
  const wobble = (i: number): number =>
    0.35 * Math.sin(i * 1.7) + 0.25 * Math.sin(i * 0.9 + 2) + 0.15 * Math.sin(i * 2.6 + 1);

  const trainings: readonly { type: TrainingType; minutes: number }[] = [
    { type: 'krafttraining', minutes: 55 },
    { type: 'kein_training', minutes: 0 },
    { type: 'spaziergang', minutes: 30 },
    { type: 'tennis', minutes: 75 },
    { type: 'kein_training', minutes: 0 },
    { type: 'laufen', minutes: 40 },
    { type: 'radfahren', minutes: 45 },
  ];

  const foods: readonly string[] = [
    'Haferflocken mit Beeren, Linsensuppe, abends Hähnchen mit Gemüse',
    'Rührei, Salat mit Thunfisch, abends Pizza mit Freunden',
    'Skyr mit Obst, Vollkornbrot mit Käse, abends Gemüsepfanne mit Reis',
    'Müsli, Reste vom Vortag, abends Pasta mit Tomatensauce',
    'Joghurt mit Nüssen, Suppe, abends Fisch mit Kartoffeln',
    'Porridge, Wrap mit Hähnchen, abends Salat mit Feta',
    'Brot mit Ei, Bowl mit Quinoa, abends Ofengemüse mit Halloumi',
  ];

  const now = new Date().toISOString();
  const entries: DailyEntry[] = [];
  const startDate = addDays(endDate, -(days - 1));

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const weight = startWeight - i * trendPerDay + wobble(i);
    const training = trainings[i % trainings.length]!;
    const sleep = 6 + ((i * 7) % 5) * 0.5;
    const clamp = (n: number): Scale1to5 => Math.min(5, Math.max(1, Math.round(n))) as Scale1to5;

    const entry: DailyEntry = {
      date,
      weightKg: Math.round(weight * 10) / 10,
      sleepHours: sleep,
      sleepQuality: clamp(2 + ((i * 3) % 4)),
      energy: clamp(2 + ((i * 5) % 4)),
      hunger: clamp(1 + ((i * 2) % 4)),
      foodYesterday: foods[i % foods.length]!,
      trainingType: training.type,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    };
    if (training.minutes > 0) entry.trainingMinutes = training.minutes;
    if (i % 3 === 0) entry.waistCm = Math.round((97.5 - i * 0.06 + wobble(i + 3) * 0.4) * 10) / 10;
    if (i % 2 === 0) entry.waterLiters = 1.5 + (i % 3) * 0.5;
    entries.push(entry);
  }
  return entries;
}
