// Fluidité de l'accueil, à plat puis en expo, avec le GPU matériel ou le rendu logiciel.
// Usage : node tools/mesure-fluidite-gpu.mjs [gpu|logiciel] [largeur] [hauteur]
// Les fichiers sont servis par l'interception de Playwright (aucun socket : un pare-feu local peut bloquer la boucle locale).
// Sur un écran à 60 Hz, le temps d'image est plafonné par la synchronisation verticale : lire surtout `tache_ms_par_image` et
// `script_ms_par_image` (temps du thread principal par image, mesuré par le protocole de débogage), qui montrent la marge réelle.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const racine = path.resolve(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname), '..', '..');
const mode = process.argv[2] || 'gpu', W = +(process.argv[3] || 2498), H = +(process.argv[4] || 1319);
let chromium; try { ({ chromium } = createRequire(racine + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const args = mode === 'gpu' ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--enable-unsafe-webgpu'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const b = await chromium.launch({ args });
const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
const serve = (r) => { const f = path.join(racine, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); };
await p.route('http://talas.test/**', serve); await p.route('https://comtesse.me/**', serve); await p.route(/shopify(cdn)?\.com/, (r) => r.abort());
await p.goto('http://talas.test/index.html', { waitUntil: 'load' });
await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(3000);
const rendu = await p.evaluate(() => { const c = document.createElement('canvas'), g = c.getContext('webgl2'), e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'inconnu'; });
const mesure = (ms) => p.evaluate((ms) => new Promise((res) => { const d = []; let t0 = performance.now(), prev = t0; const f = (n) => { d.push(n - prev); prev = n; if (n - t0 < ms) requestAnimationFrame(f); else res(d.slice(2)); }; requestAnimationFrame(f); }), ms);
const stats = (d) => { const s = [...d].sort((a, c) => a - c), q = (x) => s[Math.min(s.length - 1, Math.floor(s.length * x))]; return { images: d.length, moyenne_ms: +(d.reduce((a, c) => a + c, 0) / d.length).toFixed(2), mediane_ms: +q(0.5).toFixed(2), p95_ms: +q(0.95).toFixed(2), max_ms: +s.at(-1).toFixed(1) }; };
const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
const metr = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const cout = async (ms) => { const a = await metr(), d = await mesure(ms), z = await metr(), n = d.length; return { ...stats(d), tache_ms_par_image: +(((z.TaskDuration - a.TaskDuration) * 1000) / n).toFixed(2), script_ms_par_image: +(((z.ScriptDuration - a.ScriptDuration) * 1000) / n).toFixed(2) }; };
const plat = await cout(5000);
await p.evaluate(() => window.__cvStandardPath.bascule());
await p.waitForFunction(() => window.__cvStandardPath.progress > 0.999, null, { timeout: 90000 }); await p.waitForTimeout(1500);
const expo = await cout(5000);
console.log(JSON.stringify({ mode, viewport: [W, H], rendu, plat, expo }, null, 1));
await b.close();
