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

/* même effet de défilement que l'accueil : la vue plonge de 14° sur 3,56 hauteurs d'écran et le plan s'estompe (valeurs relevées sur la page de référence) */
const DEG = Math.PI / 180, clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const FADE = [[0, 1], [1, 1], [1.11, .991], [1.78, .444], [2.67, .119], [3.56, 0]];
const fade = (u) => { for (let i = 1; i < FADE.length; i++) if (u <= FADE[i][0]) { const [x0, y0] = FADE[i - 1], [x1, y1] = FADE[i]; return y0 + (y1 - y0) * (u - x0) / (x1 - x0); } return 0; };
const rulers = [document.getElementById('rf-ruler'), document.getElementById('rf-ruler-h')];
let view = { rot: 0, tilt: 0, yaw: 36 * DEG, pitch: 26 * DEG };
window.__rfTabView = view;
const paint = () => {
  const u = scrollY / innerHeight, o = fade(u);
  placeCam(view.yaw, clamp(view.pitch + 14 * DEG * clamp(scrollY / (3.56 * innerHeight), 0, 1), 6 * DEG, 82 * DEG));
  stage.style.opacity = o.toFixed(3);
  for (const r of rulers) { r.style.opacity = o.toFixed(3); r.style.pointerEvents = o < .3 ? 'none' : ''; }
};
addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
initRulers((v) => {
  view = v; window.__rfTabView = v; paint();
  window.dispatchEvent(new CustomEvent('rf-tabview', { detail: v }));
});
paint();
