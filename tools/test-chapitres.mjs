// Les 11 chapitres de l'accueil, mesurés : structure et ancres, transitions de couleur dans les deux sens (fenêtre de 340 px, couleurs de la suite),
// remplissage des titres (fonction pure de la position : identique en descendant et en remontant, sans saut), liste latérale (chapitre actif),
// navigation, en modes à plat et expo. Tous domaines Shopify bloqués. Rendu logiciel : aucune mesure de fluidité matérielle ici.
// Usage : node tools/test-chapitres.mjs   (code de sortie 1 en cas d'échec)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname)), '..');
let chromium; { try { ({ chromium } = createRequire(root + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const echecs = [], verifie = (ok, texte) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + texte); if (!ok) echecs.push(texte); };
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(); p.setDefaultTimeout(120000); const erreurs = []; let shopify = 0;
await p.route('http://talas.test/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
await p.route(/shopify(cdn)?\.com/, (r) => { shopify++; r.abort(); });
await p.route('https://comtesse.me/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.abort(); });
p.on('pageerror', (e) => erreurs.push(String(e.message).slice(0, 200)));
await p.goto('http://talas.test/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(3000);

const IDS = ['agentic', 'sidekick', 'online', 'merchandising', 'retail', 'payments', 'operations', 'shop', 'marketing', 'fulfillment', 'developer'];
const NOMS = ['Faire fonctionner', 'Fichiers retrouvés', 'Construire une fois', 'Savoir où regarder', 'Gains', 'Maintenance & prévention', 'Data & IA', 'Référentiels & méthodes', 'Parcours', 'Mondes & jeux', 'Blog & études'];   // projets en tête, par type (réorganisation validée par Mathieu)
const COULEURS = ['#051DAA', '#7000A9', '#B2005B', '#B03400', '#051DAA', '#00632E', '#B2005B', '#7000A9', '#B03400', '#00632E', '#0F0F0F'];
const attend = (ms) => p.waitForTimeout(ms);
const stable = async () => { let der = -1, n = 0; for (let i = 0; i < 100; i++) { const y = await p.evaluate(() => Math.round(scrollY)); if (y === der) { if (++n >= 6) return y; } else { n = 0; der = y; } await attend(400); } return der; };   /* défilement doux : on attend l'arrêt de la page, lente en rendu logiciel */
const va = async (y, ms = 350) => { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await attend(ms); };
const haut = (id) => p.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top + scrollY), id);

/* ---- 1. structure : 11 sections, chronologies, titres, ancres, menus, cartes ---- */
const st = await p.evaluate((IDS) => {
  const recs = window.cvChapterRecords || null, secs = [...document.querySelectorAll('section[data-f26-page-section]')], ids = [...document.querySelectorAll('[id]')].filter((e) => e.namespaceURI === 'http://www.w3.org/1999/xhtml').map((e) => e.id), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  const lien = (sel) => [...document.querySelectorAll(sel)].map((a) => a.getAttribute('href'));
  const ok = IDS.map((id, i) => { const s = document.getElementById(id), h = s && document.getElementById(s.getAttribute('aria-labelledby')); return !!s && s.matches('section[data-f26-page-section]') && getComputedStyle(s).getPropertyValue('--f26-page-timeline').trim() === '--f26-page-' + i && !!h && h.textContent.trim().length > 2; });
  const menu = lien('a[data-component-name="menu-item-link"]');
  return { ordre: secs.map((s) => s.id).join(','), ok, dup, menu: IDS.map((id) => menu.filter((h) => h === '#' + id).length), cartes: IDS.map((id) => document.getElementById(id).querySelectorAll('article.product-card').length), sk: document.querySelectorAll('#marketing .rf-sk-grp').length, renvoi: [...document.querySelectorAll('#marketing .rf-sk-liens a')].map((a) => a.getAttribute('href').slice(1)) };
}, IDS);
verifie(st.ordre === IDS.join(','), `11 sections de chapitre dans l'ordre : ${st.ordre.split(',').length}`);
const metas = await p.evaluate(() => ({ site: document.querySelector('meta[name="twitter:site"]')?.content || '', compte: !!document.querySelector('meta[name="twitter:account_id"]'), cdn: [...document.querySelectorAll('[src],[href]')].filter((e) => /shopify(cdn)?\.com/i.test(e.getAttribute('src') || e.getAttribute('href') || '')).length }));
verifie(!/shopify/i.test(metas.site) && !metas.compte && metas.cdn === 0, `métadonnées : aucune attribution au compte de Shopify (twitter:site « ${metas.site} »), aucune adresse shopify.com dans les balises src et href (${metas.cdn})`);
verifie(st.ok.every(Boolean), `chaque section : id, chronologie --f26-page-0 à 10, titre relié (${st.ok.filter(Boolean).length}/11)`);
verifie(st.dup.length === 0, `aucun identifiant HTML dupliqué (${st.dup.length}${st.dup.length ? ' : ' + st.dup.slice(0, 5).join(', ') : ''}) ; les dégradés SVG des machines, répétés par instance, sont hors périmètre`);
verifie(st.menu.every((n) => n === 2), `menu des chapitres : une entrée par chapitre, dans les deux menus (${st.menu.join(',')})`);
verifie(st.cartes.slice(0, 7).join(',') === '3,6,3,3,1,10,19', `cartes des 7 premiers chapitres = 4 types de projets (introduction + projets), gains, compétences regroupées (${st.cartes.slice(0, 7).join(',')})`);
verifie(st.sk === 0 && st.renvoi.join(',') === IDS.slice(5, 8).join(','), `« Parcours » ne duplique pas les compétences : ${st.sk} bloc, renvoi vers ${st.renvoi.length} chapitres de compétences`);
const noeuds = await p.evaluate((IDS) => { const r = window.__cvHeroGraph.ciel, res = []; for (const e of r.etoiles.values()) for (const n of e.noeuds) if (n.ed) res.push([e.chapitre, n.ed.handle]); return res.map(([c, h]) => { const el = document.getElementById(h), s = el && el.closest('section[data-f26-page-section]'); return !!s && s.id === c; }); }, IDS);
verifie(noeuds.length === 84 && noeuds.every(Boolean),   // 84 : 11 projets, gains, 43 compétences (dont 5 d'automatisation et de BI), 8 savoir-être, 11 jeux, 10 articles
  `les ${noeuds.length} nœuds du graphe pointent vers un élément de leur propre chapitre (${noeuds.filter(Boolean).length} valides)`);

const TOPS = {}; for (const id of IDS) TOPS[id] = await haut(id);   /* positions à plat : en expo le DOM d'origine est déplacé, le moteur garde ces mesures */

const sauter = process.argv[2] === 'expo';   /* option : node tools/test-chapitres.mjs expo (ne rejoue que la partie expo) */
let actifs = [], nav = [];
if (!sauter) {
/* ---- 2. transitions de couleur, 11 entrées de chapitre, dans les deux sens ---- */
const rgb = (c) => p.evaluate((c) => { const k = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); k.fillStyle = '#000'; k.fillStyle = c; k.fillRect(0, 0, 1, 1); return [...k.getImageData(0, 0, 1, 1).data].slice(0, 3); }, c);
const lecture = (k) => p.evaluate((k) => { const s = getComputedStyle(document.body); return { f: parseFloat(s.getPropertyValue('--f26-page-fill-' + k)), c: s.backgroundColor }; }, k);
let tousLesPlateaux = true, fenetres = [];
for (let k = 0; k < 11; k++) {
  const h = await haut(IDS[k]), pos = []; for (let d = 720; d >= (k === 0 ? 0 : 280); d -= 30) pos.push(h - d);   /* le premier chapitre suit l'accueil : sa fenêtre est celle de l'avance d'entrée nulle (0 px sur la référence aussi), plus tardive */
  const bas = [], retour = []; for (const y of pos) { await va(y); bas.push((await lecture(k)).f); } for (const y of [...pos].reverse()) { await va(y); retour.push((await lecture(k)).f); } retour.reverse();
  const mono = bas.every((v, i) => i === 0 || v >= bas[i - 1] - 0.002), ecart = Math.max(...bas.map((v, i) => Math.abs(v - retour[i])));
  const debut = pos.findIndex((_, i) => bas[i] > 0.02), fin = pos.findIndex((_, i) => bas[i] > 0.98), dd = debut < 0 ? null : h - pos[debut], df = fin < 0 ? null : h - pos[fin];
  fenetres.push([k, dd, df]);
  verifie(mono && ecart < 0.02 && bas[0] < 0.02 && bas.at(-1) > 0.98, `transition ${k + 1}/11 « ${IDS[k]} » : monotone, identique en descendant et en remontant (écart max ${ecart.toFixed(3)}), de ${bas[0].toFixed(2)} à ${bas.at(-1).toFixed(2)}, de ${dd} à ${df} px avant le haut du chapitre`);
  await va(h + 100, 600); const c = await rgb((await lecture(k)).c), a = await rgb(COULEURS[k]); const ok = c.every((v, i) => Math.abs(v - a[i]) <= 3); if (!ok) { tousLesPlateaux = false; console.log('   plateau', IDS[k], c, 'attendu', a); }
}
verifie(tousLesPlateaux, 'couleur de fond au cœur de chacun des 11 chapitres = suite de couleurs attendue (bleu, violet, rose, orange, bleu, vert, rose, violet, orange, vert, ardoise)');
verifie(fenetres.slice(1).every(([, d, f]) => d !== null && f !== null && d - f >= 270 && d - f <= 400), `fenêtre de transition de 340 px conservée (mesurée de ${Math.min(...fenetres.slice(1).map(([, d, f]) => d - f))} à ${Math.max(...fenetres.slice(1).map(([, d, f]) => d - f))} px, pas de 30 px)`);

/* ---- 3. remplissage des titres : fonction pure de la position, identique dans les deux sens, sans saut ---- */
const calage = async (id, u) => { for (let i = 0; i < 3; i++) { const e = await p.evaluate(([id, u]) => { const t = document.querySelector('#' + id + ' .section-hero-pin h2').getBoundingClientRect().top; return t - innerHeight * (1 - u); }, [id, u]); await p.evaluate((e) => scrollBy({ top: e, behavior: 'instant' }), e); await attend(120); if (Math.abs(e) < 2) break; } };
const fill = (id) => p.evaluate((id) => parseFloat(document.querySelector('#' + id + ' .section-hero-pin h2').style.getPropertyValue('--cv-fill')), id);
const US = [0.0, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.26, 0.34];
let pbRempli = [];
for (const id of IDS) {
  const bas = [], haut_ = []; await va((await haut(id)) - 1400, 500);
  for (const u of US) { await calage(id, u); await attend(300); bas.push(await fill(id)); }
  for (const u of [...US].reverse()) { await calage(id, u); await attend(300); haut_.push(await fill(id)); } haut_.reverse();
  const mono = bas.every((v, i) => i === 0 || v >= bas[i - 1] - 0.01), ecart = Math.max(...bas.map((v, i) => Math.abs(v - haut_[i]))), saut = Math.max(...bas.map((v, i) => i ? Math.abs(v - bas[i - 1]) : 0));
  const bornes = bas[0] <= 0.01 && bas[2] <= 0.15 && bas[US.indexOf(0.22)] >= 0.99 && bas.at(-1) >= 0.99   /* référence : nul avant 0,08, plein dès 0,22 */;
  if (!(mono && ecart < 0.05 && saut < 0.45 && bornes)) pbRempli.push(`${id} (mono ${mono}, écart ${ecart.toFixed(2)}, saut ${saut.toFixed(2)}, bornes ${bornes}: ${bas.map((v) => v.toFixed(2)).join(' ')})`);
}
verifie(pbRempli.length === 0, `remplissage des 11 titres : nul avant u = 0,08, complet dès 0,22 (référence), croissant, identique en descendant et en remontant (écart < 0,05), saut < 0,45 par pas de 0,02 à 0,04${pbRempli.length ? ' ; défauts : ' + pbRempli.join(' | ') : ''}`);

/* ---- 4. liste latérale à plat : chapitre actif, navigation ---- */
for (let k = 0; k < 11; k++) {
  const h = await haut(IDS[k]), ht = await p.evaluate((id) => document.getElementById(id).getBoundingClientRect().height, IDS[k]);
  await va(h + Math.min(300, ht / 2 - 200 > 0 ? 300 : ht / 3), 800);
  actifs.push(await p.evaluate(() => [...document.querySelectorAll('.cv-flat-nav a.actif')].map((a) => a.getAttribute('href').slice(1))));
}
verifie(actifs.every((a, k) => a.length === 1 && a[0] === IDS[k]), `liste latérale à plat : un seul chapitre actif, le bon, pour chacun des 11 (${actifs.map((a) => a.join('+') || '-').join(' ')})`);
await va(0, 1500);
for (const id of IDS) { await p.evaluate((id) => document.querySelector('.cv-flat-nav a[href="#' + id + '"]').click(), id); await attend(1800); nav.push([id, await p.evaluate(() => Math.round(scrollY)), await haut(id)]); }
verifie(nav.every(([, y, h]) => Math.abs(y - h + 359) <= 6), `navigation à plat vers chacun des 11 chapitres : atterrissage à 359 px avant le haut de section, comme sur la référence (écarts : ${nav.map(([, y, h]) => y - h).join(', ')} px)`);
await p.evaluate(() => { location.hash = '#online'; }); await attend(1500); const ya = await p.evaluate(() => scrollY); await p.evaluate(() => { location.hash = '#payments'; }); await attend(1500); await p.evaluate(() => history.back()); await attend(1500); const yb = await p.evaluate(() => scrollY);
verifie(Math.abs(ya - yb) < 60, `retour arrière du navigateur : de #payments à #online (${Math.round(yb)} px, attendu ${Math.round(ya)} px)`);

}
/* ---- 5. expo : chapitre actif, étoile du chapitre, liste, navigation ---- */
await va(0, 1500); await p.evaluate(() => window.__cvStandardPath.bascule()); await p.waitForFunction(() => window.__cvStandardPath.progress > 0.999, null, { timeout: 120000 }); await attend(2500);
let ex = [];
for (let k = 0; k < 11; k++) {
  const h = TOPS[IDS[k]]; await va(h + 500, 300); await p.waitForFunction((id) => window.__cvStandardPath.chapitreActif === id, IDS[k], { timeout: 25000 }).catch(() => {}); await attend(2500);   /* attente sur condition : les durées varient en rendu logiciel */
  ex.push(await p.evaluate(([id, nom]) => { const P = window.__cvParity, cur = [...document.querySelectorAll('.cv-parity-nav a[aria-current]')].map((a) => a.dataset.chapter); return { actif: window.__cvStandardPath.chapitreActif, cur, etoile: P.etoiles().some((e) => e.visible && e.libelle && e.libelle.texte === nom) }; }, [IDS[k], NOMS[k]]));
}
verifie(ex.every((e, k) => e.actif === IDS[k]), `expo : chapitre actif du moteur = le bon pour chacun des 11 (${ex.map((e) => e.actif).join(' ')})`);
/* main ne met plus la liste latérale des chapitres dans la page en mode expo (menu d'en-tête à la place) : contrôle du marquage retiré */
verifie(ex.every((e) => e.etoile), `expo : l'étoile de chaque chapitre est visible avec son nom (${ex.filter((e) => e.etoile).length}/11)`);
nav = []; await va(0, 1500); await stable();
for (const id of IDS) { const y0 = await p.evaluate(() => Math.round(scrollY)); await p.evaluate((id) => document.querySelector('#cv-header-chapters a[href="#' + id + '"]').click(), id); for (let i = 0; i < 40 && Math.abs((await p.evaluate(() => Math.round(scrollY))) - y0) < 50; i++) await attend(500); const y = await stable(); await p.waitForFunction((id) => window.__cvStandardPath.chapitreActif === id, id, { timeout: 15000 }).catch(() => {}); nav.push([id, y, TOPS[id], await p.evaluate(() => window.__cvStandardPath.chapitreActif)]); }
verifie(nav.every(([id, y, h, a]) => a === id && y - h >= -700 && y - h <= 400), `expo : navigation vers chacun des 11 chapitres, défilement doux : chapitre actif à l'arrivée = le bon, atterrissage entre 700 px avant et 400 px après le haut de section (première carte moins 30 % de la fenêtre) (écarts : ${nav.map(([, y, h]) => y - h).join(', ')} px)`);

/* ---- 6. mobile 390 × 844 : les 11 chapitres existent, rien ne déborde, les cartes sont lisibles, la navigation et le remplissage fonctionnent ---- */
{
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }), q = await m.newPage(); q.setDefaultTimeout(120000); const errM = [];
  await q.route('http://talas.test/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
  await q.route(/shopify(cdn)?\.com/, (r) => r.abort()); await q.route('https://comtesse.me/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.abort(); });
  q.on('pageerror', (e) => errM.push(String(e.message).slice(0, 160)));
  await q.goto('http://talas.test/index.html', { waitUntil: 'load' }); await q.waitForFunction(() => window.__cvHeroGraph, null, { timeout: 90000 }); await q.waitForTimeout(3500);
  const mo = await q.evaluate((IDS) => { const o = { sections: IDS.map((id) => !!document.getElementById(id)), debord: document.documentElement.scrollWidth - innerWidth, cartes: [] };
    for (const id of IDS.slice(0, 7)) { const a = document.getElementById(id).querySelector('article.product-card').getBoundingClientRect(); o.cartes.push([Math.round(a.left), Math.round(a.right)]); } return o; }, IDS);
  verifie(mo.sections.every(Boolean) && mo.debord <= 1, `mobile : 11 sections présentes, pas de défilement horizontal (débord ${mo.debord} px)`);
  verifie(mo.cartes.every(([l, r]) => l >= 0 && r <= 391), `mobile : les cartes des 7 nouveaux chapitres tiennent dans la largeur (${mo.cartes.map(([l, r]) => l + '-' + r).join(' ')})`);
  const ym = [];
  for (const id of ['agentic', 'retail', 'operations']) { await q.evaluate((id) => { location.hash = '#' + id; }, id); await q.waitForTimeout(2500); ym.push(await q.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), id)); }
  verifie(ym.every((y) => y > -700 && y < 400), `mobile : navigation par ancre vers 3 chapitres (haut de section à ${ym.join(', ')} px de la fenêtre)`);
  await q.evaluate(() => { const h = document.querySelector('#payments .section-hero-pin h2'); scrollTo({ top: h.getBoundingClientRect().top + scrollY - innerHeight * 0.5, behavior: 'instant' }); }); await q.waitForTimeout(1200);
  const fm = await q.evaluate(() => parseFloat(document.querySelector('#payments .section-hero-pin h2').style.getPropertyValue('--cv-fill')));
  verifie(fm > 0.99, `mobile : titre rempli quand il atteint le milieu de l'écran (remplissage ${fm})`);
  verifie(errM.length === 0, `mobile : aucune erreur de page (${errM.length})`); await m.close();
}
verifie(erreurs.length === 0 && shopify === 0, `aucune erreur de page (${erreurs.length}), aucune requête Shopify (${shopify})`);
await b.close(); console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : 11 chapitres (structure, transitions, remplissage, liste latérale, navigation, modes à plat et expo)'); process.exit(echecs.length ? 1 : 0);
