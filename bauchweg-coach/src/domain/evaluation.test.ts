import { describe, expect, it } from 'vitest';
import { detectCarbHint, detectSaltHint, evaluateDay } from './evaluation';
import type { DailyEntry } from './types';

function entry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  return {
    date: '2026-07-15',
    trainingType: 'kein_training',
    createdAt: '2026-07-15T08:00:00.000Z',
    updatedAt: '2026-07-15T08:00:00.000Z',
    ...overrides,
  };
}

/** Begriffe, die in keiner Auswertung vorkommen dürfen. */
const FORBIDDEN_TERMS = [
  'diagnose',
  'fett zugenommen',
  'fett verloren',
  'fettzunahme',
  'fettverlust',
  'schlecht',
  'cheat',
  'versagt',
  'bestrafung',
  'fasten',
];

function allText(entryToTest: DailyEntry, history: DailyEntry[]): string {
  const evaluation = evaluateDay(entryToTest, history);
  return [
    evaluation.summary,
    ...evaluation.ampel.map((p) => p.text),
    ...evaluation.weightContext,
    evaluation.focus,
    evaluation.closingQuestion,
  ]
    .join(' ')
    .toLowerCase();
}

describe('Schlüsselwort-Erkennung', () => {
  it('erkennt salzige Speisen', () => {
    expect(detectSaltHint('Abends Pizza mit Salami')).toBe(true);
    expect(detectSaltHint('Sushi mit Sojasauce')).toBe(true);
  });

  it('erkennt kohlenhydratreiche Speisen', () => {
    expect(detectCarbHint('Große Portion Pasta')).toBe(true);
    expect(detectCarbHint('Kuchen am Nachmittag')).toBe(true);
  });

  it('meldet nichts bei neutralem Text', () => {
    expect(detectSaltHint('Salat mit Hähnchen und Gurke')).toBe(false);
    expect(detectCarbHint('Quark mit Beeren')).toBe(false);
    expect(detectSaltHint(undefined)).toBe(false);
  });
});

describe('evaluateDay – Gewichtseinordnung', () => {
  it('leitet aus einem einzelnen Gewichtssprung keine Fettzunahme ab', () => {
    const history = [
      entry({ date: '2026-07-14', weightKg: 83 }),
      entry({ date: '2026-07-15', weightKg: 84.2 }),
    ];
    const text = allText(history[1]!, history);
    expect(text).not.toContain('fett zugenommen');
    expect(text).not.toContain('fettzunahme');
    expect(text).toContain('7-tage-durchschnitt');
    expect(text).toContain('schwankungen sind normal');
  });

  it('stellt das Gewicht relativ zum 7-Tage-Durchschnitt dar', () => {
    const history = [
      entry({ date: '2026-07-13', weightKg: 84 }),
      entry({ date: '2026-07-14', weightKg: 83 }),
      entry({ date: '2026-07-15', weightKg: 85 }),
    ];
    const evaluation = evaluateDay(history[2]!, history);
    // Durchschnitt = 84, Differenz = +1,0 kg
    expect(evaluation.weightContext.join(' ')).toContain('+1,0 kg');
    expect(evaluation.weightContext.join(' ')).toContain('84,0 kg');
  });

  it('nennt Wassereinfluss nur bei passenden Begriffen im Freitext', () => {
    const neutral = entry({ weightKg: 84, foodYesterday: 'Salat mit Hähnchen' });
    expect(allText(neutral, [neutral])).not.toContain('wasser bind');

    const salty = entry({ weightKg: 84, foodYesterday: 'Pizza und Chips' });
    const saltyText = allText(salty, [salty]);
    expect(saltyText).toContain('könnte');
    expect(saltyText).toContain('wasser bind');
  });

  it('formuliert Wassereinfluss als Möglichkeit, nicht als Tatsache', () => {
    const salty = entry({ weightKg: 84, foodYesterday: 'Sehr salzig gegessen' });
    const evaluation = evaluateDay(salty, [salty]);
    const hint = evaluation.weightContext.find((c) => c.includes('Wasser'));
    expect(hint).toBeDefined();
    expect(hint).toMatch(/könnte|kann|möglich/i);
  });

  it('erwähnt Wassereinlagerung nach intensivem Training als Möglichkeit', () => {
    const training = entry({ weightKg: 84, trainingType: 'krafttraining', trainingMinutes: 60 });
    expect(allText(training, [training])).toContain('vorübergehend wasser einlagern');
  });

  it('erwähnt keine Trainings-Wassereinlagerung bei kurzem Spaziergang', () => {
    const walk = entry({ weightKg: 84, trainingType: 'spaziergang', trainingMinutes: 20 });
    expect(allText(walk, [walk])).not.toContain('wasser einlagern');
  });

  it('nennt wenig Schlaf als möglichen Einfluss auf Hunger und Energie', () => {
    const tired = entry({ weightKg: 84, sleepHours: 5 });
    const text = allText(tired, [tired]);
    expect(text).toContain('schlaf');
    expect(text).toContain('hunger');
  });
});

describe('evaluateDay – Format und Ton', () => {
  it('liefert maximal zwei Sätze im Kurzfazit', () => {
    const e = entry({ weightKg: 84, sleepHours: 7, energy: 4 });
    const evaluation = evaluateDay(e, [e]);
    const sentences = evaluation.summary.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });

  it('liefert maximal drei Ampelpunkte und genau einen Fokus', () => {
    const e = entry({
      weightKg: 84,
      sleepHours: 5,
      energy: 1,
      hunger: 5,
      trainingType: 'laufen',
      trainingMinutes: 60,
    });
    const evaluation = evaluateDay(e, [e]);
    expect(evaluation.ampel.length).toBeLessThanOrEqual(3);
    expect(evaluation.ampel.length).toBeGreaterThan(0);
    expect(typeof evaluation.focus).toBe('string');
    expect(evaluation.focus.length).toBeGreaterThan(0);
    expect(evaluation.closingQuestion).toMatch(/\?$/);
  });

  it('verwendet keine wertenden oder medizinischen Begriffe', () => {
    const variants: DailyEntry[] = [
      entry({
        weightKg: 90,
        sleepHours: 4,
        hunger: 5,
        energy: 1,
        foodYesterday: 'Pizza, Chips, Cola',
      }),
      entry({ weightKg: 70, sleepHours: 9, hunger: 1, energy: 5 }),
      entry({}),
    ];
    for (const v of variants) {
      const text = allText(v, [v]);
      for (const term of FORBIDDEN_TERMS) {
        expect(text).not.toContain(term);
      }
    }
  });

  it('funktioniert auch ganz ohne Messwerte', () => {
    const empty = entry({});
    const evaluation = evaluateDay(empty, [empty]);
    expect(evaluation.summary.length).toBeGreaterThan(0);
    expect(evaluation.weightContext.join(' ')).toContain('kein Gewichtseintrag');
  });

  it('liefert eine stabile Abschlussfrage pro Datum', () => {
    const e = entry({ weightKg: 84 });
    const first = evaluateDay(e, [e]).closingQuestion;
    const second = evaluateDay(e, [e]).closingQuestion;
    expect(first).toBe(second);
  });
});
