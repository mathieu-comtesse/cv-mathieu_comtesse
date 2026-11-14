/* Défilement lissé de l'accueil : à chaque coup de molette, la position cible avance et la page la rejoint par approche exponentielle
 * (taux 10 s^-1, constante de temps 0,1 s), sans dépassement ni rebond : décélération continue, arrêt net sur la cible.
 * Calé sur un relevé de la référence (défilement de 500 px à la molette : reste à parcourir divisé par 2 à 3 toutes les 75 à 115 ms).
 * Relevé grossier : l'onglet de mesure tournait à environ 11 images par seconde ; le taux est donc une estimation, pas une valeur lue.
 * Ne touche ni au clavier, ni aux ancres, ni au tactile, ni aux défilements internes d'un élément, ni aux commandes de zoom ;
 * désactivé en mouvement réduit. Toute autre cause de défilement resynchronise la cible, donc aucune lutte entre deux animations. */
const TAUX = 10, SEUIL = 0.4, PETIT_DELTA = 40;
const reduit = matchMedia('(prefers-reduced-motion: reduce)');
let cible = scrollY, courant = scrollY, boucle = 0, precedent = 0, ecrit = scrollY;
const max = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
const defilable = (el, dy) => {                                            // un ancêtre qui peut lui-même défiler dans ce sens garde la molette
  for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) { if (dy < 0 ? n.scrollTop > 0 : n.scrollTop + n.clientHeight < n.scrollHeight - 1) return true; }
  }
  return false;
};
const pas = (t) => {
  boucle = 0;
  const dt = Math.min(0.05, precedent ? (t - precedent) / 1000 : 1 / 60); precedent = t;
  const reste = cible - courant;
  if (Math.abs(reste) < SEUIL) { courant = cible; } else { courant += reste * (1 - Math.exp(-TAUX * dt)); }
  ecrit = courant; scrollTo({ top: courant, behavior: 'instant' });
  if (courant !== cible) boucle = requestAnimationFrame(pas); else precedent = 0;
};
addEventListener('scroll', () => {                                         // défilement venu d'ailleurs (clavier, ancre, script) : on se resynchronise
  if (Math.abs(scrollY - ecrit) > 1.5) { cible = courant = ecrit = scrollY; if (boucle) { cancelAnimationFrame(boucle); boucle = 0; precedent = 0; } }
}, { passive: true });
addEventListener('wheel', (e) => {
  if (reduit.matches || e.ctrlKey || e.defaultPrevented || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  if (document.querySelector('dialog[open]') || e.target.closest?.('input,textarea,select,iframe,[role=slider],[contenteditable=true]')) return;
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
  if (e.deltaMode === 0 && Math.abs(dy) < PETIT_DELTA) return;             // pavé tactile : son inertie native est déjà lissée
  if (defilable(e.target, dy)) return;
  e.preventDefault();
  if (!boucle) { courant = ecrit = scrollY; cible = Math.max(0, Math.min(max(), (Math.abs(cible - courant) < 2 ? courant : cible))); }
  cible = Math.max(0, Math.min(max(), cible + dy));
  if (!boucle) boucle = requestAnimationFrame(pas);
}, { passive: false });
