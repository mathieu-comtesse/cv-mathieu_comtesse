// Fig 10 · Studio d'extracteurs PDF : une machine à reproduire les clés, en 3D (cotes de figures/build-studio.mjs).
// La clé modèle (le PDF exemple) est serrée à l'arrière, l'ébauche à l'avant. Le pont glisse le long des deux lames : le palpeur
// suit chaque zone tracée sur le modèle, la fraise taille la même encoche dans l'ébauche. La clé taillée entre dans la serrure de
// sa famille, tourne d'un quart de tour et ouvre son casier.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, group, bench, ease, hash } from './core.js';

export const WIDTH = 268;
const PLATE = { x: -128, y: -78, w: 268, d: 134, r: 8 };
const BASE = { x: -110, y: -62, w: 156, d: 104 }, BASE_H = 14;
const KEY = { x0: -38, z: BASE_H + 4, len: 43, wid: 14 };
const LANES = { master: -24, blank: 18 }, BRIDGE_Z = 48;
const LOCKER = { x: 52, y: -66, w: 78, d: 36 }, LOCKER_H = 82, FACE = LOCKER.y + LOCKER.d;
const DOOR = { w: 36, h: 37, th: 1.6, ka: 27, kz: 18 };
const DOORS = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([c, r]) => ({ x: LOCKER.x + 2 + c * (DOOR.w + 2), z: 3 + (1 - r) * (DOOR.h + 2) }));
const PERIOD = 11, NOTCH = 6;

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -100, y: PLATE.y + PLATE.d - 12, w: 140, d: 7 }, label: { x: 60, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  g.add(slab(BASE.x, BASE.y, BASE.w, BASE.d, 0, BASE_H, COL.mid, 4));
  // lits des clés, serre-clés
  for (const y of [LANES.master, LANES.blank]) { g.add(slab(KEY.x0 - 14, y - 9, KEY.len + 26, 18, BASE_H, 3, COL.lo, 1.2)); g.add(slab(KEY.x0 - 14, y - 9, 6, 18, BASE_H + 3, 8, COL.mid, 1)); }
  // clés : tête ronde + lame crantée ; la modèle porte ses encoches, l'ébauche les reçoit une à une
  const keyShape = (c) => { const k = new THREE.Group(); k.add(cyl(0, 0, 8, 0, 2.4, c, 28)); const bl = box(KEY.len / 2 + 7, 0, 1.2, KEY.len, KEY.wid, 2.4, c); k.add(bl); k.children[0].position.set(-2, 1.2, 0); return k; };
  const master = keyShape(COL.hi); master.position.set(KEY.x0 + 6, KEY.z, LANES.master); g.add(master);
  const blank = keyShape(COL.accent); blank.position.set(KEY.x0 + 6, KEY.z, LANES.blank); g.add(blank);
  const mNotches = [], bNotches = [];
  for (let i = 0; i < 6; i++) {
    const x = KEY.x0 + 6 + 12 + i * 6.4, depth = 2 + hash(i + 9) * 3.2;
    const m = box(x, LANES.master + KEY.wid / 2 - depth / 2, KEY.z + 1.2, 4, depth, 2.6, COL.dark, 0); g.add(m); mNotches.push({ m, depth });
    const b = box(x, LANES.blank + KEY.wid / 2 - depth / 2, KEY.z + 1.2, 4, depth, 2.6, COL.dark, 0); g.add(b); bNotches.push({ b, depth, x });
  }
  // rails et pont mobile : palpeur au-dessus du modèle, fraise au-dessus de l'ébauche
  for (const y of [-54, 38]) g.add(box(KEY.x0 + 20, y, 22, 110, 3, 3, COL.lo));
  const bridge = new THREE.Group();
  bridge.add(box(0, -8, BRIDGE_Z, 10, 100, 6, COL.mid), box(0, -54, 34, 10, 6, 28, COL.mid), box(0, 38, 34, 10, 6, 28, COL.mid));
  const stylus = cyl(0, LANES.master + 4, 1.6, 30, 18, COL.dark, 14), cutter = cyl(0, LANES.blank + 4, 3.4, 30, 18, COL.red, 20);
  bridge.add(stylus, cutter);
  g.add(bridge);
  // casier : quatre portes à serrure
  g.add(slab(LOCKER.x, LOCKER.y, LOCKER.w, LOCKER.d, 0, LOCKER_H, COL.mid, 2));
  const doors = DOORS.map((d, i) => {
    const hinge = new THREE.Group(); hinge.position.set(d.x, d.z, FACE + .1);
    const door = box(DOOR.w / 2, DOOR.h / 2, 0, DOOR.w, DOOR.th, DOOR.h, COL.hi); door.position.set(DOOR.w / 2, DOOR.h / 2, .8);
    const lock = cyl(0, 0, 3, 0, 1, COL.lo, 24); lock.rotation.x = Math.PI / 2; lock.position.set(DOOR.ka, DOOR.kz, 2);
    const slot = box(DOOR.ka, DOOR.kz, 2.6, 1, 3, 1, COL.dark, 0);
    hinge.add(door, lock, slot); g.add(hinge); return { hinge, lock };
  });
  const cut = keyShape(COL.accent); g.add(cut);

  function update(time) {
    const idx = Math.floor(time / PERIOD), t = time - idx * PERIOD, door = Math.floor(hash(idx + 21) * 4);
    const sweep = ease(Math.min(1, t / 5)), bx = KEY.x0 + 6 + 8 + sweep * 42;
    bridge.position.x = t < 5.6 ? bx : bx;
    stylus.position.y = 30 - (Math.sin(t * 7) > 0 ? 1.2 : 0); cutter.position.y = 30 + (Math.sin(t * 40) > 0 ? .4 : 0);
    bNotches.forEach((n, i) => { n.b.visible = bx > n.x - 1 && t > .1; });
    const cutDone = t > 5.2;
    master.visible = true; blank.visible = !cutDone; cut.visible = cutDone;
    if (cutDone) {
      const u = ease((t - 5.4) / 2.6), d = DOORS[door];
      const tx = d.x + DOOR.ka, tz = d.z + DOOR.kz, ty = FACE + 4;
      cut.position.set(KEY.x0 + 6 + (tx - KEY.x0 - 6) * u, KEY.z + (tz - KEY.z) * u + Math.sin(Math.PI * u) * 12, LANES.blank + (ty - LANES.blank) * u);
      cut.rotation.set(u > .9 ? 0 : 0, -Math.PI / 2 * u, 0); cut.rotation.y = -Math.PI / 2 * u;
      if (t > 8) cut.rotation.z = -ease((t - 8) / .8) * Math.PI / 2;
    } else { notchesReset(); }
    function notchesReset() { cut.position.set(KEY.x0 + 6, KEY.z, LANES.blank); }
    doors.forEach((d, i) => { const open = i === door ? ease((t - 8.8) / 1) * (1 - ease((t - 10.4) / .6)) : 0; d.hinge.rotation.y = -open * 1.4; });
  }
  update(0);
  return { group: g, update };
}
