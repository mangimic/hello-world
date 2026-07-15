# 🧪 Beta-Test: Feedback sammeln & auswerten

So läuft die Beta strukturiert, damit der Prototyp effizient
angepasst werden kann.

## 1. Kanal: Feedback kommt aus der App

Auf der Startseite gibt es **„💬 Beta-Feedback“** (für Eltern):
- 2-Minuten-Formular: Klasse des Kindes, Nutzungshäufigkeit,
  **4 Sterne-Fragen** (Bedienung, Spaß, Lerneffekt, Elternbereich)
  und 3 Freitexte (gefällt / stört / Fehler).
- Versand per **WhatsApp-Knopf** (öffnet WhatsApp mit dem fertigen
  Bericht – Ziel-Nummer in `index.html` als `FEEDBACK_WHATSAPP`
  hinterlegen, internationales Format ohne „+“, z. B.
  `4917612345678`; solange sie leer ist, wählt der Tester den
  Empfänger selbst), per **E-Mail-Knopf** (Adresse in
  `FEEDBACK_MAIL`) oder **Kopieren**.
- WhatsApp-Nachrichten für die Auswertung einfach markieren,
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
> 👉 https://mangimic.github.io/lernprofi/
> Am besten installieren: Safari → Teilen → „Zum Home-Bildschirm“
> bzw. Chrome → Menü → „App installieren“.
> **Bitte nach 2–3 Nutzungen unten auf der Startseite auf
> „💬 Beta-Feedback“ tippen** – dauert 2 Minuten. Danke! 🙏
