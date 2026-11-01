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

const sommaire = [...NAV, 'Gains', 'Parcours', 'Compétences', 'Blog', 'Contact'].map((n, i) => `<li><span>${two(i + 1)}</span>${esc(n)}</li>`).join('');
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

/* gains : les mêmes données que la page Gains (js/annual-gains.js, js/indicators.js) */
const G = await import(new URL('js/annual-gains.js', ROOT).href), I = await import(new URL('js/indicators.js', ROOT).href);
const fr = (n, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d }).replace(/\u202f/g, ' ');
const span = (a, b, d = 0) => fr(a, d) + (a === b ? '' : ' à ' + fr(b, d));
const D = G.ANNUAL_DECLARED, mean = (k) => (D['min' + k] + D['max' + k]) / 2;
const rows = G.ANNUAL_GAINS.map((r) => { const n = I.INDICATORS.find((x) => x.id === r.id + '.heures');
  return `<tr><th scope="row">${esc(r.title)}</th><td>${esc(I.NATURES[n.nature].label)}${r.estimated ? ' (estimation)' : ''}</td><td>${span(r.minHours, r.maxHours)} h</td><td>${span(r.minMoney, r.maxMoney)} €</td></tr>`; }).join('');
const gains = `<section class="pc-sec" data-section="Gains" data-color="#7a1f4f" aria-labelledby="s-gains">
  <h2 class="pc-h" id="s-gains" data-plane>Les gains, en clair.</h2>
  <div class="pc-gainsrow">
    <div class="pc-pig" data-pig aria-hidden="true"></div>
    <div class="pc-box pc-card pc-stats" data-box="0.5" data-callout="Tirelire des gains annuels" data-callout-sub="Une pièce de 1 € par tranche de temps libéré" data-href="gains.html">
      <p class="pc-kicker">Du temps rendu aux équipes · volumes fournis</p>
      <p class="pc-stat"><b>${fr(mean('Money'))} €</b><span>par an, valorisés à ${fr(G.ANNUAL_RATE, 2)} €/h</span></p>
      <p class="pc-stat"><b>${fr(mean('Hours'))} h</b><span>${fr(mean('Hours') / G.HOURS_PER_FTE, 1)} postes équivalents</span></p>
      <p>Du temps libéré, pas une dépense évitée. Les estimations sont comptées à part.</p>
    </div>
  </div>
  <div class="pc-box pc-table" data-box="0.3"><table><caption>Gains annuels par outil</caption><thead><tr><th>Outil</th><th>Nature</th><th>Temps libéré</th><th>Valorisation</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>`;

/* parcours et compétences : la page Expériences */
const exp = read('experiences.html');
const entries = [...exp.matchAll(/<article class="rf-tl-entry[^"]*">([\s\S]*?)<\/article>/g)].map((m) => ({
  role: first(/rf-tl-role">([\s\S]*?)<\/p>/, m[1]), date: first(/rf-tl-date">([\s\S]*?)<\/p>/, m[1]),
  org: first(/rf-tl-date">[\s\S]*?<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/, m[1]), desc: first(/rf-tl-desc">([\s\S]*?)<\/p>/, m[1]) }));
const groups = [...exp.matchAll(/<div class="rf-sk-grp[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<div class="rf-sk-chips">([\s\S]*?)<\/div><\/div>/g)].map((m) => ({
  t: text(m[1]), chips: [...m[2].matchAll(/<span class="rf-chipx">([\s\S]*?)<span>([\s\S]*?)<\/span><\/span>/g)].map((c) => ({ t: text(c[2]), learning: /rf-chipx-b/.test(c[1]) })) }));
