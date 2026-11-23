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
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts }), p = await ctx.newPage(); p.setDefaultTimeout(120000); p.erreurs = []; p.shopify = 0;
  await p.route('http://talas.test/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });   // sans socket : un pare-feu peut bloquer la boucle locale
  await p.route(/shopify(cdn)?\.com/, (r) => { p.shopify++; r.abort(); });
  await p.route('https://comtesse.me/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.abort(); });
  p.on('pageerror', (e) => p.erreurs.push(String(e.message).slice(0, 200)));
  await p.goto(`http://talas.test/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(2500);
  return p;
}
const p = await page();
const foyers = () => p.evaluate(() => { const r = document.querySelector('.cv-hero-graph').getBoundingClientRect(); return [...window.__cvHeroGraph.ciel.etoiles.values()].filter((e) => e.parent && e.ecran).map((e) => ({ id: e.id, x: e.ecran.x + r.left, y: e.ecran.y + r.top, dx: e.dx || 0, dy: e.dy || 0, rel: e.rel || 0, hv: e.hv || 0 })); });
await p.waitForTimeout(2500);
const f0 = (await foyers()).sort((a, b) => a.x - b.x)[3];
/* balayage rapide du pointeur au travers d'un foyer, sans s'arrêter dessus */
const cible = f0; const traverse = [];
for (let i = 0; i <= 12; i++) { await p.mouse.move(cible.x - 140 + i * 22, cible.y + 60); traverse.push((await foyers()).map((f) => Math.hypot(f.dx, f.dy))); }
const maxPoussee = Math.max(...traverse.flat());
verifie(maxPoussee > 4, `la vitesse du pointeur pousse les foyers proches (déplacement maximal ${maxPoussee.toFixed(1)} px)`);
await p.mouse.move(5, 5); await p.waitForTimeout(4000);
const repos = Math.max(...(await foyers()).map((f) => Math.hypot(f.dx, f.dy)));
verifie(repos < 1, `retour élastique au repos (${repos.toFixed(2)} px restants)`);
/* pointeur immobile près d'un foyer : aucune poussée */
await p.mouse.move(cible.x + 90, cible.y + 90); await p.waitForTimeout(5000);
const immobile = Math.max(...(await foyers()).map((f) => Math.hypot(f.dx, f.dy)));
verifie(immobile < 1, `pointeur immobile : aucune poussée (${immobile.toFixed(2)} px)`);
/* survol d'un foyer : voisins allumés (6 au plus), autres estompés */
await p.mouse.move(5, 5); await p.waitForTimeout(3000);
const base = (await foyers()).find((f) => f.id === cible.id);
await p.mouse.move(base.x, base.y); for (let k = 0; k < 4; k++) { await p.waitForTimeout(1200); const r = (await foyers()).find((f) => f.id === cible.id); await p.mouse.move(r.x, r.y); } await p.waitForTimeout(3500);
const sv = await foyers(), racine = await p.evaluate(() => window.__cvHeroGraph.ciel.etoiles.get('accueil').rel), autres = sv.filter((f) => f.id !== cible.id && f.hv < 0.05).length;
verifie(sv.find((f) => f.id === cible.id).hv > 0.5 && racine > 0.5, `survol : foyer actif, foyer central voisin allumé (${racine.toFixed(2)}), ${autres} autres foyers estompés`);
verifie(p.erreurs.length === 0, `aucune erreur de page (${p.erreurs.length})`);
await b.close(); srv.close();
if (echecs.length) { console.log('\nÉCHEC : ' + echecs.length); process.exit(1); } console.log('\nPASS : effets du pointeur sur le graphe de l\'accueil');
