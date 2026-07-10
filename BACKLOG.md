# Backlog – Lern-App

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

## Wartet auf Material
- 📚 **Amtliche Grundwortschatz-Liste BW (~870 Wörter)**: Sobald die PDF des
  Kultusministeriums vorliegt, wird der Grundwortschatz-Trainer 1:1 erweitert.
  Vorbereitet ist alles:
  - Wörter einfach je Kategorie in `GWS_KATEGORIEN[..].woerter` anhängen
    (`{richtig:"…", falsch:"…"}`); die Stufen (1 = erste Hälfte, 2 = zweite
    Hälfte, 3 = alle) wachsen automatisch mit.
  - Fehlende amtliche Kategorien (z. B. Merkwörter mit x/y/chs, Vorsilben
    ver-/vor-) als neue Einträge in `GWS_KATEGORIEN` ergänzen – Trainer,
    Arbeitsblatt und Info-Seite übernehmen sie automatisch.
  - Die kuratierten Ersatzwörter dann gegen die amtlichen prüfen/ersetzen.

## Ideen für später
- Weitere Rezepte/Abläufe als Arbeitsblatt
- Weitere Lesetexte für den Kompass-Bereich
- Foto des fertigen Arbeitsblatts anhängen und mit der Blume verknüpfen
- 🔊 Vorlese-/Audio-Hilfe (war eingebaut, wieder entfernt – bei Bedarf zurückholbar)
