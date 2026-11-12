// Mesures de fluidité des deux expériences dans un navigateur réel (Chromium, RENDU LOGICIEL : ce ne sont pas des cadences GPU).
// Relevés : intervalle entre images (moyenne, p95, max), tâches longues (> 50 ms), mémoire JS, délais (chargement de la machine, ouverture de la magie,
// magie → machine). Usage : node tools/perf-ux.mjs [slug ...]   (par défaut : moteur44 studio lecteur-vre)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ['moteur44', 'studio', 'lecteur-vre'];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
let chromium; { const { createRequire } = await import('node:module'); const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q18/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const out = {};
for (const slug of slugs) for (const [vp, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }); const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  await ctx.addInitScript(() => { window.__fr = { on: false, d: [], last: 0, long: 0 }; const tick = (t) => { if (window.__fr.on && window.__fr.last) window.__fr.d.push(t - window.__fr.last); window.__fr.last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); try { new PerformanceObserver((l) => { if (window.__fr.on) window.__fr.long += l.getEntries().length; }).observe({ entryTypes: ['longtask'] }); } catch {} });
  const t0 = Date.now(); await p.goto(`http://localhost:${port}/projet-${slug}.html?uxtest`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.rf-cb-dock', { state: 'attached' }); await p.waitForFunction(() => window.__rfFlowReady && window.__rfTest); const tLoad = Date.now() - t0;
  const win = async (label, ms) => { await p.evaluate(() => { window.__fr.d = []; window.__fr.long = 0; window.__fr.on = true; }); await p.waitForTimeout(ms); return p.evaluate(() => { window.__fr.on = false; const d = window.__fr.d; return { n: d.length, d, long: window.__fr.long, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; }); };
  const fmt = (r) => ({ images: r.n, moyenne_ms: +(r.d.reduce((a, c) => a + c, 0) / Math.max(1, r.n)).toFixed(1), p95_ms: +q(r.d, .95).toFixed(1), max_ms: +Math.max(0, ...r.d).toFixed(1), taches_longues: r.long, heap_Mo: r.heap });
  const idle = fmt(await win('repos', 5000));
  const tOpen0 = Date.now(); await p.click('.rf-cta[data-demo="magic"]', { force: true }); await p.waitForSelector('.fl-ov.is-open'); const tOpen = Date.now() - tOpen0;
  const magic = fmt(await win('magie', 6000));
  await p.evaluate(() => window.__rfFlowTest.seek(window.__rfFlowTest.run() + 400, true)); await p.waitForFunction(() => !document.querySelector('.fl-ov-end').hidden);
  const tTr0 = Date.now(); await p.click('.fl-ov-end [data-act="machine"]', { force: true }); await p.waitForSelector('.cv-cb-panel.is-open', { timeout: 60000 }); const tTr = Date.now() - tTr0;
  const explore = fmt(await win('explorer', 6000));
  out[`${slug} ${vp}`] = { chargement_machine_ms: tLoad, ouverture_magie_ms: tOpen, magie_vers_machine_ms: tTr, repos: idle, magie: magic, explorer: explore };
  console.log(slug, vp, JSON.stringify(out[`${slug} ${vp}`]));
  await ctx.close();
}
await b.close(); srv.close();
fs.writeFileSync(path.join(root, 'docs/ux/perf-ux.json'), JSON.stringify({ environnement: 'Chromium, rendu logiciel (SwiftShader), pas de GPU : intervalles d\'images CPU, pas une cadence GPU', date: new Date().toISOString(), mesures: out }, null, 1));
