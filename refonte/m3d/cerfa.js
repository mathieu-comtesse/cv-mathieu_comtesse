// Fig 01 · CERFA v3 : une trieuse de fiches, en 3D (cotes de figures/build-cerfa.mjs).
// Le lot part du chargeur, passe sous la tête de lecture, puis le poussoir de sa case la fait tomber : conforme, doublon,
// non-conformité ou retard.
import * as THREE from 'three';
import { COL, slab, box, cyl, cylY, card, group, bench, display, ease, hash } from './core.js';

export const WIDTH = 326;
const PLATE = { x: -164, y: -60, w: 326, d: 120, r: 8 };
const BACK = { x: -140, y: -36, w: 270, d: 27 }, FRONT = { x: -140, y: -9, w: 270, d: 35 };
const BED = 112, DECK = 67, TOP = 160;
const CENTRES = [-140, -94, -48, -2].map((x) => x + 23);
const CARD = { l: 37, w: 17 }, LANE_Y = -21, READ_X = 72, HOPPER_X = 105;
const PERIOD = 1.7, PER_CYCLE = 16;
const KINDS = [COL.hi, COL.hi, COL.accent, COL.red];

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -138, y: PLATE.y + PLATE.d - 16, w: 200, d: 7 }, label: { x: 84, y: PLATE.y + PLATE.d - 20, w: 46, d: 11 } }));
  g.add(slab(BACK.x, BACK.y, BACK.w, BACK.d, 0, BED, COL.mid, 3));
  g.add(slab(FRONT.x, FRONT.y, FRONT.w, FRONT.d, 0, DECK, COL.mid, 3));
  g.add(slab(FRONT.x - 2, FRONT.y, FRONT.w + 4, FRONT.d + 2, DECK - 3, 3, COL.mid, 3));
  // rails, rouleaux, chargeur, tête de lecture
  g.add(slab(-138, -33, 220, 5, BED, 2, COL.lo, .8), slab(-138, -14, 220, 5, BED, 2, COL.lo, .8));
  for (const rx of [-94, -48, -2, 52, READ_X]) g.add(cylY(-33, -11.5, rx, BED + 5.8, 3, COL.mid, 24));
  g.add(slab(85, -36, 42, 3, BED, TOP - BED, COL.mid, .8), slab(124.2, -34, 3, 25, BED + 2, TOP - BED - 2, COL.mid, .8), slab(80.5, -33, 6, 23, BED + 3.6, 12, COL.mid, .8));
  const stack = box(HOPPER_X, LANE_Y, BED + 2, CARD.l, CARD.w, 1, COL.hi); g.add(stack);
  g.add(slab(READ_X - 6, -36, 12, 3.5, BED, 18, COL.mid, .8));
  const head = box(READ_X, LANE_Y, BED + 24, 16, 26, 4, COL.mid); g.add(head);
  g.add(slab(READ_X - 6, -12, 12, 3.5, BED, 18, COL.mid, .8));
  // poussoirs des quatre cases
  const rams = CENTRES.map((cx) => { g.add(slab(cx - 6, -36, 12, 3, BED, 9, COL.mid, .8)); const r = box(cx, -32.2, BED + 5, 16, 1.6, 5.2, COL.mid); g.add(r); return r; });
  // afficheurs des cases, bouton de lot, totalisateur des retards
  const counters = CENTRES.map((cx) => { const d = display(26, 7.5); d.mesh.position.set(cx, 106, FRONT.y + .05); g.add(d.mesh); return d; });
  for (const cx of CENTRES) { g.add(slab(cx - 22, FRONT.y - 8, 44, 8, DECK - 3, 3, COL.lo, 1)); }
  g.add(slab(54, -6, 64, 26, DECK, 22, COL.mid, 2));
  const late = display(52, 9); late.mesh.position.set(86, DECK + 14, 20.05); g.add(late.mesh);
  const knob = new THREE.Group(); knob.position.set(130, 86, -22.5);
  const kc = cyl(0, 0, 8, 0, 8, COL.mid, 36); kc.rotation.z = Math.PI / 2; kc.position.set(4, 0, 0); knob.add(kc); g.add(knob);
  // piles dans les cases
  const piles = CENTRES.map((cx) => { const m = box(cx, 9, DECK, 33, 20, 1, COL.hi); g.add(m); return m; });
  // fiches en transit
  const flights = [0, 1, 2].map(() => { const m = card(0, 0, 0, CARD.l, 1, CARD.w, COL.hi); m.geometry.dispose(); m.geometry = new THREE.BoxGeometry(CARD.l, .6, CARD.w); g.add(m); return m; });
  const kindOf = (i) => { const h = hash(i + 41); return h < .55 ? 0 : h < .72 ? 1 : h < .88 ? 2 : 3; };

  function update(time) {
    const idx = Math.floor(time / PERIOD);
    const counts = [0, 0, 0, 0]; const base = Math.floor(idx / PER_CYCLE) * PER_CYCLE;
    for (let i = base; i <= idx; i++) { const age = time - i * PERIOD; if (age > 3.3) counts[kindOf(i)]++; }
    // trois fiches au plus en vol
    flights.forEach((m, slot) => {
      let i = idx - ((idx - slot) % 3 + 3) % 3; const age = time - i * PERIOD, k = kindOf(i), tx = CENTRES[k];
      m.visible = age >= 0 && age < 3.3;
      if (!m.visible) return;
      m.material = new THREE.MeshStandardMaterial({ color: KINDS[k] === COL.hi ? COL.hi : KINDS[k], roughness: .8 });
      let x = HOPPER_X, y = LANE_Y, z = BED + 3;
      if (age < .5) x = HOPPER_X + (READ_X - HOPPER_X) * ease(age / .5);
      else if (age < .9) x = READ_X;
      else if (age < 1.9) x = READ_X + (tx - READ_X) * ease((age - .9) / 1.0);
      else { x = tx; const u = ease((age - 1.9) / .6); y = LANE_Y + 14 * u; if (age > 2.5) { const f = Math.min(1, (age - 2.5) / .8); z = BED + 3 - (BED + 3 - (DECK + 1 + counts[k] * .9)) * f * f; y = -7 + (9 - -7) * f; } }
      m.position.set(x, z, y);
    });
    for (let k = 0; k < 4; k++) {
      // poussoir : il sort au moment où la fiche de sa case arrive
      let push = 0; for (let j = idx - 2; j <= idx; j++) { if (j < 0 || kindOf(j) !== k) continue; const age = time - j * PERIOD; if (age > 1.9 && age < 2.6) push = Math.max(push, Math.sin(Math.PI * (age - 1.9) / .7)); }
      rams[k].position.z = -32.2 + 14 * push;
      const h = Math.max(.8, counts[k] * .9); piles[k].scale.y = h; piles[k].position.y = DECK + h / 2;
      counters[k].set(String(counts[k] + (k === 0 ? 4 : 0)).padStart(4, '0'));
    }
    late.set(counts[3] + ' retard' + (counts[3] > 1 ? 's' : ''));
    const rem = Math.max(2, 300 - ((idx - base) * 9)); stack.scale.y = rem * .085; stack.position.y = BED + 2 + rem * .085 / 2;
    knob.rotation.x = Math.sin(time * .5) * .6;
    head.position.y = BED + 24 + (Math.sin(time * 6) > .98 ? .4 : 0);
  }
  update(0);
  return { group: g, update };
}
