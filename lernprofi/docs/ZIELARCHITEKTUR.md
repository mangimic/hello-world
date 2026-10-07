# Zielarchitektur-Prüfung: Lernprofi auf dem mangieriERP-Stack (Phase 0)

Stand: 07.10.2026 · Basis: Architektur-Prompt „Lern-App auf den Tech-Stack von
mangieriERP bringen“ + Bestandsaufnahme v1.85.0. **Noch kein Code verändert.**

## 1. Gesamturteil

**Ja, die Architektur ist anwendbar – als Neubau mit Parallelbetrieb, nicht als
Umbau in der bestehenden Datei.** Die heutige App ist fachlich reich (3 Fächer,
~40 Features, 453 Regression-Checks), aber technisch ein Monolith ohne Module.
Ein „Umbau in place“ würde Monate dauern und Felix' tägliche Nutzung gefährden.
Der im Prompt vorgesehene Weg (Gerüst → Tresor → Logik → UI → Datenübernahme →
Parallelbetrieb → Umstellung) passt genau – mit den unten genannten Anpassungen.

**Größter Gewinn**: Geräte-Sync des Lernstands (verschlüsselt), Wartbarkeit
(Module + Unit-Tests), gleiche Denkwelt wie mangieriERP.
**Größtes Risiko**: Funktionsparität – die 453 Checks beschreiben echtes
Kind-Verhalten; jedes verlorene Detail (Fokus-Modus, Anti-Schummel, Münz-Logik)
fällt sofort auf. **Größter Aufwand**: Etappen 3+4 (Logik + ~40 Ansichten).

## 2. Abbildung Ist → Ziel je Baustein

| Baustein | Ist (v1.85) | Ziel | Bewertung |
|---|---|---|---|
| UI | Vanilla JS, 1 Datei, imperative Renderer je Screen | React 19, `src/features/*`, `useApp()` | ✅ machbar; die Screens sind bereits funktional gekapselt (ein Renderer je Sektion) – gute Schnittvorlage |
| Build | keiner | Vite 8, ESM | ✅ unkritisch |
| Lint/Unit | keine | oxlint + Vitest | ✅ Gewinn; Baseline ab Tag 1 = 0 |
| Fachlogik | mit DOM/`Date.now()`/`Math.random()` verwoben | reine Module `src/calc/*` (Seed/`heute` als Parameter) | ⚠️ größter Portierungsposten: Aufgabenpools (~1.500 Items) sind leicht zu übernehmen, die Regel-Engines (Stufen, Runden, Münzen, Missionen, Lernspur, Treppe, Anti-Schummel, Lese-Check) müssen entwoben werden |
| Regression | 2.400 Zeilen Playwright, 453 Checks, echte Flows | `test/regression.mjs` (statisch) + Playwright-Smoke (3 Viewports) | ⚠️ Vorschlag: **dreistufig** – Vitest (calc), statische Regression (Versionsblöcke), Playwright-Smoke. Die bestehenden 453 Checks dienen als Anforderungskatalog und Abnahme-Checkliste je Etappe |
| Daten | `localStorage` `lernapp_v1`, defensive `load()` | 1 JSON-Dokument + Schemaversion + `migrateData.js`, Tresor (AES-256-GCM, PBKDF2) in IndexedDB | ✅ Datenmodell passt fast 1:1; `load()` ist der Vorläufer von `migrateData` |
| Sync | keiner | Pages Functions + KV, Revisionen, 409-Konflikt | ✅ echter Mehrwert (Handy + iPad + Familien-PC) |
| Zugang | keiner | Cloudflare Access + Tresor; Kind-Zugang Variante (a)/(b) | ⚠️ Entscheidung nötig (siehe §5); offline-first muss erhalten bleiben |
| Hosting | GitHub Pages (Monorepo) | Cloudflare Pages, eigenes Projekt | ✅ sauberer; empfohlen: **eigenes Repository** für den Neubau |
| PWA/Offline | SW cache-first, voll offline | PWA, Manifest, Tokens hell/dunkel | ✅ gleichwertig machbar; Access-Cookie-Ablauf darf Offline-Lernen nicht blockieren (App startet lokal, Sync erst bei Netz) |
| KI | keine | optional, mit Eltern-Freigabe, Deckel, Protokoll | ✅ sinnvoll als Etappe 7 (z. B. Freitext-Feedback Aufsatz); App bleibt ohne KI voll nutzbar |
| Artifact/ZIP-Kanal | Single-File-Build für claude.ai + ZIP | – | ⚠️ entfällt für den Neubau (React-Build ist nicht mehr 1 Datei); Alt-App bleibt als Artifact bestehen |

