// SEO : bloc de métadonnées (canonique, Open Graph, Twitter, JSON-LD), sitemap.xml, robots.txt.
// Idempotent : le bloc entre <!-- seo:start --> et <!-- seo:end --> est recalculé à chaque exécution.
// Titre, description et h1 sont lus dans chaque page : aucune donnée n'est dupliquée ici.
// Usage : node tools/seo-build.mjs            (écrit)   |   node tools/seo-build.mjs --check   (échoue si un fichier changerait)
import fs from 'node:fs';

const SITE = 'https://comtesse.me';
const check = process.argv.includes('--check');
const NAME = 'Mathieu Comtesse';
const JOB = 'Ingénieur Maintenance et Qualité';
const SAME_AS = ['https://www.linkedin.com/in/mathieu-comtesse-a226a1433/', 'https://github.com/mathieu-comtesse'];
const DEFAULT_IMG = `${SITE}/assets/og-home-blueprint.png`;
const SKIP = new Set(['info.html', '404.html', 'atelier.html', 'spatial.html']); // info : redirection ; atelier : page technique

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const strip = (h) => h.replace(/<[^>]+>/g, '').trim();
const files = fs.readdirSync('.').filter((f) => f.endsWith('.html') && !SKIP.has(f)).sort();
const urlOf = (f) => (f === 'index.html' ? `${SITE}/` : `${SITE}/${f.replace(/\.html$/, '')}`);
const ogImage = (f) => { const k = f.replace(/\.html$/, ''); return fs.existsSync(`assets/og/${k}.jpg`) ? `${SITE}/assets/og/${k}.jpg` : DEFAULT_IMG; };

const person = { '@type': 'Person', '@id': `${SITE}/#person`, name: NAME, jobTitle: JOB, url: `${SITE}/`, sameAs: SAME_AS,
  worksFor: { '@type': 'Organization', name: 'SNCF Gares & Connexions' },
  alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'Université Sorbonne Paris Nord' }],
  knowsAbout: ['Management de la qualité', 'Prévention des risques professionnels', 'Maintenance réglementaire', 'Amélioration continue', 'Automatisation des processus'] };

const seen = new Map();
const changed = [];
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  html = html.replace(/\n?<!-- seo:start -->[\s\S]*?<!-- seo:end -->\n?/, '\n').replace(/\n\n<\/head>/, '\n</head>');
  const title = unesc((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const desc = unesc((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const h1 = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
  if (!title || !desc) throw new Error(`${f} : titre ou description manquant`);
  if (seen.has(title)) throw new Error(`${f} : titre dupliqué avec ${seen.get(title)}`);
  seen.set(title, f);
  const url = urlOf(f), img = ogImage(f);
  const has = (re) => re.test(html);
  const tags = [];
  if (!has(/<link rel="canonical"/)) tags.push(`<link rel="canonical" href="${url}">`);
  const og = (p, c) => { if (!has(new RegExp(`property="og:${p}"`))) tags.push(`<meta property="og:${p}" content="${esc(c)}">`); };
  og('type', f === 'index.html' ? 'website' : f.startsWith('article-') ? 'article' : 'website');
  og('site_name', NAME); og('locale', 'fr_FR'); og('title', title); og('description', desc); og('url', url); og('image', img);
  if (!has(/property="og:image:width"/)) { tags.push('<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">'); }
  const tw = (n, c) => { if (!has(new RegExp(`name="twitter:${n}"`))) tags.push(`<meta name="twitter:${n}" content="${esc(c)}">`); };
  tw('card', 'summary_large_image'); tw('title', title); tw('description', desc); tw('image', img);
  let ld = [];
  const crumbs = (name) => ({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: 'Projets', item: `${SITE}/#projets` },
    { '@type': 'ListItem', position: 3, name, item: url }] });
  if (f === 'index.html') ld = [{ '@context': 'https://schema.org', '@type': 'ProfilePage', '@id': `${SITE}/#profile`, url: `${SITE}/`, name: title, description: desc, inLanguage: 'fr', mainEntity: person }];
  else if (/^(projet|article)-/.test(f)) ld = [{ '@context': 'https://schema.org', '@type': 'CreativeWork', name: h1 || title, description: desc, url, image: img, inLanguage: 'fr', author: { '@id': `${SITE}/#person`, '@type': 'Person', name: NAME, url: `${SITE}/` } }, { '@context': 'https://schema.org', ...crumbs(h1 || title) }];
  for (const o of ld) tags.push(`<script type="application/ld+json">${JSON.stringify(o)}</script>`);
  const block = `<!-- seo:start -->\n${tags.join('\n')}\n<!-- seo:end -->\n`;
  const out = html.replace('</head>', `${block}</head>`);
  const before = fs.readFileSync(f, 'utf8');
  if (out !== before) { changed.push(f); if (!check) fs.writeFileSync(f, out); }
}

// sitemap : une entrée par page indexable (pas de lastmod : une date calculée rendrait la vérification dépendante de l'historique git)
const entries = [...files.map((f) => urlOf(f)), `${SITE}/thaleolithic/`];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
for (const [name, content] of [['sitemap.xml', sitemap], ['robots.txt', robots]]) {
  if (!fs.existsSync(name) || fs.readFileSync(name, 'utf8') !== content) { changed.push(name); if (!check) fs.writeFileSync(name, content); }
}
console.log(check ? `${changed.length} fichier(s) à régénérer` : `${changed.length} fichier(s) mis à jour, ${files.length} pages, ${entries.length} URL dans le sitemap`);
if (check && changed.length) { console.log(changed.join('\n')); process.exit(1); }
