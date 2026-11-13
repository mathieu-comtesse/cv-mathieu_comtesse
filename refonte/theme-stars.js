/* Étoiles des titres (mode à plat). Chaque grand titre (chapitre : « Projets professionnels » ; thème : « Faire fonctionner »…)
 * garde sa taille et reçoit une étoile : un foyer carré blanc posé près du titre, d'où partent des branches.
 *   - branches éditoriales : une par vrai contenu du chapitre ou du thème, terminée par une vignette cliquable (elle mène à la fiche) ;
 *   - branches graphiques : points secondaires tirés du libellé du titre (toujours les mêmes), sans contenu associé.
 * Les branches se tracent depuis le foyer à l'entrée dans l'écran, une impulsion lumineuse les parcourt, les points dérivent
 * et s'écartent du curseur, le foyer glisse légèrement avec le défilement.
 * Code original, tracé en SVG. En chemin 3D (mode expo) le moteur dessine ses propres grappes : ces étoiles sont masquées. */
const NS = 'http://www.w3.org/2000/svg';
const reduit = matchMedia('(prefers-reduced-motion: reduce)');
const style = document.createElement('style');
style.textContent = `
.cv-star-layer{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:0}
html.cv-parity-active .cv-star-layer{display:none}
.cv-star-host{position:relative}
html:not(.cv-parity-active) .cv-theme-heading.cv-star-host h2{color:#fff}
.cv-star-host>h2,.cv-star-host>div>h2,.cv-star-host h2{position:relative;z-index:1}
.cv-star-layer line{stroke:#cfe0ff;stroke-width:1;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;opacity:var(--o,.5);transition:stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) var(--d,0s),opacity .25s,stroke .25s}
.cv-star-layer .vu line{stroke-dashoffset:0}
.cv-star-layer line.fiche{--o:.8;stroke:#fff}
.cv-star-layer line.vif{stroke:#5fe6ff;--o:1}
.cv-star-layer g.noeud.actif~line,.cv-star-layer line.actif{stroke:#fff;--o:1;stroke-width:2}
.cv-star-layer line.onde{stroke:#fff;stroke-dasharray:.07 1;stroke-dashoffset:1.07;opacity:0;transition:none}
.cv-star-layer .vu line.onde{opacity:.95;animation:cv-star-onde 3.4s linear var(--d,0s) infinite}
@keyframes cv-star-onde{0%{stroke-dashoffset:1.07;opacity:0}8%{opacity:.95}70%{stroke-dashoffset:0;opacity:.95}78%,100%{stroke-dashoffset:0;opacity:0}}
.cv-star-layer circle{fill:#dfe9ff;opacity:0;transition:opacity .4s var(--d,0s)}
.cv-star-layer .vu circle{opacity:.9}
html:not(.cv-parity-active) .cv-star-host h2{text-wrap:balance}
.cv-star-layer rect.foyer{fill:#fff;opacity:0;transition:opacity .3s}
.cv-star-layer .vu rect.foyer{opacity:1}
.cv-star-layer g.noeud{pointer-events:auto;cursor:pointer;opacity:0;transition:opacity .4s var(--d,0s)}
.cv-star-layer .vu g.noeud{opacity:1}
.cv-star-layer g.noeud rect{fill:#fff;stroke:#fff;stroke-width:1;fill-opacity:.92;transition:fill-opacity .2s}
.cv-star-layer g.noeud rect.cadre{fill:none;stroke-opacity:.75}
.cv-star-layer g.noeud text{font:500 11px/1 "Söhne Mono","JetBrains Mono",ui-monospace,monospace;fill:#fff;opacity:0;transition:opacity .2s;paint-order:stroke;stroke:rgb(0 10 90 / .55);stroke-width:4px}
.cv-star-layer g.noeud:hover text,.cv-star-layer g.noeud:focus-visible text{opacity:1}
.cv-star-layer g.noeud:focus-visible{outline:none}.cv-star-layer g.noeud:focus-visible rect.cadre{stroke-width:2;stroke-opacity:1}
@media (prefers-reduced-motion:reduce){.cv-star-layer line,.cv-star-layer circle,.cv-star-layer g.noeud{transition:none}.cv-star-layer .vu line.onde{animation:none;opacity:0}}
`;
document.head.append(style);

