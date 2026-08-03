# Roadmap – Vorbereitung auf die große Erweiterung

Bestandsaufnahme (Stand v1.22.0) gegen die Ziel-Anforderungen.
Legende: ✅ vorhanden · 🟡 teilweise · ❌ fehlt

## 1. Pädagogische Kerninhalte
| Anforderung | Status | Anmerkung |
|---|---|---|
| Lehrplan-Bezug | 🟡 | Deutsch stark (amtl. Grundwortschatz BW, Kompass 4, Bildungsplan-Themen). Mathe/Sachunterricht/Englisch fehlen. |
| Klassenstufen 1–4 | 🟡 | Auswahl 3/4/Alle vorhanden; Klasse 1+2 fehlt (K1/2-Wörter des GWS aber schon als Stufe 1 enthalten). |
| Stufenaufbau leicht→schwer | ✅ | Level-System 1–3 je Bereich, erspielbar oder im Elternbereich festlegbar. |
| Multimedial (Text/Audio/Bild) | 🟡 | Text ✅, Illustrationen ✅ (v1.21). Audio ❌ – Vorlesefunktion in v1.5 entfernt, in Git-Historie reaktivierbar (für Klasse 1 Pflicht). |
| Fehlerkultur | ✅ | Strategie-Tipps, 2. Versuch, Lösung mit Begründung, keine Noten, Klicker-Bremse. |

## 2. Gamification & Motivation
| Anforderung | Status | Anmerkung |
|---|---|---|
| Belohnungssysteme | 🟡 | Stufen, Konfetti, Krone, Blumentopf. Fehlt: Sammel-System (Sterne/Sticker) + druckbare Urkunde. |
| Lern-Avatare | ❌ | Nur Namensfeld. |
| Storyline | ❌ | Keine Rahmenhandlung. |
| Mini-Spiele | 🟡 | Interaktive Einheiten (Ordnen, Zutaten-Check) sind spielerisch; Pausen-Minispiele + Timeboxing fehlen. |

## 3. Technik & kindgerechte Bedienung
| Anforderung | Status | Anmerkung |
|---|---|---|
| Intuitives Design | ✅ | Große Buttons, Emojis, Bottom-Nav, Zurück, Antwort-Pflicht. |
| Sprachausgabe | ❌ | Entfernt (v1.5), reaktivierbar (Web Speech API, offlinefähig). |
| Offline-Modus | ✅ | PWA (network-first SW), localStorage, installierbar. |
| Barrierefreiheit | ❌ | Keine Schriftgrößen-/Kontrast-Einstellung, keine LRS-Optimierung. Vorhanden: prefers-reduced-motion. |

## 4. Sicherheit & Datenschutz (stärkste Kategorie)
| Anforderung | Status | Anmerkung |
|---|---|---|
| Werbefreiheit | ✅ | Keine externen Requests. |
| Keine In-App-Käufe | ✅ | |
| Datensparsamkeit | ✅ | Kein Server/Tracking/Konto; nur freiwilliger Vorname lokal. |
| Zertifizierungen | 🟡 | Faktisch DSGVO-unkritisch; Datenschutz-Seite in der App fehlt (einfach). Siegel = externer Antragsprozess. |

## 5. Eltern- & Lehrerbereich
| Anforderung | Status | Anmerkung |
|---|---|---|
| Lernstandsanalyse | 🟡 | Stufen/Durchläufe/Kronen gespeichert, aber kein Dashboard und keine historisierten Rundenergebnisse. |
| Zeitbegrenzung | ❌ | Timer/Sperre fehlt (Timeboxing im Backlog). |
| Profilverwaltung | ❌ | Nur ein Profil; Geschwister-Profile = Store-Refactoring (größter Umbau). |
| Individuelle Zuweisung | 🟡 | Stufen-Steuerung + eigene Wortlisten ✅; „Aufgaben des Tages" fehlt. |

## Empfohlene Reihenfolge
1. **Quick Wins:** Sprachausgabe reaktivieren · Schriftgröße/Kontrast-Einstellungen · druckbare Urkunde · Datenschutz-Seite
2. **Mittel:** Lernstands-Dashboard (setzt dauerhafte Ergebnis-Speicherung voraus) · Zeitbegrenzung · Sticker-/Sternesammlung · Pausen-Minispiele
3. **Groß:** **Mehrere Kinderprofile zuerst** (Store-Refactor – Dashboard/Belohnungen sollen pro Profil liegen) · Klasse 1/2 · Mathe als zweites Fach (Modul-System ist vorbereitet) · Avatar & Storyline
4. **Extern:** Siegel/Zertifizierung (kein Code)

Jede Ausbaustufe läuft wie gewohnt über den Regressionstest
(`node tests/regression.js`) und die Versionierung (siehe BACKLOG.md).
