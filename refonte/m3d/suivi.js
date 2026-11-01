// Fig 09 · Retrouver tout le suivi : un tableau d'enquête sur chevalet, en 3D (cotes de figures/build-suivi.mjs).
// La fiche de la recherche s'épingle à sa ligne, un fil se tend jusqu'à la bonne source dont le voyant s'allume : lien direct, sans recopier.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, display, bench, paper, ease } from './core.js';

export const WIDTH = 224;
const PLATE = { x: -112, y: -50, w: 224, d: 100, r: 8 }, CAB = { x: -66, y: -12, w: 132, d: 30 }, CAB_H = 34, BOARD = { x: -62, w: 124, z0: 46, z1: 140 };
const QROWS = [112, 90, 68], QX = -36, QW = 22, QH = 17, SROWS = [116, 100, 84, 68, 52], SX = 12, SW = 24, SH = 12, TRAY = { x: -26, y: 14, w: 52, d: 18 }, TRAY_Z = CAB_H;
const SOURCES = ["GMAO", "exports", "SharePoint", "Excel", "Power BI"], KINDS = ["OT", "équipement", "bâtiment"];
const hash = (i) => { let h = Math.imul(i + 13, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const QUERIES = Array.from({ length: 12 }, (_, i) => {
  const kind = Math.floor(hash(i) * 3), src = kind === 0 ? [0, 2, 3][Math.floor(hash(i + 20) * 3)] : Math.floor(hash(i + 40) * 5);
  const value = kind === 0 ? "OT " + (4100000 + Math.floor(hash(i + 60) * 899999)) : kind === 1 ? "ÉQ " + ["TGBT", "CTA", "SSI", "ASC", "GE"][Math.floor(hash(i + 80) * 5)] + "-" + String(Math.floor(hash(i + 90) * 90) + 10) : "BÂT " + String.fromCharCode(65 + Math.floor(hash(i + 70) * 8));
  return { kind, src, value };
});
const CYCLE = 4.8, lerp = (a, b, u) => a + (b - a) * u;
export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -104, y: PLATE.y + PLATE.d - 13, w: 120, d: 7 }, label: { x: 40, y: PLATE.y + PLATE.d - 17, w: 46, d: 11 } }));
  g.add(slab(CAB.x, CAB.y, CAB.w, CAB.d, 0, CAB_H, COL.mid, 3));
  for (const x of [BOARD.x - 4, BOARD.x + BOARD.w + 4]) g.add(cyl(x, 0, 2.8, CAB_H + 2, BOARD.z1 + 10 - CAB_H, COL.mid, 20));
  g.add(slab(BOARD.x - 8, -3.4, BOARD.w + 16, 6.8, BOARD.z1 + 10, 4, COL.mid, 1), slab(BOARD.x, -2.2, BOARD.w, 4.4, BOARD.z0, BOARD.z1 - BOARD.z0, COL.mid, 1.2));
  const cork = box(0, 2.3, 89, 116, .3, 78, '#e9e4d8', 0); g.add(cork);
  const query = display(68, 7.6); query.mesh.position.set(0, BOARD.z1 - 6.2, 2.4); g.add(query.mesh);
  const kinds = ['OT', 'ÉQ.', 'BÂT.'].map((t, i) => { const d = display(9, 6); d.mesh.position.set(-52.5, QROWS[i] - 0, 2.4); d.set(t); g.add(d.mesh); return d; });
  const names = ['GMAO', 'exports', 'SharePoint', 'Excel', 'Power BI'], lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 }), lamps = SROWS.map((z, i) => { const d = display(14, 6.8); d.mesh.position.set(50, z, 2.4); d.set(names[i]); g.add(d.mesh); const l = cyl(58.6, 2.4, .95, z - .5, .6, COL.mid, 12); l.rotation.x = Math.PI / 2; l.position.set(58.6, z, 2.7); g.add(l); return l; });
  const off = lamps[0].material;
  g.add(slab(TRAY.x, TRAY.y, TRAY.w, TRAY.d, CAB_H, 1.6, COL.lo, 2));
  const card = (w, h) => { const p = paper(w, h, '#ffffff', 5); p.userData.flexv = true; g.add(p); return p; };
  const qc = QROWS.map(() => card(QW, QH)), sc = SROWS.map(() => card(SW, SH)), moving = card(QW, QH), slip = card(QW, QH);
  const str = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(1, 0, 0)), 2, .3, 6), new THREE.MeshBasicMaterial({ color: '#3e63dd' })); g.add(str);
  let clock = 0, manual = null;
  function update(time) {
    clock = manual ?? time;
    const n = Math.floor(clock / CYCLE), u = clock / CYCLE - n, q = QUERIES[n % QUERIES.length], qz = QROWS[q.kind], sz = SROWS[q.src], tray = [TRAY.x + TRAY.w / 2, TRAY_Z + 3 + QH / 2, TRAY.y + TRAY.d / 2];
    const pose = (p, c, curl, wave, ph) => { p.position.set(c[0], c[1], c[2]); p.userData.flex(curl, wave, wave * .6, ph, time); };
    qc.forEach((p, i) => { p.visible = !(i === q.kind && (u < .22 || u >= .82)); pose(p, [QX, QROWS[i], 3.4], (i % 2 ? 1 : -1) * .025, .18, i); });
    sc.forEach((p, i) => pose(p, [SX + SW / 2, SROWS[i], 3.4], (i % 2 ? 1 : -1) * .03, .22, i + 5));
    moving.visible = u < .22 || u >= .82;
    if (moving.visible) { const v = u < .22 ? u / .22 : 1 - (u - .82) / .18, e = ease(v); pose(moving, [lerp(tray[0], QX, e), lerp(tray[1], qz, e) + 12 * Math.sin(Math.PI * v), lerp(tray[2], 3.4, e)], -.07 * Math.sin(Math.PI * v), 1.2 * Math.sin(Math.PI * v), n); }
    slip.visible = u > .02 && u < .98; pose(slip, [tray[0], tray[1] - 2, tray[2]], .03, .1, n + 3);
    const v = u < .22 ? 0 : u < .4 ? ease((u - .22) / .18) : u < .8 ? 1 : 1 - ease((u - .8) / .18);
    str.visible = v > .001; if (str.visible) { const a = new THREE.Vector3(QX + QW / 2 + 1, qz + 3, 3.6), b = new THREE.Vector3(SX - 1, sz + 1, 3.6), e = a.clone().lerp(b, v), d = e.clone().sub(a), len = d.length(); str.geometry.dispose(); str.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(a, e), 2, .3, 6); void len; }
    lamps.forEach((l, c) => { l.material = u >= .4 && u < .8 && c === q.src ? lampOn : off; });
    query.set(u < .9 ? q.value : 'EN ATTENTE');
  }
  update(0);
  return { group: g, update, controls: { label: 'Recherche', min: 1, max: QUERIES.length, step: 1, fmt: (v) => 'recherche ' + v + ' / ' + QUERIES.length, get: (t) => Math.floor(t / CYCLE) % QUERIES.length + 1, seek: (v) => (v - 1) * CYCLE } };
}
