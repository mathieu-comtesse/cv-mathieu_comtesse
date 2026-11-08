// Banc de mesure de comtesse.me (local) : cadence des images, tâches longues, LCP/CLS, boucles rAF, contextes WebGL, copies canvas, octets.
// Usage : node tools/perf/measure.cjs <url-chemin> <sortie.json> [largeur] [hauteur] [secondes] [scrollY]
// Les requêtes vers https://comtesse.me/ sont servies depuis ce dépôt. Rendu logiciel (SwiftShader) : les images/s sont une mesure relative, pas un FPS GPU.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const root = process.env.ROOT || path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
(async () => {
  const [, , route = '/', out = 'perf.json', W = '1440', H = '900', secs = '12', sy = '0'] = process.argv;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
  let bytes = 0, reqs = 0; const errors = [];
  await ctx.route(/^https?:\/\/(comtesse\.me|localhost:\d+)\//, async (r) => {
    const u = new URL(r.request().url()); let f = path.join(root, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    try { const body = fs.readFileSync(f); bytes += body.length; reqs++; await r.fulfill({ body, contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { await r.fulfill({ status: 404, body: '' }); }
  });
  await ctx.addInitScript(() => {
    const m = window.__m = { raf: 0, rafBy: {}, frames: [], long: [], lcp: 0, cls: 0, ctx: 0, draw: 0, tex: 0, calls: 0 };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { const k = (new Error().stack || '').split('\n')[2] || '?'; const key = k.replace(/^\s*at\s+/, '').replace(/\?.*:/, ':').slice(-70); return raf((t) => { m.raf++; m.rafBy[key] = (m.rafBy[key] || 0) + 1; cb(t); }); };
    const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { if (/webgl/.test(t)) m.ctx++; return gc.call(this, t, ...a); };
    const di = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) { if (img instanceof HTMLCanvasElement) m.draw++; return di.call(this, img, ...a); };
    let last = 0; const tick = (t) => { if (last) m.frames.push(t - last); last = t; raf(tick); }; raf(tick);
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.long.push(e.duration); }).observe({ type: 'longtask', buffered: true }); } catch {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message.slice(0, 200))); p.on('console', (c) => { if (c.type() === 'error') errors.push(c.text().slice(0, 200)); });
  const t0 = Date.now(); await p.goto('http://localhost:1' + route.replace(/^\/?/, '/'), { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  const load = Date.now() - t0; await p.waitForTimeout(4000);
  if (+sy) await p.evaluate((y) => scrollTo(0, y), +sy);
  await p.evaluate(() => { window.__m.frames.length = 0; window.__m.raf = 0; window.__m.rafBy = {}; }); await p.waitForTimeout(+secs * 1000);
  const bus = await p.evaluate(() => window.__cvBus && window.__cvBus.stats().slice(0, 10)); const r = await p.evaluate(() => { const m = window.__m, f = m.frames.slice().sort((a, c) => a - c), q = (x) => f.length ? +f[Math.min(f.length - 1, Math.floor(f.length * x))].toFixed(1) : null; const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null;
    return { frames: f.length, fps: +(f.length / (f.reduce((a, c) => a + c, 0) / 1000 || 1)).toFixed(1), p50: q(.5), p95: q(.95), p99: q(.99), rafCallsPerFrame: f.length ? +(m.raf / f.length).toFixed(2) : null, rafTop: Object.entries(m.rafBy).sort((a, c) => c[1] - a[1]).slice(0, 8), longTasks: m.long.length, longMs: Math.round(m.long.reduce((a, c) => a + c, 0)), lcp: Math.round(m.lcp), cls: +m.cls.toFixed(3), webglContexts: m.ctx, canvasToCanvasCopies: m.draw, heapMB: heap, canvases: document.querySelectorAll('canvas').length, domNodes: document.getElementsByTagName('*').length }; });
  Object.assign(r, { bus, loadMs: load, requests: reqs, kbTransferred: Math.round(bytes / 1024), errors: errors.slice(0, 8), viewport: W + 'x' + H });
  fs.writeFileSync(out, JSON.stringify(r, null, 1)); console.log(JSON.stringify(r)); await b.close();
})();
