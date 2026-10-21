// Fig 02 · VRE traités par VM : deux pointeuses et une seule clé, en 3D.
// Portage fidèle de figures/build-vm.mjs : mêmes cotes, même journée simulée (08:00 → 17:00, 20 dépôts dont un doublon),
// même planning (relevé toutes les 2 min) et même trajet de carte : elle sort de sa poche, passe au-dessus de la pointeuse, descend
// dans la fente, y est lue, remonte, puis rejoint l'historique ou la corbeille ; à 17 h l'imprimante sort le récapitulatif.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display, ease, hash as _h } from './core.js';

export const WIDTH = 384;
const PLATE = { x: -192, y: -44, w: 384, d: 92, r: 8 };
const CARD = { w: 16, h: 27 }, T = .8;
const RACK_Y = -10, LIP_Y = -1.6, POCKET_Z = 16, LIP_H = 10, RACK_H = 58;
const IN = { x: -184, cols: 4, pitch: 19 }, OUT = { x: 44, cols: 6, pitch: 19 };
const VM = [{ x: -94 }, { x: -26 }].map((v) => ({ ...v, w: 54, cx: v.x + 27 }));
const BODY = { y: -22, d: 34 }, FACE_Y = BODY.y + BODY.d, TOPZ = 92, DIAL = { z: 66, r: 14 };
const BIN = { x: 104, y: 14, w: 32, d: 20 }, BIN_H = 13;
const PRINTER = { x: 144, y: 10, w: 32, d: 26 }, PRINTER_H = 16;
const PER_REPORT = { min: 30, eur: 52.37 }, POLL = 2, WORK = 8, START = 480, END = 1020, RECAP = 1028;
const SPEED = 3.6, HOLD = 4;

