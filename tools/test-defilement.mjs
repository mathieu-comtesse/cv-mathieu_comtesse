// Défilement lissé de l'accueil (refonte/defilement.js) : un coup de molette de 500 px doit
//  - avancer de façon monotone jusqu'à 500 px exactement, sans dépassement ni rebond ;
//  - décélérer (le pas d'une image est décroissant sur la fin) ;
//  - atteindre 90 % de la course entre 120 et 700 ms (constante de temps visée : 100 ms ; plage large car la cadence du banc varie) ;
//  - rester natif et immédiat en mouvement réduit, pour un petit delta (pavé tactile) et au clavier.
// Usage : node tools/test-defilement.mjs [gpu|logiciel]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const racine = path.resolve(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname), '..', '..');
let chromium; try { ({ chromium } = createRequire(racine + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const mode = process.argv[2] || 'gpu';
const args = mode === 'gpu' ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const b = await chromium.launch({ args }); const echecs = [], verifie = (ok, t) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + t); if (!ok) echecs.push(t); };
const serve = (r) => { const f = path.join(racine, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); };
async function page(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
  await p.route('http://talas.test/**', serve); await p.route('https://comtesse.me/**', serve); await p.route(/shopify(cdn)?\.com/, (r) => r.abort());
  await p.goto('http://talas.test/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(2500);
  return p;
}
const serie = (p, ms) => p.evaluate((ms) => new Promise((res) => { const d = []; const t0 = performance.now(); const f = (n) => { d.push([Math.round(n - t0), scrollY]); if (n - t0 < ms) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); }), ms);
{
  const p = await page(); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await p.mouse.move(700, 450);
  const lecture = serie(p, 2500); await p.mouse.wheel(0, 500); const d = await lecture, y = d.map((a) => a[1]), fin = y.at(-1);
  verifie(Math.abs(fin - 500) <= 1, `arrivée exacte : ${fin.toFixed(1)} px pour 500 demandés`);
  verifie(y.every((v, i) => !i || v >= y[i - 1] - 0.01), 'progression monotone (aucun retour en arrière)');
  verifie(Math.max(...y) <= 500.5, `aucun dépassement (maximum ${Math.max(...y).toFixed(1)} px)`);
  const i0 = y.findIndex((v) => v > 1), i90 = y.findIndex((v) => v >= 450);
  const duree90 = i0 >= 0 && i90 >= 0 ? d[i90][0] - d[i0][0] : -1;
  verifie(duree90 >= 120 && duree90 <= 700, `90 % de la course en ${duree90} ms depuis le premier mouvement (cible : environ 230 ms pour une constante de temps de 100 ms)`);
  const pas = y.slice(i0).map((v, i, a) => i ? v - a[i - 1] : 0).filter((v, i, a) => i > 0 && a[i] > 0.05), tiers = Math.floor(pas.length / 3);
  verifie(pas.length > 6 && pas.slice(0, tiers).reduce((s, v) => s + v, 0) / tiers > pas.slice(-tiers).reduce((s, v) => s + v, 0) / tiers, `décélération : pas moyen ${(pas.slice(0, tiers).reduce((s, v) => s + v, 0) / tiers).toFixed(1)} px au début contre ${(pas.slice(-tiers).reduce((s, v) => s + v, 0) / tiers).toFixed(1)} px à la fin`);
  console.log('        échantillon :', d.filter((_, i) => i % 6 === 0).slice(0, 14).map((a) => a[0] + ':' + a[1].toFixed(0)).join(' '));
  // petit delta : natif, immédiat
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await p.mouse.wheel(0, 20); await p.waitForTimeout(250);
  const petit = await p.evaluate(() => scrollY); verifie(petit > 0 && petit <= 20.5, `petit delta (pavé tactile) laissé au défilement natif : ${petit.toFixed(1)} px`);
  // clavier : non intercepté, et la cible se resynchronise ensuite
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await p.keyboard.press('End'); await p.waitForTimeout(1200);
  const bas = await p.evaluate(() => [scrollY, document.documentElement.scrollHeight - innerHeight]); verifie(bas[0] >= bas[1] - 2, `touche Fin : bas de page atteint (${bas[0].toFixed(0)} sur ${bas[1].toFixed(0)})`);
  await p.mouse.wheel(0, -300); await p.waitForTimeout(1500); const haut = await p.evaluate(() => scrollY); verifie(Math.abs((bas[0] - haut) - 300) <= 2, `molette après le clavier : remontée de ${(bas[0] - haut).toFixed(1)} px pour 300 demandés`);
  await p.context().close();
}
{
  const p = await page({ reducedMotion: 'reduce' }); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await p.mouse.move(700, 450);
  await p.mouse.wheel(0, 500); await p.waitForTimeout(250); const y = await p.evaluate(() => scrollY);
  verifie(Math.abs(y - 500) <= 1, `mouvement réduit : défilement natif immédiat (${y.toFixed(1)} px après 250 ms)`);
  await p.context().close();
}
await b.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : défilement lissé, sans rebond, désactivé en mouvement réduit'); process.exit(echecs.length ? 1 : 0);
