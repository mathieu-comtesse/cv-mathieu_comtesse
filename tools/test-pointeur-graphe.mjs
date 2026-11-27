// Effets du pointeur sur le graphe de l'accueil (à plat) : poussée par la vitesse du pointeur, retour élastique, resserrement des rayons du foyer survolé, orbite, relâche, saisie et lancer d'un foyer.
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
await p.mouse.move(5, 5); await p.waitForTimeout(20000);   // rendu logiciel : la physique avance de 0,1 s au plus par image
const repos = Math.max(...(await foyers()).map((f) => Math.hypot(f.dx, f.dy)));
verifie(repos < 1, `retour élastique au repos (${repos.toFixed(2)} px restants)`);
/* pointeur immobile près d'un foyer : aucune poussée */
await p.mouse.move(cible.x + 90, cible.y + 90); await p.waitForTimeout(20000);   // rendu logiciel : quelques images par seconde
const immobile = Math.max(...(await foyers()).map((f) => Math.hypot(f.dx, f.dy)));
verifie(immobile < 1, `pointeur immobile : aucune poussée (${immobile.toFixed(2)} px)`);
/* survol d'un foyer : voisins allumés (6 au plus), autres estompés */
await p.mouse.move(5, 5); await p.waitForTimeout(3000);
const base = (await foyers()).find((f) => f.id === cible.id);
await p.mouse.move(base.x, base.y); for (let k = 0; k < 4; k++) { await p.waitForTimeout(1200); const r = (await foyers()).find((f) => f.id === cible.id); await p.mouse.move(r.x, r.y); } await p.waitForTimeout(3500);
const ser = await p.evaluate((id) => { const c = window.__cvHeroGraph.ciel, moy = (e) => { const r = e.noeuds.filter((n) => !n.par); return r.reduce((s, n) => s + (n.hg || 0), 0) / Math.max(1, r.length); };
  const es = [...c.etoiles.values()].filter((e) => e.parent && e.ecran); return { lui: moy(c.etoiles.get(id)), autres: Math.max(...es.filter((e) => e.id !== id).map(moy)), ob: es.map((e) => e.ob || 0) }; }, cible.id);
verifie(ser.lui > 0.9 && ser.autres < 0.01, `survol d'un foyer : ses rayons se resserrent (prise ${ser.lui.toFixed(2)}), les autres non (${ser.autres.toFixed(3)})`);
verifie(ser.ob.some((o) => o > 0) && ser.ob.some((o) => o < 0), `orbite lente des rayons, un foyer sur deux en sens inverse`);
await p.mouse.move(5, 5); await p.waitForTimeout(15000);
const relache = await p.evaluate((id) => { const e = window.__cvHeroGraph.ciel.etoiles.get(id); return Math.max(...e.noeuds.map((n) => n.hg || 0)); }, cible.id);
verifie(relache < 0.05, `relâche après le survol (${relache.toFixed(3)})`);
/* lueur : les points proches du pointeur (265 px) blanchissent, puis s'éteignent */
const lueur = async () => p.evaluate(() => Math.max(...[...window.__cvHeroGraph.ciel.etoiles.values()].flatMap((e) => e.noeuds.map((n) => n.lu || 0))));
const gl0 = (await foyers()).find((f) => f.id === cible.id); await p.mouse.move(gl0.x + 60, gl0.y + 40); await p.waitForTimeout(2500);
const lu1 = await lueur(); await p.mouse.move(5, 5); await p.waitForTimeout(15000); const lu2 = await lueur();
verifie(lu1 > 0.5 && lu2 < 0.05, `lueur des points près du pointeur (${lu1.toFixed(2)}), éteinte après son départ (${lu2.toFixed(3)})`);
/* saisie et lancer d'un foyer : il suit le pointeur, part dans le sens du geste au lâcher, puis revient à sa place */
await p.waitForTimeout(2000);
const g0 = (await foyers()).find((f) => f.id === cible.id);
await p.mouse.move(g0.x, g0.y); await p.waitForTimeout(2500);
const g1 = (await foyers()).find((f) => f.id === cible.id); await p.mouse.move(g1.x, g1.y); await p.waitForTimeout(1500);
const g2 = (await foyers()).find((f) => f.id === cible.id); await p.mouse.move(g2.x, g2.y); await p.mouse.down();
for (let i = 1; i <= 6; i++) { await p.mouse.move(g2.x + i * 20, g2.y + i * 6); await p.waitForTimeout(120); }
const tenu = await p.evaluate(() => { const c = window.__cvHeroGraph.ciel; return c.prisF ? { id: c.prisF.e.id, dx: c.prisF.e.dx } : null; });
await p.mouse.up(); await p.waitForTimeout(300);
const lance = await p.evaluate((id) => { const e = window.__cvHeroGraph.ciel.etoiles.get(id); return { dx: e.dx, vx: e.vx, url: location.hash }; }, cible.id);
verifie(!!tenu && tenu.id === cible.id && tenu.dx > 60, `saisie : le foyer suit le pointeur (${tenu ? tenu.dx.toFixed(0) : '-'} px)`);
verifie(lance.dx > 60 && !lance.url.includes(cible.id.split(':')[1]), `lâcher après un glisser : pas de navigation, foyer toujours déplacé (${lance.dx.toFixed(0)} px, vitesse ${lance.vx.toFixed(0)} px/s)`);
await p.mouse.move(5, 5); await p.waitForTimeout(25000);
const retour = await p.evaluate((id) => Math.hypot(window.__cvHeroGraph.ciel.etoiles.get(id).dx, window.__cvHeroGraph.ciel.etoiles.get(id).dy), cible.id);
verifie(retour < 2, `retour du foyer lancé à sa place (${retour.toFixed(2)} px)`);
verifie(p.erreurs.length === 0, `aucune erreur de page (${p.erreurs.length})`);
await b.close(); srv.close();
if (echecs.length) { console.log('\nÉCHEC : ' + echecs.length); process.exit(1); } console.log('\nPASS : effets du pointeur sur le graphe de l\'accueil');
