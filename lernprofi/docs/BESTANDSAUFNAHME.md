# Bestandsaufnahme Lernprofi (Phase 0)

Stand: 07.10.2026 · App-Version 1.85.0 · erstellt zur Prüfung der Zielarchitektur
(Tech-Stack mangieriERP). **In dieser Phase wurde kein Code verändert.**

## 1. Steckbrief

| | |
|---|---|
| Produkt | „Lernprofi – Deutsch & Mathe Klasse 3/4“, Lern-PWA für ein Kind (jetzt **Klasse 4**, Baden-Württemberg) + Elternbereich |
| Form | **Eine einzige HTML-Datei** `lernprofi/index.html`: 10.787 Zeilen, 856 KB, ~400 Funktionen – HTML, CSS und Vanilla-JavaScript ohne Build-Schritt |
| Repository | `mangimic/hello-world`, Unterordner `lernprofi/` (Monorepo mit weiteren Apps: felix/, leon/, bauchweg/) |
| Framework | keines (kein React, kein CSS-Framework, keine Laufzeit-Abhängigkeiten) |
| PWA | `manifest.json`, `icon.svg`, `service-worker.js` (62 Zeilen, Cache `lern-app-v85`: HTML network-first, Rest cache-first mit Laufzeit-Cache) → voll offlinefähig nach dem ersten Laden |
| Sprachausgabe | `stimme/` (39 MB, selbst ausgeliefert): Piper/VITS-TTS mit ONNX-Runtime-WASM + Phonemizer; das Stimmmodell (~30 MB, `de_DE-thorsten-low`) lädt das Gerät einmalig von huggingface.co in OPFS. Fallback: System-Sprachausgabe (Web Speech API) mit Qualitäts-Ampel und Sprachpaket-Anleitung |
| Hosting | **GitHub Pages** über Actions-Workflow (Deploy bei jedem Master-Push), URL `…/hello-world/lernprofi/`. Zusätzlich: claude.ai-Artifact als Vorschau-Kanal und ZIP-Weitergabe |
| Anmeldung | keine. Keine Konten, kein Server, kein Netzwerkzugriff zur Laufzeit (außer einmaligem Stimmmodell-Download) |

## 2. Fachliche Funktionen

- **3 Fächer** (Umschaltung „Dein Fach“):
  - **Deutsch**: 12 Lernfelder in 3 Gruppen (Schreiben & Lesen · Sätze & Grammatik · Richtig schreiben) + Grundwortschatz mit Themen-Wahl (Fußball, Tiere, …)
  - **Mathe**: 5 Bereiche nach „Kompass 4“ (Rechnen, Zahlen, Formen, Größen, Daten & Zufall)
  - **Sachkunde**: 6 Felder nach Bildungsplan BW (Strom, Radfahrprüfung, Karten/BW, Gemeinde, Körper, Zeit), 120 Fragen
- **Stufen-System** je Lernfeld (Aufwärmen → Fortgeschritten → Profi), freigespielt durch fehlerfreie Runden, im Elternbereich übersteuerbar (global / je Klassenstufe / je Feld)
- **Klassenstufen-Wahl**: „Vorbereitung auf 4“ (= Klasse-3-Stoff, interner Wert 3) · Klasse 4 · Alle
- **Test-Training** (Könnernachweis-Simulator): Sprache, Vorgangsbeschreibung, Mathe-Kompass, „Bist du fit?“ – mit Punkten und Erst-Versuch-Wertung
- **Motivation/Konzentration**: Münzen (1 Übungsrunde = 1 Spielmünze), Spielhalle (5 Spiele inkl. Blockwelt mit Anti-Schummel-Countdown), Mini-Missionen, Tagesziel, Tagesform-Frage, Bewegungspausen, Lernspur, Fokus-Modus (Übung füllt den Bildschirm, kein Scrollen bei 360×640 – testgesichert)
- **Mindset**: „Stark mit Leo“ (41 Situationen zu Freundschaft/Resilienz, Mut-Satz des Tages, 16 Mut-Sätze), Konzentrations-Training (Zahlenkette, ABC, Blitzlesen mit 80 Tierwörtern)
- **Einwertung**: „Schatzsuche“ (3-Minuten-Ersteinstufung mit Treppen-Logik)
- **Saisonales**: „Leos Sommer-Reise“ (8-Etappen-Ferienprogramm), „Fit für Klasse 4“
- **Elternbereich** (6 Tabs): Stufen-Steuerung, eigene Wörter, Spiele/Zeitlimit/Lese-Check (4 Stufen), Lernen (Missionen, Pausen, neutrale 14-Tage-Übersicht), Gesprächsimpulse (20 Fragen), Vorlesen (Stimmen, Tempo, Lernprofi-Stimme)
- **Vorlesen überall** mit Mitlese-Karaoke; Lese-Check mit Lücken-Frage (konfigurierbar)
- **Beta-Feedback**-Formular (erzeugt lokalen Bericht zum Kopieren)

