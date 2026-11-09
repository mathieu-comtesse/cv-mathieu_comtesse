// Test d'expérience des onze fiches machines (navigateur réel, rendu logiciel). Deux expériences distinctes sont vérifiées :
//  - « Voir la magie » : moteur d'icônes (flow.js) : ouverture, icônes, signal, légende, temps actif (la page cachée ne le fait pas avancer),
//    pause, résultat (mouvements réduits : état final statique), rejeu, fermeture et focus, sortie vers la machine sans second clic ;
//  - « Explorer la machine » : mode Explorer (commandes avancées ouvertes d'emblée, aucune démonstration imposée), démonstration guidée
//    (depuis le panneau), progression du temps, pause, reprise, inspection, sortie.
// Trois tailles : 1920 × 1080 (magie), 1440 × 900 et 390 × 844 (tout).
// Usage : node tools/test-ux.mjs [slug]   (SHOTS=dossier pour enregistrer les captures)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const fail = []; const log = (...a) => console.log(...a);
const PAGES = ['moteur44', 'studio', 'gares', 'cerfa', 'finance', 'vmvre', 'pa', 'powerbi', 'vre', 'suivi', 'lecteur-vre'];
const only = process.argv[2], SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
let chromium; { const { createRequire } = await import('node:module'); const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q18/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = (p) => p.evaluate(() => { const d = document.querySelector('.rf-cb-dock'); return { mode: d?.dataset.mode, t: +(d?.dataset.t || 0), paused: d?.dataset.paused === 'true' }; });
const waitMachine = (p, tag) => p.waitForSelector('.rf-cb-dock', { state: 'attached', timeout: 60000 }).catch(() => fail.push(`${tag} : la machine ne se charge pas`));
async function open(slug, w, h, reduced) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' }); const p = await ctx.newPage(); p.setDefaultTimeout(60000);
  p.__errs = []; p.on('pageerror', (e) => p.__errs.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${port}/projet-${slug}.html`, { waitUntil: 'domcontentloaded' }); return p;
}

for (const slug of PAGES) {
  if (only && only !== slug) continue;
  for (const [vp, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const tag = `${slug} ${vp}`;
    const p = await open(slug, w, h, false); await waitMachine(p, tag);
    // 1. habillage : surcouche transparente, supports sans pointillés
    const ov = await p.evaluate(() => { const o = document.querySelector('.fl-ov'); if (!o) return null; const c = getComputedStyle(o); return { bg: c.backgroundImage + c.backgroundColor, dashed: [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).filter((t) => /\.(b3|k3|lh|lv)\b[^{]*\{[^}]*dashed/.test(t)).length }; });
    if (!ov) fail.push(`${tag} : moteur d'icônes absent (.fl-ov)`); else { if (/11, 13, 14/.test(ov.bg)) fail.push(`${tag} : fond noir de la surcouche`); if (ov.dashed) fail.push(`${tag} : ${ov.dashed} règles pointillées sur les supports`); }
    // 2. contenu : deux CTA, cinq étapes, détail repliable, plus d'analogie du livre
    const c = await p.evaluate(() => ({ cta: document.querySelector('.rf-cta[data-demo="magic"]')?.textContent + '|' + document.querySelector('.rf-cta[data-demo="explore"]')?.textContent, steps: document.querySelectorAll('.rf-marche-steps>li').length, detail: !!document.querySelector('.rf-marche-more summary'), book: /Fig \d+\.\d|du livre/.test(document.body.textContent) }));
    if (c.cta !== 'Voir la magie|Explorer la machine') fail.push(`${tag} : CTA absents ou mal nommés (${c.cta})`);
    if (c.steps !== 5) fail.push(`${tag} : ${c.steps} étapes visibles au lieu de 5`);
    if (!c.detail) fail.push(`${tag} : processus détaillé absent`);
    if (c.book) fail.push(`${tag} : analogie du livre encore présente`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-1-initial.png` });

    // 3. « Voir la magie » : ouverture, icônes, temps actif, pause, page cachée, fermeture, focus
    await p.focus('.rf-cta[data-demo="magic"]'); await p.click('.rf-cta[data-demo="magic"]', { force: true });
    await p.waitForSelector('.fl-ov.is-open', { timeout: 5000 }).catch(() => fail.push(`${tag} : « Voir la magie » ne s'ouvre pas`));
    await sleep(4500);
    const mg = await p.evaluate(() => { const vw = innerWidth, vh = innerHeight, k = [...document.querySelectorAll('.fl3 .k3')]; const rs = k.map((e) => e.getBoundingClientRect()); return { cap: document.querySelector('.fl-ov-step')?.textContent || '', visible: k.filter((e) => +getComputedStyle(e).opacity > .05).length, tiles: document.querySelectorAll('.k3 svg, .k3 img').length, t: +document.querySelector('.fl-ov').dataset.t, cur: document.querySelectorAll('.k3.cur').length, wires: document.querySelectorAll('.l3-b').length, ctl: !!document.querySelector('.fl-ov-ctl [data-act="pause"]') }; });
    if (mg.tiles < 5) fail.push(`${tag} : icônes manquantes (${mg.tiles})`);
    if (mg.visible < 1) fail.push(`${tag} : aucune icône visible`);
    if (mg.wires < mg.tiles - 1) fail.push(`${tag} : connexions manquantes (${mg.wires} pour ${mg.tiles} icônes)`);
    if (!mg.ctl) fail.push(`${tag} : commande de pause absente`);
    if (!(mg.t > 500)) fail.push(`${tag} : le temps actif de la magie n'avance pas (${mg.t})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-2b-magie.png` });
    // pause réelle
    await p.click('.fl-ov-ctl [data-act="pause"]', { force: true }); await sleep(400);
    const t1 = +(await p.evaluate(() => document.querySelector('.fl-ov').dataset.t)); await sleep(1500);
    const t2 = +(await p.evaluate(() => document.querySelector('.fl-ov').dataset.t));
    if (t2 - t1 > 120) fail.push(`${tag} : la pause de la magie ne fige pas le temps (${t1} -> ${t2})`);
    await p.click('.fl-ov-ctl [data-act="pause"]', { force: true });
    // page cachée : le temps de l'absence n'est pas compté
    const a0 = +(await p.evaluate(() => document.querySelector('.fl-ov').dataset.t));
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(4000);
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(900);
    const a1 = +(await p.evaluate(() => document.querySelector('.fl-ov').dataset.t));
    if (a1 - a0 > 2600) fail.push(`${tag} : le temps passé page cachée est compté (${a0} -> ${a1})`);
    await p.keyboard.press('Escape'); await sleep(1700);
    if (await p.evaluate(() => document.querySelector('.fl-ov').classList.contains('is-open'))) fail.push(`${tag} : Échap ne ferme pas la magie`);
    if (!(await p.evaluate(() => document.activeElement?.dataset?.demo === 'magic'))) fail.push(`${tag} : le focus n'est pas rendu au bouton`);
    const leak = await p.evaluate(() => document.querySelectorAll('.fl-ov .fl3').length); await sleep(1700);
    if (await p.evaluate(() => document.querySelectorAll('.fl-ov .fl3').length)) fail.push(`${tag} : le processus reste dans le DOM après fermeture (${leak})`);

    // 4. « Explorer la machine » : mode Explorer d'emblée, commandes avancées ouvertes, aucune démonstration imposée
    await p.click('.rf-cta[data-demo="explore"]', { force: true });
    await p.waitForFunction(() => document.body.classList.contains('rf-explore'), null, { timeout: 5000 }).catch(() => fail.push(`${tag} : « Explorer la machine » n'active pas le mode Explorer`));
    await p.waitForSelector('.cv-cb-cap', { timeout: 30000 }).catch(() => fail.push(`${tag} : capsule de commandes absente`));
    await p.waitForSelector('.cv-cb-panel.is-open', { timeout: 40000 }).catch(() => fail.push(`${tag} : les commandes avancées ne s'ouvrent pas d'emblée`));
    const ex = await p.evaluate(() => ({ demo: document.body.classList.contains('rf-demo'), sec: [...document.querySelectorAll('.cv-cb-panel.is-open .cv-cb-sec:not([hidden]) h4')].map((x) => x.textContent), cap: +getComputedStyle(document.querySelector('.rf-demo-cap')).opacity > .1 }));
    if (ex.demo || ex.cap) fail.push(`${tag} : Explorer lance la démonstration guidée`);
    if (!ex.sec.includes('Démonstration') || !ex.sec.includes('Vues')) fail.push(`${tag} : panneau Explorer incomplet (${ex.sec.join(', ')})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-3-explorer.png` });
    const box = await p.evaluate(() => { const r = document.querySelector('.cv-cb-cap').getBoundingClientRect(); return [r.left, r.right, r.bottom]; });
    if (box[0] < -1 || box[1] > w + 1 || box[2] > h + 1) fail.push(`${tag} : capsule hors de l'écran (${box.map((x) => Math.round(x)).join(',')})`);
    // vue rapprochée, inspection, retour à l'ensemble
    await p.evaluate(() => { const bs = [...document.querySelectorAll('.cv-cb-panel .cv-cb-sec button')]; bs.find((x) => x.textContent.includes('Séparer'))?.click(); });
    await sleep(500);
    await p.evaluate(() => { const bs = [...document.querySelectorAll('.cv-cb-panel .cv-cb-sec button')]; bs.find((x) => x.textContent.includes('Rassembler'))?.click(); bs.find((x) => x.textContent === 'Ensemble')?.click(); });

    // 5. démonstration guidée (depuis le panneau) : mode guidé, légende, temps qui avance, pause, reprise
    await p.evaluate(() => [...document.querySelectorAll('.cv-cb-panel button')].find((x) => x.textContent.includes('Démonstration guidée'))?.click());
    await p.waitForFunction(() => document.querySelector('.rf-cb-dock')?.dataset.mode === 'guided', null, { timeout: 20000 }).catch(() => fail.push(`${tag} : la démonstration guidée ne démarre pas`));
    await sleep(2500);
    const g1 = await state(p), cap = await p.evaluate(() => document.querySelector('.rf-demo-cap')?.textContent || '');
    if (!/Étape \d \/ 5/.test(cap)) fail.push(`${tag} : légende de démonstration absente (${cap.slice(0, 40)})`);
    let g2 = g1; for (let i = 0; i < 24 && !(g2.t - g1.t > .8); i++) { await sleep(400); g2 = await state(p); }
    if (!(g2.t - g1.t > .8)) fail.push(`${tag} : la démonstration n'avance pas (${g1.t} -> ${g2.t})`);
    // pause et reprise tout de suite (la démonstration guidée s'arrête d'elle-même sur son résultat)
    await p.click('.cv-cb-play', { force: true }); await sleep(600);
    const q1 = await state(p); await sleep(1500); const q2 = await state(p);
    if (!q1.paused || Math.abs(q2.t - q1.t) > .3) fail.push(`${tag} : la pause ne fige pas la machine (${q1.t} -> ${q2.t})`);
    await p.click('.cv-cb-play', { force: true }); await sleep(1500);
    if ((await state(p)).paused) fail.push(`${tag} : la reprise ne relance pas la machine`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-${vp}-2-demo.png` });
    // sortie : Échap referme le panneau s'il est ouvert, puis quitte
    await p.keyboard.press('Escape'); await sleep(300); await p.keyboard.press('Escape'); await sleep(500);
    if (await p.evaluate(() => document.body.classList.contains('rf-demo') || document.body.classList.contains('rf-explore'))) fail.push(`${tag} : Échap ne quitte pas la machine`);
    // nouvelle ouverture
    await p.click('.rf-cta[data-demo="explore"]', { force: true }); await sleep(800);
    if (!(await p.evaluate(() => document.body.classList.contains('rf-explore')))) fail.push(`${tag} : la machine ne se rouvre pas`);
    if (p.__errs.length) fail.push(`${tag} : erreurs de page : ${p.__errs.slice(0, 2).join(' | ')}`);
    log(fail.some((f) => f.startsWith(tag)) ? 'ÉCHEC ' : 'ok    ', tag);
    await p.context().close();
  }
  // 6. mouvements réduits : lecture statique complète, rejeu, puis passage vers la machine sans second clic
  {
    const tag = `${slug} reduced`;
    const p = await open(slug, 1440, 900, true); await waitMachine(p, tag);
    await p.click('.rf-cta[data-demo="magic"]', { force: true });
    await p.waitForSelector('.fl-ov.is-open', { timeout: 5000 }).catch(() => fail.push(`${tag} : la magie ne s'ouvre pas`));
    await sleep(800);
    const r = await p.evaluate(() => ({ done: document.querySelectorAll('.k3.done').length, tiles: document.querySelectorAll('.k3').length, end: !document.querySelector('.fl-ov-end').hidden, list: document.querySelectorAll('.fl-ov-all li').length }));
    if (r.done !== r.tiles || !r.end) fail.push(`${tag} : la lecture statique n'affiche pas le processus complet (${r.done}/${r.tiles}, fin ${r.end})`);
    if (r.list !== r.tiles) fail.push(`${tag} : liste des étapes incomplète (${r.list}/${r.tiles})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-3b-resultat.png` });
    await p.click('.fl-ov-end [data-act="replay"]', { force: true }); await sleep(500);
    if (await p.evaluate(() => document.querySelectorAll('.k3.done').length) !== r.tiles) fail.push(`${tag} : le rejeu ne réinitialise pas l'état`);
    await p.click('.fl-ov-end [data-act="machine"]', { force: true });
    await p.waitForFunction(() => document.body.classList.contains('rf-explore'), null, { timeout: 5000 }).catch(() => fail.push(`${tag} : « Explorer la machine » (fin de la magie) n'active pas l'Explorer`));
    await p.waitForSelector('.cv-cb-panel.is-open', { timeout: 30000 }).catch(() => fail.push(`${tag} : le panneau Explorer ne s'ouvre pas après la magie`));
    await p.waitForFunction(() => document.querySelector('.rf-cb-dock')?.dataset.mode === 'explore', null, { timeout: 15000 }).catch(() => {});
    await sleep(1200);
    const after = await p.evaluate(() => ({ ov: document.querySelector('.fl-ov').classList.contains('is-open'), lock: document.body.classList.contains('fl-lock'), demo: document.body.classList.contains('rf-demo'), mode: document.querySelector('.rf-cb-dock')?.dataset.mode }));
    if (after.ov || after.lock) fail.push(`${tag} : la magie ne se ferme pas proprement`);
    if (after.demo || after.mode !== 'explore') fail.push(`${tag} : le passage magie → machine redirige vers la démonstration (${after.mode})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-3c-transition-machine.png` });
    if (p.__errs.length) fail.push(`${tag} : erreurs de page : ${p.__errs.slice(0, 2).join(' | ')}`);
    log(fail.some((f) => f.startsWith(tag)) ? 'ÉCHEC ' : 'ok    ', tag);
    await p.context().close();
  }
  // 7. grand écran : la composition de la magie tient dans la fenêtre
  {
    const tag = `${slug} 1920`;
    const p = await open(slug, 1920, 1080, false); await waitMachine(p, tag);
    await p.click('.rf-cta[data-demo="magic"]', { force: true }); await p.waitForSelector('.fl-ov.is-open', { timeout: 5000 }).catch(() => fail.push(`${tag} : la magie ne s'ouvre pas`));
    await sleep(2500);
    const fit = await p.evaluate(() => { const r = document.querySelector('.fl3').getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom]; });
    if (fit[0] < -2 || fit[1] > 1922) fail.push(`${tag} : la composition déborde horizontalement (${fit.map(Math.round).join(',')})`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${slug}-wide-2b-magie.png` });
    log(fail.some((f) => f.startsWith(tag)) ? 'ÉCHEC ' : 'ok    ', tag);
    await p.context().close();
  }
}
await b.close(); srv.close();
if (fail.length) { console.error('\n' + fail.join('\n')); process.exit(1); } log('\nonze fiches : magie (temps actif, pause, résultat, rejeu, fermeture, passage vers la machine) et machine (Explorer, démonstration guidée, pause, sortie) : ok');
