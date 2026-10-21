// Pages d'onglet (Blog, Expériences, Gains) : plan blueprint fixe en fond, mêmes règles « Tourner » / « Incliner » que l'accueil.
// Les règles font tourner et incliner le sujet de la page (tirelire, signe infini, hublot) : chacun écoute l'événement « rf-tabview ».
import * as THREE from 'three';
import { initBlueprint } from './blueprint-hero.js';
import { initRulers } from './rulers.js';

const RULERS = '<aside class="rf-ruler" id="rf-ruler" role="slider" tabindex="0" aria-orientation="vertical" aria-label="Incliner la vue de bas en haut (glisser, flèches, double clic pour revenir à l’angle d’origine)"><i class="rf-ruler-mark" aria-hidden="true"></i><div class="rf-ruler-track" id="rf-track"></div><span class="rf-ruler-label rf-mono" aria-hidden="true">Incliner</span></aside>' +
  '<aside class="rf-ruler rf-ruler--h" id="rf-ruler-h" role="slider" tabindex="0" aria-orientation="horizontal" aria-label="Tourner la vue (glisser à gauche ou à droite, flèches, double clic pour revenir à l’angle d’origine)"><i class="rf-ruler-mark" aria-hidden="true"></i><div class="rf-ruler-track" id="rf-track-h"></div><span class="rf-ruler-label rf-mono" aria-hidden="true">Tourner</span></aside>';

document.body.classList.add('rf-tabv');
document.querySelector('.rf-ibg')?.remove();
const stage = document.createElement('div');
stage.className = 'rf-stage rf-stage--post'; stage.id = 'stage'; stage.setAttribute('aria-hidden', 'true');
stage.innerHTML = '<canvas class="rf-bp" id="rf-bp"></canvas><div class="rf-grain"></div>';
document.body.prepend(stage);
document.body.insertAdjacentHTML('beforeend', RULERS);

const cam = new THREE.PerspectiveCamera(30, 1, 1, 400);
const placeCam = (yaw, pitch = 26 * Math.PI / 180) => {
  const dist = 40, cp = Math.cos(pitch), tx = .1, tz = -.2, aimY = 3.2;
  cam.position.set(tx + Math.sin(yaw) * cp * dist, aimY + Math.sin(pitch) * dist, tz + Math.cos(yaw) * cp * dist);
  cam.lookAt(tx, aimY, tz); cam.updateMatrixWorld(true);
};
const bp = initBlueprint(document.getElementById('rf-bp'), stage);
bp.plane.scale.setScalar(2.6);
placeCam(36 * Math.PI / 180); bp.link(cam);
const aspect = () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
aspect(); addEventListener('resize', aspect);

window.__rfTabView = { rot: 0, tilt: 0, yaw: 36 * Math.PI / 180, pitch: 26 * Math.PI / 180 };
initRulers((v) => {
  placeCam(v.yaw, v.pitch);
  window.__rfTabView = v;
  window.dispatchEvent(new CustomEvent('rf-tabview', { detail: v }));
});
