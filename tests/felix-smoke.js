#!/usr/bin/env node
/* ============================================================
   Smoke-Test für Apfel-Igel (felix/index.html).

   Aufruf:   node tests/felix-smoke.js
   Voraussetzung: npm install playwright (Chromium vorhanden oder
   CHROMIUM_PATH auf eine Chromium-Binärdatei setzen)
   Exit-Code 0 = alles grün, 1 = mindestens ein Test rot.

   Prüft: App lädt fehlerfrei, Avatar-Editor speichert Tier/Farbe/
   Name, Schatzkarte zeigt 100 Stationen + Truhe (1 offen),
   Level-Konfiguration steigt sinnvoll an, Level 1 ist mit einem
   Autopiloten gewinnbar, Sterne + Freischaltung werden gespeichert,
   Verhungern führt zum Game-Over.
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
  check("Level 1: 25s überleben, keine Kokosnuss/Möwe, kein Wind",
    cfg.l1.time === 25 && cfg.l1.kokosP === 0 && cfg.l1.gullEvery === 0 && cfg.l1.wind === 0);
  check("Schwierigkeit steigt (Tempo, Zeit, Hunger, Spawnrate)",
    cfg.l100.fallSpeed > cfg.l50.fallSpeed && cfg.l50.fallSpeed > cfg.l1.fallSpeed &&
    cfg.l100.time >= cfg.l50.time && cfg.l50.time > cfg.l1.time &&
    cfg.l100.drain > cfg.l1.drain && cfg.l100.spawn < cfg.l1.spawn);
  check("Level 30 ist ein Nacht-Level, Level 100 auch",
    cfg.l30.night === true && cfg.l100.night === true && cfg.l50.wind > 0);
  const zones = await page.evaluate(() => {
    const z = window.__felixTest.zoneOf;
    return [z(1).id, z(20).id, z(21).id, z(45).id, z(70).id, z(81).id, z(100).id,
      window.__felixTest.ZONES.length];
  });
  check("5 Orte: Strand bis L20, dann Dschungel/Berge/Vulkan, Schatzbucht ab L81",
    zones[7] === 5 && zones[0] === "strand" && zones[1] === "strand" &&
    zones[2] === "dschungel" && zones[3] === "berge" && zones[4] === "vulkan" &&
    zones[5] === "bucht" && zones[6] === "bucht", JSON.stringify(zones));

  // ---------- Avatar-Editor ----------
  section("Avatar-Editor");
  await page.click("#btn-avatar");
  await page.waitForTimeout(200);
  const avUI = await page.evaluate(() => ({
    animals: document.querySelectorAll(".av-animal").length,
    colors: document.querySelectorAll(".av-color").length
  }));
  check("8 Tiere und 6 Farben zur Auswahl", avUI.animals === 8 && avUI.colors === 6,
    JSON.stringify(avUI));
  const lockedStart = await page.evaluate(() => ({
    locked: document.querySelectorAll(".av-animal.locked").length,
    hint: document.querySelector("#av-hint").textContent
  }));
  check("4 neue Tiere anfangs gesperrt (Hinweis: ab Level 45)",
    lockedStart.locked === 4 && lockedStart.hint.includes("45"), JSON.stringify(lockedStart));
  const lockedL45 = await page.evaluate(() => {
    const t = window.__felixTest;
    t.store.data.unlocked = 45; t.openAvatar(false);
    const n = document.querySelectorAll(".av-animal.locked").length;
    t.store.data.unlocked = 1; t.openAvatar(false);   // zurücksetzen für die restlichen Tests
    return n;
  });
  check("Ab Level 45 sind alle 8 Tiere frei", lockedL45 === 0, "locked=" + lockedL45);
  await page.click('.av-animal[data-animal="krabbe"]');
  await page.evaluate(() => document.querySelectorAll(".av-color")[2].click());
  await page.fill("#av-name", "Felix");
  await page.click("#btn-av-save");
  await page.waitForTimeout(200);
  const av = await page.evaluate(() => JSON.parse(localStorage.getItem("felix.apfeligel")).avatar);
  check("Avatar gespeichert (Krabbe, blau, Name Felix)",
    av.animal === "krabbe" && av.color === "#54a9ff" && av.name === "Felix", JSON.stringify(av));
  check("Startbildschirm begrüßt mit Namen", await page.evaluate(() =>
    document.querySelector("#start-stars").textContent.includes("Felix")));

  // ---------- Schatzkarte ----------
  section("Schatzkarte");
  await page.click("#btn-levels");
  await page.waitForTimeout(300);
  const grid = await page.evaluate(() => ({
    total: document.querySelectorAll(".lvl-btn").length,
    locked: document.querySelectorAll(".lvl-btn.locked").length,
    night: document.querySelectorAll(".lvl-btn.night").length,
    treasure: document.querySelectorAll(".lvl-btn.treasure").length,
    deco: document.querySelectorAll(".map-deco").length,
    zoneLabels: document.querySelectorAll(".map-zone").length,
    path: !!document.querySelector("#map-inner svg polyline")
  }));
  check("100 Stationen auf der Karte, 99 gesperrt", grid.total === 100 && grid.locked === 99,
    `total=${grid.total} locked=${grid.locked}`);
  check("8 Nacht-Level markiert (30,40,…,100)", grid.night === 8, "night=" + grid.night);
  check("Schatztruhe bei Level 100, Pfad + Deko vorhanden",
    grid.treasure === 1 && grid.path && grid.deco >= 8, JSON.stringify(grid));
  check("5 Orts-Schilder auf der Karte", grid.zoneLabels === 5, "labels=" + grid.zoneLabels);

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
      for (const a of g.apples) if ((a.type === "rot" || a.type === "gold") && (!best || a.y > best.y)) best = a;
      if (best) g.player.tx = best.x;
    }, 40);
  });
  await page.waitForFunction(() => window.__felixTest.game.state === "won", null, { timeout: 45000 })
    .catch(() => {});
  await page.evaluate(() => clearInterval(window.__autopilot));
  const g1 = await page.evaluate(() => {
    const g = window.__felixTest.game;
    return { state: g.state, caught: g.caught, lives: g.lives, energy: g.energy };
  });
  check("Level 1 überlebt (Zeit abgelaufen, Äpfel gegessen)",
    g1.state === "won" && g1.caught > 0 && g1.energy > 0,
    `state=${g1.state} caught=${g1.caught} energy=${Math.round(g1.energy)}`);
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

  // ---------- Verhungern -> Game Over ----------
  section("Game Over");
  await page.evaluate(() => {
    const g = window.__felixTest.game;
    g.timeScale = 4;
    g.energy = 10;        // fast verhungert ...
    g.cfg.spawn = 9999;   // ... und es fallen keine Äpfel mehr
    g.player.tx = -500;
  });
  await page.waitForFunction(() => window.__felixTest.game.state === "lost", null, { timeout: 30000 })
    .catch(() => {});
  const g2 = await page.evaluate(() => ({
    state: window.__felixTest.game.state, energy: window.__felixTest.game.energy
  }));
  check("Nichts gegessen -> verhungert -> verloren", g2.state === "lost" && g2.energy <= 0,
    `state=${g2.state} energy=${Math.round(g2.energy)}`);
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

  // ---------- Insel-Laden + Panzer ----------
  section("Insel-Laden");
  await page.evaluate(() => { window.__felixTest.store.data.coins = 50; window.__felixTest.openShop(); });
  await page.waitForTimeout(200);
  const shop = await page.evaluate(() => ({
    cards: document.querySelectorAll(".shop-card").length,
    coins: document.querySelector("#shop-coins").textContent
  }));
  check("3 Panzer im Laden, Münzstand sichtbar", shop.cards === 3 && shop.coins.includes("50"),
    JSON.stringify(shop));
  await page.click('.shop-buy[data-tier="1"]');
  await page.waitForTimeout(200);
  const bought = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("felix.apfeligel"));
    return { coins: d.coins, panzer: d.panzer };
  });
  check("Holz-Panzer gekauft (10 Münzen bezahlt)", bought.coins === 40 && bought.panzer === 1,
    JSON.stringify(bought));

  section("Panzer blockt Kokosnuss");
  await page.evaluate(() => {
    const t = window.__felixTest;
    t.startLevel(10);
    const g = t.game;
    g.apples.length = 0; g.cfg.spawn = 9999; g.cfg.gullEvery = 0;
    g.apples.push({ x: g.player.x, y: t.stackTopY() - 40, vy: 220, type: "kokos", rot: 0, spin: 0 });
  });
  await page.waitForTimeout(700);
  const blocked = await page.evaluate(() => ({
    lives: window.__felixTest.game.lives, shield: window.__felixTest.game.shield
  }));
  check("Kokosnuss abgeblockt: alle Herzen da, Panzer verbraucht",
    blocked.lives === 3 && blocked.shield === 0, JSON.stringify(blocked));

  section("Münze fangen");
  const coinsBefore = await page.evaluate(() => window.__felixTest.store.data.coins);
  await page.evaluate(() => {
    const t = window.__felixTest, g = t.game;
    g.apples.push({ x: g.player.x, y: t.stackTopY() - 40, vy: 220, type: "muenze", rot: 0, spin: 4 });
  });
  await page.waitForTimeout(700);
  const coinsAfter = await page.evaluate(() => window.__felixTest.store.data.coins);
  check("Münze gefangen -> +1 Münze", coinsAfter === coinsBefore + 1,
    `vorher=${coinsBefore} nachher=${coinsAfter}`);

  // ---------- Querformat (iPad) ----------
  section("Querformat");
  const ctxL = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const pl = await ctxL.newPage();
  pl.on("pageerror", (e) => errors.push("Querformat: " + e));
  await pl.goto(APP);
  await pl.waitForTimeout(400);
  await pl.evaluate(() => window.__felixTest.startLevel(1));
  await pl.waitForTimeout(300);
  const ws = await pl.evaluate(() => window.__felixTest.worldSize());
  check("Spielfeld breit + volle Höhe (W=960, H=800, seitliche Ränder)",
    Math.round(ws.W) === 960 && ws.H === 800 && ws.offX > 0, JSON.stringify(ws));
  const caughtL = await pl.evaluate(async () => {
    const t = window.__felixTest, g = t.game;
    g.apples.length = 0; g.cfg.spawn = 9999; g.cfg.gullEvery = 0;
    const before = g.caught;
    g.apples.push({ x: g.player.x, y: t.stackTopY() - 40, vy: 220, type: "rot", rot: 0, spin: 0 });
    await new Promise((r) => setTimeout(r, 600));
    return g.caught - before;
  });
  check("Apfel fangen klappt im Querformat", caughtL === 1, "gefangen=" + caughtL);
  const wsP = await pl.evaluate(async () => {
    // zurück ins Hochformat simulieren
    return window.__felixTest.worldSize();
  });
  await ctxL.close();

  // ---------- kleines Handy hochkant ----------
  section("Schmales Handy");
  const ctxS = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const ps = await ctxS.newPage();
  ps.on("pageerror", (e) => errors.push("Handy: " + e));
  await ps.goto(APP);
  await ps.waitForTimeout(400);
  await ps.evaluate(() => window.__felixTest.startLevel(1));
  await ps.waitForTimeout(300);
  const wsS = await ps.evaluate(() => window.__felixTest.worldSize());
  check("Hochformat weiterhin ok (H=800, Breite 400-500)",
    wsS.H === 800 && wsS.W >= 400 && wsS.W <= 500, JSON.stringify(wsS));
  await ctxS.close();

  // ---------- Mein Haus ----------
  section("Mein Haus");
  await page.evaluate(() => { window.__felixTest.store.data.holz = 20; window.__felixTest.openHaus(); });
  await page.waitForTimeout(200);
  const haus0 = await page.evaluate(() => ({
    status: document.querySelector("#haus-status").textContent,
    btn: document.querySelector("#btn-haus-bauen").textContent,
    disabled: document.querySelector("#btn-haus-bauen").disabled
  }));
  check("Haus-Bereich zeigt Bauteil 1 (Fundament, baubar)",
    haus0.status.includes("1 von 8") && haus0.status.includes("Fundament") && !haus0.disabled,
    JSON.stringify(haus0));
  await page.click("#btn-haus-bauen");
  await page.waitForTimeout(200);
  const haus1 = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("felix.apfeligel"));
    return { haus: d.haus, holz: d.holz, status: document.querySelector("#haus-status").textContent };
  });
  check("Fundament gebaut (5 Holz bezahlt, Teil 2 dran)",
    haus1.haus === 1 && haus1.holz === 15 && haus1.status.includes("2 von 8"),
    JSON.stringify(haus1));

  section("Holz fangen");
  const holzBefore = await page.evaluate(() => {
    const t = window.__felixTest;
    t.startLevel(3);
    const g = t.game;
    g.apples.length = 0; g.cfg.spawn = 9999; g.cfg.gullEvery = 0;
    g.apples.push({ x: g.player.x, y: t.stackTopY() - 40, vy: 220, type: "holz", rot: 0, spin: 0 });
    return t.store.data.holz;
  });
  await page.waitForTimeout(700);
  const holzAfter = await page.evaluate(() => window.__felixTest.store.data.holz);
  check("Holzbrett gefangen -> +1 Holz", holzAfter === holzBefore + 1,
    `vorher=${holzBefore} nachher=${holzAfter}`);

  section("Abschluss");
  check("Keine JS-Fehler insgesamt", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log(`\n${pass} Tests grün, ${fail} rot.`);
  if (fail) { failures.forEach((f) => console.log("  ❌ " + f)); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
