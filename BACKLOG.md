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

## Ideen für später
- Weitere Rezepte/Abläufe als Arbeitsblatt
- Weitere Lesetexte für den Kompass-Bereich
- Foto des fertigen Arbeitsblatts anhängen und mit der Blume verknüpfen
- 🔊 Vorlese-/Audio-Hilfe (war eingebaut, wieder entfernt – bei Bedarf zurückholbar)
