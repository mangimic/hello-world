/** ISO-Datum im Format YYYY-MM-DD (lokale Zeitzone). */
export type IsoDate = string;

export type Gender = 'weiblich' | 'maennlich' | 'divers' | 'keine_angabe';

export type BodyType = 'schlank' | 'mittel' | 'kraeftig' | 'keine_angabe';

export type ActivityLevel = 'sitzend' | 'leicht_aktiv' | 'aktiv' | 'sehr_aktiv';

export type TrainingFrequency = 'nie' | 'selten' | '1_2_pro_woche' | '3_plus_pro_woche';

export type TrainingType =
  'kein_training' | 'krafttraining' | 'tennis' | 'laufen' | 'spaziergang' | 'radfahren' | 'anderes';

export type Scale1to5 = 1 | 2 | 3 | 4 | 5;

export type Mood = 'gut' | 'neutral' | 'angespannt' | 'niedergeschlagen';

export interface Profile {
  /** Frage 1 – optional bzw. „keine Angabe“. */
  gender: Gender;
  /** Frage 2 – Alter in Jahren. */
  age: number;
  /** Frage 3 – Körpergröße in cm. */
  heightCm: number;
  /** Frage 4 – Gewicht in kg beim Onboarding. */
  startWeightKg: number;
  /** Frage 5 – Statur oder optional geschätzter Körperfettanteil. */
  bodyType: BodyType;
  bodyFatPercent?: number;
  /** Frage 6 – Alltagsbewegung und regelmäßiges Training. */
  activityLevel: ActivityLevel;
  trainingFrequency: TrainingFrequency;
  /** Frage 7 – Ernährung, Schlaf und typische Schwierigkeiten (Freitext). */
  habitsNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyEntry {
  /** Schlüssel: ein Eintrag pro Kalendertag. */
  date: IsoDate;
  weightKg?: number;
  waistCm?: number;
  sleepHours?: number;
  sleepQuality?: Scale1to5;
  energy?: Scale1to5;
  hunger?: Scale1to5;
  mood?: Mood;
  /** Essen und Getränke vom Vortag als Freitext. */
  foodYesterday?: string;
  waterLiters?: number;
  trainingType: TrainingType;
  trainingMinutes?: number;
  note?: string;
  /** Kennzeichnet automatisch erzeugte Demo-Einträge. */
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: 'system' | 'hell' | 'dunkel';
  onboardingCompleted: boolean;
}

export const TRAINING_LABELS: Record<TrainingType, string> = {
  kein_training: 'Kein Training',
  krafttraining: 'Krafttraining',
  tennis: 'Tennis',
  laufen: 'Laufen',
  spaziergang: 'Spaziergang',
  radfahren: 'Radfahren',
  anderes: 'Anderes',
};

export const GENDER_LABELS: Record<Gender, string> = {
  weiblich: 'Weiblich',
  maennlich: 'Männlich',
  divers: 'Divers',
  keine_angabe: 'Keine Angabe',
};

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  schlank: 'Eher schlank',
  mittel: 'Mittel',
  kraeftig: 'Eher kräftig',
  keine_angabe: 'Keine Angabe',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sitzend: 'Überwiegend sitzend',
  leicht_aktiv: 'Leicht aktiv (regelmäßige Wege zu Fuß)',
  aktiv: 'Aktiv (viel Bewegung im Alltag)',
  sehr_aktiv: 'Sehr aktiv (körperliche Arbeit oder viel Sport)',
};

export const TRAINING_FREQUENCY_LABELS: Record<TrainingFrequency, string> = {
  nie: 'Zurzeit kein Training',
  selten: 'Unregelmäßig',
  '1_2_pro_woche': '1–2× pro Woche',
  '3_plus_pro_woche': '3× pro Woche oder öfter',
};

export const MOOD_LABELS: Record<Mood, string> = {
  gut: 'Gut',
  neutral: 'Neutral',
  angespannt: 'Angespannt',
  niedergeschlagen: 'Niedergeschlagen',
};
