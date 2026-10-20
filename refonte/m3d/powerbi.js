// Fig 08 · Power BI · PP & MOSO : un classeur rotatif vertical, en 3D.
// Portage fidèle de figures/build-powerbi.mjs : mêmes cotes, même journée (08:00 → 17:00, 6 min de modèle par seconde), mêmes
// 40 consultations (chaque demande amène sa case devant le comptoir en 4 min et sort le dossier de 16 unités) et mêmes deux
// dépôts (la VM range le nouveau PP dans la case tournée vers elle, l'ancien part aux archives).
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display, ease } from './core.js';

export const WIDTH = 236;
const PLATE = { x: -118, y: -70, w: 236, d: 150, r: 8 };
const CAR = { r: 36, hub: 6, tiers: [6, 38, 70], shelf: 2.4, pockets: 12, top: 102 };
const BINDER = { r0: 10, r1: 33, t: 3.4, h: 25 };
const VM = { x: -110, y: -16, w: 30, d: 34 }, VM_H = 26;
const ARCHIVE = { x: 64, y: -64, w: 40, d: 30 }, ARCHIVE_H = 18;
const COUNTER = { x: -40, y: 50, w: 80, d: 22 }, COUNTER_H = 18;
const START = 480, END = 1020, SPEED = 6, PER_DAY = 40, HOLD = 4, CONSULT_MIN = 10;
const hash = (i) => { let h = Math.imul(i + 9, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const STEP = 2 * Math.PI / CAR.pockets, FRONT = Math.atan2(COUNTER.y + COUNTER.d / 2, COUNTER.x + COUNTER.w / 2), SIDE = Math.atan2(VM.y + VM.d / 2, VM.x + VM.w / 2);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ASKS = Array.from({ length: PER_DAY }, (_, i) => ({ at: START + (i + .5) * (END - START) / PER_DAY + (hash(i) - .5) * 6, tier: Math.floor(hash(i + 50) * 3), pocket: Math.floor(hash(i + 90) * CAR.pockets) }));
const DEPOSITS = [{ at: 600, tier: 2 }, { at: 870, tier: 1 }];
function rotationAt(t) { let a = 0; for (const q of ASKS) { if (t < q.at) break; const want = FRONT - q.pocket * STEP, d = wrap(want - a); a += d * ease((t - q.at) / 4); } return a; }
let nxt0 = 2400; const START_STOCK = CAR.tiers.map(() => Array.from({ length: CAR.pockets }, () => nxt0++));

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -100, y: PLATE.y + PLATE.d - 11, w: 52, d: 7 }, label: { x: 58, y: PLATE.y + PLATE.d - 14, w: 46, d: 10 } }));
  g.add(cyl(0, 0, CAR.r + 4, 0, 3, COL.lo, 64), cyl(0, 0, 12, 3, 3, COL.mid, 40));
  // carrousel : la colonne et les plateaux ne bougent pas visuellement (ils sont de révolution) ; classeurs et intercalaires tournent
  g.add(cyl(0, 0, CAR.hub, 0, CAR.top, COL.mid, 24), cyl(0, 0, 8, CAR.top, 3, COL.lo, 24));
  CAR.tiers.forEach((z) => g.add(cyl(0, 0, CAR.r, z, CAR.shelf, COL.mid, 72)));
  const rotor = new THREE.Group(); g.add(rotor);
  const plain = mat(COL.hi), lit = new THREE.MeshStandardMaterial({ color: '#ffe3c2', roughness: .8 });
  const binders = [], dividers = [];
  CAR.tiers.forEach((z, ti) => {
    for (let p = 0; p < CAR.pockets; p++) {
      const hold = new THREE.Group(); hold.rotation.y = -(p * STEP);
      const b = new THREE.Mesh(new THREE.BoxGeometry(BINDER.r1 - BINDER.r0, BINDER.h, BINDER.t), plain); b.castShadow = true;
      b.add(new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry, 30), new THREE.LineBasicMaterial({ color: 0x1d2230, transparent: true, opacity: .4 })));
      b.position.set((BINDER.r0 + BINDER.r1) / 2, z + CAR.shelf + BINDER.h / 2, 0); hold.add(b); rotor.add(hold); binders.push({ b, ti, p, base: (BINDER.r0 + BINDER.r1) / 2 });
      const dv = new THREE.Group(); dv.rotation.y = -(p * STEP + STEP / 2);
      const d = new THREE.Mesh(new THREE.BoxGeometry(CAR.r - 1 - CAR.hub, 8, 1), mat(COL.lo)); d.castShadow = true; d.position.set((CAR.hub + CAR.r - 1) / 2, z + CAR.shelf + 4, 0); dv.add(d); rotor.add(dv);
    }
  });
  // VM, archives, comptoir
  g.add(slab(VM.x, VM.y, VM.w, VM.d, 0, VM_H, COL.mid, 2));
  const vmd = display(24, 6); vmd.mesh.position.set(VM.x + VM.w / 2, 18, VM.y + VM.d + .05); g.add(vmd.mesh);
  const vmLamp = cyl(0, 0, 1.4, 0, .8, COL.lo, 18); vmLamp.rotation.x = Math.PI / 2; vmLamp.position.set(VM.x + 5, 23.5, VM.y + VM.d + .3); g.add(vmLamp);
  const aw = 1.6;
  g.add(slab(ARCHIVE.x, ARCHIVE.y, ARCHIVE.w, ARCHIVE.d, 0, 2, COL.lo, .4), slab(ARCHIVE.x, ARCHIVE.y, ARCHIVE.w, aw, 2, ARCHIVE_H - 2, COL.mid, .5), slab(ARCHIVE.x, ARCHIVE.y, aw, ARCHIVE.d, 2, ARCHIVE_H - 2, COL.mid, .5), slab(ARCHIVE.x + ARCHIVE.w - aw, ARCHIVE.y, aw, ARCHIVE.d, 2, ARCHIVE_H - 2, COL.mid, .5), slab(ARCHIVE.x, ARCHIVE.y + ARCHIVE.d - aw, ARCHIVE.w, aw, 2, ARCHIVE_H - 2, COL.mid, .5));
  g.add(slab(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.d, 0, COUNTER_H, COL.mid, 2.4), slab(COUNTER.x - 2, COUNTER.y - 2, COUNTER.w + 4, COUNTER.d + 3, COUNTER_H, 2, COL.mid, 2));
  const ask = display(64, 7); ask.mesh.position.set(COUNTER.x + COUNTER.w / 2, 9.5, COUNTER.y + COUNTER.d + 1.05); g.add(ask.mesh);
  g.add(cyl(COUNTER.x + COUNTER.w - 12, COUNTER.y + COUNTER.d / 2, 3.4, COUNTER_H + 2, 1.6, COL.mid, 24));
  const askLamp = cyl(COUNTER.x + 10, COUNTER.y + COUNTER.d / 2, 1.4, COUNTER_H + 2, .8, COL.lo, 18); g.add(askLamp);
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .9 }), lampOff = mat(COL.lo);
  // dossiers en vol (VM → case → archives) et dossiers archivés
  const flyBox = () => { const m = box(0, 0, 0, 12, 4, 14, COL.hi); m.visible = false; g.add(m); return m; };
  const fly1 = flyBox(), fly2 = flyBox();
  const arch = Array.from({ length: 2 }, () => { const m = box(0, 0, 0, 4, 16, 12, COL.hi); m.visible = false; g.add(m); return m; });
  const setP = (m, p) => m.position.set(p[0], p[2] + 7, p[1]);
  const stock = START_STOCK.map((t) => [...t]);

  function update(time) {
    const cycle = (END + 10 - START) / SPEED + HOLD, u0 = time % cycle, m = Math.min(START + u0 * SPEED, END + 10);
    const a0 = rotationAt(m), active = ASKS.find((q) => m >= q.at && m < q.at + 14), dep = DEPOSITS.find((d) => m >= d.at && m < d.at + 10);
    rotor.rotation.y = -a0;
    // stock et archives
    START_STOCK.forEach((t, i) => t.forEach((v, p) => { stock[i][p] = v; }));
    let nextId = 2400 + CAR.tiers.length * CAR.pockets, archived = 0;
    for (const d of DEPOSITS) { if (m < d.at + 6) break; const p = ((Math.round(wrap(SIDE - rotationAt(d.at)) / STEP) % CAR.pockets) + CAR.pockets) % CAR.pockets; stock[d.tier][p] = nextId++; archived++; }
    arch.forEach((a, i) => { a.visible = i < archived; a.position.set(ARCHIVE.x + 6 + i * 6 + 2, 2 + 6, ARCHIVE.y + 6 + 8); });
    binders.forEach((o) => {
      const mine = active && active.tier === o.ti && active.pocket === o.p;
      const out = mine ? 16 * Math.sin(Math.PI * Math.max(0, Math.min(1, (m - active.at - 4) / 9))) : 0;
      o.b.position.x = o.base + out; o.b.material = mine && out > .5 ? lit : plain;
    });
    fly1.visible = fly2.visible = false;
    if (dep) {
      const u = (m - dep.at) / 10, side = [Math.cos(SIDE) * 30, Math.sin(SIDE) * 30, CAR.tiers[dep.tier] + 8], vm = [VM.x + VM.w / 2, VM.y + VM.d / 2, VM_H + 2], ar = [ARCHIVE.x + 14, ARCHIVE.y + 12, 4];
      const fly = (from, to, v) => from.map((x, j) => x + (to[j] - x) * ease(v)).map((x, j) => j === 2 ? x + 30 * Math.sin(Math.PI * Math.max(0, Math.min(1, v))) : x);
      if (u < .6) { fly1.visible = true; setP(fly1, fly(vm, side, u / .6)); }
      if (u > .4) { fly2.visible = true; setP(fly2, fly(side, ar, (u - .4) / .6)); }
    }
    vmd.set(dep ? ((m - dep.at) < 5 ? 'EXTRAIT' : 'RANGÉ') : 'PRÊTE'); vmLamp.material = dep ? lampOn : lampOff;
    ask.set(active ? 'PP ' + stock[active.tier][active.pocket] : 'PP ----'); askLamp.material = active ? lampOn : lampOff;
  }
  update(0);
  return { group: g, update };
}
