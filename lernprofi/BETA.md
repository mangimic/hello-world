# 🧪 Beta-Test: Feedback sammeln & auswerten

So läuft die Beta strukturiert, damit der Prototyp effizient
angepasst werden kann.

## 1. Kanal: Feedback kommt aus der App

Auf der Startseite gibt es **„💬 Beta-Feedback“** (für Eltern):
- 2-Minuten-Formular: Klasse des Kindes, Nutzungshäufigkeit,
  **4 Sterne-Fragen** (Bedienung, Spaß, Lerneffekt, Elternbereich)
  und 3 Freitexte (gefällt / stört / Fehler).
- Versand über **zwei Knöpfe**:
  **💬 WhatsApp** öffnet plattformgerecht die App (Android: direkte
  intent://-URL statt der Web-Zwischenseite, an der es früher
  scheiterte; iOS: whatsapp://-Schema; Desktop: WhatsApp Web) –
  der Bericht wird davor immer kopiert und sichtbar angezeigt,
  öffnet sich nichts, sagt es die App nach 2,5 s.
  **📤 Teilen oder Kopieren** nutzt das native Teilen-Menü des Geräts
  (E-Mail, Signal …) bzw. die Zwischenablage; der Bericht steht
  zusätzlich immer sichtbar in einem Textfeld (Ziel-Adresse aus
  `FEEDBACK_MAIL`).
- Eingehende Nachrichten (egal über welchen Weg) einfach markieren,
  kopieren und wie Mails als Textdatei in `feedback/` legen –
  der Datenblock bleibt dabei erhalten.
- Ohne Server, keine persönlichen Daten. Die **anonyme
  Nutzungs-Zusammenfassung** (App-Version, geübte Runden je Bereich,
  aktive Spiele) hängt nur mit gesetztem Häkchen an – sie zeigt,
  was wirklich benutzt wird, nicht nur, was gesagt wird.

Jede Rückmeldung enthält einen maschinenlesbaren Block
`##LP-FEEDBACK##{…}##ENDE##` – der macht die Auswertung automatisch.

## 2. Sammeln

Eingehende Mails/Nachrichten einfach als je eine Textdatei in einen
Ordner `feedback/` legen (Copy-Paste des Nachrichtentexts genügt,
Dateiname egal, z. B. `anna.txt`, `familie-k.txt`).
Der Ordner ist per `.gitignore` vom Repo ausgeschlossen –
Feedback-Rohdaten gehören nicht auf GitHub.

## 3. Auswerten (ein Befehl)

```bash
node tools/feedback-auswerten.js feedback/
```

Ausgabe: Anzahl Rückmeldungen, Ø-Sterne je Frage, Verteilung nach
Klasse/Nutzung/Version, meistgeübte Bereiche (aus den
Nutzungsdaten) und alle Freitexte gruppiert nach
gefällt/stört/Fehler – mit Quellen-Datei je Zitat.

## 4. In Arbeit übersetzen (Kadenz)

Empfohlener Rhythmus während der Beta:
1. **Wöchentlich auswerten** (Befehl oben) – 10 Minuten.
2. Aus „stört/fehlt“ und „Fehler“ die **Top 3** ziehen und als
   Aufgaben in BACKLOG.md notieren (oder direkt umsetzen lassen).
3. Fix/Änderung ausliefern → Testern kurz Bescheid geben
   („eure Punkte X, Y sind drin – App einfach neu öffnen“).
   Das hält die Tester bei der Stange, weil sie Wirkung sehen.
4. Sterne-Durchschnitte über die Wochen vergleichen – steigen sie,
   wirkt die Iteration.

## 5. Was die Tester bekommen (Vorlage)

> Hallo! Wir testen unsere Deutsch-Lern-App „Lernprofi“ (Klasse 3/4,
> kostenlos, werbefrei, alles bleibt auf dem Gerät):
> 👉 https://mangimic.github.io/hello-world/lernprofi/
> Am besten installieren: Safari → Teilen → „Zum Home-Bildschirm“
> bzw. Chrome → Menü → „App installieren“.
> **Bitte nach 2–3 Nutzungen unten auf der Startseite auf
> „💬 Beta-Feedback“ tippen** – dauert 2 Minuten. Danke! 🙏
