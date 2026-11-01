// Fig 08 · Power BI · PP & MOSO : un paternoster de dossiers, en 3D (cotes de figures/build-powerbi.mjs).
// La chaîne monte à droite et descend à gauche ; la VM dépose le nouveau PP sur l'étagère qui passe devant elle (l'ancien part aux archives),
// et à chaque consultation l'étagère demandée vient au comptoir, dont le dossier glisse dessus.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylY, display, bench, paper, ease } from './core.js';

export const WIDTH = 268;
const PLATE = { x: -134, y: -50, w: 268, d: 112, r: 8 };
const LG = { R: 24, z0: 34, z1: 98 }, H = LG.z1 - LG.z0, LEN = 2 * H + 2 * Math.PI * LG.R, SHELVES = 12, SP = LEN / SHELVES, TIERS = 3;
const FRAME = { x: -40, w: 80, d: 22 }, TOP = LG.z1 + LG.R + 14, BASE = { x: -48, y: -14, w: 96, d: 28 }, BASE_H = 20;
const COUNTER = { x: 54, y: 6, w: 44, d: 28 }, COUNTER_Z = 40, VM = { x: -92, y: -12, w: 30, d: 24 }, VM_H = 70, ARCHIVE = { x: -112, y: 18, w: 34, d: 26 };
const S_COUNTER = H * .35, S_VM = H + Math.PI * LG.R + H * .4, FH = 13, FW = 11;
const RATE = 104.74, CONSULT_MIN = 10, PER_DAY = 40, START = 480, END = 1020, SPEED = 6;
const hash = (i) => { let h = Math.imul(i + 9, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const ASKS = Array.from({ length: PER_DAY }, (_, i) => ({ at: START + (i + .5) * (END - START) / PER_DAY + (hash(i) - .5) * 6, tier: Math.floor(hash(i + 50) * TIERS), pocket: Math.floor(hash(i + 90) * SHELVES) }));
const DEPOSITS = [{ at: 600, tier: 2 }, { at: 870, tier: 1 }];
function pathAt(s) {
  const { R, z0, z1 } = LG; s = ((s % LEN) + LEN) % LEN;
  if (s < H) return [R, z0 + s];
  if (s < H + Math.PI * R) { const a = (s - H) / R; return [R * Math.cos(a), z1 + R * Math.sin(a)]; }
  if (s < 2 * H + Math.PI * R) return [-R, z1 - (s - H - Math.PI * R)];
  const a = (s - 2 * H - Math.PI * R) / R; return [-R * Math.cos(a), z0 - R * Math.sin(a)];
}
function advAt(t) { let a = 0; for (const q of ASKS) { if (t < q.at) break; const want = S_COUNTER - q.pocket * SP, d = ((want - a) % LEN + LEN) % LEN; a += d * ease((t - q.at) / 4); } return a; }

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -126, y: PLATE.y + PLATE.d - 13, w: 140, d: 7 }, label: { x: 66, y: PLATE.y + PLATE.d - 17, w: 46, d: 11 } }));
  g.add(slab(BASE.x, BASE.y, BASE.w, BASE.d, 0, BASE_H, COL.mid, 3));
  for (const x of [FRAME.x - 3, FRAME.x + FRAME.w - 3]) g.add(slab(x, -FRAME.d / 2, 6, FRAME.d, BASE_H, TOP - BASE_H, COL.mid, 1));
  g.add(slab(FRAME.x - 4, -FRAME.d / 2 - 1, FRAME.w + 8, FRAME.d + 2, TOP, 3.6, COL.mid, 1.4));
  // chaîne : une boucle sur chaque flanc, et quatre pignons
  const pts = Array.from({ length: 96 }, (_, i) => { const [x, z] = pathAt(i / 96 * LEN); return new THREE.Vector3(x, z, 0); });
  for (const y of [-FRAME.d / 2 + 3, FRAME.d / 2 - 3]) { const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, y))), new THREE.LineBasicMaterial({ color: 0x555a66 })); g.add(l); for (const z of [LG.z0, LG.z1]) g.add(cylY(y - .8, y + .8, 0, z, 9, COL.lo, 28)); }
  g.add(slab(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.d, COUNTER_Z - 2.4, 2.4, COL.mid, 2)); for (const [x, y] of [[COUNTER.x + 3, COUNTER.y + 3], [COUNTER.x + COUNTER.w - 3, COUNTER.y + 3], [COUNTER.x + 3, COUNTER.y + COUNTER.d - 3], [COUNTER.x + COUNTER.w - 3, COUNTER.y + COUNTER.d - 3]]) g.add(cyl(x, y, 1.8, 0, COUNTER_Z - 2.4, COL.lo, 14));
  g.add(slab(VM.x, VM.y, VM.w, VM.d, 0, VM_H - 8, COL.mid, .8), slab(VM.x - 1.4, VM.y - 1.4, VM.w + 2.8, VM.d + 2.8, VM_H - 8, 4, COL.mid, 1.6), slab(VM.x + VM.w, -3, FRAME.x - 3 - VM.x - VM.w + 6, 6, VM_H - 8, 3, COL.mid, .3));
  g.add(slab(ARCHIVE.x, ARCHIVE.y, ARCHIVE.w, ARCHIVE.d, 0, 2, COL.lo, .4), slab(ARCHIVE.x, ARCHIVE.y, ARCHIVE.w, 1.6, 2, 12, COL.mid, .2), slab(ARCHIVE.x, ARCHIVE.y, 1.6, ARCHIVE.d, 2, 12, COL.mid, .2), slab(ARCHIVE.x, ARCHIVE.y + ARCHIVE.d - 1.6, ARCHIVE.w, 1.6, 2, 12, COL.mid, .2), slab(ARCHIVE.x + ARCHIVE.w - 1.6, ARCHIVE.y, 1.6, ARCHIVE.d, 2, 12, COL.mid, .2));
  const vmD = display(32, 8), askD = display(34, 8); vmD.mesh.position.set(-23, 10, BASE.y + BASE.d + .05); askD.mesh.position.set(23, 10, BASE.y + BASE.d + .05); g.add(vmD.mesh, askD.mesh);
  // étagères et dossiers souples
  const shelves = Array.from({ length: SHELVES }, () => { const sg = new THREE.Group(); sg.add(slab(-9, -7, 18, 14, -1.6, 1.6, COL.mid, .8), slab(-9, 5.4, 18, 1.6, 0, 3.4, COL.mid, .3)); const docs = Array.from({ length: TIERS }, (_, i) => { const d = paper(FW, FH, '#ffffff', 6); d.rotation.y = Math.PI / 2; d.position.set((i - 1) * 5.4, .8 + FH / 2, 0); sg.add(d); return d; }); g.add(sg); return { sg, docs }; });
  const flyDoc = () => { const d = paper(FW, FH, '#ffffff', 6); d.rotation.y = Math.PI / 2; d.visible = false; g.add(d); return d; };
  const air = [flyDoc(), flyDoc()], counterDoc = flyDoc(), archived = [flyDoc(), flyDoc()];
  let m = START, manual = null;
  function update(time) {
    m = manual ?? START + (time * SPEED) % (END + 10 - START + 24 * 0);
    const adv = advAt(m), spd = Math.min(1, Math.abs(advAt(m + .05) - advAt(m - .05)) * 1.6), active = ASKS.find((q) => m >= q.at && m < q.at + 14), dep = DEPOSITS.find((d) => m >= d.at && m < d.at + 10);
    const lift = active ? Math.sin(Math.PI * Math.max(0, Math.min(1, (m - active.at - 4) / 9))) : 0;
    shelves.forEach((s, p) => { const [x, z] = pathAt(p * SP + adv); s.sg.position.set(x, z, 0); s.docs.forEach((d, i) => { const mine = active && active.tier === i && active.pocket === p; d.position.y = .8 + FH / 2 + (mine ? lift * 7 : 0); d.userData.flex((i % 2 ? 1 : -1) * .05, .35 + spd * 1.4, .25 + spd * .8, p * 1.3 + i, time); }); });
    air.forEach((d) => { d.visible = false; }); counterDoc.visible = false;
    if (active && lift > .05) { const [sx, sz] = pathAt(active.pocket * SP + adv), v = ease((m - active.at - 9) / 5); if (v > 0) { const d = air[0]; d.visible = true; d.position.set(sx + (COUNTER.x + COUNTER.w / 2 - sx) * v, sz + 8 + (COUNTER_Z + 8 - sz - 8) * v, (COUNTER.y + COUNTER.d / 2) * v); d.userData.flex(-.06 * Math.sin(v * Math.PI), 1.2 * Math.sin(v * Math.PI), .7, 1, time); } }
    if (active && m - active.at > 12) { counterDoc.visible = true; counterDoc.position.set(COUNTER.x + COUNTER.w / 2, COUNTER_Z + 3.8 + FH / 2 - 3, COUNTER.y + COUNTER.d / 2); counterDoc.userData.flex(.05, .25, .15, 2, time); }
    if (dep) { const u = (m - dep.at) / 10, [sx, sz] = pathAt(S_VM), fly = (a, b, v) => a.map((x, j) => x + (b[j] - x) * ease(v)), vm = [VM.x + VM.w / 2, VM_H + 8, VM.y + VM.d / 2], side = [sx, sz + 8, 0], ar = [ARCHIVE.x + 14, 8, ARCHIVE.y + 12];
      const put = (d, c, v) => { d.visible = true; d.position.set(c[0], c[1] + 24 * Math.sin(Math.PI * Math.max(0, Math.min(1, v))), c[2]); d.userData.flex(-.07, 1.1, .7, 3, time); };
      if (u < .6) put(air[0], fly(vm, side, u / .6), u / .6); if (u > .4) put(air[1], fly(side, ar, (u - .4) / .6), (u - .4) / .6); }
    const nArch = DEPOSITS.filter((d) => m >= d.at + 6).length; archived.forEach((d, i) => { d.visible = i < nArch; d.position.set(ARCHIVE.x + 6 + i * 6, 2 + FH / 2, ARCHIVE.y + 12); });
    vmD.set(dep ? ((m - dep.at) < 5 ? 'EXTRAIT' : 'RANGÉ') : 'PRÊTE'); askD.set(active ? 'PP ' + (2400 + active.tier * SHELVES + active.pocket) : 'PP ----');
  }
  update(0);
  return { group: g, update, controls: { label: 'Heure', min: START, max: END, step: 30, fmt: (v) => String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(Math.round(v % 60)).padStart(2, '0'), get: (t) => Math.min(END, START + (t * SPEED) % (END + 10 - START)), seek: (v) => (v - START) / SPEED } };
}
