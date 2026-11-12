/* Titres de thème en étoile (mode à plat) : chaque titre (« Faire fonctionner », « Fichiers retrouvés »…) devient le foyer d'une étoile.
 * Le libellé se place au centre, à côté d'un nœud carré blanc ; des branches en partent :
 *   - branches éditoriales, vers chaque fiche du thème (une par vrai projet, jamais plus) ;
 *   - branches graphiques, vers des points secondaires tirés du nom du thème (toujours les mêmes), reliés entre eux par des traits fins.
 * Les branches se tracent depuis le foyer à l'entrée dans l'écran, les points dérivent lentement et s'écartent un peu du curseur.
 * Code original ; tracé en SVG dans la grille des fiches. En chemin 3D, le moteur garde ses lettres en volume : l'étoile est masquée. */
const NS = 'http://www.w3.org/2000/svg';
const reduit = matchMedia('(prefers-reduced-motion: reduce)');
const style = document.createElement('style');
style.textContent = `
.cv-star-layer{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:0}
html.cv-parity-active .cv-star-layer{display:none}
html:not(.cv-parity-active) .cv-theme-heading.cv-star{position:relative;height:clamp(250px,30vw,400px);padding:0;border-top:0}
html:not(.cv-parity-active) .cv-theme-heading.cv-star h2{position:absolute;left:50%;top:50%;margin:0;transform:translate(calc(-100% - 16px),-50%);padding:3px 7px 4px;white-space:nowrap;font:700 15px/1 "Söhne Mono","JetBrains Mono",ui-monospace,monospace;letter-spacing:.01em;color:#fff;background:rgb(0 12 96 / .42)}
.cv-star-layer line{stroke:#fff;stroke-width:1;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;opacity:var(--o,.7);transition:stroke-dashoffset .9s cubic-bezier(.16,1,.3,1) var(--d,0s),opacity .25s,stroke-width .25s}
.cv-star-layer .vu line{stroke-dashoffset:0}
.cv-star-layer line.fort{stroke-width:2;--o:1}
.cv-star-layer line.lien{--o:.26}
.cv-star-layer line.fiche{stroke-width:1.5;--o:.92}
.cv-star-layer line.fiche.actif,.cv-star-layer g.tout line.fiche{stroke-width:2.6;--o:1}
.cv-star-layer g.tout line:not(.lien){--o:1}
.cv-star-layer circle,.cv-star-layer rect{fill:#fff;opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(.2);transition:opacity .35s var(--d,0s),transform .5s cubic-bezier(.16,1,.3,1) var(--d,0s)}
.cv-star-layer .vu circle,.cv-star-layer .vu rect{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.cv-star-layer line,.cv-star-layer circle,.cv-star-layer rect{transition:none}}
`;
document.head.append(style);

