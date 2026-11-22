/* Le décor de Mathieu : une scène sans interface, vue de trois quarts à longue focale (presque isométrique).
 * Mathieu y vit seul : il enchaîne ses activités d'un meuble à l'autre et pense à ce qu'il va faire.
 * Utilisée dans la carte de l'accueil ; se met en pause hors écran et quand l'onglet est caché. */
import * as THREE from 'three';
import { creerRendu } from './rendu.js?v=d3';
import { creerMonde, chargerPiece } from './monde.js';
import { creerPerso } from './perso.js';
import { creerPensee } from './pensee.js';
import { creerAuto } from './auto.js';

const canvas = document.getElementById('scene');
const vignette = window.self !== window.top;
const rendu = creerRendu(canvas, { qualiteMax: 1.5, vignette });
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
let heros = null, auto = null, temps = 0, avant = performance.now(), visible = true, fondu = vignette ? 0 : 1, nIm = 0, cumul = 0;
let balade = true, sautPresse = false;
const touches = new Map();
if (!vignette) {
  const commandes = document.querySelector('.scene-play');
  const boutonAuto = document.querySelector('[data-scene-auto]');
  commandes.hidden = false;
  function setBalade(active) {
    balade = active;
    boutonAuto.setAttribute('aria-pressed', String(active));
    if (!active) auto?.arrete();
    else { touches.clear(); sautPresse = false; }
  }
  function presse(id, action) {
    setBalade(false);
    touches.set(id, action);
    if (action === 'jump') sautPresse = true;
  }
  const clavier = {
    ArrowUp:'up', KeyW:'up', KeyZ:'up', ArrowDown:'down', KeyS:'down',
    ArrowLeft:'left', KeyA:'left', KeyQ:'left', ArrowRight:'right', KeyD:'right',
    Space:'jump', ShiftLeft:'sprint', ShiftRight:'sprint'
  };
  addEventListener('keydown', event => {
    const action = clavier[event.code];
    if (!action || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, button, a')) return;
    event.preventDefault();
    if (!event.repeat) presse(event.code, action);
  });
  addEventListener('keyup', event => touches.delete(event.code));
  addEventListener('blur', () => { touches.clear(); sautPresse = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { touches.clear(); sautPresse = false; }
  });
  for (const bouton of commandes.querySelectorAll('[data-scene-key]')) {
    bouton.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      bouton.setPointerCapture(event.pointerId);
      presse(event.pointerId, bouton.dataset.sceneKey);
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) bouton.addEventListener(type, event => touches.delete(event.pointerId));
    bouton.addEventListener('click', event => {
      if (event.detail !== 0) return;
      presse(bouton, bouton.dataset.sceneKey);
      setTimeout(() => touches.delete(bouton), 180);
    });
  }
  boutonAuto.addEventListener('click', () => { setBalade(!balade); boutonAuto.blur(); });
}
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
    if (balade) {
      if (!auto.actif) auto.demarre();
      auto.maj(dt, entree, CAP);
    } else {
      const actions = new Set(touches.values());
      entree.x = Number(actions.has('right')) - Number(actions.has('left'));
      entree.y = Number(actions.has('up')) - Number(actions.has('down'));
      entree.sprint = actions.has('sprint');
      entree.saut = actions.has('jump');
      entree.sautPresse = sautPresse;
      sautPresse = false;
    }
    heros.maj(dt, entree, CAP);
    if (heros.evenements.includes('chute')) heros.replace(monde.depart);
    heros.evenements.length = 0;
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
