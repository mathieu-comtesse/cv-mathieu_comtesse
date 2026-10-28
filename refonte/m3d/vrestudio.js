// Fig 11 · VRE Studio : le mécanisme d'Anticythère, en 3D (cotes de figures/build-anticythere.mjs).
// Boîtier de bois ouvert à l'avant, platine patinée, roues de bronze extrudées (vraies dents, vraie épaisseur) ; la fiche entre par la fente,
// la grande roue allume les champs, la cheville du modèle tombe dans la coulisse des règles, le cadran à spirale prédit douze pages,
// chaque correction taille une dent sur la machine à diviser, la roue neuve entre dans le boîtier et l'ancienne rejoint le tableau des versions.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, cylY, group, bench, finish } from './core.js';

export const WIDTH = 318;
const TAU = Math.PI * 2;
const PLATE = { x: -128, y: -64, w: 318, d: 150, r: 12 };
const CASE = { x0: -72, x1: 82, y0: -42, y1: 0, h: 132, t: 6 };
const MECH_Y = -16;
const GEARS = { b1: { u: -25, z: 62, r: 40, n: 64 }, crank: { u: -57, z: 26, r: 10.5, n: 16 }, idle: { u: 16, z: 91, r: 9.5, n: 14 }, pin: { u: 39, z: 104, r: 15, n: 24 }, slot: { u: 43, z: 104, r: 15, n: 24 }, p2: { u: 22, z: 60, r: 8, n: 12 }, corpus: { u: 46, z: 60, r: 16, n: 26 }, d46: { u: 21, z: 26, r: 18.4, n: 46 }, o20: { u: 47.4, z: 26, r: 8, n: 20 } };
const DIAL = { u: 21, z: 64, r0: 5, r1: 17, turns: 3 };
const CELLS = Array.from({ length: 12 }, (_, i) => 0.1 + i * 0.075);
const DIV = { x: 128, y: 40, r: 20, z: 22 };
const BOARD = { x0: 98, x1: 170, y: -46, z0: 6, z1: 70 };
const TRAY = { x: -98, y: 40 };
const C = { wood: '#e8d2ab', woodLo: '#d4b689', woodDk: '#bf9d6c', bronze: '#dcc08a', bronzeLo: '#bf9f66', bronzeHi: '#efdcb0', patina: '#a9b89f', steel: '#e3e6e8', steelLo: '#c9ced2', paper: '#fbf6e8', f: ['#d2452f', '#3f6fb0', '#e0b23a', '#3d8f8a'], r: ['#c98a6a', '#8aa3c4', '#c9b26a'], ok: '#35a974', bad: '#e5484d', fixed: '#e0a33a' };
const T = { read: [0.5, 4.2], sort: [2.0, 6.0], accord: [6.0, 9.6], infer: [10.0, 15.6], fix: [16.0, 23.0], train: [23.0, 28.0], ship: [28.4, 32.0], rerun: [32.4, 38.0], gain: [36.0, 40.0] }, LOOP_T = 42;
const ERR = [4, 9];
const TS = [0, 2.0, 6.0, 10.0, 16.0, 23.0, 28.4, 32.4, 36.0];
const STATIONS = ['Lecture', 'Tri mini-BERT', 'Modèle et règles', 'Pages inédites', 'Validation humaine', 'Corpus et entraînement', 'Publication', 'Nouvel essai', 'Gain × 2,3'];
const stationAt = (s) => { let i = 0; TS.forEach((a, j) => { if (s >= a) i = j; }); return i; };
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;

