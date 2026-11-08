// Reprend le contenu complet de chaque fiche projet (projet-*.html) dans index.html, mis en page comme les cartes Shopify Editions :
// à gauche un cadre (idée, objet en action et légende), à droite la machine 3D hors cadre, posée sur le chemin ; deux demi-cadres
// (le projet, ce que ça change) ; pour l'équipe ; comment ça marche (cinq étapes + processus détaillé repliable) ; le bouton « Voir la démonstration » flotte sur la machine ; construction.
// Usage : node tools/build-parcours-projets.mjs   (relancer après toute modification d'une fiche)
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
const part = (body, title) => { const i = body.indexOf(`<h2>${title}</h2>`); if (i < 0) return ''; const rest = body.slice(i + title.length + 9); const j = rest.indexOf('<h2>'); return (j < 0 ? rest : rest.slice(0, j)).trim(); };
const one = (re, s) => (re.exec(s) || ['', ''])[1].trim();

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
  const machine = BP_FIG[fig] ? `<div class="cv-bpfig"><iframe class="rf-bp-frame" src="figures-livre/${BP_FIG[fig]}.html?v=b6" title="${figTitle}" scrolling="no" loading="lazy"></iframe></div>` : `<div class="cv-machine" data-cv-machine="${fig}" data-proj="${slug}"><img src="https://comtesse.me/assets/figures/${fig}-light.webp" alt="Machine du projet ${figTitle}" loading="lazy"><canvas aria-label="Machine interactive ${figTitle}"></canvas><div class="cv-cta-row"><button type="button" class="cv-magic3d">Voir la magie</button><button type="button" class="cv-explore3d">Explorer la machine</button></div></div>`;
  const from = page.indexOf('<div class="rf-post-body">'), to = page.slice(from).search(/<\/div>\s*(?:<nav class="rf-post-pn"|<\/article>)/);
  if (to < 0) throw new Error('fin du corps introuvable : ' + slug);
  const body = page.slice(from, from + to);
  const kicker = one(/rf-kicker">([\s\S]*?)<\/p>/, page), title = one(/<h1>([\s\S]*?)<\/h1>/, page), sub = one(/rf-post-sub">([\s\S]*?)<\/p>/, page);
  const action = part(body, 'L’objet en action').replace(/<ul class="rf-legend">/, '<ul class="cv-pf-legend">').replace(/class="rf-legend-note"/, 'class="cv-pf-note"');
  const gains = part(body, 'Ce que ça change')
    .replace(/<div class="rf-gains rf-post-gains">([\s\S]*?)<\/div>/, (_, g) => '<dl class="cv-pf-gains">' + [...g.matchAll(/<span><small>([\s\S]*?)<\/small><b>([\s\S]*?)<\/b>(?:<i>([\s\S]*?)<\/i>)?<\/span>/g)].map((x) => `<div><dt>${x[1]}</dt><dd>${x[2]}</dd>${x[3] ? `<p>${x[3]}</p>` : ''}</div>`).join('') + '</dl>')
    .replace(/class="rf-post-note"/g, 'class="cv-pf-note"');
  const flow = (/<div class="rf-marche"[\s\S]*?<\/details><\/div>/.exec(body) || [''])[0].replace(/ rf-tl-rv/g, '').replace('<div class="rf-marche"', `<div class="rf-marche" data-proj="${slug}"`);
  const opt = (t, cls) => { const c = part(body, t); return c ? `<div class="${cls}"><h4>${t}</h4>${c}</div>` : ''; };
  out.push(html.slice(at, copy) +
`<div data-card-copy="" class="cv-card-content cv-pf-main" data-fiche="${slug}"><div class="cv-pframe cv-pf-text" style="--html-in-canvas-rise:.45"><p class="cv-pf-kicker">${kicker}</p><h3 class="trim-cap font-sans font-medium">${title}</h3><p class="cv-pf-sub">${sub}</p><h4>L’idée</h4>${part(body, 'L’idée')}<h4>L’objet en action</h4>${action}</div>${machine}</div><div class="cv-card-body"><div class="cv-legacy cv-project" data-html-in-canvas-flat=""><div class="cv-pf-pair"><section class="cv-pframe cv-pf-half" style="--html-in-canvas-rise:.45"><h4>Le projet</h4>${part(body, 'Le projet')}${part(body, 'Distinction') ? '<h4>Distinction</h4>' + part(body, 'Distinction') : ''}</section><section class="cv-pframe cv-pf-half" style="--html-in-canvas-rise:.45"><h4>Ce que ça change</h4>${gains}</section></div>${opt('Pour l’équipe', 'cv-pf-more')}<div class="cv-pf-flowbox"><div class="rf-post-body pc-flowwrap cv-pframe cv-pf-flow" data-flow="" style="--html-in-canvas-rise:.45"><h2>Comment ça marche</h2>${flow}</div></div>${opt('Construction', 'cv-pf-more')}</div></div><!-- /pf -->`);
  at = end + marker.length - '</article>'.length;
  count++;
}
html = out.join('') + html.slice(at);
writeFileSync(new URL('index.html', ROOT), html);
console.log(count + ' projets repris des fiches → index.html');
