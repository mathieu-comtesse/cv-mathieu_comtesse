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
  let frameN = 0, casters = null, lastSig = NaN, firstShadow = true, shadowN = 0;
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
    /** compteurs du dernier rendu (diagnostic) : appels de dessin, groupes, triangles, géométries, textures, programmes, mises à jour d'ombre */
    info: () => { let meshes = 0, inst = 0, shadow = 0, groups = 0, transp = 0, dbl = 0, multi = 0, invisible = 0; const geo = new Set(), mat = new Set();
      g.traverse((o) => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; if (ms.length > 1) { multi++; groups += o.geometry.groups.length; } else groups++;
        for (const x of ms) { if (x.transparent) transp++; if (x.side === 2) dbl++; } let v = true, a = o; while (v && a) { v = a.visible; a = a.parent; } if (!v) invisible++;
        meshes++; geo.add(o.geometry.uuid); mat.add(ms[0].uuid); if (o.isInstancedMesh) inst++; if (o.castShadow) shadow++; });
      return { rendus: frameN, majOmbre: shadowN, groupesDeDessin: groups, multiMateriaux: multi, transparents: transp, doubleFace: dbl, invisibles: invisible, meshes, instanced: inst, castShadow: shadow, uniqueGeometries: geo.size, uniqueMaterials: mat.size,
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0 }; },
    /* Carte d'ombre (2048², filtrée) : recalculée seulement si une pièce qui projette une ombre a bougé (signature numérique des matrices monde),
       au plus une image sur deux (l'ombre suit avec 16 ms de retard, invisible), et toujours pendant la magie. Machine immobile : plus aucune passe d'ombre. */
    render(time) {
      m.update(time); g.updateMatrixWorld(true);
      if (!casters) { casters = []; g.traverse((o) => { if (o.isMesh && o.castShadow) casters.push(o); }); }
      let sig = 0; for (let i = 0; i < casters.length; i++) { const o = casters[i], e = o.matrixWorld.elements; let v = 1, a = o; while (a && v) { v = a.visible ? 1 : 0; a = a.parent; }   // visibilité réelle (parents compris), pièces instanciées (version du buffer), géométries recalculées (version des positions)
        sig += v * 0.37 + (o.instanceMatrix ? o.instanceMatrix.version * 19.3 : 0) + (o.geometry.attributes.position ? o.geometry.attributes.position.version * 23.9 : 0) + e[12] * 1.31 + e[13] * 1.73 + e[14] * 2.11 + e[0] * 3.3 + e[5] * 5.1 + e[10] * 7.7 + e[1] * 11.3 + e[4] * 13.7 + e[8] * 17.9; }
      const changed = sig !== lastSig, lock = document.body.classList.contains('fl-lock'), turn = (frameN++ & 1) === 0;
      renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = lock || (changed && turn) || firstShadow;
      if (renderer.shadowMap.needsUpdate) { lastSig = sig; firstShadow = false; shadowN++; }
      renderer.render(scene, cam); glow();
    },
    shadowUpdates: () => shadowN,
    dispose() { renderer.dispose(); }
  };
}
