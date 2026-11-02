// Fig 06 · Point financier : cinq cuves jaugées à trop-plein et à flotteur, en 3D (cotes de figures/build-finance.mjs).
// Chaque cuve se remplit avec la consommation d'un périmètre ; au seuil, une enveloppe d'alerte sort du socle vers le bac ;
// au-delà de 100 %, le trop-plein déverse et une seconde enveloppe signale le dépassement.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, bench, display, paper } from './core.js';

export const WIDTH = 308;
const PLATE = { x: -154, y: -44, w: 308, d: 100, r: 8 };
const TANKS = [{ x: -140, w: 40 }, { x: -94, w: 40 }, { x: -48, w: 40 }, { x: -2, w: 40 }, { x: 44, w: 58 }].map((t) => ({ ...t, cx: t.x + t.w / 2 }));
const TY = -28, TD = 26, FY = TY + TD, FLOOR = 7, SCALE = 44, WALL_TOP = FLOOR + SCALE * 1.22, MAXR = 1.2;
const TRAY = { x: -146, y: 6, w: 250, d: 24 }, CONSOLE = { x: 108, y: -26, w: 36, d: 36 }, CON_H = 34;
const DAYS = 225, FUNDS = [420, 260, 180, 140], FINAL = [.93, .72, 1.12, .86], WEEK = 5, SHOWN = 6, SPEED = 2;
const curve = (u) => u - Math.sin(2 * Math.PI * u * 9) / (2 * Math.PI * 9) * .6;
function ratios(day) {
  const u = Math.max(0, Math.min(1, day / DAYS)), spent = FUNDS.map((f, i) => f * FINAL[i] * curve(u));
  return [...spent.map((s, i) => s / FUNDS[i]), spent.reduce((a, b) => a + b, 0) / FUNDS.reduce((a, b) => a + b, 0)];
}
const zOf = (r) => FLOOR + Math.min(r, MAXR) * SCALE;

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -140, y: PLATE.y + PLATE.d - 13, w: 150, d: 7 }, label: { x: 50, y: PLATE.y + PLATE.d - 15, w: 46, d: 11 } }));
  g.add(slab(CONSOLE.x, CONSOLE.y, CONSOLE.w, CONSOLE.d, 0, CON_H, COL.mid, 3));
  const knob = new THREE.Group(); knob.position.set(128, 26, CONSOLE.y + CONSOLE.d); const kc = cyl(0, 0, 7, 0, 6, COL.mid, 32); kc.rotation.x = Math.PI / 2; kc.position.z = 3; knob.add(kc); knob.add(box(0, 6.4, 4.2, .8, .6, 6, COL.ink, 0)); g.add(knob);
  const pcs = [], liqs = [], floats = [], flags = [], drips = [], fx = [];
  TANKS.forEach((t) => {
    g.add(slab(t.x, TY, t.w, TD, 0, FLOOR, COL.mid, 2));
    const h = WALL_TOP - FLOOR - 1;
    g.add(slab(t.x + 1, TY + 1, t.w - 2, 1.6, FLOOR + 1, h, COL.mid, .3), slab(t.x + 1, TY + 1, 1.6, TD - 2, FLOOR + 1, h, COL.mid, .3), slab(t.x + t.w - 2.6, TY + 1, 1.6, TD - 2, FLOOR + 1, h, COL.mid, .3), slab(t.x + 1, FY - 2.4, t.w - 2, 1.6, FLOOR + 1, 3.4, COL.mid, .2));
    g.add(cylX(t.x + t.w - 1, t.x + t.w + 4, TY + TD / 2, zOf(1), 2.2, COL.mid, 16));
    const liq = box(t.cx, TY + TD / 2 + .3, FLOOR + 1, t.w - 5.6, TD - 5.2, 1, COL.accent, 0); liq.geometry.translate(0, .5, 0); g.add(liq); liqs.push(liq);
    const fl = cyl(t.x + 5, TY + 4, 2.6, 0, 1.4, COL.mid, 20); g.add(fl); floats.push(fl);
    const flag = box(t.x + 3.6, FY - 1.1, 0, 3.6, 2.2, 1.6, COL.accent, 0); g.add(flag); flags.push(flag);
    const dr = box(t.x + t.w, TY + TD / 2, 0, 1.6, 2, 1, COL.accent, 0); dr.geometry.translate(0, .5, 0); g.add(dr); drips.push(dr);
    const d = display(16, 4); d.mesh.position.set(t.cx - 3, 3.6, FY + .05); g.add(d.mesh); pcs.push(d);
    // effets d'alerte : balise tournante, onde de choc, nappe de trop-plein et flaque
    const lm = new THREE.MeshStandardMaterial({ color: COL.accent, roughness: .5 }); liq.material = lm;
    const beaconM = new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ffb020', emissiveIntensity: 0, roughness: .3 });
    const beacon = new THREE.Group(); beacon.position.set(t.cx, WALL_TOP + 1, TY + TD / 2);
    const bs = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), beaconM); bs.position.y = 1.4; beacon.add(cyl(0, 0, 4.2, 0, 1.4, COL.lo, 24).translateZ(0), bs); g.add(beacon);
    const ringM = new THREE.MeshBasicMaterial({ color: '#ffb020', transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(t.w / 2 + 2, .7, 8, 48), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(t.cx, WALL_TOP + 2, TY + TD / 2); g.add(ring);
    const sheetM = new THREE.MeshStandardMaterial({ color: COL.red, transparent: true, opacity: .8, roughness: .2, emissive: COL.red, emissiveIntensity: .35 });
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 9), sheetM); sheet.position.set(t.x + t.w + 2.4, zOf(1), TY + TD / 2); sheet.visible = false; g.add(sheet);
    const puddle = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .4, 28), sheetM); puddle.position.set(t.x + t.w + 3, FLOOR + .2, TY + TD / 2); puddle.visible = false; g.add(puddle);
    fx.push({ lm, beaconM, ring, ringM, sheet, puddle, over: false, at: -9 });
  });
  g.add(slab(TRAY.x, TRAY.y, TRAY.w, TRAY.d, 0, 1.4, COL.lo, 2), slab(TRAY.x, TRAY.y + TRAY.d - 1.4, TRAY.w, 1.4, 0, 7, COL.mid, .5));
  const envs = Array.from({ length: 5 * SHOWN }, () => { const o = new THREE.Group(), pp = paper(10, 16, '#f4f7fd', 6); pp.rotation.z = -Math.PI / 2; o.rotation.x = -Math.PI / 2; o.add(pp); o.userData.p = pp; o.visible = false; g.add(o); return o; });
  const overMat = mat(COL.accent);
  let THRESHOLD = .8, shownT = .8, sent = [], last = null, day = 0, lastCheck = 0;
  function check(d) {
    const r = ratios(d), w = (d - 1) % WEEK;
    r.forEach((v, i) => { const n = 1 + (w === i % WEEK ? 1 : 0); for (let q = 0; q < n; q++) sent.push({ i, level: v >= 1 ? 1 : 0, day: d + q * .35 }); });
  }
  function update(time) {
    const now = time * .9;
    const dt = last === null ? 0 : Math.max(0, Math.min(.05, time - last)); last = time;
    const cycle = DAYS / SPEED + 4, u = time % cycle; day = Math.min(DAYS, u * SPEED);
    if (day < lastCheck) { sent = []; lastCheck = 0; }
    for (let n = lastCheck + 1; n <= Math.floor(day); n++) check(n);
    lastCheck = Math.max(lastCheck, Math.floor(day));
    shownT += (THRESHOLD - shownT) * Math.min(1, dt * 8);
    const r = ratios(day);
    TANKS.forEach((t, i) => {
      const z = zOf(r[i]); liqs[i].scale.y = Math.max(.01, z - FLOOR - 1); floats[i].position.set(t.x + 5, z + .7 + 0, TY + 4);
      flags[i].position.y = zOf(shownT) + .4; drips[i].visible = r[i] > 1; drips[i].position.y = 1.4; drips[i].scale.y = zOf(1) - 1.4;
      pcs[i].set(String(Math.round(r[i] * 100)).padStart(3, ' ') + ' %');
      const f = fx[i], hit = r[i] >= shownT, over = r[i] > 1;
      if (hit && !f.over) f.at = time; f.over = hit;
      const pulse = .5 + .5 * Math.sin(time * (over ? 14 : 7) + i), age = time - f.at;
      f.beaconM.emissiveIntensity = hit ? 1.2 + 1.6 * pulse : 0; f.beaconM.color.set(over ? '#ff3b30' : '#ffb020'); f.beaconM.emissive.set(over ? '#ff3b30' : '#ffb020');
      f.lm.color.set(over ? COL.red : hit ? '#f08a24' : COL.accent); f.lm.emissive.set(over ? COL.red : '#f08a24'); f.lm.emissiveIntensity = hit ? .25 + .3 * pulse : 0;
      const k = age < 1.4 ? age / 1.4 : 1; f.ring.visible = age < 1.4; f.ring.scale.setScalar(1 + 1.6 * k); f.ringM.opacity = age < 1.4 ? .85 * (1 - k) : 0;
      f.sheet.visible = over; f.puddle.visible = over; if (over) { f.sheet.scale.y = zOf(1) - FLOOR; f.sheet.position.y = (zOf(1) + FLOOR) / 2; f.sheet.material.opacity = .55 + .3 * pulse; f.puddle.scale.setScalar(4 + 5 * Math.min(1, (r[i] - 1) * 6)); }
    });
    let n = 0;
    TANKS.forEach((t, i) => sent.filter((s) => s.i === i && s.day <= day).slice(-SHOWN).forEach((s, q) => {
      const m = envs[n++]; m.visible = true; m.userData.p.material = s.level ? overMat : mat('#f4f7fd');
      const age = (day - s.day) / 1.2, out = Math.min(1, age / .5), drop = age < .5 ? 0 : Math.min(1, ((age - .5) / .4) ** 2), restZ = 1.4 + q * 1.1;
      m.position.set(t.cx + s.level * 3, 4 - (4 - restZ) * drop + .5, FY - 4 + out * (TRAY.y + 12 - FY + 4)); const mv = age < 1 ? Math.sin(Math.PI * Math.max(0, Math.min(1, age))) : 0; m.userData.p.userData.flex(mv > .02 ? -.05 * mv : (q % 2 ? .03 : -.025), 1.2 * mv, .9 * mv, s.i * 1.3 + q, now);
    }));
    for (; n < envs.length; n++) envs[n].visible = false;
    knob.rotation.z = -((shownT - .5) / .5 * Math.PI * 1.2 - Math.PI * .6);
  }
  update(0);
  return { group: g, update, controls: { label: 'Seuil d’alerte', min: 50, max: 100, step: 5, fmt: (v) => v + ' %', get: () => Math.round(THRESHOLD * 100), set: (v) => { THRESHOLD = v / 100; } } };
}
