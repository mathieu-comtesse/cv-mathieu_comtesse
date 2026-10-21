// Fig 06 · Point financier : cinq manomètres à contact sur un tableau, en 3D.
// Portage fidèle de figures/build-finance.mjs : mêmes cotes, même année simulée (225 jours, deux jours par seconde), mêmes fonds et
// mêmes courbes de dépenses, index de seuil à 80 %, enveloppes d'alerte (une par matin et par périmètre, une de plus par semaine)
// qui sortent de la fente, tombent dans le bac (qui garde les six dernières par périmètre), enveloppe à bande au-delà de 100 %.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display } from './core.js';

export const WIDTH = 300;
const PLATE = { x: -150, y: -32, w: 300, d: 84, r: 8 };
const PANEL = { x: -138, y: -8, w: 276, d: 8 }, PANEL_Z = [22, 104];
const GAUGES = [{ x: -104, r: 17, n: 'CS' }, { x: -60, r: 17, n: 'Locatif' }, { x: -16, r: 17, n: 'MEC' }, { x: 28, r: 17, n: 'PPTM' }, { x: 84, r: 23, n: 'GLOBAL' }];
const GZ = 72, SLOT_Z = 30, LAMP_Z = 39;
const SWEEP = { from: -.75 * Math.PI, span: 1.5 * Math.PI, max: 1.2 };
const TRAY = { x: -128, y: 6, w: 256, d: 24 }, TRAY_H = 7, KNOB = { x: 124, z: 42, r: 6 };
const angleOf = (r) => SWEEP.from + Math.min(r, SWEEP.max) / SWEEP.max * SWEEP.span;
const DAYS = 225, FUNDS = [420, 260, 180, 140], FINAL = [.93, .72, 1.12, .86];
const curve = (u) => u - Math.sin(2 * Math.PI * u * 9) / (2 * Math.PI * 9) * .6;
function ratios(day) { const u = Math.max(0, Math.min(1, day / DAYS)), spent = FUNDS.map((f, i) => f * FINAL[i] * curve(u)); return [...spent.map((s, i) => s / FUNDS[i]), spent.reduce((a, b) => a + b, 0) / FUNDS.reduce((a, b) => a + b, 0)]; }
const WEEK = 5, SHOWN = 6, HOLD = 4;
let THRESHOLD = .8;

