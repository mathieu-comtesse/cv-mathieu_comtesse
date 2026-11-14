/* Défilement lissé à la molette (accueil). Code original.
 * Calibrage : sur l'enregistrement de la référence (398 événements de molette, 1 215 de défilement), la page continue de défiler
 * environ 590 ms après le dernier cran (médiane), la moitié du trajet restant est faite en 150 ms et 90 % en 360 ms.
 * Une sortie cubique de 600 ms donne 124 ms et 322 ms : c'est le modèle retenu.
 * Le lissage ne s'applique qu'à la molette d'une souris. Il laisse la main au navigateur pour : le tactile, le clavier, la barre de
 * défilement, les liens d'ancre, le zoom (Ctrl), les zones qui défilent elles-mêmes, les boîtes de dialogue et le mouvement réduit.
 * Tout défilement venu d'ailleurs pendant l'animation l'interrompt aussitôt. `?defilement=natif` le désactive. */
const reduit = matchMedia('(prefers-reduced-motion: reduce)'), DUREE = 600;
let cible = 0, depart = 0, t0 = 0, pose = -1, actif = false;
const max = () => document.documentElement.scrollHeight - innerHeight;
const defileSeul = (el) => { for (let e = el instanceof Element ? el : null; e && e !== document.body && e !== document.documentElement; e = e.parentElement) { if (e.matches?.('dialog,[data-cv-wheel],.rf-win,input,textarea,select')) return true; const s = getComputedStyle(e).overflowY; if ((s === 'auto' || s === 'scroll') && e.scrollHeight > e.clientHeight + 1) return true; } return false; };
function image() {
  if (!actif) return;
  const t = performance.now();                                                   // même horloge que t0 (l'horodatage passé aux images peut venir d'un autre repère)
  if (Math.abs(scrollY - pose) > 2) { actif = false; return; }                     // quelqu'un d'autre a fait défiler : on rend la main
  const k = Math.min(1, (t - t0) / DUREE), y = depart + (cible - depart) * (1 - (1 - k) ** 3);
  scrollTo({ top: y, behavior: 'instant' }); pose = scrollY;
  if (k < 1 && Math.abs(cible - y) > 0.5) requestAnimationFrame(image); else actif = false;
}
function molette(e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || reduit.matches || e.deltaMode !== 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY) || defileSeul(e.target)) return;
  /* pavé tactile : petits écarts très rapprochés, déjà lissés par le système */
  if (Math.abs(e.deltaY) < 24) return;
  e.preventDefault();
  const base = actif ? cible : scrollY;
  cible = Math.max(0, Math.min(max(), base + e.deltaY)); depart = scrollY; t0 = performance.now(); pose = scrollY;
  if (!actif) { actif = true; requestAnimationFrame(image); }
}
if (!/[?&]defilement=natif\b/.test(location.search) && matchMedia('(pointer: fine)').matches) {
  addEventListener('wheel', molette, { passive: false });
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, () => { actif = false; }, { passive: true, capture: true });
}
window.__cvDefilement = { get actif() { return actif; }, get cible() { return cible; }, duree: DUREE };
