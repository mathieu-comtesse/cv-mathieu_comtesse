// Fig 05 · Gares prioritaires : un tableau à palettes piloté par un bouton de pondération, en 3D (cotes de figures/build-gares.mjs).
// L'armoire (19 tiroirs, 159 picots) calcule un score par gare ; le bouton dose conformité et maintenance, les palettes se retournent.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, ease, hash } from './core.js';

export const WIDTH = 268;
const PLATE = { x: -134, y: -36, w: 268, d: 100, r: 8 };
const BOARD = { x: -92, y: -22, w: 184, d: 14 }, BOARD_Z = [56, 140], FACE = BOARD.y + BOARD.d;
const ROWS = 6, CELL = { w: 8.4, h: 9.4, gap: 1.2 }, ROW_H = 11, TOP_RAIL = 130;
const COLS = [{ x: -80, n: 2 }, { x: -54, n: 7 }, { x: 34, n: 3 }];
const DESK = { x: -112, y: 16, w: 74, d: 34 }, DESK_H = 20, KNOB = { x: -75, y: 33, r: 9 };
const CAB = { x: 6, y: 14, w: 96, d: 34 }, CAB_H = 34;
const rowZ = (r) => TOP_RAIL - (r + 1) * ROW_H + .8;
const PERIOD = 7;

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -120, y: PLATE.y + PLATE.d - 12, w: 130, d: 7 }, label: { x: 70, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  for (const x of [-74, 66]) g.add(slab(x - 4, -24, 16, 18, 0, 3, COL.lo, 2), slab(x, -18, 8, 6, 3, BOARD_Z[0] - 3, COL.mid, 1));
  g.add(slab(BOARD.x, BOARD.y, BOARD.w, BOARD.d, BOARD_Z[0], BOARD_Z[1] - BOARD_Z[0], COL.dark, 2));
  g.add(slab(BOARD.x - 2, BOARD.y - 1, BOARD.w + 4, BOARD.d + 2, BOARD_Z[1], 3, COL.mid, 1.4));
  // palettes : une plaquette qui pivote autour de son bord haut
  const pal = [];
  for (let r = 0; r < ROWS; r++) COLS.forEach((c, ci) => {
    for (let n = 0; n < c.n; n++) {
      const pivot = new THREE.Group(); pivot.position.set(c.x + n * (CELL.w + CELL.gap) + CELL.w / 2, rowZ(r) + CELL.h, FACE + .6);
      const front = box(0, 0, -CELL.h / 2, CELL.w, .8, CELL.h, COL.hi, 0), back = box(0, 0, -CELL.h / 2, CELL.w, .8, CELL.h, COL.dark, 0);
      front.position.set(0, -CELL.h / 2, .4); back.position.set(0, -CELL.h / 2, -.4);
      pivot.add(front, back); g.add(pivot); pal.push({ pivot, r, ci, n });
    }
  });
  const lampTop = cyl(74, FACE + 1, 3, 144, 3, COL.lo, 24); lampTop.position.set(74, 144 + 1.5, FACE + 1); g.add(lampTop);
  // pupitre et bouton de pondération
  g.add(slab(DESK.x, DESK.y, DESK.w, DESK.d, 0, DESK_H, COL.mid, 2.4));
  const knob = group(cyl(0, 0, KNOB.r, 0, 6, COL.lo, 36), cyl(0, 0, KNOB.r - 1.6, 6, 1.4, COL.hi, 36), box(0, -KNOB.r + 3, 7.6, 1.4, 6, .6, COL.accent, 0));
  knob.position.set(KNOB.x, DESK_H, KNOB.y); g.add(knob);
  for (let i = 0; i <= 10; i++) { const a = (-.75 + 1.5 * i / 10) * Math.PI; g.add(box(KNOB.x + Math.sin(a) * (KNOB.r + 3), KNOB.y - Math.cos(a) * (KNOB.r + 3), DESK_H + .3, .6, 2, .3, COL.dark, 0)); }
  // armoire : 19 tiroirs en façade, 159 picots dessus
  g.add(slab(CAB.x, CAB.y, CAB.w, CAB.d, 0, CAB_H, COL.mid, 2.4));
  let drawer = 0;
  for (let r = 0; r < 5 && drawer < 19; r++) for (let c = 0; c < 4 && drawer < 19; c++, drawer++) {
    g.add(box(CAB.x + 12 + c * 24, CAB.y + CAB.d + .1, 5 + r * 6.2, 21, .5, 5, COL.hi, 0)); g.add(box(CAB.x + 12 + c * 24, CAB.y + CAB.d + .5, 7.4 + r * 6.2, 5, .6, .8, COL.dark, 0));
  }
  const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(.9, .9, 3, 10), mat(COL.dark), 159); pins.castShadow = true;
  const m4 = new THREE.Matrix4(); for (let i = 0; i < 159; i++) { const cx = i % 15, cy = Math.floor(i / 15); m4.makeTranslation(CAB.x + 6 + cx * 5.9, CAB_H + 1.5, CAB.y + 4 + cy * 2.6); pins.setMatrixAt(i, m4); }
  g.add(pins);

  function update(time) {
    const cyc = Math.floor(time / PERIOD), u = (time - cyc * PERIOD) / PERIOD;
    const flip = u < .5 ? 0 : ease((u - .5) / .35);
    pal.forEach((p) => {
      const stagger = (p.r * 3 + p.ci) / 40, f = ease(Math.max(0, Math.min(1, (flip * 1.5 - stagger))));
      const a = hash(cyc * 97 + p.r * 13 + p.ci * 5 + p.n) < .5 ? 1 : 0, b = hash((cyc - 1) * 97 + p.r * 13 + p.ci * 5 + p.n) < .5 ? 1 : 0;
      p.pivot.rotation.x = (a !== b ? f * Math.PI : 0) + (b ? Math.PI : 0) * 0;
    });
    knob.rotation.y = Math.sin(time * .45) * 1.1;
    lampTop.material = Math.sin(time * 3) > 0 ? new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .9 }) : new THREE.MeshStandardMaterial({ color: COL.lo });
  }
  update(0);
  return { group: g, update };
}
