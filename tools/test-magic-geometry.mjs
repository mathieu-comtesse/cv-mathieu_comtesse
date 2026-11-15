// « Voir la magie » : contrôle géométrique après transformation CSS, onze projets x quatre largeurs.
//   node tools/test-magic-geometry.mjs [slug ...]           (défaut : onze projets)   LARGEURS=390,1440 pour restreindre   SHOTS=dossier pour les captures
// Vérifie, aux états initial, actif, intermédiaire et final :
//  - plan : icônes (échelle de l'étape active comprise), libellés et courbes restent dans le plan (aucun débordement du tracé) ;
//  - liaisons : chaque courbe part et arrive au bord de ses deux icônes ; aucune courbe ne traverse une icône ni un libellé ;
//  - libellés : aucun libellé ne recouvre une icône ni un autre libellé ;
//  - logos : chaque icône est rendue (SVG ou image chargée, taille non nulle), les logos de marque sont en couleur ;
//  - cadrage (après transformation 3D) : vue d'ensemble (initial, final) entièrement dans la fenêtre ; pendant le suivi, l'icône active est entièrement visible,
//    et sur mobile le plan ne sort jamais à gauche ou à droite.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUGS = process.argv.slice(2).length ? process.argv.slice(2) : ['moteur44', 'studio', 'gares', 'cerfa', 'finance', 'vmvre', 'pa', 'powerbi', 'vre', 'suivi', 'lecteur-vre'];
const WIDTHS = (process.env.LARGEURS || '390,768,1440,1920').split(',').map(Number), SHOTS = process.env.SHOTS;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const fail = []; let nOk = 0;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
for (const slug of SLUGS) for (const w of WIDTHS) {
  const h = w < 700 ? 844 : w < 1000 ? 1024 : 900, tag = `${slug} ${w}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
  try {
    await p.goto(`http://localhost:${srv.address().port}/projet-${slug}.html?uxtest`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__rfFlowReady && window.__rfFlowTest);
    await p.click('.rf-cta[data-demo="magic"]', { force: true }); await p.waitForSelector('.fl-ov.is-open'); await p.waitForTimeout(1700);
    const run = await p.evaluate(() => window.__rfFlowTest.run());
    /* 1. géométrie dans le repère du plan (indépendante de la transformation) */
    const plane = await p.evaluate(() => {
      const pl = document.querySelector('.fl3'), W = parseFloat(pl.style.width), H = parseFloat(pl.style.height), box = (e) => ({ x: parseFloat(e.style.left), y: parseFloat(e.style.top), w: e.offsetWidth, h: e.offsetHeight });
      const tiles = [...pl.querySelectorAll('.k3')].map(box), labels = [...pl.querySelectorAll('.t3')].map(box);
      const paths = [...pl.querySelectorAll('.l3-b')].map((e) => { const n = e.getTotalLength(), pts = []; for (let k = 0; k <= 60; k++) { const q = e.getPointAtLength(n * k / 60); pts.push([q.x, q.y]); } return pts; });
      return { W, H, tiles, labels, paths };
    });
    const { W, H, tiles, labels, paths } = plane, BOX = tiles[0].w, grow = BOX * .12;
    const inside = (x, y, r, m = 0) => x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;
    tiles.forEach((t, i) => { if (t.x - grow < 0 || t.y - grow < 0 || t.x + t.w + grow > W || t.y + t.h + grow > H) fail.push(`${tag} : icône ${i + 1} hors du plan`); });
    labels.forEach((l, i) => { if (l.x < 0 || l.y < 0 || l.x + l.w > W || l.y + l.h > H) fail.push(`${tag} : libellé ${i + 1} hors du plan`); });
    paths.forEach((pts, i) => {
      if (pts.some(([x, y]) => x < 0 || y < 0 || x > W || y > H)) fail.push(`${tag} : courbe ${i + 1} sort du plan`);
      const a = tiles[i], c = tiles[i + 1], ca = [a.x + a.w / 2, a.y + a.h / 2], cc = [c.x + c.w / 2, c.y + c.h / 2], hh = BOX / 2, cheb = (q, o) => Math.max(Math.abs(q[0] - o[0]), Math.abs(q[1] - o[1]));
      const d0 = cheb(pts[0], ca), d1 = cheb(pts[pts.length - 1], cc);
      if (d0 < hh - 1 || d0 > hh + 14 || d1 < hh - 1 || d1 > hh + 14) fail.push(`${tag} : courbe ${i + 1} non raccordée aux bords des icônes (${d0.toFixed(0)} / ${d1.toFixed(0)} px du centre, bord à ${hh})`);
      tiles.forEach((t, j) => { if (pts.some(([x, y]) => inside(x, y, t, -2) && !(j === i && cheb([x, y], ca) < hh + 14) && !(j === i + 1 && cheb([x, y], cc) < hh + 14))) fail.push(`${tag} : courbe ${i + 1} traverse l'icône ${j + 1}`); });
      labels.forEach((l, j) => { if (pts.some(([x, y]) => inside(x, y, l, 1))) fail.push(`${tag} : courbe ${i + 1} traverse le libellé ${j + 1}`); });
    });
    labels.forEach((l, i) => {
      tiles.forEach((t, j) => { const g = j === i ? 0 : 0; if (l.x < t.x + t.w + g && l.x + l.w > t.x - g && l.y < t.y + t.h + g && l.y + l.h > t.y - g) fail.push(`${tag} : le libellé ${i + 1} recouvre l'icône ${j + 1}`); });
      labels.forEach((m, j) => { if (j > i && l.x < m.x + m.w && l.x + l.w > m.x && l.y < m.y + m.h && l.y + l.h > m.y) fail.push(`${tag} : les libellés ${i + 1} et ${j + 1} se recouvrent`); });
    });
    /* 2. états : logos et cadrage après transformation */
    for (const [name, f] of [['initial', .02], ['actif', .3], ['intermediaire', .6], ['final', 1.02]]) {
      await p.evaluate((t) => window.__rfFlowTest.seek(t, true), run * f); await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, rect = (e) => e.getBoundingClientRect();
        const tiles = [...document.querySelectorAll('.fl3 .k3')].map((e) => { const q = rect(e), i = e.querySelector('img,svg'), iq = i && rect(i); return { k: e.dataset.k, cur: e.classList.contains('cur'), l: q.left, t: q.top, r: q.right, b: q.bottom, icon: !!i && iq.width > 4 && iq.height > 4, img: i?.tagName !== 'IMG' || (i.complete && i.naturalWidth > 0), brand: i?.classList.contains('fl-brand') || false, op: +getComputedStyle(e).opacity, shown: e.classList.contains('in') || e.classList.contains('cur') || e.classList.contains('done') }; });
        const pathsB = [...document.querySelectorAll('.l3-b')].map((e) => { const q = rect(e); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; });
        return { vw, vh, tiles, pathsB };
      });
      const ov = name === 'initial' || name === 'final', EPS = 2;
      r.tiles.forEach((t, i) => {
        if (t.shown && !t.icon) fail.push(`${tag} ${name} : icône ${i + 1} (${t.k}) sans glyphe visible`);
        if (t.shown && !t.img) fail.push(`${tag} ${name} : image de l'icône ${i + 1} (${t.k}) non chargée`);
        if (['sharepoint', 'excel', 'automate', 'powerbi', 'outlook'].includes(t.k) && t.shown && !t.brand) fail.push(`${tag} ${name} : logo ${t.k} sans habillage de marque`);
        if (t.shown && t.op < .5) fail.push(`${tag} ${name} : icône ${i + 1} trop peu visible (opacité ${t.op.toFixed(2)})`);
        const outX = t.l < -EPS || t.r > r.vw + EPS, outY = t.t < -EPS || t.b > r.vh + EPS, mob = w < 700;
        if (t.shown && ((ov || !mob) ? (outX || outY) : (outX || (t.cur && outY)))) fail.push(`${tag} ${name} : icône ${i + 1} (${t.k}) hors de la fenêtre`);
      });
      if (ov || w >= 700) r.pathsB.forEach((q, i) => { if (q.l < -EPS || q.r > r.vw + EPS || q.t < -EPS || q.b > r.vh + EPS) fail.push(`${tag} ${name} : courbe ${i + 1} hors de la fenêtre`); });
      else if (w < 700) r.pathsB.forEach((q, i) => { if (q.l < -EPS || q.r > r.vw + EPS) fail.push(`${tag} ${name} : courbe ${i + 1} sort latéralement de la fenêtre`); });
      if (SHOTS && ((['pa', 'lecteur-vre'].includes(slug)) || (name === 'intermediaire' && (w === 1440 || w === 390)))) await p.screenshot({ path: path.join(SHOTS, `${slug}-${w}-${name}.jpg`), type: 'jpeg', quality: 78 });
    }
    nOk++; console.log('ok    ', tag);
  } catch (e) { fail.push(`${tag} : ${String(e.message).split('\n')[0]}`); console.log('ECHEC ', tag, String(e.message).split('\n')[0]); }
  await ctx.close();
}
await b.close(); srv.close();
const uniq = [...new Set(fail)]; if (uniq.length) { console.log('\n' + uniq.length + ' défaut(s) :'); uniq.slice(0, 80).forEach((f) => console.log(' - ' + f)); process.exit(1); }
console.log('\nGéométrie de « Voir la magie » conforme : ' + nOk + ' combinaisons projet x largeur.');
