// Charge la machine 3D d'un projet et la pose sur le plan blueprint, avec la caméra de la page.
import * as THREE from 'three';
import { makeStage, setDA } from './core.js';
import { trackGlow, ACCENT } from './glow.js';

import { loadMachine, framingOf } from './registry.js';

export async function mountMachine(name, canvas, cam, origin = new THREE.Vector3(0, 0, 0)) {
  const { build, WIDTH = 236 } = await loadMachine(name);
  setDA(name);
  const { renderer, scene } = makeStage(canvas);
  const m = build();
  const g = new THREE.Group(); g.add(m.group); g.scale.setScalar(12.6 / WIDTH * framingOf(name).scale);
  scene.add(g);
  // centrage sur l'origine du plan, socle posé à y = 0
  const box = new THREE.Box3().setFromObject(g);
  const c = box.getCenter(new THREE.Vector3());
  g.position.set(origin.x - c.x, origin.y - box.min.y, origin.z - c.z);
  scene.updateMatrixWorld(true);
  const w = () => { renderer.setSize(innerWidth, innerHeight, false); };
  w();
  const glow = trackGlow(g, ACCENT[name]);
  const mid = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());   // centre de la machine (cadrage des panneaux)
  let frameN = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  return {
    resize: w,
    center: () => mid,
    controls: m.controls,
    api: m.api ? { inspect: (v) => m.api.setInspect(v), anchor: (n) => { const o = m.api.anchors[n]; return o ? o.getWorldPosition(new THREE.Vector3()) : null; }, views: m.api.views, scenarios: m.api.scenarios, setScenario: m.api.setScenario, frames: m.api.frames, params: m.api.params, status: m.api.status, drag: m.api.drag } : null,
    /** rayon monde sous le pointeur (pour api.drag : glisser des éléments de la machine) */
    rayAt(cx, cy) { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); cam.updateMatrixWorld(); ray.setFromCamera(ndc, cam); return ray.ray; },
    /** vrai si le point (clientX, clientY) est sur une pièce visible de la machine */
    pick(cx, cy) {
      ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
      const hit = (o) => { if (!o.visible || o.userData.glowShell) return false; if (o.isMesh && ray.intersectObject(o, false).length) return true; return o.children.some(hit); };
      return hit(g);
    },
    /* la carte d'ombre (2048², filtrée) n'est recalculée qu'une image sur deux : l'ombre suit la machine avec 16 ms de retard, invisible ; la passe d'ombre est l'un des coûts de rendu les plus lourds */
    /** compteurs du dernier rendu (diagnostic) : appels de dessin, triangles, géométries, textures, programmes */
    info: () => { let meshes = 0, inst = 0, shadow = 0; const geo = new Set(), mat = new Set(); let groups = 0, transp = 0, dbl = 0, multi = 0, invisible = 0; g.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; if (ms.length > 1) { multi++; groups += o.geometry.groups.length; } else groups++; for (const m of ms) { if (m.transparent) transp++; if (m.side === 2) dbl++; } let v = o.visible, a = o.parent; while (v && a) { v = a.visible; a = a.parent; } if (!v) invisible++; meshes++; geo.add(o.geometry.uuid); mat.add(o.material.uuid); if (o.isInstancedMesh) inst++; if (o.castShadow) shadow++; } }); return { groupesDeDessin: groups, multiMateriaux: multi, transparents: transp, doubleFace: dbl, invisibles: invisible, meshes, instanced: inst, castShadow: shadow, uniqueGeometries: geo.size, uniqueMaterials: mat.size,  calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0 }; },
    render(time) { m.update(time); renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = (frameN++ & 1) === 0 || document.body.classList.contains('fl-lock'); renderer.render(scene, cam); glow(); },
    dispose() { renderer.dispose(); }
  };
}
