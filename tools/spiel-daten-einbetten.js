#!/usr/bin/env node
/* ============================================================
   Bettet den Daten-Bereich des Spiels (data/spiel) in index.html ein.
   - validiert fische.json und welten.json (Regeln: siehe schema.md)
   - verkleinert vorhandene Fotos auf max. 640 px (über Chromium/Canvas)
     und bettet sie als Daten-URIs ein -> App bleibt offline-fähig
   Aufruf: node tools/spiel-daten-einbetten.js
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data", "spiel");
const INDEX = path.join(ROOT, "index.html");
const MARK_A = "/* SPIEL-DATEN:ANFANG (generiert aus data/spiel – nicht von Hand ändern) */";
const MARK_B = "/* SPIEL-DATEN:ENDE */";

function fail(msg) { console.error("❌ " + msg); process.exit(1); }

const fische = JSON.parse(fs.readFileSync(path.join(DATA, "fische.json"), "utf8"));
const welten = JSON.parse(fs.readFileSync(path.join(DATA, "welten.json"), "utf8"));
const tennis = JSON.parse(fs.readFileSync(path.join(DATA, "tennis.json"), "utf8"));
const fussball = JSON.parse(fs.readFileSync(path.join(DATA, "fussball.json"), "utf8"));
const schach = JSON.parse(fs.readFileSync(path.join(DATA, "schach.json"), "utf8"));
const blockwelt = JSON.parse(fs.readFileSync(path.join(DATA, "blockwelt.json"), "utf8"));

// ---------- Validierung ----------
const ids = new Set();
for (const f of fische.fische) {
  if (ids.has(f.id)) fail("Fisch-id doppelt: " + f.id);
  ids.add(f.id);
  if (!(f.fragen >= 1 && f.fragen <= 3)) fail(f.id + ": fragen muss 1–3 sein");
  if (!Array.isArray(f.steigerung) || f.steigerung.length !== f.fragen)
    fail(f.id + ": steigerung muss genau " + f.fragen + " Einträge haben");
  if (!f.steigerung.every(s => s === "leicht" || s === "schwer"))
    fail(f.id + ": steigerung darf nur leicht/schwer enthalten");
  if (!["Rotfeder", "Barsch", "Bachforelle", "Schleie", "Zander", "Aal", "Karpfen", "Hecht"].includes(f.zeichnung))
    fail(f.id + ": unbekannte zeichnung " + f.zeichnung);
}
for (const w of welten.welten) {
  const see = w.wasser;
  const anLand = (x, y) => {
    const dx = (x - see.cx) / (see.rx + 10), dy = (y - see.cy) / (see.ry + 10);
    return dx * dx + dy * dy >= 1;
  };
  if (!anLand(w.start.x, w.start.y)) fail(w.id + ": start liegt im Wasser");
  w.spots.forEach((s, i) => { if (!anLand(s.x, s.y)) fail(w.id + ": spot " + i + " liegt im Wasser"); });
  if (w.besatz.length < w.spots.length) fail(w.id + ": besatz (" + w.besatz.length + ") muss mindestens so groß sein wie spots (" + w.spots.length + ")");
  w.besatz.forEach(id => { if (!ids.has(id)) fail(w.id + ": besatz verweist auf unbekannte Fisch-id " + id); });
  if (w.hintergrund && !fs.existsSync(path.join(DATA, w.hintergrund)))
    fail(w.id + ": hintergrund-Datei fehlt: " + w.hintergrund);
}
// Match-Spiele (Tennis/Fußball): Gegner, Fun Facts und die 12 Mentaltrainer-Situationen
function pruefeMatchSpiel(name, daten, mentalPflicht) {
  const gids = new Set();
  for (const g of daten.gegner) {
    if (gids.has(g.id)) fail(name + ": Gegner-id doppelt: " + g.id);
    gids.add(g.id);
    if (!(g.staerke >= 1 && g.staerke <= 3)) fail(name + "/" + g.id + ": staerke muss 1–3 sein");
    if (!g.name || !g.emoji || !g.spruch) fail(name + "/" + g.id + ": name/emoji/spruch fehlt");
  }
  if (daten.gegner.length < 3) fail(name + ": mindestens 3 Gegner nötig");
  if (!Array.isArray(daten.fakten) || daten.fakten.length < 5) fail(name + ": mindestens 5 Fun Facts nötig");
  daten.fakten.forEach((f, i) => { if (!f.begriff || !f.text) fail(name + ": Fakt " + i + " braucht begriff+text"); });
  for (const id of mentalPflicht) {
    const m = daten.mental.find(x => x.id === id);
    if (!m) fail(name + ": Mentaltrainer-Situation fehlt: " + id);
    for (const feld of ["titel", "emoji", "trainieren", "mission", "mut", "punkt", "schluss"])
      if (!m[feld]) fail(name + "/" + id + ": Feld fehlt: " + feld);
    const woerter = [m.trainieren, m.mission, m.mut, m.punkt, m.schluss].join(" ").split(/\s+/).length;
    if (woerter > 150) fail(name + "/" + id + ": zu lang (" + woerter + " Wörter, max. 150)");
  }
  console.log("✅ " + name + " gültig · " + daten.gegner.length + " Gegner · " + daten.fakten.length + " Fun Facts · " + daten.mental.length + " Mentaltrainer-Karten");
}
pruefeMatchSpiel("tennis", tennis, ["training", "match", "fehler", "fehlerserie", "nervositaet",
  "fuehrung", "rueckstand", "tiebreak", "aufschlag", "return", "seitenwechsel", "lob"]);