## 3. Besondere Konfliktpunkte (vorab klären)

1. **Lernprofi-Stimme vs. CSP/Hosting**
   - CSP `connect-src 'self'` verbietet den heutigen Modell-Download von huggingface.co → Modell **selbst ausliefern**.
   - Aber: Cloudflare Pages hat ein **25-MiB-Limit pro Datei**, das Stimmmodell hat ~30 MB → Modell **in 2 Teile zerlegen** (beim Laden zusammensetzen) oder über **R2** (ein weiterer Baustein) ausliefern. Entscheidung nötig.
   - `script-src 'wasm-unsafe-eval' blob:` ist im Prompt bereits vorgesehen – reicht für ONNX-Runtime.
2. **Offline vs. Access**: Cloudflare Access schützt die Domain – nach Cookie-Ablauf wäre die App ohne Netz nicht neu installierbar, aber eine installierte PWA startet aus dem Cache. Muss im Parallelbetrieb ausdrücklich getestet werden (Flugmodus-Test).
3. **Export aus der Alt-App fehlt**: Für Etappe 5 (Datenübernahme) braucht die Alt-App einen **Lernstand-Export-Knopf** (JSON) im Elternbereich. → Kleines Alt-App-Release vorab (v1.86), bewusst die einzige Codeänderung vor der Freigabe.
4. **Monorepo**: `hello-world` enthält mehrere Apps; GitHub-Pages-Workflow deployt das Repo-Root. Empfehlung: Neubau in **eigenem Repo** (`lernprofi-neu` o. ä.) mit eigenem Cloudflare-Projekt; Alt-App bleibt unangetastet bis zur Umstellung.
5. **Ein-Kind-App vs. Profile**: Das Datenmodell kennt heute genau ein Kind. Variante (b) (Kind-PIN/Eltern-Passwort) passt gut zum bestehenden Elternbereich-Gedanken.

## 4. Datenmigration (Ist → Tresor)

1. Alt-App v1.86: Elternbereich-Knopf „Lernstand sichern“ → Datei `lernprofi-lernstand.json` (kompletter `store` + `APP_VERSION` + Datum).
2. Neubau: `src/calc/importAltdaten.js` (rein, getestet) bildet `lernapp_v1` auf das neue Schema ab: Stufen-Fortschritt, Münzen, Lerntage/Lernspur, Mut-Satz, Rekorde, Einstellungen. **Nichts geht verloren** (Prompt-Regel) – Prüfbericht zeigt je Feld „übernommen/ignoriert, Grund“.
3. OPFS-Stimmmodell wird nicht migriert, sondern im Neubau neu geladen (eigene Auslieferung, §3.1).
4. Abnahme: Migrationstest mit echtem (anonymisiertem) Export-Fixture; Parallelbetrieb vergleicht Münzen/Stufen wöchentlich.

## 5. Etappenplan mit Aufwand und Risiken

