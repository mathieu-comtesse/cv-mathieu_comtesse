// Cohérence du site : métadonnées, liens internes, numérotation, sitemap. Aucune dépendance, aucun navigateur.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pages = fs.readdirSync('.').filter((f) => f.endsWith('.html') && !['info.html', '404.html', 'atelier.html', 'accueil.html', 'machines.html', 'parcours.html'].includes(f));
const read = (f) => fs.readFileSync(f, 'utf8');
const problems = [];
const titles = new Map(), descs = new Map();
for (const f of pages) {
  const h = read(f);
  const g = (re) => (h.match(re) || [])[1];
  const title = g(/<title>([^<]*)<\/title>/), desc = g(/<meta name="description" content="([^"]*)"/), canon = g(/<link rel="canonical" href="([^"]*)"/);
  if (!title) problems.push(`${f} : titre manquant`);
  if (!desc) problems.push(`${f} : description manquante`);
  else if (desc.length > 200) problems.push(`${f} : description de ${desc.length} caractères`);
  if (!canon) problems.push(`${f} : canonique manquante`);
  else if (canon !== (f === 'index.html' ? 'https://comtesse.me/' : `https://comtesse.me/${f.replace(/\.html$/, '')}`)) problems.push(`${f} : canonique ${canon}`);
  for (const p of ['og:title', 'og:description', 'og:url', 'og:image']) if (!h.includes(`property="${p}"`)) problems.push(`${f} : ${p} manquant`);
  const img = g(/property="og:image" content="https:\/\/comtesse\.me\/([^"]*)"/);
  if (img && !fs.existsSync(img)) problems.push(`${f} : image Open Graph introuvable ${img}`);
  for (const m of h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) { try { JSON.parse(m[1]); } catch { problems.push(`${f} : JSON-LD invalide`); } }
  if (title) { if (titles.has(title)) problems.push(`${f} : titre dupliqué avec ${titles.get(title)}`); titles.set(title, f); }
  if (desc) { if (descs.has(desc)) problems.push(`${f} : description dupliquée avec ${descs.get(desc)}`); descs.set(desc, f); }
  if (!['gains.html'].includes(f) && !/<h1[ >]/.test(h)) problems.push(`${f} : h1 manquant`);
  // liens et ressources internes
  for (const m of h.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|data:|tel:|javascript:|\/\/)/.test(u)) continue;
    const base = u.startsWith('/') ? u.slice(1) : u;
    if (!['', '.html', '/index.html'].some((s) => { const c = path.join('.', base + s); return fs.existsSync(c) && fs.statSync(c).isFile(); }) && !(base === '' || base === './')) problems.push(`${f} : lien interne cassé ${u}`);
  }
}
// numérotation « N / M » : un seul total par famille, rangs 1..M sans trou ni doublon
for (const [prefix, re] of [['projet-', /Projet professionnel · (\d+) \/ (\d+)/], ['article-', /Étude · (\d+) \/ (\d+)/]]) {
  const found = pages.filter((f) => f.startsWith(prefix)).map((f) => (read(f).match(re) || []).slice(1).map(Number)).filter((x) => x.length);
  const totals = new Set(found.map((x) => x[1]));
  if (totals.size !== 1) problems.push(`${prefix} : totaux différents ${[...totals]}`);
  else { const M = [...totals][0]; const ranks = found.map((x) => x[0]).sort((a, b) => a - b); if (ranks.join() !== Array.from({ length: M }, (_, i) => i + 1).join() || found.length !== M) problems.push(`${prefix} : rangs ${ranks} pour un total de ${M}`); }
}
// sitemap et robots
const sitemap = read('sitemap.xml');
for (const f of pages) { const u = f === 'index.html' ? 'https://comtesse.me/' : `https://comtesse.me/${f.replace(/\.html$/, '')}`; if (!sitemap.includes(`<loc>${u}</loc>`)) problems.push(`sitemap : ${u} absent`); }
if (!/Sitemap: https:\/\/comtesse\.me\/sitemap\.xml/.test(read('robots.txt'))) problems.push('robots.txt : sitemap non déclaré');
// une même appellation pour le jeu : l'ancien nom ne subsiste que dans la redirection et dans l'identifiant technique du pont Unity
for (const f of pages) if (/UNGA BUNGA/i.test(read(f))) problems.push(`${f} : ancienne appellation UNGA BUNGA`);
// typographie éditoriale : pas de tiret cadratin dans les titres et descriptions
for (const [t, f] of titles) if (t.includes('—')) problems.push(`${f} : tiret cadratin dans le titre`);
for (const [d, f] of descs) if (d.includes('—')) problems.push(`${f} : tiret cadratin dans la description`);

assert.deepEqual(problems, [], '\n' + problems.join('\n'));
console.log(`PASS: ${pages.length} pages (métadonnées, liens internes, numérotation, sitemap, appellations)`);
