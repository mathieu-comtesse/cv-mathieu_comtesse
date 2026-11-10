// Topographie des trois cartes de l'accueil (p.slab && p.hero) : mesures, tests A à H, tableau, vue latérale diagnostique.   node tools/topo-home.mjs
// Aucune vérification n'est ignorée en silence : une donnée absente est un échec explicite.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/cadres-3d/topo-home'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const SCROLLS = [0, 340, 700, 1500, 3000, 4500, 6000, 7500], res = { on: {}, off: {}, H: {} };
const snap = (p) => p.evaluate(() => ({ view: (({ T, offset, pitch, fov, rise }) => ({ T, offset, pitch, fov, rise }))(window.__cvParity.project()), boxes: window.__cvParity.boxes() }));
for (const [mode, qs] of [['off', '&topo=off'], ['on', '']]) for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }); await ctx.route('https://comtesse.me/assets/showcase/**', (route) => { const f = path.join(root, new URL(route.request().url()).pathname); fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: T[path.extname(f)] }) : route.fulfill({ status: 404, body: '' }); });
  const p = await ctx.newPage(); await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest${qs}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__cvParity?.boxes, null, { timeout: 120000 }); await p.waitForTimeout(8000); await p.evaluate(() => scrollTo({ top: 340, behavior: 'instant' }));   // la boucle de rendu ne démarre qu'après un premier défilement
  await p.waitForFunction(() => window.__cvParity.project() && window.__cvParity.boxes().length > 0, null, { timeout: 120000 }); await p.waitForTimeout(3000);
  for (const y of (w > 700 ? SCROLLS : [340, 1500])) {
    await p.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await p.waitForTimeout(2200);
    (res[mode][w] ||= {})[y] = await snap(p);
    if (y === 340) await p.screenshot({ path: path.join(OUT, `${mode}-${w}-340.jpg`), type: 'jpeg', quality: 80 });
    if (w > 700 && y === 700) await p.screenshot({ path: path.join(OUT, `${mode}-${w}-700.jpg`), type: 'jpeg', quality: 80 });
  }
  /* H : sélection et interactions aux nouveaux angles (mode normal, 1440 uniquement) */
  if (mode === 'on' && w > 700) {
    await p.evaluate(() => scrollTo({ top: 340, behavior: 'instant' })); await p.waitForTimeout(2200);
    const H = res.H;
    H.hit = await p.evaluate(() => [0, 1, 2].map((i) => { const bx = window.__cvParity.boxes().filter((q) => q.hero).sort((a, c) => a.index - c.index)[i], pts = bx?.cornersProjected; if (!pts) return { i, err: 'coins projetés absents' }; const cx = pts.reduce((s, q) => s + q[0], 0) / 4, cy = pts.reduce((s, q) => s + q[1], 0) / 4, el = document.elementFromPoint(cx, cy), own = window.__cvParity.heroEl(i); return { i, cx, cy, inside: cx > 0 && cx < innerWidth && cy > 0 && cy < innerHeight, hit: !!el, own: !!own && !!el && (own.contains(el) || el.contains(own) || own === el), tag: el ? el.tagName + '.' + String(el.className).slice(0, 30) : null }; }));
    H.raise = [];
    for (let i = 0; i < 3; i++) {
      const ok = await p.evaluate((k) => window.__cvParity.raiseHero(k), i); await p.waitForTimeout(1800);
      const d = await snap(p), q = d.boxes.filter((x) => x.hero).sort((a, c) => a.index - c.index)[i];
      H.raise.push({ i, ok, raiseTilt: q?.raiseTilt, pitchDeg: q?.pitchDeg, rise: d.view.rise, tilted: q?.tilted, thickPx: q?.thickPx, contentCorners: q?.contentCorners, cornersProjected: q?.cornersProjected });
      await p.keyboard.press('Escape'); await p.evaluate(() => scrollTo({ top: 340, behavior: 'instant' })); await p.waitForTimeout(1500);
    }
    await p.screenshot({ path: path.join(OUT, 'on-1440-340-apres-interactions.jpg'), type: 'jpeg', quality: 80 });
  }
  await ctx.close();
}
await b.close(); srv.close(); fs.writeFileSync(path.join(OUT, 'mesures.json'), JSON.stringify(res, null, 1));
/* ---- analyses ---- */
const fails = [], ok = {}, mark = (k, msg) => { fails.push(`${k} ${msg}`); ok[k] = false; }; 'ABCDEFGH'.split('').forEach((k) => (ok[k] = true));
const eq = (a, c, tol) => (typeof a === 'number' && typeof c === 'number') ? Math.abs(a - c) <= tol : (Array.isArray(a) && Array.isArray(c) && a.length === c.length && a.every((v, i) => eq(v, c[i], tol))) || (a === c);
const isHeroOff = (q) => q.title === '' && q.id == null;                     // en mode ?topo=off le drapeau hero est faux : on retrouve les trois cartes sans titre ni identifiant
const heroOn = (w, y) => res.on[w][y].boxes.filter((q) => q.hero).sort((a, c) => a.index - c.index);
const heroOff = (w, y) => res.off[w][y].boxes.filter(isHeroOff).sort((a, c) => a.y - c.y);
const idOf = (q) => (q.id != null ? 'id:' + q.id : q.title ? 'titre:' + q.title : null);   // identifiant stable d'un chapitre
const finite = (a) => Array.isArray(a) && a.every((v) => (Array.isArray(v) ? finite(v) : Number.isFinite(v)));
const md = ['| vue | carte | altitude (px) | tangage (°) | roulis (°) | épaisseur (px) | épaisseur écran (px) | coins projetés |', '|---|---|---|---|---|---|---|---|'];
for (const w of [1440, 390]) for (const y of Object.keys(res.on[w])) {
  const on = heroOn(w, y), off = heroOff(w, y), tag = `${w}/${y}`;
  if (+y === 340 || +y === 700 || +y === 1500) { off.forEach((q, i) => md.push(`| ${tag} topo=off | ${i + 1} | ${q.altitude} | ${q.pitchDeg} | ${q.rollDeg} | ${q.thick} | ${q.thickPx} | ${JSON.stringify(q.cornersProjected)} |`)); on.forEach((q) => md.push(`| ${tag} normal | ${q.index + 1} | ${q.altitude} | ${q.pitchDeg} | ${q.rollDeg} | ${q.thick} | ${q.thickPx} | ${JSON.stringify(q.cornersProjected)} |`)); }
  if (on.length !== 3) mark('A', `${tag} : ${on.length} cadres hero détectés (3 attendus)`);
  else {
    if (!(on[0].altitude > on[1].altitude && on[1].altitude > on[2].altitude)) mark('B', `${tag} : altitudes non étagées ${on.map((q) => q.altitude)}`);
    if (!on.every((q) => q.pitchDeg > 5)) mark('C', `${tag} : inclinaison non significative ${on.map((q) => q.pitchDeg)}`);
    /* épaisseur : slab.depth - base = 20 px dans le repère du monde, et visible à l'écran (> 2 px) ; angle après combinaison raise.tiltOf() x view.rise */
    on.forEach((q) => { if (Math.abs(q.thick - 20) > 1e-6) mark('C', `${tag} carte ${q.index + 1} : épaisseur ${q.thick} px (20 attendus)`); if (!(q.thickPx > 2)) mark('C', `${tag} carte ${q.index + 1} : épaisseur à l'écran ${q.thickPx} px (non visible)`); if (!Number.isFinite(q.rise)) mark('C', `${tag} carte ${q.index + 1} : view.rise absent`); else { const exp = Math.max(q.raiseTilt, 0) ; if (q.tilted + 1e-9 < exp) mark('C', `${tag} carte ${q.index + 1} : tilted ${q.tilted} < raise.tiltOf ${q.raiseTilt}`); if (!(q.pitchDeg >= 5 && q.pitchDeg <= 60)) mark('C', `${tag} carte ${q.index + 1} : tangage final ${q.pitchDeg}° hors de 5 à 60° (view.rise ${q.rise})`); } });
    const plane = (q) => ({ n: q.normal, p: q.cornersWorld[0] }), dist = (pl, pt) => Math.abs(pl.n.reduce((s, v, i) => s + v * (pt[i] - pl.p[i]), 0));
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const d = Math.max(...on[j].cornersWorld.map((c) => dist(plane(on[i]), c))); if (d < 5) mark('D', `${tag} : cartes ${i + 1} et ${j + 1} coplanaires (écart max ${d.toFixed(2)} px)`); }
    if (new Set(on.map((q) => q.pitchDeg)).size < 3) mark('D', `${tag} : inclinaisons identiques`);
    /* E : aucune vérification ignorée : absence de contentCorners, d'homographie valide ou de quatre coins projetés = échec */
    on.forEach((q) => {
      const t = `${tag} carte ${q.index + 1}`;
      if (!q.cornersProjected || q.cornersProjected.length !== 4 || !finite(q.cornersProjected)) return mark('E', `${t} : quatre coins projetés absents ou invalides`);
      if (!q.contentCorners || q.contentCorners.length !== 4 || !finite(q.contentCorners)) return mark('E', `${t} : contentCorners absent ou matrice d'homographie invalide`);
      const e = Math.max(...q.cornersProjected.map((c, k) => Math.hypot(c[0] - q.contentCorners[k][0], c[1] - q.contentCorners[k][1]))); if (!(e <= 0.6)) mark('E', `${t} : coins du contenu et du contour écartés de ${e.toFixed(2)} px`);
    });
  }
  /* F : les autres chapitres, associés par identifiant stable (jamais par position) */
  const nonOn = res.on[w][y].boxes.filter((q) => !q.hero && !isHeroOff(q)), nonOff = res.off[w][y].boxes.filter((q) => !isHeroOff(q));
  const mapOff = new Map(), dup = new Set(); nonOff.forEach((q) => { const k = idOf(q); if (!k) return mark('F', `${tag} : chapitre sans identifiant stable (y=${q.y})`); if (mapOff.has(k)) dup.add(k); mapOff.set(k, q); });
  dup.forEach((k) => mark('F', `${tag} : identifiant ${k} en double, association impossible`));
  if (nonOn.length !== nonOff.length) mark('F', `${tag} : ${nonOn.length} chapitres en mode normal, ${nonOff.length} avec ?topo=off`);
  nonOn.forEach((q) => { const k = idOf(q); if (!k) return mark('F', `${tag} : chapitre sans identifiant stable (y=${q.y})`); const o = mapOff.get(k); if (!o) return mark('F', `${tag} « ${k} » absent avec ?topo=off`);
    for (const kk of ['altitude', 'pitchDeg', 'rollDeg', 'base', 'top', 'r0', 'r1', 'x', 'w', 'h', 'y', 'tilted']) if (!eq(q[kk], o[kk], 1e-6)) mark('F', `${tag} « ${k} » : ${kk} ${o[kk]} vers ${q[kk]}`);
    if (!eq(q.cornersWorld, o.cornersWorld, 1e-6)) mark('F', `${tag} « ${k} » : coins 3D modifiés`); if (!eq(q.cornersProjected, o.cornersProjected, 0.05)) mark('F', `${tag} « ${k} » : projection modifiée`); });
  /* G : ?topo=off restitue l'original : altitudes, rotations, coordonnées 3D, quatre coins projetés (référence : cartes à plat, tilt 0, top de base) */
  if (off.length !== 3) mark('G', `${tag} : ${off.length} cartes avec ?topo=off`);
  else off.forEach((q, i) => {
    const t = `${tag} carte ${i + 1}`;
    if (q.hero) mark('G', `${t} : drapeau hero actif malgré ?topo=off`);
    if (!(q.pitchDeg < 0.5 && Math.abs(q.rollDeg) < 0.5)) mark('G', `${t} : rotation non nulle (tangage ${q.pitchDeg}, roulis ${q.rollDeg})`);
    if (q.base !== 0) mark('G', `${t} : base ${q.base} (0 attendu)`);
    if (!(q.cornersWorld.every((c) => Math.abs(c[2] - q.top) < 1e-6))) mark('G', `${t} : coins 3D non plats à top=${q.top}`);
    if (!q.cornersProjected || q.cornersProjected.length !== 4 || !finite(q.cornersProjected)) mark('G', `${t} : coins projetés absents`);
  });
}
/* G (suite) : l'original est la géométrie d'avant la modification (mesures de référence figées lors de la première exécution de ce banc, comparées si elles existent) */
const REF = path.join(OUT, 'reference-origine.json'), refNow = { 1440: {} }; for (const y of Object.keys(res.off[1440])) refNow[1440][y] = heroOff(1440, y).map((q) => ({ altitude: q.altitude, pitchDeg: q.pitchDeg, rollDeg: q.rollDeg, cornersWorld: q.cornersWorld, cornersProjected: q.cornersProjected }));
if (!fs.existsSync(REF)) { fs.writeFileSync(REF, JSON.stringify(refNow, null, 1)); console.log('référence ?topo=off enregistrée (première exécution)'); }
else { const ref = JSON.parse(fs.readFileSync(REF)); for (const y of Object.keys(refNow[1440])) refNow[1440][y].forEach((q, i) => { const r = ref[1440]?.[y]?.[i]; if (!r) return mark('G', `1440/${y} carte ${i + 1} : référence absente`); for (const k of ['altitude', 'pitchDeg', 'rollDeg']) if (!eq(q[k], r[k], 1e-6)) mark('G', `1440/${y} carte ${i + 1} : ${k} ${r[k]} vers ${q[k]}`); if (!eq(q.cornersWorld, r.cornersWorld, 1e-6)) mark('G', `1440/${y} carte ${i + 1} : coordonnées 3D différentes de la référence`); if (!eq(q.cornersProjected, r.cornersProjected, 0.05)) mark('G', `1440/${y} carte ${i + 1} : coins projetés différents de la référence`); }); }
/* H : sélection et interactions */
const H = res.H;
if (!H.hit || H.hit.length !== 3) mark('H', 'test de sélection non exécuté');
else { H.hit.forEach((r) => { if (r.err) mark('H', `carte ${r.i + 1} : ${r.err}`); else { if (!r.inside) mark('H', `carte ${r.i + 1} : centre hors fenêtre (${r.cx.toFixed(0)}, ${r.cy.toFixed(0)})`); if (!r.hit) mark('H', `carte ${r.i + 1} : aucun élément au centre`); else if (!r.own) mark('H', `carte ${r.i + 1} : l'élément touché au centre (${r.tag}) n'est pas la carte`); } });
  (H.raise || []).forEach((r) => { if (!r.ok) return mark('H', `carte ${r.i + 1} : levée impossible`); if (!(r.raiseTilt > 0.05)) mark('H', `carte ${r.i + 1} : raise.tiltOf ${r.raiseTilt} (levée sans effet)`); if (!(r.pitchDeg > 0 && r.pitchDeg <= 90.5)) mark('H', `carte ${r.i + 1} : tangage ${r.pitchDeg}° invalide après levée`); if (!r.contentCorners || !r.cornersProjected) return mark('H', `carte ${r.i + 1} : coins absents après levée`); const e = Math.max(...r.cornersProjected.map((c, k) => Math.hypot(c[0] - r.contentCorners[k][0], c[1] - r.contentCorners[k][1]))); if (!(e <= 0.6)) mark('H', `carte ${r.i + 1} : contenu et contour écartés de ${e.toFixed(2)} px après levée`); });
  if ((H.raise || []).length !== 3) mark('H', 'levée des trois cartes non exécutée'); }
