// Branches du graphe de l'accueil (Ciel) : hiérarchie, courbes, raccords, déterminisme, survol de trajectoire, chapitre actif.
// Usage : node tools/test-branches.mjs [gpu|logiciel]   (aucun socket : fichiers servis par Playwright)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const racine = path.resolve(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname), '..', '..');
let chromium; try { ({ chromium } = createRequire(racine + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const mode = process.argv[2] || 'logiciel';
const args = mode === 'gpu' ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const b = await chromium.launch({ args }); const echecs = [], verifie = (ok, t) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + t); if (!ok) echecs.push(t); };
const serve = (r) => { const f = path.join(racine, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); };
async function page(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts }), p = await ctx.newPage(); p.setDefaultTimeout(120000); p.erreurs = [];
  p.on('pageerror', (e) => p.erreurs.push(String(e.message).slice(0, 200)));
  await p.route('http://talas.test/**', serve); await p.route('https://comtesse.me/**', serve); await p.route(/shopify(cdn)?\.com/, (r) => r.abort());
  await p.goto('http://talas.test/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); await p.waitForTimeout(3500);
  return p;
}
const sig = (p) => p.evaluate(() => { const c = window.__cvHeroGraph.ciel; let s = ''; for (const e of c.etoiles.values()) for (const n of e.noeuds) s += [n.niveau, n.par ? e.noeuds.indexOf(n.par) : -1, n.cv.toFixed(4), n.ar.toFixed(4), n.t0.toFixed(4), n.ang.toFixed(4), n.len.toFixed(4)].join(',') + ';'; let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0; return { h, n: s.split(';').length - 1 }; });
const p = await page(), p2 = await page();
// 1. déterminisme : deux chargements, même géométrie
const s1 = await sig(p), s2 = await sig(p2);
verifie(s1.h === s2.h && s1.n === s2.n, `déterminisme : même empreinte pour deux chargements (${s1.n} branches, empreinte ${s1.h})`);
await p2.context().close();
// 2. quantités conservées et hiérarchie
const h = await p.evaluate(() => { const c = window.__cvHeroGraph.ciel, cm = c.compte('accueil'), niv = [0, 0, 0, 0]; let ok = true, t0 = true; for (const e of c.etoiles.values()) for (const n of e.noeuds) { niv[n.niveau]++; if (n.par) { if (!(n.par.niveau < n.niveau)) ok = false; if (!(n.t0 >= 0.35 && n.t0 <= 0.85)) t0 = false; if (!n.par.enf.includes(n)) ok = false; } else if (n.niveau > 1) ok = false; } return { total: cm.total, ed: cm.editoriaux, foyers: c.etat('accueil').length, niv, ok, t0 }; });
verifie(h.foyers === 12 && h.ed === 83 && h.total === 505, `quantités : ${h.foyers} foyers, ${h.ed} nœuds éditoriaux, ${h.total} nœuds`);
verifie(h.niv[0] === 83 && h.niv[1] > 0 && h.niv[2] > 0 && h.niv[3] > 0, `hiérarchie : ${h.niv[0]} branches éditoriales, ${h.niv[1]} rayons, ${h.niv[2]} ramifications, ${h.niv[3]} ramifications tertiaires`);
verifie(h.ok && h.t0, 'chaque ramification a un parent de niveau inférieur et part entre 35 % et 85 % de sa courbe');
// 3. géométrie rendue : courbes, raccords
await p.waitForTimeout(1500);
const g = await p.evaluate(() => { const c = window.__cvHeroGraph.ciel; let courbes = 0, vis = 0, maxRacc = 0, raccN = 0, droites = 0; for (const e of c.etoiles.values()) for (const n of e.noeuds) { if (!n.vis) continue; vis++; const d = Math.hypot(n.x1 - n.x0, n.y1 - n.y0) || 1, ecart = Math.abs((n.cx - n.x0) * (n.y1 - n.y0) - (n.cy - n.y0) * (n.x1 - n.x0)) / d; if (ecart > 0.8) courbes++; else droites++; if (n.par && n.par.vis) { const t = n.t0, o = 1 - t, jx = o * o * n.par.x0 + 2 * o * t * n.par.cx + t * t * n.par.x1, jy = o * o * n.par.y0 + 2 * o * t * n.par.cy + t * t * n.par.y1, e2 = Math.hypot(jx - n.x0, jy - n.y0); raccN++; if (e2 > maxRacc) maxRacc = e2; } } return { vis, courbes, droites, maxRacc, raccN }; });
verifie(g.vis > 300 && g.courbes / g.vis > 0.9, `courbes : ${g.courbes} branches sur ${g.vis} visibles s'écartent de plus de 0,8 px de leur corde (${g.droites} quasi droites)`);
verifie(g.raccN > 100 && g.maxRacc < 0.5, `raccords : ${g.raccN} ramifications, écart maximal ${g.maxRacc.toFixed(3)} px entre leur départ et le point de leur branche parente`);
// 4. survol d'une carte : voisines estompées, descendants mis en évidence
const carte = await p.evaluate(() => { const r = document.querySelector('.cv-hero-graph').getBoundingClientRect(), c = window.__cvHeroGraph.ciel; const t = c.cibles.find((q) => q.x > 200 && q.x < r.width - 100 && q.y > 100 && q.y < r.height - 100); return t ? { x: t.x + r.left, y: t.y + r.top, h: t.noeud.ed.handle } : null; });
await p.mouse.move(carte.x, carte.y); await p.waitForTimeout(700);
const sv = await p.evaluate((hd) => { const c = window.__cvHeroGraph.ciel, f = c.survol; if (!f) return null; let dim = 0, hl = 0; for (const n of f.etoile.noeuds) { if (n.vis && n.cl === 1) dim++; if (n.vis && n.cl === 2) hl++; } return { ok: f.noeud.ed.handle === hd, dim, hl }; }, carte.h);
verifie(sv && sv.ok && sv.dim > 5 && sv.hl >= 1, `survol d'une carte : ${sv ? sv.dim : 0} branches voisines estompées, ${sv ? sv.hl : 0} branche(s) mise(s) en évidence`);
// 5. survol d'une trajectoire (hors carte) : mise en évidence sans rendre la ligne cliquable
await p.mouse.move(5, 5); await p.waitForTimeout(500);
const br = await p.evaluate(() => { const r = document.querySelector('.cv-hero-graph').getBoundingClientRect(), c = window.__cvHeroGraph.ciel; for (const e of c.etoiles.values()) for (const n of e.noeuds) { if (!n.ed || !n.vis || n.cl === 3) continue; const q = 0.5, o = 0.5, x = o * o * n.x0 + 2 * o * q * n.cx + q * q * n.x1, y = o * o * n.y0 + 2 * o * q * n.cy + q * q * n.y1; if (x > 200 && x < r.width - 100 && y > 100 && y < r.height - 100 && !c.cibles.some((t) => Math.hypot(t.x - x, t.y - y) < 40)) return { x: x + r.left, y: y + r.top, h: n.ed.handle }; } return null; });
if (br) { await p.mouse.move(br.x, br.y); await p.waitForTimeout(700); }
const sb = br ? await p.evaluate((hd) => { const c = window.__cvHeroGraph.ciel; return { branche: c.survolBranche ? c.survolBranche.noeud.ed.handle === hd : false, carte: !!c.survol, cliquable: !!c.touche(c.survolBranche ? c.survolBranche.noeud.x1 + 60 : 0, 0) }; }, br.h) : null;
verifie(sb && sb.branche && !sb.carte, 'survol d\'une trajectoire : la branche éditoriale est identifiée, sans carte survolée');
// 6. chapitre actif
await p.evaluate(() => window.__cvStandardPath.bascule()); await p.waitForFunction(() => window.__cvStandardPath.progress > 0.999, null, { timeout: 90000 }); await p.waitForTimeout(500);
const ch = await p.evaluate(async () => { const s = document.querySelector('[data-f26-page-section][id]'); if (!s) return null; const y = s.getBoundingClientRect().top + scrollY; scrollTo(0, y); await new Promise((r) => setTimeout(r, 2500)); return { id: s.id, actif: window.__cvStandardPath.chapitreActif }; });
verifie(ch && ch.actif === ch.id, `chapitre actif lu au défilement : section « ${ch ? ch.id : null} », chapitre actif « ${ch ? ch.actif : null} »`);
verifie(p.erreurs.length === 0, `aucune erreur de page (${p.erreurs.length})`);
await b.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : branches hiérarchiques, courbes, raccordées, déterministes, interactives'); process.exit(echecs.length ? 1 : 0);
