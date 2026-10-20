// Fig 09 · Retrouver tout le suivi : un standard téléphonique à fiches, en 3D (cotes de figures/build-suivi.mjs).
// Trois fiches attendent sur le pupitre (OT, équipement, bâtiment). À chaque recherche, la fiche de sa ligne monte et se branche sur
// le jack de la bonne source ; la lampe au-dessus s'allume : le lien direct est établi. Le standard relie, il ne recopie pas.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, tube, group, bench, display, ease, hash } from './core.js';

export const WIDTH = 224;
const PLATE = { x: -112, y: -46, w: 224, d: 104, r: 8 };
const DESK = { x: -92, y: -34, w: 184, d: 62 }, DESK_H = 30;
const PANEL = { x: -86, y: -32, w: 172, d: 12 }, PANEL_Z = [DESK_H, 118], FACE = PANEL.y + PANEL.d;
const COLS = [-56, -28, 0, 28, 56], ROWS_Z = [96, 74, 52], SOCKETS = [-40, 0, 40], SOCKET_Y = 12;
const PLUG = { r: 3, h: 13 };
const PERIOD = 4.2;
const SRC = ['GMAO', 'EXPORTS', 'SHAREPOINT', 'EXCEL', 'POWER BI'];

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -90, y: PLATE.y + PLATE.d - 12, w: 120, d: 7 }, label: { x: 48, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  g.add(slab(DESK.x, DESK.y, DESK.w, DESK.d, 0, DESK_H, COL.mid, 3), slab(DESK.x - 2, DESK.y - 2, DESK.w + 4, DESK.d + 4, DESK_H - 3, 3, COL.mid, 3));
  g.add(slab(PANEL.x, PANEL.y, PANEL.w, PANEL.d, PANEL_Z[0], PANEL_Z[1] - PANEL_Z[0], COL.mid, 2));
  g.add(slab(PANEL.x - 2, PANEL.y - 1, PANEL.w + 4, PANEL.d + 2, PANEL_Z[1], 3, COL.mid, 1.4));
  const jacks = [], lamps = [];
  ROWS_Z.forEach((z, r) => COLS.forEach((x, c) => {
    const j = cyl(0, 0, 3.4, 0, 1, COL.lo, 24); j.rotation.x = Math.PI / 2; j.position.set(x, z, FACE + .4); g.add(j); jacks.push(j);
    const hole = cyl(0, 0, 1.6, 0, 1.1, COL.dark, 16); hole.rotation.x = Math.PI / 2; hole.position.set(x, z, FACE + .5); g.add(hole);
    const lamp = cyl(0, 0, 2, 0, 1, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(x, z + 8, FACE + .4); g.add(lamp); lamps.push(lamp);
  }));
  COLS.forEach((x, c) => { const d = display(22, 5, { font: 'bold 30px ui-monospace,Menlo,Consolas,monospace' }); d.mesh.position.set(x, 110, FACE + .06); d.set(SRC[c]); g.add(d.mesh); });
  // douilles et fiches
  const plugs = SOCKETS.map((x, i) => {
    g.add(cyl(x, SOCKET_Y, 5.6, DESK_H, 1.2, COL.mid, 28));
    const p = group(cyl(0, 0, PLUG.r, 0, PLUG.h, COL.hi, 20), cyl(0, 0, PLUG.r + 1, PLUG.h, 2, COL.lo, 20)); p.position.set(x, DESK_H + 1.2, SOCKET_Y); g.add(p); return p;
  });
  const cords = SOCKETS.map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), mat(COL.dark)); m.castShadow = true; g.add(m); return m; });
  const rowName = ['OT', 'ÉQUIPEMENT', 'BÂTIMENT'];
  const dd = display(40, 7); dd.mesh.position.set(0, DESK_H + .2, 30); dd.mesh.rotation.x = -Math.PI / 2; dd.mesh.position.set(0, DESK_H + 1.4, -2); g.add(dd.mesh);

  function update(time) {
    const idx = Math.floor(time / PERIOD), t = time - idx * PERIOD, row = Math.floor(hash(idx + 5) * 3), col = Math.floor(hash(idx + 17) * 5);
    const jx = COLS[col], jz = ROWS_Z[row];
    lamps.forEach((l, i) => { const on = i === row * 5 + col && t > 1.4 && t < 3.6; l.material = on ? new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: .9 }) : new THREE.MeshStandardMaterial({ color: COL.lo }); });
    plugs.forEach((p, i) => {
      const x0 = SOCKETS[i], y0 = DESK_H + 1.2;
      let x = x0, y = y0, z = SOCKET_Y;
      if (i === row) {
        const u = ease(t / 1.4), back = ease((t - 3.6) / .6);
        const k = Math.min(1, u) * (1 - back);
        x = x0 + (jx - x0) * k; y = y0 + (jz - 6 - y0) * k + Math.sin(Math.PI * Math.min(1, u)) * 12 * (1 - back); z = SOCKET_Y + (FACE + PLUG.h * .0 + 1 - SOCKET_Y) * k;
        p.rotation.x = k * Math.PI / 2;
      } else p.rotation.x = 0;
      p.position.set(x, y, z);
      // fil : de la douille à la fiche, avec une retombée
      const pts = [[x0, SOCKET_Y + 6, DESK_H + 1.2], [x0 + (x - x0) * .3, SOCKET_Y + 14, DESK_H + 4], [x0 + (x - x0) * .7, (z + SOCKET_Y + 14) / 2, Math.max(DESK_H + 2, y - 8)], [x, z - (i === row ? 3 : 6), y - (i === row ? 4 : -2)]];
      cords[i].geometry.dispose();
      cords[i].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([a, b, c]) => new THREE.Vector3(a, c, b))), 20, .7, 6, false);
    });
    dd.set(rowName[row] + ' → ' + SRC[col]);
  }
  update(0);
  return { group: g, update };
}
