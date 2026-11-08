// Ablation des modules Shopify : bloque un module à la fois (réseau réel pour le reste) et compare erreurs, état et pixels au témoin.
// Usage : node tools/shopify/ablate.cjs sortie.json [module-fragment ...]   (sans argument : tous les modules chargés à l'accueil)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const MODS = 'entry.browser smoothScroll mesh.wgsl residentSections rootMirror colorPalette build-section-frame style sectionDot preload-helper htmlInCanvasTilt shader surface pack highlight HtmlInCanvasEntry frameLoop frame- easing- random clamp wire cardWire'.split(' ');
async function run(b, block) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const errs = [], failed = new Set();
  await ctx.route(/^https?:\/\//, async (r) => { const u = new URL(r.request().url()); if (/^(comtesse\.me|localhost:\d+)$/.test(u.host)) { let f = path.join(root, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; try { return await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { return r.fulfill({ status: 404, body: '' }); } } if (block && u.pathname.includes('/' + block)) { failed.add(u.pathname.split('/').pop()); return r.abort(); } return r.continue(); });
  const p = await ctx.newPage(); await p.addInitScript(() => { Math.random = () => .5; }); p.on('pageerror', (e) => errs.push(e.message.slice(0, 90)));
  await p.goto('http://localhost:1/'); await p.waitForTimeout(9000);
  const st = await p.evaluate(() => JSON.stringify({ path: window.__cvTransfer?.path, err: (window.__cvTransfer?.errors || []).map((e) => e.part + ':' + String(e.error).slice(0, 50)), canv: document.querySelectorAll('canvas').length, drawn: document.documentElement.hasAttribute('data-f26-canvas-drawn'), settled: document.documentElement.hasAttribute('data-f26-page-settled') }));
  const shots = []; for (const y of [0, 3000]) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(1800); shots.push(await p.screenshot()); }
  await ctx.close(); return { st, errs: errs.slice(0, 3), shots, failed: [...failed] };
}
function diff(a, b) { const { PNG } = require('pngjs'); const A = PNG.sync.read(a), B = PNG.sync.read(b); let n = 0; for (let i = 0; i < A.data.length; i += 4) if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 72) n++; return +(n / (A.data.length / 4) * 100).toFixed(2); }
(async () => {
  const out = process.argv[2], list = process.argv.length > 3 ? process.argv.slice(3) : MODS; const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = await run(b, null); const res = { base: { st: base.st, errs: base.errs } };
  for (const m of list) { const r = await run(b, m); res[m] = { blocked: r.failed.length, st: r.st === base.st ? 'identique' : r.st, errs: r.errs, px0: diff(base.shots[0], r.shots[0]), px3000: diff(base.shots[1], r.shots[1]) }; console.log(m.padEnd(22), JSON.stringify(res[m]).slice(0, 220)); fs.writeFileSync(out, JSON.stringify(res, null, 1)); }
  await b.close();
})();
