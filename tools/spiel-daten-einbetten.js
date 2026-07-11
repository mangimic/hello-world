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
  const daten = { fische: fische.fische, welten: welten.welten, bilder: bilder };
  const block = MARK_A + "\nconst SPIEL_DATEN = " + JSON.stringify(daten) + ";\n" + MARK_B;
  let html = fs.readFileSync(INDEX, "utf8");
  const a = html.indexOf(MARK_A), bEnd = html.indexOf(MARK_B);
  if (a < 0 || bEnd < 0) fail("Marker in index.html nicht gefunden");
  html = html.slice(0, a) + block + html.slice(bEnd + MARK_B.length);
  fs.writeFileSync(INDEX, html);
  console.log("✅ SPIEL_DATEN in index.html eingebettet (" + Math.round(block.length / 1024) + " KB)");
})();
