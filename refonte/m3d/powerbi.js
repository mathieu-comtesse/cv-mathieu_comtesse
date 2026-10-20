// Fig 08 · Power BI · PP & MOSO : un classeur rotatif vertical, en 3D (cotes de figures/build-powerbi.mjs).
// Trois étages de douze cases ; à chaque consultation, le carrousel tourne jusqu'au dossier demandé, qui sort devant le comptoir.
// À chaque dépôt, la VM range le nouveau PP et l'ancien part aux archives.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display, ease, hash } from './core.js';

export const WIDTH = 236;
const PLATE = { x: -118, y: -70, w: 236, d: 150, r: 8 };
const CAR = { r: 36, tiers: [6, 38, 70], shelf: 2.4, pockets: 12, top: 102 };
const BINDER = { r0: 10, r1: 33, t: 3.4, h: 25 };
const VM = { x: -110, y: -16, w: 30, d: 34 }, VM_H = 26;
const ARCHIVE = { x: 64, y: -64, w: 40, d: 30 }, ARCHIVE_H = 18;
const COUNTER = { x: -40, y: 50, w: 80, d: 22 }, COUNTER_H = 18;
const PERIOD = 4.6;

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -100, y: PLATE.y + PLATE.d - 12, w: 120, d: 7 }, label: { x: 56, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  g.add(cyl(0, 0, CAR.r + 4, 0, 3, COL.lo, 64), cyl(0, 0, 12, 3, 3, COL.mid, 40));
  // carrousel : colonne, plateaux, dossiers (tournent ensemble)
  const rotor = new THREE.Group(); g.add(rotor);
  rotor.add(cyl(0, 0, 6, 0, CAR.top, COL.mid, 24));
  const binders = [];
  CAR.tiers.forEach((z, ti) => {
    rotor.add(cyl(0, 0, CAR.r, z, CAR.shelf, COL.mid, 72));
    for (let p = 0; p < CAR.pockets; p++) {
      const a = p / CAR.pockets * Math.PI * 2, hold = new THREE.Group(); hold.rotation.y = -a;
      const b = box((BINDER.r0 + BINDER.r1) / 2, 0, z + CAR.shelf + BINDER.h / 2, BINDER.r1 - BINDER.r0, BINDER.t, BINDER.h, p % 3 === 0 ? COL.hi : COL.lo);
      b.position.set((BINDER.r0 + BINDER.r1) / 2, z + CAR.shelf + BINDER.h / 2, 0);
      hold.add(b); rotor.add(hold); binders.push({ hold, b, base: (BINDER.r0 + BINDER.r1) / 2, ti, p });
    }
  });
  rotor.add(cyl(0, 0, 8, CAR.top, 3, COL.lo, 24));
  // VM, archives, comptoir
  g.add(slab(VM.x, VM.y, VM.w, VM.d, 0, VM_H, COL.mid, 2), slab(VM.x + 4, VM.y + VM.d, VM.w - 8, .8, 12, 8, COL.dark, .4));
  const vd = display(20, 6); vd.mesh.position.set(VM.x + VM.w / 2, VM_H - 6, VM.y + VM.d + .1); g.add(vd.mesh);
  g.add(slab(ARCHIVE.x, ARCHIVE.y, ARCHIVE.w, ARCHIVE.d, 0, ARCHIVE_H, COL.mid, 2), slab(ARCHIVE.x + 3, ARCHIVE.y + 3, ARCHIVE.w - 6, ARCHIVE.d - 6, ARCHIVE_H - 1, 1.2, COL.dark, 1));
  g.add(slab(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.d, 0, COUNTER_H, COL.mid, 2.4));
  const cd = display(40, 7); cd.mesh.position.set(COUNTER.x + COUNTER.w / 2, COUNTER_H - 6, COUNTER.y + COUNTER.d + .05); g.add(cd.mesh);
  const lamp = cyl(COUNTER.x + 8, COUNTER.y + COUNTER.d, 2, COUNTER_H - 6, 1, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(COUNTER.x + 8, COUNTER_H - 6, COUNTER.y + COUNTER.d + .4); g.add(lamp);
  const fly = box(0, 0, 0, 22, BINDER.t, BINDER.h, COL.accent); g.add(fly);

  function update(time) {
    const idx = Math.floor(time / PERIOD), t = time - idx * PERIOD;
    const want = Math.floor(hash(idx + 3) * 36), prev = Math.floor(hash(idx + 2) * 36);
    const ang = (n) => (n % CAR.pockets) / CAR.pockets * Math.PI * 2 - Math.PI / 2;
    const a0 = ang(prev), a1 = ang(want); let d = ((a1 - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    rotor.rotation.y = a0 + d * ease(t / 1.8);
    // dossier demandé : il sort devant le comptoir, puis rentre
    const out = ease((t - 1.9) / .6) * (1 - ease((t - 3.4) / .6));
    binders.forEach((o) => { const sel = o.p + o.ti * CAR.pockets === want; o.b.position.x = o.base + (sel ? 16 * out : 0); o.b.position.y = (CAR.tiers[o.ti] + CAR.shelf + BINDER.h / 2) + (sel ? 5 * out : 0); });
    // dépôt : un dossier vole de la VM vers les archives par-dessus le carrousel
    const ph = (t - .2) / 3.6; fly.visible = idx % 2 === 0 && ph > 0 && ph < 1;
    if (fly.visible) { const u = ease(ph); fly.position.set(VM.x + 15 + (ARCHIVE.x + 20 - VM.x - 15) * u, VM_H + 14 + Math.sin(Math.PI * u) * 24, VM.y + 17 + (ARCHIVE.y + 15 - VM.y - 17) * u); fly.rotation.y = u * Math.PI * .5; }
    vd.set(idx % 2 === 0 && t < 3.8 ? 'EXTRACTION' : 'VEILLE'); cd.set('PP ' + String(1 + (idx * 7) % 36).padStart(2, '0'));
    lamp.material = out > .3 ? new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .9 }) : new THREE.MeshStandardMaterial({ color: COL.lo });
  }
  update(0);
  return { group: g, update };
}
