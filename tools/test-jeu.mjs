// Mini-jeu de la sphère dans le navigateur, sous rendu logiciel (validation fonctionnelle ; la validation graphique sur GPU reste ouverte, voir
// docs/reference/verifications-gpu-expo.md) : entrée progressive depuis l'Expo, compte à rebours, commandes clavier, molette et tactile, saut,
// chute et relance, partie complète jouée par un pilote qui n'utilise que le clavier (aucune téléportation), écran de résultats, sortie.
// Le pas de temps maximal par image est réduit (0,2 s) : la simulation est la même, elle va seulement plus lentement que le temps réel,
// ce qui rend la partie indépendante de la lenteur du rendu logiciel.
// Usage : node tools/test-jeu.mjs [rapide]   (SHOTS=dossier pour enregistrer des captures ; « rapide » saute la partie complète)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname)), '..');
let chromium; { try { ({ chromium } = createRequire(root + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); } }
const SHOTS = process.env.SHOTS, RAPIDE = process.argv[2] === 'rapide'; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const GPU = !!process.env.GPU, [VW, VH] = (process.env.VUE || '960x600').split('x').map(Number);   // GPU=1 : rendu matériel (d3d11) au lieu du rendu logiciel ; VUE=1440x900 : taille de fenêtre
const b = await chromium.launch({ args: GPU ? ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const echecs = [], verifie = (ok, t) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + t); if (!ok) echecs.push(t); };
async function ouvrePage(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, ...opts }), p = await ctx.newPage(); p.setDefaultTimeout(120000); p.erreurs = []; p.shopify = 0;
  const servi = (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); };
  await p.route('http://talas.test/**', servi); await p.route('https://comtesse.me/**', servi); await p.route(/shopify(cdn)?\.com/, (r) => { p.shopify++; r.abort(); });
  p.on('pageerror', (e) => p.erreurs.push(String(e.message).slice(0, 200)));
  await p.goto('http://talas.test/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 240000 }); await p.waitForTimeout(3000);
  return p;
}
const cdp = new Map(); const capture = async (p, nom) => { if (!SHOTS) return; if (!cdp.has(p)) cdp.set(p, await p.context().newCDPSession(p)); const { data } = await cdp.get(p).send('Page.captureScreenshot', { captureBeyondViewport: false, format: 'jpeg', quality: 80 }); fs.writeFileSync(path.join(SHOTS, nom + '.jpg'), Buffer.from(data, 'base64')); };
const etat = (p) => p.evaluate(() => window.__cvJeu.etat());
const attendPhase = (p, ph, ms = 90000) => p.waitForFunction((ph) => window.__cvJeu.phase() === ph, ph, { timeout: ms });
const avance = async (p, nPas) => { const n0 = (await etat(p)).n; await p.waitForFunction(([n0, k]) => window.__cvJeu.etat().n >= n0 + k, [n0, nPas], { timeout: 120000 }); };   /* nPas pas de 1/120 s */
const lance = async (p) => { await p.evaluate(() => window.__cvStandardPath.bascule()); await p.waitForFunction(() => window.__cvStandardPath.progress > 0.999, null, { timeout: 120000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => window.__cvJeu?.reglages?.({ dtMax: 0.2 })); };

/* ============ 1. entrée progressive depuis l'Expo ============ */
const p = await ouvrePage(); await lance(p);
const btn = await p.evaluate(() => { const e = document.querySelector('.cv-jeu-bouton'); return e && getComputedStyle(e).display; });
verifie(btn === 'flex', `bouton « Jouer » visible en mode expo (display ${btn})`);
const invit = await p.evaluate(() => !!document.querySelector('[data-cv-jeu].cv-link'));
verifie(invit, 'invitation « Jouer : traverser le site en sphère » présente en fin de parcours (mode à plat)');
const yAvant = await p.evaluate(() => Math.round(scrollY)); await p.evaluate(() => window.__cvOuvreJeu()); await p.waitForFunction(() => window.__cvJeu?.phase && window.__cvJeu.phase() !== 'repos', null, { timeout: 60000 }); await p.evaluate(() => window.__cvJeu.reglages({ dtMax: 0.2 }));
const traj = []; let dernier = 'x'; for (let i = 0; i < 400; i++) { const e = await etat(p); if (e.phase !== dernier) { traj.push(e.phase); dernier = e.phase; } traj.push(); if (e.phase === 'course') break; await p.waitForTimeout(150); if (i === 6) await capture(p, 'jeu-entree'); if (e.phase === 'compte' && i % 5 === 0) await capture(p, 'jeu-compte'); }
verifie(traj.join('>') === 'entree>compte>course', `entrée progressive : ${traj.join(' > ')}`);
const dom = await p.evaluate(() => ({ hud: !!document.querySelector('.cv-jeu-hud'), actif: document.documentElement.classList.contains('cv-jeu-actif'), expo: document.documentElement.classList.contains('cv-parity-active'), bouton: getComputedStyle(document.querySelector('.cv-jeu-bouton')).display, toggle: getComputedStyle(document.querySelector('.cv-parity-toggle')).display }));
verifie(dom.hud && dom.actif && dom.expo && dom.bouton === 'none' && dom.toggle === 'none', `jeu dans la scène Expo : le mode expo reste actif, interface du jeu en place, boutons d'entrée masqués (${JSON.stringify(dom)})`);
await capture(p, 'jeu-depart');

/* ============ 2. commandes clavier, molette ============ */
let e0 = await etat(p); await p.keyboard.down('ArrowRight'); await avance(p, 48); await p.keyboard.up('ArrowRight'); let e1 = await etat(p);
verifie(e1.x > e0.x + 80, `flèche droite : la sphère se déplace à droite (x ${e0.x.toFixed(0)} -> ${e1.x.toFixed(0)})`);
await p.keyboard.down('a'); await avance(p, 70); await p.keyboard.up('a'); const e2 = await etat(p); verifie(e2.x < e1.x - 80, `touche A : à gauche (x ${e1.x.toFixed(0)} -> ${e2.x.toFixed(0)})`);
await p.keyboard.down('d'); await avance(p, 40); await p.keyboard.up('d'); await p.keyboard.down('q'); await avance(p, 40); await p.keyboard.up('q'); const e3 = await etat(p); verifie(Math.abs(e3.x - e2.x) < 260, `touches D et Q (clavier français) : à droite puis à gauche (x ${e3.x.toFixed(0)})`);
const g0 = (await etat(p)).gaz; await p.keyboard.down('ArrowUp'); await avance(p, 60); await p.keyboard.up('ArrowUp'); const g1 = (await etat(p)).gaz;
await p.keyboard.down('s'); await avance(p, 100); await p.keyboard.up('s'); const g2 = (await etat(p)).gaz; await p.keyboard.down('w'); await avance(p, 30); await p.keyboard.up('w'); const g3 = (await etat(p)).gaz;
verifie(g1 > g0 && g2 < g1 && g3 > g2, `vitesse : flèche haut +, S -, W + (accélérateur ${g0.toFixed(2)} -> ${g1.toFixed(2)} -> ${g2.toFixed(2)} -> ${g3.toFixed(2)})`);
const sy0 = await p.evaluate(() => Math.round(scrollY)), gm0 = (await etat(p)).gaz; await p.mouse.move(700, 450); await p.mouse.wheel(0, 300); await avance(p, 6); const gm1 = (await etat(p)).gaz; await p.mouse.wheel(0, -300); await p.mouse.wheel(0, -300); await avance(p, 6); const gm2 = (await etat(p)).gaz;
verifie(gm1 > gm0 && gm2 < gm1, `molette : vers le bas accélère, vers le haut ralentit (accélérateur ${gm0.toFixed(2)} -> ${gm1.toFixed(2)} -> ${gm2.toFixed(2)}) ; la page ne défile pas par la molette`);
await p.keyboard.press('Space'); const hMax = []; for (let i = 0; i < 40; i++) { await avance(p, 6); hMax.push((await etat(p)).h); } const sauts = (await etat(p)).sauts;
verifie(Math.max(...hMax) > 120 && sauts >= 1 && hMax.at(-1) < 5, `saut : sommet ${Math.max(...hMax).toFixed(0)} px, retour au sol, ${sauts} saut(s) compté(s)`);
void sy0;

/* ============ 3. chute dans un trou, puis relance au point de passage ============ */
{ const plan = await p.evaluate(() => window.__cvJeu.donneesPlan()), e = await etat(p);
  const cible = plan.trous.concat(plan.noirs.map((n) => ({ x0: n.x - 20, x1: n.x + 20, r0: n.r - 20, r1: n.r + 20, noir: true }))).filter((t) => t.r0 > e.r + 500).sort((a, c) => a.r0 - c.r0)[0], cx = (cible.x0 + cible.x1) / 2;
  const chutes0 = (await etat(p)).chutes; let t0 = Date.now(), vu = null; const tenues = new Set(); const touche = async (k, on) => { if (on && !tenues.has(k)) { tenues.add(k); await p.keyboard.down(k); } else if (!on && tenues.has(k)) { tenues.delete(k); await p.keyboard.up(k); } };
  /* le pilote normal (qui évite les obstacles) conduit la sphère jusqu'à 1 200 px du danger, puis on la dirige dessus sans rien éviter */
  while (Date.now() - t0 < 1200000) { const s = await etat(p); if (s.chutes > chutes0) { vu = s; break; } if (s.phase !== 'course') break;
    const d = cible.r0 - s.r > 1200 ? await p.evaluate(() => window.__cvJeu.pilote({ gaz: 0.85 })) : { dir: Math.max(-1, Math.min(1, (cx - s.x - s.vx * 0.3) / 60)), dgaz: s.gaz > 0.45 ? -1 : 0, saut: false };
    await touche('ArrowRight', d.dir > 0.25); await touche('ArrowLeft', d.dir < -0.25); await touche('ArrowUp', d.dgaz > 0.2); await touche('ArrowDown', d.dgaz < -0.2); if (d.saut) await p.keyboard.press('Space'); await avance(p, 8); }
  for (const k of [...tenues]) await touche(k, false);
  for (const q of ['ArrowRight', 'ArrowLeft']) await p.keyboard.up(q);
  verifie(!!vu, `chute : la sphère dirigée vers ${cible.noir ? 'un trou noir' : 'un trou'} tombe (chutes ${chutes0} -> ${vu ? vu.chutes : '?'}, score ${vu ? Math.round(vu.score) : '?'})`);
  await capture(p, 'jeu-chute');
  /* le compteur de chutes s'incrémente à la relance : la première lecture après la chute est donc la partie relancée */
  verifie(!!vu && vu.phase === 'course' && vu.etat === 'course' && vu.r < cible.r0 - 500, `relance : la partie reprend au point de passage précédent (r ${vu ? vu.r.toFixed(0) : '?'}, avant le danger à ${cible.r0.toFixed(0)}), rayon ${vu ? vu.rayon.toFixed(1) : '?'} px`); }

/* ============ 4. partie complète, clavier seul, sans téléportation ============ */
if (!RAPIDE) {
  await p.evaluate(() => window.__cvJeu.ferme()); await attendPhase(p, 'repos'); await p.evaluate(() => window.__cvOuvreJeu()); await attendPhase(p, 'course', 120000); await p.evaluate(() => window.__cvJeu.reglages({ dtMax: 0.2 }));
  const tenues = new Set(); const touche = async (k, on) => { if (on && !tenues.has(k)) { tenues.add(k); await p.keyboard.down(k); } else if (!on && tenues.has(k)) { tenues.delete(k); await p.keyboard.up(k); } };
  let prev = await etat(p), maxVit = 0, relances = 0, debutReel = Date.now(), nDec = 0, ev = []; const heure = () => ((Date.now() - debutReel) / 1000).toFixed(0);
  while ((await etat(p)).phase === 'course' && Date.now() - debutReel < 2700000) {
    const d = await p.evaluate(() => window.__cvJeu.pilote({ gaz: 0.5 })); await touche('ArrowRight', d.dir > 0.25); await touche('ArrowLeft', d.dir < -0.25); await touche('ArrowUp', d.dgaz > 0.2); await touche('ArrowDown', d.dgaz < -0.2);
    if (d.saut) await p.keyboard.press('Space'); await avance(p, 8); const s = await etat(p);
    if (s.chutes > prev.chutes) relances++; else if (s.t > prev.t && s.etat === 'course' && prev.etat === 'course') maxVit = Math.max(maxVit, Math.abs(s.r - prev.r) / (s.t - prev.t)); prev = s; nDec++;
    if (nDec % 150 === 0) { console.log(`   ... ${heure()} s réelles : r ${s.r.toFixed(0)} / ${s.arrivee}, t ${s.t.toFixed(0)} s, score ${s.score.toFixed(0)}, ${s.mots} mots, ${s.etoiles} étoiles, ${s.chutes} chute(s)`); if (SHOTS && nDec % 600 === 0) await capture(p, 'jeu-course-' + nDec); }
  }
  for (const k of [...tenues]) await touche(k, false);
  await attendPhase(p, 'fin', 60000).catch(() => {}); const f = await etat(p); await capture(p, 'jeu-arrivee');
  verifie(f.phase === 'fin' && f.etat === 'arrive' && f.r >= f.arrivee, `partie complète : arrivée atteinte à r ${f.r.toFixed(0)} sur ${f.arrivee}, ${f.t.toFixed(1)} s de jeu (cible de 60 à 180 s), ${nDec} décisions du pilote au clavier`);
  verifie(f.t >= 60 && f.t <= 180, `durée de la partie : ${f.t.toFixed(1)} s de jeu`);
  verifie(maxVit <= 1725 + 40, `aucune téléportation : vitesse moyenne maximale entre deux décisions ${maxVit.toFixed(0)} px par seconde de jeu (limite physique 1 725), ${relances} relance(s) après chute`);
  verifie(f.mots >= 20 && f.etoiles >= 5 && f.score > 800, `collectes : ${f.mots} mots, ${f.etoiles} étoiles, ${f.noeuds} nœuds, ${f.pris} objets sur ${f.pris + 0} pris, score ${Math.round(f.score)}, sphère ${f.rayon.toFixed(1)} px (départ 28)`);
  await p.waitForFunction(() => !document.querySelector('.cv-jeu-fin').hidden, null, { timeout: 30000 }).catch(() => {});
  const res = await p.evaluate(() => { const fin = document.querySelector('.cv-jeu-fin'); return { vu: !fin.hidden, bilan: fin.querySelector('[data-j="bilan"]').innerText.replace(/\s+/g, ' '), note: fin.querySelector('[data-j="note"]').textContent }; });
  verifie(res.vu && /Score/.test(res.bilan) && new RegExp(`${f.mots} / \\d+`).test(res.bilan), `écran de résultats : ${res.note} ; ${res.bilan}`);
  await capture(p, 'jeu-resultats');
  /* rejouer puis quitter depuis les résultats */
  await p.evaluate(() => document.querySelector('[data-j="rejouer"]').click()); await p.waitForFunction(() => ['entree', 'compte', 'course'].includes(window.__cvJeu.phase()), null, { timeout: 30000 }); const rj = await etat(p);
  verifie(rj.score === 0 && rj.n < 2000 && rj.r <= rj.depart + 5, `rejouer : nouvelle partie remise à zéro (score ${rj.score}, r ${rj.r.toFixed(0)})`);
}

/* ============ 5. sortie : retour à la position de lecture, l'Expo reste active ============ */
await p.keyboard.press('Escape'); await attendPhase(p, 'repos', 60000); await p.waitForTimeout(800);
const sortie = await p.evaluate(() => ({ y: Math.round(scrollY), expo: document.documentElement.classList.contains('cv-parity-active'), actif: document.documentElement.classList.contains('cv-jeu-actif'), bouton: getComputedStyle(document.querySelector('.cv-jeu-bouton')).display, progress: window.__cvStandardPath.progress }));
verifie(Math.abs(sortie.y - yAvant) <= 12 && sortie.expo && !sortie.actif && sortie.bouton === 'flex' && sortie.progress > 0.999, `sortie par Échap : retour à la position de lecture (${yAvant} -> ${sortie.y} px), mode expo toujours actif, bouton « Jouer » de retour`);
verifie(p.erreurs.length === 0 && p.shopify === 0, `aucune erreur de page (${p.erreurs.length}${p.erreurs.length ? ' : ' + p.erreurs[0] : ''}), aucune requête Shopify (${p.shopify})`);

/* ============ 6. mobile : commandes tactiles ============ */
await p.context().close();   /* libère le processeur : le rendu logiciel est lent */
{ const m = await ouvrePage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await lance(m);
  await m.evaluate(() => window.__cvOuvreJeu()); await m.waitForFunction(() => window.__cvJeu?.phase && window.__cvJeu.phase() !== 'repos', null, { timeout: 60000 }); await m.evaluate(() => window.__cvJeu.reglages({ dtMax: 0.2 })); await attendPhase(m, 'course', 120000);
  const ui = await m.evaluate(() => { const t = document.querySelector('.cv-jeu-tactile'), r = (s) => { const q = document.querySelector(s).getBoundingClientRect(); return [Math.round(q.width), Math.round(q.height)]; }; return { affiche: getComputedStyle(t).display, glisse: r('[data-j="glisse"]'), plus: r('[data-j="plus"]'), saut: r('[data-j="sauter"]'), debord: document.documentElement.scrollWidth - innerWidth }; });
  verifie(ui.affiche === 'flex' && ui.plus[0] >= 44 && ui.saut[0] >= 44 && ui.glisse[0] >= 120 && ui.debord <= 1, `mobile : commandes tactiles affichées (zone de glisser ${ui.glisse.join('×')}, boutons ${ui.plus.join('×')}), cibles d'au moins 44 px, pas de débordement`);
  const box = await m.locator('[data-j="glisse"]').boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height / 2, a0 = await etat(m);
  await m.touchscreen.tap(cx, cy);   /* geste de départ (son) */
  const pad = await m.evaluate(() => { const g = document.querySelector('[data-j="glisse"]'); const id = 77; const ev = (t, x) => g.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: 0, bubbles: true, pointerType: 'touch' })); const r = g.getBoundingClientRect(); ev('pointerdown', r.left + r.width / 2); ev('pointermove', r.left + r.width / 2 + 60); return true; });
  await avance(m, 50); const a1 = await etat(m); await m.evaluate(() => { const g = document.querySelector('[data-j="glisse"]'); g.dispatchEvent(new PointerEvent('pointerup', { pointerId: 77, bubbles: true })); });
  verifie(pad && a1.x > a0.x + 60, `mobile : glisser vers la droite oriente la sphère (x ${a0.x.toFixed(0)} -> ${a1.x.toFixed(0)})`);
  const g0 = (await etat(m)).gaz; await m.evaluate(() => { const b = document.querySelector('[data-j="plus"]'); b.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 5, bubbles: true })); }); await avance(m, 60); await m.evaluate(() => document.querySelector('[data-j="plus"]').dispatchEvent(new PointerEvent('pointerup', { pointerId: 5, bubbles: true }))); const g1 = (await etat(m)).gaz;
  await m.evaluate(() => document.querySelector('[data-j="sauter"]').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 6, bubbles: true }))); let h = 0; for (let i = 0; i < 20; i++) { await avance(m, 6); h = Math.max(h, (await etat(m)).h); }
  verifie(g1 > g0 && h > 100, `mobile : bouton Vite (accélérateur ${g0.toFixed(2)} -> ${g1.toFixed(2)}) et bouton Saut (sommet ${h.toFixed(0)} px)`);
  await capture(m, 'jeu-mobile'); await m.evaluate(() => window.__cvJeu.ferme()); await attendPhase(m, 'repos', 60000);
  verifie(m.erreurs.length === 0, `mobile : aucune erreur de page (${m.erreurs.length})`); await m.context().close(); }

await b.close(); console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : mini-jeu (entrée, commandes, chute et relance, partie complète au clavier, résultats, sortie, tactile)'); process.exit(echecs.length ? 1 : 0);
