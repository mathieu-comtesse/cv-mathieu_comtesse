// Fig 05 · Gares prioritaires : un tableau à palettes piloté par un bouton de pondération, en 3D.
// Portage fidèle de figures/build-gares.mjs : mêmes cotes, mêmes dix gares et mêmes scores, mêmes colonnes (rang, nom, score),
// palettes qui défilent caractère par caractère (une palette toutes les 60 ms), bouton qui balaie de 20 à 80 % avec des pauses.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench } from './core.js';

export const WIDTH = 268;
const PLATE = { x: -134, y: -36, w: 268, d: 100, r: 8 };
const BOARD = { x: -92, y: -22, w: 184, d: 14 }, BOARD_Z = [56, 140], FACE = BOARD.y + BOARD.d;
const ROWS = 6, CELL = { w: 8.4, h: 9.4, gap: 1.2 }, ROW_H = 11, TOP_RAIL = 130;
const COLS = { rank: [-80, 2], name: [-54, 7], score: [34, 3] };
const LAMP_X = 74;
const DESK = { x: -112, y: 16, w: 74, d: 34 }, DESK_H = 20, KNOB = { x: -75, y: 33, r: 9 };
const CAB = { x: 6, y: 14, w: 96, d: 34 }, CAB_H = 34;
const rowZ = (r) => TOP_RAIL - (r + 1) * ROW_H + .8;
const STATIONS = [['GARE 01', 82, 41], ['GARE 02', 35, 88], ['GARE 03', 64, 66], ['GARE 04', 91, 22], ['GARE 05', 48, 74], ['GARE 06', 27, 59], ['GARE 07', 73, 80], ['GARE 08', 56, 31], ['GARE 09', 40, 93], ['GARE 10', 69, 52]];
const CHARS = ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function glyph() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 72;
  const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL.w, CELL.h), new THREE.MeshBasicMaterial({ map: tex }));
  const draw = (ch, on) => { ctx.fillStyle = on ? '#cfd4de' : '#f4f4ef'; ctx.fillRect(0, 0, 64, 72); ctx.fillStyle = '#1d2230'; ctx.font = 'bold 54px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 32, 40); ctx.fillStyle = 'rgba(29,34,48,.35)'; ctx.fillRect(0, 35, 64, 2); tex.needsUpdate = true; };
  draw(' ', false);
  return { mesh: m, draw };
}

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -100, y: PLATE.y + PLATE.d - 11, w: 96, d: 7 }, label: { x: 30, y: PLATE.y + PLATE.d - 13, w: 46, d: 10 } }));
  for (const x of [-74, 66]) g.add(slab(x - 4, -24, 16, 18, 0, 3, COL.lo, 2), slab(x, -18, 8, 6, 3, BOARD_Z[0] - 3, COL.mid, 1));
  g.add(slab(BOARD.x, BOARD.y, BOARD.w, BOARD.d, BOARD_Z[0], BOARD_Z[1] - BOARD_Z[0], COL.dark, 2));
  g.add(slab(BOARD.x - 2, BOARD.y - 1, BOARD.w + 4, BOARD.d + 2, BOARD_Z[1], 3, COL.mid, 1.4));
  // palettes à caractères
  const cells = {};
  for (let r = 0; r < ROWS; r++) for (const [name, [x0, n]] of Object.entries(COLS)) for (let c = 0; c < n; c++) {
    const gl = glyph(); gl.mesh.position.set(x0 + c * (CELL.w + CELL.gap) + CELL.w / 2, rowZ(r) + CELL.h / 2, FACE + .1); g.add(gl.mesh);
    cells[r + '-' + name + '-' + c] = { gl, shown: ' ', target: ' ', next: 0, spins: 0, on: false };
  }
  // voyants de rangée (le premier est allumé)
  const lamps = Array.from({ length: ROWS }, (_, r) => { const l = cyl(0, 0, 1.7, 0, .8, r === 0 ? COL.accent : COL.lo, 20); l.rotation.x = Math.PI / 2; l.position.set(LAMP_X, rowZ(r) + CELL.h / 2, FACE + .4); if (r === 0) l.material = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .9 }); g.add(l); return l; });
  // pupitre et bouton de pondération (0 à 100 %, demi-tour gradué tous les 10 %)
  g.add(slab(DESK.x, DESK.y, DESK.w, DESK.d, 0, DESK_H, COL.mid, 2.4));
  const from = -Math.PI * .75, span = Math.PI * 1.5;
  for (let i = 0; i <= 20; i++) { const a = from + i / 20 * span, major = i % 2 === 0; const tk = box(0, 0, 0, .5, major ? 3 : 1.6, .2, COL.dark, 0); tk.geometry.dispose(); tk.geometry = new THREE.BoxGeometry(.5, .2, major ? 3 : 1.6); tk.rotation.y = Math.PI / 2 - a + Math.PI / 2; tk.position.set(KNOB.x + Math.sin(a) * (KNOB.r + 6), DESK_H + .2, KNOB.y - Math.cos(a) * (KNOB.r + 6)); g.add(tk); }
  g.add(cyl(KNOB.x, KNOB.y, KNOB.r + 1.6, DESK_H, 1, COL.lo, 40), cyl(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1, 6, COL.mid, 40));
  const ptr = box(0, 0, 0, 1, 1, 1, COL.ink, 0); ptr.geometry.dispose(); ptr.geometry = new THREE.BoxGeometry(KNOB.r - 1 - 2.4, .6, 1); g.add(ptr);
  // armoire : 19 tiroirs (5 × 4 moins la serrure) et 159 picots (16 × 10 moins un)
  g.add(slab(CAB.x, CAB.y, CAB.w, CAB.d, 0, CAB_H, COL.mid, 2.4));
  const cols = 5, rws = 4, dw = (CAB.w - 12) / cols, dh = (CAB_H - 9) / rws;
  for (let r = 0; r < rws; r++) for (let c = 0; c < cols; c++) {
    const x = CAB.x + 6 + c * dw, z = 5 + r * dh, last = r === rws - 1 && c === cols - 1;
    if (last) { const lk = cyl(0, 0, 2.2, 0, 1, COL.mid, 20); lk.rotation.x = Math.PI / 2; lk.position.set(x + dw / 2, z + dh / 2, CAB.y + CAB.d + .5); g.add(lk); continue; }
    g.add(box(x + dw / 2, CAB.y + CAB.d + .1, z + dh / 2, dw - 1.2, .4, dh - 1.2, COL.hi, 0), box(x + dw / 2, CAB.y + CAB.d + .5, z + dh / 2, 6, .6, 1.4, COL.dark, 0));
  }
  g.add(slab(CAB.x + 8, CAB.y + 5, CAB.w - 16, CAB.d - 10, CAB_H, 1, COL.lo, 1.4));
  const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(.55, .55, 2.2, 10), mat(COL.dark), 159); pins.castShadow = true;
  const gx = (CAB.w - 24) / 15, gy = (CAB.d - 16) / 9, m4 = new THREE.Matrix4();
  for (let j = 0, k = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (i + j * 16 < 159) { m4.makeTranslation(CAB.x + 12 + i * gx, CAB_H + 2, CAB.y + 8 + j * gy); pins.setMatrixAt(k++, m4); }
  g.add(pins);

  // — modèle : pondération w (conformité), classement, défilement des palettes —
  let w = .5, shownW = .5, clock = 0, dir = 1, hold = 0, last = null;
  const rank = (wt) => STATIONS.map(([n, c, m], i) => ({ n, i, s: Math.round(wt * c + (1 - wt) * m) })).sort((a, b) => b.s - a.s || a.i - b.i);
  let top = rank(w);
  function setTargets() {
    top = rank(w);
    for (let r = 0; r < ROWS; r++) {
      const row = top[r], parts = { rank: String(r + 1).padStart(2, '0'), name: row.n, score: String(row.s).padStart(3, ' ') };
      for (const [name, [, n]] of Object.entries(COLS)) for (let c = 0; c < n; c++) {
        const cell = cells[r + '-' + name + '-' + c], ch = parts[name][c] || ' ';
        if (cell.target !== ch) { cell.target = ch; cell.next = clock + r * .07 + c * .03; cell.spins = 2 + ((r + c) % 3); }
      }
    }
  }
  setTargets();
  function flip() {
    for (const key in cells) {
      const cell = cells[key];
      if (cell.shown === cell.target || clock < cell.next) { if (cell.on) { cell.on = false; cell.gl.draw(cell.shown, false); } continue; }
      cell.on = true;
      cell.shown = cell.spins-- > 0 ? CHARS[(CHARS.indexOf(cell.shown) + 1 + Math.floor(Math.random() * 6)) % CHARS.length] : cell.target;
      cell.gl.draw(cell.shown, true); cell.next = clock + .06;
    }
  }
  function update(time) {
    let dt = last === null ? 1 / 60 : time - last; last = time; if (dt < 0 || dt > .5) dt = 1 / 30;
    clock += dt;
    if ((hold -= dt) <= 0) { w += dir * dt * .08; if (w > .8 || w < .2) { dir = -dir; w = Math.max(.2, Math.min(.8, w)); hold = 2.5; } }
    shownW += (w - shownW) * Math.min(1, dt * 8);
    const before = top.map((t) => t.n + t.s).join();
    if (rank(w).map((t) => t.n + t.s).join() !== before) setTargets();
    flip();
    const a = from + shownW * span, r0 = 2.4, r1 = KNOB.r - 1, rm = (r0 + r1) / 2;
    ptr.position.set(KNOB.x + Math.sin(a) * rm, DESK_H + 7.2, KNOB.y - Math.cos(a) * rm); ptr.rotation.y = Math.PI / 2 - a;
  }
  update(0);
  return { group: g, update };
}
