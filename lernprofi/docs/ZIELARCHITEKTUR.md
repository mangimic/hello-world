# Zielarchitektur-Prüfung: Lernprofi auf dem mangieriERP-Stack (Phase 0)

Stand: 07.10.2026 · Basis: Architektur-Prompt „Lern-App auf den Tech-Stack von
mangieriERP bringen“ + Bestandsaufnahme v1.85.0. **Noch kein Code verändert.**

## 0. Bereits getroffene Entscheidungen (07.10.2026)

1. **Vorlesefunktion wird NICHT übernommen.** Weder die eingebettete
   Lernprofi-Stimme (Piper/VITS, 39 MB Engine + 30-MB-Modell) noch das
   System-Vorlesen mit Karaoke wandern in den Neubau. Damit entfallen:
   der größte CSP-/Hosting-Konflikt (§3.1 alt), die 25-MiB-Frage, OPFS,
   `wasm-unsafe-eval`, der Eltern-Tab „Vorlesen“ und das „Anhören“ im
   Lese-Check (dort bleibt nur Lesen + Lücken-Frage). Falls später doch
   gewünscht, ist die System-Sprachausgabe (Web Speech API) jederzeit
   günstig nachrüstbar – ohne eigene Modelle.
2. **Hauptgerät: iPad.** UI wird iPad-zuerst gebaut (Viewports 820×1180 /
   1180×820), iPhone 390×844 als Zweitformat – wie im Prompt vorgesehen.
3. **Zugang: Felix entsperrt selbständig** → Variante (b): Das Kind
   entsperrt den Lernbereich mit einer eigenen, kurzen **Lern-PIN**;
   der Elternbereich (Einstellungen, Berichte, Export) liegt zusätzlich
   hinter dem **Eltern-Passwort** (Tresor-Passwort). Technisch: Der
   Tresor-Schlüssel wird einmalig von den Eltern pro Gerät abgeleitet und
   nicht exportierbar in IndexedDB abgelegt; die Kinder-PIN gibt ihn frei.

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

1. ~~Lernprofi-Stimme vs. CSP/Hosting~~ **Erledigt durch Entscheidung §0.1:
   Die Vorlesefunktion wird nicht übernommen.** Kein Modell-Hosting, kein
   `wasm-unsafe-eval`, CSP kann strikt bleiben (`default-src 'self'`).
2. **Offline vs. Access**: Cloudflare Access schützt die Domain – nach Cookie-Ablauf wäre die App ohne Netz nicht neu installierbar, aber eine installierte PWA startet aus dem Cache. Muss im Parallelbetrieb ausdrücklich getestet werden (Flugmodus-Test).
3. **Export aus der Alt-App fehlt**: Für Etappe 5 (Datenübernahme) braucht die Alt-App einen **Lernstand-Export-Knopf** (JSON) im Elternbereich. → Kleines Alt-App-Release vorab (v1.86), bewusst die einzige Codeänderung vor der Freigabe.
4. **Monorepo**: `hello-world` enthält mehrere Apps; GitHub-Pages-Workflow deployt das Repo-Root. Empfehlung: Neubau in **eigenem Repo** (`lernprofi-neu` o. ä.) mit eigenem Cloudflare-Projekt; Alt-App bleibt unangetastet bis zur Umstellung.
5. **Ein-Kind-App vs. Profile**: Das Datenmodell kennt heute genau ein Kind. Variante (b) (Kind-PIN/Eltern-Passwort) passt gut zum bestehenden Elternbereich-Gedanken.

## 4. Datenmigration (Ist → Tresor)

1. Alt-App v1.86: Elternbereich-Knopf „Lernstand sichern“ → Datei `lernprofi-lernstand.json` (kompletter `store` + `APP_VERSION` + Datum).
2. Neubau: `src/calc/importAltdaten.js` (rein, getestet) bildet `lernapp_v1` auf das neue Schema ab: Stufen-Fortschritt, Münzen, Lerntage/Lernspur, Mut-Satz, Rekorde, Einstellungen. **Nichts geht verloren** (Prompt-Regel) – Prüfbericht zeigt je Feld „übernommen/ignoriert, Grund“.
3. OPFS-Stimmmodell wird **nicht** migriert – die Vorlesefunktion entfällt im Neubau (§0.1); `store.stimmPaket` und Stimmen-Einstellungen werden beim Import bewusst verworfen (im Prüfbericht ausgewiesen).
4. Abnahme: Migrationstest mit echtem (anonymisiertem) Export-Fixture; Parallelbetrieb vergleicht Münzen/Stufen wöchentlich.

## 5. Etappenplan mit Aufwand und Risiken

