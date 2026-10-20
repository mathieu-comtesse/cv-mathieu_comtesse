// Charge la machine 3D d'un projet et la pose sur le plan blueprint, avec la caméra de la page.
import * as THREE from 'three';
import { makeStage } from './core.js';

const MODULES = {
  moteur: () => import('./moteur.js'),
  cerfa: () => import('./cerfa.js'),
  vm: () => import('./vm.js'),
  vre: () => import('./vre.js'),
  gares: () => import('./gares.js'),
  finance: () => import('./finance.js'),
  pp: () => import('./pp.js'),
  powerbi: () => import('./powerbi.js'),
  suivi: () => import('./suivi.js'),
  studio: () => import('./studio.js')
};

export async function mountMachine(name, canvas, cam, origin = new THREE.Vector3(0, 0, 0)) {
  const load = MODULES[name]; if (!load) throw new Error('machine inconnue : ' + name);
  const { build, WIDTH = 236 } = await load();
  const { renderer, scene } = makeStage(canvas);
  const m = build();
  const g = new THREE.Group(); g.add(m.group); g.scale.setScalar(12.6 / WIDTH);
  scene.add(g);
  // centrage sur l'origine du plan, socle posé à y = 0
  const box = new THREE.Box3().setFromObject(g);
  const c = box.getCenter(new THREE.Vector3());
  g.position.set(origin.x - c.x, origin.y - box.min.y, origin.z - c.z);
  scene.updateMatrixWorld(true);
  const w = () => { renderer.setSize(innerWidth, innerHeight, false); };
  w();
  return {
    resize: w,
    render(time) { m.update(time); renderer.render(scene, cam); },
    dispose() { renderer.dispose(); }
  };
}
