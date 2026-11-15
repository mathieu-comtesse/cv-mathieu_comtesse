// Rapport par machine : appels de dessin, triangles, géométries, textures, programmes, temps de construction. Rendu logiciel ou matériel indifférent (compteurs, pas des durées).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o)); const port = srv.address().port;
const { chromium } = createRequire(root + '/')('playwright'); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const figs = new Map(); for (const f of fs.readdirSync(root).filter((x) => /^projet-.*\.html$/.test(x))) { const m = /data-fig="([^"]+)"/.exec(fs.readFileSync(path.join(root, f), 'utf8')); if (m && !figs.has(m[1])) figs.set(m[1], f); }
const out = {}; console.log('machine | fiche | appels | triangles | géométries | textures | programmes | construction ms');
for (const [fig, file] of figs) { const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); await p.goto(`http://localhost:${port}/${file}?uxtest`, { waitUntil: 'domcontentloaded' });
  const ok = await p.waitForFunction(() => window.__rfTest?.gpuInfo?.() && performance.getEntriesByName('rf:first-render').length, null, { timeout: 90000 }).then(() => true).catch(() => false);
  if (!ok) { console.log(fig, file, 'non mesuré (iframe blueprint ou échec)'); await p.close(); continue; }
  await p.waitForTimeout(800); const r = await p.evaluate(() => ({ ...window.__rfTest.gpuInfo(), build: Math.round(performance.getEntriesByName('rf:machine-built')[0].startTime - performance.getEntriesByName('rf:machine-start')[0].startTime) }));
  out[fig] = { fiche: file, ...r }; console.log(fig, '|', file, '|', r.calls, '|', r.triangles, '|', r.geometries, '|', r.textures, '|', r.programs, '|', r.build); await p.close(); }
await b.close(); srv.close(); fs.writeFileSync(path.join(root, process.argv[2] || 'docs/profil/draw-calls.json'), JSON.stringify(out, null, 1));
