import type { DailyEntry, IsoDate } from './types';
import { diffToRollingAverage } from './stats';
import { formatKg, formatSignedKg } from './format';

/**
 * Regelbasierte Tagesauswertung – bewusst ohne KI, ohne Diagnosen und ohne
 * Ableitung von Fettzu- oder -abnahme aus einzelnen Gewichtswerten.
 *
 * Sämtliche Formulierungen sind als Möglichkeit („kann“, „könnte“) gehalten.
 */

export type AmpelLevel = 'gut' | 'ok' | 'beobachten';

export interface AmpelPoint {
  level: AmpelLevel;
  text: string;
}

export interface DayEvaluation {
  /** Kurzfazit, maximal zwei Sätze. */
  summary: string;
  /** Tagesampel, maximal drei Punkte. */
  ampel: AmpelPoint[];
  /** Vorsichtige Einordnung möglicher Gewichtseinflüsse (inkl. 7-Tage-Vergleich). */
  weightContext: string[];
  /** Genau ein kleiner Tagesfokus. */
  focus: string;
  /** Abschlussfrage. */
  closingQuestion: string;
}

/** Begriffe, die auf eine salzreiche Mahlzeit am Vortag hindeuten können. */
const SALT_KEYWORDS = [
  'salz',
  'salzig',
  'sojasauce',
  'sojasoße',
  'sushi',
  'pizza',
  'chips',
  'pommes',
  'fertiggericht',
  'tiefkühlpizza',
  'ramen',
  'brühe',
  'bruehe',
  'wurst',
  'salami',
  'schinken',
  'speck',
  'käse',
  'kaese',
  'oliven',
  'gepökelt',
  'gepoekelt',
  'döner',
  'doener',
  'burger',
  'fastfood',
  'fast food',
];

/** Begriffe, die auf eine kohlenhydratreiche Mahlzeit am Vortag hindeuten können. */
const CARB_KEYWORDS = [
  'pasta',
  'nudel',
  'spaghetti',
  'reis',
  'brot',
  'brötchen',
  'broetchen',
  'kartoffel',
  'pizza',
  'kuchen',
  'torte',
  'süß',
  'suess',
  'süßigkeit',
  'schoko',
  'schokolade',
  'eis',
  'cola',
  'limo',
  'limonade',
  'saft',
  'müsli',
  'muesli',
  'pfannkuchen',
  'pancake',
  'croissant',
  'gebäck',
  'gebaeck',
];

const SORENESS_KEYWORDS = ['muskelkater', 'kater in den beinen', 'muskeln schmerzen'];

function containsAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function detectSaltHint(foodText: string | undefined): boolean {
  return !!foodText && containsAny(foodText, SALT_KEYWORDS);
}

export function detectCarbHint(foodText: string | undefined): boolean {
  return !!foodText && containsAny(foodText, CARB_KEYWORDS);
}

export function detectSorenessHint(text: string | undefined): boolean {
  return !!text && containsAny(text, SORENESS_KEYWORDS);
}

function isIntenseTraining(entry: DailyEntry): boolean {
  const intenseTypes: DailyEntry['trainingType'][] = [
    'krafttraining',
    'laufen',
    'tennis',
    'radfahren',
  ];
  return intenseTypes.includes(entry.trainingType) && (entry.trainingMinutes ?? 0) >= 45;
}

function buildAmpel(entry: DailyEntry): AmpelPoint[] {
  const points: AmpelPoint[] = [];

  // Schlaf
  if (typeof entry.sleepHours === 'number') {
    if (entry.sleepHours >= 7) {
      points.push({ level: 'gut', text: 'Schlafdauer im guten Bereich.' });
    } else if (entry.sleepHours >= 6) {
      points.push({
        level: 'ok',
        text: 'Schlaf etwas knapp – heute Abend gern etwas früher zur Ruhe.',
      });
    } else {
      points.push({
        level: 'beobachten',
        text: 'Wenig Schlaf – das kann Hunger und Energie heute beeinflussen.',
      });
    }
  }

  // Bewegung
  if (entry.trainingType !== 'kein_training' && (entry.trainingMinutes ?? 0) > 0) {
    points.push({ level: 'gut', text: 'Du warst aktiv – jede Bewegung zählt.' });
  } else {
    points.push({
      level: 'ok',
      text: 'Heute keine Trainingseinheit – ein Spaziergang wäre eine gute Option.',
    });
  }

  // Energie / Hunger
  if (typeof entry.energy === 'number' && entry.energy <= 2) {
    points.push({
      level: 'beobachten',
      text: 'Energie niedrig – Erholung darf heute Vorrang haben.',
    });
  } else if (typeof entry.hunger === 'number' && entry.hunger >= 4) {
    points.push({
      level: 'beobachten',
      text: 'Hunger deutlich spürbar – sättigende Mahlzeiten mit Eiweiß und Ballaststoffen helfen.',
    });
  } else if (typeof entry.energy === 'number' && entry.energy >= 4) {
    points.push({ level: 'gut', text: 'Gute Energie – ein stabiler Tag.' });
  }

  return points.slice(0, 3);
}

