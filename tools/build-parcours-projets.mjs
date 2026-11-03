// Reprend le contenu complet de chaque fiche projet (projet-*.html) dans parcours.html, mis en page comme les cartes Shopify Editions :
// un cadre principal (idée, objet en action et légende à gauche, machine à droite), deux demi-cadres (le projet, ce que ça change),
// puis, hors cadre, pour l'équipe, comment ça marche et construction.
// Usage : node tools/build-parcours-projets.mjs   (relancer après toute modification d'une fiche)
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
const part = (body, title) => { const i = body.indexOf(`<h2>${title}</h2>`); if (i < 0) return ''; const rest = body.slice(i + title.length + 9); const j = rest.indexOf('<h2>'); return (j < 0 ? rest : rest.slice(0, j)).trim(); };
const one = (re, s) => (re.exec(s) || ['', ''])[1].trim();

let html = read('parcours.html');
const START = /<article id="cv-[^"]*"[^>]*data-cv-type="machine"[^>]*>/g;
const out = [];
let at = 0, count = 0;
for (const m of html.matchAll(START)) {
  const copy = html.indexOf('<div data-card-copy', m.index);
  const ends = ['</article></div></div></article>', '<!-- /pf --></article>'].map((e) => [html.indexOf(e, copy), e]).filter(([i]) => i > 0).sort((a, b) => a[0] - b[0]);
  const [end, marker] = ends[0];
  const seg = html.slice(copy, end);
  const slug = one(/data-(?:href|fiche)="(?:https:\/\/comtesse\.me\/)?(projet-[a-z0-9-]+)/, seg);
  const machine = (/<div class="cv-machine"[\s\S]*?<div class="cv-machine-controls"[^>]*><\/div><\/div>/.exec(seg) || [''])[0];
  if (!slug || !machine) throw new Error('article incomplet à ' + m.index);
  const page = read(slug + '.html');
  const body = page.slice(page.indexOf('<div class="rf-post-body">'));
  const kicker = one(/rf-kicker">([\s\S]*?)<\/p>/, page), title = one(/<h1>([\s\S]*?)<\/h1>/, page), sub = one(/rf-post-sub">([\s\S]*?)<\/p>/, page);
  const action = part(body, 'L’objet en action').replace(/<ul class="rf-legend">/, '<ul class="cv-pf-legend">').replace(/class="rf-legend-note"/, 'class="cv-pf-note"');
  const gains = part(body, 'Ce que ça change')
    .replace(/<div class="rf-gains rf-post-gains">([\s\S]*?)<\/div>/, (_, g) => '<dl class="cv-pf-gains">' + [...g.matchAll(/<span><small>([\s\S]*?)<\/small><b>([\s\S]*?)<\/b>(?:<i>([\s\S]*?)<\/i>)?<\/span>/g)].map((x) => `<div><dt>${x[1]}</dt><dd>${x[2]}</dd>${x[3] ? `<p>${x[3]}</p>` : ''}</div>`).join('') + '</dl>')
    .replace(/class="rf-post-note"/g, 'class="cv-pf-note"');
  const flow = (/<div class="rf-flow"[\s\S]*?<\/ol><\/div>/.exec(body) || [''])[0].replace(/ rf-tl-rv/g, '');
  const opt = (t, cls) => { const c = part(body, t); return c ? `<div class="${cls}"><h4>${t}</h4>${c}</div>` : ''; };
  out.push(html.slice(at, copy) +
`<div data-card-copy="" class="cv-card-content cv-pframe cv-pframe-main" data-fiche="${slug}" style="--html-in-canvas-rise:.45"><div class="cv-pf-text"><p class="cv-pf-kicker">${kicker}</p><h3 class="trim-cap font-sans font-medium">${title}</h3><p class="cv-pf-sub">${sub}</p><h4>L’idée</h4>${part(body, 'L’idée')}<h4>L’objet en action</h4>${action}</div>${machine}</div><div class="cv-card-body"><div class="cv-legacy cv-project" data-html-in-canvas-flat=""><div class="cv-pf-pair"><section class="cv-pframe cv-pf-half" style="--html-in-canvas-rise:.45"><h4>Le projet</h4>${part(body, 'Le projet')}${part(body, 'Distinction') ? '<h4>Distinction</h4>' + part(body, 'Distinction') : ''}</section><section class="cv-pframe cv-pf-half" style="--html-in-canvas-rise:.45"><h4>Ce que ça change</h4>${gains}</section></div>${opt('Pour l’équipe', 'cv-pf-more')}<div class="rf-post-body pc-flowwrap" data-flow=""><h2>Comment ça marche</h2>${flow}</div>${opt('Construction', 'cv-pf-more')}</div></div><!-- /pf -->`);
  at = end + marker.length - '</article>'.length;
  count++;
}
html = out.join('') + html.slice(at);
writeFileSync(new URL('parcours.html', ROOT), html);
console.log(count + ' projets repris des fiches → parcours.html');
