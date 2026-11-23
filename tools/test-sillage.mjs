// Sillage de glyphes sous le graphe de l'accueil (WebGL2) : montage, teinte déposée par le pointeur, effacement, aucune erreur. Usage : node tools/test-sillage.mjs [capture.png]
// Usage : node tools/test-modes.mjs   (code de sortie 1 en cas d'échec). Rendu logiciel : aucune mesure de fluidité matérielle ici.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname)), '..');
let chromium; { try { ({ chromium } = createRequire(root + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); } }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, res) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); } }).listen(0, '127.0.0.1'); await new Promise((r) => srv.listening ? r() : srv.once('listening', r)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const echecs = [], verifie = (ok, texte) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + texte); if (!ok) echecs.push(texte); };
async function page(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts }), p = await ctx.newPage(); p.setDefaultTimeout(120000); p.erreurs = []; p.shopify = 0;
  await p.route('http://talas.test/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });   // sans socket : un pare-feu peut bloquer la boucle locale
  await p.route(/shopify(cdn)?\.com/, (r) => { p.shopify++; r.abort(); });
  await p.route('https://comtesse.me/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.abort(); });
  p.on('pageerror', (e) => p.erreurs.push(String(e.message).slice(0, 200)));
  await p.goto(`http://talas.test/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(2500);
  return p;
}
const p = await page();
await p.waitForTimeout(3000);
const monte = await p.evaluate(() => { const s = window.__cvHeroGraph.sillage(); return s ? s.etat() : null; });
verifie(!!monte && monte.cx > 50 && monte.cy > 50, `sillage monté sur la carte graphique (grille ${monte && monte.cx} × ${monte && monte.cy} cellules de 4 × 6 px)`);
const r = await p.evaluate(() => { const q = document.querySelector('.cv-sillage-zone').getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; });
const avant = await p.evaluate(() => window.__cvHeroGraph.sillage().lit());
let apres = { teinte: 0, max: 0 };   // rendu logiciel lent : la teinte est relevée pendant le geste, son maximum retenu
for (let i = 0; i <= 30; i++) { await p.mouse.move(r.x + r.w * (0.15 + i * 0.022), r.y + r.h * (0.5 + 0.25 * Math.sin(i / 4))); await p.waitForTimeout(40);
  if (i % 3 === 2) { const l = await p.evaluate(() => window.__cvHeroGraph.sillage().lit()); if (l.max > apres.max) apres = l; } }
verifie(apres.teinte > avant.teinte + 1 && apres.max > 0.025, `le pointeur dépose de la teinte (${avant.teinte.toFixed(2)} -> ${apres.teinte.toFixed(2)}, maximum ${apres.max.toFixed(3)}, ${apres.glyphes} cellules à glyphe)`);
if (process.argv[3]) { await p.evaluate(() => window.__cvHeroGraph.sillage().regle({ opacite: 1, intensite: 1, air: 0.3, mesure: true })); for (let i = 0; i <= 20; i++) { await p.mouse.move(r.x + r.w * (0.2 + i * 0.03), r.y + r.h * 0.45); await p.waitForTimeout(30); } await p.waitForTimeout(800); console.log(await p.evaluate(() => { const z = document.querySelector('.cv-sillage-zone'), c = z.querySelector('canvas'), r = c.getBoundingClientRect(), e = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).slice(0, 5).map((x) => x.tagName + '.' + String(x.className).slice(0, 30)); return JSON.stringify({ pixels: z.dataset.pixels, w: c.width, h: c.height, cw: r.width, e, z: getComputedStyle(z).zIndex }); })); await p.evaluate(() => { document.querySelector('.cv-hero-graph').style.opacity = '0'; }); await p.screenshot({ path: process.argv[3], clip: { x: r.x + r.w * 0.2, y: r.y + r.h * 0.3, width: 500, height: 260 } }); await p.evaluate(() => { window.__cvHeroGraph.sillage().regle({ opacite: 0.4, intensite: 0.4, air: 0.95 }); document.querySelector('.cv-hero-graph').style.opacity = ''; }); }
if (process.argv[2]) await p.screenshot({ path: process.argv[2], clip: { x: r.x, y: r.y, width: Math.min(900, r.w), height: Math.min(700, r.h) } });
await p.mouse.move(5, 5); await p.waitForTimeout(9000);
const fin = await p.evaluate(() => window.__cvHeroGraph.sillage().lit());
verifie(fin.max < 0.025, `la teinte s'efface sous le seuil du premier glyphe (maximum ${fin.max.toFixed(4)}, seuil 0,025)`);
verifie(p.erreurs.length === 0, `aucune erreur de page (${p.erreurs.length})`);
await b.close(); srv.close();
if (echecs.length) { console.log('\nÉCHEC : ' + echecs.length); process.exit(1); } console.log('\nPASS : sillage de glyphes');
