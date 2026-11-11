// Test d'expérience des onze fiches machines (navigateur réel, rendu logiciel) :
// une seule démonstration par projet (la machine), plus d'ancienne surcouche en perspective, CTA fonctionnel, démonstration pilotée par la machine,
// pause / reprise, panneau « Explorer », sortie, capsule contenue dans l'écran mobile.
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
for (const slug of PAGES) {
  if (only && only !== slug) continue;
  for (const [vp, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const tag = `${slug} ${vp}`, errs = [];
    log('test  ', tag);
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.setDefaultTimeout(60000);
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    const consoleErrors = [];
    p.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 200)); });
    await routeCheckout(p.context(), root, origin);
    await p.goto(`${origin}/projet-${slug}.html`, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.rf-cb-dock', { state: 'attached', timeout: 60000 }).catch(() => fail.push(`${tag} : la machine ne se charge pas`));
    // 1. habillage : surcouche transparente, plus de contours pointillés ni de plaque noire
    const ov = await p.evaluate(() => { const o = document.querySelector('.fl-ov'); if (!o) return null; const c = getComputedStyle(o); return { bg: c.backgroundImage + c.backgroundColor, dashed: [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).filter((t) => /\.(b3|k3|lh|lv)\b[^{]*\{[^}]*dashed/.test(t)).length }; });
    if (!ov) fail.push(`${tag} : moteur d'icônes absent (.fl-ov)`); else { if (/11, 13, 14/.test(ov.bg)) fail.push(`${tag} : fond noir de la surcouche`); if (ov.dashed) fail.push(`${tag} : ${ov.dashed} règles pointillées sur les supports`); }
    // 2. contenu : CTA, cinq étapes, détail repliable, plus d'analogie du livre
    const c = await p.evaluate(() => ({ cta: document.querySelector('.rf-cta[data-demo="magic"]')?.textContent + '|' + document.querySelector('.rf-cta[data-demo="explore"]')?.textContent, steps: document.querySelectorAll('.rf-marche-steps>li').length, detail: !!document.querySelector('.rf-marche-more summary'), book: /Fig \d+\.\d|du livre/.test(document.body.textContent) }));
    if (c.cta !== 'Voir la magie|Explorer la machine') fail.push(`${tag} : CTA absents ou mal nommés (${c.cta})`);
    if (c.steps !== 5) fail.push(`${tag} : ${c.steps} étapes visibles au lieu de 5`);
    if (!c.detail) fail.push(`${tag} : processus détaillé absent`);
    if (c.book) fail.push(`${tag} : analogie du livre encore présente`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-1-initial.png` });
    // 2 bis. « Voir la magie » : le moteur d'icônes s'ouvre dans la page, la légende suit l'étape, Échap ferme et rend le focus
    await p.focus('.rf-cta[data-demo="magic"]'); await p.click('.rf-cta[data-demo="magic"]', { force: true });
    await p.waitForSelector('.fl-ov.is-open', { timeout: 5000 }).catch(() => fail.push(`${tag} : « Voir la magie » ne s'ouvre pas`));
    await sleep(5500);
    const mg = await p.evaluate(() => ({ cap: document.querySelector('.fl-ov-step')?.textContent || '', up: document.querySelectorAll('.k3.up').length, tiles: document.querySelectorAll('.k3 svg, .k3 img').length, bg: getComputedStyle(document.querySelector('.fl-ov')).backgroundColor }));
    if (!/Étape \d+ \/ \d+/.test(mg.cap)) fail.push(`${tag} : légende de la magie absente`);
    if (mg.up < 1) fail.push(`${tag} : aucune icône n'apparaît`);
    if (mg.tiles < 5) fail.push(`${tag} : icônes manquantes (${mg.tiles})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-2b-magie.png` });
    if (process.env.FULL || slug === 'moteur44') {
      await p.waitForFunction(() => !document.querySelector('.fl-ov-end')?.hidden, null, { timeout: 70000 }).catch(() => fail.push(`${tag} : la magie n'atteint pas son résultat`));
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-2c-resultat.png` });
      const still = await p.evaluate(() => document.querySelectorAll('.k3.up').length), tot = await p.evaluate(() => document.querySelectorAll('.k3').length);
      if (still !== tot) fail.push(`${tag} : icônes manquantes au résultat (${still}/${tot})`);
      await p.click('.fl-ov-end [data-act="replay"]', { force: true }); await sleep(1500);
      if (!(await p.evaluate(() => document.querySelector('.fl-ov-end').hidden))) fail.push(`${tag} : Rejouer ne relance pas`);
    }
    await p.keyboard.press('Escape');
    await p.locator('.fl-ov.is-open').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    if (await p.evaluate(() => document.querySelector('.fl-ov').classList.contains('is-open'))) fail.push(`${tag} : Échap ne ferme pas la magie`);
    if (!(await p.evaluate(() => document.activeElement?.dataset?.demo === 'magic'))) fail.push(`${tag} : le focus n'est pas rendu au bouton`);
    // 3. démonstration réelle
    await p.click('.rf-cta[data-demo="explore"]', { force: true });
    await p.waitForFunction(() => document.body.classList.contains('rf-demo'), null, { timeout: 5000 }).catch(() => fail.push(`${tag} : « Explorer la machine » ne lance pas la machine`));
    const capsule = await p.waitForSelector('.cv-cb-cap', { timeout: 30000 }).catch(() => null);
    if (!capsule) {
      const classes = await p.locator('body').getAttribute('class');
      const details = [...errs, ...consoleErrors].slice(0, 4).join(' | ');
      const failure = `${tag} : capsule de commandes absente (${classes || 'aucune classe'}) ${details}`;
      fail.push(failure);
      log('ÉCHEC ', failure);
      await p.close();
      continue;
    }
    await sleep(2500);
    const s1 = await p.evaluate(() => ({ cap: document.querySelector('.rf-demo-cap')?.textContent || '', val: document.querySelector('.cv-cb input[type=range]')?.value }));
    if (!/Étape \d \/ 5/.test(s1.cap)) fail.push(`${tag} : légende de démonstration absente (${s1.cap.slice(0, 40)})`);
    let s2 = s1.val; for (let i = 0; i < 28 && s2 === s1.val; i++) { await sleep(500); s2 = await p.evaluate(() => document.querySelector('.cv-cb input[type=range]')?.value); }
    if (s1.val === s2) fail.push(`${tag} : la démonstration n'avance pas (${s1.val})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-2-demo.png` });
    // 4. capsule contenue dans l'écran
    const box = await p.evaluate(() => { const r = document.querySelector('.cv-cb-cap').getBoundingClientRect(); return [r.left, r.right, r.bottom]; });
    if (box[0] < -1 || box[1] > w + 1 || box[2] > h + 1) fail.push(`${tag} : capsule hors de l'écran (${box.map((x) => Math.round(x)).join(',')})`);
    // 5. pause / reprise : la tête de lecture se fige puis repart
    await p.click('.cv-cb-play', { force: true }); await sleep(600);
    const a = await p.evaluate(() => document.querySelector('.cv-cb input[type=range]').value); await sleep(1500);
    const a2 = await p.evaluate(() => document.querySelector('.cv-cb input[type=range]').value);
    if (a !== a2) fail.push(`${tag} : la pause ne fige pas la démonstration (${a} -> ${a2})`);
    await p.click('.cv-cb-play', { force: true });
    // 6. panneau Explorer : sections, puis Échap referme le panneau, un second Échap quitte la démonstration
    await p.click('.cv-cb-more', { force: true }); await sleep(700);
    const sec = await p.evaluate(() => [...document.querySelectorAll('.cv-cb-panel.is-open .cv-cb-sec:not([hidden]) h4')].map((x) => x.textContent));
    if (!sec.includes('Démonstration') || !sec.includes('Vues')) fail.push(`${tag} : panneau Explorer incomplet (${sec.join(', ')})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-3-explorer.png` });
    // vues rapprochées + inspection : les commandes répondent sans erreur
    await p.evaluate(() => { const bs = [...document.querySelectorAll('.cv-cb-panel .cv-cb-sec button')]; const pick = (t) => bs.find((x) => x.textContent.includes(t)); pick('Séparer')?.click(); });
    await sleep(500);
    await p.evaluate(() => { const bs = [...document.querySelectorAll('.cv-cb-panel .cv-cb-sec button')]; bs.find((x) => x.textContent.includes('Rassembler'))?.click(); bs.find((x) => x.textContent === 'Ensemble')?.click(); });
    await p.keyboard.press('Escape'); await sleep(400);
    const open1 = await p.evaluate(() => document.querySelector('.cv-cb-panel').classList.contains('is-open'));
    if (open1) fail.push(`${tag} : Échap ne referme pas le panneau`);
    await p.keyboard.press('Escape'); await sleep(400);
    const still = await p.evaluate(() => document.body.classList.contains('rf-demo'));
    if (still) fail.push(`${tag} : Échap ne quitte pas la démonstration`);
    if (errs.length) fail.push(`${tag} : erreurs de page : ${errs.slice(0, 2).join(' | ')}`);
    log(fail.some((f) => f.startsWith(tag)) ? 'ÉCHEC ' : 'ok    ', tag);
    await p.close();
  }
}
await b.close();
if (fail.length) { console.error('\n' + fail.join('\n')); process.exit(1); } log('\nonze fiches : une seule démonstration, CTA, légende, pause, Explorer, sortie : ok');
