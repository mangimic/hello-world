# Architektur – BauchWeg Coach

## Überblick

Die App ist eine vollständig lokale PWA ohne Backend. Sie folgt einer klaren
Schichtung:

```
┌─────────────────────────────────────────────┐
│ pages/ + components/   (React-UI, deutsch)  │
│   – rendert, validiert Eingaben, ruft Domain│
├─────────────────────────────────────────────┤
│ hooks/useAppData       (React-Kontext)      │
│   – hält Profil + Einträge im Speicher,     │
│     synchronisiert mit IndexedDB            │
├─────────────────────────────────────────────┤
│ db/database.ts         (idb)                │
│   – CRUD auf IndexedDB, keine Logik         │
├─────────────────────────────────────────────┤
│ domain/                (reine Funktionen)   │
│   – Statistik, Auswertungsregeln, Craving,  │
│     Export/Import, Validierung, Demo-Daten  │
└─────────────────────────────────────────────┘
```

**Grundregel:** UI-Komponenten enthalten keine Auswertungslogik. Alles, was
inhaltliche Aussagen erzeugt (Ampel, Fazit, Einordnung, Fokus), lebt in
`src/domain/` und ist ohne DOM testbar.

## Datenmodell

Gespeichert wird in der IndexedDB `bauchweg-coach` (Version 1) mit zwei Stores:

### Store `profile` (Key `me`)

| Feld                      | Typ                                                          | Herkunft           |
| ------------------------- | ------------------------------------------------------------ | ------------------ |
| `gender`                  | `'weiblich' \| 'maennlich' \| 'divers' \| 'keine_angabe'`    | Onboarding-Frage 1 |
| `age`                     | `number` (Jahre)                                             | Frage 2            |
| `heightCm`                | `number`                                                     | Frage 3            |
| `startWeightKg`           | `number`                                                     | Frage 4            |
| `bodyType`                | `'schlank' \| 'mittel' \| 'kraeftig' \| 'keine_angabe'`      | Frage 5            |
| `bodyFatPercent?`         | `number`                                                     | Frage 5 (optional) |
| `activityLevel`           | `'sitzend' \| 'leicht_aktiv' \| 'aktiv' \| 'sehr_aktiv'`     | Frage 6            |
| `trainingFrequency`       | `'nie' \| 'selten' \| '1_2_pro_woche' \| '3_plus_pro_woche'` | Frage 6            |
| `habitsNotes`             | `string` (Freitext)                                          | Frage 7            |
| `createdAt` / `updatedAt` | ISO-Timestamp                                                | automatisch        |

### Store `entries` (KeyPath `date`, ein Eintrag pro Kalendertag)

| Feld                                  | Typ                                                                                                       | Hinweis                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `date`                                | `YYYY-MM-DD` (lokale Zeitzone)                                                                            | Schlüssel                                   |
| `weightKg?`, `waistCm?`               | `number`                                                                                                  | metrisch                                    |
| `sleepHours?`                         | `number`                                                                                                  |                                             |
| `sleepQuality?`, `energy?`, `hunger?` | `1–5`                                                                                                     |                                             |
| `mood?`                               | `'gut' \| 'neutral' \| 'angespannt' \| 'niedergeschlagen'`                                                | optional                                    |
| `foodYesterday?`                      | `string`                                                                                                  | Freitext, Basis der Schlüsselwort-Erkennung |
| `waterLiters?`                        | `number`                                                                                                  | optional                                    |
| `trainingType`                        | `'kein_training' \| 'krafttraining' \| 'tennis' \| 'laufen' \| 'spaziergang' \| 'radfahren' \| 'anderes'` |                                             |
| `trainingMinutes?`                    | `number`                                                                                                  |                                             |
| `note?`                               | `string`                                                                                                  |                                             |
| `isDemo?`                             | `true`                                                                                                    | kennzeichnet Demo-Daten                     |

Die Theme-Einstellung (hell/dunkel/system) liegt als einzelner Schlüssel im
`localStorage` – sie ist Gerätekonfiguration, kein Gesundheitsdatum.

## Domain-Logik

### Statistik (`domain/stats.ts`)

- `rollingWeightAverage(entries, date)` – Durchschnitt über das Fenster
  `[date−6, date]`, nur Tage mit Gewichtswert zählen.
- `diffToRollingAverage(entries, date)` – Differenz des Tagesgewichts zum
  7-Tage-Durchschnitt inkl. Stichprobengröße (die UI zeigt den Vergleich erst
  ab 2 Werten).
