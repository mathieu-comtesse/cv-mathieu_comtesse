// Graphe des chapitres : caméra calée sur l'étoile du chapitre, trajet entre chapitres (repli, glissement, dépli, contexte). Usage : node tools/test-graphe-chapitres.mjs [dossier-captures]
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
import('node:fs');
const dossier = process.argv[2];
const va = async (y) => { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(2500); return p.evaluate(() => window.__cvGrapheChapitres.etat()); };
const bornes = await p.evaluate(() => { const S = ['agentic', 'sidekick', 'online'].map((id) => { const q = document.getElementById(id).getBoundingClientRect(); return { top: q.top + scrollY, bas: q.bottom + scrollY }; });
  const j = window.__cvGrapheChapitres.trajet(0, S[0].bas, S[1].top, innerHeight); return { S, debut: j.debut, fin: j.fin, H: innerHeight }; });
const mesures = [];
for (const [nom, y] of [['chapitre-1', bornes.S[0].top + bornes.H * 0.3], ['trajet-15', bornes.debut + (bornes.fin - bornes.debut) * 0.15], ['trajet-50', bornes.debut + (bornes.fin - bornes.debut) * 0.5], ['trajet-85', bornes.debut + (bornes.fin - bornes.debut) * 0.85], ['chapitre-2', bornes.fin + 20]]) {
  const e = await va(y); mesures.push([nom, e]); console.log(nom, JSON.stringify(e)); if (dossier) await p.screenshot({ path: `${dossier}/gc-${nom}.png` }); }
const m = Object.fromEntries(mesures);
verifie(m['chapitre-1'].de === 'accueil:agentic' && !m['chapitre-1'].vers && Math.abs(m['chapitre-1'].foyer[0] - 1440 * 0.22) < 3 && Math.abs(m['chapitre-1'].foyer[1] - 450) < 3, `dans le chapitre 1 : son étoile à 22 % de la largeur, mi-hauteur (${m['chapitre-1'].foyer})`);
verifie(m['trajet-15'].vers === 'accueil:sidekick' && m['trajet-15'].deploieDe < 0.6 && m['trajet-15'].pan < 0.1, `début du trajet : rayons du chapitre 1 repliés (${m['trajet-15'].deploieDe}), caméra encore sur lui (${m['trajet-15'].pan})`);
verifie(m['trajet-50'].context > 0.9 && m['trajet-50'].pan > 0.4 && m['trajet-50'].pan < 0.6, `milieu du trajet : les autres étoiles reviennent (${m['trajet-50'].context}), caméra à mi-chemin (${m['trajet-50'].pan})`);
verifie(m['trajet-85'].isolate > 0.5 && m['trajet-85'].context < 0.5, `fin du trajet : rayons du chapitre 2 dépliés (${m['trajet-85'].isolate}), autres étoiles qui s'effacent (${m['trajet-85'].context})`);
verifie(m['chapitre-2'].de === 'accueil:sidekick' && !m['chapitre-2'].vers && Math.abs(m['chapitre-2'].foyer[0] - 1440 * 0.22) < 3, `dans le chapitre 2 : son étoile prend la place (${m['chapitre-2'].foyer})`);
verifie(p.erreurs.length === 0, `aucune erreur de page (${p.erreurs.length})`);
await b.close(); srv.close();
if (echecs.length) { console.log('\nÉCHEC : ' + echecs.length); process.exit(1); } console.log('\nPASS : graphe des chapitres');