function buildWeightContext(entry: DailyEntry, entries: readonly DailyEntry[]): string[] {
  const context: string[] = [];

  if (typeof entry.weightKg === 'number') {
    const diff = diffToRollingAverage(entries, entry.date);
    if (diff && diff.sampleSize >= 2) {
      const direction =
        Math.abs(diff.diffKg) < 0.05
          ? `Dein Gewicht liegt heute genau auf deinem 7-Tage-Durchschnitt (${formatKg(diff.averageKg)}).`
          : `Dein Gewicht liegt heute ${formatSignedKg(diff.diffKg)} zum 7-Tage-Durchschnitt (${formatKg(diff.averageKg)}).`;
      context.push(direction);
      context.push(
        'Tägliche Schwankungen sind normal und sagen allein nichts über Körperfett aus – aussagekräftig ist der Trend über Wochen.',
      );
    } else {
      context.push(
        'Für einen aussagekräftigen 7-Tage-Durchschnitt brauchst du noch ein paar weitere Gewichtseinträge – einzelne Werte sagen wenig aus.',
      );
    }
  } else {
    context.push('Heute kein Gewichtseintrag – auch ohne Waage zählt der Tag.');
  }

  const saltHint = detectSaltHint(entry.foodYesterday);
  const carbHint = detectCarbHint(entry.foodYesterday);
  if (saltHint && carbHint) {
    context.push(
      'Gestern waren offenbar salz- und kohlenhydratreiche Speisen dabei – das könnte heute vorübergehend etwas Wasser binden.',
    );
  } else if (saltHint) {
    context.push(
      'Gestern war offenbar Salzreiches dabei – das könnte heute vorübergehend etwas Wasser binden.',
    );
  } else if (carbHint) {
    context.push(
      'Gestern waren offenbar Kohlenhydrate reichlich vertreten – gefüllte Kohlenhydratspeicher können kurzfristig etwas Wasser binden.',
    );
  }

  if (
    isIntenseTraining(entry) ||
    detectSorenessHint(entry.note) ||
    detectSorenessHint(entry.foodYesterday)
  ) {
    context.push(
      'Nach intensivem Training oder bei Muskelkater kann der Körper vorübergehend Wasser einlagern – das ist kein Rückschritt.',
    );
  }

  if (typeof entry.sleepHours === 'number' && entry.sleepHours < 6) {
    context.push(
      'Wenig Schlaf kann Hunger, Energie und Regeneration beeinflussen – sei heute nachsichtig mit dir.',
    );
  }

  return context;
}

function buildFocus(entry: DailyEntry): string {
  if (typeof entry.sleepHours === 'number' && entry.sleepHours < 6) {
    return 'Heute Abend 30 Minuten früher ins Bett – Schlaf ist deine wichtigste Stellschraube.';
  }
  if (typeof entry.hunger === 'number' && entry.hunger >= 4) {
    return 'Plane heute eine Mahlzeit mit reichlich Eiweiß und Gemüse – das sättigt lange.';
  }
  if (typeof entry.waterLiters === 'number' && entry.waterLiters < 1.5) {
    return 'Stell dir eine Wasserflasche in Sichtweite und trinke regelmäßig über den Tag.';
  }
  if (entry.trainingType === 'kein_training') {
    return 'Ein Spaziergang von 15–20 Minuten wäre heute ein guter kleiner Schritt.';
  }
  if (typeof entry.energy === 'number' && entry.energy <= 2) {
    return 'Gönn dir heute bewusst eine Pause – Erholung gehört zum Fortschritt dazu.';
  }
  return 'Bleib bei deiner Routine – Kontinuität schlägt Perfektion.';
}

function buildSummary(entry: DailyEntry, ampel: readonly AmpelPoint[]): string {
  const positives = ampel.filter((p) => p.level === 'gut').length;
  const watch = ampel.filter((p) => p.level === 'beobachten').length;
  if (watch === 0 && positives >= 2) {
    return 'Ein runder Tag – vieles läuft in die richtige Richtung. Weiter so, ganz ohne Druck.';
  }
  if (watch >= 2) {
    return 'Heute ist ein guter Tag, um es ruhiger anzugehen. Kleine Schritte reichen völlig.';
  }
  if (entry.trainingType !== 'kein_training') {
    return 'Solide Basis heute, inklusive Bewegung. Ein kleiner Fokus genügt.';
  }
  return 'Ein ganz normaler Tag – kein Grund zur Sorge, ein kleiner Fokus genügt.';
}

const CLOSING_QUESTIONS = [
  'Was würde dir den morgigen Tag ein kleines Stück leichter machen?',
  'Welche Mahlzeit hat dich heute am besten gesättigt?',
  'Worauf freust du dich morgen?',
  'Was hat heute gut funktioniert – auch wenn es klein war?',
  'Wann fühlst du dich tagsüber am energiereichsten?',
];

function pickClosingQuestion(date: IsoDate): string {
  // Deterministisch pro Datum, damit die Frage beim erneuten Öffnen stabil bleibt.
  const seed = date.split('-').reduce((acc, part) => acc + Number(part), 0);
  return CLOSING_QUESTIONS[seed % CLOSING_QUESTIONS.length] ?? CLOSING_QUESTIONS[0]!;
}

/**
 * Erstellt die Tagesauswertung für einen Eintrag.
 * `entries` ist die vollständige Liste (inklusive des Eintrags selbst).
 */
export function evaluateDay(entry: DailyEntry, entries: readonly DailyEntry[]): DayEvaluation {
  const ampel = buildAmpel(entry);
  return {
    summary: buildSummary(entry, ampel),
    ampel,
    weightContext: buildWeightContext(entry, entries),
    focus: buildFocus(entry),
    closingQuestion: pickClosingQuestion(entry.date),
  };
}
