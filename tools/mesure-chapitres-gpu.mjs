// Changements rapides de chapitre (molette répétée) en expo, avec le GPU matériel : temps du thread principal, images perdues, mémoire.
// Usage : node tools/mesure-chapitres-gpu.mjs [racine] [largeur] [hauteur]   (racine par défaut : ce dépôt)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const ici = path.resolve(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname), '..', '..');
const racine = path.resolve(process.argv[2] || ici), W = +(process.argv[3] || 1920), H = +(process.argv[4] || 1080);
const { chromium } = createRequire(ici + '/')('playwright');
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--enable-unsafe-webgpu', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
const serve = (r) => { const f = path.join(racine, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); };
await p.route('http://talas.test/**', serve); await p.route('https://comtesse.me/**', serve); await p.route(/shopify(cdn)?\.com/, (r) => r.abort());
await p.goto('http://talas.test/index.html', { waitUntil: 'load' });
await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(3000);
await p.evaluate(() => window.__cvStandardPath.bascule()); await p.waitForFunction(() => window.__cvStandardPath.progress > 0.999, null, { timeout: 90000 }); await p.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable'); await cdp.send('HeapProfiler.enable');
const metr = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
await cdp.send('HeapProfiler.collectGarbage'); const m0 = await metr();
await p.evaluate(() => { window.__d = []; let prev = performance.now(); const f = (n) => { window.__d.push(n - prev); prev = n; window.__raf = requestAnimationFrame(f); }; window.__raf = requestAnimationFrame(f); });
await p.mouse.move(W / 2, H / 2);
const t0 = Date.now(); let n = 0;
while (Date.now() - t0 < 8000) { await p.mouse.wheel(0, n % 9 === 8 ? -1400 : 1100); n++; await p.waitForTimeout(160); }   // 8 s de molette rapide, avec un retour en arrière toutes les neuf impulsions
await p.waitForTimeout(1500);
const d = await p.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__d.slice(3); }), m1 = await metr();
await cdp.send('HeapProfiler.collectGarbage'); const m2 = await metr();
const s = [...d].sort((a, c) => a - c), q = (x) => s[Math.min(s.length - 1, Math.floor(s.length * x))], perdues = d.filter((v) => v > 25).length;
const pos = await p.evaluate(() => scrollY);
console.log(JSON.stringify({ racine: path.basename(racine), viewport: [W, H], impulsions: n, images: d.length, mediane_ms: +q(0.5).toFixed(2), p95_ms: +q(0.95).toFixed(2), p99_ms: +q(0.99).toFixed(2), max_ms: +s.at(-1).toFixed(1), images_plus_de_25ms: perdues,
  tache_ms_par_image: +(((m1.TaskDuration - m0.TaskDuration) * 1000) / d.length).toFixed(2), script_ms_par_image: +(((m1.ScriptDuration - m0.ScriptDuration) * 1000) / d.length).toFixed(2),
  tas_js_Mo_avant: +(m0.JSHeapUsedSize / 1048576).toFixed(1), tas_js_Mo_pic: +(m1.JSHeapUsedSize / 1048576).toFixed(1), tas_js_Mo_apres_gc: +(m2.JSHeapUsedSize / 1048576).toFixed(1), noeuds_dom_avant_apres: [m0.Nodes, m2.Nodes], position_finale: Math.round(pos) }, null, 1));
await b.close();
