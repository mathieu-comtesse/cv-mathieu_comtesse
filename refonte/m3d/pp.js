// Fig 07 · Chaîne des PP : une roue des échéances, en 3D (cotes de figures/build-pp.mjs).
// Les plans lus s'insèrent en feuillets souples sur la roue, à l'angle de leur échéance ; le bras de relance, un mois devant aujourd'hui,
// envoie une lettre vers la boîte aux lettres à chaque feuillet qu'il atteint.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylY, display, bench, paper, ease } from './core.js';

export const WIDTH = 264;
const PLATE = { x: -132, y: -46, w: 264, d: 100, r: 8 };
const BASE = { x: -54, y: -20, w: 108, d: 40 }, BASE_H = 20, WHEEL = { z: 78, R: 32, thick: 8 }, ARMS = [-52, 46];
const INBOX = { x: -122, y: 8, w: 34, d: 26 }, INBOX_H = 6, READER = { x: -84, y: 12, w: 26, d: 20 }, READER_H = 24, MAILBOX = { x: 64, y: -10, w: 26, d: 20 }, MAILBOX_H = 34, LEAD_ANG = 31.6;
const PER_DAY = 4, MIN_PER_PP = 10, RATE = 104.74, DAYS = 225, MONTH = 19, LEAD = 20, DAY_S = 3, DEG = Math.PI / 180, ANG = 30 / MONTH;
const hash = (i) => { let h = Math.imul(i + 3, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const PP = []; for (let a = 1; a <= DAYS; a++) for (let q = 0; q < PER_DAY; q++) { const j = PP.length; PP.push({ j, a, q, e: a + 30 + Math.floor(hash(j) * 200) }); }
const dateOf = (n) => { const d = new Date(Date.UTC(2023, 0, 2 + (n - 1) + 2 * Math.floor((n - 1) / 5))); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
const rimPoint = (ang, r) => [Math.sin(ang * DEG) * r, WHEEL.z + Math.cos(ang * DEG) * r];

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -124, y: PLATE.y + PLATE.d - 13, w: 120, d: 7 }, label: { x: 54, y: PLATE.y + PLATE.d - 17, w: 46, d: 11 } }));
  g.add(slab(BASE.x, BASE.y, BASE.w, BASE.d, 0, BASE_H, COL.mid, 3));
  for (const x of ARMS) g.add(slab(x - 3, -9, 6, 18, BASE_H, WHEEL.z + WHEEL.R + 14 - BASE_H, COL.mid, 1), slab(x - 4, -10, 8, 20, WHEEL.z + WHEEL.R + 14, 3, COL.mid, 1));
  const wheel = cylY(-WHEEL.thick / 2, WHEEL.thick / 2, 0, WHEEL.z, WHEEL.R, COL.mid, 56); g.add(wheel, cylY(WHEEL.thick / 2, WHEEL.thick / 2 + 2, 0, WHEEL.z, 10, COL.lo, 32), cylY(WHEEL.thick / 2 + 2, WHEEL.thick / 2 + 3.4, 0, WHEEL.z, 4, COL.hi, 24));
  g.add(slab(-1.4, -3, 2.8, 7, WHEEL.z + WHEEL.R + 3, 8, COL.accent, .4));
  const relay = box(Math.sin(LEAD_ANG * DEG) * (WHEEL.R + 3), 0, WHEEL.z + Math.cos(LEAD_ANG * DEG) * (WHEEL.R + 3), 2.4, 7, 6, COL.mid, 0); g.add(relay);
  const today = display(32, 8), due = display(32, 8); today.mesh.position.set(-24, 10, BASE.y + BASE.d + .05); due.mesh.position.set(24, 10, BASE.y + BASE.d + .05); g.add(today.mesh, due.mesh);
  g.add(slab(MAILBOX.x, MAILBOX.y, MAILBOX.w, MAILBOX.d, 0, MAILBOX_H, COL.mid, 2));
  g.add(slab(INBOX.x, INBOX.y, INBOX.w, INBOX.d, 0, 1.6, COL.lo, 1.6), slab(INBOX.x, INBOX.y + INBOX.d - 1.6, INBOX.w, 1.6, 1.6, INBOX_H - 1.6, COL.mid, .4));
  g.add(slab(READER.x, READER.y, READER.w, READER.d, 0, 6, COL.mid, 1.4), slab(READER.x - 1, READER.y, READER.w + 2, READER.d - 2, READER_H, 5, COL.mid, 1.4), slab(READER.x + 2, READER.y + 2, 3, 3, 6, READER_H - 6, COL.mid, .5), slab(READER.x + READER.w - 5, READER.y + 2, 3, 3, 6, READER_H - 6, COL.mid, .5));
  const lamp = cyl(READER.x + READER.w / 2, READER.y + READER.d / 2 - 1, 2.6, READER_H + 5, 1.4, COL.mid, 18); g.add(lamp);
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 }), lampOff = lamp.material;
  // feuillets de la roue : une soixantaine, plantés radialement
  const fan = Array.from({ length: 64 }, () => { const o = new THREE.Group(), p = paper(8, 12, '#ffffff', 5); p.rotation.y = Math.PI / 2; o.add(p); o.visible = false; g.add(o); return { o, p }; });
  const flat = (w, l, color) => { const p = paper(w, l, color, 8); p.rotation.x = -Math.PI / 2; p.visible = false; g.add(p); return p; };
  const inbox = Array.from({ length: PER_DAY }, () => flat(22, 16)), moving = flat(22, 16), letters = Array.from({ length: 3 }, () => flat(14, 9, '#eef2fb'));
  let clock = 40 * DAY_S, manual = null;
  function update(time) {
    clock = manual ?? 40 * DAY_S + time % ((DAYS - 40) * DAY_S);
    const day = Math.min(DAYS, Math.floor(clock / DAY_S) + 1), frac = clock / DAY_S - (day - 1), dayf = day - 1 + frac, spin = Math.abs(Math.sin(frac * Math.PI)) * .4;
    const filed = (p) => p.a < day || (p.a === day && frac >= (p.q + 1) * .15 + .05);
    const active = PP.filter((p) => filed(p) && p.e >= day);
    const sectors = Array.from({ length: 12 }, () => []); for (const p of active) { const dd = p.e - dayf, s = Math.floor(dd / MONTH); if (s >= 0 && s < 12) sectors[s].push(p); }
    let n = 0; sectors.forEach((arr) => { arr.sort((a, b) => a.e - b.e); const m = Math.min(5, arr.length); for (let i = 0; i < m; i++) { const p = arr[Math.floor((i + .5) / m * arr.length)], f = fan[n++]; if (!f) return; const ang = (p.e - dayf) * ANG, [x, z] = rimPoint(ang, WHEEL.R + 7); f.o.visible = true; f.o.position.set(x, z, 0); f.o.rotation.z = -ang * DEG; f.p.userData.flex((i % 2 ? 1 : -1) * .07 + spin * .12, .5 + spin * 1.2, .3, p.j * 1.9, time); } });
    for (; n < fan.length; n++) fan[n].o.visible = false;
    const due0 = PP.filter((p) => p.e - LEAD === day), firing = frac >= .8 && due0.length > 0;
    relay.material = firing ? new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .6 }) : mat(COL.mid);
    const waiting = PER_DAY - Math.min(PER_DAY, Math.floor(Math.max(0, frac - .05) / .15));
    inbox.forEach((p, i) => { p.visible = i < waiting; p.position.set(INBOX.x + 17, 2 + i * 1.1 + .4, INBOX.y + 12); p.userData.flex((i % 2 ? 1 : -1) * .05, .3, 0, i * 2, time); });
    const q = Math.floor((frac - .05) / .15), u = (frac - .05) / .15 - q; let shown = '--/--'; moving.visible = false;
    if (frac >= .05 && q < PER_DAY && day <= DAYS) {
      const p = PP[(day - 1) * PER_DAY + q], start = [INBOX.x + 17, 2 + (PER_DAY - q - 1) * 1.1, INBOX.y + 12], read = [READER.x + READER.w / 2, READER_H + .8, READER.y + READER.d / 2];
      let c, curl = .03, wave = .2; moving.visible = true;
      if (u < .3) { const v = ease(u / .3); c = start.map((s, i) => s + (read[i] - s) * v); curl = -.06 * Math.sin(v * Math.PI) + .03; wave = 1.1 * Math.sin(v * Math.PI); }
      else if (u < .6) { c = read; shown = dateOf(p.e); }
      else { const v = ease((u - .6) / .4), ang = (p.e - dayf) * ANG, [tx, tz] = rimPoint(ang, WHEEL.R + 8); c = [read[0] + (tx - read[0]) * v, read[1] + (tz - read[1]) * v + 16 * Math.sin(v * Math.PI), read[2] + (0 - read[2]) * v]; curl = -.08 * Math.sin(v * Math.PI); wave = 1.4 * Math.sin(v * Math.PI); shown = dateOf(p.e); }
      moving.position.set(c[0], c[1], c[2]); moving.userData.flex(curl, wave, wave * .6, p.j, time);
    }
    letters.forEach((l, i) => {
      if (!firing || i >= due0.length) { l.visible = false; return; }
      const v = ease((frac - .8) / .2), [fx, fz] = rimPoint(LEAD_ANG, WHEEL.R + 5), tx = MAILBOX.x + MAILBOX.w / 2, ty = MAILBOX_H + 1, tz = MAILBOX.y + MAILBOX.d / 2;
      l.visible = true; l.position.set(fx + (tx - fx) * v + i * 3, fz + (ty - fz) * v + 24 * Math.sin(v * Math.PI) + i * 2, tz * v); l.userData.flex(-.07 * Math.sin(v * Math.PI), Math.sin(v * Math.PI), .7, i * 2, time);
    });
    due.set(shown); today.set(dateOf(day));
    lamp.material = shown !== '--/--' && u >= .3 && u < .6 ? lampOn : lampOff;
    wheel.rotation.y = 0;
  }
  update(0);
  return { group: g, update, controls: { label: 'Jour', min: 1, max: DAYS, step: 5, fmt: (v) => 'jour ' + v, get: () => Math.floor(clock / DAY_S) + 1, set: (v) => { manual = (v - 1 + .5) * DAY_S; } } };
}
