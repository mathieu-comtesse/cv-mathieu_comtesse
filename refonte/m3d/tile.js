// Tuile de l'accueil : la machine 3D d'un projet posée sur le plan blueprint, dans son propre petit canvas.
// Même plan, même shader, même angle (azimut 36°) que la page d'arrivée et les pages projet ; la caméra est ajustée à la tuile.
import * as THREE from 'three';
import { makeStage, setDA } from './core.js';
import { trackGlow, ACCENT } from './glow.js';
import { createBlueprintPlane } from '../blueprint-hero.js';

const MODULES = {
  moteur: () => import('./moteur.js'), cerfa: () => import('./cerfa.js'), vm: () => import('./vm.js'), vre: () => import('./vre.js'),
  gares: () => import('./gares.js'), finance: () => import('./finance.js'), pp: () => import('./pp.js'), powerbi: () => import('./powerbi.js'),
  suivi: () => import('./suivi.js'), studio: () => import('./studio.js'), 'vrestudio-musicbox': () => import('./vrestudio.js')
};
const DEG = Math.PI / 180;

export async function mountTile(name, canvas) {
  const load = MODULES[name]; if (!load) throw new Error('machine inconnue : ' + name);
  const { build, WIDTH = 236 } = await load();
  setDA(name);
  const { renderer, scene } = makeStage(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.setClearColor(0x0a2fc8, 1);
  scene.children.forEach((c) => { if (c.isDirectionalLight) c.shadow.mapSize.set(2048, 2048); });
  const bp = createBlueprintPlane(renderer, 1024);
  bp.plane.scale.setScalar(4); bp.plane.position.y = -.002; scene.add(bp.plane);

  const m = build();
  const g = new THREE.Group(); g.add(m.group); g.scale.setScalar(12.6 / WIDTH); scene.add(g);
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
  g.position.set(-c.x, -box.min.y, -c.z);
  scene.updateMatrixWorld(true);
  const fitBox = new THREE.Box3().setFromObject(g);
  const mid = fitBox.getCenter(new THREE.Vector3());

  const glow = trackGlow(g, ACCENT[name]);
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 400);
  let yaw = 36 * DEG;
  const pitch = 28 * DEG;
  const corners = [];
  for (const x of [fitBox.min.x, fitBox.max.x]) for (const y of [fitBox.min.y, fitBox.max.y]) for (const z of [fitBox.min.z, fitBox.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const place = (dist) => {
    cam.position.set(mid.x + Math.sin(yaw) * Math.cos(pitch) * dist, mid.y + Math.sin(pitch) * dist, mid.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    cam.lookAt(mid); cam.updateMatrixWorld(true);
  };
  const fitAt = () => {                                // distance pour que la machine tienne dans 86 % de la tuile
    let d = 30;
    for (let i = 0; i < 4; i++) {
      place(d);
      let k = 0;
      for (const p of corners) { const v = p.clone().project(cam); k = Math.max(k, Math.abs(v.x), Math.abs(v.y)); }
      d *= k / .86;
    }
    return d;
  };
  const extent = () => {                               // surface occupée par la machine dans la tuile (plus grande = mieux remplie)
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const p of corners) { const v = p.clone().project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    return (x1 - x0) * (y1 - y0);
  };
  const fit = () => {                                  // une machine longue dans une tuile étroite : on tourne la vue pour mieux remplir
    let best = { a: -1, d: 30, yaw: 36 * DEG };
    for (const deg of [36, 46, 56, 66]) { yaw = deg * DEG; const d = fitAt(); place(d); const a = extent() * (deg === 36 ? 1.04 : 1); if (a > best.a) best = { a, d, yaw }; }
    yaw = best.yaw; place(best.d);
  };
  const size = () => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    bp.mat.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    fit();
  };
  size();
  return {
    resize: size,
    render(time) { bp.mat.uniforms.uTime.value = time; m.update(time); renderer.render(scene, cam); glow(); },
    dispose() { bp.dispose(); renderer.dispose(); renderer.forceContextLoss?.(); }
  };
}
