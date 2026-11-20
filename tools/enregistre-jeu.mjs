// Enregistre une vidéo en temps réel d'une partie du mini-jeu (rendu matériel, d3d11) : entrée depuis l'Expo, compte à rebours, jeu au clavier
// (le pilote automatique n'envoie que des touches), chute volontaire dans un trou noir puis relance, puis la partie reprend.
// Usage : node tools/enregistre-jeu.mjs dossier-de-sortie [secondes-de-jeu-après-la-relance]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname)), '..');
const { chromium } = createRequire(root + '/')('playwright'); const out = process.argv[2] || 'jeu-video', DUREE = +process.argv[3] || 45; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } } }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
const servi = (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); };
await p.route('http://talas.test/**', servi); await p.route('https://comtesse.me/**', servi); await p.route(/shopify(cdn)?\.com/, (r) => r.abort());
await p.goto('http://talas.test/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph); await p.waitForTimeout(2500);
await p.evaluate(() => window.__cvStandardPath.bascule()); await p.waitForFunction(() => window.__cvStandardPath.progress > 0.999); await p.waitForTimeout(1800);
const etat = () => p.evaluate(() => window.__cvJeu.etat()); const tenues = new Set();
const touche = async (k, on) => { if (on && !tenues.has(k)) { tenues.add(k); await p.keyboard.down(k); } else if (!on && tenues.has(k)) { tenues.delete(k); await p.keyboard.up(k); } };
const commande = async (d) => { await touche('ArrowRight', d.dir > 0.25); await touche('ArrowLeft', d.dir < -0.25); await touche('ArrowUp', d.dgaz > 0.2); await touche('ArrowDown', d.dgaz < -0.2); if (d.saut) await p.keyboard.press('Space'); };
const avance = async (k) => { const n0 = (await etat()).n; await p.waitForFunction(([n, k]) => window.__cvJeu.etat().n >= n + k, [n0, k]); };
await p.evaluate(() => window.__cvOuvreJeu()); await p.waitForFunction(() => window.__cvJeu.phase() === 'course', null, { timeout: 60000 });
/* 1. quelques secondes de jeu normal : saut, vitesse */
for (let i = 0; i < 90; i++) { await commande(await p.evaluate(() => window.__cvJeu.pilote({ gaz: 0.6 }))); await avance(8); }
/* 2. chute volontaire dans le premier danger devant (trou noir si possible) */
{ const plan = await p.evaluate(() => window.__cvJeu.donneesPlan()), e0 = await etat();
  const cibles = plan.noirs.map((n) => ({ x0: n.x - 20, x1: n.x + 20, r0: n.r - 20, noir: true })).concat(plan.trous).filter((t) => t.r0 > e0.r + 900).sort((a, c) => a.r0 - c.r0), cible = cibles[0], cx = (cible.x0 + cible.x1) / 2, c0 = e0.chutes;
  for (let i = 0; i < 4000; i++) { const s = await etat(); if (s.chutes > c0 || s.phase !== 'course') break;
    const d = cible.r0 - s.r > 1200 ? await p.evaluate(() => window.__cvJeu.pilote({ gaz: 0.85 })) : { dir: Math.max(-1, Math.min(1, (cx - s.x - s.vx * 0.3) / 60)), dgaz: s.gaz > 0.45 ? -1 : 0, saut: false }; await commande(d); await avance(8); }
  await p.waitForTimeout(1500); }
/* 3. la partie reprend : le pilote joue DUREE secondes de jeu, puis on quitte avec Échap */
{ const t0 = (await etat()).t; for (let i = 0; i < 6000; i++) { const s = await etat(); if (s.phase !== 'course' || s.t - t0 > DUREE) break; await commande(await p.evaluate(() => window.__cvJeu.pilote({ gaz: 0.55 }))); await avance(8); } }
for (const k of [...tenues]) await touche(k, false);
const f = await etat(); console.log(`fin d'enregistrement : r ${f.r.toFixed(0)}, ${f.t.toFixed(0)} s, score ${Math.round(f.score)}, ${f.mots} mots, ${f.etoiles} étoiles, ${f.noeuds} nœuds, ${f.chutes} chute(s)`);
await p.keyboard.press('Escape'); await p.waitForFunction(() => window.__cvJeu.phase() === 'repos', null, { timeout: 60000 }); await p.waitForTimeout(1500);
await ctx.close(); await b.close(); console.log(fs.readdirSync(out).join(','));
