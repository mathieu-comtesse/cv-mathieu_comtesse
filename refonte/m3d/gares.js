// Fig 05 · Gares prioritaires : une batterie de colonnes de niveau et un doseur à deux jauges, en 3D.
// Portage de figures/build-gares.mjs : mêmes cotes, mêmes dix gares et mêmes scores ; le bouton répartit un volume entre les jauges
// conformité et maintenance, six colonnes montent au score des six premières gares, la plus haute allume son voyant.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, bench, display } from './core.js';

export const WIDTH = 272;
const PLATE = { x: -136, y: -44, w: 272, d: 108, r: 8 };
const WALL = { x: -10, y: -42, w: 142, d: 10 }, WALL_H = 96, BLOCK = { x: -10, y: -32, w: 142, d: 34 }, BLOCK_H = 22;
const GX = [4, 28, 52, 76, 100, 124].map((x) => x - 2), GAUGE = { w: 16, d: 3.4, y: -20 }, SL = 62, G0 = BLOCK_H + 3;
const DESK = { x: -128, y: -32, w: 108, d: 66 }, DESK_H = 14, JARS = [-110, -86], JAR_Y = -14, JW = 20, KNOB = { x: -98, y: 16, r: 9 };
const STATIONS = [['GARE 01', 82, 41], ['GARE 02', 35, 88], ['GARE 03', 64, 66], ['GARE 04', 91, 22], ['GARE 05', 48, 74], ['GARE 06', 27, 59], ['GARE 07', 73, 80], ['GARE 08', 56, 31], ['GARE 09', 40, 93], ['GARE 10', 69, 52]];

function gauge(g, cx, wid, y, z0) {
  g.add(slab(cx - wid / 2 - 1.5, y - 1.4, wid + 3, GAUGE.d + 2.8, z0 - 3, 3, COL.lo, 1.2), slab(cx - wid / 2, y, wid, GAUGE.d, z0, SL + 4, COL.lo, .8));
  g.add(slab(cx - wid / 2, y - .4, 1.6, GAUGE.d + 1.4, z0, SL + 4, COL.mid, .3), slab(cx + wid / 2 - 1.6, y - .4, 1.6, GAUGE.d + 1.4, z0, SL + 4, COL.mid, .3), slab(cx - wid / 2 - .6, y - .8, wid + 1.2, GAUGE.d + 1.6, z0 + SL + 4, 6, COL.mid, .8));
  const liq = box(cx, y + 1.7, z0 + 1, wid - 4.8, 2.2, 1, COL.green, 0); liq.geometry.translate(0, .5, 0); g.add(liq);
  return liq;
}
export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -128, y: PLATE.y + PLATE.d - 13, w: 120, d: 7 }, label: { x: 40, y: PLATE.y + PLATE.d - 15, w: 46, d: 11 } }));
  g.add(slab(WALL.x, WALL.y, WALL.w, WALL.d, 0, WALL_H, COL.mid, 2), slab(BLOCK.x, BLOCK.y, BLOCK.w, BLOCK.d, 0, BLOCK_H, COL.mid, 3), slab(DESK.x, DESK.y, DESK.w, DESK.d, 0, DESK_H, COL.mid, 3));
  // 19 tiroirs sur le fond, 159 picots sur le dessus
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if (r * 5 + c < 19) g.add(slab(WALL.x + 6 + c * 26 + .6, WALL.y + WALL.d, 25, 0, 56 + r * 9, 0, COL.lo, .5), box(WALL.x + 6 + c * 26 + 13, WALL.y + WALL.d + .1, 60.5 + r * 9, 24, .4, 8, COL.lo, 0));
  const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(.4, .4, .5, 8), mat(COL.dark), 159); const m4 = new THREE.Matrix4(); let n = 0;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 53; i++) { m4.setPosition(WALL.x + 8 + i * (WALL.w - 16) / 52, WALL_H + .3, WALL.y + 3 + j * 2); pins.setMatrixAt(n++, m4); }
  g.add(pins);
  const names = GX.map((cx) => { const d = display(20, 8); d.mesh.position.set(cx, 11, BLOCK.y + BLOCK.d + .05); g.add(d.mesh); return d; });
  const scores = GX.map((cx) => { const d = display(11, 4.4); d.mesh.position.set(cx, G0 + SL + 7.4, GAUGE.y + GAUGE.d + .9); g.add(d.mesh); return d; });
  const cols = GX.map((cx) => gauge(g, cx, GAUGE.w, GAUGE.y, G0));
  const lamp = cyl(GX[0], GAUGE.y + 1.7, 2.2, G0 + SL + 10, 1.8, COL.accent, 18); g.add(lamp);
  const jars = JARS.map((cx) => gauge(g, cx, JW, JAR_Y, DESK_H + 3));
  const knob = new THREE.Group(); knob.position.set(KNOB.x, DESK_H + 1, KNOB.y); knob.add(cyl(0, 0, KNOB.r, 0, 6, COL.mid, 40)); const ptr = box(0, -4, 6.4, .8, 6, .4, COL.ink, 0); knob.add(ptr); g.add(knob);
  const labs = [['CONFORM.', 0], ['MAINT.', 1]].map(([t, i]) => { const d = display(22, 7); d.mesh.position.set(JARS[i], 7, DESK.y + DESK.d + .05); d.set(t); g.add(d.mesh); return d; });
  void labs;
  let w = .5, shownW = .5, clock = 0, dir = 1, hold = 0, last = null, manualUntil = 0;
  const rank = (wt) => STATIONS.map(([nm, c, m], i) => ({ n: nm, i, s: Math.round(wt * c + (1 - wt) * m) })).sort((a, b) => b.s - a.s || a.i - b.i);
  const level = Array(6).fill(50), jl = [.5, .5];
  function update(time) {
    const dt = last === null ? 0 : Math.min(.05, Math.max(0, time - last)); last = time; clock += dt;
    if (clock >= manualUntil && (hold -= dt) <= 0) { w += dir * dt * .08; if (w > .8 || w < .2) { dir = -dir; w = Math.max(.2, Math.min(.8, w)); hold = 2.5; } }
    shownW += (w - shownW) * Math.min(1, dt * 8);
    const top = rank(shownW), k = dt ? Math.min(1, dt * 7) : 1;
    jl[0] += (shownW - jl[0]) * k; jl[1] += ((1 - shownW) - jl[1]) * k;
    jars.forEach((j, i) => { j.scale.y = Math.max(.01, jl[i] * SL); });
    top.slice(0, 6).forEach((t, r) => { level[r] += (t.s - level[r]) * k; cols[r].scale.y = Math.max(.01, level[r] / 100 * SL); names[r].set(t.n); scores[r].set(String(t.s)); });
    knob.rotation.y = -(-Math.PI * .75 + shownW * Math.PI * 1.5);
  }
  update(0);
  return { group: g, update, controls: { label: 'Pondération conformité', min: 0, max: 100, step: 10, fmt: (v) => v + ' % conformité · ' + (100 - v) + ' % maintenance', get: () => Math.round(w * 100), set: (v) => { w = v / 100; manualUntil = clock + 5; } } };
}
