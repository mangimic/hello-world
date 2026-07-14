# 📱 Planung: Vom Prototyp zur Store-App („Lernprofi“)

Stand: Juli 2026 · Status: **Geschäftsmodell ENTSCHIEDEN: Abo**
Ziel: Freie Version + **„Lernprofi Plus“-Familien-Abo für 9,99 €/Jahr**
(inkl. 7 Tage kostenlos testen) in Google Play & Apple App Store.
*(Ursprünglich geplant: 4,99 € Einmalkauf – nach Business-Case-Vergleich
im Deutschland-Maßstab zugunsten des Abos verworfen, siehe 4.6/4.7.)*

---

## 1. Wo wir stehen (Ausgangslage)

Der Prototyp ist funktional weit: 13 Lernfelder (Klasse 3/4), 4 Lern-Spiele,
Mutmacher, Lese-Check, Münz-System, Time-Boxing, Elternbereich, 178
automatisierte Regressionstests, 100 % offline, werbefrei, DSGVO-unkritisch.
Was ihn vom **Produkt** trennt, sind vier Dinge: Mehrkind-Fähigkeit,
Klasse 1/2-Inhalte, Bezahl-Mechanik und die Store-Verpackung inkl.
Kinder-Compliance.

## 2. Geschäftsmodell-Check: „4,99 € pro Kind“

**Wichtige technische Realität vorweg:** In den Stores ist „pro Kind“
kaum durchsetzbar. Käufe gelten pro Store-Konto, und **Apple
Familienfreigabe / Google Family Library teilen Einmalkäufe automatisch
mit der ganzen Familie**. Ohne eigenes Konto-Backend (das dem
Offline-/Datenschutz-Versprechen widerspricht) ist der Kauf faktisch
eine **Familienlizenz**.

**Entscheidung (Juli 2026):** **Familien-Abo „Lernprofi Plus“ für
9,99 €/Jahr** – für alle Kinder der Familie (bis 4 Profile), mit
**7 Tagen kostenlosem Test** (hebt die Konversion deutlich). Bewusst
nur EIN Preis (kein Monats-Abo zum Start – weniger Churn-Komplexität,
klarere Kommunikation). Preis-Anker: exakt auf ANTON-Plus-Niveau,
aber mit persönlicherem Produkt.

**Wettbewerbs-Anker (ernst zu nehmen):** Marktführer **ANTON** ist
komplett kostenlos (20 Mio.+ Nutzer, Klasse 1–10), das Plus-Abo kostet
nur **10 €/Jahr**. Über 75.000 Lern-Apps konkurrieren im Kinderbereich.
4,99 € einmalig ist daher preislich okay – aber die App verkauft sich
nur über einen klaren Unterschied: **persönlicher als ANTON**
(Mutmacher/Coach Leo, Lese-Check für Lesemuffel, Time-Boxing,
Eltern-Kontrolle, künftig KI-Personalisierung – siehe BACKLOG).

### Vorschlag Free/Voll-Aufteilung

| | 🆓 Frei | ⭐ Lernprofi Plus (9,99 €/Jahr) |
|---|---|---|
| Profile | 1 Kind | bis 4 Kinder |
| Lernfelder | 4 (je Gruppe 1–2), nur Stufe 1 | alle 13, alle Stufen + Krone |
| Spiele | 1 (See-Abenteuer) | alle 4 inkl. Schach |
| Mutmacher | Basis-Karten | alle Situationen + Rotation |
| Arbeitsblätter drucken | – | ✓ |
| Elternbereich | Time-Boxing | komplett (Stufen, Wörter, Spiele) |

Grundsatz: Die freie Version muss **echt nützlich** sein (Kids-Apps mit
harter Paywall bekommen schlechte Bewertungen), aber die Vollversion
muss sich nach „mehr von dem, was schon Spaß macht“ anfühlen.

## 3. Transformations-Roadmap (Phasen & Aufwand)

Aufwände in Personentagen (PT), nebenberuflich mit KI-Unterstützung
realistisch **3–5 Monate** bis Launch.

