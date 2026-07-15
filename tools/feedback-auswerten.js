#!/usr/bin/env node
/* ============================================================
   Wertet gesammeltes Beta-Feedback aus.

   Arbeitsablauf:
   1. Eingegangene Feedback-Mails/-Nachrichten als Textdateien in
      einen Ordner legen (z. B. feedback/), eine Datei je Rückmeldung
      (einfach den Mail-Text hineinkopieren – der Datenblock
      ##LP-FEEDBACK##…##ENDE## wird automatisch gefunden,
      auch mehrere Blöcke pro Datei).
   2. node tools/feedback-auswerten.js feedback/
   3. Ausgabe: Anzahl, Durchschnitts-Sterne je Frage, Verteilungen
      und alle Freitexte gruppiert – als Grundlage für die nächste
      Prototyp-Iteration.
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ziel = process.argv[2] || "feedback";
let dateien = [];
try {
  const st = fs.statSync(ziel);
  dateien = st.isDirectory()
    ? fs.readdirSync(ziel).filter(f => !f.startsWith(".")).map(f => path.join(ziel, f))
    : [ziel];
} catch (e) {
  console.error("Ordner/Datei nicht gefunden: " + ziel +
    "\nAufruf: node tools/feedback-auswerten.js <ordner-oder-datei>");
  process.exit(1);
}

const eintraege = [];
for (const datei of dateien) {
  const text = fs.readFileSync(datei, "utf8");
  const treffer = text.match(/##LP-FEEDBACK##([\s\S]*?)##ENDE##/g) || [];
  for (const t of treffer) {
    try {
      eintraege.push({ datei: path.basename(datei),
        d: JSON.parse(t.replace("##LP-FEEDBACK##", "").replace("##ENDE##", "")) });
    } catch (e) {
      console.error("⚠️  Datenblock in " + datei + " nicht lesbar – übersprungen.");
    }
  }
}
if (!eintraege.length) { console.log("Keine Feedback-Datenblöcke gefunden."); process.exit(0); }

const FRAGEN = { bedienung: "Bedienung (Kind allein)", spass: "Spaß",
  lernen: "Lerneffekt", eltern: "Elternbereich" };
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : null;
const balken = v => v == null ? "(keine Angaben)" : "★".repeat(Math.round(v)) + "☆".repeat(5 - Math.round(v)) + "  Ø " + v.toFixed(1);
const zaehle = (arr) => { const m = {}; arr.forEach(v => { const k = v == null ? "(k. A.)" : String(v); m[k] = (m[k] || 0) + 1; }); return m; };

console.log("================ BETA-FEEDBACK-AUSWERTUNG ================");
console.log("Rückmeldungen: " + eintraege.length + " (aus " + dateien.length + " Datei(en))\n");

console.log("-- Sterne-Bewertungen --");
for (const [id, name] of Object.entries(FRAGEN)) {
  const werte = eintraege.map(e => (e.d.sterne || {})[id]).filter(v => v >= 1);
  console.log("  " + name.padEnd(26) + balken(avg(werte)) + "  (" + werte.length + " Angaben)");
}

console.log("\n-- Verteilungen --");
console.log("  Klasse des Kindes: ", zaehle(eintraege.map(e => e.d.klasseKind)));
console.log("  Nutzungshäufigkeit:", zaehle(eintraege.map(e => e.d.nutzung)));
console.log("  App-Version:       ", zaehle(eintraege.map(e => (e.d.app || {}).version)));

const fehlerBereiche = {};
eintraege.forEach(e => (e.d.bereiche || []).forEach(b => { fehlerBereiche[b] = (fehlerBereiche[b] || 0) + 1; }));
if (Object.keys(fehlerBereiche).length) {
  console.log("\n-- Fehler-Bereiche (angetippt, Mehrfachnennung möglich) --");
  Object.entries(fehlerBereiche).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log("  " + k.padEnd(18) + v));
}

const nutz = eintraege.map(e => e.d.app).filter(a => a && a.runden);
if (nutz.length) {
  const rundenSumme = {};
  nutz.forEach(a => Object.entries(a.runden).forEach(([k, v]) => { rundenSumme[k] = (rundenSumme[k] || 0) + v; }));
  const top = Object.entries(rundenSumme).sort((a, b) => b[1] - a[1]);
  console.log("\n-- Meistgeübte Bereiche (Summe Runden, " + nutz.length + " Datensätze) --");
  top.slice(0, 12).forEach(([k, v]) => console.log("  " + k.padEnd(18) + v));
}

for (const [feld, titel] of [["gut", "WAS GEFÄLLT"], ["stoert", "WAS STÖRT/FEHLT"], ["fehler", "FEHLER-MELDUNGEN"]]) {
  const texte = eintraege.map(e => ({ q: e.datei, t: ((e.d.texte || {})[feld] || "").trim() })).filter(x => x.t && x.t !== "-");
  console.log("\n-- " + titel + " (" + texte.length + ") --");
  texte.forEach(x => console.log("  • [" + x.q + "] " + x.t.replace(/\s+/g, " ")));
}
console.log("\n===========================================================");
