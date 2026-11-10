/* Génère le HTML d'une vitrine « outil réel » (cadre .cv-pframe du parcours). Sans JavaScript, tout est lisible : fenêtres visibles, console complète, résultat affiché. */
import { SHOWCASE } from './config.mjs';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* les titres et le résultat viennent de la fiche : déjà du HTML valide (entités comprises), on ne les échappe pas une seconde fois */
const q = (s) => String(s ?? '').replace(/"/g, '&quot;');
const ICON = { sharepoint: 'S', pdf: 'PDF', excel: 'X', app: '', console: '>_' };
const BADGE = { authentic: 'Interface locale', demo: 'Démo · données fictives', mockup: 'Maquette', missing: 'Capture à fournir' };
const ratio = (a) => { const [w, h] = String(a).split('/').map(Number); return w / (h || 1); };
/* hauteur d'une fenêtre en % de la hauteur de la scène (scène 16/10, barre de titre ≈ 5 %) */
const hOf = (w, a) => w / (ratio(a) * .625) + 5;
/* cascade automatique : les fenêtres s'empilent en diagonale, la dernière au premier plan ; tout reste dans la scène par construction */
function cascade(wins) {
  const n = wins.length, w = n > 4 ? 52 : 56, stepX = n > 1 ? Math.min(9.5, (98 - w - 2) / (n - 1)) : 0;
  const hmax = Math.max(...wins.map((x) => hOf(w, x.a))), stepY = n > 1 ? Math.max(0, Math.min(8.5, (96 - 3 - hmax) / (n - 1))) : 0;
  return wins.map((x, i) => ({ ...x, box: x.box || { x: +(2 + i * stepX).toFixed(1), y: +(3 + i * stepY).toFixed(1), w } }));
}
const box = (b, a) => `--x:${b.x}%;--y:${b.y}%;--w:${b.w}%;--a:${a}`;
const win = (w) => {
  const zoomable = w.src && w.status !== 'missing', badge = w.badge || BADGE[w.status];
  const body = zoomable
    ? `<img class="sc-img" data-src="${esc(w.src)}" ${w.big ? `data-big="${esc(w.big)}"` : ''} alt="${esc(w.alt)}" decoding="async" draggable="false">`
    : `<div class="sc-slot"><span class="sc-ico" aria-hidden="true">${ICON[w.kind] || ''}</span><b>Capture à fournir</b><span>${esc(w.need)}</span></div>`;
  return `<figure class="sc-win" data-id="${w.id}" data-kind="${w.kind}" data-status="${w.status}" data-step="${w.step}" style="${box(w.box, w.a)}"${zoomable ? ` tabindex="0" role="button" aria-label="Agrandir : ${esc(w.title)}" data-caption="${esc(w.caption || '')}" data-badge="${esc(badge)}"` : ' aria-label="' + esc(w.title + ' : capture à fournir') + '"'}>` +
    `<div class="sc-bar"><i></i><i></i><i></i><span class="sc-title">${esc(w.title)}</span><em class="sc-badge" data-status="${w.status}">${esc(badge)}</em></div><div class="sc-body">${body}</div></figure>`;
};
/** @param {string} slug fiche (projet-xxx)  @param {{steps:string[], result:{title:string,text:string}}} ctx  titres des étapes « Comment ça marche » et résultat, repris de la fiche */
export function showcaseHTML(slug, ctx) {
  const c = SHOWCASE[slug]; if (!c) return '';
  const N = c.steps.length, lines = ctx.steps.slice(0, 7), wins = c.layout === 'cascade' ? cascade(c.windows) : c.windows;
  const con = c.console ? `<figure class="sc-win sc-console" data-kind="console" data-step="${c.console.step}" style="${box(c.console.box, c.console.a)}" aria-label="${esc(c.console.title)} : animation pédagogique du déroulé"><div class="sc-bar"><i></i><i></i><i></i><span class="sc-title">${esc(c.console.title)}</span><em class="sc-badge" data-status="demo">Animation pédagogique</em></div>` +
    `<ol class="sc-log" data-lines="${q(JSON.stringify(lines))}">${lines.map((l) => `<li><span class="sc-p">✓</span>${l}</li>`).join('')}</ol></figure>` : '';
  const res = `<aside class="sc-result" data-step="${N}" aria-label="Résultat"><small>Résultat</small><b>${ctx.result.title}</b>${ctx.result.text ? `<p>${ctx.result.text}</p>` : ''}<a class="sc-fiche" href="${slug}.html">Fiche complète du projet</a></aside>`;
  const tabs = c.steps.map((t, i) => `<button type="button" role="tab" data-go="${i + 1}" aria-selected="${i === N - 1}"><i>${i + 1}</i>${esc(t)}</button>`).join('');
  const kinds = [...new Set(c.windows.map((w) => w.status))];
  const legend = ['authentic', 'demo', 'mockup', 'missing'].filter((k) => kinds.includes(k)).map((k) => ({ authentic: 'Interface locale : capture de l’interface d’un fichier HTML ouvert hors connexion, sans traitement réel.', demo: 'Démo : données fictives ou animation pédagogique, jamais un écran de production.', mockup: 'Maquette : référence graphique.', missing: 'Capture à fournir : emplacement, aucune image n’est simulée.' }[k])).join(' ');
  return `<section class="cv-pframe cv-pf-showcase" data-showcase="${slug}" data-steps="${N}" data-layout="${c.layout}" style="--html-in-canvas-rise:.5" aria-label="${esc(c.label)}">` +
    `<h4>${esc(c.label)}</h4><div class="sc-stage" data-step="${N}">${wins.map(win).join('')}${con}${res}</div>` +
    `<div class="sc-tabs" role="tablist" aria-label="Étapes du traitement">${tabs}</div>` +
    `<p class="cv-pf-note sc-note">${esc(legend)}${c.note ? ' ' + esc(c.note) : ''}</p></section>`;
}
