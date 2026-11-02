// Fig 08 · Power BI · PP & MOSO : un téléphérique de dossiers, en 3D (cotes de figures/build-powerbi.mjs).
// Au sommet les archives (36 cases), dans la vallée le comptoir et la VM ; deux cabines se croisent sur deux câbles. Le dossier demandé descend
// au comptoir ; le nouveau PP monte, prend la place de l'ancien, qui part à la caisse d'archives.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, display, bench, paper, ease, channel } from './core.js';

export const WIDTH = 312;
const PLATE = { x: -156, y: -62, w: 312, d: 124, r: 8 };
const STEPS = [{ x: -146, y: -48, w: 112, d: 88, z: 0, h: 14 }, { x: -136, y: -40, w: 88, d: 72, z: 14, h: 16 }, { x: -124, y: -32, w: 62, d: 56, z: 30, h: 16 }];
const SUMMIT_Z = 46, LIB = { x: -118, y: -26, w: 50, d: 40 }, LIB_H = 34, CELLS = { cols: 12, rows: 3, w: 2.9, h: 6.4, px: 3.6, py: 8.4 }, ARCH = { x: -146, y: 24, w: 26, d: 24 };
const TOPDOCK = { x: -58, z: 76 }, VALDOCK = { x: 52, z: 58 }, CY = [-8, 8], PYL = [-14, 30];
const cableZ = (x) => TOPDOCK.z + 4 + (VALDOCK.z - TOPDOCK.z) * (x - (TOPDOCK.x + 14)) / (VALDOCK.x - TOPDOCK.x);   // hauteur du brin porteur à l'abscisse x
const SHOP = { x: 72, y: -14, w: 52, d: 36 }, SHOP_H = 22, COUNTER = { x: 74, y: 22, w: 46, d: 16 }, COUNTER_Z = 14, VMK = { x: 108, y: -52, w: 34, d: 26 }, VM_H = 32;
const TIERS = 3, SHELVES = 12, FH = 13, FW = 11, RATE = 104.74, CONSULT_MIN = 10, PER_DAY = 40, START = 480, END = 1020, SPEED = 6, TRIP_T = 6;
const hash = (i) => { let h = Math.imul(i + 9, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const ASKS = Array.from({ length: PER_DAY }, (_, i) => ({ at: START + (i + .5) * (END - START) / PER_DAY + (hash(i) - .5) * 6, tier: Math.floor(hash(i + 50) * TIERS), pocket: Math.floor(hash(i + 90) * SHELVES) }));
const DEPOSITS = [{ at: 600, tier: 2, pocket: 3 }, { at: 870, tier: 1, pocket: 8 }];
const TRIPS = [...ASKS.map((q) => ({ at: q.at + 2 })), ...DEPOSITS.map((d) => ({ at: d.at + 3 }))].sort((a, b) => a.at - b.at);
const lerp = (a, b, u) => a + (b - a) * u;
function cabinS(t) { let c = 0; for (const tr of TRIPS) { if (t < tr.at) break; c += ease((t - tr.at) / TRIP_T); } const p = c % 2; return p <= 1 ? p : 2 - p; }
const cellPos = (tier, pocket) => { const x0 = LIB.x + (LIB.w - (CELLS.cols * CELLS.px - (CELLS.px - CELLS.w))) / 2; return [x0 + pocket * CELLS.px + CELLS.w / 2, SUMMIT_Z + 5 + tier * CELLS.py + CELLS.h / 2, LIB.y + LIB.d]; };

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -148, y: PLATE.y + PLATE.d - 13, w: 150, d: 7 }, label: { x: 70, y: PLATE.y + PLATE.d - 17, w: 46, d: 11 } }));
  STEPS.forEach((t, i) => g.add(slab(t.x, t.y, t.w, t.d, t.z, t.h, i % 2 ? COL.mid : COL.lo, 5 - i)));
  [[-136, 36, 14, 1], [-116, 38, 14, 1.2], [-96, 36, 14, .9], [-76, 38, 14, 1.1], [-56, 36, 14, .9], [-128, 28, 30, .9], [-108, 29, 30, 1], [-84, 28, 30, .8]].forEach(([x, y, z, sc]) => { g.add(cyl(x, y, .9 * sc, z, 3.6 * sc, COL.lo, 10)); const c1 = new THREE.Mesh(new THREE.ConeGeometry(4.4 * sc, 9 * sc, 14), mat(COL.mid)); c1.position.set(x, z + 7.5 * sc, y); c1.castShadow = true; const c2 = new THREE.Mesh(new THREE.ConeGeometry(3.4 * sc, 7 * sc, 14), mat(COL.hi)); c2.position.set(x, z + 12 * sc, y); c2.castShadow = true; g.add(c1, c2); });
  g.add(slab(LIB.x, LIB.y, LIB.w, LIB.d, SUMMIT_Z, LIB_H, COL.mid, 2), slab(LIB.x - 2.4, LIB.y - 2.4, LIB.w + 4.8, LIB.d + 4.8, SUMMIT_Z + LIB_H, 3.6, COL.mid, 3), slab(LIB.x - 4.4, LIB.y - 4.4, LIB.w + 8.8, LIB.d + 8.8, SUMMIT_Z + LIB_H + 3.6, 2, COL.lo, 3.6));
  const cellMat = mat(COL.lo), cellOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .6 });
  const cells = []; for (let r = 0; r < CELLS.rows; r++) for (let c = 0; c < CELLS.cols; c++) { const [x, y, z] = cellPos(r, c); const m = box(x, z + .05, y, CELLS.w, .3, CELLS.h, COL.lo, 0); m.material = cellMat; m.rotation.x = 0; g.add(m); cells.push(m); }
  const askD = display(20, 5.4), vmD = display(14, 5.4); askD.mesh.position.set(LIB.x + 18, SUMMIT_Z + 29.7, LIB.y + LIB.d + .05); vmD.mesh.position.set(LIB.x + 37, SUMMIT_Z + 29.7, LIB.y + LIB.d + .05); g.add(askD.mesh, vmD.mesh);
  g.add(slab(ARCH.x, ARCH.y, ARCH.w, ARCH.d, SUMMIT_Z - 8, 1.6, COL.lo, 2), slab(ARCH.x, ARCH.y, ARCH.w, 1.6, SUMMIT_Z - 6.4, 11, COL.mid, .4), slab(ARCH.x, ARCH.y, 1.6, ARCH.d, SUMMIT_Z - 6.4, 11, COL.mid, .4), slab(ARCH.x, ARCH.y + ARCH.d - 1.6, ARCH.w, 1.6, SUMMIT_Z - 6.4, 11, COL.mid, .4), slab(ARCH.x + ARCH.w - 1.6, ARCH.y, 1.6, ARCH.d, SUMMIT_Z - 6.4, 11, COL.mid, .4));
  const CZ = (x) => cableZ(x), IRON = '#8d929e';
  const lineMat = new THREE.MeshStandardMaterial({ color: IRON, roughness: .4, metalness: .5 });
  const rod = (x, y0, z0, x1, y1, z1, r = .45, m = lineMat) => { const a = new THREE.Vector3(x, z0, y0), b = new THREE.Vector3(x1, z1, y1), len = a.distanceTo(b), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); c.castShadow = true; g.add(c); return c; };
  // pylônes : deux jambes en U de part et d'autre des cabines, traverse en tête qui porte les galets, croisillons
  for (const x of PYL) {
    const zc = CZ(x) + 7;
    for (const y of [-20, 20]) { g.add(channel(x, y, 0, zc, 5, 5)); }
    g.add(slab(x - 3, -23, 6, 46, zc, 3.2, COL.mid, 1));
    for (const [y0, y1] of [[-20, 20]]) { rod(x, y0, 6, x, y1, zc * .55); rod(x, y1, 6, x, y0, zc * .55); }
    for (const y of CY) { const w = cylX(x - 2.4, x + 2.4, y, zc - 2.6, 2.6, COL.lo, 24); g.add(w); g.add(slab(x - 1.2, y - 1.2, 2.4, 2.4, zc - 2.4, 2.4, COL.lo, .3)); }
  }
  // gares : tour en U sur le palier, quai à garde-corps, traverse à poulie de renvoi, contrepoids
  const station = (x, zTop, zBase, platX0, platX1, pulleyX, name) => {
    for (const y of [-14, 14]) g.add(channel(x, y, zBase, zTop + 8, 5, 5));
    g.add(slab(x - 4, -18, 8, 36, zTop + 8, 3.2, COL.mid, 1));
    g.add(slab(platX0, -10, platX1 - platX0, 20, zTop - 14.6, 1.6, COL.lo, .8));
    for (const px of [platX0 + 2, platX1 - 2]) for (const y of [-8.5, 8.5]) g.add(slab(px - 1, y - 1, 2, 2, zBase, zTop - 14.6 - zBase, COL.mid, .3));
    g.add(slab(platX0, -10, platX1 - platX0, 1.2, zTop - 13, 5, COL.mid, .3), slab(platX0, 8.8, platX1 - platX0, 1.2, zTop - 13, 5, COL.mid, .3));
    for (const y of CY) { g.add(cylX(pulleyX - 2.4, pulleyX + 2.4, y, zTop, 4.4, COL.lo, 28)); }
    void name;
  };
  station(TOPDOCK.x + 14, TOPDOCK.z, 30, TOPDOCK.x - 14, TOPDOCK.x + 8, TOPDOCK.x + 14, 'haute');
  station(VALDOCK.x + 14, VALDOCK.z, 0, VALDOCK.x - 8, VALDOCK.x + 8, VALDOCK.x + 14, 'basse');
  // câbles : un brin porteur par cabine, de la poulie haute à la poulie basse, tendus et fixés aux traverses (grippes aux ancrages)
  for (const y of CY) {
    const x0 = TOPDOCK.x + 14, x1 = VALDOCK.x + 14, z0 = CZ(x0) + 4 - (CZ(x0) - TOPDOCK.z), z1 = CZ(x1) + 4 - (CZ(x1) - VALDOCK.z);
    const pts = Array.from({ length: 25 }, (_, i) => { const x = lerp(x0, x1, i / 24); return new THREE.Vector3(x, lerp(TOPDOCK.z + 4, VALDOCK.z + 4, i / 24) - 1.2 * Math.sin(Math.PI * i / 24), y); });
    for (let i = 0; i < 24; i++) { const a = pts[i], b = pts[i + 1], len = a.distanceTo(b), c = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, len, 6), lineMat); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(c); }
    void z0; void z1;
    g.add(box(x0 + 3, y, TOPDOCK.z + 4, 4, 3, 3, COL.mid, 0), box(x1 + 3, y, VALDOCK.z + 4, 4, 3, 3, COL.mid, 0));
  }
  // contrepoids de la gare basse : bloc qui pend de la traverse
  g.add(box(VALDOCK.x + 14, 0, VALDOCK.z - 6, 6, 6, 12, COL.lo, 0.4), box(VALDOCK.x + 14, 0, VALDOCK.z + 4, .8, .8, 14, COL.dark, 0));
  g.add(slab(SHOP.x, SHOP.y, SHOP.w, SHOP.d, 0, SHOP_H, COL.mid, 2), slab(SHOP.x - 3, SHOP.y - 3, SHOP.w + 6, SHOP.d + 8, SHOP_H, 3, COL.mid, 3), slab(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.d, COUNTER_Z - 2.4, 2.4, COL.mid, 1.4), slab(VMK.x, VMK.y, VMK.w, VMK.d, 0, VM_H, COL.mid, 2));
  const vmD2 = display(24, 8); vmD2.mesh.position.set(VMK.x + 17, 20, VMK.y + VMK.d + .05); g.add(vmD2.mesh);
  const cabin = () => {
    const c = new THREE.Group();
    c.add(box(0, 0, 4, 20, 12, 1.6, COL.mid, 0), box(0, 0, 11.6, 21, 13, 1.2, COL.lo, 0.4));
    for (const sx of [-1, 1]) c.add(box(sx * 9.6, 0, 7.8, 1, 12, 6.8, COL.mid, 0));
    for (const sz of [-1, 1]) c.add(box(0, sz * 5.5, 7.8, 20, 1, 6.8, COL.mid, 0));
    for (const sx of [-7, 7]) c.add(box(sx, 0, 16, .9, .9, 8, COL.dark, 0));
    c.add(box(0, 0, 20.4, 6, 3.2, 2.8, COL.lo, 0.3));
    const docs = [0, 1].map((i) => { const d = paper(9, 11, '#ffffff', 5); d.rotation.x = -Math.PI / 2; d.position.set((i - .5) * 5, 5.2 + i * .12, 0); c.add(d); return d; });
    g.add(c); return { c, docs };
  };
  const cabs = [cabin(), cabin()];
  const dossier = () => { const d = paper(FW, FH, '#ffffff', 6); d.rotation.y = Math.PI / 2; d.visible = false; g.add(d); return d; };
  const air = [dossier(), dossier(), dossier()], counterDoc = dossier(), archived = [dossier(), dossier()];
  let m = START, manual = null;
  function update(time) {
    m = manual ?? START + (time * SPEED) % (END + 10 - START);
    const s = cabinS(m), moving = Math.abs(cabinS(m + .05) - cabinS(m - .05)) * 6, active = ASKS.find((q) => m >= q.at && m < q.at + 14), dep = DEPOSITS.find((d) => m >= d.at && m < d.at + 12);
    const place = (cb, ss, y) => { const x = lerp(TOPDOCK.x, VALDOCK.x, ss); cb.c.position.set(x, CZ(x) - 20, y); };
    place(cabs[0], s, CY[0]); place(cabs[1], 1 - s, CY[1]);
    const cabDoc = (idx, atTop) => { const x = atTop ? TOPDOCK.x : VALDOCK.x; return [x, CY[idx], CZ(x) - 20 + 5.8]; };
    const nBefore = (t) => TRIPS.filter((tr) => tr.at < t).length;
    let cargoCab = -1, cargoOn = false;
    cells.forEach((c) => { c.material = cellMat; });
    air.forEach((d) => { d.visible = false; }); counterDoc.visible = false;
    const put = (d, c, curl, wave) => { d.visible = true; d.position.set(c[0], c[2], c[1]); d.userData.flex(curl, wave, wave * .6, 2, time); };
    const fly = (f, t, v, h) => f.map((x, j) => lerp(x, t[j], ease(Math.max(0, Math.min(1, v)))) + (j === 2 ? h * Math.sin(Math.PI * Math.max(0, Math.min(1, v))) : 0));
    if (active) {
      const a = m - active.at, c0 = cellPos(active.tier, active.pocket); cells[active.tier * CELLS.cols + active.pocket].material = cellOn;
      const cell = [c0[0], c0[2] - 1, c0[1]], cab = nBefore(active.at + 2) % 2 === 0 ? 0 : 1;
      cargoCab = cab; cargoOn = a >= 2 && a < 8.6;
      if (a < 2) put(air[0], fly(cell, cabDoc(cab, true), a / 2, 8), -.05, .9);
      else if (a >= 8.6 && a < 12) put(air[0], fly(cabDoc(cab, false), [COUNTER.x + COUNTER.w / 2, COUNTER.y + COUNTER.d / 2, COUNTER_Z + 3.6 + FH / 2 - 3], (a - 8.6) / 3.4, 14), -.06, 1.2);
      if (a >= 12) { counterDoc.visible = true; counterDoc.position.set(COUNTER.x + COUNTER.w / 2, COUNTER_Z + 3.6 + FH / 2 - 3, COUNTER.y + COUNTER.d / 2); counterDoc.userData.flex(.05, .25, .15, 1, time); }
    }
    if (dep) {
      const a = m - dep.at, c0 = cellPos(dep.tier, dep.pocket), cell = [c0[0], c0[2] - 1, c0[1]]; cells[dep.tier * CELLS.cols + dep.pocket].material = cellOn;
      const cab = nBefore(dep.at + 3) % 2 === 0 ? 1 : 0;
      cargoCab = cab; cargoOn = a >= 3 && a < 9.4;
      if (a < 3) put(air[1], fly([VMK.x + VMK.w / 2, VMK.y + VMK.d / 2, VM_H + 8], cabDoc(cab, false), a / 3, 14), -.07, 1.1);
      else if (a >= 9.4 && a < 11.4) put(air[1], fly(cabDoc(cab, true), cell, (a - 9.4) / 2, 6), -.06, 1);
      if (a >= 9.4 && a < 12.4) put(air[2], fly(cell, [ARCH.x + 14, ARCH.y + 12, SUMMIT_Z - 4], (a - 9.4) / 3, 16), -.07, 1.1);
    }
    cabs.forEach((cb, i) => cb.docs.forEach((d, j) => { d.visible = cargoOn && i === cargoCab && j === 0; d.userData.flex((j % 2 ? 1 : -1) * .05, .3 + moving, .3, j * 1.7 + i, time); }));
    const nArch = DEPOSITS.filter((d) => m >= d.at + 9).length; archived.forEach((d, i) => { d.visible = i < nArch; d.position.set(ARCH.x + 6 + i * 6, SUMMIT_Z - 6 + FH / 2, ARCH.y + 12); d.userData.flex(.04, .2, 0, i, time); });
    const vmText = dep ? ((m - dep.at) < 5 ? 'EXTRAIT' : 'RANGÉ') : 'PRÊTE'; vmD.set(vmText); vmD2.set(vmText); askD.set(active ? 'PP ' + (2400 + active.tier * SHELVES + active.pocket) : 'PP ----');
  }
  update(0);
  return { group: g, update, controls: { label: 'Heure', min: START, max: END, step: 30, fmt: (v) => String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(Math.round(v % 60)).padStart(2, '0'), get: (t) => Math.min(END, START + (t * SPEED) % (END + 10 - START)), seek: (v) => (v - START) / SPEED } };
}
