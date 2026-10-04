(async () => {
  const THREE = await import('./three.module.js');
  const J = window.AtlasGame.jeu, M = window.AtlasMonde, out = {};
  M.scene.updateMatrixWorld(true);
  const cam = M.camera.clone(), rc = new THREE.Raycaster(), box = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3();
  const cibles = [...Object.values(M.bats).map((b) => b.groupe), M.objets.pont, M.objets.ponton, M.objets.yacht, M.objets.bateau, M.objets.voilier, M.objets.phare, ...M.objets.rames, M.objets.voiture, M.objets.canard, ...M.objets.mouettes, ...M.objets.poissons];
  for (const [id, e] of J.oeufs) {
    if (!e.obj) { out[id] = 'bouton'; continue; }
    box.setFromObject(e.obj); box.getCenter(c); box.getSize(sz); let best = null;
    for (const z of [40, 24, 14]) for (let k = 0; k < 24; k++) for (const pt of [0.35, 0.8, 1.2]) {
      const sp = k / 24 * Math.PI * 2; cam.position.set(Math.sin(sp) * z * Math.cos(pt), -1 + Math.sin(pt) * z, 0.4 + Math.cos(sp) * z * Math.cos(pt)); cam.lookAt(0, -1, 0.4); cam.updateMatrixWorld();
      rc.set(cam.position, c.clone().sub(cam.position).normalize()); rc.camera = cam;
      const hit = rc.intersectObjects(cibles, true).find((h) => h.object.visible && !h.object.isLineSegments);
      if (hit && hit.object.userData.oeuf === id) { const d = cam.position.distanceTo(c), px = Math.max(sz.x, sz.y, sz.z) / d * 450 / Math.tan(cam.fov * Math.PI / 360); if (!best || px > best.px) best = { z, spin: +sp.toFixed(2), pt, px: +px.toFixed(1) }; }
    }
    out[id] = best || 'INVISIBLE';
  }
  return JSON.stringify(out);
})()