const parcours = `<section class="pc-sec" data-section="Parcours" data-color="#4b22b8" aria-labelledby="s-parcours">
  <div class="pc-exp-top">
    <div class="pc-live pc-hublot" data-live="hublot" aria-label="Hublot de train : tirer le store vers le haut ou vers le bas">
      <div class="rf-win" id="rf-win"><div class="rf-win-view" aria-hidden="true"><video class="rf-win-video" id="rf-win-video" loop muted playsinline preload="none" poster="assets/hublot/paysage-poster.webp" width="576" height="432"><source src="assets/hublot/paysage-redresse.mp4" type="video/mp4"></video></div><img class="rf-win-inner" src="assets/hublot/window-inner-frame.webp" width="300" height="240" alt="" draggable="false" aria-hidden="true"><div class="rf-win-glass"><div class="rf-win-shutter" id="rf-shutter"><img class="rf-win-panel" src="assets/hublot/window-shutter.webp" width="300" height="240" alt="" draggable="false" aria-hidden="true"><div class="rf-win-grip" id="rf-grip" role="slider" tabindex="0" aria-label="Ouverture du volet du hublot" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Fermé" aria-controls="rf-shutter"></div></div></div><img class="rf-win-outer" src="assets/hublot/window-outer-frame.webp" width="300" height="240" alt="" draggable="false" aria-hidden="true"></div>
    </div>
    <div class="pc-exp-title"><h2 class="pc-h" id="s-parcours" data-plane>Mon parcours jusqu’à présent</h2>
    <p class="pc-lead" data-plane>Quatre ans passés sur le rail, de la circulation à la sécurité en gare. À construire des outils, expérimenter et acquérir de nouvelles compétences à chaque étape.</p></div>
  </div>
  <div class="pc-cards">${entries.map((e) => `
    <article class="pc-box pc-card" data-box="0.4" data-callout="${esc(e.org)}" data-callout-sub="${esc(e.date)}"><p class="pc-kicker">${esc(e.date)} · ${esc(e.org)}</p><h3>${esc(e.role)}</h3><p>${esc(e.desc)}</p></article>`).join('')}
  </div>
</section>

<section class="pc-sec" data-section="Compétences" data-color="#b83a10" aria-labelledby="s-comp">
  <h2 class="pc-h" id="s-comp" data-plane>Compétences</h2>
  <p class="pc-note pc-legend" data-plane>Les compétences marquées ◐ sont en cours d’acquisition.</p>
  <div class="pc-cards pc-cards3">${groups.map((g) => `
    <div class="pc-box pc-skill" data-box="0.3"><h3>${esc(g.t)}</h3><p class="pc-chips">${g.chips.map((c) => `<span${c.learning ? ' class="pc-learning"' : ''}>${c.learning ? '◐ ' : ''}${esc(c.t)}</span>`).join('')}</p></div>`).join('')}
  </div>
</section>`;

/* blog : la page Blog (introduction, symbole infini, articles par rubrique) */
const blog = read('blog.html');
const bIntro = [...blog.slice(blog.indexOf('rf-bintro')).matchAll(/<(h1|p)[^>]*>([\s\S]*?)<\/\1>/g)].slice(0, 3).map((m) => text(m[2]));
const years = [...blog.matchAll(/<div class="rf-year[^"]*"><h2>([\s\S]*?)<\/h2><ul>([\s\S]*?)<\/ul><\/div>/g)].map((m) => ({ t: text(m[1]),
  arts: [...m[2].matchAll(/<a class="rf-art" href="([^"]+)"><span>([\s\S]*?)<\/span><i>([\s\S]*?)<\/i><\/a>/g)].map((a) => ({ href: a[1] + '.html', t: text(a[2]), k: text(a[3]) })) }));
const blogSec = `<section class="pc-sec" data-section="Blog" data-color="#0f53b7" aria-labelledby="s-blog">
  <div class="pc-live pc-inf" data-live="infini" aria-hidden="true"><canvas id="rf-inf"></canvas></div>
  <h2 class="pc-h" id="s-blog" data-plane>${esc(bIntro[0])}</h2>
  <div class="pc-notes pc-notes2">${bIntro.slice(1).map((t) => `<p class="pc-note" data-plane data-note>${esc(t)}</p>`).join('')}</div>
  <div class="pc-cards pc-cards3">${years.map((y) => `
    <nav class="pc-box pc-blogcol" data-box="0.3" aria-label="${esc(y.t)}"><p class="pc-kicker">${esc(y.t)}</p><ul>${y.arts.map((a) => `<li><a href="${esc(a.href)}">${esc(a.t)}</a><i>${esc(a.k)}</i></li>`).join('')}</ul></nav>`).join('')}
  </div>
</section>`;

let html = read('parcours.html');
const fill = (name, content) => { html = html.replace(new RegExp(`<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`), `<!-- ${name}:start -->${content}<!-- ${name}:end -->`); };
fill('sommaire', sommaire); fill('graphe', graphe); fill('projets', '\n' + projets + '\n');
fill('gains', '\n' + gains + '\n'); fill('parcours', '\n' + parcours + '\n'); fill('blog', '\n' + blogSec + '\n');
writeFileSync(new URL('parcours.html', ROOT), html);
console.log(`${themes.length} thématiques, ${Object.keys(projects).length} projets → parcours.html`);