export function build() {
  THRESHOLD = .8;
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -120, y: PLATE.y + PLATE.d - 11, w: 120, d: 7 }, label: { x: 40, y: PLATE.y + PLATE.d - 13, w: 46, d: 10 } }));
  for (const x of [-120, 112]) g.add(slab(x - 6, PANEL.y - 8, 20, PANEL.d + 16, 0, 3, COL.lo, 2), slab(x, PANEL.y, 8, PANEL.d, 3, PANEL_Z[0] - 3 + 1, COL.mid, 1));
  g.add(slab(PANEL.x, PANEL.y, PANEL.w, PANEL.d, PANEL_Z[0], PANEL_Z[1] - PANEL_Z[0], COL.mid, 1.6));
  g.add(slab(PANEL.x - 2, PANEL.y - 1, PANEL.w + 4, PANEL.d + 4, PANEL_Z[1], 3, COL.mid, 1.4));
  // bac : un compartiment par périmètre
  const wall = 1.4;
  g.add(slab(TRAY.x, TRAY.y, TRAY.w, TRAY.d, 0, 1.4, COL.lo, .3), slab(TRAY.x, TRAY.y, TRAY.w, wall, 1.4, TRAY_H - 1.4, COL.mid, .5), slab(TRAY.x, TRAY.y, wall, TRAY.d, 1.4, TRAY_H - 1.4, COL.mid, .5), slab(TRAY.x + TRAY.w - wall, TRAY.y, wall, TRAY.d, 1.4, TRAY_H - 1.4, COL.mid, .5), slab(TRAY.x, TRAY.y + TRAY.d - wall, TRAY.w, wall, 1.4, TRAY_H - 1.4, COL.mid, .5));
  for (const gg of GAUGES.slice(0, 4)) g.add(slab(gg.x + 21, TRAY.y + wall, 1.2, TRAY.d - wall * 2, 1.4, TRAY_H - 2.6, COL.mid, .3));
  const FACE = PANEL.y + PANEL.d;
  const needles = [], idx = [], lamps = [];
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .9 }), lampOff = mat(COL.lo);
  GAUGES.forEach((gg) => {
    const dial = cyl(0, 0, gg.r, 0, 1.4, COL.hi, 48); dial.rotation.x = Math.PI / 2; const dg = group(dial); dg.position.set(gg.x, GZ, FACE + .7); g.add(dg);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(gg.r + .6, .8, 8, 48), mat(COL.lo)); ring.position.set(gg.x, GZ, FACE + 1); g.add(ring);
    for (let t = 0; t <= 12; t++) { const a = angleOf(t / 10), len = t % 5 ? 2.4 : 3.6; const tk = new THREE.Mesh(new THREE.BoxGeometry(.6, len, .3), mat(COL.dark)); tk.rotation.z = -a; tk.position.set(gg.x + Math.sin(a) * (gg.r - 2.4), GZ + Math.cos(a) * (gg.r - 2.4), FACE + 1.5); g.add(tk); }
    const piv = new THREE.Group(); piv.position.set(gg.x, GZ, FACE + 2); const nd = new THREE.Mesh(new THREE.BoxGeometry(1, gg.r - 3, .5), mat(COL.red)); nd.position.y = (gg.r - 3) / 2; piv.add(nd); const hub = cyl(0, 0, 2, 0, 1, COL.dark, 16); hub.rotation.x = Math.PI / 2; piv.add(hub); g.add(piv); needles.push(piv);
    const im = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5, 3), mat(COL.accent)); g.add(im); idx.push(im);
    g.add(box(gg.x, SLOT_Z, FACE + .05, 18, .6, 2.8, COL.dark, 0));
    const lamp = cyl(0, 0, 2, 0, 1, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(gg.x, LAMP_Z, FACE + .5); g.add(lamp); lamps.push(lamp);
    const dsp = display(18, 5.4, { font: 'bold 34px ui-monospace,Menlo,Consolas,monospace' }); dsp.mesh.position.set(gg.x, GZ - gg.r - 6, FACE + .06); dsp.set(gg.n); g.add(dsp.mesh);
  });
  const knob = group(cyl(0, 0, KNOB.r, 0, 3, COL.lo, 32), box(0, -3, 3.2, 1.2, 4, .6, COL.accent, 0)); knob.children[0].rotation.x = Math.PI / 2; knob.children[1].position.set(0, 3, 1.6); knob.position.set(KNOB.x, KNOB.z, FACE + 1.5); g.add(knob);
  // enveloppes : 5 périmètres × 6 dans le bac, plus celles en train de sortir
  const envMat = [mat(COL.hi), new THREE.MeshStandardMaterial({ color: '#f4c7c7', roughness: .8 })];
  const pool = Array.from({ length: GAUGES.length * (SHOWN + 2) }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(16, .9, 10), envMat[0]); m.castShadow = true; m.visible = false; g.add(m); return m; });

  let sent = [], lastCheck = 0, lastCycle = -1;
  const check = (d) => { const r = ratios(d), w = (d - 1) % WEEK; r.forEach((v, i) => { const n = 1 + (w === i % WEEK ? 1 : 0); for (let k = 0; k < n; k++) sent.push({ i, level: v >= 1 ? 1 : 0, day: d + k * .35 }); }); };
  const CYC = DAYS / 2 + HOLD;
  function update(time) {
    const cycle = Math.floor(time / CYC), u = time - cycle * CYC, day = Math.min(DAYS, u * 2);
    if (cycle !== lastCycle) { sent = []; lastCheck = 0; lastCycle = cycle; }
    for (let n = lastCheck + 1; n <= Math.floor(day); n++) check(n); lastCheck = Math.max(lastCheck, Math.floor(day));
    const r = ratios(day);
    GAUGES.forEach((gg, i) => {
      needles[i].rotation.z = -angleOf(r[i]);
      const a = angleOf(THRESHOLD); idx[i].position.set(gg.x + Math.sin(a) * (gg.r - 2.4), GZ + Math.cos(a) * (gg.r - 2.4), FACE + 1.8); idx[i].rotation.z = -a + Math.PI;
      const last = sent.filter((s) => s.i === i && s.day <= day).pop();
      lamps[i].material = r[i] >= THRESHOLD || (last && day - last.day < .6) ? lampOn : lampOff;
    });
    // bac : les six dernières enveloppes de chaque périmètre
    let k = 0;
    GAUGES.forEach((gg, i) => {
      const list = sent.filter((s) => s.i === i && s.day <= day).slice(-SHOWN);
      list.forEach((s, stack) => {
        const age = (day - s.day) / 1.2, restZ = 1.4 + stack * 1.1;
        const y = Math.min(1, age / .5) * (TRAY.y + 12), drop = age < .5 ? 0 : Math.min(1, ((age - .5) / .4) ** 2);
        const z = SLOT_Z - .5 - (SLOT_Z - .5 - restZ) * drop;
        const m = pool[k++]; m.visible = true; m.material = envMat[s.level]; m.position.set(gg.x + s.level * 3, z + .45, y);
      });
    });
    for (; k < pool.length; k++) pool[k].visible = false;
    const a = (THRESHOLD - .5) / .5 * Math.PI * 1.2 - Math.PI * .6; knob.rotation.z = -a;
  }
  update(0);
  return { group: g, update, controls: { label: 'Seuil d\u2019alerte', min: 50, max: 100, step: 5, fmt: (v) => v + ' %', get: () => Math.round(THRESHOLD * 100), set: (v) => { THRESHOLD = v / 100; } } };
}
