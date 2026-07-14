#!/usr/bin/env node
/* ============================================================
   Voll automatisierter Regressionstest der Lern-App.
   Läuft vor JEDER Bereitstellung eines neuen Features.

   Aufruf:   node tests/regression.js
   Voraussetzung: npm install playwright  (Chromium vorhanden oder
   CHROMIUM_PATH auf eine Chromium-Binärdatei setzen)
   Exit-Code 0 = alles grün, 1 = mindestens ein Test rot.
   ============================================================ */
const path = require("path");
const { chromium } = require("playwright");

const APP = "file://" + path.resolve(__dirname, "..", "index.html");
const EXE = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log("  ✅ " + name); }
  else { fail++; failures.push(name + (detail ? " – " + detail : "")); console.log("  ❌ " + name + (detail ? " – " + detail : "")); }
}
function section(t) { console.log("\n== " + t + " =="); }

(async () => {
  // ---------- 0) Syntax ----------
  section("Syntax");
  const fs = require("fs");
  const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  let synOk = true;
  try { new Function(m[1]); } catch (e) { synOk = false; check("JS-Syntax", false, e.message); }
  if (synOk) check("JS-Syntax", true);

  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push("PAGE: " + e.message));
  page.on("console", msg => { if (msg.type() === "error") errs.push("CONSOLE: " + msg.text()); });
  page.on("dialog", d => d.accept());

  const fresh = async () => { await page.goto(APP); await page.waitForTimeout(200);
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(220); };
  const setLevel = async l => { await page.locator(`#levelRow .level-btn[data-level="${l}"]`).click(); await page.waitForTimeout(60); };
  const openMod = async (label, section2) => {
    // Neue Start-UX: Lernfelder liegen in Gruppen, Spiele in der Spielhalle
    await page.evaluate((l) => {
      const norm = s2 => (s2 || "").replace(/\u00AD/g, "");
      const id = Object.keys(MODULES).find(k => norm(MODULES[k].name).includes(l));
      if (SPIELE_IDS.includes(id)) openSpielhalle();
      else openGruppe(MODUL_GRUPPEN.find(g => g.module.includes(id)).id);
    }, label);
    await page.waitForTimeout(90);
    await page.locator("#moduleContent .choice >> text=" + label).first().click(); await page.waitForTimeout(90);
    if (section2) { await page.locator("#bottomNav >> text=" + section2).first().click(); await page.waitForTimeout(90); }
  };
  // Lese-Gate bestehen: warten bis Mindest-Lesezeit um, bestätigen, Lücken-Frage lösen
  const passGate = async (scope) => {
    const pre = scope ? scope + " " : "";
    await page.waitForFunction(sc => {
      const root = sc ? document.querySelector(sc) : document;
      if (!root) return false;
      const b = [...root.querySelectorAll(".gate-row button")].find(x => x.textContent.includes("Habe ich gelesen"));
      return b && !b.disabled;
    }, scope || null, { timeout: 25000 });
    await page.locator(pre + ".gate-row >> text=Habe ich gelesen").click();
    await page.waitForTimeout(140);
    if (await page.locator(pre + '.gate-opt[data-ok="1"]').count()) {
      await page.locator(pre + '.gate-opt[data-ok="1"]').first().click();
      await page.waitForTimeout(100);
    }
  };
  // Mutmacher-Dialog durchtippen: Blasen aufdecken, dann den eigenen Mut-Satz antippen
  const tapDialog = async (scope) => {
    const pre = scope ? scope + " " : "";
    for (let k = 0; k < 8; k++) {
      const w = page.locator(pre + ".mut-weiter");
      if (await w.count() && await w.isVisible().catch(() => false)) {
        await w.click(); await page.waitForTimeout(60); continue;
      }
      break;
    }
    const sag = page.locator(pre + ".bubble.sag");
    if (await sag.count()) { await sag.first().click(); await page.waitForTimeout(100); }
  };
  const closeOverlay = async () => { await page.waitForTimeout(380);
    if (await page.locator("#levelUp.show").count()) { const t = (await page.locator("#lvlupTitle").textContent()).trim();
      await page.locator("#lvlupClose").click(); await page.waitForTimeout(100); return t; } return null; };

  // ---------- 1) Start & Klassenfilter ----------
  section("Start & Klassenfilter");
  await fresh();
  check("Startseite sichtbar", (await page.locator("#screen-home.active").count()) > 0);
  check("Aufgeräumte Startseite: 3 Gruppen + Spielhalle statt Kachelwand",
    (await page.locator("#moduleChooser .choice").count()) === 4
    && (await page.locator("#moduleChooser .choice.spielhalle").count()) === 1);
  for (const l of [3, 4, 0]) {
    await setLevel(l);
    const shown = await page.evaluate(lv => {
      let n = 0;
      MODUL_GRUPPEN.forEach(g => {
        openGruppe(g.id);
        n += document.querySelectorAll("#gruppenGrid .choice").length;
      });
      openSpielhalle();
      n += document.querySelectorAll("#spielhalleGrid .choice").length;
      goHome();
      return n;
    }, l);
    const expect = await page.evaluate(lv => Object.keys(MODULES).filter(id => lv === 0 || (MODUL_KLASSE[id] || [3, 4]).includes(lv)).length, l);
    check(`Klassenfilter ${l === 0 ? "Alle" : "Klasse " + l}: ${shown} Felder in Gruppen+Spielhalle`, shown === expect, `erwartet ${expect}`);
  }

  // ---------- 2) Antwort-Pflicht & Feedback (alle 10 Lernfelder) ----------
  section("Antwort-Pflicht & korrektes Feedback");
  const MODS = [
    { label: "Subjekte", box: "#sbox", fb: "#sfb", get: 'subjSaetze()[subjIdx].subj', tap: true },
    { label: "Prädikat", box: "#pbox", fb: "#pfb", get: 'praedSaetze()[praedIdx].praed', tap: true },
    { label: "Wörtliche Rede", box: "#rbox", fb: "#rfb", get: 'redeSaetze()[redeIdx].rede', tap: true },
    { label: "Satzglieder", box: "#gbox", fb: "#gfb", get: 'satzgliedSaetze()[sgIdx].subj', tap: true },
    { label: "Zeitformen", fb: "#zfb", mc: 'zeitSaetze()[zeitIdx].form', map: { praesens: "#praesBtn", praeteritum: "#praetBtn", perfekt: "#perfBtn", futur: "#futBtn" } },
    { label: "Wortarten", fb: "#wafb", mc: 'waSaetze()[waIdx].art', map: { nomen: "#nomenBtn", verb: "#verbBtn", adjektiv: "#adjBtn" } },
    { label: "Groß & klein", lvl: 3, box: "#gkbox", fb: "#gkfb", get: 'gkSaetze()[gkIdx].gross', tap: true },
    { label: "das / dass", lvl: 4, fb: "#ddfb", mc: 'ddSaetze()[ddIdx].loesung', map: { das: "#dasBtn", dass: "#dassBtn" } },
    { label: "Die 4 Fälle", lvl: 4, fb: "#fafb", mc: 'faelleSaetze()[faelleIdx].fall', map: { nom: "#nomBtn", gen: "#genBtn", dat: "#datBtn", akk: "#akkBtn" } },
    { label: "Doppelte Mitlaute", lvl: 3, fb: "#dofb", doppel: true },
  ];
  for (const mo of MODS) {
    await fresh(); await setLevel(mo.lvl || 4); await openMod(mo.label, "Üben");
    // a) Weiter ohne Antwort blockiert
    await page.locator("#nextBtn").click(); await page.waitForTimeout(70);
    const hint = (await page.locator(mo.fb).textContent().catch(() => "")).trim();
    check(mo.label + ": ohne Antwort blockiert", /zuerst/i.test(hint), hint.slice(0, 40));
    // b) richtige Antwort -> positives Feedback
    if (mo.tap) {
      const idxs = await page.evaluate(g => eval(g), mo.get);
      for (const i of idxs) await page.locator(mo.box + " .word").nth(i).click();
      await page.locator("#checkBtn").click(); await page.waitForTimeout(60);
      if (mo.label === "Satzglieder") { // zweiphasig: jetzt noch das Prädikat
        const pr = await page.evaluate(() => satzgliedSaetze()[sgIdx].praed);
        for (const i of pr) await page.locator(mo.box + " .word").nth(i).click();
        await page.locator("#checkBtn").click(); await page.waitForTimeout(60);
      }
    } else if (mo.mc) {
      const v = await page.evaluate(g => eval(g), mo.mc);
      await page.locator(mo.map[v]).click(); await page.waitForTimeout(60);
    } else if (mo.doppel) {
      const richtig = await page.evaluate(() => doppelWoerter()[doppelIdx].richtig);
      const opts = page.locator("#linksBtn, #rechtsBtn");
      const t0 = (await opts.nth(0).textContent()).trim();
      await (t0 === richtig ? opts.nth(0) : opts.nth(1)).click(); await page.waitForTimeout(60);
    }
    const fb2 = (await page.locator(mo.fb).textContent()).trim();
    check(mo.label + ": richtige Antwort erkannt", /Richtig|Geschafft|🌟/.test(fb2), fb2.slice(0, 40));
    // c) Stufen-Hinweis sichtbar
    const badge = (await page.locator("#moduleContent .lvl-badge").first().textContent().catch(() => ""));
    check(mo.label + ": Stufen-Hinweis sichtbar", /Aktive Stufe \d\/\d/.test(badge), badge);
  }

  // ---------- 3) Auswertung, Blume & Zurück ----------
  section("Auswertung, Blume & Zurück-Button");
  await fresh(); await setLevel(4); await openMod("Subjekte", "Üben");
  const solveSubj = async () => { let g = 0; while (g++ < 25) { if (await page.locator("#runAgain").count()) break;
    const idxs = await page.evaluate(() => subjSaetze()[subjIdx].subj);
    for (const i of idxs) await page.locator("#sbox .word").nth(i).click();
    await page.locator("#checkBtn").click(); await page.waitForTimeout(20);
    await page.locator("#nextBtn").click(); await page.waitForTimeout(25); } };
  await solveSubj();
  let ovl = await closeOverlay();
  check("Level-Up-Feier nach gemeisterter Runde", ovl !== null, String(ovl));
  let txt = (await page.locator("#moduleContent").textContent()).replace(/\s+/g, " ");
  const fm = txt.match(/Auf Anhieb richtig:\s*(\d+)\s*von\s*(\d+)/) || [];
  check("Auswertung: volle Punktzahl", fm[1] === fm[2] && +fm[1] > 0, fm[1] + "/" + fm[2]);
  const svg = await page.locator("#moduleContent svg").first().innerHTML();
  check("Blume: volle Blüte bei 100 %", /ef8fb3/.test(svg));
  check("Auswertung hat Zurück-Button", (await page.locator("#runBack").count()) > 0);
  await page.locator("#runBack").click(); await page.waitForTimeout(90);
  check("Zurück führt zur Startseite", (await page.locator("#screen-home.active").count()) > 0);
  // leerer Topf bei 0 gelöst (alles falsch beantworten)
  await openMod("Wortarten", "Üben");
  let g2 = 0; while (g2++ < 15) { if (await page.locator("#runAgain").count()) break;
    const art = await page.evaluate(() => waSaetze()[waIdx].art);
    await page.locator(art === "nomen" ? "#verbBtn" : "#nomenBtn").click(); await page.waitForTimeout(20);
    await page.locator("#nextBtn").click(); await page.waitForTimeout(1250); } // Sperre nach Fehler abwarten
  const svg0 = await page.locator("#moduleContent svg").first().innerHTML();
  check("Blume: leerer Topf bei 0 gelöst", !/ef8fb3/.test(svg0) && !/M30 44 V/.test(svg0));
  check("Zurück-Button im Inhaltsbereich sichtbar", await page.locator("#backBtn").isVisible());

  // ---------- 4) Grundwortschatz: amtliche Wörter, Pakete, Stufen ----------
  section("Grundwortschatz");
  await fresh(); await setLevel(3); await openMod("Grundwortschatz", "Üben");
  let st = await page.evaluate(() => ({ lvl: fieldLevel("gws:dopp"), n: fieldPool("gws:dopp").length, w: fieldPool("gws:dopp")[0].richtig }));
  check("Stufe 1 = leichte amtliche Wörter (33)", st.lvl === 1 && st.n === 33 && st.w === "bitten", JSON.stringify(st));
  const solveChunk = async () => { let g = 0; while (g++ < 15) { if (await page.locator("#runAgain").count()) break;
    const richtig = await page.evaluate(() => gwsChunk("gws:" + GWS_KATEGORIEN[gwsCatIdx].id).S[gwsIdx].richtig);
    const opts = page.locator(".gws-opt"); const t0 = (await opts.nth(0).textContent()).trim();
    await (t0 === richtig ? opts.nth(0) : opts.nth(1)).click(); await page.waitForTimeout(18);
    await page.locator("#gwsNext").click(); await page.waitForTimeout(22); } };
  await solveChunk();
  ovl = await closeOverlay();
  check("GWS: Stufe 2 freigeschaltet", ovl === "Stufe 2 freigeschaltet!", String(ovl));
  await page.locator("#runAgain").click(); await page.waitForTimeout(160);
  st = await page.evaluate(() => ({ lvl: fieldLevel("gws:dopp"), n: fieldPool("gws:dopp").length, w: fieldPool("gws:dopp")[0].richtig }));
  check("Stufe 2 = schwere amtliche Wörter (49)", st.lvl === 2 && st.n === 49 && st.w === "beginnen", JSON.stringify(st));

  // ---------- 5) Elternbereich: Wörter ----------
  section("Elternbereich: Wörter");
  await fresh();
  await page.locator("#adminLink").click(); await page.waitForTimeout(150);
  await page.locator('.chip[data-tab="woerter"]').click(); await page.waitForTimeout(150);
  await page.locator('#admLeicht .adm-row input[data-f="richtig"]').first().fill("die Prüfung");
  const fi = page.locator('#admLeicht .adm-row input[data-f="falsch"]').first();
  await fi.fill("die Prüfunk"); await fi.blur(); await page.waitForTimeout(150);
  check("Wort ändern wirkt", await page.evaluate(() => gwsLists(GWS_KATEGORIEN[0]).leicht.some(w => w.richtig === "die Prüfung")));
  await page.reload(); await page.waitForTimeout(220);
  check("Wort-Änderung übersteht Reload", await page.evaluate(() => gwsLists(GWS_KATEGORIEN[0]).leicht.some(w => w.richtig === "die Prüfung")));
  await page.locator("#adminLink").click(); await page.waitForTimeout(140);
  await page.locator('.chip[data-tab="woerter"]').click(); await page.waitForTimeout(140);
  await page.locator("#admReset").click(); await page.waitForTimeout(140);
  check("Reset auf amtliche Liste", await page.evaluate(() => gwsLists(GWS_KATEGORIEN[0]).leicht.some(w => w.richtig === "bitten")));

  // ---------- 6) Elternbereich: Stufen mit Speichern ----------
  section("Elternbereich: Stufen-Steuerung");
  await fresh();
  await page.locator("#adminLink").click(); await page.waitForTimeout(150);
  await page.locator('.seg[data-scope="global"][data-v="3"]').click(); await page.waitForTimeout(100);
  check("Vor dem Speichern: Einstellung NICHT aktiv", await page.evaluate(() => fieldLevel("subj") === 1 || fieldLevel("subj") === 2));
  check("Hinweis „nicht gespeichert“", (await page.locator("#moduleContent").textContent()).includes("nicht gespeichert"));
  await page.locator("#stufenSave").click(); await page.waitForTimeout(150);
  check("Nach Speichern: bestätigt", (await page.locator("#moduleContent").textContent()).includes("Gespeichert"));
  let lv = await page.evaluate(() => ({ s: fieldLevel("subj"), sp: fieldPool("subj").length, d: fieldLevel("gws:dopp"), dp: fieldPool("gws:dopp").length }));
  check("Global=3 überall aktiv", lv.s === 3 && lv.sp === 16 && lv.d === 3 && lv.dp === 82, JSON.stringify(lv));
  await page.reload(); await page.waitForTimeout(220);
  lv = await page.evaluate(() => fieldLevel("subj"));
  check("Stufen überstehen Reload", lv === 3, "Stufe " + lv);
  // Badge in der Übung zeigt festgelegte Stufe
  await setLevel(3); await openMod("Subjekte", "Üben");
  const badge2 = (await page.locator("#moduleContent .lvl-badge").first().textContent());
  check("Übung zeigt „Aktive Stufe 3/3 📌“", /Aktive Stufe 3\/3/.test(badge2) && badge2.includes("📌"), badge2);
  // Bereichs-Override schlägt Global
  await page.locator("#backBtn").click(); await page.waitForTimeout(90);
  await page.locator("#adminLink").click(); await page.waitForTimeout(140);
  await page.locator('.seg[data-scope="feld:gws:dopp"][data-v="1"]').click(); await page.waitForTimeout(90);
  await page.locator("#stufenSave").click(); await page.waitForTimeout(140);
  lv = await page.evaluate(() => ({ d: fieldLevel("gws:dopp"), s: fieldLevel("subj") }));
  check("Bereich schlägt Global", lv.d === 1 && lv.s === 3, JSON.stringify(lv));
  // Verwerfen-Knopf
  await page.locator('.seg[data-scope="global"][data-v="1"]').click(); await page.waitForTimeout(90);
  await page.locator("#stufenDiscard").click(); await page.waitForTimeout(120);
  lv = await page.evaluate(() => fieldLevel("subj"));
  check("Verwerfen stellt gespeicherten Stand wieder her", lv === 3, "Stufe " + lv);

  // ---------- 7) Kompass ----------
  section("Kompass");
  await fresh(); await setLevel(4); await openMod("Kompass", "Lesen");
  await page.locator("#qnext").click(); await page.waitForTimeout(70);
  check("Kompass: ohne Antwort blockiert", (await page.locator("#qfb").textContent()).includes("Wähle zuerst"));
  let g3 = 0; while (g3++ < 12) { if (await page.locator("#qagain").count()) break;
    if (!(await page.locator("#quizHost >> text=Lösung zeigen").count())) {
      await page.locator("#quizHost .quiz-opt").first().click(); await page.waitForTimeout(30); }
    await page.locator("#qnext").click(); await page.waitForTimeout(40); }
  check("Kompass: Auswertung erreicht", (await page.locator("#qagain").count()) > 0);
  check("Kompass: Zurück-Button vorhanden", (await page.locator("#qback").count()) > 0);

  // ---------- 8) Arbeitsblatt ----------
  section("Arbeitsblatt");
  await fresh(); await setLevel(4); await openMod("Subjekte", "Blatt");
  const ws = (await page.locator("#worksheet").first().textContent()).replace(/\s+/g, " ");
  check("Blatt zeigt Klassen-Abzeichen", ws.includes("Klasse 4"));
  check("Blatt nutzt Stufen-Wörter (K4 schwer)", ws.includes("Hahn") || ws.includes("Schwester"));

  // ---------- 8pre) v1.23: kleine Blume, Vorlesen, Lese-Gate, See-Spiel ----------
  section("Kleine Ergebnis-Blume");
  await fresh(); await setLevel(4); await openMod("Subjekte", "Üben");
  let gp = 0;
  while (gp++ < 25) {
    if (await page.locator("#runAgain").count()) break;
    const idxs = await page.evaluate(() => subjSaetze()[subjIdx].subj);
    for (const i of idxs) await page.locator("#sbox .word").nth(i).click();
    await page.locator("#checkBtn").click(); await page.waitForTimeout(20);
    await page.locator("#nextBtn").click(); await page.waitForTimeout(25);
  }
  await closeOverlay();
  const potW = await page.locator(".result-pot svg").first().evaluate(el => el.getBoundingClientRect().width);
  check("Blume in Auswertung ≤ 100px", potW <= 100, Math.round(potW) + "px");

  section("Vorlesen & Lese-Bestätigung");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; });
  await openMod("Subjekte", null);
  check("Vorlesen-Knöpfe auf Erklär-Seite", (await page.locator(".speak-btn").count()) > 0);
  check("CTA gesperrt vor Bestätigung", await page.locator("#toUeben").isDisabled());
  await passGate();
  check("CTA frei nach Bestätigung", !(await page.locator("#toUeben").isDisabled()));
  await page.locator("#toUeben").click(); await page.waitForTimeout(90);
  check("Übung erreichbar nach Gate", (await page.locator("#sbox").count()) > 0);

  // ---------- Lese-Check gegen Schummeln ----------
  section("Lese-Check (Anti-Schummel)");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; });
  await openMod("Subjekte", null);
  check("Bestätigen erst nach Mindest-Lesezeit möglich", await page.evaluate(() => {
    const b = [...document.querySelectorAll(".gate-row button")].find(x => x.textContent.includes("Habe ich gelesen"));
    return b && b.disabled; }));
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll(".gate-row button")].find(x => x.textContent.includes("Habe ich gelesen"));
    return b && !b.disabled; }, null, { timeout: 25000 });
  await page.locator(".gate-row >> text=Habe ich gelesen").click(); await page.waitForTimeout(140);
  check("Lücken-Frage aus dem Text (3 Wörter)", (await page.locator(".gate-opt").count()) === 3);
  await page.locator(".gate-opt:not([data-ok])").first().click(); await page.waitForTimeout(120);
  check("Falsches Wort: bleibt gesperrt + Hinweis", await page.locator("#toUeben").isDisabled()
    && (await page.locator(".gate-fb").textContent()).includes("genau"));
  await page.locator('.gate-opt[data-ok="1"]').click(); await page.waitForTimeout(120);
  check("Richtiges Wort: freigeschaltet", !(await page.locator("#toUeben").isDisabled()));
  // Einstellung „aus": sofort bestätigen, keine Frage
  await page.evaluate(() => { store.leseKontrolle = "aus"; save(); goHome(); });
  await page.waitForTimeout(120);
  await openMod("Prädikat", null);
  await page.locator(".gate-row >> text=Habe ich gelesen").click(); await page.waitForTimeout(120);
  check("Einstellung „aus“: sofort frei ohne Frage", !(await page.locator("#toLesen, #toUeben").first().isDisabled())
    && (await page.locator(".gate-opt").count()) === 0);

  section("See-Abenteuer");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; store.muenzen = 9; save(); });
  await openMod("See-Abenteuer", null);
  check("Spielfeld mit See", (await page.locator("#spielFeld").count()) > 0);
  check("Steuerkreuz (4 Richtungen)", (await page.locator("#spielPad button").count()) === 4);
  check("Daten-Bereich eingebettet (SPIEL_DATEN + Repo)", await page.evaluate(() =>
    typeof SPIEL_DATEN === "object" && SPIEL_DATEN.fische.length >= 8 && !!SpielRepo.welt() && SpielRepo.welt().spots.length === 5));
  check("Nur Schwarzwald-Süßwasserfische im Datenmodell", await page.evaluate(() => {
    const soll = ["rotfeder", "barsch", "bachforelle", "schleie", "zander", "aal", "karpfen", "hecht"];
    return soll.every(id => SPIEL_DATEN.fische.some(f => f.id === id)); }));
  check("Foto-Hintergrund (echter See) eingebettet + im Feld", await page.evaluate(() =>
    (SpielRepo.bild("welt:see") || "").startsWith("data:image/") && !!document.querySelector("#spielFeld image")));
  check("Besatz: je Spot ein Fisch aus dem Pool gezogen", await page.evaluate(() =>
    spiel.fids.length === SpielRepo.welt().spots.length &&
    spiel.fids.every(id => { const f = SpielRepo.fisch(id); return f && f.fragen >= 1 && f.fragen <= 3; })));
  const gesamtSoll = await page.evaluate(() => spiel.fids.reduce((a, id) => a + SpielRepo.fisch(id).fragen, 0));
  const b0 = await page.evaluate(() => spiel.x);
  await page.locator('#spielPad button[data-d="right"]').click(); await page.waitForTimeout(70);
  check("D-Pad bewegt die Figur", (await page.evaluate(() => spiel.x)) > b0);
  check("See blockiert Durchlaufen", await page.evaluate(() => { spiel.x = 30; spiel.y = 190; // fern der Angelplätze
    for (let k = 0; k < 20; k++) spielMove(14, 0); return !spielImSee(spiel.x, spiel.y) && spiel.x < 100; }));
  // Angelplatz antippen -> automatisch hinlaufen -> Einwurf -> Frage
  await page.locator('[data-spot="2"]').click();
  const angekommen = await page.waitForFunction(() => spiel.aktiv === 2, null, { timeout: 9000 }).then(() => true).catch(() => false);
  check("Spot antippen: hinlaufen + Einwurf + Frage", angekommen);
  check("Schnur startet beim Angler", await page.evaluate(() => { const l = $("spielLine");
    return Math.abs(+l.getAttribute("x1") - spiel.x) < 2 && Math.abs(+l.getAttribute("y1") - spiel.y) < 2; }));
  // Alle 5 Fische fangen (1-3 Fragen je Größe, Weiter-Knopf, Steigerung, Bild)
  async function fange(spot) {
    const size = await page.evaluate(() => SpielRepo.fisch(spiel.fids[spiel.aktiv]).fragen);
    for (let st = 0; st < size; st++) {
      await page.waitForFunction(() => spiel.aktiv >= 0 && !spiel.busy && document.querySelector(".spiel-opt:not([disabled])"), null, { timeout: 9000 });
      if (st === 0) check2first = check2first || true;
      const meta = await page.evaluate(() => ({ richtig: spiel.frage.w.richtig, schwer: spiel.frage.schwer, bild: !!document.querySelector('#spielQ svg[aria-label]') }));
      if (st === 0 && !meta.bild) check("Fisch-Bild in der Frage", false);
      if (st > 0 && !meta.schwer) check("Steigerung: Folgefrage ist schwer", false);
      const so = page.locator(".spiel-opt"); const t0 = (await so.nth(0).textContent()).trim();
      await (t0 === meta.richtig ? so.nth(0) : so.nth(1)).click();
      await page.waitForFunction(() => { const w2 = document.getElementById("spielWeiter"); return w2 && !w2.disabled; }, null, { timeout: 9000 });
      await page.locator("#spielWeiter").click();
      await page.waitForTimeout(90);
    }
    await page.waitForFunction(sp => spiel.done[sp] === true, spot, { timeout: 9000 });
  }
  let check2first = false;
  // Hinweis bleibt stehen: einmal absichtlich falsch antworten
  await page.waitForFunction(() => spiel.aktiv === 2 && !spiel.busy && document.querySelector(".spiel-opt:not([disabled])"), null, { timeout: 9000 });
  const falsch = await page.evaluate(() => spiel.frage.w.falsch);
  const soX = page.locator(".spiel-opt"); const tX = (await soX.nth(0).textContent()).trim();
  await (tX === falsch ? soX.nth(0) : soX.nth(1)).click();
  await page.waitForTimeout(2000); // früher verschwand der Hinweis nach 1,5 s
  const fbDa = (await page.locator("#spielfb").textContent()).includes("richtig wäre");
  check("Lösungshinweis bleibt stehen (kein Auto-Ausblenden)", fbDa);
  check("„Nächster Versuch“-Knopf vorhanden", (await page.locator("#spielWeiter").count()) > 0);
  await page.locator("#spielWeiter").click(); await page.waitForTimeout(100);
  await fange(2); await page.waitForTimeout(400);
  check("Fisch-Bild in der Frage", true);
  for (const i of [0, 1, 3, 4]) {
    await page.locator(`[data-spot="${i}"]`).click();
    const got = await page.waitForFunction(i2 => spiel && spiel.aktiv === i2, i, { timeout: 9000 }).then(() => true).catch(() => false);
    if (!got) { check("Spot " + i + " erreicht", false); continue; }
    await fange(i); await page.waitForTimeout(400);
  }
  await page.waitForTimeout(300);
  const sres = (await page.locator("#moduleContent").textContent()).replace(/\s+/g, " ");
  const sm = sres.match(/Insgesamt gelöst:\s*(\d+)\s*von\s*(\d+)/) || [];
  check("Spiel: 5 Fische, alle Fragen gelöst → Auswertung",
    sm[1] === String(gesamtSoll) && sm[2] === String(gesamtSoll), sm[1] + "/" + sm[2] + " (erwartet " + gesamtSoll + ")");
  // Responsiv: iPad-Querformat -> 2 Spalten, passt ohne Scrollen
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.reload(); await page.waitForTimeout(220);
  await setLevel(3); await openMod("See-Abenteuer", null);
  const fit = await page.evaluate(() => { const r = document.getElementById("spielHost").getBoundingClientRect();
    return { ok: r.bottom <= window.innerHeight,
      cols: getComputedStyle(document.querySelector(".spiel-wrap")).gridTemplateColumns.split(" ").length }; });
  check("iPad quer: 2-Spalten-Layout", fit.cols === 2);
  check("iPad quer: passt ohne Scrollen", fit.ok);
  await page.setViewportSize({ width: 800, height: 1000 });

  // ---------- 7b) Tennis-Match (Grundwortschatz + Mentaltrainer) ----------
  section("Tennis-Match");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; store.muenzen = 9; save(); });
  await openMod("Tennis-Match", null);
  check("Tennis-Daten eingebettet (Gegner/Fakten/Mental)", await page.evaluate(() =>
    SpielRepo.tennis().gegner.length >= 3 && SpielRepo.tennis().fakten.length >= 5 && SpielRepo.tennis().mental.length === 12));
  check("Alle 12 Mentaltrainer-Situationen vorhanden", await page.evaluate(() =>
    ["training", "match", "fehler", "fehlerserie", "nervositaet", "fuehrung", "rueckstand",
     "tiebreak", "aufschlag", "return", "seitenwechsel", "lob"].every(id => !!tennisMental(id))));
  check("Intro: Mutmacher-Dialog mit Sprechblasen (Coach Leo)", await page.evaluate(() => {
    const d = document.querySelector("#tennisHost .mut-dialog");
    return !!d && d.textContent.includes("Coach Leo") && d.querySelectorAll(".bubble").length >= 3
      && d.querySelectorAll(".bubble.zu").length >= 2; }));
  check("Start gesperrt, bis der Dialog durchgetippt ist", await page.evaluate(() => document.getElementById("tennisStart").disabled === true));
  await tapDialog("#tennisHost");
  check("Mut-Satz angetippt → Start frei", !(await page.locator("#tennisStart").isDisabled()));
  await page.locator("#tennisStart").click(); await page.waitForTimeout(150);
  check("Tennisplatz sichtbar", (await page.locator("#tennisFeld").count()) > 0);
  check("Frage aus dem Grundwortschatz (2 Wörter)", (await page.locator(".tennis-opt").count()) === 2);
  // Falsche Antwort: Punkt für den Gegner, Lösung + Mentaltrainer bleiben stehen
  const falschT = await page.evaluate(() => tennis.frage.w.falsch);
  const toT = page.locator(".tennis-opt"); const tT = (await toT.nth(0).textContent()).trim();
  await (tT === falschT ? toT.nth(0) : toT.nth(1)).click();
  await page.waitForFunction(() => { const w = document.getElementById("tennisWeiter"); return w && !w.disabled; }, null, { timeout: 9000 });
  await page.waitForTimeout(1600);
  const fbT = await page.locator("#tennisfb").textContent();
  check("Fehler: Lösung + Mutmacher bleiben stehen", fbT.includes("richtig wäre") && fbT.includes("Mutmacher"));
  check("Fehler = Punkt für den Gegner", await page.evaluate(() => tennis.ihm === 1 && tennis.mir === 0));
  check("Mutmacher-Blase rotiert den Inhalt (Dosierung)", await page.evaluate(() => {
    const m = tennisMental("fehler");
    return [mutKompakt(m, 0), mutKompakt(m, 1), mutKompakt(m, 2)]
      .every((h, i, arr) => arr.indexOf(h) === i); }));
  await page.locator("#tennisWeiter").click(); await page.waitForTimeout(100);
  // Match durchspielen: ab jetzt immer richtig antworten
  async function tennisBall() {
    await page.waitForFunction(() => tennis && tennis.phase === "ball" && document.querySelector(".tennis-opt:not([disabled])"), null, { timeout: 9000 });
    const richtig = await page.evaluate(() => tennis.frage.w.richtig);
    const o = page.locator(".tennis-opt"); const t0 = (await o.nth(0).textContent()).trim();
    await (t0 === richtig ? o.nth(0) : o.nth(1)).click();
    await page.waitForFunction(() => { const w = document.getElementById("tennisWeiter"); return w && !w.disabled; }, null, { timeout: 9000 });
    await page.locator("#tennisWeiter").click();
    await page.waitForTimeout(70);
  }
  let schwerGesehen = false, seitenwechsel = 0;
  for (let guard = 0; guard < 40; guard++) {
    const ph = await page.evaluate(() => tennis.phase);
    if (ph === "ball") {
      schwerGesehen = schwerGesehen || await page.evaluate(() => tennis.frage.schwer && tennis.spielNr >= 2);
      await tennisBall(); continue;
    }
    if (ph === "spielende") {
      seitenwechsel++;
      if (seitenwechsel === 1) { const txt = await page.locator("#tennisHost").textContent();
        check("Seitenwechsel: Tennis-Wissen + Mutmacher", txt.includes("Tennis-Wissen") && txt.includes("Mutmacher")); }
      await page.locator("#tennisWeiter").click(); await page.waitForTimeout(90); continue;
    }
    if (ph === "ende") break;
    await page.waitForTimeout(120);
  }
  check("Steigerung: ab Spiel 2 schwere Wörter", schwerGesehen);
  check("Matchende: Lob vom Mentaltrainer", await page.evaluate(() =>
    tennis.phase === "ende" && !!document.querySelector('#tennisHost .mental-card[data-mental="lob"]')));
  const bilanzT = await page.evaluate(() => ({ balls: tennis.balls, wins: tennis.wins }));
  await page.locator("#tennisWeiter").click(); await page.waitForTimeout(150);
  const tres = (await page.locator("#moduleContent").textContent()).replace(/\s+/g, " ");
  const tm = tres.match(/Insgesamt gelöst:\s*(\d+)\s*von\s*(\d+)/) || [];
  check("Tennis: Auswertung mit Ball-Bilanz", tm[1] === String(bilanzT.wins) && tm[2] === String(bilanzT.balls),
    tm[1] + "/" + tm[2] + " (erwartet " + bilanzT.wins + "/" + bilanzT.balls + ")");
  await page.locator("#bottomNav >> text=Mutmacher").first().click(); await page.waitForTimeout(140);
  check("Mental-Tab: alle 12 Karten zum Nachlesen", (await page.locator("#moduleContent .mental-card").count()) === 12);

  // ---------- 7c) Fußball-Match (Grundwortschatz + Mentaltrainer) ----------
  section("Fußball-Match");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; store.muenzen = 9; save(); });
  await openMod("Fußball-Match", null);
  check("Fußball-Daten eingebettet (Gegner/Fakten/Mental)", await page.evaluate(() =>
    SpielRepo.fussball().gegner.length >= 3 && SpielRepo.fussball().fakten.length >= 5 && SpielRepo.fussball().mental.length >= 12));
  check("Alle 12 Fußball-Mentalsituationen (inkl. Elfmeter/Abwehr)", await page.evaluate(() =>
    ["training", "match", "fehler", "fehlerserie", "nervositaet", "fuehrung", "rueckstand",
     "elfmeter", "torschuss", "abwehr", "torwart", "halbzeit", "lob"].every(id => !!fbMental(id))));
  check("Intro: Mutmacher-Dialog + Start gesperrt", await page.evaluate(() =>
    !!document.querySelector("#fbHost .mut-dialog .bubble") && document.getElementById("fbStart").disabled === true));
  await tapDialog("#fbHost");
  check("Fußball: Mut-Satz angetippt → Anstoß frei", !(await page.locator("#fbStart").isDisabled()));
  await page.locator("#fbStart").click(); await page.waitForTimeout(150);
  check("Fußballplatz mit Tor sichtbar", (await page.locator("#fbFeld").count()) > 0 && (await page.locator("#fbKeeper").count()) > 0);
  // Erster Ball absichtlich falsch: Konter-Tor + Mentaltrainer bleibt stehen
  const falschF = await page.evaluate(() => fussball.frage.w.falsch);
  const foT = page.locator(".fb-opt"); const fT = (await foT.nth(0).textContent()).trim();
  await (fT === falschF ? foT.nth(0) : foT.nth(1)).click();
  await page.waitForFunction(() => { const w = document.getElementById("fbWeiter"); return w && !w.disabled; }, null, { timeout: 9000 });
  await page.waitForTimeout(1600);
  const fbF = await page.locator("#fbfb").textContent();
  check("Fehlschuss: Lösung + Mutmacher bleiben stehen", fbF.includes("richtig wäre") && fbF.includes("Mutmacher"));
  check("Fehlschuss = Konter-Tor für den Gegner", await page.evaluate(() => fussball.ihm === 1 && fussball.mir === 0));
  await page.locator("#fbWeiter").click(); await page.waitForTimeout(100);
  // Match durchspielen: ab jetzt immer richtig antworten
  async function fbBall() {
    await page.waitForFunction(() => fussball && (fussball.phase === "ball" || fussball.phase === "elfmeter") && document.querySelector(".fb-opt:not([disabled])"), null, { timeout: 9000 });
    const richtig = await page.evaluate(() => fussball.frage.w.richtig);
    const o = page.locator(".fb-opt"); const t0 = (await o.nth(0).textContent()).trim();
    await (t0 === richtig ? o.nth(0) : o.nth(1)).click();
    await page.waitForFunction(() => { const w = document.getElementById("fbWeiter"); return w && !w.disabled; }, null, { timeout: 9000 });
    await page.locator("#fbWeiter").click();
    await page.waitForTimeout(70);
  }
  let fbSchwer = false;
  for (let guard = 0; guard < 30; guard++) {
    const ph = await page.evaluate(() => fussball.phase);
    if (ph === "ball" || ph === "elfmeter") {
      fbSchwer = fbSchwer || await page.evaluate(() => fussball.frage.schwer && fussball.halbzeit >= 2);
      await fbBall(); continue;
    }
    if (ph === "halbzeit") {
      const txt = await page.locator("#fbHost").textContent();
      check("Halbzeit: Fußball-Wissen + Mutmacher", txt.includes("Fußball-Wissen") && txt.includes("Mutmacher"));
      await page.locator("#fbWeiter").click(); await page.waitForTimeout(90); continue;
    }
    if (ph === "ende") break;
    await page.waitForTimeout(120);
  }
  check("Steigerung: 2. Halbzeit mit schweren Wörtern", fbSchwer);
  check("Matchende: Lob vom Mentaltrainer", await page.evaluate(() =>
    fussball.phase === "ende" && !!document.querySelector('#fbHost .mental-card[data-mental="lob"]')));
  const bilanzF = await page.evaluate(() => ({ balls: fussball.balls, wins: fussball.wins }));
  await page.locator("#fbWeiter").click(); await page.waitForTimeout(150);
  const fres = (await page.locator("#moduleContent").textContent()).replace(/\s+/g, " ");
  const fbm = fres.match(/Insgesamt gelöst:\s*(\d+)\s*von\s*(\d+)/) || [];
  check("Fußball: Auswertung mit Ball-Bilanz", fbm[1] === String(bilanzF.wins) && fbm[2] === String(bilanzF.balls),
    fbm[1] + "/" + fbm[2] + " (erwartet " + bilanzF.wins + "/" + bilanzF.balls + ")");
  await page.locator("#bottomNav >> text=Mutmacher").first().click(); await page.waitForTimeout(140);
  check("Mutmacher-Tab: 13 Fußball-Karten (inkl. Torwart)", (await page.locator("#moduleContent .mental-card").count()) === 13
    && (await page.locator("#moduleContent").textContent()).includes("Torwart"));

  // ---------- 7d) Elternbereich: Spiele an/aus + Time-Boxing ----------
  section("Elternbereich: Spiele & Zeit");
  await fresh(); await setLevel(3);
  check("Spielhalle: alle 4 Spiele in eigenem Bereich", await page.evaluate(() => {
    openSpielhalle();
    const t = document.querySelector("#spielhalleGrid").textContent;
    const ok = ["See-Abenteuer", "Tennis-Match", "Fußball-Match", "Schach"].every(n => t.includes(n));
    goHome(); return ok; }));
  check("Standard-Limit 20 Minuten", await page.evaluate(() => store.zeitLimit === 20));
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  await page.locator('.chip[data-tab="spiele"]').click(); await page.waitForTimeout(120);
  check("Tab „Spiele & Zeit“ vorhanden", (await page.locator(".seg[data-spiel]").count()) === 8 && (await page.locator(".seg[data-zeit]").count()) === 7);
  // Tennis deaktivieren -> verschwindet von der Startseite
  await page.locator('.seg[data-spiel="tennis"][data-an="0"]').click(); await page.waitForTimeout(100);
  await page.locator("#backBtn").click(); await page.waitForTimeout(120);
  check("Deaktiviertes Spiel verschwindet aus der Spielhalle", await page.evaluate(() => {
    openSpielhalle();
    const t = document.querySelector("#spielhalleGrid").textContent;
    const ok = !t.includes("Tennis-Match") && t.includes("See-Abenteuer");
    goHome(); return ok; }));
  // wieder aktivieren
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  await page.locator('.chip[data-tab="spiele"]').click(); await page.waitForTimeout(120);
  await page.locator('.seg[data-spiel="tennis"][data-an="1"]').click(); await page.waitForTimeout(100);
  await page.locator("#backBtn").click(); await page.waitForTimeout(120);
  check("Wieder aktiviert: Spiel ist zurück in der Spielhalle", await page.evaluate(() => {
    openSpielhalle();
    const ok = document.querySelector("#spielhalleGrid").textContent.includes("Tennis-Match");
    goHome(); return ok; }));
  // Time-Boxing: Zeit aufgebraucht -> Sperr-Bildschirm, Übungen blockiert
  await page.evaluate(() => { store.zeit = { tag: heuteKey(), sek: store.zeitLimit * 60 }; save(); goHome(); });
  await page.waitForTimeout(120);
  check("Zeit um → freundlicher Stopp-Bildschirm", (await page.locator("#zeitSperre").count()) === 1
    && (await page.locator("#zeitSperre").textContent()).includes("Lernzeit"));
  check("Startseite zeigt Zeit-Hinweis", (await page.locator("#zeitInfo").textContent()).includes("Lernzeit"));
  // Eltern: über den Sperr-Bildschirm in den Elternbereich, Limit ändern + freigeben
  await page.locator("#zeitEltern").click(); await page.waitForTimeout(150);
  check("Sperre führt in den Elternbereich", (await page.locator(".seg[data-zeit]").count()) === 7);
  await page.locator('.seg[data-zeit="30"]').click(); await page.waitForTimeout(100);
  check("Limit einstellbar (30 Min gespeichert)", await page.evaluate(() => store.zeitLimit === 30));
  await page.locator("#zeitFrei").click(); await page.waitForTimeout(100);
  await page.locator("#backBtn").click(); await page.waitForTimeout(120);
  check("Heute freigegeben: Sperre weg, Übungen erreichbar", (await page.locator("#zeitSperre").count()) === 0
    && await page.evaluate(() => { openModule("subjekt"); return activeModuleId === "subjekt"; }));

  // ---------- 7e) Schach (Schule, Aufgaben, Spielen) ----------
  section("Schach");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; store.muenzen = 9; save(); });
  await openMod("Schach", null);
  check("Engine: 20 legale Anfangszüge, perft(2)=400", await page.evaluate(() => {
    const s0 = schFen(SCH_START);
    let n2 = 0; for (const z of schZuege(s0)) n2 += schZuege(schZug(s0, z)).length;
    return schZuege(s0).length === 20 && n2 === 400; }));
  check("Engine: Narrenmatt wird als Matt erkannt", await page.evaluate(() => {
    let st = schFen(SCH_START);
    for (const zg of ["f2f3", "e7e5", "g2g4", "d8h4"]) {
      const z = schZuege(st).find(x => x.von === schFeldIdx(zg.slice(0, 2)) && x.nach === schFeldIdx(zg.slice(2, 4)));
      if (!z) return false; st = schZug(st, z);
    }
    return schZuege(st).length === 0 && schImSchach(st, true); }));
  check("Engine: Rochade + en passant vorhanden", await page.evaluate(() => {
    const r5 = schFen("r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -");
    let st2 = schFen(SCH_START);
    for (const zg of ["e2e4", "a7a6", "e4e5", "d7d5"])
      st2 = schZug(st2, schZuege(st2).find(x => x.von === schFeldIdx(zg.slice(0, 2)) && x.nach === schFeldIdx(zg.slice(2, 4))));
    return schZuege(r5).some(z => z.roch === "k") && schZuege(st2).some(z => z.ep); }));
  check("Schule: 6 Lektionen, Spanische zuerst", await page.evaluate(() =>
    document.querySelectorAll(".chip[data-lek]").length === 6 &&
    document.querySelector(".chip[data-lek]").textContent.includes("Spanische")));
  check("Schule: alle Lektions-Züge sind regelkonform", await page.evaluate(() =>
    SpielRepo.schach().lektionen.every(l => {
      let st = schFen(l.fen || SCH_START);
      return l.schritte.every(sch => {
        const z = schZuege(st).find(x => x.von === schFeldIdx(sch.zug.slice(0, 2)) && x.nach === schFeldIdx(sch.zug.slice(2, 4)));
        if (!z) return false; st = schZug(st, z); return true; }); })));
  // Spanische Lektion komplett durchklicken
  for (let k = 0; k < 6; k++) {
    const w = await page.locator("#schWeiter").count();
    if (!w) break;
    await page.locator("#schWeiter").click(); await page.waitForTimeout(60);
  }
  check("Schule: Lektion bis zum Ende durchklickbar", (await page.locator("#moduleContent").textContent()).includes("Lektion geschafft"));
  // Aufgaben: erste falsch, dann alle richtig
  await page.locator("#bottomNav >> text=Aufgaben").first().click(); await page.waitForTimeout(150);
  check("10 Taktik-Aufgaben", await page.evaluate(() => SpielRepo.schach().aufgaben.length === 10));
  const falschesFeld = await page.evaluate(() => {
    const a = SpielRepo.schach().aufgaben[schAufIdx];
    return schFeldIdx(a.ziel) === 0 ? 1 : 0; });
  await page.locator(`.sch-feld[data-feld="${falschesFeld}"]`).click(); await page.waitForTimeout(100);
  check("Aufgabe: falsches Feld -> Tipp bleibt stehen", (await page.locator("#schAfb").textContent()).includes("💡"));
  for (let k = 0; k < 10; k++) {
    const ziel = await page.evaluate(() => schFeldIdx(SpielRepo.schach().aufgaben[schAufIdx].ziel));
    await page.locator(`.sch-feld[data-feld="${ziel}"]`).click(); await page.waitForTimeout(80);
    await page.locator("#schAWeiter").click(); await page.waitForTimeout(80);
  }
  const schRes = (await page.locator("#moduleContent").textContent()).replace(/\s+/g, " ");
  const schM = schRes.match(/Insgesamt gelöst:\s*(\d+)\s*von\s*(\d+)/) || [];
  check("Aufgaben: Auswertung 10/10", schM[1] === "10" && schM[2] === "10", schM[1] + "/" + schM[2]);
  // Spielen: Zug machen, Computer antwortet, Tipp + Zurücknehmen
  await page.locator("#bottomNav >> text=Spielen").first().click(); await page.waitForTimeout(150);
  check("Spielbrett mit 64 Feldern", (await page.locator(".sch-feld").count()) === 64);
  await page.locator('.sch-feld[data-feld="52"]').click(); await page.waitForTimeout(80); // e2
  check("Figur wählen zeigt Zielfelder", (await page.locator(".sch-feld.ziel").count()) === 2);
  await page.locator('.sch-feld[data-feld="36"]').click(); // e4
  const antwortete = await page.waitForFunction(() =>
    schach && !schach.busy && !schach.st.weiss === false && schach.verlauf.length === 2, null, { timeout: 9000 })
    .then(() => true).catch(() => false);
  check("Computer antwortet mit legalem Zug", antwortete);
  await page.locator("#schTipp").click(); await page.waitForTimeout(120);
  check("Tipp-Knopf markiert einen Zug", await page.evaluate(() => !!schach.tippZug));
  await page.locator("#schUndo").click(); await page.waitForTimeout(120);
  check("Zug zurücknehmen: wieder Ausgangsstellung", await page.evaluate(() =>
    schach.st.weiss && schach.st.b.join("") === schFen(SCH_START).b.join("")));
  check("Brett mit Feldnummerierung (a–h, 1–8)", await page.evaluate(() =>
    document.querySelectorAll(".sch-kor").length === 8 && document.querySelectorAll(".sch-kof").length === 8
    && document.querySelector('.sch-feld[data-feld="56"] .sch-kor').textContent === "1"
    && document.querySelector('.sch-feld[data-feld="56"] .sch-kof').textContent === "a"));
  // Responsiv: Handy hoch -> Status/Frage über dem Brett, alles ohne Scrollen
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => goSection("spielen")); await page.waitForTimeout(200);
  const fitH = await page.evaluate(() => {
    const b = document.querySelector(".sch-brett").getBoundingClientRect();
    const st2 = document.querySelector(".sch-side .hint").getBoundingClientRect();
    return { passt: b.bottom <= window.innerHeight && b.width <= window.innerWidth, oben: st2.top < b.top }; });
  check("Handy hoch: Brett + Knöpfe ohne Scrollen", fitH.passt);
  check("Handy: Status/Knöpfe stehen ÜBER dem Brett", fitH.oben);
  await page.evaluate(() => { schAufIdx = 0; runReset("schach"); goSection("aufgaben"); }); await page.waitForTimeout(200);
  check("Handy: Aufgaben-Frage über dem Brett, Brett passt", await page.evaluate(() => {
    const b = document.querySelector(".sch-brett").getBoundingClientRect();
    const q = document.querySelector(".sch-side .hint").getBoundingClientRect();
    return q.top < b.top && b.bottom <= window.innerHeight; }));
  await page.evaluate(() => goSection("schule")); await page.waitForTimeout(200);
  check("Handy: Lektions-Wahl in einer wischbaren Zeile", await page.evaluate(() => {
    const r = document.querySelector(".sch-chips");
    return r && r.offsetHeight < 70; }));
  // kleines Handy
  await page.setViewportSize({ width: 360, height: 640 });
  await page.evaluate(() => goSection("spielen")); await page.waitForTimeout(200);
  check("kleines Handy (360×640): Brett passt komplett", await page.evaluate(() => {
    const b = document.querySelector(".sch-brett").getBoundingClientRect();
    return b.bottom <= window.innerHeight && b.width <= window.innerWidth; }));
  // iPad quer: 2 Spalten, Brett links
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.evaluate(() => goSection("spielen")); await page.waitForTimeout(200);
  check("iPad quer: 2 Spalten + passt ohne Scrollen", await page.evaluate(() => {
    const cols = getComputedStyle(document.querySelector(".sch-wrap")).gridTemplateColumns.split(" ").length;
    const card = document.querySelector("#moduleContent .card").getBoundingClientRect();
    return cols === 2 && card.bottom <= window.innerHeight + 1; }));
  await page.setViewportSize({ width: 800, height: 1000 });

  // ---------- 7f) Spiele-Freischaltung (Münzen) ----------
  section("Spiele-Freischaltung (Münzen)");
  await fresh(); await setLevel(3);
  check("Ohne Münze: Spielhalle-Karte + Spiel-Kachel zeigen Schloss", await page.evaluate(() => {
    const start = document.querySelector("#moduleChooser").textContent.includes("🔒");
    openSpielhalle();
    const halle = document.querySelector("#spielhalleGrid").textContent.includes("🔒");
    goHome(); return start && halle; }));
  await openMod("Tennis-Match", null);
  check("Ohne Münze: Spiel gesperrt mit Erklärung", (await page.locator("#moduleContent").textContent()).includes("noch gesperrt"));
  await page.locator("#gesperrtZurueck").click(); await page.waitForTimeout(120);
  // Eine Übungsrunde gut lösen -> 1 Münze
  await openMod("Subjekte", "Üben");
  let gmz = 0;
  while (gmz++ < 25) {
    if (await page.locator("#runAgain").count()) break;
    const idxs = await page.evaluate(() => subjSaetze()[subjIdx].subj);
    for (const i of idxs) await page.locator("#sbox .word").nth(i).click();
    await page.locator("#checkBtn").click(); await page.waitForTimeout(20);
    await page.locator("#nextBtn").click(); await page.waitForTimeout(25);
  }
  await closeOverlay();
  check("Gute Runde = 1 Spiel-Münze", await page.evaluate(() => store.muenzen === 1)
    && (await page.locator("#moduleContent").textContent()).includes("Spiel-Münze verdient"));
  await page.locator("#runBack").click(); await page.waitForTimeout(120);
  await openMod("Tennis-Match", null);
  check("Spiel öffnet und löst die Münze ein", (await page.locator("#tennisHost").count()) === 1
    && await page.evaluate(() => store.muenzen === 0));
  // Eltern: Münzen schenken + Freischaltung ausschalten
  await page.evaluate(() => goHome()); await page.waitForTimeout(100);
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  await page.locator('.chip[data-tab="spiele"]').click(); await page.waitForTimeout(120);
  await page.locator("#muenzGeschenk").click(); await page.waitForTimeout(100);
  check("Eltern können Münzen schenken (+3)", await page.evaluate(() => store.muenzen === 3));
  await page.locator('.seg[data-muenz="0"]').click(); await page.waitForTimeout(100);
  await page.locator("#backBtn").click(); await page.waitForTimeout(120);
  await openMod("Fußball-Match", null);
  check("Freischaltung aus: Spiel ohne Münz-Abzug frei", (await page.locator("#fbHost").count()) === 1
    && await page.evaluate(() => store.muenzen === 3));

  // ---------- 8a) Vorgangsbeschreibung: interaktive Einheiten ----------
  section("Vorgangsbeschreibung interaktiv");
  await fresh(); await setLevel(3);
  await openMod("Vorgang", "Üben");
  check("4 Unter-Tabs (Grundlagen/Ordnen/Satzanfänge/Zutaten)", (await page.locator(".chip[data-vt]").count()) === 4);
  // Ordnen: komplett richtig lösen
  await page.locator('.chip[data-vt="ordnen"]').click(); await page.waitForTimeout(110);
  check("Ordnen: Schritte-Pfad-Visualisierung", (await page.locator("#vgHost svg").count()) > 0);
  let gg = 0;
  while (gg++ < 10) {
    if (await page.locator("#runAgain").count()) break;
    const pos = await page.evaluate(() => { const exp = vgOrd.next; let pos = 0;
      for (const i of vgOrd.order) { if (i >= vgOrd.next) { if (i === exp) return pos; pos++; } } return -1; });
    await page.locator("#ordList button:not([disabled])").nth(pos).click(); await page.waitForTimeout(60);
  }
  let vres = (await page.locator("#vgHost").textContent()).replace(/\s+/g, " ");
  let vm = vres.match(/Insgesamt gelöst:\s*(\d+)\s*von\s*(\d+)/) || [];
  check("Ordnen: volle Auswertung", vm[1] === vm[2] && +vm[1] > 0, vm[1] + "/" + vm[2]);
  // Satzanfänge: Gate + eine richtige Antwort
  await page.locator('.chip[data-vt="anfang"]').click(); await page.waitForTimeout(110);
  await page.locator("#anfNext").click(); await page.waitForTimeout(60);
  check("Satzanfänge: ohne Antwort blockiert", /zuerst/i.test(await page.locator("#anffb").textContent()));
  const btns = page.locator("#anfOpts button"); const nb = await btns.count();
  for (let k = 0; k < nb; k++) { if ((await btns.nth(k).textContent()).trim() === "Zuerst") { await btns.nth(k).click(); break; } }
  await page.waitForTimeout(60);
  check("Satzanfänge: richtige Antwort erkannt", /Richtig/.test(await page.locator("#anffb").textContent()));
  // Zutaten: alle echten einpacken -> perfekt
  await page.locator('.chip[data-vt="zutaten"]').click(); await page.waitForTimeout(110);
  const picks = await page.evaluate(() => vgZut.karten.map((k, i) => k.echt ? i : -1).filter(i => i >= 0));
  for (const i of picks) { await page.locator("#zutGrid button").nth(i).click(); await page.waitForTimeout(30); }
  await page.locator("#zutCheck").click(); await page.waitForTimeout(110);
  check("Zutaten-Check: perfektes Ergebnis erkannt", /Perfekt/.test(await page.locator("#zutfb").textContent()));

  // ---------- 8b) Kinder-Illustrationen ----------
  section("Kinder-Illustrationen");
  await fresh();
  check("alle Illustrationen rendern SVG", await page.evaluate(() => Object.keys(ILLU).every(k => illu(k).includes("<svg"))));
  await setLevel(0);
  for (const mod of ["Subjekte", "Kompass", "Grundwortschatz"]) {
    await openMod(mod, null);
    check(mod + ": Illustration auf Erklär-Seite", (await page.locator(".illu svg").count()) > 0);
    await page.locator("#backBtn").click(); await page.waitForTimeout(80);
  }
  await openMod("Vorgang", "Üben");
  check("Vorgangsbeschreibung: Illustration sichtbar", (await page.locator(".illu svg").count()) > 0);

  // ---------- 9) Version & Release Notes ----------
  section("Version & Release Notes");
  await fresh();
  const vline = (await page.locator("#versionInfo").textContent()).trim();
  check("Version auf der Startseite sichtbar", /Version \d+\.\d+\.\d+/.test(vline), vline);
  const swMatch = fs.readFileSync(path.resolve(__dirname, "..", "service-worker.js"), "utf8").match(/lern-app-v(\d+)/);
  const appV = await page.evaluate(() => APP_VERSION);
  check("Versions-Regel 1.<SW-Cache>.0 eingehalten", appV === `1.${swMatch[1]}.0`, `APP ${appV} vs SW v${swMatch[1]}`);
  await page.locator("#notesLink").click(); await page.waitForTimeout(120);
  const notes = (await page.locator("#moduleContent").textContent()).replace(/\s+/g, " ");
  check("Release Notes öffnen sich", notes.includes("Was ist neu?"));
  check("Aktuelle Version in den Notes", notes.includes(appV));
  check("Notes: neueste Version ist erster Eintrag", await page.evaluate(() => RELEASE_NOTES[0].v === APP_VERSION));
  await page.locator("#backBtn").click(); await page.waitForTimeout(90);
  check("Zurück aus den Notes", (await page.locator("#screen-home.active").count()) > 0);

  // ---------- Fehler-Sammlung ----------
  section("Konsolen-/Seitenfehler");
  check("keine JS-Fehler während des gesamten Laufs", errs.length === 0, errs.slice(0, 3).join(" | "));

  await browser.close();
  console.log(`\n================ ERGEBNIS: ${pass} ✅ / ${fail} ❌ ================`);
  if (fail) { console.log("Fehlgeschlagen:\n - " + failures.join("\n - ")); process.exit(1); }
})().catch(e => { console.error("ABBRUCH:", e); process.exit(1); });
