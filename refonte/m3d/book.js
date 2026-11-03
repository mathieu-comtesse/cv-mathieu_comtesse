// Machines du livre de génie climatique (échangeur, centrale d'air, vanne PID, circulateur, pot à boue) posées sur les pages projet.
// Les modèles viennent de assets/machines (Blender, DA du décor) ; les pièces nommées anim_* sont animées ici : ventilateur, aiguilles, tige, aimant.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { daLook } from '../../js/da-shader.js?v=da5';

const SWAP = { '#f78a6e': '#8a72d6', '#ec6a85': '#6fb08c', '#8a72d6': '#f78a6e', '#fed8ad': '#ffe3d2', '#fcc59a': '#e4f1dc', '#c94f68': '#563a92' };
const swap = new Map(Object.entries(SWAP).map(([a, b]) => [new THREE.Color(a), new THREE.Color(b)]));

export async function makeBook(file, { label, fmt, recolor = false, speed = 1 }) {
  const gltf = await new GLTFLoader().loadAsync('assets/machines/' + file + '.glb?v=bk8');
  const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
  const width = Math.max(size.x, size.z, size.y * (file === "autoclave" ? 0.9 : 1.45));   // une machine haute est réduite pour tenir dans le cadre
  function build() {
    const root = gltf.scene.clone(true), anims = [];
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = true;
        o.material = o.material.clone();
        const m = o.material; m.flatShading = true; m.roughness = 1; m.metalness = 0;
        if (recolor) for (const [a, b] of swap) if (Math.abs(m.color.r - a.r) + Math.abs(m.color.g - a.g) + Math.abs(m.color.b - a.b) < 0.02) { m.color.copy(b); break; }
        daLook(m);
      }
      if (o.isMesh && /^anim_(puff|bubble)/.test(o.name)) { o.material.transparent = true; o.material.depthWrite = false; o.castShadow = false; }
      if (o.name.startsWith('anim_')) anims.push({ o, kind: o.name.split('_')[1], axis: ['x', 'y', 'z'].includes(o.name.split('_')[2]) ? o.name.split('_')[2] : 'z', base: o.position.clone(), phase: anims.length * 1.7, ang: 0 });
    });
    const g = new THREE.Group(); g.add(root);
    let v = 50, manual = -1e9, last = null;
    const controls = {
      label, min: 0, max: 100, step: 10, fmt,
      get: () => Math.round(v), set: (x) => { v = x; manual = last ?? 0; }
    };
    function update(time) {
      const dt = last === null ? 0 : Math.min(0.05, Math.max(0, time - last)); last = time;
      if (time - manual > 8) v = 50 + 40 * Math.sin(time * 0.18);      // sans geste, le réglage dérive doucement
      const k = v / 100;
      for (const a of anims) {
        if (a.kind === 'spin') { a.ang += dt * (0.6 + k * 9) * speed; a.o.rotation[a.axis] = a.ang; }
        else if (a.kind === 'swing') a.o.rotation.z = (k - 0.5) * 2.1 + 0.07 * Math.sin(time * 1.9 + a.phase);
        else if (a.kind === 'lift') a.o.position.y = a.base.y + k * 0.14;
        else if (a.kind === 'puff') {            // panache : monte, grossit et s'efface ; plus dense quand la pression monte
          const ph = ((time * (0.25 + k * 0.5) + a.phase * 0.37) % 1 + 1) % 1;
          a.o.position.y = a.base.y + ph * (0.5 + k * 0.7); a.o.position.x = a.base.x + Math.sin(ph * 5 + a.phase) * 0.05 * ph;
          a.o.scale.setScalar(0.4 + ph * (1.3 + k)); a.o.material.opacity = Math.max(0, 0.95 * (1 - ph)) * (0.35 + k * 0.65);
        } else if (a.kind === 'bubble') {        // ébullition : les bulles montent dans le tube de niveau
          const ph = ((time * (0.5 + k * 1.6) + a.phase * 0.31) % 1 + 1) % 1;
          a.o.position.y = a.base.y + ph * 0.3 - 0.12; a.o.material.opacity = ph < 0.9 ? 0.95 : 0; a.o.scale.setScalar(0.6 + 0.6 * Math.sin(ph * 3.14));
        }
      }
    }
    update(0);
    return { group: g, update, controls };
  }
  return { build, width };
}
