// Fig 07 · Chaîne des PP : un cadran solaire des échéances, en 3D (cotes de figures/build-pp.mjs).
// L'ombre du style avance d'un cran par jour ; les plans lus se posent sur le cadran à l'angle de leur échéance ; une seconde ombre court un mois
// devant : chaque feuille qu'elle touche se redresse et envoie sa lettre à la boîte aux lettres.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, display, bench, paper, ease } from './core.js';

export const WIDTH = 300;
const PLATE = { x: -150, y: -78, w: 300, d: 160, r: 8 }, DIAL = { R: 60, plinth: 67, z: 6 }, GNOMON = { h: 46, half: 16, t: 2.6 };
const INBOX = { x: -136, y: 14, w: 32, d: 26 }, INBOX_H = 6, READER = { x: -96, y: 17, w: 24, d: 20 }, READER_H = 14, POSTBOX = { x: 96, y: -8 }, STELE = { x: -26, y: 70, w: 52, d: 10 }, STELE_H = 15, LEAD_ANG = 31.6;
const PER_DAY = 4, MIN_PER_PP = 10, DAYS = 225, YEAR = 228, LEAD = 20, DAY_S = 3, TAU = Math.PI * 2, ANG = TAU / YEAR;
const hash = (i) => { let h = Math.imul(i + 3, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const PP = []; for (let a = 1; a <= DAYS; a++) for (let q = 0; q < PER_DAY; q++) { const j = PP.length; PP.push({ j, a, q, e: a + 30 + Math.floor(hash(j) * 200) }); }
const dateOf = (n) => { const d = new Date(Date.UTC(2023, 0, 2 + (n - 1) + 2 * Math.floor((n - 1) / 5))); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
const wrapA = (e) => ((e * ANG) % TAU + TAU) % TAU;
const pos = (a, r) => [Math.sin(a) * r, -Math.cos(a) * r];

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -140, y: PLATE.y + PLATE.d - 13, w: 140, d: 7 }, label: { x: 74, y: PLATE.y + PLATE.d - 17, w: 46, d: 11 } }));
  g.add(cyl(0, 0, DIAL.plinth, 0, 3, COL.lo, 64), cyl(0, 0, DIAL.R, 3, 3, COL.mid, 64), slab(-GNOMON.t - 5, -GNOMON.half - 5, 2 * GNOMON.t + 10, 2 * GNOMON.half + 10, DIAL.z, 1.6, COL.lo, 2));
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, [x, y] = pos(a, 63.6); g.add(cyl(x, y, i % 3 ? 1.6 : 2.2, 3, i % 3 ? 1.8 : 3.4, COL.mid, 12)); }
  const shape = new THREE.Shape([new THREE.Vector2(-GNOMON.half, 0), new THREE.Vector2(GNOMON.half, 0), new THREE.Vector2(GNOMON.half, GNOMON.h)]);
  const gg = new THREE.ExtrudeGeometry(shape, { depth: GNOMON.t, bevelEnabled: false }); gg.translate(0, 0, -GNOMON.t / 2); gg.rotateY(-Math.PI / 2);
  const gm = new THREE.Mesh(gg, mat(COL.mid)); gm.position.set(0, DIAL.z + 1.6, 0); gm.castShadow = true; g.add(gm);
  const shadows = [1.6, .9].map((w, i) => { const grp = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(w, 56), new THREE.MeshBasicMaterial({ color: 0x1d2230, transparent: true, opacity: i ? .1 : .24 })); m.rotation.x = -Math.PI / 2; m.position.set(0, DIAL.z + .08, -28); grp.add(m); g.add(grp); return grp; });
  const fan = Array.from({ length: 64 }, () => { const grp = new THREE.Group(), p = paper(9, 14, '#ffffff', 5); p.rotation.x = -Math.PI / 2; grp.add(p); grp.visible = false; g.add(grp); return { grp, p }; });
  const flat = (w, l, color = '#ffffff') => { const p = paper(w, l, color, 8); p.rotation.x = -Math.PI / 2; p.visible = false; g.add(p); return p; };
  const inbox = Array.from({ length: PER_DAY }, () => flat(16, 22)), moving = flat(16, 22), letters = Array.from({ length: 3 }, () => flat(9, 14, '#eef2fb'));
  const dark = new THREE.MeshStandardMaterial({ color: '#15171d', roughness: .6 }), SLOT_Z = 5.4, YC = 27;
  // chargeur : bac ouvert à parois, fente de sortie vers le lecteur et étiquette ; lecteur : tunnel fermé, fentes d'entrée et de sortie
  g.add(slab(INBOX.x, INBOX.y, INBOX.w, INBOX.d, 0, 1.6, COL.lo, 1.6), slab(INBOX.x, INBOX.y + INBOX.d - 1.6, INBOX.w, 1.6, 1.6, 8, COL.mid, .4), slab(INBOX.x, INBOX.y, INBOX.w, 1.6, 1.6, 8, COL.mid, .4), slab(INBOX.x, INBOX.y, 1.6, INBOX.d, 1.6, 8, COL.mid, .4));
  g.add(slab(INBOX.x + INBOX.w - 1.6, INBOX.y, 1.6, INBOX.d / 2 - 12, 1.6, 8, COL.mid, .4), slab(INBOX.x + INBOX.w - 1.6, INBOX.y + INBOX.d / 2 + 12, 1.6, INBOX.d / 2 - 12, 1.6, 8, COL.mid, .4));
  g.add(slab(READER.x, READER.y, READER.w, READER.d, 0, READER_H, COL.mid, 1.4), slab(READER.x - .8, READER.y - .8, READER.w + 1.6, READER.d + 1.6, READER_H, 2, COL.lo, 1.4));
  for (const sx of [READER.x - .05, READER.x + READER.w + .05]) g.add(box(sx, YC, SLOT_Z, .3, 23, 2.6, '#15171d', 0));
  g.add(box(READER.x + READER.w / 2, YC, READER_H + 3.4, 14, 10, 2.4, COL.lo, 0.4));
  const dIn = display(24, 5), dRd = display(18, 5); dIn.mesh.position.set(INBOX.x + INBOX.w / 2, 5.5, INBOX.y + INBOX.d + .05); dIn.set('ARRIVÉE'); dRd.mesh.position.set(READER.x + READER.w / 2, 9.5, READER.y + READER.d + .05); dRd.set('LECTEUR'); g.add(dIn.mesh, dRd.mesh);
  void dark;
  const lamp = cyl(READER.x + READER.w / 2, YC, 2.2, READER_H + 5.8, 1.4, COL.mid, 18); g.add(lamp);
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 }), lampOff = lamp.material;
  g.add(slab(STELE.x, STELE.y, STELE.w, STELE.d, 0, STELE_H, COL.mid, 1.4));
  const today = display(20, 6.4), due = display(20, 6.4); today.mesh.position.set(STELE.x + 13, 9, STELE.y + STELE.d + .05); due.mesh.position.set(STELE.x + 39, 9, STELE.y + STELE.d + .05); g.add(today.mesh, due.mesh);
  g.add(slab(POSTBOX.x - 7, POSTBOX.y - 7, 14, 14, 0, 3, COL.lo, 2), slab(POSTBOX.x - 2, POSTBOX.y - 2, 4, 4, 3, 38, COL.mid, .6), slab(POSTBOX.x - 11, POSTBOX.y - 8, 22, 16, 41, 14, COL.mid, 4));
  const flag = box(POSTBOX.x + 10.7, POSTBOX.y, 47, 1.4, 2, 6, COL.mid, 0); g.add(flag);
  let clock = 40 * DAY_S, manual = null;
  function update(time) {
    clock = manual ?? 40 * DAY_S + time % ((DAYS - 40) * DAY_S);
    const day = Math.min(DAYS, Math.floor(clock / DAY_S) + 1), frac = clock / DAY_S - (day - 1), dayf = day - 1 + frac, psi = dayf * ANG, rel = psi + LEAD_ANG * Math.PI / 180;
    shadows[0].rotation.y = -psi; shadows[1].rotation.y = -rel;
    const filed = (p) => p.a < day || (p.a === day && frac >= (p.q + 1) * .15 + .05), active = PP.filter((p) => filed(p) && p.e >= day);
    const sectors = Array.from({ length: 12 }, () => []); for (const p of active) sectors[Math.floor(wrapA(p.e) / TAU * 12) % 12].push(p);
    let n = 0; sectors.forEach((arr) => { arr.sort((x, y) => x.e - y.e); const m = Math.min(5, arr.length); for (let i = 0; i < m; i++) { const p = arr[Math.floor((i + .5) / m * arr.length)], f = fan[n++]; if (!f) return; const a = wrapA(p.e), r = 32 + (p.j % 4) * 7, up = p.e - LEAD <= dayf ? Math.max(0, 1 - Math.abs(dayf - (p.e - LEAD)) / 6) : 0; f.grp.visible = true; f.grp.rotation.y = -a; f.p.position.set(0, DIAL.z + .7 + up * 4, -r); f.p.userData.flex((p.j % 2 ? 1 : -1) * .04 + up * .09, .18 + up * 1.1, .15 + up * .5, p.j * 1.9, time); } });
    for (; n < fan.length; n++) fan[n].grp.visible = false;
    const due0 = PP.filter((p) => p.e - LEAD === day), firing = frac >= .8 && due0.length > 0;
    flag.position.y = firing ? 51 : 44; flag.scale.y = firing ? 2.3 : 1; flag.material = firing ? new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .6 }) : mat(COL.mid);
    const waiting = PER_DAY - Math.min(PER_DAY, Math.floor(Math.max(0, frac - .05) / .15));
    inbox.forEach((p, i) => { p.visible = i < waiting; p.position.set(INBOX.x + 14, 2 + i * 1.1 + .4, YC); p.userData.flex((i % 2 ? 1 : -1) * .05, .3, 0, i * 2, time); });
    const q = Math.floor((frac - .05) / .15), u = (frac - .05) / .15 - q; let shown = '--/--'; moving.visible = false;
    if (frac >= .05 && q < PER_DAY && day <= DAYS) {
      const p = PP[(day - 1) * PER_DAY + q], start = [INBOX.x + 14, 2 + (PER_DAY - q - 1) * 1.1, YC], mid = READER.x + READER.w / 2;
      const slotIn = [INBOX.x + INBOX.w + 8, SLOT_Z, YC], out0 = [READER.x + READER.w + 9, SLOT_Z, YC];
      let c, curl = .03, wave = .2; moving.visible = true;
      if (u < .12) { const v = ease(u / .12); c = start.map((s0, i) => s0 + (slotIn[i] - s0) * v); curl = -.05 * Math.sin(v * Math.PI); wave = .8 * Math.sin(v * Math.PI); }
      else if (u < .3) { const v = ease((u - .12) / .18); c = [slotIn[0] + (mid - slotIn[0]) * v, SLOT_Z, YC]; moving.visible = v < .55; }
      else if (u < .6) { c = [mid, SLOT_Z, YC]; moving.visible = false; shown = dateOf(p.e); }
      else if (u < .68) { const v = ease((u - .6) / .08); c = [mid + (out0[0] - mid) * v, SLOT_Z, YC]; moving.visible = v > .45; shown = dateOf(p.e); }
      else { const v = ease((u - .68) / .32), [tx, tz] = pos(wrapA(p.e), 40); c = [out0[0] + (tx - out0[0]) * v, SLOT_Z + (DIAL.z + 1 - SLOT_Z) * v + 18 * Math.sin(v * Math.PI), YC + (tz - YC) * v]; curl = -.08 * Math.sin(v * Math.PI); wave = 1.4 * Math.sin(v * Math.PI); shown = dateOf(p.e); }
      moving.position.set(c[0], c[1], c[2]); moving.userData.flex(curl, wave, wave * .6, p.j, time);
    }
    letters.forEach((l, i) => {
      if (!firing || i >= due0.length) { l.visible = false; return; }
      const v = ease((frac - .8) / .2), [fx, fz] = pos(wrapA(due0[0].e), 40), tx = POSTBOX.x, ty = 51, tz = POSTBOX.y + 6;
      l.visible = true; l.position.set(fx + (tx - fx) * v + i * 3, DIAL.z + 4 + (ty - DIAL.z - 4) * v + 26 * Math.sin(v * Math.PI) + i * 2, fz + (tz - fz) * v); l.userData.flex(-.07 * Math.sin(v * Math.PI), Math.sin(v * Math.PI), .7, i * 2, time);
    });
    due.set(shown); today.set(dateOf(day));
    lamp.material = shown !== '--/--' && u >= .3 && u < .6 ? lampOn : lampOff;
  }
  update(0);
  return { group: g, update, controls: { label: 'Jour', min: 1, max: DAYS, step: 5, fmt: (v) => 'jour ' + v, get: () => Math.floor(clock / DAY_S) + 1, set: (v) => { manual = (v - 1 + .5) * DAY_S; } } };
}
