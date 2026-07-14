# 📱 Planung: Vom Prototyp zur Store-App („Lernprofi“)

Stand: Juli 2026 · Status: **Planungssession, noch keine Entscheidung**
Ziel: Freie Version + Vollversion in Google Play & Apple App Store,
angepeilter Preis **4,99 € einmalig pro Kind**.

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

**Empfehlung:** Preis als „4,99 € einmalig – für alle Kinder der
Familie (bis 4 Profile)“ positionieren. Das ist ehrlich, technisch
sauber und ein Verkaufsargument statt eines Support-Ärgernisses.

**Wettbewerbs-Anker (ernst zu nehmen):** Marktführer **ANTON** ist
komplett kostenlos (20 Mio.+ Nutzer, Klasse 1–10), das Plus-Abo kostet
nur **10 €/Jahr**. Über 75.000 Lern-Apps konkurrieren im Kinderbereich.
4,99 € einmalig ist daher preislich okay – aber die App verkauft sich
nur über einen klaren Unterschied: **persönlicher als ANTON**
(Mutmacher/Coach Leo, Lese-Check für Lesemuffel, Time-Boxing,
Eltern-Kontrolle, künftig KI-Personalisierung – siehe BACKLOG).

### Vorschlag Free/Voll-Aufteilung

| | 🆓 Frei | ⭐ Vollversion (4,99 €) |
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
| **2 – Store-Technik** | App-Hülle mit **Capacitor** (eine Codebasis → iOS + Android), **In-App-Kauf** (StoreKit 2 / Play Billing – für digitale Inhalte PFLICHT, externe Zahlung verboten), Kauf-Wiederherstellung, **Parental Gate** vor Kauf/Links (Kids-Pflicht), Store-Assets (Icon, Screenshots je Gerätegröße, Beschreibungstexte) | 15–20 PT |
| **3 – Recht & Compliance** | Gewerbeanmeldung, Impressum/AGB/**Datenschutzerklärung für Kinder-App vom Anwalt** (Apple Kids Category + Google Families Policy verlangen u. a.: keine Werbung/Tracking, Datenminimierung, Privacy-Links), Altersfreigabe über IARC-Fragebogen (kostenlos), Steuer klären (Stores treten als Händler auf und führen die MwSt ab) | 5–8 PT + Anwalt |
| **4 – Submission & Launch** | Einreichung beide Stores; **Kids-Kategorie wird streng geprüft** – 1–3 Review-Schleifen einplanen; Beta über TestFlight / Play-Testtrack mit den Freunden | 3–6 PT |
| **5 – Betrieb** | Updates (unsere Regression-Pipeline hilft massiv), Support-Postfach, Bewertungen beantworten, Marketing (Eltern-Blogs, Lehrer-Communities, Schul-Newsletter) | laufend, ~2 PT/Monat |

**Technik-Entscheidung Capacitor:** Die App bleibt eine Web-Codebasis
(unser größtes Asset – 178 Tests, eine Datei), bekommt aber echte
Store-Builds. Alternative „TWA“ ginge nur für Android. Der PWA-Weg
(GitHub Pages) bleibt parallel als kostenloser Kanal bestehen.

## 4. Business Case

### 4.1 Was von 4,99 € übrig bleibt

| Schritt | Betrag |
|---|---|
| Verkaufspreis (brutto, DE) | 4,99 € |
| − 19 % MwSt (führt der Store ab) | −0,80 € |
| − 15 % Store-Provision (Small-Business-Programm, gilt bis 1 Mio. $ Umsatz/Jahr; Apple 99 $/Jahr Konto, Google 25 $ einmalig) | −0,63 € |
| **Netto-Erlös pro Verkauf** | **≈ 3,56 €** |

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

### 4.3 Einnahmen-Szenarien (Jahr 1)

Annahme: Freemium-Konversion bei Kinder-Lern-Apps typisch **1–3 %**.

| Szenario | Downloads J1 | Konversion | Verkäufe | Umsatz (netto) |
|---|---|---|---|---|
| 🐢 Vorsichtig | 5.000 | 1,5 % | 75 | **≈ 270 €** |
| 🚶 Basis | 25.000 | 2 % | 500 | **≈ 1.780 €** |
| 🚀 Optimistisch | 100.000 | 3 % | 3.000 | **≈ 10.700 €** |

**Break-even (nur Cash-Kosten, ohne eigene Zeit):**
- Einmalig 1.400–4.400 € + Jahr-1-Betrieb ≈ 2.200–5.700 €
- ⇒ **~620 bis ~1.600 Verkäufe** nötig – zwischen Basis- und
  optimistischem Szenario.

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

### 4.5 Alternativen zum Einmalkauf (zur Diskussion)

1. **9,99 €/Jahr Familien-Abo** – ANTON-Plus-Anker, wiederkehrender
   Umsatz, finanziert später die KI-Kosten. Nachteil: Abo-Müdigkeit.
2. **4,99 € einmalig (Familienlizenz)** – wie geplant, einfachste
   Kommunikation, kein Abo-Frust. Nachteil: kein wiederkehrender Umsatz.
3. **Hybrid:** Einmalkauf 4,99 € + späteres optionales KI-Add-on als
   Abo (deckt API-Kosten). ⇒ **Empfehlung: mit (2) starten, (3) offenhalten.**

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
