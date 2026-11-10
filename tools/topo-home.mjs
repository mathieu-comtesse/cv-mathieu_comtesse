// Topographie des trois cartes de l'accueil (p.slab && p.hero) : mesures réelles (altitude, tangage, roulis, coins 3D, projection, correspondance contenu / contour),
// comparaison ?topo=off (géométrie d'origine) / normal, non-régression des autres chapitres, captures aux mêmes cadrages.   node tools/topo-home.mjs
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/cadres-3d/topo-home'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const SCROLLS = [0, 340, 700, 1500, 3000, 4500, 6000, 7500], res = { on: {}, off: {} };
for (const [mode, qs] of [['off', '&topo=off'], ['on', '']]) for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }); await ctx.route('https://comtesse.me/assets/showcase/**', (route) => { const f = path.join(root, new URL(route.request().url()).pathname); fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: T[path.extname(f)] }) : route.fulfill({ status: 404, body: '' }); });
  const p = await ctx.newPage(); await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest${qs}`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__cvParity?.boxes, null, { timeout: 120000 }); await p.waitForTimeout(8000);
  for (const y of (w > 700 ? SCROLLS : [340, 1500])) {
    await p.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await p.waitForTimeout(2200);
    const d = await p.evaluate(() => ({ view: (({ T, offset, pitch, fov, rise }) => ({ T, offset, pitch, fov, rise }))(window.__cvParity.project()), boxes: window.__cvParity.boxes() }));
    (res[mode][w] ||= {})[y] = d;
    if (y === 340) await p.screenshot({ path: path.join(OUT, `${mode}-${w}-340.jpg`), type: 'jpeg', quality: 80 });
    if (w > 700 && y === 700) await p.screenshot({ path: path.join(OUT, `${mode}-${w}-700.jpg`), type: 'jpeg', quality: 80 });
  }
  await ctx.close();
}
await b.close(); srv.close(); fs.writeFileSync(path.join(OUT, 'mesures.json'), JSON.stringify(res, null, 1));
/* ---- analyses ---- */
const fails = [], eq = (a, c, tol) => JSON.stringify(a) === JSON.stringify(c) || (Array.isArray(a) && Array.isArray(c) && a.length === c.length && a.every((v, i) => eq(v, c[i], tol))) || (typeof a === 'number' && typeof c === 'number' && Math.abs(a - c) <= tol);
const heroOn = (w, y) => res.on[w][y].boxes.filter((q) => q.hero).sort((a, c) => a.index - c.index), heroOff = (w, y) => res.off[w][y].boxes.filter((q) => q.title === '' && q.id == null);
const md = ['| position | carte | altitude (px) | tangage (°) | roulis (°) | coins projetés (haut-gauche, haut-droit, bas-droit, bas-gauche) |', '|---|---|---|---|---|---|'];
for (const w of [1440]) for (const y of [340, 700]) { heroOff(w, y).forEach((q, i) => md.push(`| ${w} / ${y} ?topo=off | ${i + 1} | ${q.altitude} | ${q.pitchDeg} | ${q.rollDeg} | ${JSON.stringify(q.cornersProjected)} |`)); heroOn(w, y).forEach((q) => md.push(`| ${w} / ${y} normal | ${q.index + 1} | ${q.altitude} | ${q.pitchDeg} | ${q.rollDeg} | ${JSON.stringify(q.cornersProjected)} |`)); }
for (const w of [1440, 390]) for (const y of Object.keys(res.on[w])) {
  const on = heroOn(w, y), off = heroOff(w, y), tag = `${w}/${y}`;
  if (on.length !== 3) fails.push(`A ${tag} : ${on.length} cadres hero détectés (3 attendus)`);
  if (on.length === 3) {
    if (!(on[0].altitude > on[1].altitude && on[1].altitude > on[2].altitude)) fails.push(`B ${tag} : altitudes non étagées ${on.map((q) => q.altitude)}`);
    if (!on.every((q) => q.pitchDeg > 5)) fails.push(`C ${tag} : inclinaison non significative ${on.map((q) => q.pitchDeg)}`);
    /* D : non coplanarité (distance de chaque coin des autres cartes au plan de la première) et normales distinctes */
    const plane = (q) => ({ n: q.normal, p: q.cornersWorld[0] }), dist = (pl, pt) => Math.abs(pl.n.reduce((s, v, i) => s + v * (pt[i] - pl.p[i]), 0));
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const d = Math.max(...on[j].cornersWorld.map((c) => dist(plane(on[i]), c))); if (d < 5) fails.push(`D ${tag} : cartes ${i + 1} et ${j + 1} coplanaires (écart max ${d.toFixed(2)} px)`); }
    if (new Set(on.map((q) => q.pitchDeg)).size < 3) fails.push(`D ${tag} : inclinaisons identiques`);
    /* E : le contenu HTML partage les quatre coins projetés du contour */
    on.forEach((q) => { if (!q.contentCorners) return; const e = Math.max(...q.cornersProjected.map((c, k) => Math.hypot(c[0] - q.contentCorners[k][0], c[1] - q.contentCorners[k][1]))); if (e > 0.6) fails.push(`E ${tag} carte ${q.index + 1} : coins du contenu et du contour écartés de ${e.toFixed(2)} px`); });
  }
  /* F : autres chapitres identiques (position, rotation, dimensions, projection) */
  const nonOn = res.on[w][y].boxes.filter((q) => !q.hero && !(q.title === '' && q.id == null)), nonOff = res.off[w][y].boxes.filter((q) => !(q.title === '' && q.id == null));
  if (nonOn.length !== nonOff.length) fails.push(`F ${tag} : ${nonOn.length} chapitres en mode normal, ${nonOff.length} avec ?topo=off`);
  nonOn.forEach((q, i) => { const o = nonOff[i]; if (!o) return; for (const k of ['altitude', 'pitchDeg', 'rollDeg', 'base', 'top', 'r0', 'r1', 'x', 'w', 'h']) if (!eq(q[k], o[k], 1e-6)) fails.push(`F ${tag} « ${q.title} » : ${k} ${o[k]} vers ${q[k]}`); if (!eq(q.cornersWorld, o.cornersWorld, 1e-6)) fails.push(`F ${tag} « ${q.title} » : coins 3D modifiés`); if (!eq(q.cornersProjected, o.cornersProjected, 0.05)) fails.push(`F ${tag} « ${q.title} » : projection modifiée`); });
  /* G : ?topo=off : cartes d'origine (inclinaison nulle, altitudes initiales) */
  if (off.length !== 3) fails.push(`G ${tag} : ${off.length} cartes avec ?topo=off`); else if (!off.every((q) => q.pitchDeg < 0.5)) fails.push(`G ${tag} : ?topo=off n'a pas restitué l'inclinaison nulle (${off.map((q) => q.pitchDeg)})`);
}
fs.writeFileSync(path.join(OUT, 'tableau.md'), md.join('\n') + '\n'); console.log(md.join('\n')); console.log(fails.length ? '\nÉCARTS :\n - ' + fails.join('\n - ') : '\nTests A, B, C, D, E, F, G : conformes');
process.exit(fails.length ? 1 : 0);
