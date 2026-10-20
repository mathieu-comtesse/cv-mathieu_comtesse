// Fig 02 · VRE traités par VM : deux pointeuses et une seule clé, en 3D (cotes de figures/build-vm.mjs).
// La pointeuse qui tient la clé relève la plus ancienne demande, lit l'OT, inscrit le lien et range la carte dans l'historique ;
// un doublon part à la corbeille ; l'imprimante sort le récapitulatif.
import * as THREE from 'three';
import { COL, slab, box, cyl, cylY, card, group, bench, display, ease, hash, tube } from './core.js';

export const WIDTH = 384;
const PLATE = { x: -192, y: -44, w: 384, d: 92, r: 8 };
const CARD = { w: 16, h: 27 }, RACK_Y = -10, RACK_H = 58, POCKET_Z = 16;
const IN = { x: -184, cols: 4, pitch: 19 }, OUT = { x: 44, cols: 6, pitch: 19 };
const VMS = [{ x: -94 }, { x: -26 }].map((v) => ({ ...v, w: 54, cx: v.x + 27 }));
const BODY = { y: -22, d: 34 }, FACE_Y = BODY.y + BODY.d, TOPZ = 92;
const PERIOD = 3.2;

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 12, w: 200, d: 7 }, label: { x: 110, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  const rack = (r) => {
    const w = r.cols * r.pitch + 8;
    g.add(slab(r.x, RACK_Y - 4, w, 4, 0, RACK_H, COL.mid, 1), slab(r.x - 1, RACK_Y - 5, w + 2, 6, RACK_H, 3, COL.mid, 1.2));
    for (const fx of [r.x + 6, r.x + w - 6]) g.add(slab(fx - 5, RACK_Y - 12, 10, 18, 0, 4, COL.lo, 2));
    for (let i = 0; i < r.cols; i++) { const hx = r.x + 5 + i * r.pitch; g.add(slab(hx, RACK_Y, r.pitch - 4, .8, RACK_H - 16, 7, COL.mid, .3), slab(hx - 1, RACK_Y, r.pitch - 2, 2, POCKET_Z - 1, 1, COL.lo, .3)); }
  };
  rack(IN); rack(OUT);
  const pocketX = (r, i) => r.x + 4 + i * r.pitch + (r.pitch - CARD.w) / 2 + CARD.w / 2;
  // pointeuses
  const dials = [], lamps = [];
  VMS.forEach((v) => {
    g.add(slab(v.x, BODY.y, v.w, BODY.d, 0, TOPZ, COL.mid, 2));
    g.add(slab(v.x + 4, BODY.y + 6, v.w - 8, BODY.d - 10, TOPZ, 4, COL.lo, 1.5));
    const dial = cyl(0, 0, 14, 0, 1.6, COL.hi, 40); dial.rotation.x = Math.PI / 2; const dg = group(dial); dg.position.set(v.cx, 66, FACE_Y + .8); g.add(dg); dials.push(dg);
    for (let i = 0; i < 10; i++) { const a = i * 36 * Math.PI / 180, h = cyl(Math.cos(a) * 9, Math.sin(a) * 9, 1.6, 0, .4, COL.dark, 14); h.rotation.x = Math.PI / 2; h.position.set(Math.cos(a) * 9, Math.sin(a) * 9, .9); dg.add(h); }
    const d = display(34, 8); d.mesh.position.set(v.cx - 4, 82, FACE_Y + .06); g.add(d.mesh); v.display = d;
    const slot = box(v.cx, 30, FACE_Y + .03, 24, .6, 3, COL.dark, 0); g.add(slot);
    const lamp = cyl(0, 0, 2, 0, 1, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(v.x + 8, 52, FACE_Y + .5); g.add(lamp); lamps.push(lamp);
  });
  const key = group(cyl(0, 0, 2.6, 0, 3, COL.accent, 16), box(0, 0, -5, 1.6, 1.2, 10, COL.accent, 0)); key.children[0].rotation.x = Math.PI / 2; g.add(key);
  // corbeille et imprimante
  g.add(slab(104, 14, 32, 20, 0, 13, COL.mid, 1.4), slab(106, 16, 28, 16, 8, 6, COL.dark, 1));
  g.add(slab(144, 10, 32, 26, 0, 16, COL.mid, 2), slab(148, 14, 24, 10, 16, 2, COL.lo, 1));
  const sheet = card(160, 33, 8, 22, 1.4, 14, COL.hi, 0); sheet.geometry.dispose(); sheet.geometry = new THREE.BoxGeometry(22, .5, 14); g.add(sheet);
  // cartes
  const cardsIn = Array.from({ length: IN.cols }, (_, i) => { const m = card(pocketX(IN, i), RACK_Y + 2, POCKET_Z + CARD.h / 2, CARD.w, CARD.h, 1, COL.hi); g.add(m); return m; });
  const cardsOut = Array.from({ length: OUT.cols }, (_, i) => { const m = card(pocketX(OUT, i), RACK_Y + 2, POCKET_Z + CARD.h / 2, CARD.w, CARD.h, 1, COL.hi); m.visible = false; g.add(m); return m; });
  const fly = card(0, 0, 0, CARD.w, CARD.h, 1, COL.accent); g.add(fly);

  function update(time) {
    const idx = Math.floor(time / PERIOD), t = time - idx * PERIOD, vm = Math.floor(idx / 3) % 2, v = VMS[vm];
    const dup = hash(idx + 13) < .22, slot = idx % OUT.cols;
    // la clé reste dans la pointeuse active
    key.position.set(v.cx + 17, 44, FACE_Y + 3);
    lamps.forEach((l, i) => { l.material = i === vm && t > 1 && t < 2.4 ? new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 }) : new THREE.MeshStandardMaterial({ color: COL.lo }); });
    cardsIn.forEach((m, i) => { m.visible = !(i === 0 && t < 1.2) || false; m.visible = i < IN.cols - (t > 1.2 ? 0 : 0); });
    cardsIn[0].visible = t > 1.4 || t < .02;
    // sortie : le premier arrivé est « relevé », les suivants avancent d'un cran visuellement par roulement
    let pos = 0;
    if (t < 1.4) { fly.visible = false; }
    else {
      fly.visible = true;
      const u = (t - 1.4) / 1.8;
      const sx = pocketX(IN, 0), sz = POCKET_Z + CARD.h / 2;
      if (u < .35) { const p = ease(u / .35); fly.position.set(sx + (v.cx - sx) * p, sz + 28 * p, RACK_Y + 2 + (FACE_Y + 4 - RACK_Y - 2) * p); }
      else if (u < .7) { fly.position.set(v.cx, sz + 28, FACE_Y + 4); }
      else { const p = ease((u - .7) / .3); const ex = dup ? 120 : pocketX(OUT, slot), ez = dup ? 22 : sz, ey = dup ? 24 : RACK_Y + 2; fly.position.set(v.cx + (ex - v.cx) * p, sz + 28 + (ez - sz - 28) * p, FACE_Y + 4 + (ey - FACE_Y - 4) * p); }
      fly.material = dup ? new THREE.MeshStandardMaterial({ color: COL.red }) : new THREE.MeshStandardMaterial({ color: COL.accent });
      if (u >= 1) fly.visible = false;
    }
    cardsOut.forEach((m, i) => { m.visible = i < slot || (i === slot && t > 3.1 && !dup) || idx >= OUT.cols && i >= slot; });
    dials.forEach((d, i) => { d.rotation.z = i === vm && t > .6 && t < 2.2 ? -ease((t - .6) / 1.6) * Math.PI * 1.6 : 0; });
    VMS.forEach((vv, i) => vv.display.set(i === vm && t > 1 ? String(4102000 + idx * 237 % 900000).slice(0, 7) : '·······'));
    sheet.position.z = 33 - (time % 16 > 13 ? Math.min(1, (time % 16 - 13) / 1.2) * 16 : 0);
    sheet.visible = time % 16 > 13;
  }
  update(0);
  return { group: g, update };
}
