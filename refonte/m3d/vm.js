// Fig 02 · VRE traités par VM : un pont roulant à deux chariots sur une seule poutre, avec une seule clé, en 3D.
// Portage de figures/build-vm.mjs : mêmes cotes, même journée simulée (08:00 → 17:00, 20 dépôts dont un doublon), même planning
// (relevé toutes les 2 min) et même trajet de carte : le chariot qui tient la clé la saisit dans la file, la porte au pupitre de
// lecture (R004 et OT), puis la pose dans l'historique ; un doublon part aux rebuts.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylY, display, bench, ease, hash as _h } from './core.js';

export const WIDTH = 316;
const PLATE = { x: -158, y: -50, w: 316, d: 100, r: 8 };
const TAB = { x: -142, y: -34, w: 284, d: 56 }, TH = 20, CARD = { w: 13, d: 9 };
const IN = { x: -132, y: -26, cols: 6, rows: 2, px: 11, py: 12 }, OUT = { x: 38, y: -26, cols: 6, rows: 2, px: 11, py: 12 };
const BIN = { x: 18, y: 4, w: 24, d: 16 }, PAD = { x: -8, y: -12, w: 30, d: 20 }, PAD_H = 12;
const BZ = TH + 78, BEAM_Y = -8, BY = BEAM_Y + 4, HOME = [-124, 124];
const PER_REPORT = { min: 30, eur: 52.37 }, POLL = 2, WORK = 8, START = 480, END = 1020, RECAP = 1028, SPEED = 3.6, HOLD = 4;
const slotAt = (tray, n) => [tray.x + 7 + (n % tray.cols) * tray.px, tray.y + 6 + (Math.floor(n / tray.cols) % tray.rows) * tray.py];
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
const inPos = (i) => slotAt(IN, i % 12), outPos = (n) => slotAt(OUT, n), binPos = () => [BIN.x + BIN.w / 2, BIN.y + BIN.d / 2];
const READ = [PAD.x + PAD.w / 2 - 5, PAD.y + PAD.d / 2 - 1], HI = TH + 34, PADZ = TH + PAD_H + .8;
function path(c, a, prevX) {
  const from = inPos(c.i), dest = c.rejected ? binPos() : outPos(c.slot), tableZ = TH + 1.6, destZ = c.rejected ? TH + 2 : TH + 1.6 + Math.floor(c.slot / 12) * 1.2;
  if (a < 1) return { p: [from[0], from[1], tableZ], tx: lerp(prevX, from[0], ease(a)) };
  if (a < 2) { const u = ease(a - 1); return { p: [from[0], lerp(from[1], BY, u), lerp(tableZ, HI, u)], tx: from[0] }; }
  if (a < 3.4) { const u = ease((a - 2) / 1.4); return { p: [lerp(from[0], READ[0], u), BY, HI], tx: lerp(from[0], READ[0], u) }; }
  if (a < 4.2) { const u = ease((a - 3.4) / .8); return { p: [READ[0], lerp(BY, READ[1], u), lerp(HI, PADZ, u)], tx: READ[0] }; }
  if (a < 5.6) return { p: [READ[0], READ[1], PADZ], tx: READ[0], reading: true };
  if (a < 6.2) { const u = ease((a - 5.6) / .6); return { p: [READ[0], lerp(READ[1], BY, u), lerp(PADZ, HI, u)], tx: READ[0] }; }
  if (a < 7.4) { const u = ease((a - 6.2) / 1.2); return { p: [lerp(READ[0], dest[0], u), BY, HI], tx: lerp(READ[0], dest[0], u) }; }
  const u = ease((a - 7.4) / .6);
  return { p: [dest[0], lerp(BY, dest[1], u), lerp(HI, destZ, u)], tx: dest[0] };
}

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 15, w: 200, d: 7 }, label: { x: 76, y: PLATE.y + PLATE.d - 19, w: 46, d: 11 } }));
  g.add(slab(TAB.x, TAB.y, TAB.w, TAB.d, 0, TH, COL.mid, 3));
  for (const tray of [IN, OUT]) {
    const w = tray.cols * tray.px + 6, d = tray.rows * tray.py + 6;
    g.add(slab(tray.x, tray.y, w, d, TH, 1.6, COL.lo, 1), slab(tray.x, tray.y + d - 2, w, 2, TH, 4.4, COL.mid, .5));
    for (let r = 0; r <= tray.cols; r++) g.add(slab(tray.x + 1.6 + r * tray.px, tray.y + .8, 1, d - 1.6, TH + 1.6, 1.4, COL.mid, .2));
  }
  g.add(slab(BIN.x, BIN.y, BIN.w, BIN.d, TH, 1.6, COL.lo, 1.2), slab(BIN.x, BIN.y + BIN.d - 2, BIN.w, 2, TH, 5, COL.mid, .5));
  g.add(slab(PAD.x, PAD.y, PAD.w, PAD.d, TH, PAD_H, COL.mid, 1.4));
  const ot = display(PAD.w - 6, 6); ot.mesh.position.set(PAD.x + PAD.w / 2, TH + 6, PAD.y + PAD.d + .05); g.add(ot.mesh);
  const r004 = cyl(PAD.x + PAD.w - 5, PAD.y + 4, 2.4, TH + PAD_H, 1.6, COL.mid, 20); g.add(r004);
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 }), lampOff = r004.material;
  // portique : quatre montants, deux traverses, poutre et rail
  for (const [x, y] of [[-148, -30], [-148, 16], [148, -30], [148, 16]]) g.add(slab(x - 3, y - 3, 6, 6, 0, BZ - 6, COL.mid, .8));
  for (const x of [-148, 148]) g.add(slab(x - 3, -30, 6, 52, BZ - 6, 6, COL.mid, .8));
  g.add(slab(-148, BEAM_Y, 296, 8, BZ, 7, COL.mid, 1), slab(-146, BY - 1, 292, 2, BZ + 7, 1.2, COL.lo, .3));
  // chariots et clé
  const trolleys = [0, 1].map(() => { const t = new THREE.Group(); t.add(slab(-11, BEAM_Y - 2, 22, 12, BZ + 8.2, 7, COL.mid, 1.2)); const m = cyl(0, BY, 3.6, BZ + 15.2, 6, COL.mid, 20); t.add(m); g.add(t); return t; });
  const key = new THREE.Group(); key.add(cylY(BEAM_Y + 9.4, BEAM_Y + 10.6, 0, BZ + 4.6, 3.2, COL.accent, 24), slab(-.7, BEAM_Y + 10, 1.4, 1.2, BZ - 3, 7.6, COL.accent, .2)); g.add(key);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1, 6), mat(COL.dark)); g.add(rope);
  // cartes : une par dépôt du jour
  const cardMat = mat(COL.hi), lit = new THREE.MeshStandardMaterial({ color: '#ffe3c2', roughness: .8 });
  const cards = DAYPLAN.map(() => { const m = box(0, 0, 0, CARD.w, CARD.d, .8, COL.hi); m.visible = false; g.add(m); return m; });
  const place = (m, p) => m.position.set(p[0], p[2] + .4, p[1]);
  function update(time) {
    const cycle = (RECAP + 6 - START) / SPEED + HOLD, u = time % cycle, t = Math.min(START + u * SPEED, RECAP + 6);
    const xs = [HOME[0], HOME[1]]; let nb = 0, busyQ = null, busy = null;
    DAYPLAN.forEach((c, i) => {
      const m = cards[i];
      if (t < c.arrive) { m.visible = false; return; }
      m.visible = true;
      if (t < c.start) { m.material = cardMat; place(m, [...inPos(c.i), TH + 1.6]); return; }
      if (t < c.end) { const q = path(c, t - c.start, xs[0]); m.material = lit; place(m, q.p); busy = c; busyQ = q; xs[0] = q.tx; return; }
      m.material = cardMat; xs[0] = c.rejected ? binPos()[0] : outPos(c.slot)[0];
      if (c.rejected) { place(m, [...binPos(), TH + 1.6 + nb++ * 1.2]); } else place(m, [...outPos(c.slot), TH + 1.6 + Math.floor(c.slot / 12) * 1.2]);
    });
    trolleys.forEach((tr, n) => { tr.position.x = xs[n]; });
    key.position.x = xs[0];
    if (busyQ) { const [px, py, pz] = busyQ.p, top = BZ + 6, h = top - pz - .4; rope.visible = h > 1 && !busyQ.reading; rope.scale.y = Math.max(1, h); rope.position.set((px + xs[0]) / 2, (top + pz + .4) / 2, (py + BY) / 2); } else rope.visible = false;
    const a = busy ? t - busy.start : -1, reading = !!busy && a >= 4.2 && a < 5.6;
    r004.material = reading && !busy.rejected ? lampOn : lampOff;
    ot.set(busy && a >= 3.4 && a < 7 ? (a < 4.2 ? String(Math.floor(hash(Math.floor(t * 7)) * 9999999)).padStart(7, '0') : busy.ot) : '-------');
  }
  update(0);
  return { group: g, update, controls: { label: 'Heure', min: START, max: END, step: 30, fmt: (v) => String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(Math.round(v % 60)).padStart(2, '0'), get: (t) => Math.min(END, START + (t % ((RECAP + 6 - START) / SPEED + HOLD)) * SPEED), seek: (v) => (v - START) / SPEED } };
}