const hache = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; };
const alea = (g) => () => { g |= 0; g = g + 0x6D2B79F5 | 0; let t = Math.imul(g ^ g >>> 15, 1 | g); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const el = (nom, attrs = {}) => { const e = document.createElementNS(NS, nom); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

function installe() {
  const titres = [...document.querySelectorAll('.cv-theme-heading[data-cv-theme]')];
  if (!titres.length) return;
  const grilles = new Map();
  for (const titre of titres) {
    const grille = titre.parentElement; if (!grilles.has(grille)) grilles.set(grille, []);
    grilles.get(grille).push(titre);
  }
  const etoiles = [], souris = { x: -1e4, y: -1e4 };
  for (const [grille, liste] of grilles) {
    if (getComputedStyle(grille).position === 'static') grille.style.position = 'relative';
    const svg = el('svg', { class: 'cv-star-layer', 'aria-hidden': 'true' }); grille.prepend(svg);
    for (const titre of liste) {
      const nom = titre.dataset.cvTheme, fiches = [...grille.querySelectorAll('article[data-cv-theme]')].filter((a) => a.dataset.cvTheme === nom);
      const g = el('g'); svg.append(g); titre.classList.add('cv-star');
      const rd = alea(hache(nom)), N = 8 + Math.floor(rd() * 4), deco = [];
      for (let k = 0; k < N; k++) deco.push({ a: (k + (rd() - 0.5) * 0.7) / N * Math.PI * 2, r: 0.62 + rd() * 0.38, phase: rd() * 6.28, fort: rd() < 0.3 });
      const e = { titre, grille, svg, g, fiches, deco, lignes: [], vu: false, hub: null };
      /* branches graphiques, liens entre points voisins, branches éditoriales, puis les points par-dessus */
      deco.forEach((d, k) => { d.rayon = el('line', { class: d.fort ? 'fort' : '', pathLength: 1, style: `--d:${(k * 0.045).toFixed(3)}s` }); g.append(d.rayon); });
      deco.forEach((d, k) => { d.lien = el('line', { class: 'lien', pathLength: 1, style: `--d:${(0.5 + k * 0.03).toFixed(3)}s` }); g.append(d.lien); });
      e.editos = fiches.map((fiche, k) => {
        const ligne = el('line', { class: 'fiche', pathLength: 1, style: `--d:${(0.15 + k * 0.08).toFixed(3)}s` }), noeud = el('rect', { width: 9, height: 9, style: `--d:${(0.55 + k * 0.08).toFixed(3)}s` });
        g.append(ligne);
        const on = () => ligne.classList.add('actif'), off = () => ligne.classList.remove('actif');
        fiche.addEventListener('pointerenter', on); fiche.addEventListener('pointerleave', off); fiche.addEventListener('focusin', on); fiche.addEventListener('focusout', off);
        return { fiche, ligne, noeud };
      });
      deco.forEach((d, k) => { d.point = el('circle', { r: 3, style: `--d:${(0.3 + k * 0.045).toFixed(3)}s` }); g.append(d.point); });
      for (const q of e.editos) g.append(q.noeud);
      e.hub = el('rect', { width: 13, height: 13 }); g.append(e.hub);
      const h2 = titre.querySelector('h2');
      h2?.addEventListener('pointerenter', () => g.classList.add('tout')); h2?.addEventListener('pointerleave', () => g.classList.remove('tout'));
      if (h2) h2.style.pointerEvents = 'auto';
      etoiles.push(e);
    }
  }
  const place = (ligne, x1, y1, x2, y2) => { ligne.setAttribute('x1', x1.toFixed(1)); ligne.setAttribute('y1', y1.toFixed(1)); ligne.setAttribute('x2', x2.toFixed(1)); ligne.setAttribute('y2', y2.toFixed(1)); };
  /* géométrie : relevée dans la page (repère de la grille), recalculée quand la grille change de taille */
  function mesure(e) {
    const G = e.grille.getBoundingClientRect(), T = e.titre.getBoundingClientRect();
    e.cx = T.left - G.left + T.width / 2; e.cy = T.top - G.top + T.height / 2; e.ry = T.height * 0.46; e.rx = Math.min(T.width * 0.44, e.ry * 2.5);
    e.hub.setAttribute('x', (e.cx - 6.5).toFixed(1)); e.hub.setAttribute('y', (e.cy - 6.5).toFixed(1));
    for (const q of e.editos) {
      const m = q.fiche.querySelector('[data-card-marker]'), R = (m && m.offsetParent ? m : q.fiche).getBoundingClientRect();
      q.x = R.left - G.left + (m && m.offsetParent ? R.width / 2 : 20); q.y = R.top - G.top + (m && m.offsetParent ? R.height / 2 : 24);
      place(q.ligne, e.cx, e.cy, q.x, q.y); q.noeud.setAttribute('x', (q.x - 4.5).toFixed(1)); q.noeud.setAttribute('y', (q.y - 4.5).toFixed(1));
    }
    e.haut = T.top - G.top; e.G = G;
    trace(e, 0);
  }
  function trace(e, t) {
    const libre = !reduit.matches, sx = souris.x - e.G.left, sy = souris.y - e.G.top;
    e.deco.forEach((d) => {
      let x = e.cx + Math.cos(d.a) * e.rx * d.r, y = e.cy + Math.sin(d.a) * e.ry * d.r;
      if (libre) {
        x += Math.sin(t * 0.42 + d.phase) * 5; y += Math.cos(t * 0.35 + d.phase * 1.7) * 4;
        const dx = x - sx, dy = y - sy, dist = Math.hypot(dx, dy); if (dist < 150 && dist > 1) { const k = (1 - dist / 150) * 14 / dist; x += dx * k; y += dy * k; }   // le point s'écarte du curseur
      }
      d.x = x; d.y = y; place(d.rayon, e.cx, e.cy, x, y); d.point.setAttribute('cx', x.toFixed(1)); d.point.setAttribute('cy', y.toFixed(1));
    });
    e.deco.forEach((d, k) => { const n = e.deco[(k + 1) % e.deco.length]; place(d.lien, d.x, d.y, n.x, n.y); });
  }
  const tout = () => { for (const e of etoiles) mesure(e); };
  const ro = new ResizeObserver(tout); for (const grille of grilles.keys()) ro.observe(grille);
  addEventListener('resize', tout); document.fonts?.ready.then(tout); tout();
  const io = new IntersectionObserver((es) => { for (const x of es) { const e = etoiles.find((q) => q.titre === x.target); if (!e) continue; e.vu = x.isIntersecting; if (x.isIntersecting) e.g.classList.add('vu'); } }, { rootMargin: '0px 0px -12% 0px' });
  for (const e of etoiles) io.observe(e.titre);
  addEventListener('pointermove', (ev) => { souris.x = ev.clientX; souris.y = ev.clientY; }, { passive: true });
  let dernier = 0;
  function image(t) {
    requestAnimationFrame(image);
    if (reduit.matches || document.hidden || t - dernier < 30 || document.documentElement.classList.contains('cv-parity-active')) return; dernier = t;
    for (const e of etoiles) if (e.vu) { e.G = e.grille.getBoundingClientRect(); trace(e, t / 1000); }
  }
  requestAnimationFrame(image);
  window.__cvThemeStars = { etoiles: () => etoiles.map((e) => ({ theme: e.titre.dataset.cvTheme, fiches: e.editos.length, points: e.deco.length, vu: e.vu, centre: [Math.round(e.cx), Math.round(e.cy)] })), mesure: tout };
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', installe); else installe();
