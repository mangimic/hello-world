/**
 * Eingabevalidierung mit deutschen Fehlermeldungen.
 * Grenzen sind bewusst großzügig – die App bewertet nicht, sie prüft nur Plausibilität.
 */

export interface Range {
  min: number;
  max: number;
  label: string;
  unit: string;
}

export const RANGES = {
  age: { min: 18, max: 100, label: 'Alter', unit: 'Jahre' },
  heightCm: { min: 120, max: 230, label: 'Körpergröße', unit: 'cm' },
  weightKg: { min: 35, max: 300, label: 'Gewicht', unit: 'kg' },
  waistCm: { min: 40, max: 220, label: 'Bauchumfang', unit: 'cm' },
  bodyFatPercent: { min: 3, max: 60, label: 'Körperfettanteil', unit: '%' },
  sleepHours: { min: 0, max: 16, label: 'Schlafdauer', unit: 'Stunden' },
  waterLiters: { min: 0, max: 10, label: 'Wasseraufnahme', unit: 'Liter' },
  trainingMinutes: { min: 0, max: 600, label: 'Trainingsdauer', unit: 'Minuten' },
} as const satisfies Record<string, Range>;

export type RangeKey = keyof typeof RANGES;

/** Prüft einen Zahlenwert gegen einen Bereich. Liefert null (ok) oder eine Fehlermeldung. */
export function validateRange(key: RangeKey, value: number | null): string | null {
  const range = RANGES[key];
  if (value === null || !Number.isFinite(value)) {
    return `Bitte gib eine gültige Zahl für ${range.label} ein.`;
  }
  if (value < range.min || value > range.max) {
    return `${range.label} muss zwischen ${range.min} und ${range.max} ${range.unit} liegen.`;
  }
  return null;
}

/** Wie validateRange, aber leere Eingabe ist erlaubt (optionales Feld). */
export function validateOptionalRange(key: RangeKey, value: number | null): string | null {
  if (value === null) return null;
  return validateRange(key, value);
}
