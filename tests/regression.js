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
    await page.locator("#moduleChooser >> text=" + label).first().click(); await page.waitForTimeout(90);
    if (section2) { await page.locator("#bottomNav >> text=" + section2).first().click(); await page.waitForTimeout(90); }
  };
  const closeOverlay = async () => { await page.waitForTimeout(380);
    if (await page.locator("#levelUp.show").count()) { const t = (await page.locator("#lvlupTitle").textContent()).trim();
      await page.locator("#lvlupClose").click(); await page.waitForTimeout(100); return t; } return null; };

  // ---------- 1) Start & Klassenfilter ----------
  section("Start & Klassenfilter");
  await fresh();
  check("Startseite sichtbar", (await page.locator("#screen-home.active").count()) > 0);
  for (const l of [3, 4, 0]) {
    await setLevel(l);
    const shown = await page.locator("#moduleChooser .choice").count();
    const expect = await page.evaluate(lv => Object.keys(MODULES).filter(id => lv === 0 || (MODUL_KLASSE[id] || [3, 4]).includes(lv)).length, l);
    check(`Klassenfilter ${l === 0 ? "Alle" : "Klasse " + l}: ${shown} Felder`, shown === expect, `erwartet ${expect}`);
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
  await fresh(); await setLevel(3); await openMod("Subjekte", null);
  check("Vorlesen-Knöpfe auf Erklär-Seite", (await page.locator(".speak-btn").count()) > 0);
  check("CTA gesperrt vor Bestätigung", await page.locator("#toUeben").isDisabled());
  await page.locator(".gate-row >> text=Habe ich gelesen").click(); await page.waitForTimeout(80);
  check("CTA frei nach Bestätigung", !(await page.locator("#toUeben").isDisabled()));
  await page.locator("#toUeben").click(); await page.waitForTimeout(90);
  check("Übung erreichbar nach Gate", (await page.locator("#sbox").count()) > 0);

  section("See-Abenteuer");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; });
  await openMod("See-Abenteuer", null);
  check("Spielfeld mit See", (await page.locator("#spielFeld").count()) > 0);
  check("Steuerkreuz (4 Richtungen)", (await page.locator("#spielPad button").count()) === 4);
  check("Fisch-Größen 1,1,2,2,3 verteilt", await page.evaluate(() => spiel.size.slice().sort().join(",") === "1,1,2,2,3"));
  const b0 = await page.evaluate(() => spiel.x);
  await page.locator('#spielPad button[data-d="right"]').click(); await page.waitForTimeout(70);
  check("D-Pad bewegt die Figur", (await page.evaluate(() => spiel.x)) > b0);
  check("See blockiert Durchlaufen", await page.evaluate(() => { spiel.x = 60; spiel.y = 70; // fern der Angelplätze
    for (let k = 0; k < 20; k++) spielMove(14, 0); return !spielImSee(spiel.x, spiel.y); }));
  // Angelplatz antippen -> automatisch hinlaufen -> Einwurf -> Frage
  await page.locator('[data-spot="2"]').click();
  const angekommen = await page.waitForFunction(() => spiel.aktiv === 2, null, { timeout: 9000 }).then(() => true).catch(() => false);
  check("Spot antippen: hinlaufen + Einwurf + Frage", angekommen);
  check("Schnur startet beim Angler", await page.evaluate(() => { const l = $("spielLine");
    return Math.abs(+l.getAttribute("x1") - spiel.x) < 2 && Math.abs(+l.getAttribute("y1") - spiel.y) < 2; }));
  // Alle 5 Fische fangen (1-3 Fragen je Größe, mit Heranziehen)
  async function fange(spot) {
    const size = await page.evaluate(() => spiel.size[spiel.aktiv]);
    for (let st = 0; st < size; st++) {
      await page.waitForFunction(() => spiel.aktiv >= 0 && !spiel.busy && document.querySelector(".spiel-opt"), null, { timeout: 9000 });
      const richtig = await page.evaluate(() => spiel.frage.w.richtig);
      const so = page.locator(".spiel-opt"); const t0 = (await so.nth(0).textContent()).trim();
      await (t0 === richtig ? so.nth(0) : so.nth(1)).click();
      await page.waitForTimeout(140);
    }
    await page.waitForFunction(sp => spiel.done[sp] === true, spot, { timeout: 9000 });
  }
  await fange(2); await page.waitForTimeout(500);
  for (const i of [0, 1, 3, 4]) {
    await page.locator(`[data-spot="${i}"]`).click();
    const got = await page.waitForFunction(i2 => spiel && spiel.aktiv === i2, i, { timeout: 9000 }).then(() => true).catch(() => false);
    if (!got) { check("Spot " + i + " erreicht", false); continue; }
    await fange(i); await page.waitForTimeout(500);
  }
  await page.waitForTimeout(400);
  const sres = (await page.locator("#moduleContent").textContent()).replace(/\s+/g, " ");
  const sm = sres.match(/Auf Anhieb richtig:\s*(\d+)\s*von\s*(\d+)/) || [];
  check("Spiel: 5 Fische, 9 Fragen → volle Auswertung", sm[1] === "9" && sm[2] === "9", sm[1] + "/" + sm[2]);
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
