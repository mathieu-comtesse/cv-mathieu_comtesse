/* Génère le HTML d'une vitrine « outil réel » (cadre .cv-pframe du parcours). Sans JavaScript, tout est lisible : fenêtres visibles, console complète, résultat affiché. */
import { SHOWCASE } from './config.mjs';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* les titres et le résultat viennent de la fiche : déjà du HTML valide (entités comprises), on ne les échappe pas une seconde fois */
const q = (s) => String(s ?? '').replace(/"/g, '&quot;');
const ICON = { sharepoint: 'S', pdf: 'PDF', excel: 'X', app: '', console: '>_' };
const box = (b, a) => `--x:${b.x}%;--y:${b.y}%;--w:${b.w}%;--a:${a}`;
const win = (w) => {
  const auth = w.status === 'authentic', badge = auth ? 'Capture réelle' : 'Capture à fournir';
  const body = auth
    ? `<img class="sc-img" data-src="${esc(w.src)}" ${w.big ? `data-big="${esc(w.big)}"` : ''} alt="${esc(w.alt)}" decoding="async" draggable="false">`
    : `<div class="sc-slot"><span class="sc-ico" aria-hidden="true">${ICON[w.kind] || ''}</span><b>Capture à fournir</b><span>${esc(w.need)}</span></div>`;
  return `<figure class="sc-win" data-id="${w.id}" data-kind="${w.kind}" data-status="${w.status}" data-step="${w.step}" style="${box(w.box, w.a)}"${auth ? ` tabindex="0" role="button" aria-label="Agrandir : ${esc(w.title)}" data-caption="${esc(w.caption || '')}"` : ' aria-label="' + esc(w.title + ' : capture à fournir') + '"'}>` +
    `<div class="sc-bar"><i></i><i></i><i></i><span class="sc-title">${esc(w.title)}</span><em class="sc-badge" data-status="${w.status}">${badge}</em></div><div class="sc-body">${body}</div></figure>`;
};
/** @param {string} slug fiche (projet-xxx)  @param {{steps:string[], result:{title:string,text:string}}} ctx  titres des étapes « Comment ça marche » et résultat, repris de la fiche */
export function showcaseHTML(slug, ctx) {
  const c = SHOWCASE[slug]; if (!c) return '';
  const N = c.steps.length, lines = ctx.steps.slice(0, 7);
  const con = `<figure class="sc-win sc-console" data-kind="console" data-step="${c.console.step}" style="${box(c.console.box, c.console.a)}" aria-label="${esc(c.console.title)} : déroulé du traitement"><div class="sc-bar"><i></i><i></i><i></i><span class="sc-title">${esc(c.console.title)}</span></div>` +
    `<ol class="sc-log" data-lines="${q(JSON.stringify(lines))}">${lines.map((l) => `<li><span class="sc-p">✓</span>${l}</li>`).join('')}</ol></figure>`;
  const res = `<aside class="sc-result" data-step="${N}" aria-label="Résultat"><small>Résultat</small><b>${ctx.result.title}</b>${ctx.result.text ? `<p>${ctx.result.text}</p>` : ''}<a class="sc-fiche" href="${slug}.html">Fiche complète du projet</a></aside>`;
  const tabs = c.steps.map((t, i) => `<button type="button" role="tab" data-go="${i + 1}" aria-selected="${i === N - 1}"><i>${i + 1}</i>${esc(t)}</button>`).join('');
  const missing = c.windows.some((w) => w.status !== 'authentic');
  return `<section class="cv-pframe cv-pf-showcase" data-showcase="${slug}" data-steps="${N}" data-layout="${c.layout}" style="--html-in-canvas-rise:.5" aria-label="${esc(c.label)}">` +
    `<h4>${esc(c.label)}</h4><div class="sc-stage" data-step="${N}">${c.windows.map(win).join('')}${con}${res}</div>` +
    `<div class="sc-tabs" role="tablist" aria-label="Étapes du traitement">${tabs}</div>` +
    `<p class="cv-pf-note sc-note">${missing ? 'Les fenêtres « capture à fournir » sont des emplacements : aucune simulation n’est présentée comme une capture réelle. ' : ''}Les étapes reprennent celles de « Comment ça marche ».</p></section>`;
}
