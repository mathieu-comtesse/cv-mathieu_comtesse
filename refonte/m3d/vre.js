// Fig 03 · Extracteur VRE : un abaque à quatre tiges devant un rapport lu ligne à ligne, en 3D (cotes de figures/build-vre.mjs).
// Chaque équipement du rapport devient une boule qui roule sur la gouttière et tombe sur la tige de sa famille : BT31, BT33, BT21, BT11.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, prismXZ, display, bench, paper, ease, aframe } from './core.js';

export const WIDTH = 320;
const PLATE = { x: -164, y: -46, w: 320, d: 96, r: 8 };
const BASE = { x: -92, y: -20, w: 192, d: 40 }, BASE_H = 14, FACE_Y = BASE.y + BASE.d;
const TX = [-62, -24, 14, 52], R = [4.4, 5.2, 6, 6.8], THICK = 1.9, STACK_Z = BASE_H + 2, ROD_TOP = 92;
const CHUTE = { x0: -112, x1: 96, z0: 118, slope: .1, half: 6.6 }, ZR = (x) => CHUTE.z0 - (x - CHUTE.x0) * CHUTE.slope;
const HOPPER = { x: -108 }, DESK = { x: -152, y: -24, w: 46, d: 44 }, DESK_H = 26, POSTS = [-96, 12, 84];
const SAVED_MIN = 25, EUR_PER_REPORT = 25 / 60 * 104.74, FAMILY = ['BT31', 'BT33', 'BT21', 'BT11'];
const BUILDINGS = [['A', [18, 9, 7, 3]], ['B', [12, 6, 4, 0]], ['C', [24, 11, 8, 5]], ['D', [9, 4, 6, 2]], ['E', [15, 7, 5, 4]], ['F', [21, 8, 9, 1]]];
const GAP = .3, V0 = 40, ACC = 60, GRAV = 420, VERIFY = 1.2, SINK = .9, TURN = .9;
const hash = (i) => { let h = Math.imul(i + 11, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
function report(b) {
  const list = []; BUILDINGS[b][1].forEach((n, f) => { for (let j = 0; j < n; j++) list.push(f); });
  list.forEach((_, j) => { const r = Math.floor(hash(b * 97 + j) * (j + 1)); [list[j], list[r]] = [list[r], list[j]]; });
  const seen = [0, 0, 0, 0];
  const tokens = list.map((f, j) => { const d = TX[f] - HOPPER.x, ride = (-V0 + Math.sqrt(V0 * V0 + 2 * ACC * d)) / ACC, level = seen[f]++, drop = ZR(TX[f]) - (STACK_Z + level * THICK), fall = Math.sqrt(2 * Math.max(drop, 0) / GRAV); return { f, level, t0: j * GAP, ride, fall, land: j * GAP + ride + fall }; });
  const landed = Math.max(...tokens.map((t) => t.land));
  return { tokens, landed, verify: landed + .3, sink: landed + .3 + VERIFY, end: landed + .3 + VERIFY + SINK + TURN };
}
const REPORTS = BUILDINGS.map((_, b) => report(b));

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 13, w: 150, d: 7 }, label: { x: 66, y: PLATE.y + PLATE.d - 17, w: 46, d: 11 } }));
  g.add(slab(BASE.x, BASE.y, BASE.w, BASE.d, 0, BASE_H, COL.mid, 3), slab(DESK.x, DESK.y, DESK.w, DESK.d, 0, DESK_H, COL.mid, 2.4));
  for (const x of POSTS) g.add(aframe(x, -16, 0, ZR(x) - 3, 20, 3.4, 6), slab(x - 3, -14, 6, 12, ZR(x) - 3, 3, COL.mid, .8));
  const holes = TX.map((x, i) => [x - R[i] - 1.4, x + R[i] + 1.4]); const segs = []; let a = CHUTE.x0; for (const [h0, h1] of holes) { segs.push([a, h0]); a = h1; } segs.push([a, CHUTE.x1]);
  for (const [s0, s1] of segs) { g.add(prismXZ([[s0, ZR(s0)], [s1, ZR(s1)], [s1, ZR(s1) - 2.2], [s0, ZR(s0) - 2.2]], -CHUTE.half, CHUTE.half)); g.add(prismXZ([[s0, ZR(s0)], [s1, ZR(s1)], [s1, ZR(s1) + 2.4], [s0, ZR(s0) + 2.4]], CHUTE.half - 1.6, CHUTE.half)); }
  g.add(prismXZ([[CHUTE.x0, ZR(CHUTE.x0)], [CHUTE.x1, ZR(CHUTE.x1)], [CHUTE.x1, ZR(CHUTE.x1) + 4], [CHUTE.x0, ZR(CHUTE.x0) + 4]], -CHUTE.half, -CHUTE.half + 1.6));
  TX.forEach((x, i) => { g.add(cyl(x, 0, R[i] + 2.4, BASE_H, 2, COL.lo, 28), cyl(x, 0, 1.1, BASE_H, ROD_TOP - BASE_H, COL.mid, 12), cyl(x, 0, R[i] + 1.2, ROD_TOP - 6, 3, COL.mid, 28)); });
  const counters = TX.map((x) => { const d = display(22, 7); d.mesh.position.set(x, 7.5, FACE_Y + .05); g.add(d.mesh); return d; });
  const lamp = cyl(BASE.x + BASE.w - 12, FACE_Y - 8, 2.4, BASE_H, 1.4, COL.mid, 18); g.add(lamp);
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 }), lampOff = lamp.material;
  const knob = new THREE.Group(); knob.position.set(84, 7, FACE_Y); const kc = cyl(0, 0, 4.6, 0, 3.6, COL.mid, 24); kc.rotation.x = Math.PI / 2; kc.position.z = 1.8; knob.add(kc); g.add(knob);
  const sheet = paper(38, 28, '#ffffff', 10); sheet.rotation.x = -Math.PI / 2; sheet.position.set(DESK.x + 22, DESK_H + .8, DESK.y + 15); g.add(sheet);
  const stacks = TX.map((x, i) => Array.from({ length: 24 }, (_, j) => { const b = cyl(x, 0, R[i], STACK_Z + j * THICK, THICK * .94, COL.hi, 24); b.visible = false; g.add(b); return b; }));
  const pool = Array.from({ length: 12 }, () => { const b = cyl(0, 0, 5, 0, THICK, COL.accent, 24); b.visible = false; g.add(b); return b; });
  const heap = Array.from({ length: 7 }, (_, j) => { const b = cyl(0, 0, R[(j * 3) % 4], 0, THICK, COL.hi, 24); b.position.set(DESK.x + 23 + [0, 7, -7, 14, -14, 21, -21][j], DESK_H + 1.4, DESK.y + 36); g.add(b); return b; });
  let b = 0, bManual = null;
  function update(time) {
    const cycle = (i) => REPORTS[i].end;
    let tt = time, bb = bManual ?? 0;
    if (bManual === null) { let acc = 0; bb = 0; for (let i = 0; i < 48; i++) { const e = cycle(i % 6); if (tt < acc + e) { bb = i % 6; tt -= acc; break; } acc += e; if (i === 47) tt = tt % e; } }
    b = bb; const rep = REPORTS[b], t = tt, have = [0, 0, 0, 0]; let fi = 0;
    pool.forEach((p) => { p.visible = false; });
    for (const q of rep.tokens) {
      if (t >= q.land) { have[q.f]++; continue; } if (t < q.t0) continue;
      const a = t - q.t0, p = pool[fi++]; if (!p) continue; p.visible = true; p.scale.set(R[q.f] / 5, 1, R[q.f] / 5);
      if (a < q.ride) { const x = HOPPER.x + V0 * a + ACC * a * a / 2; p.position.set(x, ZR(x) + .2, 0); } else { const u = a - q.ride; p.position.set(TX[q.f], ZR(TX[q.f]) - GRAV * u * u / 2, 0); }
    }
    const sink = t > rep.sink ? Math.min(1, (t - rep.sink) / SINK) : 0;
    stacks.forEach((list, i) => list.forEach((s, j) => { s.visible = j < have[i]; s.position.y = STACK_Z + j * THICK + THICK / 2 - have[i] * THICK * sink * sink; }));
    counters.forEach((c, i) => c.set(FAMILY[i] + ' ' + String(have[i]).padStart(2, '0')));
    const left = rep.tokens.filter((q) => t < q.t0).length; heap.forEach((h, j) => { h.visible = j < Math.min(7, Math.ceil(left / 4)); });
    sheet.userData.flex(.035, (left === 0 ? .25 : 1) * .9, (left === 0 ? .25 : 1) * .5, b * 1.7, time);
    lamp.material = t >= rep.verify && t < rep.end - TURN ? lampOn : lampOff;
    knob.rotation.z = -(b - 2.5) * 30 * Math.PI / 180;
  }
  update(0);
  return { group: g, update, controls: { label: 'Bâtiment', min: 0, max: 5, step: 1, fmt: (v) => 'bât. ' + BUILDINGS[v][0], get: () => b, set: (v) => { bManual = v; return 0; } } };
}
