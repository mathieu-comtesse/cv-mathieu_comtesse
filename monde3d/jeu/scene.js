/* Le décor de Mathieu : une scène sans interface, vue de trois quarts à longue focale (presque isométrique).
 * Mathieu y vit seul : il enchaîne ses activités d'un meuble à l'autre et pense à ce qu'il va faire.
 * Utilisée dans la carte de l'accueil ; se met en pause hors écran et quand l'onglet est caché. */
import * as THREE from 'three';
import { creerRendu } from './rendu.js';
import { creerMonde, chargerPiece } from './monde.js';
import { creerPerso } from './perso.js';
import { creerPensee } from './pensee.js';
import { creerAuto } from './auto.js';

const canvas = document.getElementById('scene');
const rendu = creerRendu(canvas, { qualiteMax: 1.5 });
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(13, 1, 20, 2600);
scene.add(new THREE.HemisphereLight(0xffffff, 0xa397a8, 1.1));
const soleil = new THREE.DirectionalLight(0xffffff, 2.6), dirSoleil = new THREE.Vector3(-0.5, 0.82, 0.42).normalize();
soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048); soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.05;
Object.assign(soleil.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 1, far: 150 }); soleil.shadow.camera.updateProjectionMatrix();
soleil.position.copy(dirSoleil).multiplyScalar(70); scene.add(soleil, soleil.target);

const monde = creerMonde(scene, {}, await chargerPiece());
for (const l of monde.lampes.filter((q) => q.id !== 'screenbar')) { const pl = new THREE.PointLight(l.couleur, 9, 9, 2); pl.position.copy(l.p); scene.add(pl); }
const pensee = creerPensee(document.getElementById('pensee'), monde.piece), tete = new THREE.Vector3(), cible = new THREE.Vector3(-0.2, 0.6, 0.3);
const entree = { x: 0, y: 0, saut: false, sautPresse: false, sprint: false }, CAP = 0.72, PENTE = 0.62;
let heros = null, auto = null, temps = 0, avant = performance.now(), visible = true, fondu = 1, nIm = 0, cumul = 0;
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }).observe(canvas);

function cadre() {
  rendu.taille(camera);
  const d = 62 * Math.max(1, 0.8 / camera.aspect), cp = Math.cos(PENTE);
  camera.position.set(cible.x + Math.sin(CAP) * cp * d, cible.y + Math.sin(PENTE) * d, cible.z + Math.cos(CAP) * cp * d); camera.lookAt(cible);
}
function image(maintenant) {
  requestAnimationFrame(image);
  if (!visible || document.hidden) { avant = maintenant; return; }
  const brut = (maintenant - avant) / 1000, dt = Math.min(0.05, Math.max(0.001, brut)); avant = maintenant; temps += dt;
  monde.maj(temps, dt);
  if (heros) {
    if (!auto.actif) auto.demarre();
    auto.maj(dt, entree, CAP); heros.maj(dt, entree, CAP); heros.evenements.length = 0;
    pensee.maj(dt, tete.copy(heros.pos).setY(heros.pos.y + 2.05), camera);
    fondu = Math.max(0, fondu - dt * 1.6);
  }
  rendu.fondu.value = fondu * fondu * (3 - 2 * fondu);
  rendu.rendre(scene, camera);
  if (brut < 0.2) { cumul += brut; if (++nIm >= 80) { if (cumul / nIm > 0.026) rendu.allege(camera); nIm = 0; cumul = 0; } }
}
addEventListener('resize', cadre); cadre(); requestAnimationFrame(image);
creerPerso(scene, monde).then((h) => { heros = h; auto = creerAuto(monde, heros, pensee, { pieceSeule: true }); }).catch((e) => console.error(e));
window.__decor = { monde, get heros() { return heros; }, get auto() { return auto; } };
