/**
 * Heißhunger-Hilfe: neutrale, nicht wertende Optionen je nach Auslöser.
 * Bewusst ohne Verbote und ohne Begriffe wie „schlecht“ oder „Cheat Meal“.
 */

export type CravingTrigger = 'hunger' | 'stress' | 'muedigkeit' | 'gewohnheit' | 'lust' | 'unklar';

export interface CravingOption {
  title: string;
  detail: string;
}

export const CRAVING_TRIGGER_LABELS: Record<CravingTrigger, string> = {
  hunger: 'Echter körperlicher Hunger',
  stress: 'Stress',
  muedigkeit: 'Müdigkeit',
  gewohnheit: 'Gewohnheit',
  lust: 'Lust auf etwas Bestimmtes',
  unklar: 'Weiß ich nicht',
};

const OPTIONS: Record<CravingTrigger, CravingOption[]> = {
  hunger: [
    {
      title: 'Eine richtige Mahlzeit',
      detail:
        'Eiweiß- und ballaststoffreich essen, zum Beispiel Quark mit Obst oder ein Vollkornbrot mit Ei – das sättigt zuverlässig.',
    },
    {
      title: 'Erst trinken, kurz prüfen',
      detail:
        'Ein großes Glas Wasser trinken und zehn Minuten warten – echter Hunger bleibt, dann iss in Ruhe.',
    },
  ],
  stress: [
    {
      title: 'Kurz rausgehen',
      detail:
        'Den Raum wechseln oder ein paar Minuten spazieren – Abstand hilft oft mehr als Essen.',
    },
    {
      title: 'Drei tiefe Atemzüge',
      detail: 'Kurz innehalten und bewusst atmen. Danach entscheiden, was du wirklich brauchst.',
    },
    {
      title: 'Bewusste Portion',
      detail:
        'Wenn du essen möchtest: eine bewusst gewählte Portion auf einen Teller geben und ohne Nebenbei-Bildschirm genießen.',
    },
  ],
  muedigkeit: [
    {
      title: 'Erholung zuerst',
      detail:
        'Wenn möglich: eine kurze Pause oder früher schlafen – Müdigkeit fühlt sich oft wie Hunger an.',
    },
    {
      title: 'Trinken und zehn Minuten warten',
      detail: 'Erst ein Glas Wasser oder Tee, dann neu entscheiden.',
    },
  ],
  gewohnheit: [
    {
      title: 'Kurz den Ort wechseln',
      detail:
        'Gewohnheiten hängen oft am Ort – ein kurzer Raumwechsel oder Spaziergang unterbricht das Muster.',
    },
    {
      title: 'Zehn Minuten warten',
      detail: 'Erst trinken und zehn Minuten etwas anderes tun. Danach darfst du frei entscheiden.',
    },
  ],
  lust: [
    {
      title: 'Bewusst genießen',
      detail:
        'Eine bewusst gewählte Portion des gewünschten Lebensmittels – auf einen Teller, in Ruhe, mit Genuss.',
    },
    {
      title: 'Sättigende Basis zuerst',
      detail:
        'Erst eine kleine eiweißreiche Grundlage essen, dann schauen, wie groß die Lust noch ist.',
    },
  ],
  unklar: [
    {
      title: 'Trinken und zehn Minuten warten',
      detail: 'Ein großes Glas Wasser und ein kurzer Moment Abstand bringen oft Klarheit.',
    },
    {
      title: 'Kurz bewegen',
      detail:
        'Den Raum wechseln oder ein paar Schritte gehen – danach neu spüren, was du brauchst.',
    },
    {
      title: 'Eine echte Mahlzeit',
      detail:
        'Wenn die letzte Mahlzeit lange her ist: etwas Sättigendes mit Eiweiß und Ballaststoffen essen.',
    },
  ],
};

/** Liefert 2–3 neutrale Optionen für den gewählten Auslöser. */
export function getCravingOptions(trigger: CravingTrigger): CravingOption[] {
  return OPTIONS[trigger];
}
