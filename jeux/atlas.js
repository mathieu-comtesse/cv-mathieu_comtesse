/* Atlas du parcours : une île flottante au-dessus des nuages et de l'océan. Un bâtiment par étape, un lagon, une voie ferrée, un ponton, des chutes d'eau qui
 * tombent dans les nuages et un socle de roche détaillé. Rendu HDR maison (ombres, nuages volumétriques, éclat, étalonnage), tout est procédural ou produit
 * par les outils de tools/atlas-ile/ (champ de distance signée pour l'île, Blender pour les bâtiments).
 *
 * Fichiers : atlas-rendu.js (chaîne de rendu) · atlas-ciel.js (ciel, océan) · atlas-nuages.js (nuages volumétriques) · atlas-ile.js (terrain, lagon) · atlas-flore.js,
 * atlas-decor.js (végétation) · atlas-batiments.js (matières procédurales des bâtiments) · atlas-monde.js (assemblage et ambiance) · atlas-jeu.js (interaction, œufs
 * de Pâques, marche) · atlas-peche.js (navigation et pêche).  ?papier ouvre l'ancienne version en papier plié (atlas-papier.js) ; ?lite force le rendu léger.
 * ?marche ouvre l'île à pied ; ?nuit la nuit ; ?vue=azimut,hauteur,zoom règle la caméra. */
import * as THREE from './three.module.js';

if (/[?&]papier\b/.test(location.search)) {
  await import('./atlas-papier.js');
} else {
  const { creerRendu } = await import('./atlas-rendu.js');
  const { creerMonde } = await import('./atlas-monde.js');
  const { creerJeu } = await import('./atlas-jeu.js');
  const canvas = document.getElementById('world-canvas'), hote = canvas.parentElement, chargement = document.getElementById('world-loading');
  const tactile = matchMedia('(pointer: coarse)').matches, lite = /[?&]lite\b/.test(location.search) || tactile;
  const R = creerRendu(canvas, { qualite: lite ? 0 : 1 });
  let M, J;
  try {
    M = await creerMonde(R, { qualite: lite ? 0 : 1 });
    J = creerJeu(M, R, { canvas, hote });
  } catch (e) { if (chargement) chargement.textContent = 'Impossible d’afficher l’île sur cet appareil (WebGL 2 requis).'; console.error(e); throw e; }
  const q = new URLSearchParams(location.search);
  J.densite = lite ? 1 : 1.5;
  let densite = J.densite;
  new ResizeObserver(() => J.redimensionner()).observe(hote); J.redimensionner();
  if (q.has('nuit')) J.reglerNuit(true);
  if (q.has('vue')) { const [a, p, z] = q.get('vue').split(',').map(Number); J.vue(a, p, z); }
  if (q.has('marche')) J.entrerMarche();
  chargement?.remove();
  const horloge = new THREE.Clock();
  let t = 0, perfT = 0, perfN = 0;
  function image() {
    const brut = horloge.getDelta(), dt = Math.min(0.05, brut); t += dt;
    if (brut < 0.25) { perfT += brut; perfN++; }
    if (perfT > 2) { const moy = perfT / perfN; if (moy > 0.026 && densite > 0.7) { densite = Math.max(0.7, densite - 0.15); J.densite = densite; J.redimensionner(); } else if (moy < 0.014 && densite < (lite ? 1 : 1.5)) { densite = Math.min(lite ? 1 : 1.5, densite + 0.1); J.densite = densite; J.redimensionner(); } perfT = perfN = 0; }
    J.tick(dt, t);
    R.rendre(M.scene, M.sceneNuages, M.camera, t);
    requestAnimationFrame(image);
  }
  canvas.dataset.ready = 'true'; window.AtlasMonde = M;
  image();
}
