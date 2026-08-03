import { describe, expect, it } from 'vitest';
import { CRAVING_TRIGGER_LABELS, getCravingOptions, type CravingTrigger } from './craving';

const ALL_TRIGGERS = Object.keys(CRAVING_TRIGGER_LABELS) as CravingTrigger[];

const FORBIDDEN_TERMS = ['schlecht', 'cheat', 'versagt', 'verboten', 'sünde', 'darfst nicht'];

describe('getCravingOptions', () => {
  it('liefert für jeden Auslöser 2 bis 3 Optionen', () => {
    for (const trigger of ALL_TRIGGERS) {
      const options = getCravingOptions(trigger);
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(options.length).toBeLessThanOrEqual(3);
    }
  });

  it('enthält keine Verbote und keine wertenden Begriffe', () => {
    for (const trigger of ALL_TRIGGERS) {
      for (const option of getCravingOptions(trigger)) {
        const text = `${option.title} ${option.detail}`.toLowerCase();
        for (const term of FORBIDDEN_TERMS) {
          expect(text).not.toContain(term);
        }
      }
    }
  });

  it('bietet bei Lust auf etwas Bestimmtes eine bewusste Portion an', () => {
    const options = getCravingOptions('lust');
    expect(options.some((o) => `${o.title} ${o.detail}`.toLowerCase().includes('bewusst'))).toBe(
      true,
    );
  });

  it('empfiehlt bei echtem Hunger eine eiweiß- und ballaststoffreiche Mahlzeit', () => {
    const options = getCravingOptions('hunger');
    const combined = options.map((o) => `${o.title} ${o.detail}`.toLowerCase()).join(' ');
    expect(combined).toContain('eiweiß');
    expect(combined).toContain('ballaststoff');
  });

  it('priorisiert bei Müdigkeit Erholung', () => {
    const options = getCravingOptions('muedigkeit');
    const combined = options.map((o) => `${o.title} ${o.detail}`.toLowerCase()).join(' ');
    expect(combined).toMatch(/erholung|schlafen|pause/);
  });
});
