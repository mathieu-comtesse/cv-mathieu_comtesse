// Fig 09 · Retrouver tout le suivi : un standard téléphonique à fiches, en 3D.
// Portage fidèle de figures/build-suivi.mjs : mêmes cotes, mêmes 12 recherches (OT, équipement, bâtiment), même cycle de 4,2 s,
// même trajet de la fiche (sortie de la douille, vol en arc jusqu'au jack, branchement couché vers le tableau, maintien, retour),
// même cordon en chaînette et même voyant allumé au-dessus du jack branché.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display, ease } from './core.js';

export const WIDTH = 224;
const PLATE = { x: -112, y: -46, w: 224, d: 104, r: 8 };
const DESK = { x: -92, y: -34, w: 184, d: 62 }, DESK_H = 30;
const PANEL = { x: -86, y: -32, w: 172, d: 12 }, PANEL_Z = [DESK_H, 118], FACE = PANEL.y + PANEL.d;
const COLS = [-56, -28, 0, 28, 56], ROWS_Z = [96, 74, 52], SOCKETS = [-40, 0, 40], SOCKET_Y = 12;
const PLUG = { r: 3, h: 13 };
const SOURCES = ['GMAO', 'exports', 'SharePoint', 'Excel', 'Power BI'];
const hash = (i) => { let h = Math.imul(i + 13, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const QUERIES = Array.from({ length: 12 }, (_, i) => {
  const kind = Math.floor(hash(i) * 3), src = kind === 0 ? [0, 2, 3][Math.floor(hash(i + 20) * 3)] : Math.floor(hash(i + 40) * 5);
  const value = kind === 0 ? 'OT ' + (4100000 + Math.floor(hash(i + 60) * 899999)) : kind === 1 ? 'ÉQ ' + ['TGBT', 'CTA', 'SSI', 'ASC', 'GE'][Math.floor(hash(i + 80) * 5)] + '-' + String(Math.floor(hash(i + 90) * 90) + 10) : 'BÂT ' + String.fromCharCode(65 + Math.floor(hash(i + 100) * 8)) + String(Math.floor(hash(i + 110) * 9) + 1);
  return { kind, src, value };
});
const CYCLE = 4.2;

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -90, y: PLATE.y + PLATE.d - 11, w: 90, d: 7 }, label: { x: 40, y: PLATE.y + PLATE.d - 13, w: 46, d: 10 } }));
  g.add(slab(DESK.x, DESK.y, DESK.w, DESK.d, 0, DESK_H, COL.mid, 3), slab(DESK.x - 2, DESK.y - 2, DESK.w + 4, DESK.d + 4, DESK_H - 3, 3, COL.mid, 3));
  g.add(slab(PANEL.x, PANEL.y, PANEL.w, PANEL.d, PANEL_Z[0], PANEL_Z[1] - PANEL_Z[0], COL.mid, 2));
  g.add(slab(PANEL.x - 2, PANEL.y - 1, PANEL.w + 4, PANEL.d + 2, PANEL_Z[1], 3, COL.mid, 1.4));
  const lamps = [];
  ROWS_Z.forEach((z, r) => COLS.forEach((x, c) => {
    const j = cyl(0, 0, 4.4, 0, 1.2, COL.mid, 24); j.rotation.x = Math.PI / 2; j.position.set(x, z, FACE + .6); g.add(j);
    const hole = cyl(0, 0, 2.2, 0, 1.3, COL.dark, 16); hole.rotation.x = Math.PI / 2; hole.position.set(x, z, FACE + .7); g.add(hole);
    const lamp = cyl(0, 0, 1.6, 0, .8, COL.lo, 20); lamp.rotation.x = Math.PI / 2; lamp.position.set(x, z + 8, FACE + .4); g.add(lamp); lamps[r * 5 + c] = lamp;
  }));
  COLS.forEach((x, c) => { const d = display(22, 5, { font: 'bold 30px ui-monospace,Menlo,Consolas,monospace' }); d.mesh.position.set(x, 110, FACE + .06); d.set(SOURCES[c].toUpperCase()); g.add(d.mesh); });
  SOCKETS.forEach((x) => g.add(cyl(x, SOCKET_Y, 5.6, DESK_H, 1.2, COL.mid, 28)));
  const query = display(40, 7); query.mesh.position.set(0, 12, DESK.y + DESK.d + .05); g.add(query.mesh);
  // fiches : tige de 4 puis corps moleté jusqu'à PLUG.h
  const plugMats = [mat(COL.hi), new THREE.MeshStandardMaterial({ color: '#ffe3c2', roughness: .8 })];
  const plugs = SOCKETS.map(() => {
    const p = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4, 16), plugMats[0]), body = new THREE.Mesh(new THREE.CylinderGeometry(PLUG.r, PLUG.r, PLUG.h - 4, 20), plugMats[0]);
    stem.position.y = 2; body.position.y = 4 + (PLUG.h - 4) / 2; [stem, body].forEach((m) => { m.castShadow = true; p.add(m); }); p.userData = { stem, body };
    g.add(p); return p;
  });
  const cords = SOCKETS.map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), mat(COL.ink)); m.castShadow = true; g.add(m); return m; });
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: .9 }), lampOff = mat(COL.lo);

  function plugAt(q, u) {
    const home = [SOCKETS[q.kind], SOCKET_Y, DESK_H + 1.2], jack = [COLS[q.src], FACE + 1.2 + PLUG.h, ROWS_Z[q.kind]];
    const go = ease(u / .3), back = ease((u - .75) / .25), v = u < .75 ? go : 1 - back;
    const p = home.map((h, i) => h + (jack[i] - h) * v);
    p[2] += 22 * Math.sin(Math.PI * v) * (u < .3 || u > .75 ? 1 : 0);
    return { p, plugged: u >= .3 && u < .75, v };
  }
  function cordGeo(from, to) {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14, sag = 8 * Math.sin(Math.PI * t) * Math.min(1, Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / 40); pts.push(new THREE.Vector3(from[0] + (to[0] - from[0]) * t, from[2] + (to[2] - from[2]) * t - sag, from[1] + (to[1] - from[1]) * t)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .7, 6, false);
  }
  function update(time) {
    const n = Math.floor(time / CYCLE), u = time / CYCLE - n, q = QUERIES[n % QUERIES.length], st = plugAt(q, u);
    SOCKETS.forEach((x, kind) => {
      const pl = plugs[kind], idle = !(kind === q.kind && st.v > .001);
      cords[kind].geometry.dispose();
      if (idle) {
        pl.position.set(x, DESK_H + 1.2, SOCKET_Y); pl.rotation.set(0, 0, 0); pl.userData.stem.material = pl.userData.body.material = plugMats[0];
        cords[kind].geometry = cordGeo([x, SOCKET_Y, DESK_H + 1.2], [x, SOCKET_Y + .01, DESK_H + 1.2 + PLUG.h * .5]);
        return;
      }
      pl.userData.stem.material = pl.userData.body.material = plugMats[1];
      if (st.plugged) {
        // couchée vers le tableau : sa tige entre dans le jack (axe le long de y de figure)
        pl.position.set(st.p[0], st.p[2], st.p[1] - PLUG.h); pl.rotation.set(Math.PI / 2, 0, 0);
      } else { pl.position.set(st.p[0], st.p[2], st.p[1]); pl.rotation.set(0, 0, 0); }
      cords[kind].geometry = cordGeo([x, SOCKET_Y, DESK_H + 1.2], st.plugged ? [st.p[0], st.p[1], st.p[2]] : st.p);
    });
    ROWS_Z.forEach((_, r) => COLS.forEach((__, c) => { lamps[r * 5 + c].material = st.plugged && r === q.kind && c === q.src ? lampOn : lampOff; }));
    query.set(u < .85 ? q.value : 'EN ATTENTE');
  }
  update(0);
  return { group: g, update, controls: { label: 'Recherche', min: 1, max: QUERIES.length, step: 1, fmt: (v) => 'recherche ' + v + ' / ' + QUERIES.length, get: (t) => Math.floor(t / CYCLE) % QUERIES.length + 1, seek: (v) => (v - 1) * CYCLE } };
}
