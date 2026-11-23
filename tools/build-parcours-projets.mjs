// Construit l’aperçu de chaque projet dans index.html. Les fiches gardent le récit complet.
// Usage : node tools/build-parcours-projets.mjs   (relancer après toute modification d'une fiche)
import { readFileSync, writeFileSync } from 'node:fs';
import { showcaseHTML } from '../refonte/showcase/build.mjs';

const ROOT = new URL('..', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
const one = (re, s) => (re.exec(s) || ['', ''])[1].trim();

const summaries = {
  'projet-finance': 'Repère les dépassements budgétaires et préviens les équipes dès qu’un seuil est franchi.',
  'projet-vmvre': 'Du dépôt SharePoint au suivi Excel, les rapports VRE avancent automatiquement.',
  'projet-moteur44': 'Relie chaque contrôle Q18 à son rapport et retrouve-le dans le suivi.',
  'projet-pa': 'Classe les plans de prévention à leur arrivée et relance les dossiers à échéance.',
  'projet-cerfa': 'Vérifie les documents liés aux fluides frigorigènes et repère les pièces manquantes.',
  'projet-vre': 'Transforme les observations des rapports électriques en données à filtrer et à suivre.',
  'projet-lecteur-vre': 'Extrait les données des rapports et vérifie chaque champ dans le PDF.',
  'projet-powerbi': 'Réunit les données de suivi pour les analyser, les classer et les archiver.',
  'projet-studio': 'Compose un lecteur de PDF et réutilise ses règles sur toute une famille de documents.',
  'projet-suivi': 'Retrouve l’historique d’un ordre de travail, d’un équipement ou d’un bâtiment au même endroit.',
  'projet-gares': 'Identifie les gares à surveiller en priorité à partir des indicateurs disponibles.',
};
const horizontal = new Set(['projet-finance', 'projet-vmvre', 'projet-moteur44']);
const BP_FIG = {};   // figures du livre en dessin à plat (refonte/post.js : moteur 16, pp 52, vm 69) : non utilisées, ces trois projets sont en volume 3D
let html = read('index.html');
const START = /<article id="cv-[^"]*"[^>]*data-cv-type="machine"[^>]*>/g;
const out = [];
let at = 0, count = 0;
for (const m of html.matchAll(START)) {
  const copy = html.indexOf('<div data-card-copy', m.index);
  const ends = ['</article></div></div></article>', '<!-- /pf --></article>'].map((e) => [html.indexOf(e, copy), e]).filter(([i]) => i > 0).sort((a, b) => a[0] - b[0]);
  const [end, marker] = ends[0];
  const seg = html.slice(copy, end);
  const slug = one(/data-(?:href|fiche)="(?:https:\/\/comtesse\.me\/)?(projet-[a-z0-9-]+)/, seg);
  if (!slug) throw new Error('article incomplet à ' + m.index);
  const page = read(slug + '.html');
  // la machine 3D de la fiche
  const fig = one(/<figure class="rf-post-fig[^"]*" data-fig="([^"]+)"/, page);
  const figTitle = one(/<h1>([\s\S]*?)<\/h1>/, page);
  // machine 3D de chaque projet (Q18, PP et VRE · VM : volumes des figures du livre, repeints aux couleurs du dessin)
  const machine = BP_FIG[fig] ? `<div class="cv-bpfig"><iframe class="rf-bp-frame" src="figures-livre/${BP_FIG[fig]}.html?v=b6" title="${figTitle}" scrolling="no" loading="lazy"></iframe></div>` : `<div class="cv-machine" data-cv-machine="${fig}" data-proj="${slug}"><img src="https://comtesse.me/assets/figures/${fig}-light.webp" alt="Machine du projet ${figTitle}" loading="lazy"><canvas aria-label="Machine interactive ${figTitle}"></canvas><div class="cv-cta-row"><button type="button" class="cv-explore3d">Explorer la machine</button></div></div>`;
  const from = page.indexOf('<div class="rf-post-body">'), to = page.slice(from).search(/<\/div>\s*(?:<nav class="rf-post-pn"|<\/article>)/);
  if (to < 0) throw new Error('fin du corps introuvable : ' + slug);
  const body = page.slice(from, from + to);
  const summary = summaries[slug] || one(/rf-post-sub">([\s\S]*?)<\/p>/, page);
  const flow = (/<div class="rf-marche"[\s\S]*?<\/details><\/div>/.exec(body) || [''])[0].replace(/ rf-tl-rv/g, '').replace('<div class="rf-marche"', `<div class="rf-marche" data-proj="${slug}"`);
  /* vitrine « outil réel » (refonte/showcase/config.mjs) : étapes et résultat repris de la fiche, jamais inventés */
  const showcase = showcaseHTML(slug, {
    steps: [...flow.matchAll(/<li data-at="[^"]*"><span class="rf-marche-n"[^>]*>\d+<\/span><h3>([\s\S]*?)<\/h3>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').trim()),
    result: { title: one(/data-result-title="([^"]*)"/, flow), text: one(/data-result="([^"]*)"/, flow) }
  });
  const variant = horizontal.has(slug) ? 'horizontal' : 'stack';
  const start = m[0].replace(/ data-card-variant="[^"]*"/, '').replace(/>$/, ` data-card-variant="${variant}">`);
  // Le déroulé détaillé alimente les légendes et le lecteur « Voir la magie ».
  out.push(html.slice(at, m.index), start, html.slice(m.index+m[0].length, copy),
`<div data-card-copy="" class="cv-card-content cv-pf-main" data-fiche="${slug}" data-card-variant="${variant}"><div class="cv-pf-text"><h3>${figTitle}</h3><p>${summary}</p><a class="cv-pf-link" href="${slug}.html">Lire la fiche<span class="sr-only"> · ${figTitle}</span></a></div><div class="cv-pf-visual">${showcase}</div>${machine}<div class="cv-legacy" hidden>${flow}</div></div><!-- /pf -->`);
  at = end + marker.length - '</article>'.length;
  count++;
}
html = out.join('') + html.slice(at);
/* feuille de style et script de la vitrine : ajoutés une seule fois (idempotent) */
if (!html.includes('refonte/showcase.css')) { const tags = '<link rel="stylesheet" href="refonte/showcase.css?v=sc1"><script type="module" src="refonte/showcase.js?v=sc1"></script>', at0 = html.indexOf('<!-- seo:start -->'); html = at0 > 0 ? html.slice(0, at0) + tags + '\n' + html.slice(at0) : html.replace('</head>', tags + '</head>'); }   // avant le bloc SEO (tools/seo-build.mjs, à relancer ensuite)
writeFileSync(new URL('index.html', ROOT), html);
console.log(count + ' projets repris des fiches → index.html');
