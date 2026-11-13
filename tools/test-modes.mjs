// Modes à plat et expo, tous domaines Shopify bloqués : bascule animée (états intermédiaires, réversibilité, coïncidence avec la page à l'arrivée),
// saisie d'un nœud du graphe (déplacement, retour élastique, clic qui navigue), clavier, historique du navigateur, mouvement réduit.
// Usage : node tools/test-modes.mjs   (code de sortie 1 en cas d'échec). Rendu logiciel : aucune mesure de fluidité matérielle ici.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let chromium; { try { ({ chromium } = createRequire(root + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); } }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, res) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); } }).listen(0); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const echecs = [], verifie = (ok, texte) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + texte); if (!ok) echecs.push(texte); };
async function page(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts }), p = await ctx.newPage(); p.setDefaultTimeout(120000); p.erreurs = []; p.shopify = 0;
  await p.route(/shopify(cdn)?\.com/, (r) => { p.shopify++; r.abort(); });
  await p.route('https://comtesse.me/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.abort(); });
  p.on('pageerror', (e) => p.erreurs.push(String(e.message).slice(0, 200)));
  await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(2500);
  return p;
}
const p = await page();

/* ---- saisie d'un nœud du graphe, mode à plat ---- */
const c0 = (await p.evaluate(() => window.__cvHeroGraph.cibles())).find((c) => c.x > 500 && c.x < 1380 && c.y > 120 && c.y < 840);
await p.mouse.move(c0.x, c0.y); await p.waitForTimeout(300);
const curseurSurvol = await p.evaluate(() => document.documentElement.style.cursor || getComputedStyle(document.querySelector('.cv-hero-graph')).cursor);
await p.mouse.down(); await p.mouse.move(c0.x + 60, c0.y + 30, { steps: 6 }); await p.waitForTimeout(500);
const tenu = await p.evaluate((h) => ({ c: window.__cvHeroGraph.cibles().find((c) => c.handle === h), curseur: document.documentElement.style.cursor, y: scrollY }), c0.handle);
verifie(curseurSurvol === 'grab' && tenu.curseur === 'grabbing', `curseur : « ${curseurSurvol} » au survol d'un nœud, « ${tenu.curseur} » pendant la saisie`);
verifie(Math.hypot(tenu.c.x - (c0.x + 60), tenu.c.y - (c0.y + 30)) < 6, `le nœud saisi suit le pointeur (écart ${Math.hypot(tenu.c.x - (c0.x + 60), tenu.c.y - (c0.y + 30)).toFixed(1)} px)`);
await p.mouse.up(); const retour = []; for (let i = 0; i < 6; i++) { await p.waitForTimeout(350); const c = await p.evaluate((h) => window.__cvHeroGraph.cibles().find((c) => c.handle === h), c0.handle); retour.push(Math.hypot(c.x - c0.x, c.y - c0.y)); }
verifie(retour.at(-1) < 25 && retour[0] > retour.at(-1), `relâché, le nœud revient à sa place (distance à l'origine : ${retour.map((d) => d.toFixed(0)).join(', ')} px)`);
verifie(tenu.y === 0 && await p.evaluate(() => scrollY) === 0, 'un glissé ne déclenche pas de navigation');
const c1 = await p.evaluate((h) => window.__cvHeroGraph.cibles().find((c) => c.handle === h), c0.handle); await p.mouse.move(c1.x, c1.y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(2500);
verifie(await p.evaluate(() => scrollY) > 400, `un clic sans déplacement mène au contenu (défilement à ${await p.evaluate(() => scrollY)} px)`);

/* ---- bascule animée ---- */
await p.evaluate(() => scrollTo(0, 3000)); await p.waitForTimeout(1200);
const avant = await p.evaluate(() => { const e = document.querySelector('.product-card h3'), r = e.getBoundingClientRect(); return { y: scrollY, x: r.left, t: r.top }; });
await p.evaluate(() => document.querySelector('.cv-parity-toggle').click());
const entree = []; for (let i = 0; i < 14; i++) { entree.push(await p.evaluate(() => [+window.__cvStandardPath.progress.toFixed(3), window.__cvTransfer?.path, +(-window.__cvParity.project()?.pitch * 180 / Math.PI).toFixed(1)])); await p.waitForTimeout(110); } await p.waitForTimeout(2500);
const expo = await p.evaluate(() => ({ p: window.__cvStandardPath.progress, pitch: -window.__cvParity.project().pitch * 180 / Math.PI, actif: document.documentElement.classList.contains('cv-parity-active'), y: scrollY }));
const inter = entree.filter((e) => e[0] > 0.02 && e[0] < 0.98);
verifie(inter.length >= 1 && entree.every((e, i) => !i || e[0] >= entree[i - 1][0] - 1e-6), `entrée en expo progressive : ${inter.length} états intermédiaires relevés (progression ${entree.map((e) => e[0]).filter((v, i, l) => !i || v !== l[i - 1]).join(' → ')})`);
{ const d = entree.find((e) => Number.isFinite(e[2])); verifie(d && (Math.abs(d[2] - 90) < 12 || d[0] > 0.05) && entree.some((e) => e[2] > 31 && e[2] < 89), `la caméra part de la verticale et descend (${entree.filter((e) => Number.isFinite(e[2])).map((e) => e[2]).filter((v, i, l) => !i || v !== l[i - 1]).join('° → ')}°)`); }
verifie(expo.actif && Math.abs(expo.p - 1) < 1e-3 && Math.abs(expo.pitch - 30.2) < 0.3, `arrivée : progression ${expo.p}, visée à ${expo.pitch.toFixed(1)}° sous l'horizontale`);
verifie(Math.abs(expo.y - avant.y) < 2, `la position de lecture est conservée (${avant.y} → ${expo.y} px)`);
/* sortie, interrompue puis reprise */
await p.evaluate(() => document.querySelector('.cv-parity-toggle').click()); await p.waitForTimeout(300);
const mi = await p.evaluate(() => [window.__cvStandardPath.progress, window.__cvStandardPath.cible]);
await p.evaluate(() => document.querySelector('.cv-parity-toggle').click()); await p.waitForFunction(() => { const s = window.__cvStandardPath; return !s.active || Math.abs(s.progress - s.cible) < 1e-3; }, null, { timeout: 60000 }); await p.waitForTimeout(600);
const repris = await p.evaluate(() => [window.__cvStandardPath.progress, window.__cvStandardPath.active]);
verifie(mi[1] === 0 && repris[1] && Math.abs(repris[0] - 1) < 1e-3, `bascule inversée en cours de sortie : progression ${(+mi[0]).toFixed(2)} à l'interruption, retour à ${repris[0]} en expo`);
await p.keyboard.press('Escape'); await p.waitForFunction(() => !window.__cvStandardPath.active, null, { timeout: 60000 }); await p.waitForTimeout(800);
const plat = await p.evaluate(() => { const e = document.querySelector('.product-card h3'), r = e.getBoundingClientRect(); return { actif: document.documentElement.classList.contains('cv-parity-active'), y: scrollY, x: r.left, t: r.top, inert: !!e.closest('[inert]') }; });
verifie(!plat.actif && Math.abs(plat.y - avant.y) < 2 && Math.abs(plat.x - avant.x) < 1 && Math.abs(plat.t - avant.t) < 2, `sortie au clavier (Échap) : retour à plat, même position (${plat.y} px), contenu à sa place (écart ${Math.abs(plat.x - avant.x).toFixed(1)} / ${Math.abs(plat.t - avant.t).toFixed(1)} px)`);
await p.keyboard.press('Backquote'); await p.waitForFunction(() => { const s = window.__cvStandardPath; return !s.active || Math.abs(s.progress - s.cible) < 1e-3; }, null, { timeout: 60000 }); await p.waitForTimeout(600);
verifie(await p.evaluate(() => window.__cvStandardPath.active), 'entrée au clavier (touche `)');
/* coïncidence géométrique à la progression 0 : un point du chemin se projette là où il est dans la page */
const coin = await p.evaluate(async () => { const M = await import('./refonte/moteur.js?v=m4'), v = M.cvView(0, 1440, 900, 400), a = M.p(v, 300, 400 + 250, 0), b2 = M.p(v, 1100, 400 + 700, 40); return [a.x, a.y, b2.x, b2.y]; });
verifie(Math.abs(coin[0] - 300) < 0.01 && Math.abs(coin[1] - 250) < 0.01 && Math.abs(coin[2] - 1100) < 0.01 && Math.abs(coin[3] - 700) < 0.01, `à la progression 0 la projection coïncide avec la page (${coin.map((v) => v.toFixed(2)).join(', ')})`);

/* ---- saisie d'un nœud en expo ---- */
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(4500);
const e0 = (await p.evaluate(() => window.__cvParity.cibles())).find((c) => c.groupe === 'accueil' && c.x > 560 && c.x < 1300 && c.y > 330 && c.y < 640);
if (e0) { await p.mouse.move(e0.x, e0.y); await p.waitForTimeout(400); await p.mouse.down(); await p.mouse.move(e0.x + 50, e0.y - 40, { steps: 5 }); await p.waitForTimeout(900);
  const t2 = await p.evaluate((h) => ({ c: window.__cvParity.cibles().find((c) => c.handle === h), cur: document.documentElement.style.cursor }), e0.handle); await p.mouse.up();
  verifie(t2.cur === 'grabbing' && Math.hypot(t2.c.x - (e0.x + 50), t2.c.y - (e0.y - 40)) < 8, `expo : le nœud saisi suit le pointeur dans la scène (écart ${Math.hypot(t2.c.x - (e0.x + 50), t2.c.y - (e0.y - 40)).toFixed(1)} px, curseur « ${t2.cur} »)`); } else verifie(false, 'expo : aucun nœud du graphe atteignable');

/* ---- historique du navigateur ---- */
await p.evaluate(() => window.__cvStandardPath.leave()); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
await p.evaluate(() => { location.hash = '#marketing'; }); await p.waitForTimeout(2500); const y1 = await p.evaluate(() => scrollY);
await p.evaluate(() => { location.hash = '#developer'; }); await p.waitForTimeout(2500); const y2 = await p.evaluate(() => scrollY);
await p.goBack(); await p.waitForTimeout(2500); const y3 = await p.evaluate(() => [scrollY, location.hash]);
verifie(y1 > 1000 && y2 > y1 && y3[1] === '#marketing' && Math.abs(y3[0] - y1) < 400, `navigation directe et retour arrière : #marketing à ${y1} px, #developer à ${y2} px, retour sur ${y3[1]} à ${y3[0]} px`);
verifie(p.erreurs.length === 0 && p.shopify === 0, `aucune erreur de page (${p.erreurs.length}), aucune requête Shopify (${p.shopify}) ${p.erreurs.slice(0, 2).join(' | ')}`);
await p.context().close();

/* ---- mouvement réduit : bascule immédiate ---- */
const r = await page({ reducedMotion: 'reduce' });
await r.evaluate(() => document.querySelector('.cv-parity-toggle').click()); await r.waitForTimeout(1500);
const rm = await r.evaluate(() => [window.__cvStandardPath.progress, window.__cvStandardPath.active]);
await r.evaluate(() => document.querySelector('.cv-parity-toggle').click()); await r.waitForTimeout(800);
verifie(rm[1] && Math.abs(rm[0] - 1) < 1e-3 && !(await r.evaluate(() => window.__cvStandardPath.active)) && r.erreurs.length === 0, `mouvement réduit : entrée et sortie sans animation (progression ${rm[0]})`);
await r.context().close();

/* ---- mobile ---- */
const m = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const gm = await m.evaluate(() => window.__cvHeroGraph.etat());
await m.evaluate(() => document.querySelector('.cv-parity-toggle').click()); await m.waitForFunction(() => { const s = window.__cvStandardPath; return s.active && Math.abs(s.progress - 1) < 1e-3; }, null, { timeout: 60000 });
const em = await m.evaluate(() => [window.__cvStandardPath.active, window.__cvStandardPath.progress]);
verifie(gm.foyers >= 12 && em[0] && Math.abs(em[1] - 1) < 1e-3 && m.erreurs.length === 0, `mobile 390 × 844 : graphe ${gm.foyers} foyers dans ${gm.largeur} × ${gm.hauteur} px, expo actif, ${m.erreurs.length} erreur`);
await m.context().close(); await b.close(); srv.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : modes, bascule animée, saisie des nœuds, clavier, historique, mouvement réduit, mobile'); process.exit(echecs.length ? 1 : 0);
