// Fig 03 · Extracteur VRE : une trieuse de jetons à quatre tubes, en 3D (cotes de figures/build-vre.mjs).
// La trémie lâche les équipements sur la goulotte ; chaque jeton tombe dans le premier trou à sa taille : BT31, BT33, BT21, BT11.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, group, bench, display, ease, hash } from './core.js';

export const WIDTH = 280;
const PLATE = { x: -168, y: -40, w: 280, d: 82, r: 8 };
const BASE = { x: -98, y: -20, w: 166, d: 40 }, BASE_H = 16, FACE_Y = BASE.y + BASE.d;
const TX = [-72, -32, 8, 48], R = [4.6, 5.6, 6.6, 7.6], THICK = 2.2;
const CUP_Z = BASE_H, CAGE_TOP = 78;
const CHUTE = { x0: -134, x1: 78, z0: 98.6, slope: .08, half: 9.6 };
const ZR = (x) => CHUTE.z0 - (x - CHUTE.x0) * CHUTE.slope;
const PERIOD = 1.15, CYCLE = 24;
const NAMES = ['BT31', 'BT33', 'BT21', 'BT11'];

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 12, w: 140, d: 7 }, label: { x: 24, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  g.add(slab(BASE.x, BASE.y, BASE.w, BASE.d, 0, BASE_H, COL.mid, 3));
  // montants et goulotte inclinée percée de quatre trous
  g.add(slab(-142, -4, 8, 8, 2, 96, COL.mid, 1), slab(72, -4, 8, 8, 2, 78, COL.mid, 1));
  const len = Math.hypot(CHUTE.x1 - CHUTE.x0, (CHUTE.z0 - ZR(CHUTE.x1)));
  const chute = box((CHUTE.x0 + CHUTE.x1) / 2, 0, (CHUTE.z0 + ZR(CHUTE.x1)) / 2 - 1, len, CHUTE.half * 2, 2, COL.mid); chute.rotation.z = Math.atan2(ZR(CHUTE.x1) - CHUTE.z0, CHUTE.x1 - CHUTE.x0); g.add(chute);
  for (const s of [-1, 1]) { const rail = box((CHUTE.x0 + CHUTE.x1) / 2, s * (CHUTE.half + 1), (CHUTE.z0 + ZR(CHUTE.x1)) / 2 + 1, len, 2, 4, COL.lo); rail.rotation.z = chute.rotation.z; g.add(rail); }
  TX.forEach((x, i) => g.add(cyl(x, 0, R[i] + .4, ZR(x) - .6, .4, COL.dark, 24)));
  // trémie
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(14, 6, 18, 24, 1, true), mat(COL.glass, { side: THREE.DoubleSide, transparent: true, opacity: .55 })); hopper.position.set(-118, 99.6 + 11, 0); g.add(hopper);
  // sélecteur à gauche
  g.add(slab(-150, 4, 24, 4, 30, 26, COL.mid, 1));
  const knob = cyl(0, 0, 5.4, 0, 3, COL.lo, 24); knob.rotation.x = Math.PI / 2; const kg = group(knob); kg.position.set(-138, 43, 8.4); g.add(kg);
  // tubes en verre, piles de jetons, compteurs
  const stacks = [], counters = [];
  TX.forEach((x, i) => {
    const tubeG = new THREE.Mesh(new THREE.CylinderGeometry(R[i] + 1.6, R[i] + 1.6, CAGE_TOP - CUP_Z, 32, 1, true), mat(COL.glass, { side: THREE.DoubleSide, transparent: true, opacity: .28 }));
    tubeG.position.set(x, (CAGE_TOP + CUP_Z) / 2, 0); g.add(tubeG);
    g.add(cyl(x, 0, R[i] + 2.4, CUP_Z, 1.2, COL.lo, 32));
    const st = cyl(0, 0, R[i], 0, 1, i % 2 ? COL.accent : COL.hi, 32); st.position.set(x, CUP_Z + 1.2, 0); g.add(st); stacks.push(st);
    const d = display(26, 8); d.mesh.position.set(x, 9, FACE_Y + .05); g.add(d.mesh); counters.push(d);
  });
  const lamp = cyl(60, FACE_Y, 2, 9.5, 1, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(60, 9.5, FACE_Y + .3); g.add(lamp);
  const tokens = Array.from({ length: 3 }, () => { const m = cyl(0, 0, 5, 0, THICK, COL.accent, 28); m.rotation.x = Math.PI / 2; const w = group(m); g.add(w); return w; });
  const kindOf = (i) => Math.floor(hash(i + 7) * 4);
  const counts = (idx) => { const c = [0, 0, 0, 0], base = Math.floor(idx / CYCLE) * CYCLE; for (let i = base; i <= idx; i++) c[kindOf(i)]++; return c; };

  function update(time) {
    const idx = Math.floor(time / PERIOD), base = Math.floor(idx / CYCLE) * CYCLE;
    const c = [0, 0, 0, 0]; for (let i = base; i <= idx; i++) { const age = time - i * PERIOD; if (age > 2.1) c[kindOf(i)]++; }
    const reset = (idx - base) >= CYCLE - 2 ? Math.min(1, (time - (base + CYCLE - 2) * PERIOD) / (2 * PERIOD)) : 0;
    stacks.forEach((s, i) => { const n = Math.max(0, c[i] * (1 - ease(reset))); const h = Math.max(.01, n * THICK); s.scale.y = h; s.position.y = CUP_Z + 1.2 + h / 2; s.visible = n > .05; counters[i].set(NAMES[i] + ' ' + String(Math.round(n)).padStart(2, '0')); });
    tokens.forEach((w, slot) => {
      const i = idx - ((idx - slot) % 3 + 3) % 3, age = time - i * PERIOD, k = kindOf(i), x1 = TX[k];
      w.visible = age >= 0 && age < 2.1; if (!w.visible) return;
      w.scale.set(R[k] / 5, 1, R[k] / 5);
      let x, z, y = 0;
      if (age < 1.5) { const u = age / 1.5; x = -118 + (x1 + 118) * u * u * .6 + (x1 + 118) * u * .4; z = ZR(x) + R[k] + 1.2; }
      else { const u = (age - 1.5) / .6; x = x1; const top = CUP_Z + 1.2 + (c[k] + 0) * THICK + THICK; z = ZR(x1) + R[k] + 1.2 - (ZR(x1) + R[k] + 1.2 - top) * u * u; }
      w.position.set(x, z, y); w.rotation.set(0, 0, age < 1.5 ? -age * 4 : 0);
      // à plat une fois tombé dans le tube
      w.children[0].rotation.x = age < 1.5 ? Math.PI / 2 : 0;
    });
    lamp.material = reset > .1 ? new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: .9 }) : new THREE.MeshStandardMaterial({ color: COL.lo });
    kg.rotation.z = Math.sin(time * .4) * .9;
  }
  update(0);
  return { group: g, update };
}
