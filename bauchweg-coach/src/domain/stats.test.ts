import { describe, expect, it } from 'vitest';
import { addDays, buildTrendSeries, diffToRollingAverage, rollingWeightAverage } from './stats';
import type { DailyEntry } from './types';

function entry(date: string, weightKg?: number): DailyEntry {
  const e: DailyEntry = {
    date,
    trainingType: 'kein_training',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  if (weightKg !== undefined) e.weightKg = weightKg;
  return e;
}

describe('addDays', () => {
  it('addiert Tage über Monatsgrenzen hinweg', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('rollingWeightAverage (7-Tage-Durchschnitt)', () => {
  it('berechnet den Durchschnitt über ein 7-Tage-Fenster', () => {
    const entries = [
      entry('2026-07-01', 84),
      entry('2026-07-02', 83),
      entry('2026-07-03', 85),
      entry('2026-07-04', 84),
      entry('2026-07-05', 83),
      entry('2026-07-06', 82),
      entry('2026-07-07', 83),
    ];
    expect(rollingWeightAverage(entries, '2026-07-07')).toBeCloseTo(83.428, 2);
  });

  it('ignoriert Werte außerhalb des Fensters', () => {
    const entries = [entry('2026-07-01', 100), entry('2026-07-08', 80), entry('2026-07-09', 82)];
    // Fenster 2026-07-03 … 2026-07-09: der Ausreißer vom 01.07. zählt nicht.
    expect(rollingWeightAverage(entries, '2026-07-09')).toBeCloseTo(81, 5);
  });

  it('ignoriert Tage ohne Gewichtseintrag', () => {
    const entries = [entry('2026-07-07', 82), entry('2026-07-08'), entry('2026-07-09', 84)];
    expect(rollingWeightAverage(entries, '2026-07-09')).toBeCloseTo(83, 5);
  });

  it('liefert null ohne Gewichtsdaten im Fenster', () => {
    expect(rollingWeightAverage([entry('2026-07-01', 84)], '2026-07-20')).toBeNull();
  });
});

describe('diffToRollingAverage (Gewichtsdifferenz zum Durchschnitt)', () => {
  it('berechnet die Differenz zum 7-Tage-Durchschnitt', () => {
    const entries = [entry('2026-07-05', 84), entry('2026-07-06', 83), entry('2026-07-07', 85)];
    const result = diffToRollingAverage(entries, '2026-07-07');
    expect(result).not.toBeNull();
    expect(result?.averageKg).toBeCloseTo(84, 5);
    expect(result?.diffKg).toBeCloseTo(1, 5);
    expect(result?.sampleSize).toBe(3);
  });

  it('liefert null, wenn der Tag kein Gewicht hat', () => {
    const entries = [entry('2026-07-06', 83), entry('2026-07-07')];
    expect(diffToRollingAverage(entries, '2026-07-07')).toBeNull();
  });

  it('liefert eine Differenz von 0 bei konstantem Gewicht', () => {
    const entries = [entry('2026-07-06', 83), entry('2026-07-07', 83)];
    expect(diffToRollingAverage(entries, '2026-07-07')?.diffKg).toBeCloseTo(0, 5);
  });
});

describe('buildTrendSeries', () => {
  it('füllt fehlende Tage mit null-Werten auf', () => {
    const entries = [entry('2026-07-01', 84), entry('2026-07-03', 83)];
    const series = buildTrendSeries(entries, 3);
    expect(series).toHaveLength(3);
    expect(series[0]?.weightKg).toBe(84);
    expect(series[1]?.weightKg).toBeNull();
    expect(series[2]?.weightKg).toBe(83);
    // Der Durchschnitt läuft trotz Lücke weiter.
    expect(series[2]?.average7).toBeCloseTo(83.5, 5);
  });

  it('liefert eine leere Liste ohne Einträge', () => {
    expect(buildTrendSeries([], 30)).toHaveLength(0);
  });
});