- `buildTrendSeries(entries, days)` – lückenlose Zeitreihe für die Diagramme
  (fehlende Tage = `null`, der Durchschnitt läuft weiter).

### Tagesauswertung (`domain/evaluation.ts`)

`evaluateDay(entry, entries)` liefert ein strukturiertes `DayEvaluation`:

1. **Kurzfazit** (max. 2 Sätze) – abgeleitet aus der Ampelverteilung.
2. **Tagesampel** (max. 3 Punkte, Stufen `gut`/`ok`/`beobachten`) – Schlaf,
   Bewegung, Energie/Hunger. Bewusst keine „rote“ Stufe.
3. **Einordnung** – Gewicht immer relativ zum 7-Tage-Durchschnitt; mögliche
   Einflüsse (Salz/Kohlenhydrate im Freitext, intensives Training/Muskelkater,
   wenig Schlaf) werden nur bei erkannten Auslösern und stets als Möglichkeit
   formuliert („könnte“, „kann“).
4. **Genau ein Tagesfokus** – Prioritätenliste (Schlaf → Hunger → Wasser →
   Bewegung → Erholung → Kontinuität).
5. **Abschlussfrage** – deterministisch pro Datum aus einer kleinen Liste.

Leitplanken (per Unit-Test abgesichert):

- Nie Fettzu-/-abnahme aus einem einzelnen Gewichtswert ableiten.
- Keine Diagnosen, keine Kalorienziele, keine Bestrafung, kein
  Kompensationstraining, kein extremes Fasten.
- Keine wertenden Begriffe („schlecht“, „Cheat Meal“, „versagt“).

### Heißhunger-Hilfe (`domain/craving.ts`)

Statische Zuordnung Auslöser → 2–3 neutrale Optionen. Keine Verbote; die
Formulierungen sind bewusst erlaubend („bewusst gewählte Portion“).

### Export/Import (`domain/exportImport.ts`)

- JSON-Export mit `app`- und `schemaVersion`-Feld für spätere Migrationen.
- Import validiert jedes Feld defensiv (unbekannte Werte → Standard, ungültige
  Einträge werden übersprungen, Datumsduplikate dedupliziert) und wirft bei
  Fremdformaten deutsche Fehlermeldungen.
- CSV-Export: Semikolon-getrennt mit Dezimalkomma (de-DE/Excel-kompatibel).

## PWA

`vite-plugin-pwa` (generateSW) precacht alle Assets; die App startet offline.
Manifest mit maskierbarem Icon, `display: standalone`, Apple-Touch-Icon für iOS.
Routing über `HashRouter`, damit die App auch aus Unterverzeichnissen (z. B.
GitHub Pages) ohne Server-Rewrites funktioniert.

## Erweiterungspunkt: späterer KI-Coach

Die Tagesauswertung ist als austauschbare Strategie geschnitten:

- **Eingabe:** `DailyEntry` + Historie (+ optional `Profile`).
- **Ausgabe:** das strukturierte `DayEvaluation`-Objekt (Fazit, Ampel,
  Einordnung, Fokus, Frage) – die UI (`components/EvaluationCard.tsx`) rendert
  ausschließlich dieses Objekt.

Ein späterer KI-Coach implementiert dieselbe Signatur
`(entry, entries, profile?) => DayEvaluation` (z. B. als
`evaluateDayWithModel()` neben `evaluateDay()`), etwa mit einem lokalen Modell
oder einer vom Nutzer explizit aktivierten API. Empfehlenswert:

1. Interface `DayEvaluator` in `domain/` definieren, Regel-Implementierung als
   Default.
2. KI-Ausgaben gegen dieselben Leitplanken-Tests laufen lassen (verbotene
   Begriffe, max. Längen), bevor sie angezeigt werden – die bestehenden
   Testlisten in `evaluation.test.ts` sind dafür der Ausgangspunkt.
3. Datenschutz beibehalten: Standard bleibt lokal/regelbasiert; jede
   Datenübertragung wäre opt-in und transparent.

## Tests

- `domain/*.test.ts` – 7-Tage-Durchschnitt, Differenz zum Durchschnitt,
  Auswertungsregeln inkl. Ton-Leitplanken, Heißhunger-Optionen,
  Export/Import-Roundtrip und CSV-Format.
- `pages/CoachPage.test.tsx` – React Testing Library (Rendering + Interaktion).
- `e2e/journey.spec.ts` – Playwright (iPhone-Viewport): Onboarding abschließen →
  Tageswert eintragen → Auswertung sehen → Verlauf öffnen.
