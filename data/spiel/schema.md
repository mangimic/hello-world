# Daten-Bereich des See-Abenteuers

Hier liegen **alle Inhalte des Spiels** – getrennt vom App-Code.
Die App selbst bleibt eine einzige Offline-Datei: Das Werkzeug
`tools/spiel-daten-einbetten.js` prüft die Daten und bettet sie
(inkl. verkleinerter Bilder) in `index.html` ein.

## Arbeitsablauf (Inhalte ändern)
1. `fische.json` / `welten.json` bearbeiten oder Fotos in `bilder/` legen
   (Dateiname wie im Feld `bild`, z. B. `bilder/hecht.jpg`).
2. `node tools/spiel-daten-einbetten.js` ausführen
   (validiert alles, verkleinert Bilder auf max. 640 px, bettet ein).
3. `node tests/regression.js` – erst bei 0 Fehlern ausliefern.

## Datenmodell

### fische.json
| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | string, eindeutig | interner Schlüssel (auch Bild-Schlüssel) |
| `name` / `anrede` | string | Anzeige („Hecht" / „ein RIESIGER HECHT beißt an!") |
| `fragen` | 1–3 | wie viele richtige Antworten zum Fang nötig sind |
| `steigerung` | Array je Frage: `"leicht"`\|`"schwer"` | Wortquelle: leicht = Grundwortschatz Kl. 1/2, schwer = Kl. 3/4 |
| `hinweis` | string | Ansage beim Anbeißen („Er ist stark …") |
| `info` | string | Sachwissen nach dem Fang („Wusstest du?") |
| `symbolGroesse` | px | Größe des Fisch-Symbols beim Heranziehen |
| `bild` | Pfad, optional | Foto in `bilder/`; fehlt es, greift die SVG-`zeichnung` |
| `zeichnung` | `Rotfeder`\|`Barsch`\|`Bachforelle`\|`Schleie`\|`Zander`\|`Aal`\|`Karpfen`\|`Hecht` | eingebaute Illustration als Fallback |

Die Fischliste enthält **nur Süßwasserfische aus heimischen
Schwarzwald-Gewässern** (Titisee, Schluchsee, Angelteiche,
Schwarzwaldbäche) – belegt durch Recherche (hochschwarzwald.de,
schwarzwald-tourismus.info, blinker.de).

### welten.json
| Feld | Typ | Bedeutung |
|---|---|---|
| `feld` | breite/hoehe | Spielfeld-Koordinatensystem |
| `hintergrund` | Pfad, optional | Foto in `bilder/` als Spielfeld-Hintergrund (wird auf max. 900 px verkleinert eingebettet); ohne Foto zeichnet die App die grüne Wiese |
| `wasser` | ellipse cx/cy/rx/ry | begehbar ist nur das Land drumherum; bei Foto-Hintergrund auf die Wasserfläche im Bild abstimmen |
| `start` | x/y | Startposition der Figur (muss an Land liegen) |
| `spots` | Liste x/y | Angelplätze (an Land, direkt antippbar) |
| `besatz` | Liste von Fisch-`id`s | Fisch-Pool der Welt – pro Runde wird gemischt und je Spot **ein** Fisch gezogen; so kommen über mehrere Runden alle Arten dran |
| `deko` | emoji/x/y/groesse | Schmuck-Elemente auf dem Feld |

### tennis.json (Tennis-Match)
| Feld | Typ | Bedeutung |
|---|---|---|
| `gegner` | Liste | Match-Gegner: `id`, `name`, `emoji`, `staerke` (1–3; Stärke 3 = nur schwere Wörter), `spruch` (Vorstellung) – rotiert über die Matches |
| `fakten` | Liste | Tennis-Wissen („Wusstest du?"): `begriff` + `text` – kindgerecht, recherchiert (srf.ch/kids, klexikon.zum.de, tennis.de, tennisfinale.com) |
| `mental` | Liste | die 12 Mentaltrainer-Karten (Kinder-Mentaltraining): `id`, `titel`, `emoji` und die 5 Bausteine `trainieren` (⭐), `mission` (🎯), `mut` (💬), `punkt` (🎾), `schluss` (🏆) |

Pflicht-Situationen in `mental`: `training`, `match`, `fehler`, `fehlerserie`,
`nervositaet`, `fuehrung`, `rueckstand`, `tiebreak`, `aufschlag`, `return`,
`seitenwechsel`, `lob`. Jede Karte: kurze Sätze, Kinderbilder (Löwe, Adler,
Ninja, Superman, Tennismagnet), max. 150 Wörter, kein Gewinn-Druck.
Fun Facts („Wusstest du?") gibt es bewusst **nur** zu Angel-Wissen
(Fische) und Tennis-Wissen – die Übungswörter kommen überall aus dem
Grundwortschatz.

## Regeln (werden vom Werkzeug geprüft)
- Fisch-`id`s eindeutig; `fragen` = Länge von `steigerung` (max. 3).
- Jeder `besatz`-Eintrag verweist auf eine existierende Fisch-`id`;
  Anzahl `besatz` ≥ Anzahl `spots`.
- `hintergrund` muss (falls angegeben) als Datei existieren.
- `start` und alle `spots` liegen an Land (außerhalb des Wassers).
- Bilder: JPG/PNG; werden auf max. 640 px Breite verkleinert und als
  Daten-URI eingebettet (App bleibt offline-fähig). Nur eigene oder
  ausdrücklich frei nutzbare Fotos verwenden.
