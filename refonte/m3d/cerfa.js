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
  const knobDisp = display(18, 6.5); knobDisp.mesh.rotation.y = Math.PI / 2; knobDisp.mesh.position.set(130.05, 106, -22.5); g.add(knobDisp.mesh);
  const knob = new THREE.Group(); knob.position.set(130, 86, -22.5);
  const kc = cyl(0, 0, 8, 0, 8, COL.mid, 36); kc.rotation.z = Math.PI / 2; kc.position.set(4, 0, 0); knob.add(kc); g.add(knob);
  // piles dans les cases (T = 0,085 par fiche) et butées avant
  const T = .085, POCKET_Y = 5, HOPPER = { x: 87, w: 37 };
  let LOT = 300;
  const piles = CENTRES.map((cx) => { const m = box(cx, POCKET_Y + CARD.w / 2, DECK, CARD.l, CARD.w, 1, COL.hi); g.add(m); g.add(slab(cx - 21, 23.5, 44, 2.5, DECK, 7, COL.mid, .6)); return m; });
  // pile du chargeur et masse posée dessus
  const hopStack = box(HOPPER.x + CARD.l / 2, LANE_Y, BED + 2, CARD.l, CARD.w, 1, COL.hi); g.add(hopStack);
  const weight = group(slab(HOPPER.x + 8 - (HOPPER.x + CARD.l / 2), LANE_Y - 5 - LANE_Y, 21, 10, 0, 5, COL.mid, 1.4), cyl(HOPPER.x + 18.5 - (HOPPER.x + CARD.l / 2), 0, 3, 5, 4, COL.mid, 24)); g.add(weight);
  // fiches en vol : plaques plates de 37 × 17 × 0,8 (comme sur le dessin)
  const pool = Array.from({ length: 6 }, () => { const m = card(0, 0, 0, CARD.l, .8, CARD.w, COL.hi, 30); m.geometry.dispose(); m.geometry = new THREE.BoxGeometry(CARD.l, .8, CARD.w); m.visible = false; g.add(m); return m; });
  // — animation : mêmes constantes et mêmes équations que figures/build-cerfa.mjs —
  const INTERVAL = .42, SPEED = 240, PUSH = .2, FALL = .38, MACHINE_S = 80 / 300, WEIGHTS = [.72, .06, .1, .12];
  const kindOf = (i) => { let h = Math.imul(i + 1, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; const u = (h >>> 0) / 4294967296; let c = 0; for (let k = 0; k < 4; k++) { c += WEIGHTS[k]; if (u < c) return [3, 2, 1, 0][k]; } return 0; };
  const kinds = Array.from({ length: 500 }, (_, i) => kindOf(i));
  const travel = (i) => (HOPPER.x + CARD.l / 2 - CENTRES[kinds[i]]) / SPEED, duration = (i) => travel(i) + PUSH + FALL;
  const ease2 = (u) => u * u * (3 - 2 * u);
  // durée d'un lot : toutes les fiches tombées, puis 3 s de pause, puis reprise (départ à −0,6 s)
  const cycleOf = () => (LOT - 1) * INTERVAL + duration(LOT - 1) + 3 + .6;
  function update(time) {
    const t = (time % cycleOf()) - .6;
    let sent = 0; const landed = [0, 0, 0, 0], flying = [];
    for (let i = 0; i < LOT; i++) { const age = t - i * INTERVAL; if (age < 0) break; sent++; if (age >= duration(i)) landed[kinds[i]]++; else flying.push([i, age]); }
    const left = LOT - sent;
    hopStack.visible = left > 0; hopStack.scale.y = Math.max(.01, left * T); hopStack.position.y = BED + 2 + (left ? .85 : 0) + left * T / 2;
    weight.position.set(HOPPER.x + CARD.l / 2, BED + 2 + (left ? .85 : 0) + left * T, LANE_Y);
    piles.forEach((p, k) => { const n = landed[k]; p.visible = n > 0; p.scale.y = Math.max(.01, n * T); p.position.y = DECK + n * T / 2; counters[k].set(String(n).padStart(4, '0')); });
    late.set(landed[0] + (landed[0] > 1 ? ' retards' : ' retard'));
    pool.forEach((m, n) => {
      const f = flying[n]; if (!f) { m.visible = false; return; }
      const [i, age] = f, k = kinds[i], cx = CENTRES[k], tA = travel(i), top = DECK + landed[k] * T;
      let x, y = LANE_Y, z = BED + 2;
      if (age < tA) x = HOPPER.x + CARD.l / 2 - age * SPEED;
      else { x = cx; const push = Math.min(1, (age - tA) / PUSH), fall = Math.max(0, (age - tA - PUSH) / FALL); y = LANE_Y + 9 * ease2(push) + (POCKET_Y + CARD.w / 2 - LANE_Y - 9) * ease2(fall); z = BED + 2 + (top - BED - 2) * fall * fall; }
      m.visible = true; m.position.set(x, z + .4, y);
    });
    const push = [0, 0, 0, 0]; let reading = false;
    flying.forEach(([i, age]) => { const a = age - travel(i); if (a > 0 && a < PUSH + .25) push[kinds[i]] = Math.max(push[kinds[i]], Math.sin(Math.min(1, a / (PUSH + .25)) * Math.PI) * 9); const x = HOPPER.x + CARD.l / 2 - age * SPEED; if (age < travel(i) && Math.abs(x - READ_X) < CARD.l / 2) reading = true; });
    rams.forEach((r, k) => { r.position.z = -32.2 + push[k]; });
    head.material = reading ? litHead : plainHead;
    knobDisp.set('300');
  }
  const plainHead = head.material, litHead = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .6 });
  update(0);
  return { group: g, update, controls: { label: 'Taille du lot', min: 50, max: 500, step: 50, fmt: (v) => v + ' fiches', get: () => LOT, set: (v) => { LOT = v; return 0; } } };
}