/* vue latérale diagnostique (annotations uniquement ici) : plan (y = ligne de la page, z = altitude) pour le défilement 340 */
for (const [mode, name] of [['on', 'normal'], ['off', 'topo-off']]) {
  const q3 = (mode === 'on' ? heroOn(1440, 340) : heroOff(1440, 340)); if (q3.length !== 3) continue;
  const pts = q3.flatMap((q) => q.cornersWorld), ys = pts.map((c) => c[1]), zs = pts.map((c) => c[2]), y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 40, z1 = Math.max(...zs, 60) + 30, S = 2.2, W = (y1 - y0) * S + 120, Hh = z1 * S + 90, X = (y) => 60 + (y - y0) * S, Y = (z) => Hh - 40 - z * S;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" font-family="sans-serif" font-size="11"><rect width="100%" height="100%" fill="#0b1220"/><line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="#5b6b8a" stroke-width="2"/><text x="8" y="${Y(0) + 14}" fill="#9fb0d0">plateau (z = 0)</text>`;
  q3.forEach((q, i) => { const c = q.cornersWorld, lo = c.map((p) => p[2] - (mode === 'on' ? q.thick : 0)), col = ['#7cc4ff', '#9be29b', '#ffd27c'][i], poly = c.map((p) => `${X(p[1])},${Y(p[2])}`).join(' ');
    svg += `<polygon points="${poly}" fill="none" stroke="${col}" stroke-width="3"/>`; const top = c.reduce((a, p) => (p[2] > a[2] ? p : a)), bot = c.reduce((a, p) => (p[2] < a[2] ? p : a)); svg += `<line x1="${X(top[1])}" y1="${Y(top[2]) }" x2="${X(top[1])}" y2="${Y(top[2] - (mode === 'on' ? q.thick : 0))}" stroke="${col}" stroke-width="2" stroke-dasharray="3 2"/>`;
    svg += `<text x="${X(bot[1]) }" y="${Y(top[2]) - 8}" fill="${col}">carte ${i + 1} · alt ${q.altitude} · ${q.pitchDeg}° · ép ${q.thick}</text>`; });
  svg += `<text x="8" y="16" fill="#cfe0ff">Vue latérale (${name}) · proche de la caméra à droite</text></svg>`; fs.writeFileSync(path.join(OUT, `vue-laterale-${name}.svg`), svg); }
fs.writeFileSync(path.join(OUT, 'tableau.md'), md.join('\n') + '\n'); console.log(md.join('\n')); console.log('\nVerdicts : ' + 'ABCDEFGH'.split('').map((k) => `${k} ${ok[k] ? 'OK' : 'ÉCHEC'}`).join(' · ')); console.log(fails.length ? '\nÉCARTS :\n - ' + [...new Set(fails)].slice(0, 60).join('\n - ') : '\nTests A à H conformes');
process.exit(fails.length ? 1 : 0);
