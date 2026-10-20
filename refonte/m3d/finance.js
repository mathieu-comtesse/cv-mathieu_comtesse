// Fig 06 · Point financier : cinq manomètres à contact sur un tableau, en 3D (cotes de figures/build-finance.mjs).
// Quand l'aiguille atteint l'index du seuil, le contact se ferme et une enveloppe d'alerte sort de la fente pour tomber dans le bac ;
// au-delà de 100 %, une seconde enveloppe barrée signale le dépassement.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display, ease, hash } from './core.js';

export const WIDTH = 300;
const PLATE = { x: -150, y: -32, w: 300, d: 84, r: 8 };
const PANEL = { x: -138, y: -8, w: 276, d: 8 }, PANEL_Z = [22, 104];
const GAUGES = [{ x: -104, r: 17, n: 'CS' }, { x: -60, r: 17, n: 'Locatif' }, { x: -16, r: 17, n: 'MEC' }, { x: 28, r: 17, n: 'PPTM' }, { x: 84, r: 23, n: 'GLOBAL' }];
const GZ = 72, SLOT_Z = 30, LAMP_Z = 39;
const SWEEP = { from: -.75 * Math.PI, span: 1.5 * Math.PI, max: 1.2 };
const TRAY = { x: -128, y: 6, w: 256, d: 24 }, TRAY_H = 7;
const angleOf = (ratio) => SWEEP.from + (Math.min(ratio, SWEEP.max) / SWEEP.max) * SWEEP.span;
const THRESHOLD = .8;

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -130, y: PLATE.y + PLATE.d - 12, w: 160, d: 7 }, label: { x: 70, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  for (const x of [-120, 112]) g.add(slab(x - 6, -20, 20, 24, 0, 3, COL.lo, 2), slab(x, -14, 8, 6, 3, PANEL_Z[0] - 3, COL.mid, 1));
  g.add(slab(PANEL.x, PANEL.y, PANEL.w, PANEL.d, PANEL_Z[0], PANEL_Z[1] - PANEL_Z[0], COL.mid, 1.6));
  g.add(slab(PANEL.x - 2, PANEL.y - 1, PANEL.w + 4, PANEL.d + 4, PANEL_Z[1], 3, COL.mid, 1.4));
  // bac des enveloppes
  g.add(slab(TRAY.x, TRAY.y, TRAY.w, TRAY.d, 0, TRAY_H, COL.mid, 2), slab(TRAY.x + 3, TRAY.y + 3, TRAY.w - 6, TRAY.d - 6, TRAY_H - 1, 1.2, COL.dark, 1));
  const FACE = PANEL.y + PANEL.d;
  const needles = [], lamps = [], envs = [];
  GAUGES.forEach((gg, i) => {
    const dial = cyl(0, 0, gg.r, 0, 1.4, COL.hi, 48); dial.rotation.x = Math.PI / 2; const dg = group(dial); dg.position.set(gg.x, GZ, FACE + .7); g.add(dg);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(gg.r + .6, .8, 8, 48), mat(COL.lo)); ring.position.set(gg.x, GZ, FACE + 1); g.add(ring);
    for (let t = 0; t <= 12; t++) { const a = angleOf(t / 10); const tk = box(gg.x + Math.sin(a) * (gg.r - 2.2), GZ - Math.cos(a) * (gg.r - 2.2), FACE + 1.5, .6, .6, t % 5 ? 2.4 : 3.6, COL.dark, 0); tk.rotation.z = a; tk.geometry.dispose(); tk.geometry = new THREE.BoxGeometry(.6, t % 5 ? 2.4 : 3.6, .3); tk.position.set(gg.x + Math.sin(a) * (gg.r - 2.4), GZ - Math.cos(a) * (gg.r - 2.4), FACE + 1.5); g.add(tk); }
    const piv = new THREE.Group(); piv.position.set(gg.x, GZ, FACE + 2); const nd = box(0, gg.r / 2 - 1, 0, 1, gg.r - 2, .6, COL.red, 0); nd.position.set(0, (gg.r - 4) / 2, 0); nd.geometry.dispose(); nd.geometry = new THREE.BoxGeometry(1, gg.r - 2, .5); piv.add(nd, cyl(0, 0, 2, 0, 1, COL.dark, 16)); piv.children[1].rotation.x = Math.PI / 2; g.add(piv); needles.push(piv);
    const idx = box(gg.x + Math.sin(angleOf(THRESHOLD)) * (gg.r - .2), GZ - Math.cos(angleOf(THRESHOLD)) * (gg.r - .2), FACE + 1.7, 2, 2, .8, COL.accent, 0); g.add(idx);
    g.add(box(gg.x, SLOT_Z, FACE + .05, 18, .6, 2.8, COL.dark, 0));
    const lamp = cyl(0, 0, 2, 0, 1, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(gg.x, LAMP_Z, FACE + .5); g.add(lamp); lamps.push(lamp);
    const dsp = display(18, 5.4, { font: 'bold 34px ui-monospace,Menlo,Consolas,monospace' }); dsp.mesh.position.set(gg.x, GZ - gg.r - 6, FACE + .06); dsp.set(gg.n); g.add(dsp.mesh);
    const env = group(box(0, 0, 0, 10, .3, 5.6, COL.hi, 30)); env.visible = false; g.add(env); envs.push(env);
  });
  const knob = group(cyl(0, 0, 6, 0, 3, COL.lo, 32), box(0, -3, 3.2, 1.2, 4, .6, COL.accent, 0)); knob.children[0].rotation.x = Math.PI / 2; knob.position.set(124, 42, FACE + 1.5); g.add(knob);
  knob.children[0].rotation.x = Math.PI / 2;

  function update(time) {
    GAUGES.forEach((gg, i) => {
      const per = 9 + i * 1.7, ph = ((time + i * 2.3) % per) / per;
      const ratio = .25 + .98 * ease(Math.min(1, ph * 1.4)) * (ph < .75 ? 1 : 1 - (ph - .75) * 3);
      needles[i].rotation.z = -angleOf(ratio);
      const over = ratio >= THRESHOLD;
      lamps[i].material = over ? new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .9 }) : new THREE.MeshStandardMaterial({ color: COL.lo });
      const crossAt = ((THRESHOLD - .25) / .98), t0 = 0, eph = ph * per;
      const dtEnv = (ph - .55) * per; const e = envs[i];
      e.visible = dtEnv > 0 && dtEnv < 2.2;
      if (e.visible) { const out = Math.min(1, dtEnv / .6), fall = Math.max(0, (dtEnv - .6) / 1.6); e.position.set(gg.x, SLOT_Z - 4 * out - (SLOT_Z - TRAY_H - 4) * fall * fall, FACE + 6 * out + (TRAY.y + 8 - FACE - 6) * fall); e.rotation.x = fall * .4; }
    });
    knob.rotation.z = Math.sin(time * .3) * .8;
  }
  update(0);
  return { group: g, update };
}