Aufgaben-Herkunft: **ausschließlich eigene, im Code eingebettete Pools** (aus Schulheften/Kompass 4 abgeleitet, handgeschrieben). Keine KI zur Laufzeit.

## 3. Datenmodell und personenbezogene Daten

- **Ein Datendokument**: globales `store`-Objekt → `localStorage`-Schlüssel `lernapp_v1` (JSON). Bereits heute: zentrale `save()`/`load()` mit **defensiver Feld-für-Feld-Migration** (unbekanntes wird verworfen, Werte validiert) – konzeptnah zu `migrateData.js`, aber ohne Schemaversion.
- Inhalte: optionaler **Vorname**, Klassenstufe, Fach, Stufen-Fortschritt je Feld, Münzen, Lerntage (Datum, Tagesform, Missionen), Mut-Satz, Reise-/Programme-Stände, Einstellungen (Zeitlimit, Lese-Check, Stimme), Zahlenkette/Blitz-Rekorde.
- **OPFS**: Stimmmodell (keine personenbezogenen Daten).
- Personenbezogen im engeren Sinn: nur der frei wählbare Vorname und das Lernverhalten (lokal). **Kein Tracking, keine Analytics, keine Fremd-CDNs zur Laufzeit** – per Regressionstest erzwungen. Übertragung an Dritte: keine.
- Schwachstelle: localStorage ist **ungesichert** (Browserdaten löschen = Lernstand weg) und **an ein Gerät gebunden**; es gibt keinen Export-/Import-Knopf.

## 4. Qualität, Tests, Deploy-Weg

- **Regression**: `tests/regression.js` (2.427 Zeilen, Playwright/Chromium) – **453 Checks** als echte Browser-Flows (Übungen lösen, Tests, Spiele, Elternbereich, No-Scroll-Messung 360×640, Wortlaut-Wächter gegen Diagnose-/Beschämungssprache, TTS-Mock-Pipeline). Pflicht vor jedem Release, 0 Fehler.
- **Versionsregel**: `APP_VERSION = 1.<SW-Cache-Nr>.0`, Release-Notes im Code (neueste zuerst), testgesichert.
- **Deploy**: Commit auf Arbeits-Branch → PR → Merge auf master → GitHub-Actions deployt Pages automatisch. Parallel: Artifact-Republish (Build-Skript schneidet Service-Worker heraus) + ZIP.
- **Nicht vorhanden**: Lint, Unit-Tests, Modul-System, CSP-Header, `_headers`, data-test-Attribute (Tests selektieren über IDs/Klassen/Texte).

## 5. Bekannte Schwächen (ehrlich)

1. **Eine 10.800-Zeilen-Datei**: Navigation und parallele Arbeit werden zäh; Merge-Konflikte bei Mehrfach-Sessions (bereits einmal passiert, PR #105).
2. **Keine reine Fachlogik**: `Date.now()`, `Math.random()`, DOM-Zugriffe überall verwoben → keine Unit-Tests möglich, nur End-to-End.
3. **Ein Gerät, kein Backup**: Lernstand hängt am localStorage genau eines Browsers.
4. **Regression dauert ~3–4 Minuten** und ist das einzige Sicherheitsnetz.
5. Artifact-Build (Single-File-Schnitt) ist ein fragiles Sonderverfahren.
6. Service-Worker-Cache-Bump ist manuell (aber testgesichert).

## 6. Stärken, die erhalten bleiben müssen

- 100 % offline, 0 € Betriebskosten, keine Konten-Hürde für das Kind
- 453-Checks-Regression mit echten Kind-Abläufen
- Didaktik-Leitplanken (Sprach-Wächter, Fokus-Modus, Anti-Schummel, kindgerechte Fehlertexte)
- Sofort-Deploy-Pipeline mit Live-URL
