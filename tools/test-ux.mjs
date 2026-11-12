// Test d'expérience des onze fiches machines (navigateur réel, rendu logiciel). Deux expériences distinctes sont vérifiées :
//  - « Voir la magie » : moteur d'icônes (flow.js) : ouverture, icônes, signal, légende, temps actif (la page cachée ne le fait pas avancer),
//    pause, résultat (mouvements réduits : état final statique), rejeu, fermeture et focus, sortie vers la machine sans second clic ;
//  - « Explorer la machine » : mode Explorer (commandes avancées ouvertes d'emblée, aucune démonstration imposée), démonstration guidée
//    (depuis le panneau), progression du temps, pause, reprise, inspection, sortie.
// Trois tailles : 1920 × 1080 (magie), 1440 × 900 et 390 × 844 (tout).
// Usage : node tools/test-ux.mjs [slug]   (SHOTS=dossier pour enregistrer les captures)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { routeCheckout } from './route-checkout.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const fail = []; const log = (...a) => console.log(...a);
const PAGES = ['moteur44', 'studio', 'gares', 'cerfa', 'finance', 'vmvre', 'pa', 'powerbi', 'vre', 'suivi', 'lecteur-vre'];
const only = process.argv[2], SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const origin = 'http://cv.test';
let chromium; { const { createRequire } = await import('node:module'); const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q18/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = (p) => p.evaluate(() => { const d = document.querySelector('.rf-cb-dock'); return { mode: d?.dataset.mode, t: +(d?.dataset.t || 0), paused: d?.dataset.paused === 'true' }; });
const waitMachine = async (p, tag) => { await p.waitForSelector('.rf-cb-dock', { state: 'attached', timeout: 90000 }).catch(() => fail.push(`${tag} : la machine ne se charge pas`)); await p.waitForFunction(() => window.__rfFlowReady && window.__rfTest, null, { timeout: 90000 }).catch(() => fail.push(`${tag} : moteurs non prêts (magie ou API de test)`)); await p.evaluate(() => window.__rfFlowReady); };
const settled = (p) => p.waitForFunction(() => { const r = document.querySelector('.cv-cb-panel').getBoundingClientRect(); const k = r.top + '/' + r.height, ok = window.__ph === k; window.__ph = k; return ok; }, null, { polling: 160, timeout: 8000 });   // le tiroir a fini son animation
const flowT = (p) => p.evaluate(() => window.__rfFlowTest?.state());
async function open(slug, w, h, reduced) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: w < 700 });
  await ctx.addInitScript(() => { const c = { vis: 0, key: 0 }; window.__lc = c; for (const T of [document, window]) { const a = T.addEventListener.bind(T), r = T.removeEventListener.bind(T); T.addEventListener = (t, f, o) => { if (t === 'visibilitychange') c.vis++; if (t === 'keydown') c.key++; return a(t, f, o); }; T.removeEventListener = (t, f, o) => { if (t === 'visibilitychange') c.vis--; if (t === 'keydown') c.key--; return r(t, f, o); }; } }); const p = await ctx.newPage(); p.setDefaultTimeout(60000);
  p.__errs = []; p.on('pageerror', (e) => p.__errs.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${port}/projet-${slug}.html?uxtest`, { waitUntil: 'domcontentloaded' }); return p;
}


for (const slug of PAGES) {
  if (only && only !== slug) continue;
  for (const [vp, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const tag = `${slug} ${vp}`;
    const p = await open(slug, w, h, false); await waitMachine(p, tag);
    // 1. habillage : surcouche transparente, supports sans pointillés
    const ov = await p.evaluate(() => { const o = document.querySelector('.fl-ov'); if (!o) return null; const c = getComputedStyle(o); return { bg: c.backgroundImage + c.backgroundColor, dashed: [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).filter((t) => /\.(b3|k3|lh|lv)\b[^{]*\{[^}]*dashed/.test(t)).length }; });
    if (!ov) fail.push(`${tag} : moteur d'icônes absent (.fl-ov)`); else { if (/11, 13, 14/.test(ov.bg)) fail.push(`${tag} : fond noir de la surcouche`); if (ov.dashed) fail.push(`${tag} : ${ov.dashed} règles pointillées sur les supports`); }
    // 2. contenu
    const c = await p.evaluate(() => ({ cta: document.querySelector('.rf-cta[data-demo="magic"]')?.textContent + '|' + document.querySelector('.rf-cta[data-demo="explore"]')?.textContent, steps: document.querySelectorAll('.rf-marche-steps>li').length, detail: !!document.querySelector('.rf-marche-more summary'), book: /Fig \d+\.\d|du livre/.test(document.body.textContent), result: !!document.querySelector('.rf-marche')?.dataset.resultTitle }));
    if (c.cta !== 'Voir la magie|Explorer la machine') fail.push(`${tag} : CTA absents ou mal nommés (${c.cta})`);
    if (c.steps !== 5) fail.push(`${tag} : ${c.steps} étapes visibles au lieu de 5`);
    if (!c.detail) fail.push(`${tag} : processus détaillé absent`);
    if (c.book) fail.push(`${tag} : analogie du livre encore présente`);
    if (!c.result) fail.push(`${tag} : texte de résultat absent`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-1-initial.png` });

    // 3. « Voir la magie » : conditions vérifiables, pas d'attente fixe
    await p.focus('.rf-cta[data-demo="magic"]'); await p.click('.rf-cta[data-demo="magic"]', { force: true });
    await p.waitForSelector('.fl-ov.is-open', { timeout: 20000 }).catch(() => fail.push(`${tag} : « Voir la magie » ne s'ouvre pas`));
    await p.waitForFunction(() => !!document.activeElement?.closest('.fl-ov'), null, { timeout: 5000 }).catch(() => {});
    await p.waitForFunction(() => +getComputedStyle(document.querySelector('.rf-bnav')).opacity < .05, null, { timeout: 8000 }).catch(() => {});
    const a11y = await p.evaluate(() => ({ modal: document.querySelector('.fl-ov')?.getAttribute('aria-modal'), inert: !!document.querySelector('main')?.hasAttribute('inert'), focus: !!document.activeElement?.closest(".fl-ov"), nav: getComputedStyle(document.querySelector('.rf-bnav')).opacity }));
    if (a11y.modal !== 'true' || !a11y.inert || !a11y.focus) fail.push(`${tag} : dialogue mal formé (${JSON.stringify(a11y)})`);
    if (+a11y.nav > .05) fail.push(`${tag} : la navigation reste visible pendant la magie`);
    // le temps actif avance tout seul
    await p.waitForFunction(() => window.__rfFlowTest.state().t > 400, null, { timeout: 30000 }).catch(() => fail.push(`${tag} : le temps actif de la magie n'avance pas`));
    // étape active définie : positionnement déterministe sur la première icône atteinte
    await p.evaluate(() => window.__rfFlowTest.seek(1500, true));
    await p.waitForFunction(() => window.__rfFlowTest.state().cur === 0, null, { timeout: 10000 }).catch(() => fail.push(`${tag} : aucune icône active à l'arrivée du signal`));
    await p.waitForFunction(() => [...document.querySelectorAll('.fl3 .k3')].some((e) => +getComputedStyle(e).opacity > .05), null, { timeout: 10000 }).catch(() => {});
    const mg = await p.evaluate(() => { const k = [...document.querySelectorAll('.fl3 .k3')]; return { cap: document.querySelector('.fl-ov-step')?.textContent || '', visible: k.filter((e) => +getComputedStyle(e).opacity > .05).length, tiles: document.querySelectorAll('.k3 svg, .k3 img').length, wires: document.querySelectorAll('.l3-b').length, ctl: !!document.querySelector('.fl-ov-ctl [data-act="pause"]'), cur: document.querySelectorAll('.k3.cur').length }; });
    if (!/Étape 1 \/ \d+/.test(mg.cap)) fail.push(`${tag} : légende de l'étape active absente (${mg.cap.slice(0, 30)})`);
    if (mg.cur !== 1) fail.push(`${tag} : ${mg.cur} icônes actives au lieu d'une`);
    if (mg.tiles < 5 || mg.visible < 1) fail.push(`${tag} : icônes manquantes (${mg.tiles}/${mg.visible})`);
    if (mg.wires < mg.tiles - 1) fail.push(`${tag} : connexions manquantes (${mg.wires} pour ${mg.tiles})`);
    if (!mg.ctl) fail.push(`${tag} : commande de pause absente`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-2b-magie.png` });
    // zones mobiles : légende, processus et commandes ne se chevauchent pas, rien sous l'encoche
    if (vp === 'mobile') {
      const z = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { step: r('.fl-ov-step'), win: r('.fl-ov-w'), ctl: r('.fl-ov-ctl'), x: r('.fl-ov-x') }; });
      if (z.step.bottom > z.win.top + 4) fail.push(`${tag} : la légende chevauche le processus (${Math.round(z.step.bottom)} > ${Math.round(z.win.top)})`);
      if (z.win.bottom > z.ctl.top + 4) fail.push(`${tag} : le processus chevauche les commandes`);
      if (z.x.top < 0 || z.x.right > w) fail.push(`${tag} : bouton fermer hors écran`);
    }
    // pause réelle : le temps ne bouge plus
    await p.evaluate(() => window.__rfFlowTest.seek(1500, false));
    await p.click('.fl-ov-ctl [data-act="pause"]', { force: true });
    await p.waitForFunction(() => window.__rfFlowTest.state().playing === false, null, { timeout: 5000 }).catch(() => fail.push(`${tag} : la pause n'est pas effective`));
    const t1 = (await flowT(p)).t; await p.evaluate(() => new Promise((r) => setTimeout(r, 1200))); const t2 = (await flowT(p)).t;
    if (t2 !== t1) fail.push(`${tag} : la pause de la magie ne fige pas le temps (${t1} -> ${t2})`);
    await p.click('.fl-ov-ctl [data-act="pause"]', { force: true });
    await p.waitForFunction(() => window.__rfFlowTest.state().playing === true, null, { timeout: 5000 });
    // page cachée : le temps de l'absence n'est pas compté
    const a0 = (await flowT(p)).t;
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await p.evaluate(() => new Promise((r) => setTimeout(r, 3500)));
    const aMid = (await flowT(p)).t;
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    if (aMid - a0 > 300) fail.push(`${tag} : le temps avance page cachée (${a0} -> ${aMid})`);
    await p.waitForFunction((m) => window.__rfFlowTest.state().t > m, aMid, { timeout: 20000 }).catch(() => fail.push(`${tag} : le temps ne reprend pas au retour`));
    // résultat : positionnement sur la fin, scène finale, liste, rejeu
    await p.evaluate(() => window.__rfFlowTest.seek(window.__rfFlowTest.run() + 400, true));
    await p.waitForFunction(() => !document.querySelector('.fl-ov-end').hidden && !document.querySelector('.fl-ov-result').hidden, null, { timeout: 15000 }).catch(() => fail.push(`${tag} : la scène de résultat n'apparaît pas`));
    const res = await p.evaluate(() => ({ title: document.querySelector('.fl-ov-result b')?.textContent, done: document.querySelectorAll('.k3.done').length, tiles: document.querySelectorAll('.k3').length, big: parseFloat(getComputedStyle(document.querySelector('.fl-ov-result b')).fontSize), step: document.querySelector('.fl-ov-step').textContent, btns: [...document.querySelectorAll('.fl-ov-end button')].map((b) => b.textContent) }));
    if (!res.title || res.done !== res.tiles) fail.push(`${tag} : résultat incomplet (${res.title}, ${res.done}/${res.tiles})`);
    if (res.big < 24) fail.push(`${tag} : titre du résultat trop discret (${res.big}px)`);
    if (res.step) fail.push(`${tag} : la légende d'étape reste affichée sur le résultat`);
    if (!res.btns.includes('Explorer la machine') || !res.btns.includes('Rejouer') || !res.btns.includes('Revoir les étapes')) fail.push(`${tag} : actions finales incomplètes (${res.btns.join(', ')})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-3b-resultat.png` });
    await p.click('.fl-ov-end [data-act="steps"]', { force: true });
    await p.waitForSelector('.fl-ov-list.open', { timeout: 5000 }).catch(() => fail.push(`${tag} : « Revoir les étapes » ne s'ouvre pas`));
    const li = await p.evaluate(() => ({ n: document.querySelectorAll('.fl-ov-list li').length, tiles: document.querySelectorAll('.k3').length, exp: document.querySelector('[data-act="steps"]').getAttribute('aria-expanded') }));
    if (li.n !== li.tiles || li.exp !== 'true') fail.push(`${tag} : liste des étapes incomplète (${li.n}/${li.tiles}, ${li.exp})`);
    await p.waitForFunction(() => { const l = document.querySelector('.fl-ov-list'), r = l.getBoundingClientRect(); return +getComputedStyle(l).opacity === 1 && r.bottom <= innerHeight + 1; }, null, { timeout: 8000 }).catch(() => {});
    const lt = await p.evaluate(() => { const l = document.querySelector('.fl-ov-list'), r = l.getBoundingClientRect(), li = l.querySelector('li'), b = li.querySelector('b'), d = li.querySelector('p'), ol = l.querySelector('ol'), hh = l.querySelector('.fl-ov-list-h').getBoundingClientRect(); return { h: r.height, w: r.width, top: r.top, bottom: r.bottom, left: r.left, right: r.right, cols: getComputedStyle(li).gridTemplateColumns.split(' ').length, bs: parseFloat(getComputedStyle(b).fontSize), ds: parseFloat(getComputedStyle(d).fontSize), ov: getComputedStyle(ol).overflowY, head: hh.height, scroll: ol.scrollHeight > ol.clientHeight }; });
    if (lt.cols !== 2 || lt.ov !== 'auto' || lt.bs < 14.5 || lt.bs <= lt.ds) fail.push(`${tag} : hiérarchie typographique de la liste (${JSON.stringify(lt)})`);
    if (lt.left < 0 || lt.right > w + 1 || lt.bottom > h + 1 || lt.top < 0) fail.push(`${tag} : la liste sort de l'écran`);
    if (vp === 'mobile') {
      if (lt.h > h * .5) fail.push(`${tag} : le tiroir de la liste occupe ${Math.round(lt.h / h * 100)} % de la hauteur à l'ouverture`);
      await p.click('[data-act="steps-size"]', { force: true });
      await p.waitForFunction((h0) => document.querySelector('.fl-ov-list').getBoundingClientRect().height > h0 + 40, lt.h, { timeout: 5000 }).catch(() => fail.push(`${tag} : le tiroir de la liste ne s'étend pas`));
      await p.click('[data-act="steps-size"]', { force: true });
    }
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-3d-liste.png` });
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.fl-ov-list.open'), null, { timeout: 5000 }).catch(() => fail.push(`${tag} : Échap ne referme pas la liste`));
    if (!(await p.evaluate(() => document.querySelector('.fl-ov').classList.contains('is-open')))) fail.push(`${tag} : Échap sur la liste ferme aussi la magie`);
    await p.click('.fl-ov-end [data-act="replay"]', { force: true });
    await p.waitForFunction(() => document.querySelector('.fl-ov-result').hidden && window.__rfFlowTest.state().t < 1500, null, { timeout: 8000 }).catch(() => fail.push(`${tag} : le rejeu ne réinitialise pas l'état`));
    // fermeture : Échap, focus, arrière-plan réactivé, rien ne reste
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.fl-ov').classList.contains('is-open'), null, { timeout: 5000 }).catch(() => fail.push(`${tag} : Échap ne ferme pas la magie`));
    if (!(await p.evaluate(() => document.activeElement?.dataset?.demo === 'magic'))) fail.push(`${tag} : le focus n'est pas rendu au bouton`);
    if (await p.evaluate(() => !!document.querySelector('[inert]'))) fail.push(`${tag} : l'arrière-plan reste inerte après fermeture`);
    await p.waitForFunction(() => !document.querySelector('.fl-ov .fl3'), null, { timeout: 5000 }).catch(() => fail.push(`${tag} : le processus reste dans le DOM après fermeture`));

    // ouvertures et fermetures successives : aucun nœud ni écouteur résiduel
    for (let k = 0; k < 3; k++) {
      await p.click('.rf-cta[data-demo="magic"]', { force: true }); await p.waitForSelector('.fl-ov.is-open', { timeout: 10000 });
      await p.waitForFunction(() => window.__rfFlowTest.state().t > 100, null, { timeout: 20000 }).catch(() => fail.push(`${tag} : réouverture ${k + 1} : le temps n'avance pas`));
      await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('.fl-ov').classList.contains('is-open') && !document.querySelector('[inert]'), null, { timeout: 8000 }).catch(() => fail.push(`${tag} : réouverture ${k + 1} : fermeture incomplète`));
    }
    await p.waitForFunction(() => document.querySelectorAll('.fl3').length === 0, null, { timeout: 8000 }).catch(() => fail.push(`${tag} : nœuds résiduels après plusieurs ouvertures`));
    for (let k = 0; k < 7; k++) { await p.click('.rf-cta[data-demo="magic"]', { force: true }); await p.waitForSelector('.fl-ov.is-open', { timeout: 10000 }); await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('.fl-ov').classList.contains('is-open'), null, { timeout: 8000 }); }
    const lc = await p.evaluate(() => window.__lc);
    if (lc.vis > 0) fail.push(`${tag} : écouteurs visibilitychange accumulés après dix ouvertures (${lc.vis})`);

    // 4. « Explorer la machine » : mode Explorer d'emblée, panneau placé hors de la machine, aucune démonstration imposée
    await p.click('.rf-cta[data-demo="explore"]', { force: true });
    await p.waitForFunction(() => document.querySelector('.rf-cb-dock')?.dataset.mode === 'explore', null, { timeout: 15000 }).catch(() => fail.push(`${tag} : « Explorer la machine » n'active pas le mode Explorer`));
    await p.waitForSelector('.cv-cb-panel.is-open', { timeout: 60000 }).catch(() => fail.push(`${tag} : les commandes avancées ne s'ouvrent pas d'emblée`));
    const ex = await p.evaluate(() => ({ demo: document.body.classList.contains('rf-demo'), sec: [...document.querySelectorAll('.cv-cb-panel.is-open .cv-cb-sec:not([hidden]) h4')].map((x) => x.textContent), cap: +getComputedStyle(document.querySelector('.rf-demo-cap')).opacity > .1, pr: (() => { const r = document.querySelector('.cv-cb-panel').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })() }));
    if (ex.demo || ex.cap) fail.push(`${tag} : Explorer lance la démonstration guidée`);
    if (!ex.sec.includes('Démonstration') || !ex.sec.includes('Vues')) fail.push(`${tag} : panneau Explorer incomplet (${ex.sec.join(', ')})`);
    if (vp === 'desktop' && ex.pr[0] < w * .6) fail.push(`${tag} : le panneau n'est pas latéral (${ex.pr.map(Math.round).join(',')})`);
    if (vp === 'mobile' && (ex.pr[0] < 0 || ex.pr[2] > w || ex.pr[3] > h)) fail.push(`${tag} : le tiroir sort de l'écran (${ex.pr.map(Math.round).join(',')})`);
    if (vp === 'mobile') {
      if (ex.pr[3] - ex.pr[1] > h * .5) fail.push(`${tag} : tiroir intermédiaire trop haut (${Math.round((ex.pr[3] - ex.pr[1]) / h * 100)} %)`);
      if ((await p.evaluate(() => document.querySelector('.cv-cb-panel').dataset.snap)) !== '1') fail.push(`${tag} : le tiroir ne s'ouvre pas à l'état intermédiaire`);
      const adv = await p.evaluate(() => [...document.querySelectorAll('.cv-cb-sec[data-adv]')].every((x) => getComputedStyle(x).display === 'none'));
      if (!adv) fail.push(`${tag} : les commandes avancées sont visibles à l'état intermédiaire`);
      await p.click('.cv-cb-expand', { force: true });
      await p.waitForFunction(() => document.querySelector('.cv-cb-panel').dataset.snap === '2', null, { timeout: 5000 }).catch(() => fail.push(`${tag} : le tiroir ne passe pas à l'état étendu`));
      await settled(p);
      const gr = await p.evaluate(() => { const r = document.querySelector('.cv-cb-grip').getBoundingClientRect(); return [r.left + r.width / 2, r.top + 12]; });
      await p.mouse.move(gr[0], gr[1]); await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.move(gr[0], gr[1] + 70, { steps: 10 }); await p.waitForTimeout(80); await p.mouse.up();   // geste proche d'un vrai doigt : appui, glissé en plusieurs étapes, relâchement ; le navigateur de CI, saturé par le rendu logiciel, perd parfois les événements d'un geste trop bref
      await p.waitForFunction(() => document.querySelector('.cv-cb-panel').dataset.snap === '1', null, { timeout: 5000 }).catch(() => fail.push(`${tag} : le glissement ne referme pas le tiroir d'un cran`));
      await settled(p);
      const gr2 = await p.evaluate(() => { const r = document.querySelector('.cv-cb-grip').getBoundingClientRect(); return [r.left + r.width / 2, r.top + 12]; });
      await p.mouse.move(gr2[0], gr2[1]); await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.move(gr2[0], gr2[1] + 70, { steps: 10 }); await p.waitForTimeout(80); await p.mouse.up();   // geste proche d'un vrai doigt : appui, glissé en plusieurs étapes, relâchement ; le navigateur de CI, saturé par le rendu logiciel, perd parfois les événements d'un geste trop bref
      await p.waitForFunction(() => document.querySelector('.cv-cb-panel').dataset.snap === '0', null, { timeout: 5000 }).catch(() => fail.push(`${tag} : le glissement ne ramène pas à la capsule`));
      const cp = await p.evaluate(() => { const r = document.querySelector('.cv-cb-cap').getBoundingClientRect(); return r.height; });
      if (cp < 44) fail.push(`${tag} : capsule trop basse pour le tactile (${cp}px)`);
      await settled(p);
      // réouverture par la capsule ; un premier appui perdu pendant la fin de l'animation de fermeture est signalé (intermittence observée une fois en CI locale sur Nisaru mobile)
      let reopened = false; for (let k = 0; k < 3 && !reopened; k++) { await p.click('.cv-cb-more', { force: true }); reopened = await p.waitForSelector('.cv-cb-panel.is-open', { timeout: 6000 }).then(() => true).catch(() => false); if (!reopened && k === 0) log('  note : réouverture du tiroir au deuxième essai', tag); }
      if (!reopened) fail.push(`${tag} : le tiroir ne se rouvre pas par la capsule`);
    }
    await p.waitForFunction(() => true); if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-3-explorer.png` });
    const box = await p.evaluate(() => { const r = document.querySelector('.cv-cb-cap').getBoundingClientRect(); return [r.left, r.right, r.bottom]; });
    if (box[0] < -1 || box[1] > w + 1 || box[2] > h + 1) fail.push(`${tag} : capsule hors de l'écran (${box.map((x) => Math.round(x)).join(',')})`);
    await p.evaluate(() => { const bs = [...document.querySelectorAll('.cv-cb-panel .cv-cb-sec button')]; bs.find((x) => x.textContent.includes('Séparer'))?.click(); });
    await p.evaluate(() => new Promise((r) => setTimeout(r, 400)));
    await p.evaluate(() => { const bs = [...document.querySelectorAll('.cv-cb-panel .cv-cb-sec button')]; bs.find((x) => x.textContent.includes('Rassembler'))?.click(); bs.find((x) => x.textContent === 'Ensemble')?.click(); });
    // 5. démonstration guidée (panneau) : mode guidé, légende, temps qui avance, pause, reprise, fin sur le résultat
    await p.evaluate(() => [...document.querySelectorAll('.cv-cb-panel button')].find((x) => x.textContent.includes('Démonstration guidée'))?.click());
    await p.waitForFunction(() => document.querySelector('.rf-cb-dock')?.dataset.mode === 'guided', null, { timeout: 20000 }).catch(() => fail.push(`${tag} : la démonstration guidée ne démarre pas`));
    const m0 = await p.evaluate(() => window.__rfTest.time());
    await p.waitForFunction((t) => window.__rfTest.time() > t + .5, m0, { timeout: 40000 }).catch(() => fail.push(`${tag} : la démonstration n'avance pas`));
    const cap = await p.evaluate(() => document.querySelector('.rf-demo-cap')?.textContent || '');
    if (!/Étape \d \/ 5/.test(cap)) fail.push(`${tag} : légende de démonstration absente (${cap.slice(0, 40)})`);
    // placement déterministe loin de la fin, puis pause et reprise
    await p.evaluate(() => window.__rfTest.seek(window.__rfTest.min() + 1));
    await p.click('.cv-cb-play', { force: true });
    await p.waitForFunction(() => document.querySelector('.rf-cb-dock')?.dataset.paused === 'true', null, { timeout: 8000 }).catch(() => fail.push(`${tag} : la pause n'est pas effective`));
    const q1 = await p.evaluate(() => window.__rfTest.time()); await p.evaluate(() => new Promise((r) => setTimeout(r, 1000))); const q2 = await p.evaluate(() => window.__rfTest.time());
    if (q2 !== q1) fail.push(`${tag} : la pause ne fige pas la machine (${q1} -> ${q2})`);
    await p.click('.cv-cb-play', { force: true });
    await p.waitForFunction((t) => window.__rfTest.time() > t + .4, q2, { timeout: 30000 }).catch(() => fail.push(`${tag} : la reprise ne relance pas la machine`));
    // fin de chronologie : la machine s'arrête sur son résultat
    await p.evaluate(() => { const e = window.__rfTest.end(); if (e) window.__rfTest.seek(e - .2); });
    await p.waitForFunction(() => document.body.classList.contains('rf-demo-done') || window.__rfTest.end() === null, null, { timeout: 30000 }).catch(() => fail.push(`${tag} : la machine ne s'arrête pas sur son résultat`));
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-2-demo.png` });
    // sortie
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.body.classList.contains('rf-demo') && !document.body.classList.contains('rf-explore'), null, { timeout: 5000 }).catch(async () => { await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.body.classList.contains('rf-demo') && !document.body.classList.contains('rf-explore'), null, { timeout: 5000 }).catch(() => fail.push(`${tag} : Échap ne quitte pas la machine`)); });
    await p.click('.rf-cta[data-demo="explore"]', { force: true });
    await p.waitForFunction(() => document.body.classList.contains('rf-explore'), null, { timeout: 8000 }).catch(() => fail.push(`${tag} : la machine ne se rouvre pas`));
    if (p.__errs.length) fail.push(`${tag} : erreurs de page : ${p.__errs.slice(0, 2).join(' | ')}`);
    log(fail.some((f) => f.startsWith(tag)) ? 'ÉCHEC ' : 'ok    ', tag);
    await p.context().close();
  }
  // 6. mouvements réduits : lecture statique complète, rejeu, puis passage vers la machine sans second clic
  {
    const tag = `${slug} reduced`;
    const p = await open(slug, 1440, 900, true); await waitMachine(p, tag);
    await p.click('.rf-cta[data-demo="magic"]', { force: true });
    await p.waitForSelector('.fl-ov.is-open', { timeout: 20000 }).catch(() => fail.push(`${tag} : la magie ne s'ouvre pas`));
    await p.waitForFunction(() => !document.querySelector('.fl-ov-end').hidden, null, { timeout: 10000 }).catch(() => {});
    const r = await p.evaluate(() => ({ done: document.querySelectorAll('.k3.done').length, tiles: document.querySelectorAll('.k3').length, end: !document.querySelector('.fl-ov-end').hidden, list: document.querySelectorAll('.fl-ov-list li').length, open: !!document.querySelector('.fl-ov-list.open'), res: !document.querySelector('.fl-ov-result').hidden }));
    if (r.done !== r.tiles || !r.end || !r.res) fail.push(`${tag} : la lecture statique n'affiche pas le résultat complet (${r.done}/${r.tiles}, fin ${r.end})`);
    if (r.list !== r.tiles || !r.open) fail.push(`${tag} : liste des étapes absente ou fermée (${r.list}/${r.tiles}, ouverte ${r.open})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-3b-resultat-reduit.png` });
    await p.click('.fl-ov-end [data-act="machine"]', { force: true });
    await p.waitForFunction(() => document.querySelector('.rf-cb-dock')?.dataset.mode === 'explore', null, { timeout: 20000 }).catch(() => fail.push(`${tag} : « Explorer la machine » (fin de la magie) n'active pas l'Explorer`));
    await p.waitForSelector('.cv-cb-panel.is-open', { timeout: 60000 }).catch(() => fail.push(`${tag} : le panneau Explorer ne s'ouvre pas après la magie`));
    await p.waitForFunction(() => !document.querySelector('.fl-ov').classList.contains('is-open') && !document.body.classList.contains('fl-lock'), null, { timeout: 8000 }).catch(() => fail.push(`${tag} : la magie ne se ferme pas proprement`));
    if (await p.evaluate(() => !!document.querySelector('[inert]'))) fail.push(`${tag} : l'arrière-plan reste inerte après le passage vers la machine`);
    if (await p.evaluate(() => document.body.classList.contains('rf-demo'))) fail.push(`${tag} : le passage magie → machine lance la démonstration`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-3c-transition-machine.png` });
    if (p.__errs.length) fail.push(`${tag} : erreurs de page : ${p.__errs.slice(0, 2).join(' | ')}`);
    log(fail.some((f) => f.startsWith(tag)) ? 'ÉCHEC ' : 'ok    ', tag);
    await p.context().close();
  }
  // 7. grand écran : la composition de la magie tient dans la fenêtre
  {
    const tag = `${slug} 1920`;
    const p = await open(slug, 1920, 1080, false); await waitMachine(p, tag);
    await p.click('.rf-cta[data-demo="magic"]', { force: true }); await p.waitForSelector('.fl-ov.is-open', { timeout: 20000 }).catch(() => fail.push(`${tag} : la magie ne s'ouvre pas`));
    await p.waitForFunction(() => window.__rfFlowTest.state().t > 300, null, { timeout: 30000 });
    const fit = await p.evaluate(() => { const r = document.querySelector('.fl3').getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom]; });
    if (fit[0] < -2 || fit[1] > 1922) fail.push(`${tag} : la composition déborde horizontalement (${fit.map(Math.round).join(',')})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-wide-2b-magie.png` });
    log(fail.some((f) => f.startsWith(tag)) ? 'ÉCHEC ' : 'ok    ', tag);
    await p.context().close();
  }
}
await b.close();
if (fail.length) { console.error('\n' + fail.join('\n')); process.exit(1); } log('\nonze fiches : magie (temps actif, pause, page cachée, résultat, liste, rejeu, fermeture, passage vers la machine) et machine (Explorer, panneau latéral / tiroir, démonstration guidée, pause, fin, sortie) : ok');