const pocketX = (rack, i) => rack.x + 4 + i * rack.pitch + (rack.pitch - CARD.w) / 2;
// journée de 20 dépôts ; le 12e redépose le 5e (doublon écarté par l'historique)
const hash = (i) => { let h = Math.imul(i + 7, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const DAY = Array.from({ length: 20 }, (_, i) => ({ arrive: START + 12 + i * 25 + Math.round((hash(i) - .5) * 16), ot: String(4100000 + Math.floor(hash(i + 40) * 899999)), dup: false }));
DAY[11].ot = DAY[4].ot; DAY[11].dup = true;
function plan() {
  let free = START; const seen = new Set(); let stored = 0;
  return DAY.map((c, i) => {
    const s = Math.ceil(Math.max(c.arrive, free) / POLL) * POLL; free = s + WORK;
    const dup = seen.has(c.ot); seen.add(c.ot);
    return { ...c, i, start: s, end: s + WORK, vm: 0, rejected: dup, slot: dup ? -1 : stored++ };
  });
}
const DAYPLAN = plan();
const lerp = (a, b, u) => a + (b - a) * u;
const inPos = (n) => [pocketX(IN, n % IN.cols), RACK_Y + 2.8, POCKET_Z];
const outPos = (n) => [pocketX(OUT, Math.floor(n / 4) % OUT.cols), RACK_Y + .6 + (n % 4) * 1.6, POCKET_Z + (n % 4) * 1.2];
const binPos = () => [BIN.x + 8, BIN.y + 8, 1.2];
function path(c, a) {
  const v = VM[c.vm], from = inPos(c.i), slot = [v.cx - CARD.w / 2, -5.6, TOPZ + 2], dest = c.rejected ? binPos() : outPos(c.slot), hi = TOPZ + 30;
  if (a < 1) return { p: [from[0], from[1], from[2] + 48 * ease(a)], layer: 'in' };
  if (a < 2.2) { const u = ease((a - 1) / 1.2); return { p: [lerp(from[0], slot[0], u), lerp(from[1], slot[1], u), from[2] + 48 + (hi - from[2] - 48) * Math.sin(u * Math.PI / 2)], layer: 'air' }; }
  if (a < 3) return { p: [slot[0], slot[1], lerp(hi, TOPZ - 22, ease((a - 2.2) / .8))], layer: 'slot' };
  if (a < 5) return { p: [slot[0], slot[1], TOPZ - 22], layer: 'slot' };
  if (a < 5.8) return { p: [slot[0], slot[1], lerp(TOPZ - 22, hi, ease((a - 5) / .8))], layer: 'slot' };
  if (a < 7.2) { const u = ease((a - 5.8) / 1.4); return { p: [lerp(slot[0], dest[0], u), lerp(slot[1], dest[1], u), hi + (c.rejected ? 0 : 6) * Math.sin(u * Math.PI)], layer: 'sky' }; }
  const u = ease((a - 7.2) / .8);
  return { p: [dest[0], dest[1], lerp(hi, dest[2], u)], layer: c.rejected ? 'bin' : 'out' };
}

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 15, w: 180, d: 7 }, label: { x: 36, y: PLATE.y + PLATE.d - 19, w: 46, d: 11 } }));
  // casiers : planche de fond, pieds, porte-étiquettes, lèvres de poche
  const rack = (r) => {
    const w = r.cols * r.pitch + 8;
    g.add(slab(r.x, RACK_Y - 4, w, 4, 0, RACK_H, COL.mid, 1), slab(r.x - 1, RACK_Y - 5, w + 2, 6, RACK_H, 3, COL.mid, 1.2));
    for (const fx of [r.x + 6, r.x + w - 6]) g.add(slab(fx - 5, RACK_Y - 12, 10, 18, 0, 4, COL.lo, 2));
    g.add(slab(r.x + 2, RACK_Y, w - 4, LIP_Y - 2 - RACK_Y, POCKET_Z - 1, 1, COL.lo, .4));
    for (let i = 0; i < r.cols; i++) {
      const hx = r.x + 5 + i * r.pitch, hw = r.pitch - 4;
      g.add(slab(hx, RACK_Y, hw, .8, RACK_H - 16, 7, COL.mid, .3));
      g.add(slab(r.x + 5 + i * r.pitch, LIP_Y, r.pitch - 2, 2, POCKET_Z - 1, LIP_H, COL.mid, .5));
    }
    for (let i = 0; i <= r.cols; i++) g.add(slab(r.x + 3 + i * r.pitch, RACK_Y, 2, LIP_Y - RACK_Y + 2, POCKET_Z - 1, LIP_H + 1, COL.mid, .4));
    g.add(slab(r.x + 2, LIP_Y - .6, w - 4, 2.6, POCKET_Z - 3, 2, COL.mid, .6));
  };
  rack(IN); rack(OUT);

  // pointeuses : corps, capot, fente, cadran à 60 graduations, aiguilles, lecteur d'OT, voyants, serrure, levier de poinçon
  const hands = [], ots = [], lamps = [], r004s = [], punches = [];
  const lampMat = (on) => (on ? new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .9 }) : mat(COL.lo));
  VM.forEach((v, n) => {
    g.add(slab(v.x + 2, BODY.y + 2, v.w - 4, BODY.d - 4, 0, 3, COL.lo, 2), slab(v.x, BODY.y, v.w, BODY.d, 3, TOPZ - 7, COL.mid, 3));
    g.add(slab(v.x - 1.5, BODY.y - 1.5, v.w + 3, BODY.d + 3, TOPZ - 4, 4, COL.mid, 3));
    g.add(slab(v.cx - 12, -7.2, 24, 4.4, TOPZ, 1.2, COL.mid, 1.2));
    const face = new THREE.Mesh(new THREE.CircleGeometry(DIAL.r + 2.6, 48), mat('#fbfbf8')); face.position.set(v.cx, DIAL.z, FACE_Y + .05); g.add(face);
    const ring = new THREE.Mesh(new THREE.RingGeometry(DIAL.r + 2.3, DIAL.r + 2.9, 48), mat(COL.dark)); ring.position.set(v.cx, DIAL.z, FACE_Y + .08); g.add(ring);
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? DIAL.r - 1.6 : DIAL.r - 3, rr = (r0 + DIAL.r - .4) / 2; const tk = box(0, 0, 0, i % 5 ? .25 : .5, .1, DIAL.r - .4 - r0, COL.ink, 0); tk.rotation.z = -a; tk.position.set(v.cx + Math.sin(a) * rr, DIAL.z + Math.cos(a) * rr, FACE_Y + .1); tk.geometry.dispose(); tk.geometry = new THREE.BoxGeometry(i % 5 ? .25 : .5, DIAL.r - .4 - r0, .1); g.add(tk); }
    const mk = (len, w, col) => { const p = new THREE.Group(); p.position.set(v.cx, DIAL.z, FACE_Y + .35); const b = new THREE.Mesh(new THREE.BoxGeometry(w, len, .2), mat(col)); b.position.y = len / 2; p.add(b); g.add(p); return p; };
    hands.push({ h: mk(7.5, 1.1, COL.ink), m: mk(11.5, .7, COL.dark) });
    const d = display(42, 9, { font: 'bold 54px ui-monospace,Menlo,Consolas,monospace' }); d.mesh.position.set(v.cx, 33.5, FACE_Y + .08); g.add(d.mesh); ots.push(d);
    const lamp = cyl(0, 0, 1.6, 0, .8, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(v.cx - 17, 44, FACE_Y + .4); g.add(lamp); lamps.push(lamp);
    const r004 = cyl(0, 0, 1.2, 0, .8, COL.lo, 20); r004.rotation.x = Math.PI / 2; r004.position.set(v.cx - 10, 44, FACE_Y + .4); g.add(r004); r004s.push(r004);
    const lock = cyl(0, 0, 3.4, 0, 1.2, COL.mid, 28); lock.rotation.x = Math.PI / 2; lock.position.set(v.cx + 17, 44, FACE_Y + .6); g.add(lock);
    for (let i = 0; i < 6; i++) g.add(box(v.cx - 17 + i * 7, FACE_Y + .05, 14.5, 2, .1, 11, COL.dark, 0));
    const pg = group(cyl(0, 0, 3, 0, 4, COL.mid, 20), box(0, 0, 2, 3, 1.2, 2, COL.mid, 0)); pg.children[1].position.set(0, 3, -3); pg.position.set(v.x + v.w + 3, 66, 4); g.add(pg); punches.push(pg);
  });
  const key = group(cyl(0, 0, .9, 0, 5, COL.accent, 16), cyl(0, 0, 3, 5, 1.4, COL.accent, 24)); key.children.forEach((c) => { c.rotation.x = Math.PI / 2; }); key.children[0].position.set(0, 0, 2.5); key.children[1].position.set(0, 0, 5.7);
  key.position.set(VM[0].cx + 17, 44, FACE_Y + 1.2); g.add(key);
  // corbeille, imprimante, ticket
  g.add(slab(BIN.x, BIN.y, BIN.w, 1.6, 1.2, BIN_H - 1.2, COL.mid, .6), slab(BIN.x, BIN.y, 1.6, BIN.d, 1.2, BIN_H - 1.2, COL.mid, .6), slab(BIN.x + BIN.w - 1.6, BIN.y, 1.6, BIN.d, 1.2, BIN_H - 1.2, COL.mid, .6), slab(BIN.x, BIN.y + BIN.d - 1.6, BIN.w, 1.6, 1.2, BIN_H - 1.2, COL.mid, .6), slab(BIN.x, BIN.y, BIN.w, BIN.d, 0, 1.2, COL.lo, .4));
  g.add(slab(PRINTER.x, PRINTER.y, PRINTER.w, PRINTER.d, 0, PRINTER_H, COL.mid, 2), slab(PRINTER.x + 5, PRINTER.y + 9, 20, 4, PRINTER_H, 1.2, COL.mid, 1));
  const ticket = box(PRINTER.x + 15, PRINTER.y + 11, PRINTER_H + 1.2, 16, .8, 1, COL.hi); g.add(ticket);
  const plamp = cyl(PRINTER.x + 7, PRINTER.y + 19, 1.1, PRINTER_H, .6, COL.lo, 16); g.add(plamp);
  // cartes
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TOPZ + 1.2));
  const plain = mat(COL.hi), lit = new THREE.MeshStandardMaterial({ color: '#ffe3c2', roughness: .8 }), clipped = new THREE.MeshStandardMaterial({ color: '#ffe3c2', roughness: .8, clippingPlanes: [clip] });
  const cards = DAYPLAN.map(() => { const m = box(0, 0, 0, CARD.w, T, CARD.h, COL.hi); m.visible = false; m.geometry.dispose(); m.geometry = new THREE.BoxGeometry(CARD.w, CARD.h, T); g.add(m); return m; });
  const place = (m, p) => m.position.set(p[0] + CARD.w / 2, p[2] + CARD.h / 2, p[1] + T / 2);
  const binCount = () => DAYPLAN.filter((c) => c.rejected).length;

  function update(time) {
    const cycle = (RECAP + 6 - START) / SPEED + HOLD, u = time % cycle, t = Math.min(START + u * SPEED, RECAP + 6);
    // état du jour à l'instant t
    let nb = 0;
    DAYPLAN.forEach((c, i) => {
      const m = cards[i];
      if (t < c.arrive) { m.visible = false; return; }
      if (t < c.start) { m.visible = true; m.material = plain; place(m, inPos(c.i)); return; }
      if (t < c.end) { const q = path(c, t - c.start); m.visible = true; m.material = q.layer === 'slot' ? clipped : lit; place(m, q.p); return; }
      m.visible = true; m.material = plain;
      if (c.rejected) { place(m, binPos()); m.position.y += nb++ * .6; } else place(m, outPos(c.slot));
    });
    // pointeuses : aiguilles, OT, voyants, poinçon
    VM.forEach((v, n) => {
      hands[n].h.rotation.z = -((t / 60 % 12) / 12) * Math.PI * 2; hands[n].m.rotation.z = -((t % 60) / 60) * Math.PI * 2;
      const busy = DAYPLAN.find((c) => t >= c.start && t < c.end), mine = busy && busy.vm === n ? busy : null, a = mine ? t - mine.start : -1;
      const shown = mine && a >= 3 ? (a < 4 ? String(Math.floor(hash(Math.floor(t * 7)) * 9999999)).padStart(7, '0') : mine.ot) : (n === 0 ? '-------' : '       ');
      ots[n].set(shown);
      lamps[n].material = lampMat(n === 0 && ((Math.floor(t) % POLL === 0 && t % 1 < .35) || !!mine));
      r004s[n].material = lampMat(!!mine && a >= 4 && a < 5.8 && !mine.rejected);
      const dz = mine && a >= 4.4 && a < 5.2 ? -14 * Math.sin((a - 4.4) / .8 * Math.PI) * .3 : 0;   // le bouton du poinçon descend
      punches[n].position.set(v.x + v.w + 3, 66 + dz, 4);
    });
    // récapitulatif de 17 h
    const printed = Math.max(0, Math.min(1, (t - END) / (RECAP - END))), h = Math.max(.01, 30 * printed);
    ticket.visible = h > .5; ticket.scale.y = h; ticket.position.y = PRINTER_H + 1.2 + h / 2;
    plamp.material = printed > 0 && printed < 1 ? lampMat(true) : mat(COL.lo);
    key.position.set(VM[0].cx + 17, 44, FACE_Y + 1.2);
  }
  update(0);
  return { group: g, update, controls: { label: 'Heure', min: START, max: END, step: 30, fmt: (v) => String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(Math.round(v % 60)).padStart(2, '0'), get: (t) => Math.min(END, START + (t % ((RECAP + 6 - START) / SPEED + HOLD)) * SPEED), seek: (v) => (v - START) / SPEED } };
}
