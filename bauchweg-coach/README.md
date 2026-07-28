# BauchWeg Coach

Eine mobile-first Progressive Web App, die Erwachsene dabei unterstützt, Körperfett
langfristig zu reduzieren – mit Blick auf Muskelmasse, Gesundheit und sportliche
Leistungsfähigkeit. Die App fördert tägliche Selbstreflexion ohne Schuldgefühle,
starre Verbote oder übertriebene Aussagen aufgrund einzelner Gewichtswerte.

**Kein medizinisches Produkt. Die App stellt keine Diagnosen und ersetzt keine
medizinische Beratung.**

## Datenschutz

- Vollständig lokal und offline nutzbar (PWA mit Service Worker)
- Keine Registrierung, kein Backend, keine Cookies, keine Analytics
- Alle Daten bleiben in der IndexedDB des Geräts
- Export/Import jederzeit als JSON, Export zusätzlich als CSV

## Stack

React · TypeScript (strict) · Vite · Tailwind CSS 4 · idb (IndexedDB) · Recharts ·
Vitest · React Testing Library · Playwright · vite-plugin-pwa · ESLint · Prettier

## Installation

```bash
cd bauchweg-coach
npm install
```

## Entwicklung

```bash
npm run dev          # Dev-Server (http://localhost:5173)
```

## Tests

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm test             # Unit-Tests (Vitest + React Testing Library)
npm run test:e2e     # End-to-End (Playwright, baut auf `npm run build` auf)
```

Hinweis: `npm run test:e2e` startet automatisch `vite preview` auf Port 4173 –
vorher einmal `npm run build` ausführen. In der Remote-Umgebung wird das
vorinstallierte Chromium unter `/opt/pw-browsers/chromium` verwendet (siehe
`playwright.config.ts`); lokal genügt `npx playwright install chromium`.

## Build

```bash
npm run build        # Production-Build inkl. Service Worker nach dist/
npm run preview      # Production-Build lokal testen
```

Die App-Icons werden aus `public/icons/icon.svg` generiert:
`node tools/generate-icons.mjs`.

## Funktionen

- **Onboarding** – sieben Fragen, eine pro Schritt, mit Fortschrittsanzeige;
  alle Angaben später im Profil bearbeitbar
- **Heute** – täglicher Check-in (Gewicht, Bauchumfang, Schlaf, Energie, Hunger,
  Stimmung, Essen vom Vortag, Wasser, Training, Notiz); Einträge speichern,
  bearbeiten (über die Datumsauswahl) und löschen
- **Tagesauswertung** – transparente, regelbasierte Auswertung: Kurzfazit,
  Tagesampel, vorsichtige Einordnung möglicher Gewichtseinflüsse (immer relativ
  zum 7-Tage-Durchschnitt), genau ein Tagesfokus und eine Abschlussfrage
- **Coach** – Heißhunger-Hilfe: Auslöser wählen, 2–3 neutrale Optionen erhalten
- **Verlauf** – Gewicht mit 7-Tage-Durchschnitt, Bauchumfang, Schlaf, Energie und
  Training; Filter für 7/30/90 Tage; Diagramme auch ohne Farbwahrnehmung lesbar
  (Linienstile, Legenden, Symbole)
- **Profil & Daten** – Angaben bearbeiten, JSON/CSV-Export, JSON-Import,
  Demo-Daten (30 Tage, klar gekennzeichnet), alles löschen mit Bestätigung,
  Hell-/Dunkelmodus

## Architektur

Kurzfassung – Details in [ARCHITECTURE.md](./ARCHITECTURE.md):

```
src/
  domain/      Reine, gut getestete Logik (Auswertung, Statistik, Export …)
  db/          IndexedDB-Zugriff über idb
  hooks/       React-Kontext für Daten, Theme
  components/  Wiederverwendbare UI-Bausteine
  pages/       Die vier Bereiche + Onboarding
```

Die UI enthält bewusst keine Auswertungslogik – sämtliche Regeln liegen in
`src/domain/` und sind per Unit-Test abgesichert.
