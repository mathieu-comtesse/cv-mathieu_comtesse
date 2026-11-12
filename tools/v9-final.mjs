// V9.1 : captures finales avant / après aux quatre résolutions. « avant » = ?topo=off&title=off (accueil d'origine : cartes à plat, titres CSS), « après » = V9.1.   node tools/v9-final.mjs
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/v9/final'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }), rows = [];
for (const [w, h] of [[1440, 900], [1920, 1080], [768, 1024], [390, 844]]) for (const mode of ['avant', 'apres']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
  await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest${mode === 'avant' ? '&topo=off&title=off' : ''}`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__cvParity?.boxes, null, { timeout: 120000 }); await p.waitForTimeout(6000); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => scrollTo({ top: 340, behavior: 'instant' })); await p.waitForFunction(() => window.__cvParity.project() && window.__cvParity.boxes().length > 0, null, { timeout: 120000 }); await p.waitForTimeout(2800);
  const tops = await p.evaluate(() => ['decor', 'shop'].map((id) => [id, Math.round(document.getElementById(id).getBoundingClientRect().top + scrollY)]));
  const info = await p.evaluate(() => ({ nav: window.__cvParity.navOpacity(), cartes: window.__cvParity.boxes().filter((q) => q.shown && q.title === '' && q.id == null).length }));
  await p.screenshot({ path: path.join(OUT, `${mode}-${w}-accueil.jpg`), type: 'jpeg', quality: 80, timeout: 120000 }).catch(() => {});
  for (const [id, top] of tops) { await p.evaluate((y) => scrollTo({ top: Math.max(0, y - 40), behavior: 'instant' }), top); await p.waitForTimeout(2600); await p.screenshot({ path: path.join(OUT, `${mode}-${w}-${id}.jpg`), type: 'jpeg', quality: 80, timeout: 120000 }).catch(() => {}); }
  rows.push({ mode, w, h, ...info }); console.log('ok', mode, w, JSON.stringify(info)); await ctx.close();
}
await b.close(); srv.close(); fs.writeFileSync(path.join(OUT, 'cadrages.json'), JSON.stringify(rows, null, 1));
