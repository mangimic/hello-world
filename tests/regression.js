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
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(220);
    // Tagesform für den Testlauf vorbeantworten, damit das Overlay
    // die bestehenden Abläufe nicht blockiert (eigene Tests unten).
    await page.evaluate(() => { store.tagesform = { tag: heuteKey(), modus: "" }; save(); }); };
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
  check("Aufgeräumte Startseite: 3 Gruppen + Test + Konzentration + Reise + Fit-für-4 + Spielhalle",
    (await page.locator("#moduleChooser .choice").count()) === 8
    && (await page.locator("#moduleChooser .choice.spielhalle").count()) === 1
    && (await page.locator("#moduleChooser .choice.test-kachel").count()) === 1
    && (await page.locator("#moduleChooser .choice.fit4-kachel").count()) === 1);
  check("Startseite: Fach-Einstieg statt Thema-Wahl", await page.evaluate(() =>
    !!document.getElementById("fachRow")
    && document.getElementById("fachRow").textContent.includes("Deutsch")
    && !document.getElementById("themeRow")));
  check("Thema wird in der Lernfeld-Gruppe gewählt", await page.evaluate(() => {
    openGruppe("grammatik");
    const chips = document.querySelectorAll("#gruppenThema .chip");
    if (!chips.length) { goHome(); return false; }
    const ziel = [...chips].find(c => c.dataset.thema !== store.thema);
    ziel.click();
    const ok = store.thema === ziel.dataset.thema && !!document.querySelector("#gruppenThema .chip.on");
    store.thema = "alltag"; save(); goHome();
    return ok; }));
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
    // "konz" hat eine eigene Startseiten-Kachel statt einer Gruppe
    const expect = await page.evaluate(lv => Object.keys(MODULES).filter(id => id !== "konz")
      .filter(id => lv === 0 || (MODUL_KLASSE[id] || [3, 4]).includes(lv)).length, l);
    check(`Klassenfilter ${l === 0 ? "Alle" : "Klasse " + l}: ${shown} Felder in Gruppen+Spielhalle`, shown === expect, `erwartet ${expect}`);
  }

  // ---------- 1b) Zurück-Navigation: immer nur eine Ebene ----------
  section("Zurück-Navigation (eine Ebene)");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { store.muenzen = 5; save(); });
  await openMod("Subjekte", null);
  await page.locator("#backBtn").click(); await page.waitForTimeout(120);
  check("Zurück aus Lernfeld → Gruppen-Seite", (await page.locator("#gruppenGrid").count()) === 1
    && (await page.locator("#moduleContent").textContent()).includes("Sätze & Grammatik"));
  await page.locator("#backBtn").click(); await page.waitForTimeout(120);
  check("Zurück aus Gruppe → Startseite", (await page.locator("#screen-home.active").count()) === 1);
  await openMod("Tennis-Match", null);
  await page.locator("#backBtn").click(); await page.waitForTimeout(120);
  check("Zurück aus Spiel → Spielhalle", (await page.locator("#spielhalleGrid").count()) === 1);
  await page.locator("#backBtn").click(); await page.waitForTimeout(120);
  check("Zurück aus Spielhalle → Startseite", (await page.locator("#screen-home.active").count()) === 1);

  // ---------- 1c) Beta-Feedback-Formular ----------
  section("Beta-Feedback");
  await fresh(); await setLevel(3);
  check("Feedback-Knopf auf der Startseite", (await page.locator("#feedbackLink").count()) === 1);
  await page.locator("#feedbackLink").click(); await page.waitForTimeout(120);
  check("Formular: 4 Sterne-Fragen + 3 Freitexte", (await page.locator("[data-sterne]").count()) === 4
    && (await page.locator("#fbGut, #fbStoert, #fbFehler").count()) === 3);
  await page.locator('[data-sterne="spass"] .seg[data-n="4"]').click();
  await page.locator('[data-wahl="klasse"] .seg[data-w="3"]').click();
  await page.evaluate(() => { document.getElementById("fbGut").value = "Coach Leo ist super"; });
  const bericht = await page.evaluate(() => {
    fbForm.texte = { gut: document.getElementById("fbGut").value, stoert: "", fehler: "" };
    return feedbackText(); });
  check("Bericht: Kurz-Zeile + nur ausgefüllte Felder", bericht.includes("##LP-FEEDBACK##")
    && bericht.includes("Kurz: ⭐ Ø 4 · Klasse 3")
    && bericht.includes("⭐ Spaß 4/5")
    && bericht.includes("👍 Am besten: Coach Leo ist super")
    && !bericht.includes("keine Angabe") && !bericht.includes("Bedienung")
    && !bericht.includes("👎") && !bericht.includes("Fehler in:"));
  check("Datenblock ist gültiges JSON mit Version", await page.evaluate(() => {
    const m = feedbackText().match(/##LP-FEEDBACK##([\s\S]*?)##ENDE##/);
    const d = JSON.parse(m[1]);
    return d.v === 1 && d.sterne.spass === 4 && d.klasseKind === "3" && d.app.version === APP_VERSION; }));
  check("Zwei Wege: WhatsApp (primär) + Teilen/Kopieren", await page.evaluate(() =>
    !!document.getElementById("fbWhatsApp") && !!document.getElementById("fbSenden")
    && !document.getElementById("fbMail") && !document.getElementById("fbKopie")
    && (document.getElementById("fbWhatsApp").compareDocumentPosition(document.getElementById("fbSenden")) & Node.DOCUMENT_POSITION_FOLLOWING) > 0));
  check("WhatsApp-URL je Plattform: Android-Intent / iOS-Schema / Web", await page.evaluate(() => {
    const android = feedbackWhatsAppURL("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126 Mobile");
    const ios = feedbackWhatsAppURL("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari");
    const web = feedbackWhatsAppURL("Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/126");
    const block = encodeURIComponent("##LP-FEEDBACK##");
    return android.startsWith("intent://send?text=") && android.includes("package=com.whatsapp")
      && android.includes("S.browser_fallback_url=") && android.includes(block)
      && ios.startsWith("whatsapp://send?text=") && ios.includes(block)
      && web.startsWith("https://wa.me/?text=") && web.includes(block); }));
  check("WhatsApp-Klick (Desktop): kopiert + öffnet Web-Chat + Bericht sichtbar", await page.evaluate(async () => {
    const kopiert = [], geoeffnet = [];
    navigator.clipboard.writeText = t => { kopiert.push(t); return Promise.resolve(); };
    window.open = u => { geoeffnet.push(u); return {}; };
    document.getElementById("fbWhatsApp").click();
    await new Promise(r => setTimeout(r, 150));
    return kopiert.length === 1 && kopiert[0].includes("##LP-FEEDBACK##")
      && geoeffnet.length === 1 && geoeffnet[0].startsWith("https://wa.me/")
      && document.getElementById("fbManuell").style.display === "block"
      && document.getElementById("fbOk").textContent.includes("kopiert"); }));
  // Netz 2+3 (Desktop/Headless ohne Teilen-Menü): kopieren + sichtbarer Bericht
  check("Ohne Teilen-Menü: Bericht kopiert + sichtbar im Textfeld", await page.evaluate(async () => {
    const kopiert = [];
    navigator.clipboard.writeText = t => { kopiert.push(t); return Promise.resolve(); };
    document.getElementById("fbSenden").click();
    await new Promise(r => setTimeout(r, 150));
    const box = document.getElementById("fbManuell");
    return !navigator.share
      && kopiert.length === 1 && kopiert[0].includes("##LP-FEEDBACK##")
      && box.style.display === "block" && box.querySelector("textarea").value === kopiert[0]
      && document.getElementById("fbOk").textContent.includes("kopiert"); }));
  // Netz 1 (Android/iOS simuliert): natives Teilen-Menü bekommt den Bericht
  check("Mit Teilen-Menü (Android simuliert): share erhält den Bericht", await page.evaluate(async () => {
    const geteilt = [];
    navigator.share = d => { geteilt.push(d); return Promise.resolve(); };
    document.getElementById("fbSenden").click();
    await new Promise(r => setTimeout(r, 150));
    delete navigator.share;
    return geteilt.length === 1 && geteilt[0].text.includes("##LP-FEEDBACK##")
      && geteilt[0].title.includes("Lernprofi")
      && document.getElementById("fbOk").textContent.includes("unterwegs"); }));
  // Teilen-Menü geschlossen (AbortError): freundlich, kein Fehler
  check("Teilen-Menü abgebrochen: freundlicher Hinweis statt Fehler", await page.evaluate(async () => {
    navigator.share = () => Promise.reject(Object.assign(new Error("abbruch"), { name: "AbortError" }));
    document.getElementById("fbSenden").click();
    await new Promise(r => setTimeout(r, 150));
    delete navigator.share;
    return document.getElementById("fbOk").textContent.includes("Kein Problem"); }));
  check("Fehler-Bereiche als Chips: antippen landet in Bericht + JSON", await page.evaluate(() => {
    const chips = document.querySelectorAll("#fbBereiche .chip");
    if (chips.length !== FB_BEREICHE.length) return false;
    document.querySelector('#fbBereiche .chip[data-bereich="vorlesen"]').click();
    document.querySelector('#fbBereiche .chip[data-bereich="spiele"]').click();
    const t = feedbackText();
    const d = JSON.parse(t.match(/##LP-FEEDBACK##([\s\S]*?)##ENDE##/)[1]);
    return t.includes("🔊 Vorlesen") && t.includes("🎮 Spiele")
      && d.bereiche.includes("vorlesen") && d.bereiche.includes("spiele");
  }));
  check("Chip nochmal antippen wählt ab", await page.evaluate(() => {
    document.querySelector('#fbBereiche .chip[data-bereich="spiele"]').click();
    const d = JSON.parse(feedbackText().match(/##LP-FEEDBACK##([\s\S]*?)##ENDE##/)[1]);
    return d.bereiche.includes("vorlesen") && !d.bereiche.includes("spiele");
  }));
  check("Zurück vom Feedback zur Startseite", await page.evaluate(() => { goBack(); return document.getElementById("screen-home").classList.contains("active"); }));
  // Auswertungs-Werkzeug mit Beispieldaten prüfen
  {
    const os = require("os");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lpfb-"));
    fs.writeFileSync(path.join(tmp, "a.txt"), 'Hallo!\n##LP-FEEDBACK##{"v":1,"klasseKind":"3","nutzung":"täglich","sterne":{"spass":5,"bedienung":4},"texte":{"gut":"Spiele!","stoert":"nichts","fehler":""},"app":{"version":"1.41.0","runden":{"subj":3}}}##ENDE##');
    fs.writeFileSync(path.join(tmp, "b.txt"), '##LP-FEEDBACK##{"v":1,"klasseKind":"4","nutzung":"mehrmals","sterne":{"spass":3},"texte":{"gut":"","stoert":"Mehr Themen","fehler":"-"},"app":{"version":"1.41.0"}}##ENDE##');
    const out = require("child_process").execSync("node " + path.resolve(__dirname, "..", "tools", "feedback-auswerten.js") + " " + tmp).toString();
    check("Auswertungs-Werkzeug: 2 Rückmeldungen erkannt + Ø-Sterne", out.includes("Rückmeldungen: 2")
      && out.includes("Ø 4.0") && out.includes("Mehr Themen") && out.includes("subj"));
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
      await page.locator(`.do-opt[data-w="${richtig}"]`).click(); await page.waitForTimeout(60);
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
  // Seit v1.67: erst Regel-Gruppe wählen (Klick-durch), dann Übung
  check("Üben startet mit Regel-Gruppen-Wahl statt langer Liste", (await page.locator(".gws-gruppe").count()) === 12
    && (await page.locator(".gws-opt").count()) === 0);
  await page.locator(".gws-gruppe").first().click(); await page.waitForTimeout(120);
  check("Nach der Wahl: nur die Übung + „Gruppe wechseln“", (await page.locator(".gws-opt").count()) > 0
    && (await page.locator("#gwsWechsel").count()) === 1 && (await page.locator(".gws-gruppe").count()) === 0);
  let st = await page.evaluate(() => ({ lvl: fieldLevel("gws:dopp"), n: fieldPool("gws:dopp").length, w: fieldPool("gws:dopp")[0].richtig }));
  check("Stufe 1 = leichte amtliche Wörter (33)", st.lvl === 1 && st.n === 33 && st.w === "bitten", JSON.stringify(st));
  // Anti-Raten (v1.46): dritte Fehler-Variante + zufällige Antwort-Plätze
  check("Dritte Fehler-Variante wird sicher erzeugt", await page.evaluate(() =>
    drittesFalsch({ richtig: "Zucker", falsch: "Zuker" }) === "zucker"
    && drittesFalsch({ richtig: "spielen", falsch: "spilen" }) === "spiehlen"
    && drittesFalsch({ richtig: "kommen", falsch: "komen" }) === null));
  check("Antwort-Reihenfolge zufällig: Lösung wandert über alle 3 Plätze", await page.evaluate(() => {
    const plaetze = new Set();
    for (let k = 0; k < 60; k++) {
      const o = spielOptionen({ richtig: "Zucker", falsch: "Zuker" });
      if (o.length !== 3) return false;
      plaetze.add(o.indexOf("Zucker"));
    }
    return plaetze.size === 3;
  }));
  check("GWS-Übung: gemischte Antwort-Knöpfe enthalten die Lösung", await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".gws-opt")];
    const w = gwsChunk("gws:" + GWS_KATEGORIEN[gwsCatIdx].id).S[gwsIdx];
    return btns.length >= 2 && btns.some(b => b.dataset.w === w.richtig);
  }));
  const solveChunk = async () => { let g = 0; while (g++ < 15) { if (await page.locator("#runAgain").count()) break;
    const richtig = await page.evaluate(() => gwsChunk("gws:" + GWS_KATEGORIEN[gwsCatIdx].id).S[gwsIdx].richtig);
    await page.locator(`.gws-opt[data-w="${richtig}"]`).click(); await page.waitForTimeout(18);
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
  await page.locator("#acJa").click(); await page.waitForTimeout(140); // app-eigener Dialog statt confirm()
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
  // Bereichs-Override schlägt Global (zur Startseite: 2× eine Ebene zurück)
  await page.locator("#backBtn").click(); await page.waitForTimeout(90);
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
  // Neue Sprachausgabe (v1.45): Chunks, Stimmen-Rang, Mitlese-Markierung, Start/Stopp
  check("speakChunks: langer Text vollständig + an Satzenden geteilt", await page.evaluate(() => {
    const text = "Der kleine Fuchs läuft über die große Wiese und sucht seine Freunde. ".repeat(20).trim();
    const ch = speakChunks(text);
    return ch.length > 3
      && ch.map(c => c.text).join(" ") === text
      && ch.every(c => c.text.length <= 180)
      && ch.slice(0, -1).every(c => /[.!?:]$/.test(c.text))
      && ch.every((c, i) => i === 0 || ch[i - 1].w0 + ch[i - 1].text.split(" ").length === c.w0);
  }));
  check("Stimmen-Rangfolge: Natural ⭐ vor Google vor Standard-Stimme", await page.evaluate(() =>
    stimmenRang({ name: "Microsoft Katja Online (Natural)" }) < stimmenRang({ name: "Google Deutsch" })
    && stimmenRang({ name: "Google Deutsch" }) < stimmenRang({ name: "Irgendeine Stimme" })));
  check("Mitlese-Markierung: hüllen, markieren, rückstandslos entfernen", await page.evaluate(() => {
    const div = document.createElement("div");
    div.innerHTML = "Der <b>kleine</b> Fuchs läuft.";
    document.body.appendChild(div);
    const vorher = div.textContent;
    karaokeAn(div);
    const spans = div.querySelectorAll(".kar-wort").length;
    karaokeWort(div, 2);
    const ok1 = spans === 4 && div.textContent === vorher
      && div.querySelector(".kar-wort.an") && div.querySelector(".kar-wort.an").textContent === "Fuchs";
    karaokeWort(div, 3);
    const nurEins = div.querySelectorAll(".kar-wort.an").length === 1;
    karaokeAus(div);
    const ok2 = div.querySelectorAll(".kar-wort").length === 0 && div.textContent === vorher && !!div.querySelector("b");
    div.remove();
    return ok1 && nurEins && ok2;
  }));
  // Start/Stopp-Umschalter (Sprachausgabe gestubbt, damit ohne Audio deterministisch)
  await page.evaluate(() => { window.speechSynthesis.speak = () => {}; window.speechSynthesis.cancel = () => {}; });
  await page.locator(".speak-btn").first().click(); await page.waitForTimeout(80);
  check("🔊-Knopf wird zum ⏹️-Stopp-Knopf, Wörter sind gehüllt", await page.evaluate(() => {
    const b = document.querySelector(".speak-btn");
    return b.textContent.includes("Stopp") && b.classList.contains("an")
      && document.querySelectorAll(".kar-wort").length > 0; }));
  await page.locator(".speak-btn").first().click(); await page.waitForTimeout(80);
  check("Zweites Tippen stoppt: Knopf und Text wieder normal", await page.evaluate(() => {
    const b = document.querySelector(".speak-btn");
    return b.textContent.includes("Vorlesen") && !b.classList.contains("an")
      && document.querySelectorAll(".kar-wort").length === 0; }));
  check("Lernen-Seite: Thema wird nur angezeigt, nicht mehr gewählt", await page.evaluate(() =>
    !document.getElementById("subjThemes") && !!document.querySelector("[data-thema-zeile]")
    && document.querySelector("[data-thema-zeile]").textContent.includes("Dein Thema")));
  check("Keine Themen-Auswahl mehr in den Lernfeldern (alle 10 Raster weg)", await page.evaluate(() =>
    ["subjThemes","praedThemes","sgThemes","redeThemes","zeitThemes","gkThemes","ddThemes","waThemes","faelleThemes","doppelThemes"]
      .every(id => !document.getElementById(id)) && typeof themeCards === "undefined"));
  check("CTA gesperrt vor Bestätigung", await page.locator("#toUeben").isDisabled());
  await passGate();
  check("CTA frei nach Bestätigung", !(await page.locator("#toUeben").isDisabled()));
  await page.locator("#toUeben").click(); await page.waitForTimeout(90);
  check("Übung erreichbar nach Gate", (await page.locator("#sbox").count()) > 0);
  // Elternbereich-Tab „🔊 Vorlesen": Stimme wählen + Tempo einstellen
  await page.evaluate(() => goHome()); await page.waitForTimeout(120);
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  await page.locator('.chip[data-tab="vorlesen"]').click(); await page.waitForTimeout(120);
  check("Eltern-Tab Vorlesen: Stimmen-Auswahl, Probehören, 3 Tempi", await page.evaluate(() => {
    const sel = document.getElementById("stimmeWahl");
    return sel && sel.options[0].value === "" && sel.options[0].textContent.includes("Automatisch")
      && !!document.getElementById("stimmeTest")
      && document.querySelectorAll(".seg[data-tempo]").length === 3; }));
  await page.locator('.seg[data-tempo="langsam"]').click(); await page.waitForTimeout(100);
  check("Tempo „Langsam“ gespeichert (Rate 0,5 – Diktier-Tempo)", await page.evaluate(() =>
    store.leseTempo === "langsam" && speakRate() === 0.5));
  check("Tempo-Stufen deutlich gesenkt (0,5 / 0,7 / 0,9)", await page.evaluate(() => {
    const alt = store.leseTempo, werte = {};
    ["langsam", "normal", "schnell"].forEach(t => { store.leseTempo = t; werte[t] = speakRate(); });
    store.leseTempo = alt;
    return werte.langsam === 0.5 && werte.normal === 0.7 && werte.schnell === 0.9
      && werte.langsam < werte.normal && werte.normal < werte.schnell;
  }));
  check("„Langsam“ liest in kürzeren Stücken (Atempausen)", await page.evaluate(() => {
    const text = "Der kleine Fuchs läuft über die große Wiese und sucht seine Freunde. ".repeat(10).trim();
    const kurz = speakChunks(text, 90), lang = speakChunks(text, 180);
    return kurz.length > lang.length && kurz.every(c => c.text.length <= 90)
      && kurz.map(c => c.text).join(" ") === text;
  }));
  await page.reload(); await page.waitForTimeout(300);
  check("Tempo bleibt nach Neuladen erhalten", await page.evaluate(() => store.leseTempo === "langsam"));

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
      await page.locator(`.spiel-opt[data-w="${meta.richtig}"]`).click();
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
  await page.locator(`.spiel-opt[data-w="${falsch}"]`).click();
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
  check("Frage aus dem Grundwortschatz (2–3 Wörter)", (await page.locator(".tennis-opt").count()) >= 2);
  // Falsche Antwort: Punkt für den Gegner, Lösung + Mentaltrainer bleiben stehen
  const falschT = await page.evaluate(() => tennis.frage.w.falsch);
  await page.locator(`.tennis-opt[data-w="${falschT}"]`).click();
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
    await page.locator(`.tennis-opt[data-w="${richtig}"]`).click();
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
  await page.locator(`.fb-opt[data-w="${falschF}"]`).click();
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
    await page.locator(`.fb-opt[data-w="${richtig}"]`).click();
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
    const ok = ["See-Abenteuer", "Tennis-Match", "Fußball-Match", "Schach", "Blockwelt"].every(n => t.includes(n));
    goHome(); return ok; }));
  check("Standard-Limit 20 Minuten", await page.evaluate(() => store.zeitLimit === 20));
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  await page.locator('.chip[data-tab="spiele"]').click(); await page.waitForTimeout(120);
  check("Tab „Spiele & Zeit“ vorhanden", (await page.locator(".seg[data-spiel]").count()) === 10 && (await page.locator(".seg[data-zeit]").count()) === 7);
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

  // ---------- 7f) Blockwelt (Mini-Minecraft) ----------
  section("Blockwelt");
  await fresh(); await setLevel(3);
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; store.muenzen = 9; save(); });
  await openMod("Blockwelt", null);
  check("Blockwelt-Daten eingebettet (12 Blocktypen, 2 seltene)", await page.evaluate(() =>
    SpielRepo.blockwelt().bloecke.length === 12 && SpielRepo.blockwelt().bloecke.filter(b => b.selten).length === 2));
  check("Raster 16×10 mit Boden (Gras auf Erde)", await page.evaluate(() => {
    const w = bwWelt().welt;
    return document.querySelectorAll(".bw-zelle").length === 160
      && w[9 * 16 + 3] === "erde" && w[7 * 16 + 3] === "gras"; }));
  check("Start-Inventar vorhanden", await page.evaluate(() =>
    Object.values(bwWelt().inv).reduce((a, b) => a + b, 0) >= 20));
  // Bauen: leere Zelle anklicken
  await page.evaluate(() => { bw.wahl = "holz"; bw.werkzeug = "bauen"; });
  await page.locator('.bw-zelle[data-i="20"]').click(); await page.waitForTimeout(80);
  check("Block setzen: Zelle gefüllt + Inventar verringert", await page.evaluate(() =>
    bwWelt().welt[20] === "holz" && bwWelt().inv.holz === 3));
  // Abbauen: gleiche Zelle
  await page.locator("#bwAbbau").click();
  await page.locator('.bw-zelle[data-i="20"]').click(); await page.waitForTimeout(80);
  check("Block abbauen: Zelle leer + zurück ins Inventar", await page.evaluate(() =>
    bwWelt().welt[20] === "" && bwWelt().inv.holz === 4));
  // Blöcke verdienen: erst absichtlich falsch (Tipp bleibt), dann richtig (Inventar wächst)
  await page.locator("#bwVerdienen").click(); await page.waitForTimeout(100);
  const summe0 = await page.evaluate(() => Object.values(bwWelt().inv).reduce((a, b) => a + b, 0));
  const bwF = await page.evaluate(() => bw.frage.w.falsch);
  await page.locator(`.bw-opt[data-w="${bwF}"]`).click(); await page.waitForTimeout(120);
  check("Falsche Antwort: Tipp bleibt stehen", (await page.locator("#bwfb").textContent()).includes("richtig wäre"));
  // Schummel-Schutz (v1.71): kein Umklicken, Denk-Pause vor dem nächsten Versuch
  check("Streng: Nach falscher Antwort sind ALLE Antworten gesperrt", await page.evaluate(() =>
    [...document.querySelectorAll(".bw-opt")].every(b => b.disabled)));
  check("Streng: Umklicken auf die richtige Antwort bringt KEINE Blöcke", await page.evaluate(() => {
    const s0 = Object.values(bwWelt().inv).reduce((a, b) => a + b, 0);
    const r = [...document.querySelectorAll(".bw-opt")].find(b => b.dataset.w === bw.frage.w.richtig);
    r.click();
    return Object.values(bwWelt().inv).reduce((a, b) => a + b, 0) === s0;
  }));
  check("Streng: Nächster Versuch erst nach Denk-Pause (Countdown)", await page.evaluate(() => {
    const w = document.getElementById("bwWeiter");
    return w.disabled && /\(\d\)/.test(w.textContent);
  }));
  await page.locator("#bwWeiter").click(); await page.waitForTimeout(100);
  // Fehlversuch-Serie: ab dem 3. Fehler in Folge längere Pause + Durchatmen-Hinweis
  await page.evaluate(() => { bw.fehlSerie = 2; });
  const bwF2 = await page.evaluate(() => bw.frage.w.falsch);
  await page.locator(`.bw-opt[data-w="${bwF2}"]`).click(); await page.waitForTimeout(120);
  check("Streng: 3. Fehler in Folge → längere Pause + Durchatmen-Hinweis", await page.evaluate(() => {
    const w = document.getElementById("bwWeiter");
    return document.getElementById("bwfb").textContent.includes("durchatmen")
      && w.disabled && /\([5-8]\)/.test(w.textContent);
  }));
  await page.locator("#bwWeiter").click(); await page.waitForTimeout(100);
  const bwR = await page.evaluate(() => bw.frage.w.richtig);
  await page.locator(`.bw-opt[data-w="${bwR}"]`).click(); await page.waitForTimeout(120);
  const summe1 = await page.evaluate(() => Object.values(bwWelt().inv).reduce((a, b) => a + b, 0));
  check("Richtige Antwort: Blöcke im Inventar + Zähler", summe1 > summe0
    && await page.evaluate(() => (bwStore().verdient || 0) >= 3));
  await page.locator("#bwWeiter").click(); await page.waitForTimeout(80);
  // Persistenz: bauen, neu laden (ohne localStorage zu löschen)
  await page.evaluate(() => { bw.wahl = "stein"; bw.werkzeug = "bauen"; });
  await page.locator('.bw-zelle[data-i="21"]').click(); await page.waitForTimeout(80);
  await page.reload(); await page.waitForTimeout(300);
  check("Welt bleibt nach Neuladen gespeichert", await page.evaluate(() =>
    store.blockwelt && store.blockwelt.welt && store.blockwelt.welt[21] === "stein"));
  // Werkstatt: Extras aus Blöcken bauen (Crafting), Meilensteine schalten frei
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; store.muenzen = 9; save(); });
  await openMod("Blockwelt", null);
  check("Werkstatt-Daten: 12 Extras, Drache kostet Gold+Diamant", await page.evaluate(() => {
    const X = SpielRepo.blockwelt().extras, d = X.find(x => x.id === "drache");
    return X.length === 12 && X.some(x => x.ab === 0) && d && d.kosten.gold === 1 && d.kosten.diamant === 1; }));
  // Meilenstein-Meldung: von 8 auf 11+ verdient schaltet das Schaf (ab 10) frei
  await page.evaluate(() => { const st = bwWelt(); st.verdient = 8; st.zaehler = 0; save(); });
  await page.locator("#bwVerdienen").click(); await page.waitForTimeout(100);
  const bwR2 = await page.evaluate(() => bw.frage.w.richtig);
  await page.locator(`.bw-opt[data-w="${bwR2}"]`).click(); await page.waitForTimeout(120);
  check("Meilenstein erreicht: Freischalt-Meldung in der Antwort", (await page.locator("#bwfb").textContent()).includes("Neu in der Werkstatt"));
  await page.locator("#bwWeiter").click(); await page.waitForTimeout(80);
  // Deterministisch: genau 3 Rezepte baubar (Tür, Fenster, Schaf), Rest fehlt/gesperrt
  await page.evaluate(() => { const st = bwWelt(); st.inv = { holz: 3, gras: 2, glas: 1 }; st.verdient = 10; save(); bwWerkstatt(); });
  check("Werkstatt: 12 Rezepte gelistet, 3 baubar, Gesperrte mit 🔒", await page.evaluate(() =>
    document.querySelectorAll(".bw-rezept").length === 12
    && document.querySelectorAll(".bw-craft").length === 3
    && document.querySelectorAll(".bw-rezept.zu").length === 9
    && $("bwQ").textContent.includes("🔒")));
  await page.locator('.bw-craft[data-x="schaf"]').click(); await page.waitForTimeout(100);
  check("Rezept gebaut: Schaf im Inventar, 2 Gras verbraucht", await page.evaluate(() =>
    bwWelt().inv.schaf === 1 && bwWelt().inv.gras === 0));
  await page.locator('.bw-zelle[data-i="40"]').click(); await page.waitForTimeout(80);
  check("Extra steht in der Welt (🐑)", await page.evaluate(() =>
    bwWelt().welt[40] === "schaf"
    && document.querySelector('.bw-zelle[data-i="40"]').textContent === "🐑"));
  check("Gesperrtes Rezept nicht baubar (Drache ab 75)", await page.evaluate(() => bwCraft("drache") === false));
  // TNT: freischalten, bauen, setzen -> räumt 3×3 frei (Blöcke weg, nicht zurück)
  check("TNT gebaut (ab 50, Sand+Stein)", await page.evaluate(() => {
    const st = bwWelt(); st.verdient = 50; st.inv.sand = 2; st.inv.stein = 1; save();
    return bwCraft("tnt") && st.inv.tnt === 1; }));
  await page.locator('.bw-zelle[data-i="101"]').click(); await page.waitForTimeout(100);
  check("🧨 TNT räumt 3×3 frei, Reihe darunter bleibt", await page.evaluate(() => {
    const w = bwWelt().welt;
    return w[7 * 16 + 4] === "" && w[7 * 16 + 5] === "" && w[7 * 16 + 6] === ""
      && w[8 * 16 + 5] === "erde" && bwWelt().inv.tnt === 0; }));
  // Sichern & Wiederherstellen: Speicherstand anlegen, Welt ändern, zurückkehren
  await page.locator("#bwSichern").click(); await page.waitForTimeout(100);
  check("Welt sichern: Speicherstand mit Datum, Laden-Knopf aktiv", await page.evaluate(() => {
    const s = bwStore().sicherung;
    return s && Array.isArray(s.welt) && s.welt[40] === "schaf" && !!s.datum
      && !document.querySelector("#bwLaden").disabled; }));
  await page.evaluate(() => { bw.werkzeug = "abbau"; });
  await page.locator('.bw-zelle[data-i="40"]').click(); await page.waitForTimeout(80);
  await page.locator("#bwLaden").click(); await page.waitForTimeout(100);
  check("Laden fragt mit app-eigenem Dialog nach (kein confirm())", (await page.locator("#appConfirm").count()) === 1);
  await page.locator("#acJa").click(); await page.waitForTimeout(150);
  check("Sicherung geladen: Schaf ist wieder da", await page.evaluate(() =>
    bwWelt().welt[40] === "schaf" && !document.getElementById("appConfirm")));
  // Neu beginnen: Dialog, Abbrechen wirkt, Ja setzt Welt zurück – Fortschritt bleibt
  const bwVorher = await page.evaluate(() => bwStore().verdient);
  await page.locator("#bwReset").click(); await page.waitForTimeout(100);
  await page.locator("#acNein").click(); await page.waitForTimeout(100);
  check("Neu beginnen: Abbrechen lässt die Welt unverändert", await page.evaluate(() =>
    !document.getElementById("appConfirm") && bwWelt().welt[40] === "schaf"));
  await page.locator("#bwReset").click(); await page.waitForTimeout(100);
  await page.locator("#acJa").click(); await page.waitForTimeout(150);
  check("Neu beginnen: Startwelt, aber Meilensteine + Sicherung bleiben", await page.evaluate((v) => {
    const st = bwStore();
    return st.welt[40] === "" && st.welt[9 * 16 + 3] === "erde"
      && st.verdient === v && !!st.sicherung; }, bwVorher));

  // ---------- 7fv) Test-Training (Könnernachweis-Simulator) ----------
  section("Test-Training (Könnernachweis)");
  await fresh(); await setLevel(3);
  check("Startseite hat die Test-Training-Kachel (Klasse 3)", (await page.locator(".test-kachel").count()) === 1);
  await setLevel(4);
  check("Klasse 4: Kachel da – nur der Fit-Test (Klasse-3-Tests gefiltert)", (await page.locator(".test-kachel").count()) === 1
    && await page.evaluate(() => testsFuerKlasse().map(t => t.typ).join(",") === "fit"));
  await setLevel(0);
  check("„Alle“: Kachel da, alle 3 Deutsch-Tests im Katalog", (await page.locator(".test-kachel").count()) === 1
    && await page.evaluate(() => testsFuerKlasse().length === 3));
  await setLevel(3);
  await page.locator(".test-kachel").click(); await page.waitForTimeout(150);
  check("Übersicht: Erst-Versuch-Regel + Start-Knopf", (await page.locator("#moduleContent").textContent()).includes("ersten Versuch")
    && (await page.locator('.test-start[data-typ="sprache"]').count()) === 1);
  await page.locator('.test-start[data-typ="sprache"]').click(); await page.waitForTimeout(150);
  check("Test: 11 gemischte Aufgaben, 13 Punkte, alle Typen dabei", await page.evaluate(() =>
    test.aufgaben.length === 11 && test.max === 13
    && test.aufgaben.filter(a => a.art === "wort").length === 3
    && test.aufgaben.filter(a => a.art === "um").length === 2
    && test.aufgaben.filter(a => a.art === "zo").length === 2
    && test.aufgaben.filter(a => a.art === "sp").length === 2
    && test.aufgaben.filter(a => a.art === "frage").length === 2));
  for (let k = 0; k < 11; k++) {
    const a = await page.evaluate(() => { const x = test.aufgaben[test.idx];
      return { art: x.art, richtig: x.w ? x.w.richtig : null, n: x.a && x.a.teile ? x.a.teile.length : 0,
        zeit: x.a ? x.a.zeit : null, ort: x.a ? x.a.ort : null, ziel: x.ziel || null,
        subj: x.a ? x.a.subj : null, praed: x.a ? x.a.praed : null }; });
    if (a.art === "wort") { await page.locator(`.test-opt[data-w="${a.richtig}"]`).click(); await page.locator("#testAbgeben").click(); }
    else if (a.art === "um") { const folge = [2, 1, 0].concat(Array.from({ length: a.n - 3 }, (_, j) => j + 3));
      for (const i of folge) { await page.locator(`.test-chip[data-i="${i}"]`).click(); await page.waitForTimeout(30); } }
    else if (a.art === "zo") { await page.locator(`.test-chip[data-i="${a.zeit}"]`).click(); await page.waitForTimeout(60);
      if (a.ort === null) await page.locator("#testZoKeine").click(); else await page.locator(`.test-chip[data-i="${a.ort}"]`).click(); }
    else if (a.art === "sp") await page.locator(`.test-chip[data-i="${a.ziel === "Subjekt" ? a.subj : a.praed}"]`).click();
    else { await page.locator('.test-opt[data-ok="1"]').click(); await page.locator("#testAbgeben").click(); }
    await page.waitForTimeout(60);
    await page.locator("#testWeiter").click(); await page.waitForTimeout(80);
  }
  check("Ergebnis: 13/13, 🪙 Münze + Historie gespeichert", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    return t.includes("13 von 13 Punkten") && t.includes("Spitze")
      && store.muenzen === 1 && store.testHistorie.length === 1 && store.testHistorie[0].p === 13; }));
  check("Alle Bereiche ✅ – keine Übe-Empfehlung nötig", (await page.locator(".test-ueben").count()) === 0);
  // Zweiter Test: erste Aufgabe absichtlich falsch -> 0 P + Lösung
  await page.locator("#testNochmal").click(); await page.waitForTimeout(150);
  const testF = await page.evaluate(() => test.aufgaben[0].w.falsch);
  await page.locator(`.test-opt[data-w="${testF}"]`).click(); await page.waitForTimeout(60);
  check("Kontroll-Blick: erst wählen (markiert), noch nichts gewertet", await page.evaluate(() =>
    test.punkte === 0 && !document.getElementById("testfb").textContent
    && document.querySelector(".test-opt.gewaehlt")
    && document.getElementById("testAbgeben").style.display === "block"));
  // Umentscheiden vor dem Abgeben ist erlaubt – Markierung wandert mit
  const testR = await page.evaluate(() => test.aufgaben[0].w.richtig);
  await page.locator(`.test-opt[data-w="${testR}"]`).click(); await page.waitForTimeout(40);
  check("Umentscheiden: Markierung wandert zur neuen Wahl", await page.evaluate(r =>
    document.querySelector(".test-opt.gewaehlt").dataset.w === r, testR));
  await page.locator(`.test-opt[data-w="${testF}"]`).click(); await page.waitForTimeout(40);
  await page.locator("#testAbgeben").click(); await page.waitForTimeout(80);
  check("Falsche Antwort nach Abgeben: 0 Punkte, Lösung gezeigt, Weiter frei", await page.evaluate(() =>
    test.punkte === 0 && document.getElementById("testfb").textContent.includes("richtig ist")
    && !document.getElementById("testWeiter").disabled));
  check("Übersicht zeigt Historie + beide Test-Arten", await page.evaluate(() => {
    openTestTraining();
    const t = document.getElementById("moduleContent").textContent;
    return t.includes("Deine letzten Tests") && t.includes("🧩 Sprache")
      && document.querySelectorAll(".test-start").length === 3; }));
  // ---------- Vorgangsbeschreibungs-Test (Waffelrezept) ----------
  await page.locator('.test-start[data-typ="vorgang"]').click(); await page.waitForTimeout(150);
  check("Vorgangs-Test startet mit der Vorlage (Zutaten, Schritte, Mustertext)", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    return !!document.getElementById("vtStart")
      && t.includes("5 Eier") && t.includes("Waffeleisen")
      && t.includes("Zuerst verrühre ich") && t.includes("Tipps aus dem Könnernachweis"); }));
  await page.locator("#vtStart").click(); await page.waitForTimeout(150);
  check("Vorgangs-Test: 9 Aufgaben, 13 P., Reihenfolge-Aufgabe dabei", await page.evaluate(() =>
    test.typ === "vorgang" && test.aufgaben.length === 9 && test.max === 13
    && test.aufgaben.filter(a => a.art === "folge").length === 1
    && test.aufgaben.filter(a => a.art === "wahl").length === 8));
  check("Vorlage während des Tests aufklappbar", await page.evaluate(() => {
    const btn = document.getElementById("vtZeigen"), box = document.getElementById("vtVorlage");
    if (!btn || !box || box.style.display !== "none") return false;
    btn.click();
    const offen = box.style.display === "block" && box.textContent.includes("5 Eier");
    btn.click();
    return offen && box.style.display === "none"; }));
  for (let k = 0; k < 9; k++) {
    const art = await page.evaluate(() => test.aufgaben[test.idx].art);
    if (art === "wahl") { await page.locator('.test-opt[data-ok="1"]').click(); await page.locator("#testAbgeben").click(); }
    else for (let i = 0; i < 5; i++) { await page.locator(`.test-chip[data-i="${i}"]`).click(); await page.waitForTimeout(40); }
    await page.waitForTimeout(60);
    await page.locator("#testWeiter").click(); await page.waitForTimeout(80);
  }
  check("Vorgangs-Test: 13/13, Historie kennt den Typ", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    const h = store.testHistorie[store.testHistorie.length - 1];
    return t.includes("13 von 13 Punkten") && h.typ === "vorgang" && h.p === 13; }));
  // Reihenfolge mit Fehler: falscher erster Schritt gibt 0 P. für diesen Schritt
  await page.locator("#testNochmal").click(); await page.waitForTimeout(150);
  await page.evaluate(() => { test.idx = 2; testFrage(); }); await page.waitForTimeout(100);
  await page.locator('.test-chip[data-i="3"]').click(); await page.waitForTimeout(80);
  check("Falscher Schritt: richtiger wird markiert, 0 P. dafür", await page.evaluate(() => {
    const c1 = document.querySelector('.test-chip[data-i="0"]');
    return c1.disabled && c1.textContent.startsWith("1.") && test.punkte === 0; }));
  for (let i = 1; i < 5; i++) { await page.locator(`.test-chip[data-i="${i}"]`).click(); await page.waitForTimeout(40); }
  check("Teilpunkte: 4 von 5 Schritten = 4 P.", await page.evaluate(() =>
    test.punkte === 4 && document.getElementById("testfb").textContent.includes("4 von 5")));

  // ---------- 7ft) Fit für Klasse 4 (Vorbereitungsbereich) ----------
  section("Fit für Klasse 4");
  await fresh(); await setLevel(3);
  check("Kachel bei Klasse 3 sichtbar, bei „Alle“ nicht", (await page.locator(".fit4-kachel").count()) === 1
    && await page.evaluate(() => { store.level = 0; buildModuleChooser();
      const weg = !document.querySelector(".fit4-kachel");
      store.level = 3; buildModuleChooser(); return weg; }));
  await page.locator(".fit4-kachel").click(); await page.waitForTimeout(150);
  check("Intro erklärt Klasse-4-Stoff + Programm", (await page.locator("#moduleContent").textContent()).includes("das oder dass")
    && (await page.locator("#fit4Los").count()) === 1);
  await page.locator("#fit4Los").click(); await page.waitForTimeout(150);
  check("Programm gestartet: 7 Stationen, 0 Sterne, Basis gespeichert", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    return store.fit4 && !store.fit4.fertig && t.includes("0 / 7")
      && document.querySelectorAll(".fit4-geh").length === 7; }));
  await page.locator(".fit4-geh").first().click(); await page.waitForTimeout(200);
  check("„Los!“ führt direkt ins passende Lernfeld", await page.evaluate(() =>
    activeModuleId === "gws"));
  // Fortschritt simulieren: 5 Lernfeld-Stationen + beide Tests bestanden
  await page.evaluate(() => {
    ["gws:dopp", "satzglied", "doppel", "dd", "faelle"].forEach(k => {
      store.progress[k] = store.progress[k] || { unlocked: 1, runs: 0 };
      store.progress[k].runs = (store.progress[k].runs || 0) + 1;
    });
    store.testHistorie = (store.testHistorie || []).concat([
      { datum: "x", p: 9, max: 13, typ: "sprache" }, { datum: "x", p: 10, max: 13, typ: "vorgang" }]);
    save(); openFit4();
  });
  await page.waitForTimeout(150);
  check("Alle Stationen ⭐: Urkunde + 3 Münzen (einmalig) + Klasse-4-Knopf", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    const m1 = store.muenzen;
    openFit4(); // erneut öffnen darf NICHT nochmal belohnen
    return t.includes("URKUNDE") && t.includes("7 / 7") && store.fit4.fertig
      && m1 === 3 && store.muenzen === 3
      && !!document.getElementById("fit4Klasse4"); }));
  await page.locator("#fit4Klasse4").click(); await page.waitForTimeout(150);
  check("Umstellen auf Klasse 4: Filter gesetzt, Kachel zeigt „Geschafft“", await page.evaluate(() =>
    store.level === 4 && document.getElementById("screen-home").classList.contains("active")
    && document.querySelector(".fit4-kachel").textContent.includes("Geschafft")));

  // ---------- 7fu) Fokus-Paket: Bewegungspause + Fokus-Serie ----------
  section("Fokus-Paket (Konzentration)");
  await fresh(); await setLevel(3);
  check("Fokus-Serie zählt gelöste Aufgaben am Stück + Rekord", await page.evaluate(() => {
    for (let i = 0; i < 5; i++) fokusZaehle();
    return fokusSerie === 5 && store.fokusRekord === 5; }));
  await page.reload(); await page.waitForTimeout(300);
  check("Rekord bleibt gespeichert + Badge auf der Startseite", await page.evaluate(() => {
    const b = document.getElementById("fokusBadge");
    return store.fokusRekord === 5 && b && b.textContent.includes("5 Aufgaben am Stück"); }));
  await openMod("Subjekte", null);
  check("Nach 10 Min Lernen: Leo schlägt Bewegungspause vor", await page.evaluate(() => {
    fokusSek = 600; fokusPruefen();
    const o = document.getElementById("fokusPause");
    return o && o.textContent.includes("Bewegungspause") && !!document.getElementById("fokusWeiter"); }));
  await page.locator("#fokusSpaeter").click(); await page.waitForTimeout(100);
  check("„Gleich“ verschiebt die Pause um 2 Minuten", await page.evaluate(() =>
    !document.getElementById("fokusPause") && fokusSek === 480));
  await page.evaluate(() => { fokusSek = 600; fokusPruefen(); });
  await page.locator("#fokusWeiter").click(); await page.waitForTimeout(100);
  check("„Fertig“ beendet die Pause und setzt den Zähler zurück", await page.evaluate(() =>
    !document.getElementById("fokusPause") && fokusSek === 0 && !fokusPauseAktiv));
  check("Auf der Startseite löst der Zähler keine Pause aus", await page.evaluate(() => {
    goHome(); fokusSek = 600; fokusPruefen();
    const da = !!document.getElementById("fokusPause");
    fokusSek = 0; return !da; }));

  // ---------- 7fw) Satzglieder: Umstellen & Zeit/Ort ----------
  section("Satzglieder umstellen & Zeit/Ort");
  await fresh(); await setLevel(3);
  await openMod("Satzglieder", "Umstellen");
  check("Umstell-Übung: Ausgangssatz + Bausteine + Verb-Regel", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    return SG_UM_AUFGABEN.length === 9
      && t.includes("Ausgangssatz") && t.includes("2. Stelle")
      && document.querySelectorAll(".um-chip").length === SG_UM_AUFGABEN[0].teile.length; }));
  // Fehlversuch 1: identische Reihenfolge
  for (let i = 0; i < 4; i++) { await page.locator(`.um-chip[data-i="${i}"]`).click(); await page.waitForTimeout(40); }
  check("Gleiche Reihenfolge wird abgelehnt", (await page.locator("#umfb").textContent()).includes("Ausgangssatz"));
  await page.waitForTimeout(1400); // Auto-Reset abwarten
  // Fehlversuch 2: Verb nicht an 2. Stelle
  for (const i of [2, 3, 1, 0]) { await page.locator(`.um-chip[data-i="${i}"]`).click(); await page.waitForTimeout(40); }
  check("Verb nicht an 2. Stelle wird erklärt", (await page.locator("#umfb").textContent()).includes("2. Stelle"));
  await page.waitForTimeout(1400);
  // Gültige Umstellung: [2,1,0,3] -> Verb bleibt an Position 2
  for (const i of [2, 1, 0, 3]) { await page.locator(`.um-chip[data-i="${i}"]`).click(); await page.waitForTimeout(40); }
  check("Gültige Umstellung wird gefeiert", (await page.locator("#umfb").textContent()).includes("Super umgestellt"));
  await page.locator("#nextBtn").click(); await page.waitForTimeout(100);
  // Restliche Umstell-Aufgaben lösen (Muster [2,1,0,3,(4)] ist immer gültig)
  for (let k = 1; k < 5; k++) {
    const n = await page.evaluate(() => SG_UM_AUFGABEN[umIdx].teile.length);
    const folge = [2, 1, 0].concat(Array.from({ length: n - 3 }, (_, j) => j + 3));
    for (const i of folge) { await page.locator(`.um-chip[data-i="${i}"]`).click(); await page.waitForTimeout(30); }
    await page.locator("#nextBtn").click(); await page.waitForTimeout(80);
  }
  // Zeit/Ort-Aufgaben: erst Zeit (orange), dann Ort bzw. „Keine da!"
  check("Zeit/Ort-Aufgabe fragt zuerst nach der Zeitbestimmung", await page.evaluate(() =>
    SG_UM_AUFGABEN[umIdx].art === "zo"
    && document.getElementById("zoFrage").textContent.includes("Zeitbestimmung")));
  for (let k = 0; k < 4; k++) {
    const a = await page.evaluate(() => SG_UM_AUFGABEN[umIdx]);
    await page.locator(`.um-chip[data-i="${a.zeit}"]`).click(); await page.waitForTimeout(80);
    if (k === 0) check("Nach der Zeit kommt die Orts-Frage + „Keine da!“-Knopf", await page.evaluate(() =>
      document.getElementById("zoFrage").textContent.includes("Ortsbestimmung")
      && document.getElementById("zoKeine").style.display !== "none"));
    if (a.ort === null) await page.locator("#zoKeine").click();
    else await page.locator(`.um-chip[data-i="${a.ort}"]`).click();
    await page.waitForTimeout(80);
    await page.locator("#nextBtn").click(); await page.waitForTimeout(80);
  }
  check("Runde fertig: Auswertung mit voller Punktzahl", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent.replace(/\s+/g, " ");
    const m = t.match(/Auf Anhieb richtig:\s*(\d+)\s*von\s*(\d+)/);
    return !!document.getElementById("runAgain") && m && m[2] === "9"; }));

  // ---------- 7fx) Kein fest eingebauter Name mehr ----------
  section("Neutraler Spielername");
  await fresh(); await setLevel(3);
  check("Kein „Felix“ mehr in App-Quelltext und Spieldaten", await page.evaluate(() =>
    !document.documentElement.outerHTML.includes("Felix")
    && !JSON.stringify(SPIEL_DATEN).includes("Felix")
    && !JSON.stringify(RELEASE_NOTES).includes("Felix")));
  check("Spielername: eingegebener Name, sonst „Du“ (XML-sicher, max 10)", await page.evaluate(() => {
    store.name = ""; const a = spielerName();
    store.name = "Mia"; const b = spielerName();
    store.name = '<b>"Superlangername"</b>'; const c = spielerName();
    store.name = ""; save();
    return a === "Du" && b === "Mia" && !/[<>&"']/.test(c) && c.length <= 10; }));
  await page.evaluate(() => { store.name = "Mia"; store.muenzenAktiv = false; save(); });
  await openMod("Tennis-Match", null);
  await tapDialog("#tennisHost");
  await page.locator("#tennisStart").click(); await page.waitForTimeout(150);
  check("Tennisfeld zeigt den Namen des Kindes", (await page.locator("#tennisFeld").textContent()).includes("Mia"));

  // ---------- 7g) Einwertung: Schatzsuche mit Leo ----------
  section("Einwertung (Schatzsuche mit Leo)");
  await fresh(); await setLevel(3);
  check("Niveau-Daten: 246 Wörter · 94 L / 88 M / 64 S + Stichproben", await page.evaluate(() => {
    const werte = Object.values(GWS_NIVEAU);
    const z = { L: 0, M: 0, S: 0 }; werte.forEach(t => z[t]++);
    return werte.length === 246 && z.L === 94 && z.M === 88 && z.S === 64
      && gwsNiveau("das Bett") === "L" && gwsNiveau("gehen") === "M"
      && gwsNiveau("vielleicht") === "S" && gwsNiveau("die Stadt") === "M"
      && gwsNiveau("Fantasiewort") === "M"; }));
  check("Spiel-Fragen: Wort leicht nur L, schwer nur M/S – dazu Mathe im Mix", await page.evaluate(() => {
    let mathe = 0, wort = 0;
    for (let i = 0; i < 60; i++) {
      const l = spielFrage(false), s = spielFrage(true);
      if (l.mathe) mathe++; else { wort++; if (gwsNiveau(l.w.richtig) !== "L") return false; }
      if (s.mathe) mathe++; else { wort++; if (!["M", "S"].includes(gwsNiveau(s.w.richtig))) return false; }
    }
    return mathe > 10 && wort > 10; })); // beide Fragearten kommen wirklich vor
  check("Startseite lädt zur Schatzsuche ein", (await page.locator("#ewLos").count()) === 1);
  await setLevel(0);
  check("Bei „Alle“: Einladung ausgeblendet", !(await page.locator("#ewLos").count()));
  await setLevel(3);
  check("Zurück auf Klasse 3: Einladung wieder da", (await page.locator("#ewLos").count()) === 1);
  await page.locator("#ewSpaeter").click(); await page.waitForTimeout(100);
  check("„Später“ blendet nur für diese Sitzung aus", !(await page.locator("#ewLos").count()));
  await page.reload(); await page.waitForTimeout(300);
  check("Nach Neustart: Einladung wieder da (bis Test abgeschlossen)", (await page.locator("#ewLos").count()) === 1);
  check("Klassen-Start: Klasse 3 wärmt leicht auf, Klasse 4 startet mittel", await page.evaluate(() => {
    const alt = store.level;
    store.level = 3; const k3 = ewStartStufe();
    store.level = 4; const k4 = ewStartStufe();
    store.level = alt; save();
    return k3 === 0 && k4 === 1; }));
  // Start über den Elternbereich (Stufen-Tab)
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  check("Elternbereich: Einwertungs-Karte mit Start-Knopf", (await page.locator("#ewNeu").count()) === 1
    && (await page.locator("#moduleContent").textContent()).includes("Noch keine Einwertung"));
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; });
  await page.locator("#ewNeu").click(); await page.waitForTimeout(120);
  check("Intro: Leo erklärt, es gibt kein Falsch", (await page.locator("#ewStart").count()) === 1
    && (await page.locator("#moduleContent").textContent()).includes("kein Falsch"));
  await page.locator("#ewStart").click(); await page.waitForTimeout(150);
  // 8 Wort-Fragen, immer richtig -> Treppe steigt bis Schwer
  const ewStufen = [];
  for (let i = 0; i < 8; i++) {
    ewStufen.push(await page.evaluate(() => ew.stufe));
    const richtig = await page.evaluate(() => ew.frage.richtig);
    await page.locator(`.ew-opt[data-w="${richtig}"]`).click();
    await page.waitForTimeout(260);
  }
  check("Treppen-Prinzip: Klasse 3 startet leicht, steigt bis schwer", ewStufen[0] === 0 && ewStufen.includes(2)
    && ewStufen.every((s, i) => i === 0 || s >= ewStufen[i - 1]));
  // 3 Grammatik-Fragen, immer richtig
  for (let i = 0; i < 3; i++) {
    await page.locator('.ew-opt[data-ok="1"]').click();
    await page.waitForTimeout(260);
  }
  check("Ergebnis: Profil 🦁 Profi in beiden Bereichen gespeichert", await page.evaluate(() =>
    store.profil && store.profil.r === 2 && store.profil.g === 2 && !!store.profil.datum));
  check("Ergebnis-Schirm: Schatz + Tiere + Eltern-Hinweis", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    return t.includes("Schatz gefunden") && t.includes("Profi") && t.includes("Elternbereich"); }));
  check("Start-Stufen angehoben (Auto bleibt, Max-Klammer greift)", await page.evaluate(() =>
    store.progress["subj"].unlocked === 3 && store.progress["gws:dopp"].unlocked === 3
    && fieldLevel("subj") === 3 && fieldLevel("doppel") === 2));
  await page.locator("#ewFertig").click(); await page.waitForTimeout(150);
  check("Danach: Startseite ohne Einladung", await page.evaluate(() =>
    document.getElementById("screen-home").classList.contains("active") && !document.getElementById("ewLos")));
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  check("Elternbereich zeigt Einwertung + „Neu einwerten“", (await page.locator("#moduleContent").textContent()).includes("Einwertung vom")
    && (await page.locator("#ewNeu").textContent()).includes("Neu einwerten"));
  check("Feedback-Nutzungsdaten enthalten das Profil", await page.evaluate(() =>
    feedbackNutzung().profil && feedbackNutzung().profil.r === 2));
  await page.reload(); await page.waitForTimeout(300);
  check("Profil bleibt nach Neuladen erhalten", await page.evaluate(() =>
    store.profil && store.profil.r === 2 && store.progress["subj"].unlocked === 3));
  // Historie der Schatzsuchen
  check("Historie: erste Schatzsuche mit Datum + Uhrzeit gespeichert", await page.evaluate(() =>
    store.profilHistorie.length === 1 && store.profilHistorie[0].r === 2
    && /\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} Uhr/.test(store.profilHistorie[0].datum)));
  // Zweite Schatzsuche: alles falsch -> 🐣, aber Stufen sinken NICHT
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; });
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  await page.locator("#ewNeu").click(); await page.waitForTimeout(120);
  await page.locator("#ewStart").click(); await page.waitForTimeout(150);
  for (let i = 0; i < 8; i++) {
    const richtig = await page.evaluate(() => ew.frage.richtig);
    await page.evaluate(r => { [...document.querySelectorAll(".ew-opt")].find(b => b.dataset.w !== r).click(); }, richtig);
    await page.waitForTimeout(260);
  }
  for (let i = 0; i < 3; i++) { await page.locator('.ew-opt[data-ok="0"]').first().click(); await page.waitForTimeout(260); }
  check("Zweite Schatzsuche: 🐣-Profil, Historie mit 2 Einträgen in Reihenfolge", await page.evaluate(() =>
    store.profil.r === 0 && store.profilHistorie.length === 2
    && store.profilHistorie[0].r === 2 && store.profilHistorie[1].r === 0));
  check("Stufen sinken durch schwächere Einwertung NICHT", await page.evaluate(() =>
    store.progress["subj"].unlocked === 3));
  check("Kein Jubel bei schwächerem Ergebnis", !(await page.locator("#moduleContent").textContent()).includes("immer stärker"));
  await page.locator("#ewFertig").click(); await page.waitForTimeout(120);
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  check("Elternbereich: 📈 Entwicklung mit Trend-Pfeil ↘", await page.evaluate(() => {
    const h = document.getElementById("ewHistorie");
    return h && h.textContent.includes("2 Schatzsuchen") && h.innerHTML.includes("↘"); }));
  check("Verbesserung wird im Ergebnis gefeiert (🐣 → 🦁)", await page.evaluate(() => {
    ew = { punkte: Array.from({length: 8}, () => ({stufe: 2, ok: true})),
      gramPunkte: Array.from({length: 3}, () => ({stufe: 2, ok: true})),
      nr: 8, gramNr: 3, benutzt: [], phase: "gram" };
    ewErgebnis();
    const t = document.getElementById("moduleContent").textContent;
    ew = null;
    return t.includes("immer stärker") && store.profilHistorie.length === 3; }));

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

  // ---------- 8c) Lernsteuerung: Tagesform, Missionen, Pausen, Reizarm ----------
  section("Lernsteuerung (Tagesform & Mini-Missionen)");
  // Frischer Start OHNE vorbeantwortete Tagesform
  await page.goto(APP); await page.waitForTimeout(200);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(220);
  await setLevel(3);
  await openMod("Subjekte", null);
  check("Tagesform-Frage beim ersten Üben des Tages", (await page.locator("#tagesform").count()) === 1
    && (await page.locator("#tagesform .tf-wahl").count()) === 3);
  await page.locator('#tagesform .tf-wahl[data-m="rot"]').click(); await page.waitForTimeout(120);
  check("Antwort „schwer“: kürzere Missionen + kleineres Tagesziel", await page.evaluate(() =>
    tagesModus() === "rot" && missionLaenge() === 3 && tagesMissionsZiel() === (store.missionsZiel || 4) - 1));
  check("Tagesform gilt nur für heute (Datum gespeichert)", await page.evaluate(() =>
    store.tagesform.tag === heuteKey() && !("tagesformHistorie" in store)));
  await page.locator("#backBtn").click(); await page.waitForTimeout(80);
  await openMod("Prädikat", null);
  check("Tagesform wird am selben Tag nicht erneut gefragt", (await page.locator("#tagesform").count()) === 0);
  check("ROT-Tag: kein automatisches Hochstufen nach perfekter Runde", await page.evaluate(() => {
    const vor = fieldProg("subj").unlocked || 1;
    const r = runGet("subj", 2); r.solved = 2; r.first = 2; r.scored.add(0); r.scored.add(1);
    const d = document.createElement("div"); document.body.appendChild(d);
    renderRunResult(d, "subj", () => {}); d.remove(); runReset("subj");
    return tagesModus() === "rot" && (fieldProg("subj").unlocked || 1) === vor;
  }));
  // „Einfach loslegen" überspringt ohne Modus
  await page.evaluate(() => { delete store.tagesform; save(); });
  await page.reload(); await page.waitForTimeout(260);
  await openMod("Subjekte", null);
  await page.locator("#tfSkip").click(); await page.waitForTimeout(100);
  check("„Einfach loslegen“: kein Modus, normale Länge", await page.evaluate(() =>
    tagesModus() === "" && missionLaenge() === 4));
  // Eltern können die Frage abschalten
  await page.evaluate(() => { store.tagesformAktiv = false; delete store.tagesform; save(); });
  await page.locator("#backBtn").click(); await page.waitForTimeout(80);
  await openMod("Prädikat", null);
  check("Tagesform-Frage abschaltbar (Elternbereich)", (await page.locator("#tagesform").count()) === 0);
  // Mini-Missionen: Zähl-Schicht über fokusZaehle
  const mi = await page.evaluate(() => {
    store.tagesformAktiv = true; store.tagesform = { tag: heuteKey(), modus: "" }; save();
    missionAufg = 0; store.lerntage = []; save();
    for (let i = 0; i < missionLaenge(); i++) fokusZaehle();
    const t = store.lerntage[store.lerntage.length - 1];
    const tst = document.getElementById("appToast");
    return { mi: t ? t.mi : 0, toast: !!(tst && tst.classList.contains("an") && tst.textContent.includes("Mini-Mission")) };
  });
  check("Mini-Mission nach " + 4 + " Aufgaben abgeschlossen + Hinweis", mi.mi === 1 && mi.toast, JSON.stringify(mi));
  check("Tagesziel erreicht nach genug Missionen", await page.evaluate(() => {
    const t = lernTagHeute(); t.mi = tagesMissionsZiel() - 1; t.z = false; save();
    missionAufg = 0; for (let i = 0; i < missionLaenge(); i++) fokusZaehle();
    return lernTagHeute().z === true;
  }));
  // Tagesziel-Dialog in der Auswertung: Feierabend oder Bonus
  const ziel = await page.evaluate(() => {
    const t = lernTagHeute(); t.z = true; t.q = false; t.bo = 0; save();
    const d = document.createElement("div"); document.body.appendChild(d);
    renderRunResult(d, "subj", () => {});
    const mitBonus = !!d.querySelector("#zielBonus"), wahl = !!d.querySelector("#zielWahl");
    d.remove();
    store.bonusErlaubt = false; save();
    const d2 = document.createElement("div"); document.body.appendChild(d2);
    renderRunResult(d2, "subj", () => {});
    const ohneBonus = !!d2.querySelector("#zielBonus"), wahl2 = !!d2.querySelector("#zielWahl");
    d2.remove(); store.bonusErlaubt = true; save();
    return { wahl, mitBonus, wahl2, ohneBonus };
  });
  check("Tagesziel-Dialog: „fertig“ + freiwilliger Bonus", ziel.wahl && ziel.mitBonus, JSON.stringify(ziel));
  check("Bonus im Elternbereich abschaltbar", ziel.wahl2 && !ziel.ohneBonus, JSON.stringify(ziel));
  // Lernspur: Lücken bis 3 Tage schützen die Spur
  check("Lernspur zählt Ziel-Tage, Wochenend-Lücke schadet nicht", await page.evaluate(() => {
    const d = n => { const x = new Date(Date.now() - n * 86400000);
      return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
    store.lerntage = [{ t: d(9), m: "", mi: 4, bo: 0, z: true, q: true },
                      { t: d(3), m: "", mi: 4, bo: 0, z: true, q: true },
                      { t: d(1), m: "", mi: 4, bo: 0, z: true, q: true }]; save();
    const mitLuecke = lernspur();
    store.lerntage = [{ t: d(9), m: "", mi: 4, bo: 0, z: true, q: true }]; save();
    const alt = lernspur();
    store.lerntage = []; save();
    return mitLuecke === 2 && alt === 1;
  }));
  // Migration: kaputte lerntage-Daten werden bereinigt
  check("Speicher-Migration bereinigt lerntage", await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("lernapp_v1") || "{}");
    raw.lerntage = [{ t: "2026-07-01", m: "quatsch", mi: "x", bo: 9, z: 1, q: 0 }, "müll", null];
    raw.missionsZiel = 99; raw.pausenIntervall = 7; raw.kontrollBlick = "falsch";
    localStorage.setItem("lernapp_v1", JSON.stringify(raw));
    load();
    return Array.isArray(store.lerntage) && store.lerntage.every(e => e && typeof e.t === "string")
      && [2,3,4,5,6].includes(store.missionsZiel) && [5,10,15].includes(store.pausenIntervall)
      && ["reduziert","normal","haeufig"].includes(store.kontrollBlick);
  }));

  section("Kontroll-Blick, Pausen & reizarme Anzeige");
  await fresh(); await setLevel(3);
  // Kontroll-Blick „häufig": auch im Wörter-Training erst wählen, dann abgeben
  await page.evaluate(() => { store.kontrollBlick = "haeufig"; save(); });
  await openMod("Grundwortschatz", "Üben");
  await page.locator(".gws-gruppe").first().click(); await page.waitForTimeout(100);
  await page.locator(".gws-opt").first().click(); await page.waitForTimeout(80);
  check("GWS häufig: Wahl markiert, noch nicht gewertet", (await page.locator("#gwsAbgeben").isVisible())
    && (await page.locator("#gwsfb .feedback").count()) === 0);
  await page.locator("#gwsAbgeben").click(); await page.waitForTimeout(80);
  check("GWS häufig: Abgeben wertet die Antwort", (await page.locator("#gwsfb .feedback").count()) === 1);
  // Standard: einfache Wörter-Aufgaben OHNE erzwungenen Extra-Schritt
  await page.evaluate(() => { store.kontrollBlick = "normal"; save(); });
  await openMod("Grundwortschatz", "Üben");
  await page.locator(".gws-gruppe").first().click(); await page.waitForTimeout(100);
  await page.locator(".gws-opt").first().click(); await page.waitForTimeout(80);
  check("GWS normal: direkte Wertung (kein Zwang bei einfachen Aufgaben)",
    (await page.locator("#gwsfb .feedback").count()) === 1 && !(await page.locator("#gwsAbgeben").isVisible()));
  // Bewegungspausen: Eltern-Intervall + Abschalten
  check("Pausen-Intervall aus Elternbereich wirkt", await page.evaluate(() => {
    store.pausenIntervall = 5; save();
    const a = fokusPauseNach() === 300;
    store.pausenAktiv = false; fokusSek = 9999; fokusPruefen();
    const b = !document.getElementById("fokusPause");
    store.pausenAktiv = true; store.pausenIntervall = 10; fokusSek = 0; save();
    return a && b;
  }));
  // Reizarme Anzeige
  check("Animationen „reduziert“ setzt die CSS-Klasse", await page.evaluate(() => {
    store.animationen = "reduziert"; save(); animAnwenden();
    const an = document.documentElement.classList.contains("anim-reduziert");
    store.animationen = "normal"; save(); animAnwenden();
    return an && !document.documentElement.classList.contains("anim-reduziert");
  }));
  // Elternbereich-Tab „Lernen"
  await page.evaluate(() => goHome()); await page.waitForTimeout(100);
  await page.locator("#adminLink").click(); await page.waitForTimeout(120);
  await page.locator('.chip[data-tab="lernen"]').click(); await page.waitForTimeout(120);
  const lernTab = (await page.locator("#moduleContent").textContent()).replace(/\s+/g, " ");
  check("Eltern-Tab „Lernen“: alle Einstellungen sichtbar",
    lernTab.includes("Tagesform-Frage") && lernTab.includes("Mini-Missionen") && lernTab.includes("Bewegungspausen")
    && lernTab.includes("Kontroll-Blick") && lernTab.includes("Anzeige ruhiger") && lernTab.includes("Lern-Übersicht"));
  check("Keine Diagnose-Begriffe im Eltern-Tab", !/ADHS|Konzentrationsstörung|Defizit|unmotiviert/i.test(lernTab));
  await page.locator('.seg[data-mziel="3"]').click(); await page.waitForTimeout(100);
  check("Missionsziel umstellbar (3)", await page.evaluate(() => store.missionsZiel === 3));
  await page.locator('.seg[data-anim="reduziert"]').click(); await page.waitForTimeout(100);
  check("Animationen im Elternbereich umstellbar", await page.evaluate(() =>
    store.animationen === "reduziert" && document.documentElement.classList.contains("anim-reduziert")));
  // Start-Hilfe mit kleiner Wahl auf der Startseite
  await page.evaluate(() => { store.animationen = "normal"; animAnwenden();
    store.profil = store.profil || { quelle: "test" }; store.lerntage = []; save(); goHome(); });
  await page.waitForTimeout(140);
  check("Start-Hilfe: max 3 Vorschläge + Missions-Hinweis", await page.evaluate(() => {
    const n = document.querySelectorAll(".start-wahl").length;
    return n >= 2 && n <= 3 && document.querySelector("#moduleChooser").textContent.includes("Mini-Mission");
  }));
  check("Start-Hilfe verschwindet nach der ersten Mission", await page.evaluate(() => {
    store.lerntage = [{ t: heuteKey(), m: "", mi: 1, bo: 0, z: false, q: false }]; save(); goHome();
    return document.querySelectorAll(".start-wahl").length === 0;
  }));

  // ---------- 8d) Fokus-Modus: Übung ohne Scrollen ----------
  section("Fokus-Modus & Klick-durch-Wahl (v1.67)");
  await fresh(); await setLevel(3);
  await openMod("Subjekte", "Üben");
  check("Übung aktiviert den Fokus-Modus (kompakte Ansicht)", await page.evaluate(() =>
    document.getElementById("screen-content").classList.contains("uebung-fokus")));
  await page.locator("#backBtn").click(); await page.waitForTimeout(100);
  check("Zurück zur Gruppe beendet den Fokus-Modus", await page.evaluate(() =>
    !document.getElementById("screen-content").classList.contains("uebung-fokus")));
  check("Toast schwebt über dem Inhalt (nimmt keinen Platz weg)", await page.evaluate(() => {
    toast("Test");
    const st = getComputedStyle(document.getElementById("appToast"));
    return st.position === "fixed" && parseInt(st.zIndex, 10) >= 60;
  }));
  // GWS: Gruppe wechseln führt zurück zur Wahl
  await openMod("Grundwortschatz", "Üben");
  await page.locator(".gws-gruppe").nth(2).click(); await page.waitForTimeout(100);
  await page.locator("#gwsWechsel").click(); await page.waitForTimeout(100);
  check("„Gruppe wechseln“ führt zurück zur Wahl", (await page.locator(".gws-gruppe").count()) === 12);
  // Kompass: gleiche Klick-durch-Wahl (Kompass 4 gibt es nur in Klasse 4)
  await page.evaluate(() => goHome()); await page.waitForTimeout(100);
  await setLevel(4);
  await openMod("Kompass", "Sprache");
  check("Kompass-Üben: erst Bereich wählen", (await page.locator(".komp-bereich").count()) >= 3
    && (await page.locator("#quizHost").count()) === 0);
  await page.locator(".komp-bereich").first().click(); await page.waitForTimeout(120);
  check("Kompass: nach Wahl nur die Übung + „Bereich wechseln“", (await page.locator("#quizHost").count()) === 1
    && (await page.locator("#kompWechsel").count()) === 1);
  // Lernen-Seite: Regel-Gruppen als Aufklapp-Liste
  await page.locator("#backBtn").click(); await page.waitForTimeout(80);
  await openMod("Grundwortschatz", "Lernen");
  check("Regel-Gruppen als Aufklapp-Liste (zu, bis man tippt)", await page.evaluate(() =>
    document.querySelectorAll("details.regel-klapp").length === 12
    && [...document.querySelectorAll("details.regel-klapp")].every(d => !d.open)));
  check("Lücken-Frage fragt nie nach zugeklapptem Text", await page.evaluate(() => {
    const mc = document.getElementById("moduleContent");
    const d = mc.querySelector("details.regel-klapp");
    const probe = d.querySelector(".klapp-body .muted").textContent.trim().slice(0, 25);
    const zu = !pageText(mc).includes(probe);
    d.open = true;
    const offen = pageText(mc).includes(probe);
    d.open = false;
    return zu && offen;
  }));
  // Kein Scrollen auf kleinem Handy (360x640): Kern-Übungen passen komplett
  await page.setViewportSize({ width: 360, height: 640 });
  const passt = async (id, sec2) => {
    await page.evaluate(([i, s]) => { openModule(i); goSection(s); }, [id, sec2]);
    await page.waitForTimeout(220);
    return await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
  };
  check("Subjekte-Übung passt ohne Scrollen (360×640)", await passt("subjekt", "ueben"));
  check("Umstellen-Übung passt ohne Scrollen (360×640)", await passt("satzglieder", "umstellen"));
  check("GWS-Wahl passt ohne Scrollen (360×640)", await passt("gws", "ueben"));
  await page.evaluate(() => { document.querySelector(".gws-gruppe").click(); });
  await page.waitForTimeout(150);
  check("GWS-Übung passt ohne Scrollen (360×640)", await page.evaluate(() =>
    document.documentElement.scrollHeight <= window.innerHeight));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => goHome()); await page.waitForTimeout(100);

  // ---------- 8e) Mathe (Kompass 4 Mathematik) ----------
  section("Mathe: Fach, Übungen & Kompass-Training (v1.68)");
  await fresh();
  // Datenqualität: 5 Bereiche à 12+12 Aufgaben, Lösung nie doppelt
  check("Mathe-Daten: 5 Bereiche, je 12 leichte + 12 Kompass-Aufgaben", await page.evaluate(() =>
    MATHE_KEYS.length === 5 && MATHE_KEYS.every(k =>
      MATHE_DATEN[k].easy.length === 12 && MATHE_DATEN[k].hard.length === 12)));
  check("Mathe-Daten: immer 2 Falsch-Antworten, Lösung nie darunter", await page.evaluate(() =>
    MATHE_KEYS.every(k => MATHE_DATEN[k].easy.concat(MATHE_DATEN[k].hard).every(a =>
      a.x.length === 2 && !a.x.includes(a.r) && a.tipp && a.f))));
  check("Spiele: Mathe-Fragen kompakt, 3 gemischte Antworten, eigener Fragetext", await page.evaluate(() => {
    for (let i = 0; i < 20; i++) {
      const q = spielMatheFrage(i % 2 === 0);
      if (!q || !q.mathe || q.f === "") return false;
      const o = spielOptionen(q.w);
      if (o.length !== 3 || !o.includes(q.w.richtig) || new Set(o).size !== 3) return false;
      if (!spielFrageText(q).includes(q.frage) || o.some(x => x.length > 16)) return false;
    }
    return spielFrageText({ w: { richtig: "kommen" } }).includes("richtig");
  }));
  // Fach-Umschaltung auf der Startseite
  await page.locator('#fachRow .level-btn[data-fach="mathe"]').click(); await page.waitForTimeout(150);
  check("Fach Mathe: 2 Mathe-Gruppen + Spielhalle, Deutsch-Kacheln weg", await page.evaluate(() => {
    const t = document.getElementById("moduleChooser").textContent;
    return t.includes("Zahlen & Rechnen") && t.includes("Formen, Größen & Daten")
      && t.includes("Spielhalle") && !t.includes("Sätze & Grammatik") && !t.includes("Fit für Klasse 4");
  }));
  check("Fach übersteht Reload", await page.evaluate(() => { save(); load(); return store.fach === "mathe"; }));
  // Mathe-Gruppe: keine Deutsch-Themen-Wahl
  await page.evaluate(() => openGruppe("mzahlrech")); await page.waitForTimeout(150);
  check("Mathe-Gruppe: 2 Lernfelder, keine Themen-Wahl", await page.evaluate(() =>
    document.querySelectorAll("#gruppenGrid .choice").length === 2
    && !document.getElementById("moduleContent").textContent.includes("Thema")));
  // Rechnen: Lernen-Seite + Übung mit voller Anbindung
  await page.evaluate(() => openModule("mrechnen")); await page.waitForTimeout(200);
  check("Rechnen: Lernen-Seite mit Strategie-Tipp", (await page.locator("#moduleContent").textContent()).includes("stellenweise"));
  await page.evaluate(() => goSection("ueben")); await page.waitForTimeout(200);
  check("Mathe-Übung: Fokus-Modus + Stufen-Anzeige", await page.evaluate(() =>
    document.getElementById("screen-content").classList.contains("uebung-fokus")
    && /Aktive Stufe \d\/3/.test(document.querySelector(".lvl-badge").textContent)));
  check("Klasse 3: Start auf Stufe 1 (Aufwärmen)", await page.evaluate(() => {
    store.level = 3; return fieldLevel("mrechnen") === 1; }));
  check("Klasse 4: Start auf Stufe 2 (Kompass-Niveau)", await page.evaluate(() => {
    store.level = 4; const l = fieldLevel("mrechnen"); store.level = 3; return l === 2; }));
  // ohne Antwort blockiert; richtige Antwort zählt für Runde + Mission
  await page.locator("#mNext").click(); await page.waitForTimeout(80);
  check("Mathe: ohne Antwort blockiert", /zuerst/i.test(await page.locator("#mfb").textContent()));
  const mRichtig = await page.evaluate(() => gwsChunk("mrechnen").S[matheIdx].r);
  const mBtns = page.locator(".mathe-opt");
  for (let k = 0; k < await mBtns.count(); k++) {
    if ((await mBtns.nth(k).textContent()) === mRichtig) { await mBtns.nth(k).click(); break; }
  }
  await page.waitForTimeout(120);
  check("Mathe: richtige Antwort erkannt + Erklär-Tipp", /Richtig/.test(await page.locator("#mfb").textContent()));
  check("Mathe zählt für Runde und Mini-Mission", await page.evaluate(() =>
    scoreRuns["mrechnen"].solved === 1 && missionAufg >= 1));
  // Runde komplett lösen -> Auswertung mit Stufen-System
  await page.locator("#mNext").click(); await page.waitForTimeout(100);
  let mg = 0;
  while (mg++ < 14) {
    if (await page.locator("#runAgain").count()) break;
    const ri = await page.evaluate(() => gwsChunk("mrechnen").S[matheIdx] ? gwsChunk("mrechnen").S[matheIdx].r : null);
    if (!ri) break;
    const bb = page.locator(".mathe-opt");
    for (let k = 0; k < await bb.count(); k++) {
      if ((await bb.nth(k).textContent()) === ri) { await bb.nth(k).click(); break; }
    }
    await page.waitForTimeout(40);
    await page.locator("#mNext").click(); await page.waitForTimeout(60);
  }
  ovl = await closeOverlay();
  check("Mathe-Runde perfekt: Stufe 2 freigeschaltet", ovl === "Stufe 2 freigeschaltet!", String(ovl));
  check("Mathe-Auswertung mit Blume erreicht", (await page.locator("#runAgain").count()) === 1);
  // Blatt: schriftliches Rechnen
  await page.evaluate(() => goSection("blatt")); await page.waitForTimeout(120);
  check("Rechnen-Arbeitsblatt (schriftlich, mit der Hand)", (await page.locator("#worksheet").textContent()).includes("1691 + 268"));
  // Mathe-Test im Test-Training (nur Fach Mathe + Klasse 4)
  await page.evaluate(() => { store.level = 4; save(); goHome(); }); await page.waitForTimeout(120);
  await page.evaluate(() => openTestTraining()); await page.waitForTimeout(150);
  check("Fach Mathe: nur der Mathe-Test wird angeboten", await page.evaluate(() =>
    [...document.querySelectorAll(".test-start")].map(b => b.dataset.typ).join(",") === "mathe"));
  await page.locator('.test-start[data-typ="mathe"]').click(); await page.waitForTimeout(250);
  check("Mathe-Test: 12 Aufgaben aus 5 Bereichen", await page.evaluate(() =>
    test.aufgaben.length === 12 && test.max === 12 && Object.keys(test.bereiche).length === 5));
  // Erste Aufgabe mit Kontroll-Blick richtig lösen
  const tRichtig = await page.evaluate(() => { const o = test.aufgaben[0].a.o.find(x => x[1] === 1); return o[0]; });
  const tOpts = page.locator(".test-opt");
  for (let k = 0; k < await tOpts.count(); k++) {
    if ((await tOpts.nth(k).textContent()).trim() === tRichtig) { await tOpts.nth(k).click(); break; }
  }
  await page.waitForTimeout(100);
  await page.locator("#testAbgeben").click(); await page.waitForTimeout(120);
  check("Mathe-Test: Kontroll-Blick + Punkt bei richtiger Antwort", await page.evaluate(() => test.punkte === 1));
  // Bei Fach Deutsch taucht der Mathe-Test nicht auf
  check("Fach Deutsch: kein Mathe-Test im Katalog", await page.evaluate(() => {
    store.fach = "deutsch"; const ohne = !testsFuerKlasse().some(t => t.typ === "mathe");
    store.fach = "mathe"; save(); return ohne;
  }));
  // Kein Scrollen auf kleinem Handy
  await page.setViewportSize({ width: 360, height: 640 });
  check("Mathe-Übung passt ohne Scrollen (360×640)", await passt("mzahlen", "ueben"));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => { store.fach = "deutsch"; save(); goHome(); }); await page.waitForTimeout(100);

  // ---------- 8f) Leos Sommer-Reise (Ferienprogramm) ----------
  section("Leos Sommer-Reise (Ferienprogramm, v1.70)");
  await fresh();
  check("Reise-Daten: 8 Etappen mit Story + 2-3 kleinen Aufträgen", await page.evaluate(() =>
    FERIEN_ETAPPEN.length === 8 && FERIEN_PUNKTE.length === 8
    && FERIEN_ETAPPEN.every(e => e.story && e.auftraege.length >= 2 && e.auftraege.length <= 3)));
  check("Reise mischt Deutsch, Mathe und Lesen im Buch", await page.evaluate(() => {
    const alle = FERIEN_ETAPPEN.flatMap(e => e.auftraege);
    const mathe = alle.filter(a => a.typ === "runde" && a.key.startsWith("m")).length;
    const deutsch = alle.filter(a => a.typ === "runde" && !a.key.startsWith("m")).length;
    const lesen = alle.filter(a => a.typ === "lesen").length;
    return mathe >= 4 && deutsch >= 4 && lesen >= 3;
  }));
  check("Reise-Kachel auf der Startseite (auch bei Fach Mathe)", await page.evaluate(() => {
    const de = document.querySelectorAll(".ferien-kachel").length;
    store.fach = "mathe"; buildModuleChooser();
    const ma = document.querySelectorAll(".ferien-kachel").length;
    store.fach = "deutsch"; buildModuleChooser();
    return de === 1 && ma === 1;
  }));
  await page.locator(".ferien-kachel").click(); await page.waitForTimeout(200);
  check("Intro mit Leo, Reisekarte und Erklärung", await page.evaluate(() =>
    document.querySelectorAll("#moduleContent svg circle").length === 8
    && document.getElementById("moduleContent").textContent.includes("eine pro Tag")));
  await page.locator("#ferienLos").click(); await page.waitForTimeout(200);
  check("Reise gestartet: Etappe 1 offen, Basis gemerkt, nur aktuelle Etappe sichtbar", await page.evaluate(() =>
    store.ferien.etappe === 0 && "e1w" in store.ferien.base
    && document.getElementById("moduleContent").textContent.includes("Etappe 1")
    && !document.getElementById("moduleContent").textContent.includes("Etappe 2")));
  check("„Los!“ führt direkt ins Lernfeld", await page.evaluate(() => {
    document.querySelector(".ferien-geh").click();
    return activeModuleId === "gws";
  }));
  await page.evaluate(() => openFerien()); await page.waitForTimeout(150);
  await page.locator(".ferien-lesen").click(); await page.waitForTimeout(200);
  check("Lese-Auftrag (eigenes Buch) per Bestätigung + Lob-Toast", await page.evaluate(() =>
    !!store.ferien.lesen.e1l && document.getElementById("appToast").textContent.includes("gelesen")));
  check("Etappe fertig: weiterreisen + 1 Münze + neue Basis", await page.evaluate(() => {
    store.progress["gws:dopp"] = { unlocked: 1, runs: 1 };
    store.progress["mrechnen"] = { unlocked: 1, runs: 1 };
    const m0 = store.muenzen || 0;
    save(); ferienPlan();
    return store.ferien.etappe === 1 && store.muenzen === m0 + 1 && "e2s" in store.ferien.base;
  }));
  check("Reisekarte: geschaffte Etappe golden (⭐), Leo am Standort", await page.evaluate(() => {
    const t = document.querySelector("#moduleContent svg").innerHTML;
    return t.includes("⭐") && t.includes("🦁");
  }));
  check("Spielbesuch erfüllt den Spiel-Auftrag der aktuellen Etappe", await page.evaluate(() => {
    store.ferien.etappe = 2; ferienBaseSetzen(2); store.muenzenAktiv = false; save();
    openModule("spiel");
    return !!store.ferien.spiele.e3sp;
  }));
  check("Finale: Tests bestanden → Urkunde + 3 Münzen (einmalig)", await page.evaluate(() => {
    const f = store.ferien;
    FERIEN_ETAPPEN.forEach(et => et.auftraege.forEach(a => {
      if (a.typ === "runde") { f.base[a.id] = 0; store.progress[a.key === "gws" ? "gws:dopp" : a.key] = { unlocked: 1, runs: 5 }; }
      if (a.typ === "spiel") f.spiele[a.id] = heuteKey();
      if (a.typ === "lesen") f.lesen[a.id] = heuteKey();
    }));
    store.testHistorie = [{ datum: "x", p: 9, max: 13, typ: "sprache" }, { datum: "x", p: 10, max: 12, typ: "mathe" }];
    f.testsBasis = 0; save(); ferienPlan();
    const m1 = store.muenzen;
    ferienPlan(); // erneut rendern darf NICHT nochmal belohnen
    return !!store.ferien.fertig && store.muenzen === m1
      && document.getElementById("moduleContent").textContent.includes("REISE-URKUNDE");
  }));
  check("Speicher-Migration bereinigt kaputte Reise-Daten", await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("lernapp_v1") || "{}");
    raw.ferien = { etappe: 99, base: "müll", spiele: null, lesen: 7, start: 5, fertig: 12 };
    localStorage.setItem("lernapp_v1", JSON.stringify(raw));
    load();
    const f = store.ferien;
    return f.etappe === FERIEN_ETAPPEN.length - 1 && typeof f.base === "object" && !Array.isArray(f.base)
      && typeof f.spiele === "object" && typeof f.lesen === "object"
      && typeof f.start === "string" && f.fertig === null;
  }));

  // ---------- 8g) Geschichten-Werkstatt + „Bist du fit?"-Test ----------
  section("Geschichten-Werkstatt & Fit-Test (v1.72)");
  await fresh(); await setLevel(3);
  check("Werkstatt-Daten: 12 leichte + 12 schwere Aufgaben, sauber", await page.evaluate(() =>
    GESCH_DATEN.easy.length === 12 && GESCH_DATEN.hard.length === 12
    && GESCH_DATEN.easy.concat(GESCH_DATEN.hard).every(a => a.x.length === 2 && !a.x.includes(a.r) && a.tipp)));
  check("Werkstatt in der Gruppe „Schreiben & Lesen“", await page.evaluate(() =>
    MODUL_GRUPPEN.find(g => g.id === "schreiben").module.includes("gesch")));
  await page.evaluate(() => openModule("gesch")); await page.waitForTimeout(200);
  check("Lernen-Seite erklärt E/H/S + Zeitform-Trick", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    return t.includes("Einleitung") && t.includes("Hauptteil") && t.includes("Schluss") && t.includes("Verb");
  }));
  await page.evaluate(() => goSection("ueben")); await page.waitForTimeout(200);
  check("Übung: Kontext-Text ohne doppelten Vorlesen-Knopf", await page.evaluate(() =>
    document.querySelectorAll(".example-box").length >= 0
    && document.querySelectorAll("#moduleContent .speak-btn").length <= 1));
  const gR = await page.evaluate(() => gwsChunk("gesch").S[matheIdx].r);
  const gB = page.locator(".mathe-opt");
  for (let k = 0; k < await gB.count(); k++) {
    if ((await gB.nth(k).textContent()) === gR) { await gB.nth(k).click(); break; }
  }
  await page.waitForTimeout(120);
  check("Werkstatt: richtige Antwort + Tipp, zählt für Runde", /Richtig/.test(await page.locator("#mfb").textContent())
    && await page.evaluate(() => scoreRuns["gesch"].solved === 1));
  check("Stufe 2 = Zeitformen & wörtliche Rede (hard-Pool)", await page.evaluate(() => {
    const p = fieldPool("gesch"); // Stufe 1
    store.progress["gesch"] = { unlocked: 2, runs: 1 };
    const p2 = fieldPool("gesch");
    delete store.progress["gesch"];
    return p[0].f !== p2[0].f && p2.some(a => a.f.includes("Präsens"));
  }));
  // „Bist du fit?"-Test
  await page.evaluate(() => { goHome(); openTestTraining(); }); await page.waitForTimeout(200);
  check("Fit-Test im Katalog (Klasse 3 UND 4)", await page.evaluate(() => {
    const k3 = testsFuerKlasse().some(t => t.typ === "fit");
    store.level = 4; const k4 = testsFuerKlasse().some(t => t.typ === "fit");
    store.level = 3; return k3 && k4;
  }));
  await page.locator('.test-start[data-typ="fit"]').click(); await page.waitForTimeout(250);
  check("Fit-Test: 12 Aufgaben, 12 Punkte, 3 Aufgaben-Arten, 4 Bereiche", await page.evaluate(() =>
    test.aufgaben.length === 12 && test.max === 12
    && new Set(test.aufgaben.map(a => a.art)).size === 3
    && Object.values(test.bereiche).every(b => b.max > 0)));
  check("Fit-Wahl-Aufgaben decken Heft-Themen ab", await page.evaluate(() =>
    FIT_WAHL.some(q => q.frage.includes("Kutsche")) && FIT_WAHL.some(q => q.frage.includes("Fragezeichen") || q.frage.includes("Satzzeichen"))
    && FIT_WAHL.some(q => q.frage.includes("Expresszug")) && FIT_WAHL.some(q => q.frage.includes("pflückte"))
    && FIT_WAHL.every(q => q.o.filter(o => o[1] === 1).length === 1)));
  // Erste Aufgabe (Subjekt antippen) via Kontroll-Blick lösen
  const fitArt = await page.evaluate(() => test.aufgaben[0].art);
  check("Fit-Test startet mit Subjekt/Prädikat-Antippen", fitArt === "sp");
  await page.evaluate(() => { test.idx = 2; testFrage(); }); await page.waitForTimeout(150);
  const fitWahlOk = await page.evaluate(() => {
    const richtig = test.aufgaben[2].a.o.find(o => o[1] === 1)[0];
    const btn = [...document.querySelectorAll(".test-opt")].find(b => b.textContent.trim() === richtig);
    btn.click();
    document.getElementById("testAbgeben").click();
    return test.punkte === 1;
  });
  check("Fit-Test: Wahl-Aufgabe mit Kontroll-Blick + Punkt", fitWahlOk);

  // ---------- 8h) Konzentrations-Training: Zahlenkette + Alphabet-Sprünge ----------
  section("Konzentrations-Training (v1.73)");
  await fresh();
  await page.evaluate(() => { window.__SPIEL_SCHNELL__ = true; });
  check("Kachel auf der Startseite (auch bei Fach Mathe)", await page.evaluate(() => {
    const de = document.querySelectorAll(".konz-kachel").length;
    store.fach = "mathe"; buildModuleChooser();
    const ma = document.querySelectorAll(".konz-kachel").length;
    store.fach = "deutsch"; buildModuleChooser();
    return de === 1 && ma === 1;
  }));
  await page.locator(".konz-kachel").click(); await page.waitForTimeout(200);
  check("Info-Seite erklärt beide Spiele", await page.evaluate(() => {
    const t = document.getElementById("moduleContent").textContent;
    return t.includes("Zahlenkette") && t.includes("Alphabet-Sprünge");
  }));
  // Zahlenkette: Start mit 2 Zahlen, Merkphase, korrekte Eingabe -> Kette wächst (1x/Tag)
  await page.evaluate(() => goSection("zahlen")); await page.waitForTimeout(150);
  check("Zahlenkette startet mit 2 Zahlen + Fokus-Modus", await page.evaluate(() =>
    store.kette.zahlen.length === 2 && store.kette.zahlen.every(z => z >= 1 && z <= 50)
    && document.getElementById("screen-content").classList.contains("uebung-fokus")));
  await page.locator("#ketteStart").click();
  await page.waitForFunction(() => document.querySelectorAll(".kette-z").length === 10, null, { timeout: 8000 });
  const ketteOk = await page.evaluate(async () => {
    const tipp = async (zahl) => {
      for (const d of String(zahl)) document.querySelector(`.kette-z[data-z="${d}"]`).click();
      document.getElementById("ketteOk").click();
      await new Promise(r => setTimeout(r, 40));
    };
    const vorher = store.kette.zahlen.slice();
    for (const z of vorher) await tipp(z);
    return { laenge: store.kette.zahlen.length, erweitert: store.kette.erweitertAm === heuteKey(),
      text: document.getElementById("moduleContent").textContent.includes("wächst") };
  });
  check("Fehlerfrei aufgesagt: Kette wächst um 1 (heute)", ketteOk.laenge === 3 && ketteOk.erweitert && ketteOk.text, JSON.stringify(ketteOk));
  check("Mini-Mission zählt mit (fokusZaehle)", await page.evaluate(() => missionAufg >= 1));
  check("Nur 1 Erweiterung pro Tag + Fehler behält die Kette", await page.evaluate(async () => {
    konzZahlen(document.getElementById("moduleContent"));
    document.getElementById("ketteStart").click();
    await new Promise(r => setTimeout(r, 900)); // Merkphase (schnell) abwarten
    if (!document.querySelector(".kette-z")) return false;
    // absichtlich falsche erste Zahl tippen
    const falsch = (store.kette.zahlen[0] + 1) % 10;
    document.querySelector(`.kette-z[data-z="${String(falsch)[0]}"]`).click();
    document.getElementById("ketteOk").click();
    await new Promise(r => setTimeout(r, 40));
    return store.kette.zahlen.length === 3
      && document.getElementById("moduleContent").textContent.includes("Fast!");
  }));
  check("7er-Kette: Feier, Rekord, Neustart mit 2 Zahlen", await page.evaluate(() => {
    store.kette.zahlen = [11, 22, 33, 44, 55, 66, 77]; save();
    ketteEingabe = [11, 22, 33, 44, 55, 66]; ketteTipp = "";
    const host = document.createElement("div"); document.body.appendChild(host);
    ketteEingabe.push(77); konzKetteGeschafft(host);
    const ok = store.kette.rekord === 7 && store.kette.zahlen.length === 2
      && host.textContent.includes("WAHNSINN");
    host.remove(); return ok;
  }));
  // Alphabet-Sprünge
  check("ABC-Folgen stimmen (vorwärts/rückwärts, jeder 2./3.)", await page.evaluate(() => {
    const f = (i) => abcFolge(ABC_STUFEN[i]).join("");
    return f(0).startsWith("ACEG") && f(0).length === 13
      && f(1).startsWith("ADGJ") && f(2).startsWith("ZXVT") && f(3).startsWith("ZWTQ");
  }));
  await page.evaluate(() => goSection("abc")); await page.waitForTimeout(150);
  check("ABC-Tastenfeld: 26 Buchstaben + 4 Stufen-Chips", (await page.locator(".abc-taste").count()) === 26
    && (await page.locator('.chip[data-st]').count()) === 4);
  const abcErg = await page.evaluate(async () => {
    // Stufe 1 komplett richtig durchtippen, mit einem absichtlichen Fehler am Anfang
    document.querySelector('.abc-taste[data-b="B"]').click(); // falsch
    const folge = abcFolge(ABC_STUFEN[0]);
    for (const b of folge) { document.querySelector(`.abc-taste[data-b="${b}"]`).click(); }
    await new Promise(r => setTimeout(r, 60));
    return { fertig: document.getElementById("abcfb").textContent.includes("Geschafft"),
      fehler: abcFehler, best: (store.abcBest || {}).v2 };
  });
  check("ABC-Lauf: Fehler gezählt, Abschluss + Bestwert gespeichert",
    abcErg.fertig && abcErg.fehler === 1 && abcErg.best === 1, JSON.stringify(abcErg));
  check("Speicher-Migration bereinigt Kette + ABC-Bestwerte", await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("lernapp_v1") || "{}");
    raw.kette = { zahlen: [5, "x", 999, 12], erweitertAm: 7, rekord: "99" };
    raw.abcBest = { v2: "3", quatsch: 5, r2: -2 };
    localStorage.setItem("lernapp_v1", JSON.stringify(raw));
    load();
    return store.kette.zahlen.join(",") === "5,12" && store.kette.erweitertAm === ""
      && store.kette.rekord === 7 && store.abcBest.v2 === 3 && !("quatsch" in store.abcBest) && !("r2" in store.abcBest);
  }));

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
