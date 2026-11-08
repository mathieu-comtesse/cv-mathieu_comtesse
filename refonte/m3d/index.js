// Charge la machine 3D d'un projet et la pose sur le plan blueprint, avec la caméra de la page.
import * as THREE from 'three';
import { makeStage, setDA } from './core.js';
import { trackGlow, ACCENT } from './glow.js';

const MODULES = {
  /* Reporteur Q18 : nouvelle machine (q18.js). ?machines=old rend l'ancien modèle pour comparaison. */
  moteur: () => (/[?&]machines=old\b/.test(location.search) ? import('./moteur.js') : import('./q18.js')),
  cerfa: () => (/[?&]machines=old\b/.test(location.search) ? import('./cerfa.js') : import('./cerfa-sorter.js')),
  vm: () => (/[?&]machines=old\b/.test(location.search) ? import('./vm.js') : import('./vm-sorting.js')),
  vre: () => import('./vre-wattselse.js'),
  gares: () => (/[?&]machines=old\b/.test(location.search) ? import('./gares.js') : import('./gares-board.js')),
  finance: () => (/[?&]machines=old\b/.test(location.search) ? import('./finance.js') : import('./finance-reservoir.js')),
  pp: () => (/[?&]machines=old\b/.test(location.search) ? import('./pp.js') : import('./pp-clock.js')),
  powerbi: () => (/[?&]machines=old\b/.test(location.search) ? import('./powerbi-wattselse.js') : import('./powerbi-paternoster.js')),
  suivi: () => import('./suivi.js'),
  studio: () => (/[?&]machines=old\b/.test(location.search) ? import('./studio-wattselse.js') : import('./studio-pdf.js')), 'vrestudio-musicbox': () => import('./nisaru.js')
};

export async function mountMachine(name, canvas, cam, origin = new THREE.Vector3(0, 0, 0)) {
  const load = MODULES[name]; if (!load) throw new Error('machine inconnue : ' + name);
  const { build, WIDTH = 236 } = await load();
  setDA(name);
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
    api: m.api ? { inspect: (v) => m.api.setInspect(v), anchor: (n) => { const o = m.api.anchors[n]; return o ? o.getWorldPosition(new THREE.Vector3()) : null; }, views: m.api.views, scenarios: m.api.scenarios, setScenario: m.api.setScenario } : null,
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
