// Modes à plat et expo, tous domaines Shopify bloqués : bascule animée (états intermédiaires, réversibilité, coïncidence avec la page à l'arrivée),
// saisie d'un nœud du graphe (déplacement, retour élastique, clic qui navigue), clavier, historique du navigateur, mouvement réduit.
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

/* ---- curseur hors nœud : `auto` comme sur les canevas de la référence (JSON brut : 265 `auto`, 0 `crosshair`) ---- */
const vide = await p.evaluate(() => { const r = document.querySelector('.cv-hero-graph').getBoundingClientRect(), cs = window.__cvHeroGraph.cibles();
  for (let y = r.top + 40; y < r.bottom - 40; y += 23) for (let x = r.left + 40; x < r.right - 40; x += 23) if (cs.every((c) => Math.hypot(c.x - x, c.y - y) > 60) && document.elementFromPoint(x, y)?.classList.contains('cv-hero-graph')) return { x, y };
  return null; });
await p.mouse.move(vide.x, vide.y); await p.waitForTimeout(300);
const curseurVide = await p.evaluate(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)).cursor, vide);
verifie(curseurVide === 'auto', `curseur hors nœud sur le graphe : « ${curseurVide} » (attendu auto)`);

/* ---- rendu à plat (règles relevées sur la référence) : foyers colorés et non blancs, nom à droite du foyer, foyer central sans carré plein ---- */
const platR = await p.evaluate(() => { const es = window.__cvHeroGraph.ciel.etat('accueil'), ch = es.filter((e) => e.id !== 'accueil' && e.visible);
  return { n: ch.length, bleus: ch.filter((e) => e.teinte === 'bleu').length, verts: ch.filter((e) => e.teinte === 'vert').length, centre: es.find((e) => e.id === 'accueil').teinte,
    noms: ch.filter((e) => e.libelle && e.libelle.texte === e.name && Math.abs(e.libelle.y - e.foyer[1]) < 14).length }; });
verifie(platR.n === 11 && platR.bleus + platR.verts === platR.n && platR.verts >= 2 && platR.bleus > platR.verts && platR.noms === platR.n && platR.centre === 'anneau', `rendu à plat : ${platR.bleus} foyers bleus, ${platR.verts} verts, ${platR.noms}/${platR.n} noms contre leur foyer, centre « ${platR.centre} »`);

/* ---- survols : durées relevées sur la référence (liens 0,15 s ; boutons : fond 0,25 s, bordure 0,15 s) ---- */
const trans = await p.evaluate(() => { const d = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).transitionDuration + ' | ' + getComputedStyle(e).transitionTimingFunction : null; }; const t = document.querySelector('.cv-parity-toggle'), masque = t.classList.contains('cv-pt-accueil'); t.classList.remove('cv-pt-accueil'); const bouton = d('.cv-parity-toggle'); t.classList.toggle('cv-pt-accueil', masque); return { lien: d('.cv-link,.cv-related a,.cv-legacy a'), bouton }; });
verifie(!!trans.lien && trans.lien.startsWith('0.15s, 0.15s') && !!trans.bouton && trans.bouton.startsWith('0.25s, 0.15s, 0.1s, 0.15s') && trans.bouton.includes('cubic-bezier(0.2, 0.7, 0.2, 1)') && trans.bouton.includes('cubic-bezier(0.65, 0, 0.35, 1)'), `transitions de survol : lien « ${trans.lien} », bouton « ${trans.bouton} »`);

/* ---- apparition du graphe : partie d'un état resserré et grossi (0,45 et 3), terminée à 1 et 1 ; immédiate en mouvement réduit ---- */
const app = await p.evaluate(() => { const s = window.__cvHeroGraph.etat(); return [s.ecarte, s.grossi]; });
const appR = await (async () => { const q = await page({ reducedMotion: 'reduce' }); const v = await q.evaluate(() => { const s = window.__cvHeroGraph.etat(); return [s.ecarte, s.grossi]; }); await q.context().close(); return v; })();
verifie(app[0] === 1 && app[1] === 1 && appR[0] === 1 && appR[1] === 1, `apparition terminée : écartement ${app[0]}, grossissement ${app[1]} ; mouvement réduit : ${appR[0]} et ${appR[1]}`);

