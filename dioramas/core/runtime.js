import * as THREE from 'three';
import { createCamera, updateCamera } from './camera.js';
import { createLighting } from './lighting.js';
import { PixelPost } from './post.js';

/**
 * Boucle commune aux dioramas : rendu, caméra verrouillée, passe pixel, clip aux bords de la dalle,
 * et une seule horloge `t` (tout est une fonction pure de t). ?t=12.4 fige une image ;
 * window.__diorama.freeze(t) la fige depuis un script de QA.
 *
 * scene: { palette (rgb 0..1, 64 entrées), slab: [w, d], fit (Vector3[]), loop (s), build(scene) -> update(t) }
 */
export function run(def) {
  const canvas = document.getElementById('stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
  } catch (e) {
    document.getElementById('fallback').hidden = false;
    return;
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const [W, D] = def.slab;
  renderer.clippingPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), W / 2), new THREE.Plane(new THREE.Vector3(-1, 0, 0), W / 2),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), D / 2), new THREE.Plane(new THREE.Vector3(0, 0, -1), D / 2),
  ];

  const scene = new THREE.Scene();
  scene.background = null;
  const lights = createLighting(renderer, scene);
  if (def.light) def.light(lights);
  const camera = createCamera(1.5, def.fit);
  const post = new PixelPost(renderer, def.palette, 1800, def.renderScale ?? 1.25);
  const update = def.build(scene);

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    post.setSize(r.width, r.height);
    updateCamera(camera, r.width / r.height, def.fit);
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 120));
  resize();

  const q = new URLSearchParams(location.search);
  let frozen = q.has('t') ? parseFloat(q.get('t')) : null;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const draw = (t) => { const tt = ((t % def.loop) + def.loop) % def.loop; update(tt); post.render(scene, camera); };
  window.__diorama = {
    freeze(t) { frozen = t; draw(t); return t; },
    resume() { frozen = null; },
    info() { return { loop: def.loop, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, size: [post.size.x, post.size.y], dist: camera.userData.distance }; },
  };
  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(canvas);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (frozen !== null) { draw(frozen); return; }
    draw(still ? def.stillT ?? 0 : (now - t0) / 1000);
  }
  draw(frozen ?? 0);
  window.__dioramaReady = true;
  requestAnimationFrame(frame);
}

/** Matériaux : un par entrée de palette, rien d'autre ne colore la scène. */
export function materials(hexes) {
  const cache = new Map();
  return (hex, opts = {}) => {
    const key = hex + JSON.stringify(opts);
    if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: opts.rough ?? 0.86, metalness: opts.metal ?? 0, emissive: opts.glow ? new THREE.Color(hex) : 0x000000, emissiveIntensity: opts.glow ?? 0, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.double ? THREE.DoubleSide : THREE.FrontSide, depthWrite: opts.opacity ? false : true }));
    return cache.get(key);
  };
}
export const toRGB = (hexes) => hexes.map((h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; });
