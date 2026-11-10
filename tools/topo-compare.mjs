// Comparatif des trois états des cartes de l'accueil (1440 x 900, défilement 340 et 700) : ?topo=off, escalier V8.4 (rampe 12°, marches 26 px), escalier recalibré (valeurs de index.html).
// L'état V8.4 est reconstitué en substituant les constantes de HOME_HERO_TOPO à la volée (index.html n'est pas modifié).   node tools/topo-compare.mjs
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/cadres-3d/topo-home/comparatif'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
let OLD = false;
const srv = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'), f = path.join(root, decodeURIComponent(u.pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream');
  if (u.pathname === '/index.html' && OLD) { const s = fs.readFileSync(f, 'utf8'), m = 'slopeDeg:11,pitchDeg:12,step:10'; if (!s.includes(m)) throw new Error('constantes introuvables'); if (!s.includes('depth:ht?top-base:top')) throw new Error('profondeur introuvable'); return r.end(s.replace(m, 'slopeDeg:12,pitchDeg:12,step:26').replace('depth:ht?top-base:top', 'depth:top')); /* V8.4 : profondeur = lift + 20 (base comptée deux fois) */ } fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const rows = [], modes = [['off', 'initiale ?topo=off', '&topo=off', false], ['v84', 'V8.4 (rampe 12°, marche 26 px, profondeur lift + 20)', '', true], ['v85', 'V8.5 recalibrée', '', false]];
for (const [key, label, qs, old] of modes) {
  OLD = old; const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
  await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest${qs}`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__cvParity?.boxes); await p.waitForTimeout(6000);
  await p.evaluate(() => scrollTo({ top: 340, behavior: 'instant' })); await p.waitForFunction(() => window.__cvParity.project() && window.__cvParity.boxes().length > 0); await p.waitForTimeout(3000);
  for (const y of [340, 700]) {
    await p.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await p.waitForTimeout(2500);
    const bx = (await p.evaluate(() => window.__cvParity.boxes())).filter((q) => (key === 'off' ? q.title === '' && q.id == null : q.hero)).sort((a, c) => a.y - c.y);
    rows.push({ key, label, y, alt: bx.map((q) => q.altitude), ecart: +(bx[0].altitude - bx[2].altitude).toFixed(1), pitch: bx.map((q) => q.pitchDeg), thick: bx.map((q) => q.thick), thickPx: bx.map((q) => q.thickPx) });
    await p.screenshot({ path: path.join(OUT, `${key}-${y}.jpg`), type: 'jpeg', quality: 82, timeout: 120000 });
    await p.screenshot({ path: path.join(OUT, `${key}-${y}-zoom.jpg`), type: 'jpeg', quality: 86, clip: { x: 0, y: 150, width: 460, height: 520 }, timeout: 120000 });
  }
  await ctx.close();
}
await b.close(); srv.close(); fs.writeFileSync(path.join(OUT, 'comparatif.json'), JSON.stringify(rows, null, 1));
const md = ['| état | défilement | altitudes (px) | écart 1 à 3 (px) | tangages (°) | épaisseur (px) | épaisseur écran (px) |', '|---|---|---|---|---|---|---|', ...rows.map((r) => `| ${r.label} | ${r.y} | ${r.alt.join(' / ')} | ${r.ecart} | ${r.pitch.join(' / ')} | ${r.thick.join(' / ')} | ${r.thickPx.join(' / ')} |`)];
fs.writeFileSync(path.join(OUT, 'comparatif.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
