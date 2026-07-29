# ✏️ Lernprofi

Eine kostenlose, werbefreie Deutsch-Lern-App für die 3./4. Klasse
(Baden-Württemberg) – als Einzeldatei-PWA gebaut, läuft komplett
offline im Browser oder installiert wie eine echte App.

**🚀 [App direkt öffnen](https://mangimic.github.io/lernprofi/)**

Keine Anmeldung, keine Werbung, keine Server-Anbindung – alle
Fortschritte bleiben ausschließlich auf dem Gerät (`localStorage`).

## Was steckt drin?

**13 Lernfelder** (Klasse 3, Klasse 4 oder beide, je nach Thema):
Vorgangsbeschreibung, Subjekte, Prädikat, Satzglieder, Wörtliche Rede,
Zeitformen, Groß & klein, das/dass, Wortarten, Die 4 Fälle, Doppelte
Mitlaute, Kompass 4 (Leseverstehen) und ein Grundwortschatz-Trainer mit
den 246 amtlichen Wörtern des Kultusministeriums Baden-Württemberg.

Jedes Lernfeld hat eine eigene Stufen-Steigerung (Aufwärmen →
Fortgeschritten → Profi), eine Auswertung mit Blumentopf-Bewertung
statt Noten, druckbare Arbeitsblätter für die Handschrift und
Vorlese-Unterstützung inkl. Lese-Check gegen schnelles Durchklicken.

**4 Lern-Spiele** zum Freischalten (verdient man sich durch Übungsrunden):
- 🎣 **See-Abenteuer** – Angeln am echten Schwarzwaldsee, nur heimische
  Süßwasserfische
- 🎾 **Tennis-Match** und ⚽ **Fußball-Match** – Ballwechsel mit
  Grundwortschatz-Wörtern, echte Zählweise, eigener „Mutmacher"
  (Mentaltrainer als Sprechblasen-Dialog)
- ♟️ **Schach** – Schule (Eröffnungen, Taktik), 10 Aufgaben und freies
  Spielen gegen eine kindgerecht schwache KI

**Für Eltern:** eigener Bereich zum Steuern der Schwierigkeitsstufen,
Wortlisten bearbeiten, Spiele an-/abschalten und eine tägliche
Lernzeit-Begrenzung (Time-Boxing) einstellen.

## Installieren wie eine echte App

Die App öffnen und dann:
- **iPhone/iPad (Safari):** Teilen-Symbol → „Zum Home-Bildschirm"
- **Android (Chrome):** Menü (⋮) → „App installieren"

Danach liegt ein eigenes Icon auf dem Gerät, die App läuft offline und
aktualisiert sich automatisch im Hintergrund.

## Technik

Bewusst simpel gehalten: **eine einzige HTML-Datei** (`index.html`,
kompletter App-Code inkl. CSS/JS, keine Frameworks, keine Build-Kette)
plus Service Worker (`service-worker.js`) für Offline-Betrieb und
`manifest.json`/`icon.svg` fürs Installieren.

```
index.html            Komplette App (Markup, Styles, Logik)
service-worker.js      Offline-Cache (Network-First für HTML)
manifest.json           PWA-Metadaten
icon.svg                App-Icon
data/spiel/              Inhalte der Lern-Spiele (Fische, Gegner,
                          Mutmacher-Karten, Schach-Lektionen) getrennt
                          vom App-Code – siehe data/spiel/schema.md
tools/spiel-daten-einbetten.js
                          Prüft & bettet data/spiel/ in index.html ein
tests/regression.js      Voll automatisierter Regressionstest
                          (Playwright/Chromium)
```

### Entwickeln

```bash
# Nach jeder Änderung an data/spiel/*:
node tools/spiel-daten-einbetten.js

# Vor jeder Veröffentlichung (Pflicht, muss 0 Fehler zeigen):
node tests/regression.js
```

Versionsnummer folgt der Regel `1.<Service-Worker-Cache-Nummer>.0`
(z. B. `lern-app-v35` → `1.35.0`), sichtbar in der App unter „Was ist
neu?". Details zu Backlog und Roadmap: [`BACKLOG.md`](BACKLOG.md),
[`ROADMAP.md`](ROADMAP.md).

## 🦖 Leons Spielewelt (ab ca. 3–4 Jahre)

Im Ordner [`leon/`](leon/) steckt eine zweite, eigenständige App für
den kleinen Bruder: **Leons Spielewelt** – gleiche Technik
(Einzeldatei-PWA, offline, werbefrei), aber komplett ohne Lesen
bedienbar: Sprachausgabe, riesige Tippflächen, keine Bestrafung.

**🚀 [Leons Spielewelt öffnen](https://mangimic.github.io/lernprofi/leon/)**

Sechs Spiele rund um Dinos, Fahrzeuge und Helfer-Hunde:
🧩 Puzzle (4→6→9 Teile) · 🔢 Zahlen finden (Mengen zählen, Ziffern
erkennen 1–9) · ✏️ Zahlen nachfahren mit dem Finger · 🔷 Formen
zuordnen · 🐍 Schlangenlinien nachfahren (Wellen, Zickzack,
Schleifen) · 🗺️ Der richtige Weg (nur ein Weg führt zum Ziel).
Belohnung: Sterne sammeln, alle 5 Sterne gibt es einen Sticker fürs
Album. Smoke-Test: `node tests/leon-smoke.js`.

## 🏝 Apfel-Insel (ab ca. 8 Jahre)

Im Ordner [`felix/`](felix/) steckt ein Überlebens-Spiel –
gleiche Technik (Einzeldatei-PWA, offline, werbefrei):
**Apfel-Insel**. Zuerst baut man sich einen **Avatar** (Affe,
Schildkröte, Krabbe oder Papagei, 6 Farben, eigener Name), dann
heißt es auf der Insel – zwischen Palmen, Strand und Meer – die
Levelzeit **überleben**: Der Hunger steigt ständig, nur
herabfallende Äpfel (gefangen und gestapelt) füllen den Magen.
Die **Schatzkarte** führt als Schlängelpfad durch **100 Level** und
**5 Orte** (Strand → Dschungel → Berge → Vulkan → Schatzbucht, jeder
mit eigener Kulisse) bis zur Schatztruhe – mit steigendem Tempo und
immer neuen Gefahren:
harte Kokosnüsse (nicht fangen – 1 Herz weg!), Gold-Äpfel (machen
extra satt), eine Essen-klauende Möwe, Inselwind und Nacht-Level,
in denen nur die eigene Laterne leuchtet. Pro Level gibt es bis zu
3 Sterne (je nach übrigen Herzen), der Fortschritt bleibt im
`localStorage`. Steuerung: Pfeiltasten/A/D oder Finger.

**🚀 [Apfel-Insel öffnen](https://mangimic.github.io/lernprofi/felix/)**

Smoke-Test: `node tests/felix-smoke.js`.

## Status

Persönliches Projekt, gebaut für ein Kind in der 3. Klasse – wird
laufend um neue Lernfelder und Spiele erweitert.
