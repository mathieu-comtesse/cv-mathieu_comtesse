// V9.1 : trois cadres de l'accueil, avant / après la correction typographique (légendes 18 px !important supprimées), quatre fenêtres.
//  Mesures : taille CSS et visible des légendes, lignes, débordement du texte hors de sa carte, recouvrement d'une carte sur le texte d'une autre.   node tools/v9-hero-cards.mjs
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/v9/cadres'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
let BEFORE = false; const RULE = '.cv-parity-widget figcaption{font-size:18px!important;line-height:1.35}\n';
const srv = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'), f = path.join(root, decodeURIComponent(u.pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream');
  if (u.pathname === '/index.html' && BEFORE) { const s = fs.readFileSync(f, 'utf8'), k = '.cv-parity-widget figcaption{position:static!important'; if (!s.includes(k)) throw new Error('ancre introuvable'); return r.end(s.replace(k, RULE + k)); } fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }), rows = [];
for (const [w, h] of [[1440, 900], [1920, 1080], [768, 1024], [390, 844]]) for (const before of [true, false]) {
  BEFORE = before; const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }), p = await ctx.newPage(); p.setDefaultTimeout(120000);
  await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__cvParity?.boxes); await p.waitForTimeout(6000); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => scrollTo({ top: 340, behavior: 'instant' })); await p.waitForFunction(() => window.__cvParity.project() && window.__cvParity.boxes().length > 0).catch(() => {}); await p.waitForTimeout(3500);
  const m = await p.evaluate(() => {
    const cards = [0, 1, 2].map((i) => window.__cvParity.heroEl?.(i)).filter(Boolean); const bx = window.__cvParity.boxes().filter((q) => q.hero).sort((a, c) => a.index - c.index);
    return cards.map((el, i) => { const cap = el.querySelector('figcaption'), cs = cap && getComputedStyle(cap), r = cap?.getBoundingClientRect(), q = bx[i]?.cornersProjected, xs = q?.map((c) => c[0]), ys = q?.map((c) => c[1]);
      return { i, size: cs && parseFloat(cs.fontSize), lines: cap && Math.round(cap.scrollHeight / parseFloat(cs.lineHeight)), capRect: r && [r.left, r.top, r.right, r.bottom].map(Math.round), quadBox: q && [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round), overflowY: cap && cap.parentElement ? Math.round(cap.getBoundingClientRect().bottom - (q ? Math.max(...ys) : 0)) : null }; }); });
  /* recouvrement : la boîte du texte d'une carte (r) rencontre le quadrilatère d'une autre carte */
  const ov = []; m.forEach((a, i) => m.forEach((c, j) => { if (i === j || !a.capRect || !c.quadBox) return; const [x0, y0, x1, y1] = a.capRect, [qx0, qy0, qx1, qy1] = c.quadBox; if (x0 < qx1 && x1 > qx0 && y0 < qy1 && y1 > qy0 && (a.quadBox && (y0 > a.quadBox[3] || y1 > a.quadBox[3]))) ov.push(`texte de la carte ${i + 1} dans la carte ${j + 1}`); }));
  rows.push({ w, h, etat: before ? 'avant (18 px)' : 'après (12 px)', cartes: m.length, m, ov });
  await p.screenshot({ path: path.join(OUT, `${before ? 'avant' : 'apres'}-${w}.jpg`), type: 'jpeg', quality: 80, timeout: 120000 }).catch(() => {}); await p.screenshot({ path: path.join(OUT, `${before ? 'avant' : 'apres'}-${w}-cadres.jpg`), type: 'jpeg', quality: 86, clip: { x: 0, y: 150, width: Math.min(w, 520), height: Math.min(h - 150, 560) }, timeout: 120000 }).catch(() => {});
  console.log(w, before ? 'avant' : 'apres', m.map((c) => `${c.size}px/${c.lines}l`).join(' '), ov.join('; ') || 'aucun recouvrement'); await ctx.close();
}
await b.close(); srv.close(); fs.writeFileSync(path.join(OUT, 'mesures.json'), JSON.stringify(rows, null, 1));