/* contour d'une roue dentée dans son plan (dents trapézoïdales), trous d'allègement en option */
function gearShape(r, n, depth, cut = n, holes = []) {
  const s = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const w = TAU / n, a = i * w, ro = i < cut ? r : r - depth, ri = r - depth;
    [[ri, 0], [ri, 0.18], [ro, 0.3], [ro, 0.62], [ri, 0.74]].forEach(([rr, q], k) => { const x = rr * Math.cos(a + w * q), y = rr * Math.sin(a + w * q); if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y); });
  }
  s.closePath();
  for (const [x, y, hr] of holes) { const h = new THREE.Path(); h.absarc(x, y, hr, 0, TAU, true); s.holes.push(h); }
  return s;
}
/* roue dressée face à l'avant (+y de figure) : face avant à y = 0 du groupe, épaisseur T vers l'arrière */
function wheel(r, n, T, color, o = {}) {
  const depth = o.depth ?? Math.max(1.6, r * 0.07);
  const holes = o.holes ?? (r > 9 && !o.web ? [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + 0.4; return [Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.22]; }) : []);
  const geo = new THREE.ExtrudeGeometry(gearShape(r, n, depth, o.cut ?? n, holes), { depth: T, bevelEnabled: false, curveSegments: 18 }); geo.translate(0, 0, -T);
  const spin = new THREE.Group(); spin.add(finish(geo, mat(color, { roughness: .55, metalness: .25 }), 28));
  const hub = Math.max(2.4, r * 0.18);
  const hb = finish(new THREE.CylinderGeometry(hub + .9, hub + .9, 1.4, 24).rotateX(Math.PI / 2).translate(0, 0, .7), mat(C.bronzeHi, { roughness: .5, metalness: .25 }), 40); spin.add(hb);
  const ax = finish(new THREE.CylinderGeometry(1.2, 1.2, 2.6, 14).rotateX(Math.PI / 2).translate(0, 0, 1.3), mat(C.bronzeLo), 40); spin.add(ax);
  if (r > 9) for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + .5, sc = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .3, 8).rotateX(Math.PI / 2), mat(C.bronzeLo)); sc.position.set(Math.cos(a) * hub * .62, Math.sin(a) * hub * .62, 1.5); spin.add(sc); }
  const g = new THREE.Group(); g.add(spin); g.userData.spin = spin; return g;
}
const at = (o, x, y, z) => { o.position.set(x, z, y); return o; };
/* cadran peint sur un canvas (le dessin suit le modèle : spirale, cases, aiguille) */
function canvasDisc(radius, px = 256) {
  const c = document.createElement('canvas'); c.width = c.height = px; const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: .7 }));
  return { mesh, ctx, tex, px };
}

function stateAt(s) {
  const o = {};
  // la manivelle : tourne pendant la lecture, l'inférence et le nouvel essai ; la grande roue suit (16 / 64)
  const crankTurns = 2.0 * ease(seg(s, 0.5, 9.6)) + 3.0 * ease(seg(s, 10.0, 15.6)) + 3.0 * ease(seg(s, 32.4, 40.0));
  o.crank = crankTurns * TAU; o.b1 = -o.crank * GEARS.crank.n / GEARS.b1.n;
  o.idle = -o.b1 * GEARS.b1.n / GEARS.idle.n; o.pin = -o.idle * GEARS.idle.n / GEARS.pin.n;
  // la coulisse suit la cheville quand l'accord est fait ; avant, elle hésite (décalage qui se résorbe)
  const ac = ease(seg(s, T.accord[0], T.accord[1]));
  o.slot = o.pin + (1 - ac) * 0.5 * Math.sin(s * 3);
  o.accord = s > T.accord[0] + 2.4 && s < T.accord[1] + 0.6 || s > T.rerun[0] + 0.8 && s < T.gain[1];
  o.p2 = -o.b1 * GEARS.b1.n / GEARS.p2.n;
  // anneaux du corpus : chaque correction les fait avancer d'un cran ; ils tournent pendant l'entraînement
  const fixes = ERR.map((_, i) => ease(seg(s, T.fix[0] + i * 3.2, T.fix[0] + i * 3.2 + 1.2)));
  o.corpus = [0.6, -0.9, 1.3].map((k2, i) => k2 * (fixes[0] + fixes[1]) * 0.8 + k2 * 2.2 * ease(seg(s, T.train[0], T.train[1])) + i * 0.4);
  // gain : la menante tourne, la menée tourne 46 / 20 fois plus vite
  o.d46 = -0.9 * TAU * ease(seg(s, T.gain[0], T.gain[1])) * 2; o.o20 = -o.d46 * 46 / 20;
  // voyants des champs : allumés quand un rayon passe sous le peigne (en haut de la grande roue)
  o.lamps = [0, 1, 2, 3].map((i) => { const a = ((o.b1 + i * TAU / 4) % TAU + TAU) % TAU, d = Math.abs(((a + Math.PI / 2) % TAU + TAU) % TAU - Math.PI); return (s > 2.0 && s < 9.6) || (s > 32.4 && s < 40) ? (d > Math.PI - 0.5 || s % 46 > 6 ? 1 : 0) : 0; });
  // cadran à spirale : l'aiguille parcourt les douze cases ; premier passage : deux erreurs ; second : tout vert
  const p1 = seg(s, T.infer[0], T.infer[1]), p2 = seg(s, T.rerun[0], T.rerun[1]);
  o.spiral = s < T.rerun[0] ? lerp(0.04, 0.96, p1) : lerp(0.04, 0.96, p2);
  o.cells = CELLS.map((c, i) => {
    const second = s >= T.rerun[0], u = second ? p2 : p1, reached = lerp(0.04, 0.96, u) >= c && (second || s >= T.infer[0]);
    if (!reached) return second || s < T.infer[0] ? 0 : 0;
    if (!second && ERR.includes(i)) { const k2 = ERR.indexOf(i), fixed = s > T.fix[0] + k2 * 3.2 + 1.2; return fixed ? 3 : 2; }
    return 1;
  });
  // machine à diviser : une dent par correction, puis la roue se termine pendant l'entraînement
  const cutTeeth = Math.floor(fixes[0] * 6 + fixes[1] * 6 + 34 * ease(seg(s, T.train[0], T.train[1])));
  o.cut = Math.min(46, cutTeeth); o.index = (o.cut / 46) * TAU;
  o.cutter = (() => { const strokes = []; ERR.forEach((_, i) => strokes.push([T.fix[0] + i * 3.2, T.fix[0] + i * 3.2 + 1.2])); strokes.push([T.train[0], T.train[1]]); let v = 0; for (const [a, b] of strokes) if (s > a && s < b) v = Math.abs(Math.sin((s - a) * 9)); return v; })();
  // publication : la roue neuve monte du plateau jusqu'au boîtier ; l'ancienne roue de gain part au tableau
  o.ship = ease(seg(s, T.ship[0], T.ship[0] + 1.8)); o.old = ease(seg(s, T.ship[0] + 1.2, T.ship[1]));
  o.version = s < T.ship[0] + 2.4 ? 2 : 3;
  // fiche : descend dans la fente au début, une seconde au nouvel essai
  o.card = [ease(seg(s, 0.5, 2.6)), ease(seg(s, 32.4, 34.2))];
  return o;
}