| Etappe | Inhalt | Aufwand* | Risiko |
|---|---|---|---|
| 0.5 | Alt-App: Export-Knopf (v1.86) | S | gering |
| 1 | Gerüst: Vite+React, oxlint, Vitest, regression.mjs, Tokens, App-Shell, Release-Notes, Smoke | M | gering |
| 2 | Tresor: crypto, vault, IndexedDB, Sperrbildschirm, Profile Kind/Eltern, Export/Import, migrateData | M | mittel (Krypto sorgfältig testen) |
| 3 | Fachlogik nach `src/calc/*`: Pools (Deutsch/Mathe/Sachkunde/Stark/Gespräche), Runden/Stufen/Münzen/Missionen/Lernspur/Treppe/Tests/Anti-Schummel | **L–XL** | hoch (Funktionsparität; 453-Checks-Katalog als Abnahme) |
| 4 | UI nach `src/features/*`: ~40 Ansichten (iPad zuerst, §0.2), Fokus-Modus, Elternbereich, hell/dunkel – ohne Vorlesen (§0.1) | **XL** | hoch (Kind merkt jede Abweichung) |
| 5 | Datenübernahme (Import + Bericht) | S–M | mittel |
| 6 | Betrieb: Cloudflare Pages+KV+Access, vaultApi, Header, version.json, Doku | M | mittel |
| 7 | KI-Funktionen (optional, mit Freigabe/Deckel/Protokoll) | M | gering (abschaltbar) |
| 8 | Parallelbetrieb (≥ 1 Woche), Lernstand-Abgleich, Umstellung | S | gering |

\* S < 1 Session · M = 1–2 Sessions · L = 3–5 · XL = 5+ Sessions. Etappen 3+4
sind zusammen der halbe Gesamtaufwand; sie lassen sich **fachweise schneiden**
(erst Mathe/Sachkunde – generische MC-Renderer, dann Deutsch – viele
Spezial-Übungen, dann Spiele/Mindset/TTS).

**Alternative „Light“ (falls der Vollausbau zu groß ist):** gleiches Gerüst
(Vite, React, oxlint, Vitest, calc/features-Schnitt, Tokens, Tresor lokal),
aber weiter GitHub Pages und **ohne** Cloudflare Functions/KV/Access – Sync
später als Etappe nachrüstbar. Spart §3.2/3.4 und laufende
Cloud-Konfiguration; verzichtet zunächst auf Geräte-Sync.

## 6. Entscheidungen (alle getroffen, 07.10.2026 – Freigabe erteilt)

1. **Geräte**: iPad ist Hauptgerät (§0.2); **Sync zusätzlich auf Eltern-Laptop und Eltern-Handy** (3 Geräte).
2. **Zugang**: Felix entsperrt selbständig per **4-stelliger Lern-PIN** (§0.3); Elternbereich hinter dem Eltern-Passwort.
3. **Cloudflare**: Bestehendes Konto wird mitgenutzt; Access-Policy mit der **bestehenden Eltern-E-Mail-Adresse** (wird in Cloudflare konfiguriert, steht bewusst nicht im Repo).
4. **Repo**: Neues eigenes Repository **`lernprofi`** (privat).
5. **Umfang**: **Vollausbau mit Sync** (Pages + Functions + KV + Access).
6. **KI**: **Ja, mit monatlichem Kostendeckel** (Start: 5 €/Monat, im Elternbereich änderbar); Start-Zwecke: Freitext-Feedback Aufsatz + Wochenbericht, je einzeln freizugeben.
7. **Daten**: **Komplette Übernahme** des Lernstands – ohne Stimm-Einstellungen (Vorlesen entfällt, §0.1) und ohne die abgelaufene Sommer-Reise.
8. **Bausteine**: Aus mangieriERP **kopieren** (kein gemeinsames Paket). Hinweis: Das mangieriERP-Repo ist in den Lernprofi-Sessions nicht angebunden – crypto/vault/Tokens werden nach der Spezifikation dieses Prompts neu geschrieben; wer 1:1-Kopien möchte, stellt die Dateien bereit oder bindet das Repo an.
9. **Klassenstufe**: Neubau nennt die Stufen „Wiederholung (Kl. 3)“ / „Klasse 4“, **Standard: Klasse 4** (Felix' aktuelle Stufe).

## 7. Etappenstatus

| Etappe | Status |
|---|---|
| 0 – Bestandsaufnahme + Zielarchitektur | ✅ abgeschlossen |
| 0.5 – Export-Knopf in der Alt-App (v1.86) | 🔨 in Arbeit |
| 1 – Gerüst im neuen Repo `lernprofi` | 🔨 in Arbeit |
| 2–8 | ⏳ offen |
