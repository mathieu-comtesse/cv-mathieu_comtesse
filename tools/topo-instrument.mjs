// Instrumentation de la topographie du parcours : hauteurs réelles des chapitres (box.top), pente, inclinaison, dimensions projetées, pour plusieurs réglages de city / cityGrow.
//   node tools/topo-instrument.mjs                 variantes par défaut        VAR="city:.06,grow:4;city:.005,grow:48" pour d'autres
// Les réglages sont substitués dans refonte/boot-native.js au chargement (aucun fichier modifié). Sorties : docs/cadres-3d/topo-<variante>.json et captures.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/cadres-3d');
const VARS = (process.env.VAR || 'city:.005,grow:4;city:.06,grow:4;city:.005,grow:48;city:.15,grow:4;city:.02,grow:15').split(';').map((v) => Object.fromEntries(v.split(',').map((x) => x.split(':'))));
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const src = fs.readFileSync(path.join(root, 'refonte/boot-native.js'), 'utf8');
for (const v of VARS) {
  const tag = `city${v.city}_grow${v.grow}`.replace(/\./g, 'p');
  let mod = src.replace(/pitch:-30\.20000000000001,city:[0-9.]+/, `pitch:-30.20000000000001,city:${v.city}`).replace(/cityGrow:[0-9.]+/, `cityGrow:${v.grow}`);
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.route('**/refonte/boot-native.js*', (route) => route.fulfill({ body: mod, contentType: 'text/javascript' }));
  await ctx.route('https://comtesse.me/assets/showcase/**', (route) => { const f = path.join(root, new URL(route.request().url()).pathname); fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: T[path.extname(f)] }) : route.fulfill({ status: 404, body: '' }); });
  const p = await ctx.newPage(); await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__cvParity?.boxes, null, { timeout: 120000 }); await p.waitForTimeout(8000);
  const rows = [];
  for (const y of [340, 1500, 3000, 4500, 6000, 7500]) {
    await p.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await p.waitForTimeout(2200);
    const d = await p.evaluate(() => ({ view: (({ T, offset, pitch, fov, rise, camY, camZ }) => ({ T, offset, pitch, fov, rise, camY, camZ }))(window.__cvParity.project()), boxes: window.__cvParity.boxes(), vh: innerHeight }));
    rows.push({ scrollY: y, ...d });
    if (y === 340 || y === 4500) await p.screenshot({ path: path.join(OUT, `topo-${tag}-${y}.jpg`), type: 'jpeg', quality: 78 });
  }
  /* pente : régression de top sur la position verticale à l'écran (r1), par relevé ; hauteur relative des chapitres consécutifs */
  const stats = rows.map((r) => { const bx = r.boxes.filter((q) => q.r1 > 0 && q.r0 < r.view.T).sort((a, c) => a.r0 - c.r0); const n = bx.length; let slope = null; if (n > 1) { const mx = bx.reduce((s, q) => s + q.r1, 0) / n, my = bx.reduce((s, q) => s + q.top, 0) / n; const num = bx.reduce((s, q) => s + (q.r1 - mx) * (q.top - my), 0), den = bx.reduce((s, q) => s + (q.r1 - mx) ** 2, 0); slope = den ? num / den : 0; }
    return { scrollY: r.scrollY, n, tops: bx.map((q) => ({ t: (q.title || '').slice(0, 22), r0: Math.round(q.r0), top: +q.top.toFixed(1), tilted: +(q.tilted || 0).toFixed(2) })), pente_hauteur_par_px: slope == null ? null : +slope.toFixed(4), angle_deg: slope == null ? null : +(Math.atan(Math.abs(slope)) * 180 / Math.PI).toFixed(2), ecarts: bx.slice(1).map((q, i) => +(bx[i].top - q.top).toFixed(1)) }; });
  fs.writeFileSync(path.join(OUT, `topo-${tag}.json`), JSON.stringify({ variante: v, stats, rows }, null, 1)); console.log(tag, JSON.stringify(stats.map((s) => [s.scrollY, s.n, s.pente_hauteur_par_px, s.angle_deg])));
  await ctx.close();
}
await b.close(); srv.close();
