// Page de projet : barre, pied de page, apparitions ; pour les projets pro, la machine animée est posée sur le plan blueprint
// de l'accueil (même caméra en perspective, mêmes règles « Tourner » / « Déplacer »).
import './footer.js';
import './navfx.js';
import * as THREE from 'three';
import { initBlueprint } from './blueprint-hero.js';
import { initRulers } from './rulers.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const els = document.querySelectorAll('.rf-post-body > *, .rf-post-pn');
els.forEach((e) => e.classList.add('rf-rv'));
if (reduced || !('IntersectionObserver' in window)) els.forEach((e) => e.classList.add('rf-in'));
else {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rf-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .05 });
  els.forEach((e) => io.observe(e));
}

const fig = document.querySelector('.rf-post-fig[data-fig]');
const bpCanvas = document.getElementById('rf-bp');
const stage = document.getElementById('stage');

if (fig && bpCanvas && stage) {
  /* ---- caméra : azimut 36° comme la pièce de l'accueil, en perspective, liée au plan ---- */
  const cam = new THREE.PerspectiveCamera(38, 1, 1, 400);
  const placeCam = (yaw, px, py) => {
    const pitch = 46 * Math.PI / 180, dist = 30, cp = Math.cos(pitch);
    const tx = .1 + Math.cos(yaw) * px - Math.sin(yaw) * py, tz = -.2 - Math.sin(yaw) * px - Math.cos(yaw) * py;
    cam.position.set(tx + Math.sin(yaw) * cp * dist, .8 + Math.sin(pitch) * dist, tz + Math.cos(yaw) * cp * dist);
    cam.lookAt(tx, .8, tz); cam.updateMatrixWorld(true);
  };
  const bp = initBlueprint(bpCanvas, stage);

  /* ---- la machine : modèle 3D posé sur le plan, rendu avec la même caméra (même perspective, même profondeur) ---- */
  const view = { yaw: 36 * Math.PI / 180 };
  const aspect = () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); machine?.resize(); };
  let machine = null;
  placeCam(view.yaw, 0, 0); bp.link(cam);
  aspect(); addEventListener('resize', aspect);
  const canvas = document.createElement('canvas'); canvas.className = 'rf-m3d'; canvas.setAttribute('aria-hidden', 'true'); document.body.append(canvas);
  import('./m3d/index.js').then(({ mountMachine }) => mountMachine(fig.dataset.fig, canvas, cam)).then((m) => {
    machine = m; machine.resize(); fig.querySelector('img')?.remove();
    const t0 = performance.now();
    const loop = () => {
      requestAnimationFrame(loop);
      const o = Math.min(1, Math.max(0, 1 - scrollY / (innerHeight * .75)));
      canvas.style.opacity = o.toFixed(3);
      if (o < .01 || document.hidden) return;
      machine.render(reduced ? 6 : (performance.now() - t0) / 1000);
    };
    loop();
  }).catch((e) => { console.warn('machine 3D indisponible', e); canvas.remove(); });

  initRulers((v) => { view.yaw = v.yaw; placeCam(v.yaw, v.px, v.py); });
}
