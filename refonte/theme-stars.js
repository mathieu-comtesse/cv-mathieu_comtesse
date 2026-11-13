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
.cv-star-scene{position:fixed;inset:0;width:100vw;height:100vh;z-index:2;pointer-events:none}
html.cv-parity-active .cv-star-scene,html.cv-parity-active .cv-flat-nav{display:none}
html:not(.cv-parity-active) .section-hero-pin h2{color:transparent!important;-webkit-text-stroke:1px rgb(255 255 255 / .62);background:linear-gradient(270deg,#fff calc(var(--cv-fill,1)*108% - 8%),rgb(255 255 255 / 0) calc(var(--cv-fill,1)*108%));-webkit-background-clip:text;background-clip:text;width:fit-content;max-width:100%}
.cv-flat-nav{position:fixed;left:14px;top:50%;transform:translateY(-50%);z-index:3;display:grid;gap:7px;font:500 10px/1.2 "JetBrains Mono",ui-monospace,monospace;opacity:0;pointer-events:none;transition:opacity .35s}
.cv-flat-nav.vu{opacity:1;pointer-events:auto}
.cv-flat-nav a{color:rgb(255 255 255 / .55);text-decoration:none;display:flex;align-items:center;gap:8px;justify-content:space-between;min-width:104px}
.cv-flat-nav a::after{content:"";width:4px;height:4px;background:currentColor}
.cv-flat-nav a.actif,.cv-flat-nav a:hover,.cv-flat-nav a:focus-visible{color:#fff}
@media (max-width:939px){.cv-flat-nav{display:none}}
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
  const cibles = [], chapitres = [];
  for (const sec of document.querySelectorAll('section[data-f26-page-section]')) {
    const pin = sec.querySelector(':scope > .section-hero-pin'), h = pin?.querySelector('h2'); if (!h) continue;
    let fiches = [...sec.querySelectorAll('article[data-cv-type], article.product-card')].filter((a) => libelle(a));
    if (!fiches.length) fiches = [...sec.querySelectorAll('h3')].filter((x) => x.textContent.trim()).map((x) => x.closest('article, li, div') || x);
    chapitres.push({ section: sec, hote: pin, titre: h, fiches: fiches.slice(0, 16), nom: h.textContent.trim() });
  }
  for (const t of document.querySelectorAll('.cv-theme-heading[data-cv-theme]')) {
    const h = t.querySelector('h2'), nom = t.dataset.cvTheme; if (!h) continue;
    cibles.push({ hote: t, titre: h, fiches: [...t.parentElement.querySelectorAll('article[data-cv-theme]')].filter((a) => a.dataset.cvTheme === nom), nom, chapitre: false });
  }
  /* tous les autres titres de la page (sous-titres de section, de tableau, de contact…) : une étoile réduite, purement graphique sauf si le bloc contient de vraies entrées */
  const pris = new Set([...cibles, ...chapitres].map((c) => c.titre));
  if (chapitres.length) scene(chapitres);
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

/* ---------- Scène des chapitres (mode à plat) ----------
 * À l'approche d'un chapitre, son étoile occupe tout l'écran : le foyer reste fixe pendant que la page défile, de longues branches
 * partent vers les bords, les vignettes des vrais contenus dérivent au bout des branches éditoriales. Le titre monte du bas, d'abord
 * en simple contour ; un faisceau de fils part du foyer vers ses lettres, et le titre se remplit de la droite vers la gauche à mesure
 * que les fils arrivent. Une fois le titre plein, une branche claire relie le foyer au premier contenu du chapitre, puis l'étoile
 * part avec la page. Tout est piloté par la position de défilement : la séquence se rejoue à l'identique dans les deux sens. */
function scene(chapitres) {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  cv.className = 'cv-star-scene'; cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv);
  const lisse = (x, a, b) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  const souris = { x: -1e4, y: -1e4 }; let W = 0, H = 0, dpr = 1, cibles = [], dernier = 0;
  const taille = () => { W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
  addEventListener('resize', taille); taille();
  for (const c of chapitres) {
    const rd = alea(hache('scene|' + c.nom)); c.branches = [];
    c.fiches.slice(0, 10).forEach((fiche, k, l) => c.branches.push({ fiche, a: -2.9 + (k + 0.5) / l.length * 5.2 + (rd() - 0.5) * 0.4, r: 0.2 + rd() * 0.3, phase: rd() * 6.28 }));
    for (let k = 0, n = 20 + Math.floor(rd() * 6); k < n; k++) c.branches.push({ a: rd() * 6.283, r: 0.3 + rd() * 0.8, phase: rd() * 6.28, fin: rd() < 0.6 });
    c.titre.style.setProperty('--cv-fill', reduit.matches ? '1' : '0');
  }
  /* liste fixe des chapitres, à gauche : repère de lecture pendant les transitions */
  const nav = document.createElement('nav'); nav.className = 'cv-flat-nav'; nav.setAttribute('aria-label', 'Chapitres');
  for (const c of chapitres) { const a = document.createElement('a'); a.href = '#' + c.section.id; a.textContent = c.nom; c.lien = a; nav.append(a); }
  document.body.append(nav);
  function image(t) {
    requestAnimationFrame(image);
    if (document.hidden || t - dernier < 16) return; dernier = t;
    const expo = document.documentElement.classList.contains('cv-parity-active');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); cibles = [];
    if (expo) return;
    const libre = !reduit.matches, tt = t / 1000; let actif = null, vuNav = false;
    for (const c of chapitres) {
      const S = c.section.getBoundingClientRect(); if (S.top < H * 0.5 && S.bottom > H * 0.5) actif = c; if (S.top < H * 1.4) vuNav = true;
      const T = c.titre.getBoundingClientRect(), u = (H - T.top) / H;
      if (u < -1.7 || u > 1.5) { if (u > 1.5) c.titre.style.setProperty('--cv-fill', '1'); else if (libre) c.titre.style.setProperty('--cv-fill', '0'); continue; }
      const r = document.createRange(); r.selectNodeContents(c.titre); const L = r.getBoundingClientRect();
      const alpha = lisse(u, -1.6, -1.0) * (1 - lisse(u, 0.8, 1.3)), g = lisse(u, -1.55, -0.6), plein = libre ? lisse(u, 0.02, 0.34) : 1;
      c.titre.style.setProperty('--cv-fill', plein.toFixed(3));
      if (alpha <= 0.004) continue;
      const hx = W < 760 ? W * 0.5 : W * 0.6, hy = H * 0.56 - Math.max(0, u - 0.62) * H, R = Math.max(W, H) * 0.62 * (0.55 + 0.45 * g);
      ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
      /* les branches passent derrière les fiches : la zone des fiches visibles est retirée du tracé */
      if (u > 0.15) { ctx.beginPath(); ctx.rect(0, 0, W, H); for (const f of c.fiches) { const q = f.getBoundingClientRect(); if (q.bottom > 0 && q.top < H) ctx.rect(q.left, q.top, q.width, q.height); } ctx.clip('evenodd'); }
      c.branches.forEach((b, k) => {
        const gk = lisse(g * 1.6 - k * 0.02, 0, 1);
        let x = hx + Math.cos(b.a) * R * b.r, y = hy + Math.sin(b.a) * R * b.r * 0.82;
        if (libre) { x += Math.sin(tt * 0.4 + b.phase) * 7; y += Math.cos(tt * 0.33 + b.phase * 1.7) * 6; const dx = x - souris.x, dy = y - souris.y, d = Math.hypot(dx, dy); if (d < 170 && d > 1) { const q = (1 - d / 170) * 22 / d; x += dx * q; y += dy * q; } }
        x = hx + (x - hx) * gk; y = hy + (y - hy) * gk;
        const survole = b.fiche && Math.hypot(x - souris.x, y - souris.y) < 16;
        ctx.strokeStyle = b.fiche ? (survole ? '#fff' : k < 2 ? 'rgba(95,230,255,.9)' : 'rgba(255,255,255,.72)') : 'rgba(207,224,255,.26)'; ctx.lineWidth = survole ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(x, y); ctx.stroke();
        if (b.fiche) {
          if (libre) { const q = (tt * 0.28 + b.phase / 6.283) % 1, f = Math.min(1, q / 0.75); ctx.fillStyle = `rgba(255,255,255,${(q < 0.75 ? 0.95 : (1 - q) * 3.8).toFixed(2)})`; ctx.beginPath(); ctx.arc(hx + (x - hx) * f, hy + (y - hy) * f, 1.7, 0, 6.283); ctx.fill(); }
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.strokeRect(x - 9, y - 7, 18, 14); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x - 6, y - 4, 12, 8);
          cibles.push({ x, y, fiche: b.fiche });
          if (survole) { const nom = libelle(b.fiche); ctx.font = '500 11px "JetBrains Mono",ui-monospace,monospace'; ctx.textAlign = x > W - 280 ? 'right' : 'left'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,10,90,.7)'; ctx.fillStyle = '#fff'; ctx.strokeText(nom, x + (x > W - 280 ? -16 : 16), y + 4); ctx.fillText(nom, x + (x > W - 280 ? -16 : 16), y + 4); }
        } else if (b.fin) { ctx.fillStyle = 'rgba(223,233,255,.85)'; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 6.283); ctx.fill(); }
      });
      /* faisceau de fils vers les lettres du titre : ils arrivent par la droite, le remplissage les suit */
      if (libre && u > -0.3 && plein < 1) {
        const a = lisse(u, -0.3, -0.05) * (1 - lisse(plein, 0.85, 1));
        for (let k = 0; k < 8; k++) {
          const avance = Math.max(0.35, Math.min(1, plein * 8 - k + 1)), cx = L.right - (k + 0.5) / 8 * L.width, cy = L.top + L.height * 0.55;
          ctx.strokeStyle = `rgba(207,224,255,${(0.5 * a).toFixed(2)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (cx - hx) * avance, hy + (cy - hy) * avance); ctx.stroke();
          if (avance >= 1) { ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3); }
        }
      }
      /* branche qui relie le foyer au premier contenu du chapitre */
      const premiere = c.fiches[0];
      if (premiere && u > 0.3) {
        const q = premiere.getBoundingClientRect(), a = lisse(u, 0.3, 0.5), cx = q.left + Math.min(q.width * 0.55, Math.max(40, hx - q.left)), cy = q.top;
        if (cy > hy) { ctx.restore(); ctx.save(); ctx.globalAlpha = alpha * a; ctx.strokeStyle = 'rgba(95,230,255,.95)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(cx, cy); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, 6.283); ctx.stroke(); }
      }
      ctx.fillStyle = '#fff'; ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
      ctx.restore();
    }
    nav.classList.toggle('vu', vuNav); for (const c of chapitres) c.lien.classList.toggle('actif', c === actif);
    document.documentElement.style.cursor = cibles.some((q) => Math.hypot(q.x - souris.x, q.y - souris.y) < 16) ? 'pointer' : '';
  }
  requestAnimationFrame(image);
  addEventListener('pointermove', (ev) => { souris.x = ev.clientX; souris.y = ev.clientY; }, { passive: true });
  document.addEventListener('click', (ev) => {
    if (document.documentElement.classList.contains('cv-parity-active') || ev.target.closest('a,button,input,select,textarea,[role=slider],canvas')) return;
    const q = cibles.find((q) => Math.hypot(q.x - ev.clientX, q.y - ev.clientY) < 16); if (!q) return;
    ev.preventDefault(); q.fiche.scrollIntoView({ behavior: reduit.matches ? 'auto' : 'smooth', block: 'start' });
  }, { capture: true });
  window.__cvStarScene = { etat: () => chapitres.map((c) => { const T = c.titre.getBoundingClientRect(); return { titre: c.nom, u: +((H - T.top) / H).toFixed(2), remplissage: +c.titre.style.getPropertyValue('--cv-fill'), fiches: c.fiches.length, branches: c.branches.length }; }), vignettes: () => cibles.length };
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', installe); else installe();
