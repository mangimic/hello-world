#!/usr/bin/env node
/* ============================================================
   Smoke-Test für Apfel-Igel (felix/index.html).

   Aufruf:   node tests/felix-smoke.js
   Voraussetzung: npm install playwright (Chromium vorhanden oder
   CHROMIUM_PATH auf eine Chromium-Binärdatei setzen)
   Exit-Code 0 = alles grün, 1 = mindestens ein Test rot.

   Prüft: App lädt fehlerfrei, 100 Level in der Auswahl (1 offen),
   Level-Konfiguration steigt sinnvoll an, Level 1 ist mit einem
   Autopiloten gewinnbar, Sterne + Freischaltung werden gespeichert,
   verpasste Äpfel kosten Herzen bis zum Game-Over.
   ============================================================ */
const path = require("path");
const { chromium } = require("playwright");

const APP = "file://" + path.resolve(__dirname, "..", "felix", "index.html");
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
  check("App geladen (__felixReady)", await page.evaluate(() => window.__felixReady === true));
  check("Keine JS-Fehler beim Laden", errors.length === 0, errors.join(" | "));

  // ---------- Level-Konfiguration ----------
  section("Level-Konfiguration");
  const cfg = await page.evaluate(() => {
    const c = window.__felixTest.levelConfig;
    return { l1: c(1), l30: c(30), l50: c(50), l100: c(100) };
  });
  check("Level 1: 10 Äpfel, keine Wespe, kein Wind",
    cfg.l1.goal === 10 && cfg.l1.waspEvery === 0 && cfg.l1.wind === 0 && cfg.l1.faulP === 0);
  check("Schwierigkeit steigt (Tempo, Ziel, Spawnrate)",
    cfg.l100.fallSpeed > cfg.l50.fallSpeed && cfg.l50.fallSpeed > cfg.l1.fallSpeed &&
    cfg.l100.goal >= cfg.l50.goal && cfg.l50.goal > cfg.l1.goal &&
    cfg.l100.spawn < cfg.l1.spawn);
  check("Level 30 ist ein Nacht-Level, Level 100 auch",
    cfg.l30.night === true && cfg.l100.night === true && cfg.l50.wind > 0);

  // ---------- Levelauswahl ----------
  section("Levelauswahl");
  await page.click("#btn-levels");
  await page.waitForTimeout(200);
  const grid = await page.evaluate(() => ({
    total: document.querySelectorAll(".lvl-btn").length,
    locked: document.querySelectorAll(".lvl-btn.locked").length,
    night: document.querySelectorAll(".lvl-btn.night").length
  }));
  check("100 Level-Knöpfe, 99 gesperrt", grid.total === 100 && grid.locked === 99,
    `total=${grid.total} locked=${grid.locked}`);
  check("8 Nacht-Level markiert (30,40,…,100)", grid.night === 8, "night=" + grid.night);

  // ---------- Level 1 mit Autopilot gewinnen ----------
  section("Level 1 spielen (Autopilot)");
  await page.click('.lvl-btn[data-level="1"]');
  await page.waitForTimeout(300);
  check("Spiel läuft (state=playing)",
    await page.evaluate(() => window.__felixTest.game.state === "playing"));
  await page.evaluate(() => {
    const g = window.__felixTest.game;
    g.timeScale = 3; // Test-Zeitraffer
    window.__autopilot = setInterval(() => {
      if (g.state !== "playing") return;
      let best = null;
      for (const a of g.apples) if (a.type !== "faul" && (!best || a.y > best.y)) best = a;
      if (best) g.hedge.tx = best.x;
    }, 40);
  });
  await page.waitForFunction(() => window.__felixTest.game.state === "won", null, { timeout: 45000 })
    .catch(() => {});
  await page.evaluate(() => clearInterval(window.__autopilot));
  const g1 = await page.evaluate(() => {
    const g = window.__felixTest.game;
    return { state: g.state, caught: g.caught, lives: g.lives };
  });
  check("Level 1 gewonnen (10 Äpfel gefangen)", g1.state === "won" && g1.caught >= 10,
    `state=${g1.state} caught=${g1.caught}`);
  await page.waitForTimeout(1200);
  check("Erfolgs-Overlay mit Weiter-Knopf", await page.evaluate(() =>
    document.querySelector("#overlay").classList.contains("active") && !!document.querySelector("#ov-next")));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("felix.apfeligel")));
  check("Fortschritt gespeichert (Level 2 offen, Sterne notiert)",
    saved.unlocked === 2 && saved.stars["1"] >= 1, JSON.stringify(saved));

  // ---------- Weiter zu Level 2 ----------
  section("Level 2 startet");
  await page.click("#ov-next");
  await page.waitForTimeout(300);
  const l2 = await page.evaluate(() => ({
    level: window.__felixTest.game.level, state: window.__felixTest.game.state
  }));
  check("Level 2 läuft", l2.level === 2 && l2.state === "playing", JSON.stringify(l2));

  // ---------- Herzen verlieren -> Game Over ----------
  section("Game Over");
  await page.evaluate(() => {
    const g = window.__felixTest.game;
    g.timeScale = 4;
    g.hedge.tx = -500; // Igel in die Ecke -> Äpfel fallen daneben
  });
  await page.waitForFunction(() => window.__felixTest.game.state === "lost", null, { timeout: 30000 })
    .catch(() => {});
  const g2 = await page.evaluate(() => window.__felixTest.game.state);
  check("3 verpasste Äpfel -> verloren", g2 === "lost", "state=" + g2);
  await page.waitForTimeout(1200);
  check("Nochmal-Knopf im Overlay", await page.evaluate(() =>
    document.querySelector("#overlay").classList.contains("active") && !!document.querySelector("#ov-retry")));

  // ---------- Levelauswahl zeigt Fortschritt ----------
  section("Fortschritt sichtbar");
  await page.click("#ov-levels");
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    locked: document.querySelectorAll(".lvl-btn.locked").length,
    total: document.querySelector("#lvl-total").textContent
  }));
  check("Level 2 jetzt freigeschaltet (98 gesperrt)", after.locked === 98, "locked=" + after.locked);
  check("Sterne-Zähler zeigt Fortschritt", /⭐ [1-3]\/300/.test(after.total), after.total);

  section("Abschluss");
  check("Keine JS-Fehler insgesamt", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log(`\n${pass} Tests grün, ${fail} rot.`);
  if (fail) { failures.forEach((f) => console.log("  ❌ " + f)); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