| Phase | Inhalt | Aufwand |
|---|---|---|
| **0 – Beta jetzt** (läuft) | GitHub-Pages-Beta im Freundeskreis, Feedback einsammeln, Umbenennung/UX-Politur | 2–4 PT |
| **1 – Produktreife** | **Mehrkind-Profile** (größter Umbau lt. ROADMAP – Store-Refactor), **Klasse 1/2-Inhalte** (neue Lernfelder + GWS-Stufe 1 nutzen), Onboarding-Assistent (zunächst regelbasiert, KI später), Free/Voll-Feature-Flag | 25–35 PT |
| **2 – Store-Technik** | App-Hülle mit **Capacitor** (eine Codebasis → iOS + Android), **Auto-Renew-Abo** (StoreKit 2 / Play Billing – für digitale Inhalte PFLICHT, externe Zahlung verboten) inkl. 7-Tage-Trial, Abo-Status-Prüfung **offline-tauglich** (letzte bekannte Gültigkeit + Kulanzfrist cachen, freundlicher Ablauf-Hinweis), Wiederherstellung, **Parental Gate** vor Kauf/Links (Kids-Pflicht), Store-Assets | 18–25 PT |
| **3 – Recht & Compliance** | Gewerbeanmeldung, Impressum/AGB/**Datenschutzerklärung für Kinder-App vom Anwalt** (Apple Kids Category + Google Families Policy verlangen u. a.: keine Werbung/Tracking, Datenminimierung, Privacy-Links), Altersfreigabe über IARC-Fragebogen (kostenlos), Steuer klären (Stores treten als Händler auf und führen die MwSt ab) | 5–8 PT + Anwalt |
| **4 – Submission & Launch** | Einreichung beide Stores; **Kids-Kategorie wird streng geprüft** – 1–3 Review-Schleifen einplanen; Beta über TestFlight / Play-Testtrack mit den Freunden | 3–6 PT |
| **5 – Betrieb** | Updates (unsere Regression-Pipeline hilft massiv), Support-Postfach, Bewertungen beantworten, Marketing (Eltern-Blogs, Lehrer-Communities, Schul-Newsletter) | laufend, ~2 PT/Monat |

**Technik-Entscheidung Capacitor:** Die App bleibt eine Web-Codebasis
(unser größtes Asset – 178 Tests, eine Datei), bekommt aber echte
Store-Builds. Alternative „TWA“ ginge nur für Android. Der PWA-Weg
(GitHub Pages) bleibt parallel als kostenloser Kanal bestehen.

## 4. Business Case

### 4.1 Was vom Abo übrig bleibt (9,99 €/Jahr)

| Schritt | Betrag |
|---|---|
| Abo-Preis pro Jahr (brutto, DE) | 9,99 € |
| − 19 % MwSt (führt der Store ab) | −1,60 € |
| − 15 % Store-Provision (Abos: Google 15 % ab Tag 1; Apple im Small-Business-Programm ebenfalls 15 %) | −1,26 € |
| **Netto-Erlös pro Abo-Jahr** | **≈ 7,14 €** |

Abo-Annahmen für alle Szenarien: **Verlängerungsquote ≈ 55–60 %**
(Kinder wachsen aus der Grundschule heraus – die App „verliert“ ihre
Kunden nach oben, gewinnt aber jedes Jahr einen frischen Jahrgang),
Konversion mit 7-Tage-Trial ≈ 1–2,5 % der Downloads.
*(Zum Vergleich verworfen: Einmalkauf 4,99 € ≈ 3,56 € netto – nur halb
so viel wie EIN Abo-Jahr, ohne Wiederkehr.)*

### 4.2 Kosten

**Einmalig (Do-it-yourself-Szenario, Entwicklung selbst mit KI):**

| Posten | Kosten |
|---|---|
| Google-Play-Konto (einmalig) | ~25 € |
| Anwalt: Datenschutz/AGB Kinder-App | 1.000–2.500 € |
| Gewerbeanmeldung | 20–60 € |
| Design-Feinschliff/Store-Assets (falls extern) | 0–1.500 € |
| Puffer (Geräte-Tests, Kleinkram) | ~300 € |
| **Summe einmalig** | **≈ 1.400–4.400 €** |

*(Falls die Phasen 1–2 nicht selbst gebaut werden: Freelancer-Aufwand
40–55 PT ≈ 25.000–45.000 € – das verändert den Case fundamental.
Annahme hier: Eigenleistung mit KI-Unterstützung wie bisher.)*

**Laufend pro Jahr:**

| Posten | Kosten/Jahr |
|---|---|
| Apple Developer Program | ~92 € |
| Steuerberater (Kleingewerbe) | 500–1.000 € |
| Rechts-Updates, Domain, Kleinkram | ~200 € |
| **Summe laufend** | **≈ 800–1.300 €/Jahr** |

*(Kein Server, keine Nutzerdaten – das Offline-Konzept spart dauerhaft
Betriebskosten und Datenschutz-Risiko. Erst das spätere KI-Onboarding
bräuchte API-Budget, grob 1–5 Cent pro Onboarding.)*

### 4.3 Einnahmen-Szenarien Jahr 1 (nur BW, Abo)

| Szenario | Downloads J1 | Konversion | Abos | Umsatz (netto) |
|---|---|---|---|---|
| 🐢 Vorsichtig | 5.000 | 1,2 % | 60 | **≈ 430 €** |
| 🚶 Basis | 25.000 | 1,8 % | 450 | **≈ 3.210 €** |
| 🚀 Optimistisch | 100.000 | 2,5 % | 2.500 | **≈ 17.900 €** |

**Break-even (nur Cash-Kosten, ohne eigene Zeit):**
- Einmalig 1.400–4.400 € + Jahr-1-Betrieb ≈ 2.200–5.700 €
- ⇒ **~310 bis ~800 Abos** nötig – das Abo halbiert die
  Break-even-Hürde gegenüber dem Einmalkauf.

**Ehrliche Einordnung:** Als Geschäft trägt das Projekt sich erst ab
einer Sichtbarkeit, die organisch schwer zu erreichen ist (ANTON-Effekt).
Realistische Erwartung für Jahr 1: **Hobby, das seine Kosten
einspielen kann** – mit Optionswert auf mehr, falls die
KI-Personalisierung (Onboarding, eigene Themenfelder) zum echten
Alleinstellungsmerkmal wird. Downloads kommen nicht von allein:
Eltern-Blogs, Lehrer-Empfehlungen und Schul-Communities sind der
wirksamste (und günstigste) Kanal.

### 4.4 Marktpotenzial Baden-Württemberg (Schüler-Abschätzung)

Basis: Statistisches Landesamt BW, Schuljahr 2025/26.

| Stufe | Anzahl | Erläuterung |
|---|---|---|
| Grundschüler BW gesamt (Kl. 1–4) | **≈ 445.000** | 412.900 an öffentlichen Schulen + ≈ 30.000 an Privatschulen; steigend auf ≈ 470.000 bis 2028/29 |
| davon heute von der App abgedeckt (Kl. 3/4) | **≈ 220.000** | ungefähr die Hälfte; Kl. 1/2 kommt erst mit Phase 1 |
| Familien mit Lern-Nutzung auf Tablet/Handy (≈ 85 %) | ≈ 378.000 Kinder | Geräteausstattung/Bereitschaft, digital zu üben |
| davon zahlungsbereit für eine Lern-App (≈ 8 %) | **≈ 30.000 Kinder** | harte Obergrenze der Käuferschicht in BW (ANTON-Effekt: die Mehrheit bleibt bei Gratis-Angeboten) |
| realistisch erreichbar in Jahr 1 ohne Werbebudget (2–5 % davon) | **≈ 600–1.500 Verkäufe** | über Eltern-Blogs, Lehrer, Mundpropaganda |

**Drei Konsequenzen daraus:**

1. **Das BW-Potenzial passt exakt zum Break-even** (620–1.600 Verkäufe,
   Abschnitt 4.3): Baden-Württemberg allein kann das Projekt tragen –
   aber ohne Puffer. Jeder Prozentpunkt mehr Bekanntheit wirkt direkt.
2. **Der Pool erneuert sich jährlich:** ≈ 110.000 Einschulungen pro
   Jahr in BW bedeuten beim Einmalkauf-Modell jedes Jahr einen frischen
   Jahrgang potenzieller Käufer – der Markt „verbraucht" sich nicht.
3. **BW ist nur der Startmarkt:** Die BW-Spezifika (amtlicher
   Grundwortschatz, Kompass 4) sind Stärke UND Grenze. Deutschlandweit
   gibt es ≈ 3,1 Mio. Grundschüler (Faktor ~7); der Deutsch-Lehrplan
   ist ähnlich genug, dass eine spätere Öffnung (Grundwortschatz-Listen
   anderer Länder als Daten-Pakete) den Käuferpool auf ≈ 200.000
   zahlungsbereite Kinder heben würde.

*(Hinweis Familienlizenz: Verkäufe zählen pro Familie, nicht pro Kind –
bei Geschwistern im Grundschulalter liegt die Zahl der Käufe ca.
15–20 % unter der Zahl erreichter Kinder.)*

### 4.5 Deutschland-Rollout: Grundwortschatz je Bundesland

**Befund (recherchiert):** Die Grundwortschatz-Listen unterscheiden
sich zwischen den Bundesländern erheblich – im Namen, im Umfang
(je nach Land ca. **500–900 Wörter**) und in der Auswahllogik
(rechtschriftliche Muster vs. Häufigkeit). Beispiele: NRW 533 Wörter
(verbindlich seit 2019), Bayern ~700, Berlin/Brandenburg eigene
Listen mit Handreichungen, BW die amtliche Liste des ZSL (unsere
Basis: 246 kuratierte Wörter daraus). **Einige Länder haben gar keine
verbindliche Liste** – dort entscheiden Schulen/Lehrkräfte selbst.

**Konsequenz für die Architektur (gute Nachricht):** Genau dafür ist
die App schon gebaut. Der Grundwortschatz ist datengetrieben
(12 Regel-Gruppen, leicht/schwer-Stufen, Eltern können Wörter
tauschen). Für den Deutschland-Rollout wird daraus ein
**Wortschatz-Paket pro Bundesland**:

1. **Bundesland-Wahl beim Onboarding** (ein Tap, Teil von Phase 1) –
   steuert Wortschatz-Paket und ggf. landesspezifische Module.
2. **Paket-Format** wie heute `data/`-JSON: amtliche Liste beschaffen,
   auf unsere 12 Regel-Gruppen mappen, Falsch-Schreibweisen kuratieren,
   durch die bestehende Werkzeug-Validierung + Regressionstests.
3. **„Deutschland-Basispaket“** als Fallback für Länder ohne
   verbindliche Liste (Schnittmenge der großen Listen + bewährte
   Rechtschreib-Muster).
4. **Kompass 4 verallgemeinern:** Der BW-spezifische Kompass-Bereich
   wird als BW-Modul markiert; bundesweiter Anker ist stattdessen
   **VERA 3** (Vergleichsarbeiten Klasse 3, in allen Ländern) – ein
   eigenes Übungsmodul „VERA-Training“ wäre das deutschlandweite
   Pendant.

**Aufwand:** pro Bundesland-Paket ca. **2–4 PT** (Beschaffung,
Kategorisierung, Kuratierung, QA). Priorisierter Rollout nach
Marktgröße: **NRW (~660.000 Grundschüler) → Bayern (~470.000) →
Niedersachsen/Hessen → Rest + Basispaket**. Mit BW zusammen decken
die ersten vier Länder bereits über die Hälfte der ~3,1 Mio.
Grundschüler ab. Gesamtaufwand Vollausbau: ~25–40 PT, gut
inkrementell lieferbar (jedes Paket ist ein eigenes Release).

**Empfohlene Rollout-Strategie:** Start in den Stores trotzdem
**bundesweit sichtbar** mit BW-Paket + Basispaket (die App ist auch
ohne landesspezifische Liste voll nutzbar – Lernfelder und Spiele
sind lehrplanähnlich in allen Ländern); Bundesland-Pakete dann als
kostenlose Updates nachliefern. So verschenkt man keine Downloads,
weckt aber auch keine falschen Erwartungen („dein Bundesland folgt").

### 4.6 Business Case im Deutschland-Rollout

Gleiche Erlöslogik (≈ 3,56 € je Verkauf), aber der Trichter wird
~7× größer – bei fast unveränderten Kosten (die Bundesland-Pakete
sind Eigenleistung, ~25–40 PT verteilt über Monate):

| Trichter Deutschland | Anzahl |
|---|---|
| Grundschüler DE (Kl. 1–4) | ≈ 3.100.000 |
| davon digital lernend (≈ 85 %) | ≈ 2.600.000 |
| davon zahlungsbereit (≈ 8 %) | **≈ 210.000 Kinder** (Käuferpool-Obergrenze) |
| jährlich nachrückend (~750.000 Einschulungen) | ≈ 51.000 neue zahlungsbereite Kinder/Jahr |

**Einnahmen-Szenarien Jahr 1 mit Abo (bundesweit sichtbar ab Launch):**

| Szenario | Downloads J1 | Konversion | Abos J1 | Umsatz (netto) |
|---|---|---|---|---|
| 🐢 Vorsichtig | 20.000 | 1,2 % | 240 | **≈ 1.710 €** |
| 🚶 Basis | 75.000 | 1,8 % | 1.350 | **≈ 9.600 €** |
| 🚀 Optimistisch | 250.000 | 2,5 % | 6.250 | **≈ 44.600 €** |

**Der Abo-Effekt über 3 Jahre (Basis-Pfad, 55 % Verlängerung):**

| Jahr | Bestand verlängert | neue Abos | aktive Abos | Umsatz (netto) |
|---|---|---|---|---|
| 1 | – | 1.350 | 1.350 | ≈ 9.600 € |
| 2 | ≈ 740 | ≈ 1.800 | ≈ 2.540 | ≈ 18.100 € |
| 3 | ≈ 1.400 | ≈ 2.200 | ≈ 3.600 | ≈ 25.700 € |

⇒ kumuliert **≈ 53.000 € Umsatz** bei ≈ 8.000–9.000 € Gesamtkosten =
**≈ 45.000 € Überschuss über 3 Jahre** – fast das Doppelte des
Einmalkauf-Pfads (≈ 20.000 €), weil jeder gewonnene Kunde
weiterzahlt, solange das Kind in der Grundschule ist.

**Weitere Punkte:**

- **Break-even schon früh in Jahr 1:** 310–800 Abos nötig – im
  Basis-Szenario nach wenigen Monaten erreicht.
- **Theoretische Obergrenze:** 210.000 Abo-Haushalte × 7,14 €/Jahr ≈
  **1,5 Mio. €/Jahr wiederkehrend**; schon 5 % Marktausschöpfung
  wären ≈ 75.000 €/Jahr. Realistisch nur mit KI-Alleinstellung und
  Lehrer-Multiplikatoren.
- **Wiederkehrender Umsatz finanziert die KI:** Das Abo deckt die
  laufenden API-Kosten des geplanten KI-Onboardings/Themenfeld-Generators
  strukturell – beim Einmalkauf wäre das ein Dauerproblem gewesen.
- **Steuer-Hinweis:** Die Kleinunternehmergrenze (~25.000 €/Jahr) wird
  im Basis-Pfad in Jahr 3, im optimistischen Pfad schon in Jahr 1
  gerissen – Steuerberater früh einbinden.
- **Abo-Pflichten:** klare Auto-Renew-Hinweise, einfache Kündigung
  über den Store, Preisanzeige vor dem Trial – alles Standard-Pflichten,
  die die Stores erzwingen; im Kids-Kontext zusätzlich hinter dem
  Parental Gate.

### 4.7 Modell-Entscheidung (Juli 2026): Abo ✅

Geprüft wurden: (1) Familien-Abo 9,99 €/Jahr, (2) Einmalkauf 4,99 €,
(3) Hybrid. **Entschieden: Option 1 – das Familien-Abo.**
Ausschlaggebend: doppelter 3-Jahres-Überschuss im Deutschland-Maßstab,
halbierte Break-even-Hürde, strukturelle Finanzierung der geplanten
KI-Funktionen und der ANTON-Plus-Preisanker (gleicher Preis,
persönlicheres Produkt). Dem Abo-Müdigkeits-Risiko begegnen wir mit
7-Tage-Trial, fairem Jahres-Preis („unter 1 € im Monat“) und einer
frei nutzbaren Basis-Version, die nicht verkrüppelt ist.

## 5. Top-Risiken

1. **ANTON-Dominanz** – kostenlos, riesig, Lehrer-verankert. Antwort:
   Nische „persönlich & konzentrationsfreundlich“ statt Masse.
2. **Kids-Review-Ablehnung** – Kids-Kategorie wird streng geprüft
   (Parental Gate, Privacy). Antwort: Compliance in Phase 3 ernst nehmen,
   Anwalt vor Einreichung.
3. **„Pro Kind“-Erwartung vs. Familienfreigabe** – oben gelöst
   (Familienlizenz).
4. **Zeitbudget** – 50+ PT nebenberuflich. Antwort: Phasen strikt
   nacheinander, Beta-Feedback vor Phase 1 abwarten.
5. **KI-Versprechen vs. Offline-Versprechen** – siehe BACKLOG
   (offene Datenschutz-Fragen), bewusst NACH dem Store-Launch klären.

## 6. Empfohlene nächste Schritte

1. ✅ Beta im Freundeskreis starten (GitHub Pages – zwei Klicks offen)
2. Beta-Feedback 3–4 Wochen sammeln → fließt in Phase 1
3. Entscheidung Preismodell (Familienlizenz vs. Abo) treffen
4. Phase 1 beginnen: **Mehrkind-Profile** (größter Brocken zuerst)
5. Parallel: Anwaltstermin Datenschutz Kinder-App anfragen (Vorlauf!)

---

*Quellen: Apple Small Business Program / Developer Program (15 %,
99 $/Jahr), Google Play Console (25 $ einmalig, 15 %-Programm),
Apple Kids Category & Google Play Families Policy (Kinder-Compliance),
ANTON/solocode (Preis- und Markt-Anker), Marktübersichten deutscher
Lern-Apps 2026. Links im Chat-Verlauf der Planungssession.*