pruefeMatchSpiel("fussball", fussball, ["training", "match", "fehler", "fehlerserie", "nervositaet",
  "fuehrung", "rueckstand", "elfmeter", "torschuss", "abwehr", "halbzeit", "lob"]);
// Schach: Lektionen (Züge in Langnotation) und Tipp-Aufgaben (Feld antippen)
const ZUG_RE = /^[a-h][1-8][a-h][1-8]$/, FELD_RE = /^[a-h][1-8]$/;
if (!Array.isArray(schach.lektionen) || schach.lektionen.length < 4) fail("schach: mindestens 4 Lektionen nötig");
const lids = new Set();
for (const l of schach.lektionen) {
  if (lids.has(l.id)) fail("schach: Lektion-id doppelt: " + l.id);
  lids.add(l.id);
  if (!l.titel || !l.emoji || !l.intro) fail("schach/" + l.id + ": titel/emoji/intro fehlt");
  if (!Array.isArray(l.schritte)) fail("schach/" + l.id + ": schritte fehlt (darf leer sein)");
  l.schritte.forEach((sch, i) => {
    if (!ZUG_RE.test(sch.zug || "")) fail("schach/" + l.id + ": Schritt " + i + " hat keinen Zug im Format e2e4");
    if (!sch.text) fail("schach/" + l.id + ": Schritt " + i + " ohne Erklärtext");
  });
  (l.marks || []).forEach(m => { if (!FELD_RE.test(m)) fail("schach/" + l.id + ": ungültige Markierung " + m); });
}
if (!Array.isArray(schach.aufgaben) || schach.aufgaben.length < 8) fail("schach: mindestens 8 Aufgaben nötig");
for (const a of schach.aufgaben) {
  if (!a.fen || a.fen.split("/").length !== 8) fail("schach/" + a.id + ": FEN fehlt oder hat keine 8 Reihen");
  if (!FELD_RE.test(a.ziel || "")) fail("schach/" + a.id + ": ziel muss ein Feld wie b5 sein");
  for (const feld of ["frage", "tipp", "erfolg"]) if (!a[feld]) fail("schach/" + a.id + ": Feld fehlt: " + feld);
}
console.log("✅ schach gültig · " + schach.lektionen.length + " Lektionen · " + schach.aufgaben.length + " Aufgaben");
// Blockwelt: Blocktypen, Startwelt und Belohnungsregeln
const bwIds = new Set();
for (const b of blockwelt.bloecke) {
  if (bwIds.has(b.id)) fail("blockwelt: Block-id doppelt: " + b.id);
  bwIds.add(b.id);
  if (!b.name || !/^#[0-9a-fA-F]{6}$/.test(b.farbe || "")) fail("blockwelt/" + b.id + ": name/farbe (Hex) fehlt");
}
if (blockwelt.bloecke.length < 8) fail("blockwelt: mindestens 8 Blocktypen nötig");
if (blockwelt.bloecke.filter(b => b.selten).length < 2) fail("blockwelt: mindestens 2 seltene Blöcke nötig");
const bwS = blockwelt.start || {};
if (!(bwS.breite >= 8 && bwS.breite <= 24 && bwS.hoehe >= 6 && bwS.hoehe <= 16)) fail("blockwelt: start.breite/hoehe außerhalb 8-24/6-16");
(bwS.boden || []).forEach(id => { if (!bwIds.has(id)) fail("blockwelt: boden verweist auf unbekannten Block " + id); });
Object.keys(bwS.inventar || {}).forEach(id => { if (!bwIds.has(id)) fail("blockwelt: inventar verweist auf unbekannten Block " + id); });
if (!(blockwelt.belohnung && blockwelt.belohnung.leicht >= 1 && blockwelt.belohnung.schwer >= 1)) fail("blockwelt: belohnung.leicht/schwer fehlt");
console.log("✅ blockwelt gültig · " + blockwelt.bloecke.length + " Blocktypen · Welt " + bwS.breite + "×" + bwS.hoehe);
console.log("✅ Daten gültig · Welt „" + welten.welten[0].id + "“ · " + welten.welten[0].spots.length + " Spots · Besatz-Pool: " + welten.welten[0].besatz.length + " Fische (pro Runde wird je Spot ein Fisch gezogen)");

// ---------- Bilder einbetten (optional, verkleinert über Chromium) ----------
(async () => {
  const bilder = {};
  const vorhandene = fische.fische.filter(f => f.bild && fs.existsSync(path.join(DATA, f.bild)));
  const hintergruende = welten.welten.filter(w => w.hintergrund && fs.existsSync(path.join(DATA, w.hintergrund)));
  if (vorhandene.length || hintergruende.length) {
    const { chromium } = require("playwright");
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
    const p = await b.newPage();
    const verkleinern = async (datei, max, qualitaet) => {
      const raw = fs.readFileSync(path.join(DATA, datei));
      const mime = datei.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      const src = "data:" + mime + ";base64," + raw.toString("base64");
      return p.evaluate(async ([src2, max2, q2]) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src2; });
        const sc = Math.min(1, max2 / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", q2);
      }, [src, max, qualitaet]);
    };
    for (const f of vorhandene) {
      bilder[f.id] = await verkleinern(f.bild, 640, 0.82);
      console.log("🖼️  " + f.id + ": " + f.bild + " eingebettet (" + Math.round(bilder[f.id].length / 1024) + " KB)");
    }
    for (const w of hintergruende) {
      bilder["welt:" + w.id] = await verkleinern(w.hintergrund, 900, 0.78);
      console.log("🏞️  Welt " + w.id + ": " + w.hintergrund + " als Hintergrund eingebettet (" + Math.round(bilder["welt:" + w.id].length / 1024) + " KB)");
    }
    await b.close();
  } else {
    console.log("ℹ️  Keine Fotos in data/spiel/bilder – die App nutzt die SVG-Zeichnungen.");
  }

  // ---------- In index.html einsetzen ----------
  const daten = { fische: fische.fische, welten: welten.welten,
    tennis: { gegner: tennis.gegner, fakten: tennis.fakten, mental: tennis.mental },
    fussball: { gegner: fussball.gegner, fakten: fussball.fakten, mental: fussball.mental },
    schach: { lektionen: schach.lektionen, aufgaben: schach.aufgaben },
    blockwelt: { bloecke: blockwelt.bloecke, start: blockwelt.start, belohnung: blockwelt.belohnung },
    bilder: bilder };
  const block = MARK_A + "\nconst SPIEL_DATEN = " + JSON.stringify(daten) + ";\n" + MARK_B;
  let html = fs.readFileSync(INDEX, "utf8");
  const a = html.indexOf(MARK_A), bEnd = html.indexOf(MARK_B);
  if (a < 0 || bEnd < 0) fail("Marker in index.html nicht gefunden");
  html = html.slice(0, a) + block + html.slice(bEnd + MARK_B.length);
  fs.writeFileSync(INDEX, html);
  console.log("✅ SPIEL_DATEN in index.html eingebettet (" + Math.round(block.length / 1024) + " KB)");
})();