/* ---- survol d'un foyer (observé sur la référence) : vif, nom agrandi, autres estompés, curseur pointer ; puis retour au repos ---- */
const fo = await p.evaluate(() => { const r = document.querySelector('.cv-hero-graph').getBoundingClientRect(), e = window.__cvHeroGraph.ciel.etat('accueil').filter((e) => e.id !== 'accueil')[3]; return { x: e.foyer[0] + r.left, y: e.foyer[1] + r.top, id: e.id }; });
await p.mouse.move(fo.x + 2, fo.y + 2, { steps: 5 }); await p.waitForFunction((id) => window.__cvHeroGraph.ciel.etat('accueil').find((e) => e.id === id).survol > 0.98, fo.id, { timeout: 15000 }).catch(() => {});
const sf = await p.evaluate((id) => { const es = window.__cvHeroGraph.ciel.etat('accueil'), e = es.find((x) => x.id === id); return { s: e.survol, corps: e.libelle.corps, autres: Math.max(...es.filter((x) => x.id !== id).map((x) => x.survol)), cur: document.documentElement.style.cursor }; }, fo.id);
await p.mouse.move(vide.x, vide.y, { steps: 5 }); await p.waitForFunction((id) => window.__cvHeroGraph.ciel.etat('accueil').find((e) => e.id === id).survol === 0, fo.id, { timeout: 15000 }).catch(() => {});
const sr = await p.evaluate((id) => { const e = window.__cvHeroGraph.ciel.etat('accueil').find((x) => x.id === id); return { s: e.survol, corps: e.libelle.corps }; }, fo.id);
verifie(sf.s > 0.98 && sf.corps > 21 && sf.autres === 0 && sf.cur === 'pointer' && sr.s === 0 && sr.corps < 12.1, `survol d'un foyer : état ${sf.s}, nom à ${sf.corps.toFixed(1)} px, curseur « ${sf.cur} » ; au repos : état ${sr.s}, nom à ${sr.corps.toFixed(1)} px`);

/* ---- bouton du mode 3D : masqué sur l'accueil, visible dans un chapitre (relevé de la référence) ---- */
const visBouton = () => p.evaluate(() => { const c = getComputedStyle(document.querySelector('.cv-parity-toggle')); return c.visibility + '/' + c.opacity; });
await p.waitForFunction(() => { const c = getComputedStyle(document.querySelector('.cv-parity-toggle')); return c.visibility + '/' + c.opacity === 'hidden/0'; }, null, { timeout: 15000 }).catch(() => {}); const bAccueil = await visBouton(); await p.evaluate(() => scrollTo({ top: 3000, behavior: 'instant' })); await p.waitForFunction((v) => { const c = getComputedStyle(document.querySelector('.cv-parity-toggle')); return c.visibility + '/' + c.opacity === v; }, 'visible/1', { timeout: 15000 }).catch(() => {}); const bChapitre = await visBouton();
await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForFunction((v) => { const c = getComputedStyle(document.querySelector('.cv-parity-toggle')); return c.visibility + '/' + c.opacity === v; }, 'hidden/0', { timeout: 15000 }).catch(() => {});
verifie(bAccueil === 'hidden/0' && bChapitre === 'visible/1' && await visBouton() === 'hidden/0', `bouton du mode 3D : ${bAccueil} sur l'accueil, ${bChapitre} dans un chapitre, masqué au retour`);

