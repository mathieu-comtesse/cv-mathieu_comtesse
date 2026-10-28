// Surbrillance des pièces qui s'actionnent (même principe que js/figure-glow.js des figures d'origine) : une pièce qui bouge,
// apparaît ou disparaît prend la couleur d'accent de sa machine, avec une lueur douce qui s'éteint quand elle s'arrête.
import * as THREE from 'three';

export const ACCENT = { cerfa: '#fb7185', vm: '#22d3ee', vre: '#a78bfa', moteur: '#ff9d3c', gares: '#a3e635', finance: '#fbbf24', pp: '#2dd4bf', powerbi: '#60a5fa', suivi: '#f472b6', studio: '#fb923c' };
const HOLD = 420;                                    // ms de lueur après le dernier mouvement

export function trackGlow(root, accent = '#ff9d3c') {
  const items = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.userData.glowShell) return;
    items.push({ o, prev: o.matrixWorld.elements.slice(), vis: o.visible, until: 0, shell: null });
  });
  const shellOf = (it) => {
    if (it.shell) return it.shell;
    const m = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const s = new THREE.Mesh(it.o.geometry, m);
    s.userData.glowShell = true; s.castShadow = false; s.receiveShadow = false; s.visible = false; s.raycast = () => {};
    it.o.add(s); it.shell = s; return s;
  };
  // à appeler après chaque rendu (les matrices du monde sont alors à jour)
  return function step(now = performance.now()) {
    for (const it of items) {
      const e = it.o.matrixWorld.elements; let moved = it.o.visible !== it.vis;
      for (let i = 0; i < 16 && !moved; i++) if (Math.abs(e[i] - it.prev[i]) > 1e-5) moved = true;
      if (moved) { for (let i = 0; i < 16; i++) it.prev[i] = e[i]; it.vis = it.o.visible; it.until = now + HOLD; }
      const level = Math.max(0, Math.min(1, (it.until - now) / HOLD));
      if (level > 0) { const s = shellOf(it); s.visible = true; s.material.opacity = .42 * level; }
      else if (it.shell && it.shell.visible) it.shell.visible = false;
    }
  };
}
