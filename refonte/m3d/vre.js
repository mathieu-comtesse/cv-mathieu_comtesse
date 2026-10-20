// Fig 03 · Extracteur VRE : une trieuse de jetons à quatre tubes, en 3D (cotes de figures/build-vre.mjs).
// La trémie lâche les équipements sur la goulotte ; chaque jeton tombe dans le premier trou à sa taille : BT31, BT33, BT21, BT11.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, group, bench, display, ease, hash, finish } from './core.js';

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
  const slopeA = Math.atan2(ZR(CHUTE.x1) - CHUTE.z0, CHUTE.x1 - CHUTE.x0);
  const plate = new THREE.Shape(); plate.moveTo(-len / 2, -CHUTE.half); plate.lineTo(len / 2, -CHUTE.half); plate.lineTo(len / 2, CHUTE.half); plate.lineTo(-len / 2, CHUTE.half); plate.closePath();
  TX.forEach((x, i) => { const hole = new THREE.Path(); hole.absarc((x - (CHUTE.x0 + CHUTE.x1) / 2) / Math.cos(slopeA), 0, R[i] + .5, 0, Math.PI * 2, true); plate.holes.push(hole); });
  const pgeo = new THREE.ExtrudeGeometry(plate, { depth: 2, bevelEnabled: false, curveSegments: 40 }); pgeo.rotateX(-Math.PI / 2); pgeo.translate(0, -1, 0);
  const chute = finish(pgeo, mat(COL.mid)); chute.position.set((CHUTE.x0 + CHUTE.x1) / 2, (CHUTE.z0 + ZR(CHUTE.x1)) / 2 - 1, 0); chute.rotation.z = slopeA; g.add(chute);
  for (const s of [-1, 1]) { const rail = box((CHUTE.x0 + CHUTE.x1) / 2, s * (CHUTE.half + 1), (CHUTE.z0 + ZR(CHUTE.x1)) / 2 + 1, len, 2, 4, COL.lo); rail.rotation.z = chute.rotation.z; g.add(rail); }
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
    const st = cyl(0, 0, R[i], 0, 1, i % 2 ? COL.accent : COL.hi, 32); st.geometry.translate(0, 0, 0); st.position.set(x, CUP_Z + 1.2, 0); g.add(st); stacks.push(st);
    const d = display(26, 8); d.mesh.position.set(x, 9, FACE_Y + .05); g.add(d.mesh); counters.push(d);
  });
  const lamp = cyl(60, FACE_Y, 2, 9.5, 1, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(60, 9.5, FACE_Y + .3); g.add(lamp);
  // jetons : réserves par famille (4 tailles), empilés dans les tubes ou posés sur la goulotte
  const STACK_Z = BASE_H + 3, KNOB = { x: -138, z: 43, r: 5.4 }, HOPPER = { x: -118, z: 99.6 }, HOP_TOP = HOPPER.z + 24;
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -STACK_Z);
  stacks.forEach((st, i) => { st.children.forEach((c) => { c.visible = false; }); st.material = new THREE.MeshStandardMaterial({ color: i % 2 ? COL.accent : COL.hi, roughness: .8, clippingPlanes: [clip] }); });
  const tokMat = TX.map((_, i) => new THREE.MeshStandardMaterial({ color: i % 2 ? COL.accent : COL.hi, roughness: .8 }));
  const POOL = 12;
  const pool = TX.map((_, f) => Array.from({ length: POOL }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(R[f], R[f], THICK, 28), tokMat[f]); m.castShadow = true; m.visible = false; g.add(m); return m; }));
  const heapMesh = Array.from({ length: 9 }, (_, j) => { const f = (j * 3) % 4, m = new THREE.Mesh(new THREE.CylinderGeometry(R[f], R[f], THICK, 28), tokMat[f]); m.castShadow = true; g.add(m); return m; });
  const HEAP = [[0, 0], [8, 4], [-8, 3], [3, -9], [-5, -8], [10, -4], [-10, -3], [4, 10], [-3, 7]];
  // — modèle de figures/build-vre.mjs : six bâtiments, chaque jeton part de la trémie, glisse (accélération), tombe dans son trou —
  const BUILDINGS = [['A', [18, 9, 7, 3]], ['B', [12, 6, 4, 0]], ['C', [24, 11, 8, 5]], ['D', [9, 4, 6, 2]], ['E', [15, 7, 5, 4]], ['F', [21, 8, 9, 1]]];
  const GAP = .3, V0 = 40, ACC = 60, GRAV = 420, VERIFY = 1.2, SINK = .9, TURN = .9;
  const hash2 = (i) => { let h = Math.imul(i + 11, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
  function report(b) {
    const list = []; BUILDINGS[b][1].forEach((n, f) => { for (let j = 0; j < n; j++) list.push(f); });
    list.forEach((_, j) => { const r = Math.floor(hash2(b * 97 + j) * (j + 1)); [list[j], list[r]] = [list[r], list[j]]; });
    const seen = [0, 0, 0, 0];
    const tokens = list.map((f, j) => { const d = TX[f] - HOPPER.x, ride = (-V0 + Math.sqrt(V0 * V0 + 2 * ACC * d)) / ACC, level = seen[f]++; const drop = ZR(TX[f]) - (STACK_Z + level * THICK), fall = Math.sqrt(2 * Math.max(drop, 0) / GRAV); return { f, level, t0: j * GAP, ride, fall, land: j * GAP + ride + fall }; });
    const landed = Math.max(...tokens.map((t) => t.land));
    return { tokens, landed, verify: landed + .3, sink: landed + .3 + VERIFY, end: landed + .3 + VERIFY + SINK + TURN };
  }
  const REPORTS = BUILDINGS.map((_, b) => report(b));
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: .9 }), lampOff = lamp.material;
  const ease2 = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
  const lens = REPORTS.map((r) => r.end), cycleLen = lens.reduce((a, c) => a + c, 0);
  let lastB = -1;
  function update(time) {
    let u = time % cycleLen, b = 0; while (u >= lens[b]) { u -= lens[b]; b++; }
    const t = u, rep = REPORTS[b], tk = rep.tokens, have = [0, 0, 0, 0], used = [0, 0, 0, 0];
    for (const q of tk) {
      if (t >= q.land) { have[q.f]++; continue; }
      if (t < q.t0) continue;
      const a = t - q.t0, m = pool[q.f][used[q.f]++ % POOL]; m.visible = true;
      if (a < q.ride) { const x = HOPPER.x + V0 * a + ACC * a * a / 2; m.position.set(x, ZR(x) + THICK / 2 + 1, 0); m.rotation.set(0, 0, Math.atan(-CHUTE.slope)); }
      else { const uu = a - q.ride, z = ZR(TX[q.f]) - GRAV * uu * uu / 2; m.position.set(TX[q.f], Math.max(z, STACK_Z + q.level * THICK) + THICK / 2, 0); m.rotation.set(0, 0, 0); }
    }
    pool.forEach((row, f) => { for (let k = used[f]; k < POOL; k++) row[k].visible = false; });
    const sink = t > rep.sink ? Math.min(1, (t - rep.sink) / SINK) : 0;
    stacks.forEach((st, i) => { const n = have[i], h = Math.max(.001, n * THICK), bottom = STACK_Z - n * THICK * sink * sink; st.visible = n > 0; st.scale.y = h; st.position.set(TX[i], bottom + h / 2, 0); counters[i].set(NAMES[i] + ' ' + String(n).padStart(2, '0')); });
    const left = tk.filter((q) => t < q.t0).length, nHeap = Math.min(9, Math.ceil(left / 4));
    heapMesh.forEach((m, j) => { m.visible = j < nHeap; m.position.set(HOPPER.x + HEAP[j][0] * .6, HOP_TOP - 14 + 1.2 + THICK / 2, HEAP[j][1] * .6); });
    lamp.material = t >= rep.verify && t < rep.end - TURN ? lampOn : lampOff;
    const turn = t > rep.end - TURN ? ease2((t - (rep.end - TURN)) / TURN) : 0, ang = (b + turn - 2.5) * 30 * Math.PI / 180;
    kg.rotation.z = -ang;
  }
  update(0);
  return { group: g, update };
}
