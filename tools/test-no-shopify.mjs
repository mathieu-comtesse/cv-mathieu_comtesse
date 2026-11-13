// Accueil sans cdn.shopify.com : toutes les requêtes vers Shopify sont bloquées, puis on vérifie que la page, la navigation et les scènes fonctionnent.
//   node tools/test-no-shopify.mjs            échec si une fonction ne marche plus sans Shopify
//   node tools/test-no-shopify.mjs --strict   échec aussi si la page tente encore une seule requête vers Shopify (objectif final)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), strict = process.argv.includes('--strict');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); r.setHeader('access-control-allow-origin', '*'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o)); const port = srv.address().port;
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(120000);
const bloquees = [], erreurs = [], echecs = [];
await p.route(/shopify(cdn)?\.com/, (r) => { bloquees.push(r.request().resourceType() + ' ' + r.request().url().replace(/\?.*$/, '').slice(0, 120)); r.abort(); });
await p.route('https://comtesse.me/**', async (r) => { const u = new URL(r.request().url()), f = path.join(root, decodeURIComponent(u.pathname)); if (fs.existsSync(f) && fs.statSync(f).isFile()) r.fulfill({ status: 200, headers: { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'access-control-allow-origin': '*' }, body: fs.readFileSync(f) }); else r.fulfill({ status: 404, body: '' }); });
p.on('pageerror', (e) => erreurs.push(String(e.message).slice(0, 200)));
const verifie = (ok, texte) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + texte); if (!ok) echecs.push(texte); };
await p.goto(`http://localhost:${port}/index.html?uxtest`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(15000);
const etat = await p.evaluate(() => ({ sections: [...document.querySelectorAll('section[id]')].map((s) => s.id), secours: document.documentElement.dataset.cssFallback === '1', largeurTitre: Math.round(document.querySelector('#shop h2')?.getBoundingClientRect().width || 0), parite: !!window.__cvParity?.boxes, etoiles: window.__cvThemeStars?.etoiles().length || 0, decor: !!document.querySelector('[data-cv-decor-card] iframe'), machines: document.querySelectorAll('[data-cv-machine] canvas').length, corps: getComputedStyle(document.body).fontFamily.slice(0, 60) }));
verifie(etat.sections[0] === 'shop' && etat.sections.length >= 6, `sections présentes, la première est Projets professionnels : ${etat.sections.join(', ')}`);
verifie(etat.secours, 'la feuille de style de secours locale est chargée');
verifie(etat.largeurTitre > 200, `le titre du premier chapitre est mis en page (${etat.largeurTitre} px)`);
verifie(etat.etoiles >= 8, `titres en étoile : ${etat.etoiles}`);
verifie(etat.decor, 'la carte du décor est en place');
verifie(etat.machines > 0, `machines 3D présentes : ${etat.machines}`);
verifie(etat.parite, 'le moteur du chemin (cadres, graphe) a démarré');
const avant = await p.evaluate(() => scrollY); await p.evaluate(() => document.getElementById('marketing')?.scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(2500);
verifie((await p.evaluate(() => scrollY)) > avant + 500, 'la navigation vers un chapitre fait défiler la page');
const bascule = await p.evaluate(() => { const t = document.querySelector('.cv-parity-toggle'); if (!t) return null; t.click(); return true; }); await p.waitForTimeout(5000);
verifie(bascule && await p.evaluate(() => document.documentElement.classList.contains('cv-parity-active')), 'le passage en chemin 3D (mode expo) fonctionne');
verifie(erreurs.length === 0, `aucune erreur de page (${erreurs.length}) ${erreurs.slice(0, 2).join(' | ')}`);
const parType = {}; for (const q of bloquees) { const t = q.split(' ')[0]; parType[t] = (parType[t] || 0) + 1; }
console.log(`\nrequêtes vers Shopify tentées puis bloquées : ${bloquees.length}`, JSON.stringify(parType)); for (const q of [...new Set(bloquees)].slice(0, 14)) console.log('   ' + q);
if (strict) verifie(bloquees.length === 0, 'aucune requête vers Shopify');
await b.close(); srv.close();
if (echecs.length) { console.error(`\n${echecs.length} échec(s)`); process.exit(1); } console.log('\nPASS : accueil fonctionnel sans cdn.shopify.com' + (strict ? ', aucune requête tentée' : ''));