| Etappe | Inhalt | Aufwand* | Risiko |
|---|---|---|---|
| 0.5 | Alt-App: Export-Knopf (v1.86) | S | gering |
| 1 | Gerüst: Vite+React, oxlint, Vitest, regression.mjs, Tokens, App-Shell, Release-Notes, Smoke | M | gering |
| 2 | Tresor: crypto, vault, IndexedDB, Sperrbildschirm, Profile Kind/Eltern, Export/Import, migrateData | M | mittel (Krypto sorgfältig testen) |
| 3 | Fachlogik nach `src/calc/*`: Pools (Deutsch/Mathe/Sachkunde/Stark/Gespräche), Runden/Stufen/Münzen/Missionen/Lernspur/Treppe/Tests/Anti-Schummel | **L–XL** | hoch (Funktionsparität; 453-Checks-Katalog als Abnahme) |
| 4 | UI nach `src/features/*`: ~40 Ansichten, Fokus-Modus, Elternbereich, Vorlesen/Karaoke, hell/dunkel | **XL** | hoch (Kind merkt jede Abweichung) |
| 5 | Datenübernahme (Import + Bericht) | S–M | mittel |
| 6 | Betrieb: Cloudflare Pages+KV+Access, vaultApi, Header, version.json, Doku | M | mittel (Modell-Auslieferung §3.1) |
| 7 | KI-Funktionen (optional, mit Freigabe/Deckel/Protokoll) | M | gering (abschaltbar) |
| 8 | Parallelbetrieb (≥ 1 Woche), Lernstand-Abgleich, Umstellung | S | gering |

\* S < 1 Session · M = 1–2 Sessions · L = 3–5 · XL = 5+ Sessions. Etappen 3+4
sind zusammen der halbe Gesamtaufwand; sie lassen sich **fachweise schneiden**
(erst Mathe/Sachkunde – generische MC-Renderer, dann Deutsch – viele
Spezial-Übungen, dann Spiele/Mindset/TTS).

**Alternative „Light“ (falls der Vollausbau zu groß ist):** gleiches Gerüst
(Vite, React, oxlint, Vitest, calc/features-Schnitt, Tokens, Tresor lokal),
aber weiter GitHub Pages und **ohne** Cloudflare Functions/KV/Access – Sync
später als Etappe nachrüstbar. Spart §3.1/3.2/3.4 und laufende
Cloud-Konfiguration; verzichtet zunächst auf Geräte-Sync.

## 6. Offene Fragen (bitte entscheiden)

1. **Geräte**: Auf welchen Geräten lernt Felix heute (Handy? iPad? Familien-PC)? iPad als Hauptgerät wie im Prompt?
2. **Zugang**: Variante (a) „Eltern entsperren je Gerät, PIN-Sperre“ oder (b) „Profile: Kind-PIN / Eltern-Passwort“? (Empfehlung: **b** – passt zum bestehenden Elternbereich.)
3. **Cloudflare**: Welche Eltern-E-Mails für Access? Gibt es schon das Cloudflare-Konto/Zone von mangieriERP mitzunutzen? R2 verfügbar (für das 30-MB-Stimmmodell), oder Modell in Teilen über Pages?
4. **Repo**: Neues eigenes Repository für den Neubau (Empfehlung: ja) – Name?
5. **Umfang**: Vollausbau (mit Sync) oder zuerst Alternative „Light“?
6. **KI**: Ja/nein, und wenn ja mit welchem monatlichen Kostendeckel? (Vorschlag Start: nur „Freitext-Feedback Aufsatz“ + „Wochenbericht“, Deckel 5 €/Monat.)
7. **Daten**: Alles übernehmen (Empfehlung) oder etwas bewusst zurücklassen (z. B. abgelaufene Sommer-Reise)?
8. **Gemeinsame Bausteine** mit mangieriERP (crypto, vault, Tokens, Smoke-Gerüst): kopieren (einfach, empfohlen für den Start) oder gemeinsames Paket (sauber, mehr Pflege)?
9. **Klassenstufe**: Felix ist jetzt in Klasse 4 – soll der Neubau die Stufen „Wiederholung (Kl. 3)“ / „Klasse 4“ nennen und Klasse 4 als Standard setzen?
