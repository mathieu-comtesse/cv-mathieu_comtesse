// Fig 09 · Retrouver tout le suivi : un monorail de capsules, en 3D (cotes de figures/build-suivi.mjs).
// Le chariot du rail saisit la capsule du chargeur de la recherche (OT, équipement, bâtiment), la mène à la station de la bonne source
// (GMAO, exports, SharePoint, Excel, Power BI) et la pose dans sa cuvette ; le voyant s'allume : lien direct, sans recopier les données.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylY, ball, bench, display, ease } from './core.js';

export const WIDTH = 256;
const PLATE = { x: -128, y: -46, w: 256, d: 104, r: 8 };
const DESK = { x: -120, y: -30, w: 70, d: 54 }, DESK_H = 22, SOCKETS = [-110, -96, -82], SOCKET_Y = -4;
const BLOCK = { x: -36, y: -22, w: 150, d: 30 }, BLOCK_H = 26, COLS = [-18, 12, 42, 72, 102], POD = { r: 8.4, h: 10 };
const TRUNK = 112, CAPH = 12, CR = 3, RAIL_Y = -8, HANG = TRUNK - 4 - CAPH, PODZ = BLOCK_H + POD.h;
const SOURCES = ["GMAO", "exports", "SharePoint", "Excel", "Power BI"], KINDS = ["OT", "équipement", "bâtiment"];
const hash = (i) => { let h = Math.imul(i + 13, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const QUERIES = Array.from({ length: 12 }, (_, i) => {
  const kind = Math.floor(hash(i) * 3), src = kind === 0 ? [0, 2, 3][Math.floor(hash(i + 20) * 3)] : Math.floor(hash(i + 40) * 5);
  const value = kind === 0 ? "OT " + (4100000 + Math.floor(hash(i + 60) * 899999)) : kind === 1 ? "ÉQ " + ["TGBT", "CTA", "SSI", "ASC", "GE"][Math.floor(hash(i + 80) * 5)] + "-" + String(Math.floor(hash(i + 90) * 90) + 10) : "BÂT " + String.fromCharCode(65 + Math.floor(hash(i + 70) * 8));
  return { kind, src, value };
});
const CYCLE = 4.6, lerp = (a, b, u) => a + (b - a) * u;
const seat = (kind) => [SOCKETS[kind], SOCKET_Y, DESK_H + 1.2];
function carry(q, u) {
  const from = seat(q.kind), to = [COLS[q.src], RAIL_Y, PODZ + .4], home = -104;
  let cx, z;
  if (u < .14) { cx = lerp(home, from[0], ease(u / .14)); z = from[2]; }
  else if (u < .24) { cx = from[0]; z = lerp(from[2], HANG, ease((u - .14) / .1)); }
  else if (u < .5) { cx = lerp(from[0], to[0], ease((u - .24) / .26)); z = HANG; }
  else if (u < .6) { cx = to[0]; z = lerp(HANG, to[2], ease((u - .5) / .1)); }
  else if (u < .8) { cx = to[0]; z = to[2]; }
  else if (u < .86) { cx = to[0]; z = lerp(to[2], HANG, ease((u - .8) / .06)); }
  else if (u < .96) { cx = lerp(to[0], from[0], ease((u - .86) / .1)); z = HANG; }
  else { cx = from[0]; z = lerp(HANG, from[2], ease((u - .96) / .04)); }
  return { cx, z, plugged: u >= .58 && u < .82, away: u >= .14 && u < .96 };
}
const capsule = (color) => { const c = new THREE.Group(); c.add(cyl(0, 0, CR, 0, CAPH - 2, color, 20), ball(0, 0, CAPH - 2, CR, color)); return c; };

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -48, y: PLATE.y + PLATE.d - 13, w: 120, d: 7 }, label: { x: 80, y: PLATE.y + PLATE.d - 15, w: 40, d: 11 } }));
  g.add(slab(DESK.x, DESK.y, DESK.w, DESK.d, 0, DESK_H, COL.mid, 3), slab(BLOCK.x, BLOCK.y, BLOCK.w, BLOCK.d, 0, BLOCK_H, COL.mid, 3));
  SOCKETS.forEach((x) => g.add(cyl(x, SOCKET_Y, 5.6, DESK_H, 1.2, COL.mid, 28)));
  const query = display(58, 7); query.mesh.position.set(-85, 16, DESK.y + DESK.d + .05); g.add(query.mesh);
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 });
  const lamps = COLS.map((x, c) => {
    g.add(cyl(x, RAIL_Y, POD.r + 2, BLOCK_H, 3, COL.lo, 28), cyl(x, RAIL_Y, POD.r, BLOCK_H + 3, POD.h - 3, COL.mid, 28));
    const l = cyl(x + POD.r + 5, RAIL_Y + 6, 2.4, BLOCK_H, 1.2, COL.mid, 18); g.add(l);
    const d = display(24, 8); d.mesh.position.set(x, 10, BLOCK.y + BLOCK.d + .05); d.set(['GMAO', 'exports', 'SharePoint', 'Excel', 'Power BI'][c]); g.add(d.mesh);
    return l;
  });
  const off = lamps[0].material;
  for (const x of [-108, -38, 34, 106]) { const b = x < -50 ? DESK_H : BLOCK_H; g.add(slab(x - 2.4, RAIL_Y - 12, 4.8, 4.8, b, TRUNK - b, COL.mid, .8)); }
  g.add(slab(-112, RAIL_Y - 3.5, 226, 7, TRUNK, 6, COL.mid, 1), slab(-110, RAIL_Y - 1, 222, 2, TRUNK + 6, 1.2, COL.lo, .3));
  const carrier = new THREE.Group(); carrier.add(slab(-7, RAIL_Y - 5, 14, 10, TRUNK + 7.2, 5, COL.mid, 1), slab(-1.2, RAIL_Y - 5, 2.4, 10, TRUNK - 4, 4, COL.mid, .2)); g.add(carrier);
  const loaders = SOCKETS.map((x) => { const c = capsule(COL.hi); c.position.set(x, DESK_H + 1.2, SOCKET_Y); g.add(c); return c; });
  const fly = capsule(COL.accent); g.add(fly);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1, 6), mat(COL.dark)); g.add(rod);
  let last = null, manual = null;
  function update(time) {
    const clock = manual ?? time, n = Math.floor(clock / CYCLE), u = clock / CYCLE - n, q = QUERIES[n % QUERIES.length], st = carry(q, u);
    loaders.forEach((c, kind) => { c.visible = !(kind === q.kind && st.away); });
    carrier.position.x = st.cx;
    const carried = u >= .14;
    fly.visible = carried && (st.away || u >= .96); fly.position.set(st.cx, st.z, RAIL_Y);
    rod.visible = fly.visible && st.z > PODZ + 4 && st.z > DESK_H + 8; if (rod.visible) { const h = TRUNK - 3 - (st.z + CAPH - 1); rod.scale.y = Math.max(.1, h); rod.position.set(st.cx, st.z + CAPH - 1 + h / 2, RAIL_Y); }
    COLS.forEach((_, c) => { lamps[c].material = st.plugged && c === q.src ? lampOn : off; });
    query.set(u < .9 ? q.value : 'EN ATTENTE');
  }
  update(0);
  return { group: g, update, controls: { label: 'Recherche', min: 1, max: QUERIES.length, step: 1, fmt: (v) => 'recherche ' + v + ' / ' + QUERIES.length, get: (t) => Math.floor(t / CYCLE) % QUERIES.length + 1, seek: (v) => (v - 1) * CYCLE } };
}
