// Surbrillance des pièces qui bougent (même principe que refonte/m3d/glow.js) mais mesurée dans le repère de la machine :
// faire tourner la machine entière ne doit pas allumer toutes ses pièces. Seuls les mouvements propres du mécanisme comptent.
import * as THREE from 'three';
const HOLD = 420;
export function trackGlowLocal(root, accent = '#ff9d3c') {
  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), items = [];
  root.updateWorldMatrix(true, true);
  inv.copy(root.matrixWorld).invert();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.glowShell || o.userData.merged || o.userData.mergedStatic) return;
    items.push({ o, prev: rel.multiplyMatrices(inv, o.matrixWorld).elements.slice(), vis: o.visible, until: 0, shell: null });
  });
  const shellOf = (it) => {
    if (it.shell) return it.shell;
    const src = it.o.material, cut = src && src.map && src.alphaTest > 0;
    const m = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...(cut ? { map: src.map, alphaTest: src.alphaTest } : {}) });
    const s = new THREE.Mesh(it.o.geometry, m);
    s.userData.glowShell = true; s.castShadow = false; s.receiveShadow = false; s.visible = false; s.raycast = () => {};
    it.o.add(s); it.shell = s; return s;
  };
  return function step(now = performance.now()) {
    root.updateWorldMatrix(true, false); inv.copy(root.matrixWorld).invert();
    for (const it of items) {
      const e = rel.multiplyMatrices(inv, it.o.matrixWorld).elements; let moved = it.o.visible !== it.vis;
      for (let i = 0; i < 16 && !moved; i++) if (Math.abs(e[i] - it.prev[i]) > 1e-4) moved = true;
      if (moved) { for (let i = 0; i < 16; i++) it.prev[i] = e[i]; it.vis = it.o.visible; it.until = now + HOLD; }
      const level = Math.max(0, Math.min(1, (it.until - now) / HOLD));
      if (level > 0) { const s = shellOf(it); s.visible = true; s.material.opacity = .42 * level; }
      else if (it.shell && it.shell.visible) it.shell.visible = false;
    }
  };
}
