const numberFormat1 = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateFormatLong = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const dateFormatShort = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
});

const dateFormatFull = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function formatKg(value: number): string {
  return `${numberFormat1.format(value)} kg`;
}

export function formatSignedKg(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${numberFormat1.format(value)} kg`;
}

export function formatCm(value: number): string {
  return `${numberFormat1.format(value)} cm`;
}

export function formatHours(value: number): string {
  return `${numberFormat1.format(value)} h`;
}

export function formatDateLong(iso: string): string {
  return dateFormatLong.format(parseIso(iso));
}

export function formatDateShort(iso: string): string {
  return dateFormatShort.format(parseIso(iso));
}

export function formatDateFull(iso: string): string {
  return dateFormatFull.format(parseIso(iso));
}

/** Zahl im de-DE-Format (Komma) in number umwandeln. Liefert null bei ungültiger Eingabe. */
export function parseGermanNumber(input: string): number | null {
  const normalized = input.trim().replace(/\./g, '').replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
