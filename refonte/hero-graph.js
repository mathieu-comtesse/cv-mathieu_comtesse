/* Graphe de l'accueil en mode à plat. Code original : même système d'étoiles que le chemin 3D (refonte/moteur.js, classe Ciel),
 * dessiné ici dans un canevas 2D posé dans la zone du graphe, avec une projection oblique (la hauteur décale vers le haut).
 * Un foyer par chapitre du site ; ses vignettes sont ses vrais contenus (cliquables, elles y mènent) ; les autres points et
 * ramifications sont purement graphiques et n'ont ni lien ni libellé. */
import { Ciel } from './moteur.js?v=m5';

export function demarre(chapitres) {
  const zone = document.querySelector('.hero-entrance-hold'); if (!zone || zone.querySelector('.cv-hero-graph')) return;
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), reduit = matchMedia('(prefers-reduced-motion: reduce)');
  cv.className = 'cv-hero-graph'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Graphe des chapitres du site et de leurs contenus');
  cv.style.cssText = 'position:absolute;top:0;left:0;height:100%;z-index:3;touch-action:pan-y';
  zone.append(cv); zone.querySelector('.hero-graph-spinner-track')?.remove();
  const ciel = new Ciel(), souris = { x: -1e4, y: -1e4 };
  ciel.definit('accueil', { groupe: 'accueil', racine: true, label: 'Mathieu Comtesse' });
  chapitres.forEach((r, i) => ciel.definit('accueil:' + r.id, { groupe: 'accueil', parent: 'accueil', num: String(i + 1).padStart(2, '0'), label: r.name, chapitre: r.id, editoriaux: r.cards, sol: true }));
  let W = 0, H = 0, dpr = 1, vu = false, dernier = 0, penche = 0;
  /* le canevas n'occupe que la partie libre de la zone : à droite du nom et des cartes quand ils la recouvrent (grand écran) */
  let largeurVue = 0;
  const mesure = () => { const r = zone.getBoundingClientRect(); let x0 = 0;
    for (const c of document.querySelectorAll('#hero .hero-chrome')) { const q = c.getBoundingClientRect(); if (q.width && q.height && q.top < r.bottom - 40 && q.bottom > r.top + 40 && q.right > r.left) x0 = Math.max(x0, q.right - r.left); }
    if (x0 > r.width - 160) x0 = 0;
    x0 = Math.max(0, x0); cv.style.left = x0 + 'px'; cv.style.width = (r.width - x0) + 'px'; W = Math.round(r.width - x0); H = Math.round(r.height); };
  const taille = () => { mesure(); dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); };
  new ResizeObserver(taille).observe(zone); addEventListener('resize', taille); document.fonts?.ready.then(taille); taille();
  new IntersectionObserver(([e]) => { vu = e.isIntersecting; }).observe(zone);
  const local = (ev) => { const r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  /* curseurs : viseur sur la zone du graphe, main ouverte sur un nœud éditorial, main fermée pendant qu'on le tient */
  cv.style.cursor = 'crosshair';
  const va = (n) => { const cible = document.getElementById(n.handle) || document.getElementById(n.chapitre); if (cible) cible.scrollIntoView({ behavior: reduit.matches ? 'auto' : 'smooth', block: 'start' }); };
  addEventListener('pointermove', (ev) => { [souris.x, souris.y] = local(ev); ciel.tire(souris.x, souris.y); const c = ciel.pris ? 'grabbing' : ciel.touche(souris.x, souris.y) ? 'grab' : 'crosshair'; cv.style.cursor = c; if (!document.documentElement.classList.contains('cv-parity-active')) document.documentElement.style.cursor = c === 'crosshair' ? '' : c; }, { passive: true });
  cv.addEventListener('pointerleave', () => { if (!ciel.pris) souris.x = souris.y = -1e4; });
  /* écoute au niveau du document : d'autres calques de l'accueil passent au-dessus du canevas et recevraient l'appui à sa place */
  const dessus = (ev) => { const r = cv.getBoundingClientRect(); return !document.documentElement.classList.contains('cv-parity-active') && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom && !ev.target.closest('a,button,input,select,textarea,.cv-site-nav'); };
  document.addEventListener('pointerdown', (ev) => { if (ev.button !== 0 || !dessus(ev)) return; [souris.x, souris.y] = local(ev); if (ciel.saisit(souris.x, souris.y)) { ev.preventDefault(); document.documentElement.style.cursor = 'grabbing'; } }, { capture: true });
  const fin = (annule) => { const r = ciel.lache(); if (!r) return; document.documentElement.style.cursor = ''; if (r.clic && !annule) va(r); };
  document.addEventListener('pointerup', () => fin(false), { capture: true }); document.addEventListener('pointercancel', () => fin(true));
  function image(t) {
    requestAnimationFrame(image);
    if (!vu || document.hidden || W < 120 || H < 120 || t - dernier < 30 || document.documentElement.classList.contains('cv-parity-active')) return;
    const dt = Math.min(0.1, (t - dernier) / 1000); dernier = t;
    /* le plan du graphe penche légèrement vers le pointeur : la hauteur des nœuds donne la profondeur */
    penche += ((souris.x > -1e3 ? (souris.x / W - 0.5) : 0) - penche) * 0.06;
    const proj = (c, r, h) => ({ x: c + h * penche * 0.9, y: r - h * 0.62, z: 2000 - h });
    /* sortie de l'accueil : le graphe s'ouvre (les foyers s'écartent) et s'efface ; l'étoile du premier chapitre prend le relais */
    const fin = (document.querySelector('[data-f26-page-section]')?.getBoundingClientRect().top ?? 1e9) + scrollY - innerHeight * 0.8, s = Math.max(0, Math.min(1, scrollY / Math.max(200, fin))), ouvre = 1 + 1.9 * s * s;
    cv.style.opacity = String(1 - Math.max(0, Math.min(1, (s - 0.45) / 0.5)));
    if (s > 0.02 || largeurVue !== innerWidth) { largeurVue = innerWidth; const avant = W; mesure(); if (Math.abs(W - avant) > 1) taille(); }
    ciel.place('accueil', [W / 2, H * 0.53, Math.min(H * 0.12, 90)], (W < 520 ? Math.min(W * 0.52, H * 0.44) : Math.min(W * 0.4, H * 0.5)) * ouvre);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ciel.dessine(ctx, proj, reduit.matches ? null : t / 1000, { souris, W, H, dt, compact: W < 520 });
  }
  requestAnimationFrame(image);
  window.__cvHeroGraph = { cibles: () => { const r = cv.getBoundingClientRect(); return ciel.cibles.map((c) => ({ x: c.x + r.left, y: c.y + r.top, handle: c.noeud.ed.handle })); }, etat: () => ({ ...ciel.compte('accueil'), vignettes: ciel.ecran('accueil').length, foyers: ciel.etat('accueil').filter((e) => e.visible).length, largeur: W, hauteur: H }), ciel };
}
