// Capture de l'accueil à une taille donnée (VW, VH), avec le 4e cadre en gros plan (OUT2). Usage : VW=2498 VH=1319 OUT=a.png OUT2=b.png node tools/capture-accueil.mjs
// Effets du pointeur sur le graphe de l'accueil (à plat) : poussée par la vitesse du pointeur, retour élastique, voisins du foyer survolé (anneau, fondu), foyers non survolés estompés.
// Usage : node tools/test-pointeur-graphe.mjs   (code de sortie 1 en cas d'échec)
// Usage : node tools/test-modes.mjs   (code de sortie 1 en cas d'échec). Rendu logiciel : aucune mesure de fluidité matérielle ici.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname)), '..');
let chromium; { try { ({ chromium } = createRequire(root + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); } }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, res) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); } }).listen(0, '127.0.0.1'); await new Promise((r) => srv.listening ? r() : srv.once('listening', r)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const echecs = [], verifie = (ok, texte) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + texte); if (!ok) echecs.push(texte); };
async function page(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: Number(process.env.VW), height: Number(process.env.VH) }, ...opts }), p = await ctx.newPage(); p.setDefaultTimeout(120000); p.erreurs = []; p.shopify = 0;
  await p.route('http://talas.test/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });   // sans socket : un pare-feu peut bloquer la boucle locale
  await p.route(/shopify(cdn)?\.com/, (r) => { p.shopify++; r.abort(); });
  await p.route('https://comtesse.me/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.abort(); });
  p.on('pageerror', (e) => p.erreurs.push(String(e.message).slice(0, 200)));
  await p.goto(`http://talas.test/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(2500);
  return p;
}
const p = await page();
await p.waitForTimeout(9000);
if (process.env.SURVOL) { for (let k = 0; k < 4; k++) { const f = await p.evaluate((id) => { const e = window.__cvHeroGraph.ciel.etoiles.get(id), r = document.querySelector('.cv-hero-graph').getBoundingClientRect(); return { x: e.ecran.x + r.left, y: e.ecran.y + r.top }; }, process.env.SURVOL); await p.mouse.move(f.x, f.y); await p.waitForTimeout(1500); } }
await p.screenshot({ path: process.env.OUT, ...(process.env.ZONE ? { clip: (([x, y, width, height]) => ({ x, y, width, height }))(process.env.ZONE.split(',').map(Number)) } : {}) });
const f = await p.$$('header aside figure'); if (process.env.OUT2) await f[f.length - 1].screenshot({ path: process.env.OUT2 });
console.log(await p.evaluate(() => JSON.stringify(document.querySelector('.checkpoint-stage').dataset)), p.erreurs);
await b.close(); srv.close();