/* ---- saisie d'un nœud du graphe, mode à plat ---- */
const c0 = (await p.evaluate(() => window.__cvHeroGraph.cibles())).find((c) => c.x > 500 && c.x < 1380 && c.y > 120 && c.y < 840);
await p.mouse.move(c0.x, c0.y); await p.waitForTimeout(300);
const curseurSurvol = await p.evaluate(() => document.documentElement.style.cursor || getComputedStyle(document.querySelector('.cv-hero-graph')).cursor);
/* libellé de survol : contre le pointeur une fois posé, opaque, puis effacé en quittant le nœud */
await p.waitForTimeout(500);
const lib = await p.evaluate(() => { const l = window.__cvHeroGraph.ciel.libelleSurvol, r = document.querySelector('.cv-hero-graph').getBoundingClientRect(); return l && { x: l.x + r.left, y: l.y + r.top, o: l.opacite, t: l.texte }; });
verifie(!!lib && lib.o > 0.99 && Math.abs(lib.x - c0.x) < 40 && Math.abs(lib.y - c0.y) < 20 && lib.t.length > 0, `libellé de survol : « ${lib?.t} » à ${lib ? Math.hypot(lib.x - c0.x, lib.y - c0.y).toFixed(0) : '?'} px du pointeur, opacité ${lib?.o.toFixed(2)}`);
await p.mouse.down(); await p.mouse.move(c0.x + 60, c0.y + 30, { steps: 6 }); await p.waitForTimeout(500);
const tenu = await p.evaluate((h) => ({ c: window.__cvHeroGraph.cibles().find((c) => c.handle === h), curseur: document.documentElement.style.cursor, y: scrollY }), c0.handle);
verifie(curseurSurvol === 'pointer' && tenu.curseur === 'grabbing', `curseur : « ${curseurSurvol} » au survol d'un nœud, « ${tenu.curseur} » pendant la saisie`);
verifie(Math.hypot(tenu.c.x - (c0.x + 60), tenu.c.y - (c0.y + 30)) < 6, `le nœud saisi suit le pointeur (écart ${Math.hypot(tenu.c.x - (c0.x + 60), tenu.c.y - (c0.y + 30)).toFixed(1)} px)`);
await p.mouse.up(); const retour = []; for (let i = 0; i < 6; i++) { await p.waitForTimeout(350); const c = await p.evaluate((h) => window.__cvHeroGraph.cibles().find((c) => c.handle === h), c0.handle); retour.push(Math.hypot(c.x - c0.x, c.y - c0.y)); }
verifie(Math.max(...retour.slice(-3)) < 25,   /* revenu et stable ; l'écart résiduel vient de la fuite devant le pointeur resté à 67 px */ `relâché, le nœud revient à sa place (distance à l'origine : ${retour.map((d) => d.toFixed(0)).join(', ')} px)`);
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
const coin = await p.evaluate(async () => { const M = await import('./refonte/moteur.js?v=m29'), v = M.cvView(0, 1440, 900, 400), a = M.p(v, 300, 400 + 250, 0), b2 = M.p(v, 1100, 400 + 700, 40); return [a.x, a.y, b2.x, b2.y]; });
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
/* sous 940 px : foyers des chapitres en grille, sans foyer central, chacun nommé et entier dans le cadre (disposition de la référence) */
const gr = await m.evaluate(() => { const c = window.__cvHeroGraph.ciel, W = window.__cvHeroGraph.etat().largeur, ch = c.etat('accueil').filter((e) => e.id !== 'accueil');
  return { n: ch.length, racine: c.etat('accueil').find((e) => e.id === 'accueil').visible, ok: ch.filter((e) => e.visible && e.libelle?.texte === e.name && e.foyer[0] > 0 && e.foyer[0] < W && Math.abs(e.libelle.x - e.foyer[0]) < W / 2).length,
    rangees: new Set(ch.filter((e) => e.visible).map((e) => Math.round(e.foyer[1] / 20))).size }; });
verifie(!gr.racine && gr.ok === gr.n && gr.rangees === Math.ceil(gr.n / 2), `mobile, grille : ${gr.ok}/${gr.n} foyers nommés dans le cadre, ${gr.rangees} rangées, foyer central ${gr.racine ? 'visible' : 'masqué'}`);
await m.evaluate(() => document.querySelector('.cv-parity-toggle').click()); await m.waitForFunction(() => { const s = window.__cvStandardPath; return s.active && Math.abs(s.progress - 1) < 1e-3; }, null, { timeout: 60000 });
const em = await m.evaluate(() => [window.__cvStandardPath.active, window.__cvStandardPath.progress]);
const bMobile = await m.evaluate(() => getComputedStyle(document.querySelector('.cv-parity-toggle')).display);
verifie(bMobile === 'none', `mobile : bouton du mode 3D absent de l'écran (display ${bMobile}), comme sur la référence sous 940 px`);
verifie(gm.foyers >= 11 && em[0] && Math.abs(em[1] - 1) < 1e-3 && m.erreurs.length === 0, `mobile 390 × 844 : graphe ${gm.foyers} foyers dans ${gm.largeur} × ${gm.hauteur} px, expo actif, ${m.erreurs.length} erreur`);
await m.context().close(); await b.close(); srv.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : modes, bascule animée, saisie des nœuds, clavier, historique, mouvement réduit, mobile'); process.exit(echecs.length ? 1 : 0);
