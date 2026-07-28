import { describe, expect, it } from 'vitest';
import { buildExportCsv, buildExportJson, parseImportJson } from './exportImport';
import type { DailyEntry, Profile } from './types';

const profile: Profile = {
  gender: 'maennlich',
  age: 42,
  heightCm: 181,
  startWeightKg: 84.5,
  bodyType: 'mittel',
  bodyFatPercent: 24,
  activityLevel: 'leicht_aktiv',
  trainingFrequency: '1_2_pro_woche',
  habitsNotes: 'Abends oft Heißhunger.',
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z',
};

const entries: DailyEntry[] = [
  {
    date: '2026-07-14',
    weightKg: 84.2,
    waistCm: 96.5,
    sleepHours: 7.5,
    sleepQuality: 4,
    energy: 3,
    hunger: 2,
    mood: 'gut',
    foodYesterday: 'Müsli; Salat, "Pizza"',
    waterLiters: 2,
    trainingType: 'krafttraining',
    trainingMinutes: 50,
    note: 'Guter Tag',
    createdAt: '2026-07-14T08:00:00.000Z',
    updatedAt: '2026-07-14T08:00:00.000Z',
  },
  {
    date: '2026-07-15',
    weightKg: 83.9,
    trainingType: 'kein_training',
    createdAt: '2026-07-15T08:00:00.000Z',
    updatedAt: '2026-07-15T08:00:00.000Z',
  },
];

describe('Export und Import (JSON-Roundtrip)', () => {
  it('exportiert und importiert alle Daten verlustfrei', () => {
    const json = buildExportJson(profile, entries);
    const result = parseImportJson(json);
    expect(result.profile).toEqual(profile);
    expect(result.entries).toEqual(entries);
  });

  it('sortiert Einträge beim Export nach Datum', () => {
    const json = buildExportJson(null, [entries[1]!, entries[0]!]);
    const result = parseImportJson(json);
    expect(result.entries.map((e) => e.date)).toEqual(['2026-07-14', '2026-07-15']);
  });

  it('lehnt fremde JSON-Dateien mit deutscher Fehlermeldung ab', () => {
    expect(() => parseImportJson('{"foo": 1}')).toThrowError(/stammt nicht aus BauchWeg Coach/);
    expect(() => parseImportJson('kein json')).toThrowError(/kein gültiges JSON/);
  });

  it('überspringt ungültige Einträge und dedupliziert Datumsduplikate', () => {
    const json = JSON.stringify({
      app: 'bauchweg-coach',
      schemaVersion: 1,
      profile: null,
      entries: [
        { date: '2026-07-14', weightKg: 84, trainingType: 'laufen' },
        { date: '2026-07-14', weightKg: 99, trainingType: 'laufen' },
        { date: 'ungültig', weightKg: 84 },
        { weightKg: 84 },
        'kein objekt',
      ],
    });
    const result = parseImportJson(json);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.weightKg).toBe(84);
  });

  it('ersetzt unbekannte Trainingstypen durch „kein Training“', () => {
    const json = JSON.stringify({
      app: 'bauchweg-coach',
      entries: [{ date: '2026-07-14', trainingType: 'crossfit' }],
    });
    expect(parseImportJson(json).entries[0]?.trainingType).toBe('kein_training');
  });
});

describe('CSV-Export', () => {
  it('nutzt Semikolon-Trennung und Dezimalkomma (de-DE)', () => {
    const csv = buildExportCsv(entries);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('Datum;Gewicht (kg)');
    expect(lines[1]).toContain('2026-07-14;84,2;96,5;7,5');
    expect(lines[1]).toContain('Krafttraining');
  });

  it('maskiert Freitext mit Semikolons und Anführungszeichen', () => {
    const csv = buildExportCsv([entries[0]!]);
    expect(csv).toContain('"Müsli; Salat, ""Pizza"""');
  });

  it('lässt leere optionale Felder leer', () => {
    const csv = buildExportCsv([entries[1]!]);
    const line = csv.split('\r\n')[1];
    expect(line).toBe('2026-07-15;83,9;;;;;;;;;Kein Training;;');
  });
});
