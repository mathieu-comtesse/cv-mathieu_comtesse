// Page de projet : barre, pied de page, apparitions ; pour les projets pro, la machine animée est posée sur le plan blueprint
// de l'accueil (même caméra en perspective, mêmes règles « Tourner » / « Incliner »).
import './footer.js';
import './navfx.js';
import './viewbtn.js';
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
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 400);
  const AIM_Y = 3.2;                       // la visée est un peu au-dessus du plan : la machine, au centre du plan, se place sous le titre
  const placeCam = (yaw, pitch = 26 * Math.PI / 180) => {
    const dist = 40, cp = Math.cos(pitch);
    const tx = .1, tz = -.2;
    cam.position.set(tx + Math.sin(yaw) * cp * dist, AIM_Y + Math.sin(pitch) * dist, tz + Math.cos(yaw) * cp * dist);
    cam.lookAt(tx, AIM_Y, tz); cam.updateMatrixWorld(true);
  };
  const bp = initBlueprint(bpCanvas, stage);
  bp.plane.scale.setScalar(2.6);          // plan plus étendu : pas d'horizon noir à ce faible angle

  /* ---- la machine : modèle 3D posé sur le plan, rendu avec la même caméra (même perspective, même profondeur) ---- */
  const view = { yaw: 36 * Math.PI / 180 };
  const aspect = () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); machine?.resize(); };
  let machine = null;
  placeCam(view.yaw); bp.link(cam);
  aspect(); addEventListener('resize', aspect);
  const rulers = document.querySelectorAll('.rf-ruler');   // les règles ne se voient que sur le blueprint, tant que la machine est visible
  const canvas = document.createElement('canvas'); canvas.className = 'rf-m3d'; canvas.setAttribute('aria-hidden', 'true'); document.body.append(canvas);
  import('./m3d/index.js').then(({ mountMachine }) => mountMachine(fig.dataset.fig, canvas, cam)).then((m) => {
    machine = m; machine.resize(); fig.querySelector('img')?.remove();
    const t0 = performance.now();
    /* Interaction comme sur la figure d'origine : un réglage propre à chaque machine (seuil en %, pondération, lot, jour, heure, rapport…),
       qu'on change avec les boutons − / +, la règle, les flèches du clavier ou en glissant sur la machine. Sans réglage propre : le temps. */
    let shift = 0, drag = null;
    const clock = () => (performance.now() - t0) / 1000 + shift;
    const ctl = machine.controls || { label: 'Temps', min: 0, max: 100, step: 5, fmt: (v) => v + ' %', get: (t) => ((t % 60) / 60) * 100, seek: (v) => v / 100 * 60 };
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const apply = (v) => {
      v = clamp(Math.round(v / ctl.step) * ctl.step, ctl.min, ctl.max);
      const r = ctl.set ? ctl.set(v) : undefined;
      const to = ctl.seek ? ctl.seek(v) : (typeof r === 'number' ? r : null);
      if (to !== null) shift += to - clock();
    };
    const cur = (t) => ctl.get(t);
    const bar = document.createElement('div'); bar.className = 'rf-ctl';
    bar.innerHTML = '<span class="rf-ctl-l"></span><button type="button" class="rf-ctl-b" aria-label="Diminuer">−</button><input class="rf-ctl-r" type="range" aria-label="" /><button type="button" class="rf-ctl-b" aria-label="Augmenter">+</button><output class="rf-ctl-v"></output>';
    const [lab, minus, range, plus, out] = [...bar.children];
    lab.textContent = ctl.label; range.setAttribute('aria-label', ctl.label);
    range.min = ctl.min; range.max = ctl.max; range.step = ctl.step;
    minus.addEventListener('click', () => apply(cur(clock()) - ctl.step));
    plus.addEventListener('click', () => apply(cur(clock()) + ctl.step));
    range.addEventListener('input', () => apply(+range.value));
    fig.append(bar);
    const ui = (t) => { const v = cur(t); if (document.activeElement !== range && !drag) range.value = v; out.textContent = ctl.fmt(Math.round(v)); };
    fig.tabIndex = 0; fig.setAttribute('role', 'group'); fig.setAttribute('aria-label', 'Machine : ' + ctl.label);
    fig.classList.add('rf-fig-live');
    const cap = fig.querySelector('figcaption'); if (cap) cap.textContent += ' · glissez, ou réglez : ' + ctl.label.toLowerCase();
    fig.addEventListener('pointerdown', (e) => { if (e.button || e.target.closest('.rf-ctl')) return; drag = { x: e.clientX, v: cur(clock()) }; fig.setPointerCapture(e.pointerId); fig.classList.add('rf-grabbing'); });
    fig.addEventListener('pointermove', (e) => { if (drag) apply(drag.v + (e.clientX - drag.x) / Math.max(320, innerWidth * .6) * (ctl.max - ctl.min)); });
    const drop = () => { drag = null; fig.classList.remove('rf-grabbing'); };
    fig.addEventListener('pointerup', drop); fig.addEventListener('pointercancel', drop);
    fig.addEventListener('keydown', (e) => { const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (k) { apply(cur(clock()) + k * ctl.step); e.preventDefault(); } else if (e.key === 'Home') { apply(ctl.min); e.preventDefault(); } else if (e.key === 'End') { apply(ctl.max); e.preventDefault(); } });
    const loop = () => {
      requestAnimationFrame(loop);
      const o = Math.min(1, Math.max(0, 1 - scrollY / (innerHeight * .75)));   // les règles s’effacent ; l’objet, lui, reste en arrière-plan
      const bg = Math.max(.32, o);
      canvas.style.opacity = bg.toFixed(3);
      rulers.forEach((r) => { r.style.opacity = o.toFixed(3); r.style.pointerEvents = o < .05 ? 'none' : ''; });
      if (document.hidden) return;
      { const t = reduced ? 6 + shift : clock(); machine.render(t); ui(t); }
    };
    loop();
  }).catch((e) => { console.warn('machine 3D indisponible', e); canvas.remove(); });

  initRulers((v) => { view.yaw = v.yaw; placeCam(v.yaw, v.pitch); });
}
