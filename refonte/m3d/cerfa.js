// Fig 01 · CERFA v3 : un trieur à billes à trois trappes, en 3D (cotes de figures/build-cerfa.mjs).
// Chaque bille roule sur la rampe sous la lampe de lecture ; la trappe de son verdict s'ouvre, elle tombe dans sa goulotte
// et s'empile dans son bac : conforme, doublon, non-conformité ou, au bout de la rampe, retard.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, ball, prismXZ, display, bench, channel } from './core.js';

export const WIDTH = 168;
const PLATE = { x: -84, y: -40, w: 168, d: 80, r: 8 };
const CAB = { x: -66, y: -12, w: 132, d: 28 }, CAB_H = 26, TRAY_Z = CAB_H, R = 3.6, STEP = 7.2, CAP = 4;
const HX = [-50, -20, 10, 40], XR = 56, SL = .3, ZR = 108, CH = 5.6, Y0 = -5.6, Y1 = 3.2, YB = -1.2, BTOP = ZR + 46, TOP = ZR + 34;
const DIV_X = [-66, -35, -5, 25, 55], GATE = 5.4;
const zs = (x) => ZR - SL * (XR - x), K = Math.sqrt(1 + SL * SL);
const rampPoly = (x0, x1, t = 3) => [[x0, zs(x0)], [x1, zs(x1)], [x1, zs(x1) - t], [x0, zs(x0) - t]];
const SEG = [[-44, HX[1] - GATE - .4], [HX[1] + GATE + .4, HX[2] - GATE - .4], [HX[2] + GATE + .4, HX[3] - GATE - .4], [HX[3] + GATE + .4, XR]];
const READ = { x0: 44, x1: 54 };
const LOT = { min: 50, max: 500 };

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -80, y: PLATE.y + PLATE.d - 15, w: 120, d: 7 }, label: { x: 44, y: PLATE.y + PLATE.d - 19, w: 34, d: 11 } }));
  g.add(slab(CAB.x, CAB.y, CAB.w, CAB.d, 0, CAB_H, COL.mid, 3));
  // bâti : panneau, deux montants, chapeau arrière
  g.add(slab(-64, -10, 128, 4.4, TRAY_Z, BTOP - 6 - TRAY_Z, COL.lo, .8));
  for (const px of [-66.8, 63.2]) g.add(channel(px + 1.8, 1, TRAY_Z, BTOP - 4, 5, 20));
  g.add(slab(-66.8, -10, 133.6, 6.5, BTOP - 4, 3.5, COL.mid, 1.2));
  // bacs : séparateurs, lèvres avant, goulottes et rampe
  DIV_X.forEach((x) => g.add(slab(x - .8, -9.5, 1.6, 24.5, TRAY_Z, 30, COL.mid, .4)));
  for (let k = 0; k < 4; k++) g.add(slab(DIV_X[k] + 1, 13.4, DIV_X[k + 1] - DIV_X[k] - 2, 2.6, TRAY_Z, 7, COL.mid, .6));
  SEG.forEach(([a, b]) => { g.add(prismXZ(rampPoly(a, b), Y0, Y1, COL.mid)); g.add(prismXZ([[a, zs(a)], [b, zs(b)], [b, zs(b) + 2.4], [a, zs(a) + 2.4]], Y1, Y1 + 2.6, COL.mid)); });
  for (const hx of HX) for (const sx of [-CH, CH]) g.add(slab(hx + sx - .6, Y0 - .2, 1.2, Y1 - Y0 + .2, TRAY_Z + 31, zs(hx) - 3 - TRAY_Z - 31, COL.mid, .2));
  // trappes (tiroirs) des trois verdicts
  const gates = [null, 1, 2, 3].map((k) => { if (!k) return null; const m = prismXZ(rampPoly(HX[k] - GATE - .2, HX[k] + GATE + .2, 2), Y0 + .4, Y1 - .4, COL.hi); g.add(m); return m; });
  // chargeur, pont de lecture et lampe
  g.add(slab(XR - 7.2, Y0 - .4, 1.8, Y1 - Y0 + .4, zs(XR - 6) + .5, TOP - zs(XR - 6), COL.mid, .3), slab(XR + 5.4, Y0 - .4, 1.8, Y1 - Y0 + .4, zs(XR) - 2, TOP - zs(XR) + 2, COL.mid, .3));
  const bx = (READ.x0 + READ.x1) / 2, bz = zs(bx);
  g.add(slab(READ.x0 - 1.5, 4.2, 2.2, 2.2, bz, 14, COL.mid, .4), slab(READ.x1 - .7, 4.2, 2.2, 2.2, bz, 14, COL.mid, .4), slab(READ.x0 - 2.5, -7, READ.x1 - READ.x0 + 5, 12, bz + 14, 5, COL.mid, 1.4));
  const lamp = cyl(bx, -1, 2.4, bz + 19, 2, COL.mid, 24); g.add(lamp);
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 }), lampOff = lamp.material;
  // compteurs des bacs, bouton de lot
  const counters = HX.map((cx) => { const d = display(20, 8); d.mesh.position.set(cx, 15, CAB.y + CAB.d + .05); g.add(d.mesh); return d; });
  const lotDisp = display(18, 5); lotDisp.mesh.rotation.y = Math.PI / 2; lotDisp.mesh.position.set(CAB.x + CAB.w + .05, 22, 1); g.add(lotDisp.mesh);
  const knob = new THREE.Group(); knob.position.set(CAB.x + CAB.w, 13, 1); const kc = cyl(0, 0, 5, 0, 6, COL.mid, 28); kc.rotation.z = Math.PI / 2; kc.position.set(3, 0, 0); knob.add(kc); g.add(knob);
  // billes : une colonne dans le chargeur, des piles dans les bacs, des billes en vol
  const mag = Array.from({ length: 8 }, (_, i) => { const b = ball(XR, YB, zs(XR) + R * K + .4 + i * STEP, R); g.add(b); return b; });
  const piles = HX.map((hx) => Array.from({ length: CAP }, (_, q) => { const b = ball(hx, YB, TRAY_Z + R + q * STEP, R); b.visible = false; g.add(b); return b; }));
  const pool = Array.from({ length: 8 }, () => { const b = ball(0, YB, 0, R, COL.accent); b.visible = false; g.add(b); return b; });
  // — animation : mêmes constantes et mêmes équations que figures/build-cerfa.mjs —
  const INTERVAL = .42, V = 150, G_ = 900, WEIGHTS = [.72, .06, .1, .12];
  const kindOf = (i) => { let h = Math.imul(i + 1, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; const u = (h >>> 0) / 4294967296; let c = 0; for (let q = 0; q < 4; q++) { c += WEIGHTS[q]; if (u < c) return [3, 2, 1, 0][q]; } return 3; };
  const kinds = Array.from({ length: 500 }, (_, i) => kindOf(i));
  let lot = 300;
  const tRoll = (kk) => (XR - HX[kk]) / V, landZ = (n) => TRAY_Z + R + Math.min(n, CAP - 1) * STEP;
  const fallTime = (kk, n) => Math.sqrt(2 * Math.max(1, zs(HX[kk]) + R * K - landZ(n)) / G_);
  const cycleOf = () => (lot - 1) * INTERVAL + tRoll(0) + fallTime(0, 0) + 3 + .6;
  function update(time) {
    const t = (time % cycleOf()) - .6;
    const landed = [0, 0, 0, 0], flying = []; let sent = 0;
    for (let i = 0; i < lot; i++) { const age = t - i * INTERVAL; if (age < 0) break; sent++; const kk = kinds[i], n = landed[kk]; if (age >= tRoll(kk) + fallTime(kk, n)) landed[kk]++; else flying.push([i, age, n]); }
    const col = Math.min(8, Math.ceil((lot - sent) / lot * 8)); mag.forEach((b, i) => { b.visible = i < col; });
    piles.forEach((list, k) => { list.forEach((b, q) => { b.visible = q < Math.min(landed[k], CAP); }); counters[k].set(String(landed[k]).padStart(4, '0')); });
    let reading = false;
    pool.forEach((b, q) => {
      const f = flying[q]; if (!f) { b.visible = false; return; }
      const [i, age, n] = f, kk = kinds[i], tr = tRoll(kk);
      let x, z;
      if (age < tr) { x = XR - age * V; z = zs(x) + R * K; if (x < READ.x1 + R && x > READ.x0 - R) reading = true; }
      else { const tau = age - tr, z0 = zs(HX[kk]) + R * K; x = HX[kk]; z = Math.max(landZ(n), z0 - .5 * G_ * tau * tau); }
      b.visible = true; b.position.set(x, z, YB);
    });
    lamp.material = reading ? lampOn : lampOff;
    for (let kk = 1; kk <= 3; kk++) {
      let open = 0;
      flying.forEach(([i, age]) => { if (kinds[i] !== kk) return; const a = age - tRoll(kk); open = Math.max(open, Math.min(1, Math.max(0, (a + .32) / .16)) * (a < .3 ? 1 : Math.max(0, 1 - (a - .3) / .2))); });
      gates[kk].position.z = 10.5 * open;
    }
    knob.rotation.x = (-.75 + 1.5 * (lot - LOT.min) / (LOT.max - LOT.min)) * Math.PI;
    lotDisp.set(String(lot));
  }
  update(0);
  return { group: g, update, controls: { label: 'Taille du lot', min: 50, max: 500, step: 50, fmt: (v) => v + ' fiches', get: () => lot, set: (v) => { lot = v; return 0; } } };
}
