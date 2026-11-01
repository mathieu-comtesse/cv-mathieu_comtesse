// Remplit parcours.html depuis le site : sommaire, graphe des thématiques de l'accueil (étoiles reliées aux illustrations),
// et une section par thématique des projets professionnels, chaque projet repris de sa fiche
// (idée, objet en action, gains, étapes « Comment ça marche »). La page reste du HTML lisible sans JavaScript.
// Usage : node tools/build-parcours.mjs   (relancer après toute modification de l'accueil ou d'une fiche)
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', laquo: '«', raquo: '»' };
const text = (h) => h.replace(/<[^>]+>/g, '').replace(/&(#\d+|\w+);/g, (m, e) => e[0] === '#' ? String.fromCharCode(+e.slice(1)) : ENT[e] ?? m).replace(/\s+/g, ' ').trim();
const first = (re, s) => { const m = re.exec(s); return m ? text(m[1]) : ''; };

/* accueil : sections, thématiques (h2) et tuiles */
const index = read('index.html');
const main = index.slice(index.indexOf('<main'));
const themes = [];
let section = '';
const re = /class="rf-chip[^"]*">(?:<svg[\s\S]*?<\/svg>)?([^<]+)|<h2[^>]*>([^<]+)<\/h2>(?:\s*<p>([\s\S]*?)<\/p>)?|<a class="rf-tile[^"]*" href="([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?rf-tile-title">([^<]+)<\/span>(?:<span class="rf-tile-meta">([^<]*)<\/span>)?/g;
for (const m of main.matchAll(re)) {
  if (m[1]) section = text(m[1]);
  else if (m[2]) { if (section && !/contact/i.test(m[2])) themes.push({ section, title: text(m[2]), intro: m[3] ? text(m[3]) : '', tiles: [] }); }
  else if (themes.length) themes.at(-1).tiles.push({ href: m[4], img: m[5].split('?')[0], title: text(m[6]), meta: m[7] ? text(m[7]) : '' });
}

/* fiches des projets professionnels */
const FIG = { 'projet-finance': 'finance', 'projet-vmvre': 'vm', 'projet-moteur44': 'moteur', 'projet-pa': 'pp', 'projet-cerfa': 'cerfa', 'projet-vre': 'vre',
  'projet-lecteur-vre': 'vrestudio-musicbox', 'projet-powerbi': 'powerbi', 'projet-studio': 'studio', 'projet-suivi': 'suivi', 'projet-gares': 'gares' };
const part = (body, title) => { const i = body.indexOf(`<h2>${title}</h2>`); if (i < 0) return ''; const rest = body.slice(i + title.length + 9); const j = rest.indexOf('<h2>'); return j < 0 ? rest : rest.slice(0, j); };
const projects = {};
for (const [slug, fig] of Object.entries(FIG)) {
  const h = read(slug + '.html');
  const body = h.slice(h.indexOf('<div class="rf-post-body">'));
  const gains = [...part(body, 'Ce que ça change').matchAll(/<span><small>([^<]+)<\/small><b>([^<]+)<\/b>/g)].map((m) => ({ k: text(m[1]), v: text(m[2]) }));
  const steps = [...part(body, 'Comment ça marche').matchAll(/<li class="rf-flow-step[^>]*>[\s\S]*?<h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/li>/g)].map((m) => ({ t: text(m[1]), p: text(m[2]) }));
  projects[slug] = {
    href: slug + '.html', fig,
    kicker: first(/rf-kicker">([\s\S]*?)<\/p>/, h),
    title: first(/<h1>([\s\S]*?)<\/h1>/, h),
    sub: first(/rf-post-sub">([\s\S]*?)<\/p>/, h),
    object: first(/<span>Objet<\/span><b>([\s\S]*?)<\/b>/, h),
    idea: first(/<p>([\s\S]*?)<\/p>/, part(body, 'L’idée')),
    action: first(/<p>([\s\S]*?)<\/p>/, part(body, 'L’objet en action')),
    team: first(/<p>([\s\S]*?)<\/p>/, part(body, 'Pour l’équipe')),
    gains, steps
  };
  if (!projects[slug].title || steps.length < 3) throw new Error('fiche incomplète : ' + slug);
}
/* rendu HTML */
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PRO = themes.filter((t) => t.section === 'Projets professionnels');
const NAV = ['Faire fonctionner', 'Fichiers retrouvés', 'Construire une fois', 'Savoir où regarder'];
const COLORS = ['#5b21b6', '#a00e5c', '#0f8f30', '#1d4ed8'];
const sentences = (t) => (t.match(/[^.!?]+[.!?]+/g) || [t]).map((x) => x.trim()).filter(Boolean);
const two = (n) => String(n).padStart(2, '0');

const sommaire = [...NAV, 'Expérience', 'Compétences', 'Formation', 'Contact'].map((n, i) => `<li><span>${two(i + 1)}</span>${esc(n)}</li>`).join('');
const graphe = '<ul class="pc-graph-list">' + themes.map((t, i) => `<li data-hub="${two(i + 1)} ${esc(t.title)}"><span>${two(i + 1)} ${esc(t.title)}</span><ul>` +
  t.tiles.map((x) => `<li><a href="${esc(x.href)}.html"><img src="${esc(x.img)}" alt="" width="84" height="60" loading="lazy">${esc(x.title)}</a></li>`).join('') + '</ul></li>').join('') + '</ul>';

const proj = (slug) => {
  const p = projects[slug], tile = PRO.flatMap((t) => t.tiles).find((x) => x.href === slug);
  return `<article class="pc-proj" data-fig="${p.fig}">
  <div class="pc-box pc-card pc-pcard" data-box="0.45" data-callout="${esc(p.title)}" data-callout-sub="${esc(tile ? tile.meta : p.sub)}" data-href="${p.href}">
    <p class="pc-kicker">${esc(p.kicker)}</p><h3>${esc(p.title)}</h3><p class="pc-sub">${esc(p.sub)}</p>
    <dl class="pc-gains">${p.gains.map((g) => `<div><dt>${esc(g.k)}</dt><dd>${esc(g.v)}</dd></div>`).join('')}</dl>
    <p>${esc(p.idea)}</p><a class="pc-more" href="${p.href}">Lire la fiche →</a>
  </div>
  <div class="pc-float" data-plane data-float><p class="pc-kicker">L’objet en action${p.object ? ' · ' + esc(p.object) : ''}</p><p>${esc(p.action)}</p></div>
  <h4 class="pc-how" data-plane>Comment ça marche</h4>
  <ol class="pc-steps" data-steps>${p.steps.map((s, i) => `<li class="pc-step" data-plane data-step><b>${two(i + 1)}</b><strong>${esc(s.t)}</strong><span>${esc(s.p)}</span></li>`).join('')}</ol>
</article>`;
};
const projets = PRO.map((t, i) => `<section class="pc-sec" data-section="${NAV[i]}" data-color="${COLORS[i]}" aria-labelledby="s-p${i}">
  <h2 class="pc-h" id="s-p${i}" data-plane>${esc(t.title)}</h2>
  <div class="pc-notes">${sentences(t.intro || 'Projets professionnels.').slice(0, 4).map((x) => `<p class="pc-note" data-plane data-note>${esc(x)}</p>`).join('')}</div>
  ${t.tiles.map((x) => proj(x.href)).join('\n  ')}
</section>`).join('\n\n');

let html = read('parcours.html');
const fill = (name, content) => { html = html.replace(new RegExp(`<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`), `<!-- ${name}:start -->${content}<!-- ${name}:end -->`); };
fill('sommaire', sommaire); fill('graphe', graphe); fill('projets', '\n' + projets + '\n');
writeFileSync(new URL('parcours.html', ROOT), html);
console.log(`${themes.length} thématiques, ${Object.keys(projects).length} projets → parcours.html`);
