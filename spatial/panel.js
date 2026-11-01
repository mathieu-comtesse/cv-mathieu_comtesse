// ProjectDetailPanel : fiche détaillée en panneau flottant. Le contenu vient des pages d'étude existantes (article-*.html, projet-*.html),
// jamais copié : un seul texte pour le site et pour la vue spatiale. Les chiffres viennent de js/indicators.js.
import { INDICATORS, NATURES, CONFIDENCE } from '../js/indicators.js';

const GAIN_IDS = { finance: ['finance'], vmvre: ['vmvre'], moteur44: ['moteur44'], vre: ['vre'], powerbi: ['powerbi', 'pp-consultation'], gares: ['gares'] };
const f = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const span = (a, b) => (a === b ? f(a) : `${f(a)} à ${f(b)}`);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export class ProjectDetailPanel {
  constructor(el, { onClose }) {
    this.el = el; this.onClose = onClose; this.entry = null; this.opener = null; this.cache = new Map();
    el.innerHTML = `<div class="sp-p-head"><p class="sp-p-k rf-mono"></p><h2 class="sp-p-t" tabindex="-1"></h2><p class="sp-p-s"></p>
      <button type="button" class="sp-p-x" aria-label="Fermer la fiche"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
      <nav class="sp-p-nav" aria-label="Rubriques de la fiche"></nav><div class="sp-p-body" tabindex="0"></div>
      <p class="sp-p-foot"><a class="sp-p-full" href="">Ouvrir la page complète</a></p>`;
    this.body = el.querySelector('.sp-p-body'); this.nav = el.querySelector('.sp-p-nav');
    el.querySelector('.sp-p-x').addEventListener('click', () => this.onClose());
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.onClose(); } });
    // la molette défile dans le panneau et n'atteint jamais la caméra
    el.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
  }
  get isOpen() { return !this.el.hidden; }
  async open(entry, domainLabel, opener) {
    this.entry = entry; this.opener = opener || document.activeElement; this.el.hidden = false;
    requestAnimationFrame(() => this.el.classList.add('sp-open'));
    this.el.querySelector('.sp-p-k').textContent = String(entry.index).padStart(2, '0') + ' · ' + domainLabel;
    this.el.querySelector('.sp-p-t').textContent = entry.title; this.el.querySelector('.sp-p-s').textContent = entry.sub || '';
    this.el.querySelector('.sp-p-full').href = (entry.study || entry.slug) + '.html';
    this.body.innerHTML = '<p class="sp-p-wait">Chargement de la fiche…</p>'; this.nav.innerHTML = '';
    this.el.querySelector('.sp-p-t').focus({ preventScroll: true });
    const sections = await this.sections(entry);
    if (this.entry !== entry) return;
    this.body.replaceChildren(...sections.nodes);
    this.nav.innerHTML = sections.titles.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('');
    this.nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); this.body.querySelector('#' + a.getAttribute('href').slice(1))?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }));
    this.body.scrollTop = 0;
  }
  close() {
    if (!this.isOpen) return;
    this.el.classList.remove('sp-open'); this.el.hidden = true;
    const o = this.opener; this.entry = null; if (o && o.isConnected) o.focus({ preventScroll: true });
  }
  /** Sections : présentation (page du projet), étude détaillée (page d'étude) et chiffres avec méthodologie. */
  async sections(entry) {
    const nodes = [], titles = [], mk = (id, title, kids) => {
      const s = document.createElement('section'); s.id = 'sp-' + entry.id + '-' + id; s.className = 'sp-p-sec';
      const h = document.createElement('h3'); h.textContent = title; s.append(h, ...kids); nodes.push(s); titles.push([s.id, title]);
    };
    const pageBody = async (url) => {
      if (this.cache.has(url)) return this.cache.get(url).cloneNode(true);
      try {
        const r = await fetch(url, { credentials: 'same-origin' }); if (!r.ok) return null;
        const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
        const b = doc.querySelector('.rf-post-body'); if (!b) return null;
        b.querySelectorAll('script,style,nav,.rf-flow,canvas,iframe').forEach((x) => x.remove());
        b.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
        b.querySelectorAll('a[href]').forEach((a) => { const h = a.getAttribute('href'); if (!/^(https?:|mailto:|#)/.test(h)) a.setAttribute('href', h); a.removeAttribute('target'); });
        b.querySelectorAll('.rf-rv').forEach((x) => x.classList.remove('rf-rv'));
        this.cache.set(url, b); return b.cloneNode(true);
      } catch { return null; }
    };
    const fiche = await pageBody(entry.slug + '.html');
    const lede = document.createElement('p'); lede.className = 'sp-p-lede'; lede.textContent = entry.stat?.context || entry.sub || '';
    mk('presentation', 'Présentation', fiche ? [...(entry.stat ? [lede] : []), ...fiche.children] : [lede]);
    if (entry.tech?.length) { const ul = document.createElement('ul'); ul.className = 'sp-p-tags'; entry.tech.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.append(li); }); mk('technologies', 'Technologies', [ul]); }
    const ids = GAIN_IDS[entry.card];
    if (ids || entry.stat) mk('resultats', 'Résultats et méthodologie du calcul', this.figures(entry, ids));
    if (entry.study) {
      const etude = await pageBody(entry.study + '.html');
      if (etude) mk('etude', 'Étude détaillée', [...etude.children]);
    }
    return { nodes, titles };
  }
  figures(entry, ids) {
    const out = [];
    if (entry.stat) { const p = document.createElement('p'); p.innerHTML = `<b>${esc(entry.stat.value)}</b> ${esc(entry.stat.context)}`; out.push(p); }
    if (entry.money?.value) { const p = document.createElement('p'); p.innerHTML = `<b>${esc(entry.money.value)}</b> ${esc(entry.money.context)}`; out.push(p); }
    if (!ids) { const p = document.createElement('p'); p.className = 'sp-p-note'; p.textContent = 'Ce projet n’ajoute aucun montant au total annuel de la page Gains.'; out.push(p); return out; }
    const rows = ids.flatMap((id) => INDICATORS.filter((i) => i.gainId === id && i.unit === 'h/an'));
    for (const i of rows) {
      const d = document.createElement('details'); d.className = 'sp-p-calc';
      const val = INDICATORS.find((x) => x.id === i.id.replace('.heures', '.valorisation'));
      d.innerHTML = `<summary>Méthodologie du calcul : ${esc(i.scope)}</summary>
        <dl><dt>Nature</dt><dd>${NATURES[i.nature].label}</dd><dt>Temps libéré</dt><dd>${span(i.min, i.max)} h par an</dd><dt>Valorisation</dt><dd>${span(val.min, val.max)} euros par an, temps de travail valorisé, pas une dépense évitée</dd>
        <dt>Formule</dt><dd>${esc(i.formula)}</dd><dt>Base</dt><dd>${esc(i.method)}</dd><dt>Hypothèses</dt><dd>${i.assumptions.map(esc).join('. ')}</dd>
        <dt>Source</dt><dd>${esc(i.source)}</dd><dt>Période</dt><dd>${esc(i.period)}</dd><dt>Validation</dt><dd>${esc(CONFIDENCE[i.confidence])}. Date de vérification : ${i.verifiedOn || 'aucune à ce jour'}.</dd></dl>`;
      out.push(d);
    }
    return out;
  }
}
