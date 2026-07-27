#!/usr/bin/env node
/* ============================================================
   Smoke-Test für Leons Spielewelt (leon/index.html).

   Aufruf:   node tests/leon-smoke.js
   Voraussetzung: npm install playwright (Chromium vorhanden oder
   CHROMIUM_PATH auf eine Chromium-Binärdatei setzen)
   Exit-Code 0 = alles grün, 1 = mindestens ein Test rot.

   Prüft: App lädt fehlerfrei, alle 7 Bereiche öffnen sich,
   Puzzle/Formen per Drag lösbar, Zahlen-Aufgabe lösbar,
   Nachfahren (Ziffer 1 + gerade Linie) lösbar, Sterne zählen hoch.
   ============================================================ */
const path = require("path");
const { chromium } = require("playwright");

const APP = "file://" + path.resolve(__dirname, "..", "leon", "index.html");
const EXE = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log("  ✅ " + name); }
  else { fail++; failures.push(name + (detail ? " – " + detail : "")); console.log("  ❌ " + name + (detail ? " – " + detail : "")); }
}
function section(t) { console.log("\n== " + t + " =="); }

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(APP);
  await page.waitForTimeout(400);

  section("Laden");
  check("App geladen (__leonReady)", await page.evaluate(() => window.__leonReady === true));
  check("Keine JS-Fehler beim Laden", errors.length === 0, errors.join(" | "));

  const openGame = async (name) => {
    await page.evaluate(() => {
      if (document.querySelector("#overlay.active")) document.querySelector("#ov-next").click();
      const home = document.querySelector(".screen.active .btn-home");
      if (home) home.click();
    });
    await page.waitForTimeout(150);
    await page.click(`[data-game="${name}"]`);
    await page.waitForTimeout(300);
  };
  const overlayActive = () => page.evaluate(() => document.querySelector("#overlay").classList.contains("active"));
  const closeOverlay = async () => { await page.click("#ov-next"); await page.waitForTimeout(200); };
  const stars = () => page.evaluate(() => JSON.parse(localStorage.getItem("leon.stars") || "0"));

  // ---------- Puzzle ----------
  section("Puzzle");
  await page.click('[data-game="puzzle"]');
  await page.waitForTimeout(400);
  let cellCount = await page.evaluate(() => document.querySelectorAll(".pz-cell").length);
  let tileCount = await page.evaluate(() => document.querySelectorAll(".pz-tile").length);
  check("2x2-Raster mit 4 Teilen", cellCount === 4 && tileCount === 4, `cells=${cellCount} tiles=${tileCount}`);
  for (let i = 0; i < 4; i++) {
    const move = await page.evaluate(() => {
      const tile = document.querySelector(".pz-tile:not(.placed)");
      if (!tile) return null;
      const idx = tile.dataset.index;
      const cell = document.querySelector(`.pz-cell[data-index="${idx}"]`);
      const tr = tile.getBoundingClientRect(), cr = cell.getBoundingClientRect();
      return { fx: tr.x + tr.width / 2, fy: tr.y + tr.height / 2, tx: cr.x + cr.width / 2, ty: cr.y + cr.height / 2 };
    });
    if (!move) break;
    await page.mouse.move(move.fx, move.fy);
    await page.mouse.down();
    await page.mouse.move(move.tx, move.ty, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
  check("Puzzle gelöst -> Erfolgs-Overlay", await overlayActive());
  check("1 Stern verdient", (await stars()) === 1, "stars=" + (await stars()));
  await closeOverlay();

  // ---------- Zahlen finden ----------
  section("Zahlen finden");
  await openGame("zahlen");
  for (let t = 0; t < 3; t++) {
    // richtige Karte anklicken (probieren, falsche geben nur Wobble)
    for (let k = 0; k < 3; k++) {
      const done = await page.evaluate(() => !!document.querySelector(".zl-card.correct"));
      if (done) break;
      await page.evaluate((k) => {
        const cards = document.querySelectorAll(".zl-card");
        if (cards[k] && !cards[k].disabled) cards[k].click();
      }, k);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1100);
  }
  await page.waitForTimeout(600);
  check("3 Aufgaben gelöst -> Erfolgs-Overlay", await overlayActive());
  await closeOverlay();

  // ---------- Zahlen schreiben (Ziffer 1) ----------
  section("Zahlen schreiben");
  await openGame("schreiben");
  const sbTrace = await page.evaluate(() => {
    const cv = document.querySelector("#sb-canvas");
    const r = cv.getBoundingClientRect();
    // Ziffer 1: (0.32,0.32)->(0.52,0.12)->(0.52,0.88), transformiert x'=0.3+0.4x, y'=0.06+0.88y
    const pts = [{ x: 0.32, y: 0.32 }, { x: 0.52, y: 0.12 }, { x: 0.52, y: 0.88 }]
      .map((p) => ({ x: r.x + (0.3 + p.x * 0.4) * r.width, y: r.y + (0.06 + p.y * 0.88) * r.height }));
    return pts;
  });
  await page.mouse.move(sbTrace[0].x, sbTrace[0].y);
  await page.mouse.down();
  await page.mouse.move(sbTrace[1].x, sbTrace[1].y, { steps: 15 });
  await page.mouse.move(sbTrace[2].x, sbTrace[2].y, { steps: 30 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  check("Ziffer 1 nachgefahren -> Erfolgs-Overlay", await overlayActive());
  await closeOverlay();

  // ---------- Schlangenlinien (gerade Linie) ----------
  section("Schlangenlinien");
  await openGame("linien");
  const lnRect = await page.evaluate(() => {
    const r = document.querySelector("#ln-canvas").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(lnRect.x + 0.08 * lnRect.w, lnRect.y + 0.5 * lnRect.h);
  await page.mouse.down();
  await page.mouse.move(lnRect.x + 0.92 * lnRect.w, lnRect.y + 0.5 * lnRect.h, { steps: 40 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  check("Linie nachgefahren -> Erfolgs-Overlay", await overlayActive());
  await closeOverlay();

  // ---------- Formen ----------
  section("Formen");
  await openGame("formen");
  const shapeCount = await page.evaluate(() => document.querySelectorAll(".fm-shape").length);
  check("3 Formen im Tablett", shapeCount === 3, "shapes=" + shapeCount);
  for (let i = 0; i < 3; i++) {
    const move = await page.evaluate(() => {
      const el = document.querySelector(".fm-shape:not(.placed)");
      if (!el) return null;
      const hole = document.querySelector(`.fm-hole[data-shape="${el.dataset.shape}"]`);
      const er = el.getBoundingClientRect(), hr = hole.getBoundingClientRect();
      return { fx: er.x + er.width / 2, fy: er.y + er.height / 2, tx: hr.x + hr.width / 2, ty: hr.y + hr.height / 2 };
    });
    if (!move) break;
    await page.mouse.move(move.fx, move.fy);
    await page.mouse.down();
    await page.mouse.move(move.tx, move.ty, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(900);
  check("Alle Formen versenkt -> Erfolgs-Overlay", await overlayActive());
  await closeOverlay();

  // ---------- Wege ----------
  section("Der richtige Weg");
  await openGame("wege");
  const wgOk = await page.evaluate(() => {
    const q = document.querySelector("#wg-question").textContent;
    const cv = document.querySelector("#wg-canvas");
    return q.includes("Welcher Weg") && cv.width > 100;
  });
  check("Wege-Runde aufgebaut (Frage + Canvas)", wgOk);

  // ---------- Album ----------
  section("Sticker-Album");
  await openGame("album");
  const albumOk = await page.evaluate(() => document.querySelectorAll(".sticker").length === 30);
  const unlocked = await page.evaluate(() => document.querySelectorAll(".sticker:not(.locked)").length);
  check("30 Sticker-Plätze, 1 freigeschaltet (5 Sterne)", albumOk && unlocked === 1, "unlocked=" + unlocked);

  section("Abschluss");
  check("5 Sterne gesammelt", (await stars()) === 5, "stars=" + (await stars()));
  check("Keine JS-Fehler insgesamt", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log(`\n${pass} Tests grün, ${fail} rot.`);
  if (fail) { failures.forEach((f) => console.log("  ❌ " + f)); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