export function build() {
  const g = new THREE.Group();
  const add = (...o) => o.forEach((m) => g.add(m));
  add(bench(PLATE, { strip: { x: -112, y: PLATE.y + PLATE.d - 12, w: 120, d: 7 }, label: { x: 30, y: PLATE.y + PLATE.d - 14, w: 50, d: 10 }, plateH: 14, footH: 7 }));
  const W = (c, o) => mat(c, { roughness: .78, ...o }), { x0, x1, y0, y1, h, t } = CASE;
  const wbox = (cx, cy, cz, w, d, hh, c = C.wood) => { const m = finish(new THREE.BoxGeometry(w, hh, d), W(c), 30); m.position.set(cx, cz, cy); return m; };
  // ---- boîtier de bois : socle mouluré sur pieds de bronze, fond, flancs, dessus à trois planches ----
  for (const [x, y] of [[x0 - 1, y0 - 1], [x1 + 1, y0 - 1], [x0 - 1, y1 + 1], [x1 + 1, y1 + 1]]) add(cyl(x, y, 2.6, 0, 2, C.bronzeLo, 16));
  add(slab(x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 10, 2, 3, C.woodDk, 1.2), slab(x0 - 3.5, y0 - 3.5, x1 - x0 + 7, y1 - y0 + 7, 5, 2, C.woodLo, 1));
  add(wbox((x0 + x1) / 2, y0 + t / 2, 7 + (h - 7) / 2, x1 - x0, t, h - 7, C.woodLo));
  add(wbox(x0 + t / 2, (y0 + y1) / 2, 7 + (h - 7) / 2, t, y1 - y0, h - 7), wbox(x1 - t / 2, (y0 + y1) / 2, 7 + (h - 7) / 2, t, y1 - y0, h - 7));
  for (let i = 0; i < 3; i++) add(wbox((x0 + x1) / 2, y0 - 3 + (i + .5) * (y1 - y0 + 6) / 3, h + 3.5, x1 - x0 + 6, (y1 - y0 + 6) / 3 - .25, 7, i === 1 ? C.woodLo : C.wood));
  for (const [x, y] of [[x0 - 3, y1 + 3], [x1 + 3, y1 + 3], [x1 + 3, y0 - 3], [x0 - 3, y0 - 3]]) add(box(x - Math.sign(x) * 4.5, y - Math.sign(y + 21) * 4.5, h + 7.15, 9, 9, .3, C.bronze));
  // fente de lecture, lèvres de laiton ; rampe des quatre voyants des champs
  add(box(-35, -21, h + 7.6, 30, 10, 1.2, C.bronze), box(-35, -21, h + 8.25, 22, 4, .2, '#3a332a'));
  add(box(20, y1 + 1, h + 3.5, 52, 4, 5, C.bronzeLo));
  const lamps = C.f.map((c, i) => { const m = cylY(y1 + 3, y1 + 4, 2 + i * 12, h + 3.5, 1.8, '#cfcdc4', 16); add(m); return m; });
  const lampOn = C.f.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .9 })), lampOff = lamps[0].material;
  // platine patinée sur quatre entretoises, vis d'angle
  add(box((x0 + x1) / 2, MECH_Y - 1.5, h / 2, x1 - x0 - 16, 3, h - 20, C.patina));
  for (const [x, z] of [[x0 + 12, 16], [x1 - 12, 16], [x0 + 12, h - 16], [x1 - 12, h - 16]]) add(cylY(MECH_Y, MECH_Y + 1, x, z, 1.4, C.bronze, 12));
  // ---- les roues (vraies roues dentées extrudées) ----
  const FY = MECH_Y + 4, mk = (key, o = {}) => { const q = GEARS[key], w = wheel(q.r, q.n, o.T ?? (q.r > 12 ? 3 : 2.2), o.color ?? C.bronze, o); at(w, q.u, FY + (o.lift ?? 0), q.z); add(w); return w; };
  const wB1 = mk('b1', { web: true, holes: [] });
  C.f.forEach((c, i) => { const a = (i / 4) * TAU, R = GEARS.b1.r - 6; const sp = finish(new THREE.BoxGeometry(R, 6.4, 1.2).translate(R / 2, 0, .6), mat(c, { roughness: .6 }), 30); sp.rotation.z = a; wB1.userData.spin.add(sp); });
  const wCrank = mk('crank'), wIdle = mk('idle'), wP2 = mk('p2'), wPin = mk('pin'), wSlot = mk('slot', { lift: 3.4 }), wD46 = mk('d46'), wO20 = mk('o20');
  { const peg = finish(new THREE.CylinderGeometry(1.8, 1.8, 7.6, 14).rotateX(Math.PI / 2).translate(10, 0, 3.8), mat(C.bronzeHi), 40); wPin.userData.spin.add(peg); }
  { const sl = new THREE.Mesh(new THREE.BoxGeometry(9.5, 3.2, .4).translate(8.75, 0, .2), mat('#3a332a')); wSlot.userData.spin.add(sl); }
  const hand = finish(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 13, 0), new THREE.Vector3(1, 0, 0)]).setIndex([0, 2, 1]), mat('#1d2230', { side: THREE.DoubleSide }), 0);
  hand.position.z = 2.8; wO20.userData.spin.add(hand);
  const rings = C.r.map((c, i) => { const r = 16 - i * 4.6, w = wheel(r, 26 - i * 7, 1.6, c, { depth: 1.4, holes: [[0, 0, r - 2.6]] }); w.userData.spin.children.slice(1).forEach((m) => { m.visible = false; }); at(w, GEARS.corpus.u, FY + i * 1.6, GEARS.corpus.z); add(w); return w; });
  add(cylY(FY, FY + 6, GEARS.corpus.u, GEARS.corpus.z, 1.4, C.bronzeLo, 14));
  // peigne de lecture au-dessus de la grande roue ; voyant d'accord
  add(box(GEARS.b1.u, FY, GEARS.b1.z + 45.5, 20, 3.6, 3, C.bronze));
  for (let i = 0; i < 4; i++) add(box(GEARS.b1.u - 7 + i * 5, FY, GEARS.b1.z + 41.5, 1.4, 2.4, 5, C.bronze));
  const okLamp = cylY(FY, FY + 1.6, GEARS.slot.u + 14, GEARS.slot.z + 14, 2.2, '#cfcdc4', 16); add(okLamp);
  const okOn = new THREE.MeshStandardMaterial({ color: C.ok, emissive: C.ok, emissiveIntensity: .9 }), okOff = okLamp.material;
  // manivelle : bras et poignée de bois
  const crank = new THREE.Group(); at(crank, GEARS.crank.u, MECH_Y + 6, GEARS.crank.z);
  crank.add(finish(new THREE.BoxGeometry(14, 2, 1.2).translate(7, 0, 0), mat(C.bronzeLo), 30), finish(new THREE.CylinderGeometry(1.8, 1.8, 9, 14).rotateX(Math.PI / 2).translate(14, 0, 4.5), W(C.woodDk), 40));
  add(crank);
  // ---- flanc droit : plaque de bronze, cadran à spirale et cadran des versions peints ----
  add(box(x1 + .3, -21, 66, .6, 38, 116, C.bronze));
  const dial = canvasDisc(22.5), ver = canvasDisc(10.5, 128);
  for (const [d, z] of [[dial, DIAL.z], [ver, 106]]) { d.mesh.rotation.y = Math.PI / 2; d.mesh.position.set(x1 + 1.1, z, -21); add(d.mesh); }
  add(cylX(x1 + .2, x1 + 1, -21, DIAL.z, 23.6, C.bronzeLo, 48), cylX(x1 + .2, x1 + 1, -21, 106, 11.4, C.bronzeLo, 32));
  // ---- établi : plateau des fiches, boîte du corpus, outils ----
  add(slab(TRAY.x - 24, TRAY.y - 18, 48, 36, 0, 3, C.woodLo, 1));
  for (let i = 0; i < 7; i++) add(box(TRAY.x - 10 + (i % 2) * .6, TRAY.y, 3.5 + i * 1.1, 18, 23, 1, C.paper));
  C.f.forEach((c, i) => add(box(TRAY.x - 16 + [11, 7, 13, 9][i] / 2, TRAY.y - 8 + i * 4.5, 3 + 7 * 1.1 + .1, [11, 7, 13, 9][i], 1.1, .1, c)));
  add(slab(TRAY.x + 3, TRAY.y - 14, 19, 28, 3, 11, C.wood, 1));
  C.r.forEach((c, i) => add(box(TRAY.x + 6.2 + i * 5.6, TRAY.y, 15.5 + i * .3, 2.4, 22, 3 + i * .6, c)));
  add(slab(-122, -10, 40, 28, 0, .4, C.paper, .6));
  for (const [x, y, r, n] of [[-48, 52, 7, 14], [-30, 62, 5, 10]]) { const sg = new THREE.ExtrudeGeometry(gearShape(r, n, 1.4), { depth: 1.6, bevelEnabled: false }); sg.rotateX(-Math.PI / 2); add(at(finish(sg, mat(C.bronze, { metalness: .25, roughness: .55 }), 28), x, y, 0)); }
  add(cyl(-70, 66, 5, 0, 5, C.bronze, 24), cyl(-70, 66, 3.2, 5, 2, C.bronze, 20), cyl(36, 64, 5, 0, 2.4, C.steelLo, 28), cyl(36, 64, 3.8, 2.4, .2, '#d8eef2', 28));
  add(box(-1, 53.5, .7, 22, 3, 1.4, C.steelLo), box(16, 53.5, 1.1, 12, 3.8, 2.2, C.woodDk));
  // ---- machine à diviser ----
  add(slab(DIV.x - 34, DIV.y - 24, 68, 50, 0, 2, C.steelLo, 1), slab(DIV.x - 32, DIV.y - 22, 64, 46, 2, 4, C.steel, 1.4));
  add(cyl(DIV.x, DIV.y, 8, 6, 2, C.steelLo, 28), cyl(DIV.x, DIV.y, 6, 8, DIV.z - 10, C.steel, 20), cyl(DIV.x, DIV.y, DIV.r + 6, 6, 3, C.bronze, 56));
  add(box(DIV.x + 18, DIV.y - 20, 9, 5, 5, 6, C.steel), box(DIV.x - 26, DIV.y, 14, 10, 18, 16, C.steel), box(DIV.x - 14.5, DIV.y, 23.2, 33, 7, 2.4, C.steelLo));
  add(cyl(DIV.x + 26, DIV.y + 17, 3.5, 6, 12, C.steel, 16));
  const wheelGeo = Array.from({ length: 47 }, (_, cut) => { const geo = new THREE.ExtrudeGeometry(gearShape(DIV.r, 46, 1.6, cut), { depth: 2.4, bevelEnabled: false, curveSegments: 18 }); geo.rotateX(-Math.PI / 2); return geo; });
  const cutWheel = finish(wheelGeo[0], mat(C.bronze, { metalness: .25, roughness: .55 }), 0); at(cutWheel, DIV.x, DIV.y, DIV.z - 13); add(cutWheel);
  const cutEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wheelGeo[0], 28), new THREE.LineBasicMaterial({ color: 0x1d2230, transparent: true, opacity: .42 })); cutWheel.add(cutEdges);
  const carriage = new THREE.Group(); add(carriage);
  carriage.add(at(finish(new THREE.BoxGeometry(8, 6, 6), mat(C.steel), 30), -3, DIV.y, 27.4));
  const cutter = finish(gearShapeGeo(4.2, 12, .9, 1.6), mat(C.steelLo, { metalness: .4, roughness: .4 }), 28); at(cutter, 3, DIV.y + 1.4, DIV.z - 11.8); carriage.add(cutter);
  carriage.add(at(finish(new THREE.BoxGeometry(2, 24.4 - (DIV.z - 11.8), 1.6), mat(C.steel), 30), .2, DIV.y, (24.4 + DIV.z - 11.8) / 2));
  const handle = new THREE.Group(); at(handle, DIV.x + 26, DIV.y + 17, 18.5); add(handle);
  handle.add(finish(new THREE.BoxGeometry(6, 1, 1).translate(3, 0, 0), mat(C.steel), 30), at(finish(new THREE.CylinderGeometry(1.5, 1.5, 5, 12), W(C.woodDk), 40), 6, 0, 2.5));
  // ---- tableau des versions ----
  add(wbox((BOARD.x0 + BOARD.x1) / 2, BOARD.y - 1.5, 4 + (BOARD.z1 - 4) / 2, BOARD.x1 - BOARD.x0, 3, BOARD.z1 - 4));
  add(slab(BOARD.x0 - 3, BOARD.y - 6, BOARD.x1 - BOARD.x0 + 6, 10, 0, 4, C.woodLo, 1), wbox((BOARD.x0 + BOARD.x1) / 2, BOARD.y - 1.5, BOARD.z1 + 1.5, BOARD.x1 - BOARD.x0 + 2, 5, 3, C.woodLo));
  const boardGears = [0, 1, 2, 3].map((i) => { const u = BOARD.x0 + 12 + i * 16, w = wheel(10, 20, 2, C.bronze, { depth: 1.2, holes: [] }); at(w, u, BOARD.y + 2, 58); w.userData.spin.rotation.z = i * .7; add(w); add(box(u, BOARD.y + .2, 41.8, 10, .4, 4.5, C.paper)); return w; });
  // ---- pièces en voyage : la fiche, la roue neuve, l'ancienne roue ----
  const card = box(-35, -21, 0, 22, 3.2, 30, C.paper); add(card);
  const newWheel = finish(wheelGeo[46], mat(C.bronzeHi, { metalness: .25, roughness: .5 }), 28); add(newWheel);
  const oldWheel = wheel(10, 20, 2, C.bronze, { depth: 1.2, holes: [] }); add(oldWheel);

  function paintDial(o) {
    const { ctx, px, tex } = dial, k = px / 2 / 22.5, c0 = px / 2;
    ctx.fillStyle = '#fbfaf6'; ctx.fillRect(0, 0, px, px);
    ctx.strokeStyle = '#8a8a8f'; ctx.lineWidth = 1;
    for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU, r0 = i % 3 ? 20.6 : 19.2; ctx.beginPath(); ctx.moveTo(c0 + r0 * k * Math.cos(a), c0 + r0 * k * Math.sin(a)); ctx.lineTo(c0 + 22.4 * k * Math.cos(a), c0 + 22.4 * k * Math.sin(a)); ctx.stroke(); }
    const sp = (s) => { const a = s * DIAL.turns * TAU - Math.PI / 2, r = DIAL.r0 + (DIAL.r1 - DIAL.r0) * s; return [c0 + r * k * Math.cos(a), c0 + r * k * Math.sin(a)]; };
    ctx.strokeStyle = '#26262a'; ctx.lineWidth = 1.3; ctx.beginPath(); for (let i = 0; i <= 160; i++) { const [x, y] = sp(i / 160); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    CELLS.forEach((s, i) => { const [x, y] = sp(s); ctx.fillStyle = ['#fbfaf6', C.ok, C.bad, C.fixed][o.cells[i]]; ctx.strokeStyle = '#8a8a8f'; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.strokeRect(x - 6, y - 6, 12, 12); });
    const [hx, hy] = sp(o.spiral); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c0, c0); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = C.bronze; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(c0, c0, 4, 0, TAU); ctx.fill();
    tex.needsUpdate = true;
  }
  function paintVer(v) {
    const { ctx, px, tex } = ver, c0 = px / 2, k = px / 2 / 10.5;
    ctx.fillStyle = '#fbfaf6'; ctx.fillRect(0, 0, px, px); ctx.strokeStyle = '#8a8a8f'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * .55; ctx.beginPath(); ctx.moveTo(c0 + 4 * k * Math.cos(a), c0 + 4 * k * Math.sin(a)); ctx.lineTo(c0 + 10 * k * Math.cos(a), c0 + 10 * k * Math.sin(a)); ctx.stroke(); }
    const a = -Math.PI / 2 + (v - 2.5) * .55; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(c0, c0); ctx.lineTo(c0 + 8 * k * Math.cos(a), c0 + 8 * k * Math.sin(a)); ctx.stroke();
    tex.needsUpdate = true;
  }
  let lastDial = '', lastVer = -1, lastCut = -1;
  function update(time) {
    const s = ((time % LOOP_T) + LOOP_T) % LOOP_T, o = stateAt(s), sp = (w, a) => { w.userData.spin.rotation.z = -a; };
    sp(wB1, o.b1); sp(wCrank, o.crank); sp(wIdle, o.idle); sp(wP2, o.p2); sp(wPin, o.pin); sp(wSlot, o.slot); sp(wD46, o.d46); sp(wO20, o.o20);
    rings.forEach((w, i) => sp(w, o.corpus[i]));
    crank.rotation.z = -o.crank;
    lamps.forEach((m, i) => { m.material = o.lamps[i] ? lampOn[i] : lampOff; });
    okLamp.material = o.accord ? okOn : okOff;
    const key = o.cells.join('') + Math.round(o.spiral * 400); if (key !== lastDial) { lastDial = key; paintDial(o); }
    if (o.version !== lastVer) { lastVer = o.version; paintVer(o.version); }
    // fiche : descend dans la fente
    const cu = o.card.find((u) => u > 0 && u < 1); card.visible = cu !== undefined; if (card.visible) card.position.y = CASE.h + 8 + 40 * (1 - cu) - 15;
    // machine à diviser : dents taillées, roue indexée, couteau qui frappe
    if (o.cut !== lastCut) { lastCut = o.cut; cutWheel.geometry = wheelGeo[o.cut]; cutEdges.geometry.dispose(); cutEdges.geometry = new THREE.EdgesGeometry(wheelGeo[o.cut], 28); }
    cutWheel.rotation.y = -o.index; cutWheel.visible = o.ship === 0;
    carriage.position.set(DIV.x - DIV.r - 6 + o.cutter * 4.5, 0, 0); cutter.rotation.z = o.cutter > 0 ? s * 14 : 0;
    handle.rotation.y = -(o.cut / 46) * TAU * 4;
    // publication : la roue neuve vole du plateau à la fente, l'ancienne rejoint le tableau
    newWheel.visible = o.ship > 0 && o.ship < 1;
    if (newWheel.visible) { const r = o.ship; newWheel.position.set(lerp(DIV.x, -35, r), lerp(DIV.z - 13, CASE.h + 9, r) + 70 * Math.sin(r * Math.PI * .85), lerp(DIV.y, -21, r)); newWheel.rotation.y = s * 2; }
    oldWheel.visible = o.old > 0 && o.old < 1;
    if (oldWheel.visible) { const r = o.old; at(oldWheel, lerp(CASE.x1 - 20, BOARD.x0 + 60, r), lerp(-10, BOARD.y + 3, r), lerp(30, 58, r) + 20 * Math.sin(r * Math.PI)); oldWheel.userData.spin.rotation.z = r * 3; }
    boardGears[3].visible = o.old >= 1;
  }
  update(0);
  return { group: g, update, controls: { label: 'Étape', min: 1, max: 9, step: 1, fmt: (v) => v + ' · ' + STATIONS[v - 1], get: (t) => stationAt(((t % LOOP_T) + LOOP_T) % LOOP_T) + 1, seek: (v) => TS[v - 1] + 1.5 } };
}
function gearShapeGeo(r, n, depth, T) { const geo = new THREE.ExtrudeGeometry(gearShape(r, n, depth), { depth: T, bevelEnabled: false, curveSegments: 12 }); geo.translate(0, 0, -T / 2); return geo; }
