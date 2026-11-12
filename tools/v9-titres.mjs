// V9.1 : titres de chapitre avant (?title=off) / après, cinq chapitres, bureau et mobile, mêmes cadrages.   node tools/v9-titres.mjs
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/v9/titres'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }), res = [];
for (const [w, h] of [[1440, 900], [390, 844]]) for (const mode of ['off', 'on']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
  await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest${mode === 'off' ? '&title=off' : ''}`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__cvParity?.boxes, null, { timeout: 120000 }); await p.waitForTimeout(6000); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => scrollTo({ top: 340, behavior: 'instant' })); await p.waitForFunction(() => window.__cvParity.project() && window.__cvParity.boxes().length > 0, null, { timeout: 120000 }); await p.waitForTimeout(2500);
  const tops = await p.evaluate(() => ['decor', 'shop', 'marketing', 'fulfillment', 'developer'].map((id) => { const e = document.getElementById(id); return [id, e ? Math.round(e.getBoundingClientRect().top + scrollY) : null]; }));
  for (const [id, top] of tops) { if (top == null) continue; await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.max(0, top - 40)); await p.waitForTimeout(2800); await p.screenshot({ path: path.join(OUT, `${mode}-${w}-${id}.jpg`), type: 'jpeg', quality: 80, timeout: 120000 }).catch(() => {}); res.push({ mode, w, id, top }); }
  await ctx.close(); console.log('ok', mode, w);
}
await b.close(); srv.close(); fs.writeFileSync(path.join(OUT, 'cadrages.json'), JSON.stringify(res, null, 1));