const hache = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; };
const alea = (g) => () => { g |= 0; g = g + 0x6D2B79F5 | 0; let t = Math.imul(g ^ g >>> 15, 1 | g); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const el = (nom, attrs = {}) => { const e = document.createElementNS(NS, nom); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const libelle = (a) => (a.querySelector('h3, h2')?.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);

function installe() {
  const cibles = [];
  for (const sec of document.querySelectorAll('section[data-f26-page-section]')) {
    const pin = sec.querySelector(':scope > .section-hero-pin'), h = pin?.querySelector('h2'); if (!h) continue;
    let fiches = [...sec.querySelectorAll('article[data-cv-type], article.product-card')].filter((a) => libelle(a));
    if (!fiches.length) fiches = [...sec.querySelectorAll('h3')].filter((x) => x.textContent.trim()).map((x) => x.closest('article, li, div') || x);
    cibles.push({ hote: pin, titre: h, fiches: fiches.slice(0, 16), nom: h.textContent.trim(), chapitre: true });
  }
  for (const t of document.querySelectorAll('.cv-theme-heading[data-cv-theme]')) {
    const h = t.querySelector('h2'), nom = t.dataset.cvTheme; if (!h) continue;
    cibles.push({ hote: t, titre: h, fiches: [...t.parentElement.querySelectorAll('article[data-cv-theme]')].filter((a) => a.dataset.cvTheme === nom), nom, chapitre: false });
  }
  /* tous les autres titres de la page (sous-titres de section, de tableau, de contact…) : une étoile réduite, purement graphique sauf si le bloc contient de vraies entrées */
  const pris = new Set(cibles.map((c) => c.titre));
  for (const h of document.querySelectorAll('[data-f26-page-section] h2')) {
    if (pris.has(h) || !h.offsetWidth || parseFloat(getComputedStyle(h).fontSize) < 30 || h.closest('.cv-star-host, dialog, [inert]')) continue;
    cibles.push({ hote: h.parentElement, titre: h, fiches: [], nom: h.textContent.trim(), chapitre: false, petit: true });
  }
  if (!cibles.length) return;
  const etoiles = [], souris = { x: -1e4, y: -1e4 };
  for (const c of cibles) {
    c.hote.classList.add('cv-star-host');
    const svg = el('svg', { class: 'cv-star-layer', 'aria-hidden': 'true' }), g = el('g'); svg.append(g); c.hote.prepend(svg);
    const rd = alea(hache(c.nom)), branches = [];
    /* éventail : la plupart des branches partent vers la droite et le haut, quelques-unes vers le bas et la gauche (relevé sur la référence) */
    const angle = () => { if (c.petit) return -1.35 + rd() * 1.6; const u = rd(); return (u < 0.72 ? -1.75 + rd() * 2.85 : 1.25 + rd() * 2.1); };
    const nDeco = (c.chapitre ? 12 : c.petit ? 6 : 8) + Math.floor(rd() * 4);
    c.fiches.forEach((fiche, k) => branches.push({ fiche, a: -1.2 + (k + 0.5) / c.fiches.length * 2.5 + (rd() - 0.5) * 0.25, r: 0.55 + rd() * 0.45, phase: rd() * 6.28 }));
    for (let k = 0; k < nDeco; k++) branches.push({ a: angle(), r: 0.3 + rd() * 0.7, phase: rd() * 6.28 });
    branches.forEach((b, k) => {
      const d = `--d:${(k * 0.04).toFixed(3)}s`;
      b.ligne = el('line', { class: b.fiche ? (k < 2 ? 'fiche vif' : 'fiche') : '', pathLength: 1, style: d }); g.append(b.ligne);
      if (b.fiche) { b.onde = el('line', { class: 'onde', pathLength: 1, style: `--d:${(1.2 + k * 0.37).toFixed(2)}s` }); g.append(b.onde); }
    });
    branches.forEach((b, k) => {
      const d = `--d:${(0.45 + k * 0.04).toFixed(3)}s`;
      if (!b.fiche) { b.point = el('circle', { r: 1.6 + (k % 3) * 0.5, style: d }); g.append(b.point); return; }
      const n = el('g', { class: 'noeud', tabindex: '0', role: 'link', style: d }), t = el('text', { x: 14, y: 4 }); t.textContent = libelle(b.fiche);
      n.append(el('rect', { class: 'cadre', x: -9, y: -7, width: 18, height: 14 }), el('rect', { x: -6, y: -4, width: 12, height: 8 }), t); n.setAttribute('aria-label', libelle(b.fiche)); g.append(n); b.noeud = n;
      const va = () => b.fiche.scrollIntoView({ behavior: reduit.matches ? 'auto' : 'smooth', block: 'start' });
      n.addEventListener('click', va); n.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') va(); });
      const on = () => b.ligne.classList.add('actif'), off = () => b.ligne.classList.remove('actif');
      n.addEventListener('pointerenter', on); n.addEventListener('pointerleave', off); b.fiche.addEventListener('pointerenter', on); b.fiche.addEventListener('pointerleave', off);
    });
    const foyer = el('rect', { class: 'foyer', width: 9, height: 9 }); g.append(foyer);
    etoiles.push({ ...c, svg, g, branches, foyer, vu: false });
  }
  svgAccessible(etoiles);
  const place = (ligne, x1, y1, x2, y2) => { ligne.setAttribute('x1', x1.toFixed(1)); ligne.setAttribute('y1', y1.toFixed(1)); ligne.setAttribute('x2', x2.toFixed(1)); ligne.setAttribute('y2', y2.toFixed(1)); };
  function mesure(e) {
    const H = e.hote.getBoundingClientRect(), T = e.titre.getBoundingClientRect(), W = document.documentElement.clientWidth;
    /* largeur réelle du texte (le bloc du titre peut être plus large que ses lettres) */
    const r = document.createRange(); r.selectNodeContents(e.titre); const L = r.getBoundingClientRect();
    /* foyer à droite du titre ; si le titre est trop long pour laisser la place aux branches, le foyer passe au-dessus */
    const limite = W * 0.64, voulu = L.right + Math.max(40, W * 0.085), dessus = voulu > limite && L.right > limite - 30;
    e.x0 = (dessus ? L.left + L.width * 0.66 : Math.min(voulu, limite)) - H.left; e.y0 = L.top - H.top + (dessus ? -58 : e.chapitre ? -8 : L.height * 0.1);
    e.R = e.petit ? Math.min(250, W * 0.2) : Math.min(e.chapitre ? 640 : 460, W * (e.chapitre ? 0.46 : 0.36));
    if (e.petit) { e.x0 = Math.min(L.right + 36, W - 60) - H.left; e.y0 = L.top - H.top + L.height * 0.35; } e.H = H;
    trace(e, performance.now() / 1000);
  }
  function trace(e, t) {
    const libre = !reduit.matches, H = e.H, sx = souris.x - H.left, sy = souris.y - H.top;
    /* le foyer glisse un peu avec le défilement : plus haut quand le titre entre par le bas, plus bas quand il sort par le haut */
    const prog = Math.max(-1, Math.min(1, (H.top + e.y0 - innerHeight * 0.5) / innerHeight)), cx = e.x0, cy = e.y0 + (libre ? -prog * 46 : 0);
    e.foyer.setAttribute('x', (cx - 4.5).toFixed(1)); e.foyer.setAttribute('y', (cy - 4.5).toFixed(1));
    for (const b of e.branches) {
      let x = cx + Math.cos(b.a) * e.R * b.r, y = cy + Math.sin(b.a) * e.R * b.r * 0.72;
      if (libre) {
        x += Math.sin(t * 0.4 + b.phase) * 6; y += Math.cos(t * 0.33 + b.phase * 1.7) * 5;
        const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy); if (d < 160 && d > 1) { const k = (1 - d / 160) * 16 / d; x += dx * k; y += dy * k; }
      }
      place(b.ligne, cx, cy, x, y); if (b.onde) place(b.onde, cx, cy, x, y);
      if (b.point) { b.point.setAttribute('cx', x.toFixed(1)); b.point.setAttribute('cy', y.toFixed(1)); }
      if (b.noeud) b.noeud.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    }
  }
  const tout = () => { for (const e of etoiles) mesure(e); };
  const ro = new ResizeObserver(tout); for (const e of etoiles) ro.observe(e.hote);
  addEventListener('resize', tout); document.fonts?.ready.then(tout); tout();
  const io = new IntersectionObserver((es) => { for (const x of es) { const e = etoiles.find((q) => q.titre === x.target); if (!e) continue; e.vu = x.isIntersecting; if (x.isIntersecting) e.g.classList.add('vu'); } }, { rootMargin: '30% 0px 30% 0px' });
  for (const e of etoiles) io.observe(e.titre);
  addEventListener('pointermove', (ev) => { souris.x = ev.clientX; souris.y = ev.clientY; }, { passive: true });
  let dernier = 0;
  function image(t) {
    requestAnimationFrame(image);
    if (document.hidden || t - dernier < 30 || document.documentElement.classList.contains('cv-parity-active')) return; dernier = t;
    for (const e of etoiles) if (e.vu) { e.H = e.hote.getBoundingClientRect(); trace(e, t / 1000); }
  }
  requestAnimationFrame(image);
  window.__cvThemeStars = { etoiles: () => etoiles.map((e) => ({ titre: e.nom, chapitre: e.chapitre, fiches: e.fiches.length, points: e.branches.length - e.fiches.length, vu: e.vu, foyer: [Math.round(e.x0), Math.round(e.y0)] })), mesure: tout };
}
/* les vignettes sont des liens utilisables au clavier : la couche n'est donc pas cachée aux lecteurs d'écran */
function svgAccessible(etoiles) { for (const e of etoiles) if (e.fiches.length) { e.svg.removeAttribute('aria-hidden'); e.svg.setAttribute('role', 'group'); e.svg.setAttribute('aria-label', 'Contenus de ' + e.nom); } }
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', installe); else installe();
