# Backlog – Lern-App

## Versionierung (verbindlich)
Die App trägt eine Versionsnummer (`APP_VERSION` in index.html), Regel:
**1.\<Service-Worker-Cache-Nummer\>.0** (z. B. `lern-app-v20` → `1.20.0`).
Bei jedem Release: Cache-Nummer + `APP_VERSION` erhöhen **und** einen
Eintrag in `RELEASE_NOTES` ergänzen (neueste zuerst). Sichtbar in der App
unten auf der Startseite („Version x.y.z · 📋 Was ist neu?").

## Qualitätssicherung (verbindlich)
Vor **jeder** Bereitstellung eines neuen Features läuft der voll
automatisierte Regressionstest: `node tests/regression.js`
(braucht `npm install playwright`; Chromium-Pfad ggf. über `CHROMIUM_PATH`).
Er prüft alle Lernfelder (Antwort-Pflicht, Feedback, Stufen-Hinweis),
Auswertung/Blume, Level-System, Grundwortschatz (amtliche Wörter, Pakete),
Elternbereich (Wörter + Stufen-Speichern), Kompass, Arbeitsblätter und
sammelt Konsolenfehler. Nur bei 0 Fehlern wird ausgeliefert.

Bewusst **vorerst entfernte** Funktionen, damit die App simpel bleibt.
Sie sind in der Git-Historie erhalten und können später zurückgeholt werden.

## Aktueller Fokus (in der App)
- **Grundlagen online** (ohne Tippen): Satzanfänge, die 4 Fragen, ein Beispiel
- **Arbeitsblatt drucken**: der schriftliche Teil wird mit der **Hand auf Papier**
  geübt (fördert die Handschrift)
- **„Meine Blume"**: einfache Selbst-Einschätzung mit der **Blumentopf-Skala der
  Lehrerin** (4 Stufen), **ohne Noten** – zeigt dem Kind, wo es gerade steht

## 🌍 Große Idee: KI-Onboarding & individuelle Lernpfade (öffentliche Version)
Status: **Konzept / noch nicht entschieden.** Bevor die App öffentlich
(z. B. per GitHub Pages) bereitgestellt wird, wird überlegt, sie vom
Einzelkind-Prototyp (aktuell auf Felix, Klasse 3, zugeschnitten) zu
einem Produkt für **Klasse 1–4** weiterzuentwickeln:

- **KI-gestütztes Onboarding für Eltern**: Vor dem ersten Nutzen
  durchlaufen Eltern einen Dialog, in dem sie ihr Kind beschreiben
  (Klassenstufe, Stärken/Schwächen, Interessen, Besonderheiten wie
  Konzentration/Leseunlust – vgl. die Recherche zum Mutmacher-Format).
- **Automatische Lernfeld-Erstellung**: Aus der Beschreibung generiert
  die App passende Lernfelder und Lernstrategien statt der aktuell
  fest codierten Module – d. h. Inhalt/Schwierigkeit/Ansprache passen
  sich individuell an, nicht nur über die Klassenstufen-Auswahl.
- **Spiele-Auswahl statt Fest-Set**: Eltern/Kind wählen aus einem
  Angebot an Lern-Spielen (heutige vier – See, Tennis, Fußball, Schach
  – als Startpunkt), orientiert am typischen Grundschulalter, statt
  dass alle vier immer aktiv sind.
- **Zielgruppen-Erweiterung**: Klasse 1–4 statt bisher nur 3/4 (siehe
  ROADMAP.md, Abschnitt „Pädagogische Kerninhalte" – Klasse 1/2 fehlt
  bisher auch inhaltlich, nicht nur als Filter).

**Offene Fragen, bevor das umgesetzt wird** (bewusst nicht beantwortet,
nur festgehalten):
- Die App ist heute *bewusst* 100 % offline und serverlos (keine
  externen Requests, keine Kinderdaten verlassen das Gerät – stärkste
  Datenschutz-Eigenschaft laut ROADMAP.md). Ein „KI-Onboarding" braucht
  vermutlich einen LLM-Aufruf – das bricht dieses Versprechen und
  erfordert eine bewusste, DSGVO-konforme Lösung (z. B. keine
  Speicherung der Kind-Beschreibung serverseitig, klare
  Eltern-Einwilligung, ggf. On-Device-Verarbeitung statt Cloud-LLM).
- Automatisch generierte Übungsinhalte (Wörter, Sätze, Regeln) brauchen
  eine Qualitätssicherung, damit z. B. keine falschen
  Rechtschreib-Paare oder altersunpassenden Inhalte entstehen – anders
  als der heutige, von Hand kuratierte/recherchierte Content
  (amtlicher Grundwortschatz BW, geprüfte Sport-/Schach-Fakten).
- Wie viel bleibt weiterhin fest kuratiert (z. B. amtlicher
  Grundwortschatz, Schach-Regeln) vs. was die KI wirklich neu
  generiert?

**Konsequenz für aktuelle Planung:** Die für GitHub Pages vorbereitete
Veröffentlichung (Repo public + Pages aktivieren) ist **pausiert**,
bis diese Produktrichtung geklärt ist – die technische Vorbereitung
(`.nojekyll`, relative Pfade) bleibt aber bestehen und kann jederzeit
genutzt werden.

## Zurückgestellt (Backlog)
- ⏱️ **Timeboxing**: Fokus-/Pausen-Timer (8 min / 2 min / 5 min), Pausen-Overlay
- ⭐ **Gamification**: Sterne, Punkte, Level (Satz-Starter … Schreib-Champion),
  Fortschrittsbalken
- 📈 **Fortschritts-/Verlaufsansicht**: Historie der Übungen, Statistik
- 🔄 **Export/Import** des Fortschritts als JSON (Gerätewechsel)
- 🧠 **Konzentrations-Tracking** vorher/nachher
- 👨‍👩‍👦 **Ausführlicher Elternbereich** mit Auswertung/Entwicklungsfeedback
- 💬 **Online-Tipp-Übungen** (Sätze am Gerät schreiben) – erst wenn das Kind
  schneller am PC tippt

## Umgesetzt
- 🧭 **Kompass-4-Bereich**: Leseverstehen (mehrere Texte), Sprache &
  Rechtschreibung nach Bereichen, Arbeitsblatt, Blumentopf-Selbstcheck,
  Auswertung mit Einwertung am Ende

## Umgesetzt: Amtliche Grundwortschatz-Liste BW ✅
- Der Grundwortschatz-Trainer nutzt jetzt **246 Wörter aus der amtlichen Liste**
  (Kultusministerium 2020) in 12 Regel-Gruppen. Stufen je Gruppe:
  **1 = leichte Wörter (Klasse 1/2) → 2 = schwere (Klasse 3/4) → 3 = alle**,
  große Pools rotieren in Paketen à 10 Wörtern.
- Noch nicht als Übung verwendet (kein Rechtschreib-„Fallstrick" im
  richtig/falsch-Format): lautentsprechende Modellwörter, Endungen -en/-el/-er,
  Funktionswörter. Idee: später als **Abschreib-/Diktat-Modus** nutzen.

## Daten-Bereich des Spiels (seit v1.26)
Inhalte des See-Abenteuers liegen in `data/spiel/` (fische.json, welten.json,
bilder/) – Modell und Arbeitsablauf: `data/spiel/schema.md`.
Einbetten: `node tools/spiel-daten-einbetten.js` (validiert, verkleinert
Fotos, hält die App offline-fähig als Einzeldatei).

## Ideen für später
- Weitere Rezepte/Abläufe als Arbeitsblatt
- Weitere Lesetexte für den Kompass-Bereich
- Foto des fertigen Arbeitsblatts anhängen und mit der Blume verknüpfen
- ~~🔊 Vorlese-/Audio-Hilfe~~ → **wieder aktiv seit v1.23** (überall, inkl. Lese-/Anhör-Bestätigung)
