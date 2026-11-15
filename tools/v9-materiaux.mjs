// V9.1 : matériaux vitrés des trois cartes de l'accueil, avant / après, mêmes cadrages (bureau 1440 et 1920).  node tools/v9-materiaux.mjs
// « avant » = refonte/boot-native.js sans le bloc de faces vitrées (copie passée en argument : AVANT=chemin).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/v9/materiaux'), AVANT = process.env.AVANT; fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
let BEFORE = false;
const srv = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'), f = path.join(root, decodeURIComponent(u.pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream');
  if (BEFORE && AVANT && u.pathname === '/refonte/boot-native.js') return r.end(fs.readFileSync(AVANT)); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of [[1440, 900], [1920, 1080]]) for (const before of [true, false]) {
  BEFORE = before; const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
  await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__cvParity?.boxes, null, { timeout: 120000 }); await p.waitForTimeout(6000);
  for (const y of [340, 700]) { await p.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await p.waitForFunction(() => window.__cvParity.project() && window.__cvParity.boxes().length > 0, null, { timeout: 120000 }); await p.waitForTimeout(2800);
    await p.screenshot({ path: path.join(OUT, `${before ? 'avant' : 'apres'}-${w}-${y}.jpg`), type: 'jpeg', quality: 82, clip: { x: 0, y: Math.round(h * .12), width: Math.min(w, 560), height: Math.round(h * .7) }, timeout: 120000 }).catch((e) => console.log('capture', e.message.slice(0, 60))); }
  await ctx.close(); console.log('ok', before ? 'avant' : 'après', w);
}
await b.close(); srv.close();
