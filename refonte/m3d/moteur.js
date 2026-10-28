// Fig 04 · Reporteur Q18 : un fichier rotatif motorisé, en 3D (cotes de figures/build-moteur.mjs).
// Le rapport donne son OT ; on le compose au cadran, le moteur amène la fiche de la bonne ligne, qui se lève ; le tampon y reporte
// les données et, si le rapport en contient, un cavalier Q18 se clipse sur la tranche.
import * as THREE from 'three';
import { COL, slab, box, cyl, cylX, card, group, bench, display, ease, hash } from './core.js';

export const WIDTH = 236;
const PLATE = { x: -128, y: -36, w: 236, d: 88, r: 8 };
const AX = { z: 62, r0: 11, r1: 36, half: 26, rows: 36 };
const STAND = 33, STAND_W = 6, GANTRY_Z = 118;
const MOTOR = { x0: 44, x1: 70, r: 12 };
const STAMP = { w: 20, rest: 24, z0: 96, z1: 106 };
const CONSOLE = { x: -112, y: 14, w: 46, d: 32 }, CONSOLE_H = 14;
const DIAL = { x: -89, y: 28, r: 11 };
const HOLDER = { x: -60, y: 20, w: 24, d: 8 };
const STEP = 360 / AX.rows, READ = 90;
const D2R = Math.PI / 180;

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -40, y: PLATE.y + PLATE.d - 12, w: 120, d: 7 }, label: { x: 48, y: PLATE.y + PLATE.d - 26, w: 46, d: 11 } }));

  // bâti : deux montants, palier, manivelle
  for (const x of [-STAND, STAND]) {
    g.add(slab(x - STAND_W / 2 - 2, -18, STAND_W + 4, 36, 0, 3, COL.lo, 1.2));
    g.add(slab(x - STAND_W / 2, -6, STAND_W, 12, 3, GANTRY_Z - 3, COL.mid, 1.2));
    g.add(cylX(x + (x < 0 ? -STAND_W / 2 - 1.6 : STAND_W / 2), x + (x < 0 ? -STAND_W / 2 : STAND_W / 2 + 1.6), 0, AX.z, 6.4, COL.mid));
  }
  const crank = group(cylX(-STAND - STAND_W / 2 - 14, -STAND - STAND_W / 2 - 11.6, 0, 0, 12.4 * .5, COL.mid), cylX(-STAND - STAND_W / 2 - 11.6, -STAND - STAND_W / 2 - 4.6, 0, 0, 7, COL.lo)); crank.position.set(0, AX.z, 0);
  g.add(crank);
  // moteur
  g.add(slab(MOTOR.x0 + 3, -10, MOTOR.x1 - MOTOR.x0 - 6, 20, 0, 4, COL.lo, 1.6));
  g.add(slab(MOTOR.x0 + 7, -4, MOTOR.x1 - MOTOR.x0 - 14, 8, 4, AX.z - MOTOR.r - 6, COL.mid, 1));
  g.add(cylX(MOTOR.x0, MOTOR.x0 + 2.4, 0, AX.z, MOTOR.r + 1, COL.mid), cylX(MOTOR.x0 + 2.4, MOTOR.x1 - 2.4, 0, AX.z, MOTOR.r, COL.mid), cylX(MOTOR.x1 - 2.4, MOTOR.x1, 0, AX.z, MOTOR.r + 1, COL.mid));
  g.add(slab(MOTOR.x0 + 8, -5, 10, 10, AX.z + MOTOR.r - 1, 5, COL.mid, 1));
  // arbre et moyeu
  g.add(cylX(-STAND, STAND, 0, AX.z, 3.4, COL.lo));
  g.add(cylX(-AX.half - 2, AX.half + 2, 0, AX.z, AX.r0, COL.mid));
  // fichier rotatif : 36 fiches tournant autour de l'axe x
  const file = new THREE.Group(); file.position.set(0, AX.z, 0);
  const cards = [];
  const START_Q18 = Array.from({ length: AX.rows }, (_, r) => hash(r + 300) < 0.18);
  const rowGeo = (r) => {
    const holder = new THREE.Group(), mid = (AX.r0 + 1 + AX.r1) / 2;
    // la fiche est un rectangle du plan (x, rayon) ; l'axe de rotation est x
    const c = card(0, 0, 0, AX.half * 2, AX.r1 - AX.r0 - 1, .6, COL.hi); c.position.set(0, mid, 0);
    const head = card(0, 0, 0, 15, 1.6, .2, COL.dark, 0); head.position.set(-AX.half + 11, mid + 9, .4);
    const tab = card(0, 0, 0, 8, 5, 2.4, COL.accent, 0); tab.position.set(AX.half - 8, AX.r1, 0);
    holder.add(c, head, tab);
    holder.userData = { card: c, head, tab };
    return holder;
  };
  for (let r = 0; r < AX.rows; r++) { const h = rowGeo(r); h.userData.baseTab = START_Q18[r]; file.add(h); cards.push(h); }
  g.add(file);

  // portique, glissière et tampon
  g.add(slab(-STAND - 4, -4, STAND * 2 + 8, 8, GANTRY_Z, 5, COL.mid, 1.2));
  g.add(slab(-5, -2, 10, STAMP.rest + 14, GANTRY_Z - 4, 4, COL.mid, 1));
  const stamp = group(slab(-7, STAMP.rest - 1, 14, 10, GANTRY_Z - 9, 5, COL.mid, 1.2), cyl(0, STAMP.rest + 4, 2.2, STAMP.z1, GANTRY_Z - 9 - STAMP.z1, COL.mid, 18), slab(-STAMP.w / 2, STAMP.rest, STAMP.w, 8, STAMP.z0, STAMP.z1 - STAMP.z0, COL.mid, 1.2));
  g.add(stamp);

  // pupitre : afficheur, cadran qui tourne, voyant
  g.add(slab(CONSOLE.x, CONSOLE.y, CONSOLE.w, CONSOLE.d, 0, CONSOLE_H, COL.mid, 2.4));
  const disp = display(38, 7); disp.mesh.position.set(CONSOLE.x + CONSOLE.w / 2, 7 + 3.5, CONSOLE.y + CONSOLE.d + .05); g.add(disp.mesh);
  g.add(cyl(DIAL.x, DIAL.y, DIAL.r + 1.6, CONSOLE_H, 1, COL.mid, 40));
  const dial = new THREE.Group(); dial.position.set(DIAL.x, CONSOLE_H + 1, DIAL.y);
  const disc = cyl(0, 0, DIAL.r, 0, .8, COL.hi, 40); dial.add(disc);
  for (let i = 0; i < 10; i++) { const a = (90 + i * 28) * D2R, h = cyl(Math.cos(a) * (DIAL.r - 3), Math.sin(a) * (DIAL.r - 3), 1.8, .8, .2, COL.dark, 16); dial.add(h); }
  g.add(dial);
  g.add(cyl(DIAL.x + Math.cos(60 * D2R) * (DIAL.r + .4), DIAL.y + Math.sin(60 * D2R) * (DIAL.r + .4), .9, CONSOLE_H + 1, 2.4, COL.mid, 12));
  g.add(cyl(DIAL.x, DIAL.y, 3.2, CONSOLE_H + 1.8, 1.2, COL.lo, 20));
  const lamp = cyl(CONSOLE.x + CONSOLE.w / 2 + 15, CONSOLE.y + 8, 1.4, CONSOLE_H, .6, COL.lo, 20); g.add(lamp);

  // pince et rapport SharePoint
  g.add(slab(HOLDER.x, HOLDER.y, HOLDER.w, HOLDER.d, 0, 4, COL.mid, 1.4));
  g.add(slab(HOLDER.x + 8, HOLDER.y + 4.8, 8, 1.6, 4, 6, COL.mid, .5));
  const report = card(HOLDER.x + 12, HOLDER.y + 3.9, 4 + 14, 20, 28, .8, COL.hi);
  const rlines = group();
  for (const [i, w] of [[0, 9], [1, 13], [2, 7], [4, 14], [5, 10]]) rlines.add(box(HOLDER.x + 5 + w / 2, HOLDER.y + 4.4, 4 + 26 - i * 2.6, w, .1, .8, COL.dark, 0));
  const reportG = group(report, rlines);
  g.add(reportG);

  // ---- animation (mêmes temps que la figure d'origine) ----
  const T = { arrive: .8, digit: .5, spin: 1.8, open: .5, stamp: .8, tab: .6, rest: 1.4 };
  const DIALED = .8, SPUN = DIALED + 7 * T.digit, OPENED = SPUN + T.spin, STAMPED = OPENED + T.open, TABBED = STAMPED + T.stamp, CLOSED = TABBED + T.tab, END = CLOSED + T.open + T.rest;
  const QUEUE = Array.from({ length: 8 }, (_, i) => ({ row: Math.floor(hash(i + 900) * AX.rows), q18: hash(i + 700) < .45 }));
  const ROWS = Array.from({ length: AX.rows }, (_, r) => ({ ot: String(4102000 + r * 24117 + Math.floor(hash(r) * 900)) }));
  const target = (row) => READ - row * STEP;
  const short = (a, b) => b + ((((a - b) % 360) + 540) % 360) - 180;
  const starts = [READ]; for (let j = 0; j < QUEUE.length; j++) { const f = ((starts[j] % 360) + 360) % 360; starts.push(f + (short(target(QUEUE[j].row), f) - f)); }
  let q18 = START_Q18.slice(), printed = new Array(AX.rows).fill(false), lastJob = -1;

  function update(time) {
    const cycle = Math.floor(time / END), job = cycle % QUEUE.length, t = time - cycle * END;
    if (job !== lastJob) { if (job === 0) { q18 = START_Q18.slice(); printed.fill(false); } lastJob = job; }
    const q = QUEUE[job], row = q.row, from = ((starts[job] % 360) + 360) % 360;
    const angle = t < SPUN ? from : from + (short(target(row), from) - from) * ease((t - SPUN) / T.spin);
    const open = ease((t - OPENED) / T.open) * (1 - ease((t - CLOSED) / T.open));
    if (t > STAMPED + T.stamp * .5) printed[row] = true;
    if (t >= CLOSED && q.q18) q18[row] = true;
    const tabbing = q.q18 && t > TABBED && t < CLOSED + .05 ? ease((t - TABBED) / T.tab) : null;
    cards.forEach((h, r) => {
      let a = angle + r * STEP, d = ((a - READ) % 360 + 540) % 360 - 180;
      a = READ + d + Math.sign(d) * 16 * open * Math.max(0, 1 - Math.abs(d) / 60);
      h.rotation.x = -(a - 90) * D2R;           // la fiche de lecture est tournée vers l'avant (+y de figure)
      const sel = r === row;
      h.userData.card.position.y = (AX.r0 + 1 + AX.r1) / 2 + (sel ? 10 * open : 0);
      h.userData.head.position.y = h.userData.card.position.y + 9;
      const t3 = h.userData.tab;
      const showTab = q18[r] || (sel && tabbing !== null);
      t3.visible = showTab;
      t3.position.y = AX.r1 + (sel ? 10 * open : 0) + (sel && tabbing !== null ? (1 - tabbing) * 14 : 0);
      h.userData.card.material = sel && open > 0 ? lit : plain;
    });
    // tampon
    const press = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - STAMPED) / T.stamp)));
    stamp.position.z = -(STAMP.rest - 1.8) * press;
    // cadran
    const digits = ROWS[row].ot; let rot = 0, shown = '_______';
    const k = Math.floor((t - DIALED) / T.digit), u = (t - DIALED) / T.digit - k;
    if (t >= DIALED && k < 7) { const n = +digits[k] || 10; rot = (u < .45 ? ease(u / .45) : 1 - ease((u - .45) / .55)) * n * 28; }
    const typed = Math.max(0, Math.min(7, t < DIALED ? 0 : k + (u > .45 ? 1 : 0)));
    shown = digits.slice(0, typed).padEnd(7, '_');
    dial.rotation.y = rot * D2R; disp.set(shown);
    lamp.material = t >= SPUN && t < OPENED ? litLamp : offLamp;
    crank.rotation.x = angle * D2R;
    // rapport : il arrive par le haut, repart en fin de cycle
    const rise = (1 - ease(t / T.arrive)) * 30 + ease((t - END + .6) / .6) * 30;
    reportG.position.y = rise; reportG.visible = rise < 29.5;
  }
  const plain = card(0, 0, 0, 1, 1, 1, COL.hi).material, lit = new THREE.MeshStandardMaterial({ color: '#ffe3c2', roughness: .8 });
  const offLamp = lamp.material, litLamp = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 });
  update(0);
  return { group: g, update, controls: { label: 'Rapport', min: 1, max: QUEUE.length, step: 1, fmt: (v) => 'rapport ' + v + ' / ' + QUEUE.length, get: (t) => Math.floor(t / END) % QUEUE.length + 1, seek: (v) => (v - 1) * END } };
}
