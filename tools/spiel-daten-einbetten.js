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
  if (!["Rotfeder", "Zander", "Hecht"].includes(f.zeichnung))
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
  if (w.besatz.length !== w.spots.length) fail(w.id + ": besatz (" + w.besatz.length + ") ≠ spots (" + w.spots.length + ")");
  w.besatz.forEach(id => { if (!ids.has(id)) fail(w.id + ": besatz verweist auf unbekannte Fisch-id " + id); });
}
const gesamt = welten.welten[0].besatz.reduce((a, id) => a + fische.fische.find(f => f.id === id).fragen, 0);
console.log("✅ Daten gültig · Welt „" + welten.welten[0].id + "“ · " + welten.welten[0].spots.length + " Spots · " + gesamt + " Fragen pro Runde");

// ---------- Bilder einbetten (optional, verkleinert über Chromium) ----------
(async () => {
  const bilder = {};
  const vorhandene = fische.fische.filter(f => f.bild && fs.existsSync(path.join(DATA, f.bild)));
  if (vorhandene.length) {
    const { chromium } = require("playwright");
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
    const p = await b.newPage();
    for (const f of vorhandene) {
      const raw = fs.readFileSync(path.join(DATA, f.bild));
      const mime = f.bild.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      const src = "data:" + mime + ";base64," + raw.toString("base64");
      const uri = await p.evaluate(async (src2) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src2; });
        const max = 640, sc = Math.min(1, max / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", 0.82);
      }, src);
      bilder[f.id] = uri;
      console.log("🖼️  " + f.id + ": " + f.bild + " eingebettet (" + Math.round(uri.length / 1024) + " KB)");
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
