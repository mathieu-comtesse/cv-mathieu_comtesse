// Charge la machine 3D d'un projet et la pose sur le plan blueprint, avec la caméra de la page.
import * as THREE from 'three';
import { makeStage } from './core.js';
import { trackGlow, ACCENT } from './glow.js';

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
  studio: () => import('./studio.js'), 'vrestudio-musicbox': () => import('./vrestudio.js')
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
  const glow = trackGlow(g, ACCENT[name]);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  return {
    resize: w,
    controls: m.controls,
    /** vrai si le point (clientX, clientY) est sur une pièce visible de la machine */
    pick(cx, cy) {
      ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
      const hit = (o) => { if (!o.visible || o.userData.glowShell) return false; if (o.isMesh && ray.intersectObject(o, false).length) return true; return o.children.some(hit); };
      return hit(g);
    },
    render(time) { m.update(time); renderer.render(scene, cam); glow(); },
    dispose() { renderer.dispose(); }
  };
}
