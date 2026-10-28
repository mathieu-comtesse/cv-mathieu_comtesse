// Fig 11 · Lecteur VRE : le mécanisme d'Anticythère, en 3D (cotes et modèle partagés avec la figure : ./anticythere-model.js).
// Boîtier de bois ouvert à l'avant, platine patinée, roues de bronze extrudées. La fiche entre par la fente, la grande roue allume les champs,
// la cheville du modèle tombe dans la coulisse des règles, le cadran à spirale propose les cadres de douze pages ; chaque page validée part
// en feuille vers le corpus ; le corpus figé vole en feuilles sur l'axe de la machine à diviser, devient un flan, puis une roue taillée ;
// le banc d'essai la juge sur deux rapports séparés ; le levier la publie : l'ancienne roue du modèle sort par la trappe, la nouvelle descend.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, cylY, group, bench, finish } from './core.js';
import { TAU, CASE, MECH_Y, FY, GEARS, phases, DIAL, CELLS, TRAY, CORPUS_TOP, DIV, GAUGE, LEVER, HATCH, BOARD, LID_Z, T, LOOP_T, TS, STATIONS, stationAt, SHEETS, sheetPose, sheetRows, sheetTrail, stateAt, pinInCase, newInFlight, oldInFlight, handAt, stampOf, DESK, AGENT } from './anticythere-model.js';

export const WIDTH = 318;
const PLATE = { x: -128, y: -64, w: 318, d: 150, r: 12 };
const PH = phases(true), RW = GEARS.pin.r;
const C = { wood: COL.hi, woodLo: COL.mid, woodDk: COL.lo, bronze: COL.mid, bronzeLo: COL.lo, bronzeHi: COL.hi, patina: '#e6e4dc', steel: COL.hi, steelLo: COL.mid, paper: '#ffffff', f: ['#d2452f', '#3f6fb0', '#e0b23a', '#3d8f8a'], r: ['#c98a6a', '#8aa3c4', '#c9b26a'], ok: '#35a974', bad: '#e5484d', fixed: '#e0a33a', prop: '#3e63dd' };
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
  const spin = new THREE.Group(); spin.add(finish(geo, mat(color, { roughness: .55, metalness: 0 }), 28));
  const hub = Math.max(2.4, r * 0.18);
  const hb = finish(new THREE.CylinderGeometry(hub + .9, hub + .9, 1.4, 24).rotateX(Math.PI / 2).translate(0, 0, .7), mat(C.bronzeHi, { roughness: .5, metalness: 0 }), 40); spin.add(hb);
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
  // dessus : planches pleines devant et derrière la trappe, deux tronçons de part et d'autre ; la trappe laisse passer la roue du modèle
  const ya = y0 - 3, yb = y1 + 3, X0 = x0 - 3, X1 = x1 + 3, plank = (xa, xb, yy0, yy1, c) => add(wbox((xa + xb) / 2, (yy0 + yy1) / 2, h + 3.5, xb - xa, yy1 - yy0 - .25, 7, c));
  plank(X0, X1, ya, HATCH.y0, C.wood); plank(X0, X1, HATCH.y1, yb, C.wood);
  plank(X0, HATCH.x0, HATCH.y0, HATCH.y1, C.woodLo); plank(HATCH.x1, X1, HATCH.y0, HATCH.y1, C.woodLo);
  for (const [xa, xb, yy0, yy1] of [[HATCH.x0 - 2.5, HATCH.x1 + 2.5, HATCH.y0 - 2.5, HATCH.y0], [HATCH.x0 - 2.5, HATCH.x1 + 2.5, HATCH.y1, HATCH.y1 + 2.5], [HATCH.x0 - 2.5, HATCH.x0, HATCH.y0, HATCH.y1], [HATCH.x1, HATCH.x1 + 2.5, HATCH.y0, HATCH.y1]]) add(box((xa + xb) / 2, (yy0 + yy1) / 2, h + 7.6, xb - xa, yy1 - yy0, 1.2, C.bronze));
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
  const mk = (key, o = {}) => { const q = GEARS[key], w = wheel(q.r, q.n, o.T ?? (q.r > 12 ? 3 : 2.2), o.color ?? C.bronze, { depth: q.d, ...o }); at(w, q.u, FY + (o.lift ?? 0), q.z); add(w); return w; };
  const wB1 = mk('b1', { web: true, holes: [] });
  C.f.forEach((c, i) => { const a = (i / 4) * TAU, R = GEARS.b1.r - 6; const sp = finish(new THREE.BoxGeometry(R, 6.4, 1.2).translate(R / 2, 0, .6), mat(c, { roughness: .6 }), 30); sp.rotation.z = a; wB1.userData.spin.add(sp); });
  const wCrank = mk('crank'), wIdle = mk('idle'), wP2 = mk('p2'), wPin = mk('pin'), wSlot = mk('slot', { lift: 4.2 }), wP3 = mk('p3'), wD46 = mk('d46', { lift: 3.2 }), wO20 = mk('o20', { lift: 3.2 });
  add(cylY(FY - 2.2, FY + 3.2, GEARS.p3.u, GEARS.p3.z, 1.3, C.bronzeLo, 14));
  { const peg = finish(new THREE.CylinderGeometry(1.8, 1.8, 7.6, 14).rotateX(Math.PI / 2).translate(10, 0, 4.2), mat(C.bronzeHi), 40); wPin.userData.spin.add(peg); }
  { const sl = new THREE.Mesh(new THREE.BoxGeometry(9.5, 3.2, .4).translate(8.75, 0, .2), mat('#3a332a')); wSlot.userData.spin.add(sl); }
  const hand = finish(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 13, 0), new THREE.Vector3(1, 0, 0)]).setIndex([0, 2, 1]), mat('#1d2230', { side: THREE.DoubleSide }), 0);
  hand.position.z = 2.8; wO20.userData.spin.add(hand);
  const rings = C.r.map((c, i) => { const r = GEARS.corpus.r - i * 4.6, w = wheel(r, 26 - i * 7, 1.6, c, { depth: i ? 1.4 : GEARS.corpus.d, holes: [[0, 0, r - 2.6]] }); w.userData.spin.children.slice(1).forEach((m) => { m.visible = false; }); at(w, GEARS.corpus.u, FY + i * 1.6, GEARS.corpus.z); add(w); return w; });
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
  const seal = cylY(TRAY.y + 14, TRAY.y + 14.8, TRAY.x + 12.5, 8.5, 2.6, '#a8392b', 20); add(seal);
  add(slab(-122, -10, 40, 28, 0, .4, C.paper, .6));
  for (const [x, y, r, n] of [[-48, 52, 7, 14], [-30, 62, 5, 10]]) { const sg = new THREE.ExtrudeGeometry(gearShape(r, n, 1.4), { depth: 1.6, bevelEnabled: false }); sg.rotateX(-Math.PI / 2); add(at(finish(sg, mat(C.bronze, { metalness: 0, roughness: .55 }), 28), x, y, 0)); }
  add(cyl(-70, 66, 5, 0, 5, C.bronze, 24), cyl(-70, 66, 3.2, 5, 2, C.bronze, 20), cyl(36, 64, 5, 0, 2.4, C.steelLo, 28), cyl(36, 64, 3.8, 2.4, .2, '#d8eef2', 28));
  add(box(-1, 53.5, .7, 22, 3, 1.4, C.steelLo), box(16, 53.5, 1.1, 12, 3.8, 2.2, C.woodDk));
  // ---- table lumineuse « Radiographie » et main de l'agent (manche, poignet, paume, quatre doigts, pouce, tampon) ----
  add(slab(DESK.x0, DESK.y0, DESK.x1 - DESK.x0, DESK.y1 - DESK.y0, 0, DESK.z - 1, C.wood, 1.2));
  add(at(new THREE.Mesh(new THREE.BoxGeometry(DESK.x1 - DESK.x0 - 3.2, 1, DESK.y1 - DESK.y0 - 3.2), new THREE.MeshStandardMaterial({ color: '#eef5ff', emissive: '#ffffff', emissiveIntensity: .15, roughness: .6 })), (DESK.x0 + DESK.x1) / 2, (DESK.y0 + DESK.y1) / 2, DESK.z - .5));
  // la main de l'agent : la main détourée de la fresque, à plat et toujours face au spectateur, ancrée au bout de l'index
  const handH = new THREE.Group(); add(handH);
  { const tex = new THREE.TextureLoader().load('assets/figures/main-agent.webp'); tex.colorSpace = THREE.SRGBColorSpace;
    const { w, h: hh, tip, k } = AGENT, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: .4 }));
    sp.center.set(tip[0] / w, 1 - tip[1] / hh); sp.scale.set(w * k, hh * k, 1); sp.material.rotation = AGENT.tilt; handH.add(sp); }
  const sparkM = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true }), spark = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), sparkM); add(spark);
  // ---- machine à diviser : plateau, axe, couteau ; banc d'essai ; levier de publication ----
  const RP = RW + 6;
  add(slab(DIV.x - 34, DIV.y - 24, 68, 50, 0, 2, C.steelLo, 1), slab(DIV.x - 32, DIV.y - 22, 64, 46, 2, 4, C.steel, 1.4));
  add(cyl(DIV.x, DIV.y, 8, 6, 2, C.steelLo, 28), cyl(DIV.x, DIV.y, RP, 6, 3, C.bronze, 56));
  add(box(DIV.x + 18, DIV.y - 20, 9, 5, 5, 6, C.steel), box(DIV.x - 26, DIV.y, 14, 10, 18, 16, C.steel), box(DIV.x - 14.5, DIV.y, 23.2, 33, 7, 2.4, C.steelLo), cyl(DIV.x - 26, DIV.y - 13, 4.5, 6, 2.4, C.steel, 24));
  const arbor = cyl(DIV.x, DIV.y, 2.6, DIV.z, 5, C.steel, 16); add(arbor);
  const blankGeo = new THREE.CylinderGeometry(RW - GEARS.pin.d, RW - GEARS.pin.d, 3, 48).translate(0, 1.5, 0);
  const wheelGeo = Array.from({ length: 25 }, (_, cut) => { const geo = new THREE.ExtrudeGeometry(gearShape(RW, 24, GEARS.pin.d, cut), { depth: 3, bevelEnabled: false, curveSegments: 18 }); geo.rotateX(-Math.PI / 2); return geo; });
  const bronzeM = mat(C.bronze, { metalness: 0, roughness: .55 });
  const cutWheel = finish(wheelGeo[0], bronzeM, 0); at(cutWheel, DIV.x, DIV.y, DIV.z); add(cutWheel);
  const cutEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wheelGeo[0], 28), new THREE.LineBasicMaterial({ color: 0x1d2230, transparent: true, opacity: .42 })); cutWheel.add(cutEdges);
  const blank = finish(blankGeo, bronzeM, 40); at(blank, DIV.x, DIV.y, DIV.z); add(blank);
  const candPeg = finish(new THREE.CylinderGeometry(1.8, 1.8, 3.6, 14).translate(10, 4.8, 0), mat(C.bronzeHi), 40); cutWheel.add(candPeg);
  const carriage = new THREE.Group(); add(carriage);
  carriage.add(at(finish(new THREE.BoxGeometry(8, 6, 6), mat(C.steel), 30), -3, DIV.y, 27.4));
  const cutter = finish(gearShapeGeo(4.2, 12, .9, 1.6), mat(C.steelLo, { metalness: 0, roughness: .4 }), 28); at(cutter, 3, DIV.y + 1.4, DIV.z + 1.5); carriage.add(cutter);
  carriage.add(at(finish(new THREE.BoxGeometry(2, 24.4 - (DIV.z + 1.5), 1.6), mat(C.steel), 30), .2, DIV.y, (24.4 + DIV.z + 1.5) / 2));
  // banc d'essai : boîtier, fente des rapports de test, cadrans F1 et rappel U1 peints, voyant
  const gx = (GAUGE.x0 + GAUGE.x1) / 2, gy = (GAUGE.y0 + GAUGE.y1) / 2;
  add(box(gx, gy, 6 + (GAUGE.z1 - 6) / 2, GAUGE.x1 - GAUGE.x0, GAUGE.y1 - GAUGE.y0, GAUGE.z1 - 6, C.steel), box(gx, gy, GAUGE.z1 + .1, 13, 1.6, .2, '#3a332a'));
  const gc = document.createElement('canvas'); gc.width = 256; gc.height = 128; const gctx = gc.getContext('2d'), gtex = new THREE.CanvasTexture(gc); gtex.colorSpace = THREE.SRGBColorSpace;
  const gface = new THREE.Mesh(new THREE.PlaneGeometry(GAUGE.x1 - GAUGE.x0 - 2, 9), new THREE.MeshStandardMaterial({ map: gtex, roughness: .7 })); gface.position.set(gx, 13, GAUGE.y1 + .05); add(gface);
  const gLamp = cylY(GAUGE.y1, GAUGE.y1 + .8, gx, 20.5, 1.3, '#cfcdc4', 16); add(gLamp);
  function paintGauge(f1, u1) {
    gctx.fillStyle = '#fbfaf6'; gctx.fillRect(0, 0, 256, 128);
    [[64, f1, .75], [192, u1, .9]].forEach(([cx, v, th]) => {
      gctx.strokeStyle = '#8a8a8f'; gctx.lineWidth = 4; gctx.beginPath(); gctx.arc(cx, 104, 48, Math.PI, 0); gctx.stroke();
      const ta = Math.PI + th * Math.PI; gctx.strokeStyle = '#d2452f'; gctx.lineWidth = 6; gctx.beginPath(); gctx.moveTo(cx + 36 * Math.cos(ta), 104 + 36 * Math.sin(ta)); gctx.lineTo(cx + 56 * Math.cos(ta), 104 + 56 * Math.sin(ta)); gctx.stroke();
      const a = Math.PI + v * Math.PI; gctx.strokeStyle = '#111'; gctx.lineWidth = 5; gctx.beginPath(); gctx.moveTo(cx, 104); gctx.lineTo(cx + 44 * Math.cos(a), 104 + 44 * Math.sin(a)); gctx.stroke();
    });
    gtex.needsUpdate = true;
  }
  // levier de publication
  add(box(LEVER.x, LEVER.y - 5, 6 + (LEVER.z - 6) / 2, 8, 10, LEVER.z - 6, C.steel));
  const lever = new THREE.Group(); at(lever, LEVER.x, LEVER.y - 5, LEVER.z); add(lever);
  lever.add(finish(new THREE.BoxGeometry(1, 11, 1).translate(0, 5.5, 0), mat(C.steel), 30), at(finish(new THREE.BoxGeometry(3.2, 3.4, 3.2), W(C.woodDk), 30), 0, 0, 11.5));
  // ---- tableau des versions ----
  add(wbox((BOARD.x0 + BOARD.x1) / 2, BOARD.y - 1.5, 4 + (BOARD.z1 - 4) / 2, BOARD.x1 - BOARD.x0, 3, BOARD.z1 - 4, C.woodLo));
  add(slab(BOARD.x0 - 3, BOARD.y - 6, BOARD.x1 - BOARD.x0 + 6, 10, 0, 4, C.woodLo, 1), wbox((BOARD.x0 + BOARD.x1) / 2, BOARD.y - 1.5, BOARD.z1 + 1.5, BOARD.x1 - BOARD.x0 + 2, 5, 3, C.woodLo));
  const boardGears = BOARD.slots.map(([u, z], i) => { const w = wheel(RW, 24, 3, C.bronze, { depth: GEARS.pin.d }); at(w, u, BOARD.y + 3, z); w.userData.spin.rotation.z = i * .7; add(w, box(u, BOARD.y + .2, z + RW + 3.3, 10, .4, 4.2, C.paper), cylY(BOARD.y, BOARD.y + 3.4, u, z, 1.8, C.bronzeLo, 12)); return w; });
  // ---- pièces en voyage : la fiche, la roue neuve, l'ancienne roue ----
  const newWheel = wheel(RW, 24, 3, C.bronzeHi, { depth: GEARS.pin.d }); add(newWheel);
  newWheel.userData.spin.add(finish(new THREE.CylinderGeometry(1.8, 1.8, 7.6, 14).rotateX(Math.PI / 2).translate(10, 0, 4.2), mat(C.bronzeHi), 40));
  const oldWheel = wheel(RW, 24, 3, C.bronze, { depth: GEARS.pin.d }); add(oldWheel);
  oldWheel.userData.spin.add(finish(new THREE.CylinderGeometry(1.8, 1.8, 7.6, 14).rotateX(Math.PI / 2).translate(10, 0, 4.2), mat(C.bronzeHi), 40));
  // feuilles de papier : bande cintrée (recto blanc, verso bleuté), contour, sillage ondulé
  const NT = 10, frontM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9, side: THREE.FrontSide }), backM = new THREE.MeshStandardMaterial({ color: '#bcd0f4', roughness: .9, side: THREE.BackSide });
  const lineM = new THREE.LineBasicMaterial({ color: 0x3e63dd, transparent: true, opacity: .8 }), trailM = new THREE.LineBasicMaterial({ color: 0x3e63dd, transparent: true, opacity: .45 });
  const sheets = SHEETS.map((q) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((NT + 1) * 2 * 3), 3));
    const idx = []; for (let i = 0; i < NT; i++) { const a0 = i * 2, a1 = a0 + 1, b0 = a0 + 2, b1 = a0 + 3; idx.push(a0, b1, b0, a0, a1, b1); }                // le passage figure → scène inverse l'orientation geo.setIndex(idx);
    const fm = new THREE.Mesh(geo, frontM), bm = new THREE.Mesh(geo, backM); fm.castShadow = true;
    const og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((2 * (NT + 1) + 1) * 3), 3)); const ol = new THREE.Line(og, lineM);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(10 * 3), 3)); const tl = new THREE.Line(tg, trailM);
    const stampM = q.stamps ? new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: C.ok, side: THREE.DoubleSide, transparent: true, opacity: .55 })) : null;
    const mark = q.mark || q.kind === 'test' ? new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: q.mark ? C.fixed : '#8fb0ee', side: THREE.DoubleSide })) : null;
    const grp = group(fm, bm, ol, tl, mark, stampM); add(grp);
    return { q, grp, geo, og, tg, tl, mark, stampM };
  });
  const V = (p) => [p[0], p[2], p[1]];                                                    // repère de figure → scène
  function placeSheet(S, s) {
    const p = sheetPose(S.q, s); S.grp.visible = !!p; if (!p) return;
    const rows = sheetRows(p, NT), pos = S.geo.attributes.position.array, opos = S.og.attributes.position.array;
    if (rows.length < 2) { S.grp.visible = false; return; }                // entièrement entrée dans une fente
    for (let i = 0; i <= NT; i++) { const r = rows[Math.min(i, rows.length - 1)]; pos.set(V(r[0]), i * 6); pos.set(V(r[1]), i * 6 + 3); }
    const ring = rows.map((r) => r[0]).concat(rows.map((r) => r[1]).reverse(), [rows[0][0]]);
    for (let i = 0; i < 2 * (NT + 1) + 1; i++) opos.set(V(ring[Math.min(i, ring.length - 1)]), i * 3);
    S.geo.attributes.position.needsUpdate = true; S.geo.computeVertexNormals(); S.geo.computeBoundingSphere(); S.og.attributes.position.needsUpdate = true; S.og.computeBoundingSphere();
    if (S.mark) { const r0 = rows[0], r1 = rows[1], k = .32, m = (a, b) => a.map((v, j) => v + (b[j] - v) * k); S.mark.geometry.setFromPoints([r0[0], r1[0], m(r1[0], r1[1]), r0[0], m(r1[0], r1[1]), m(r0[0], r0[1])].map((v) => new THREE.Vector3(...V(v)))); }
    if (S.stampM) { const k = stampOf(S.q, s); S.stampM.visible = !!k && rows.length > 7;
      if (S.stampM.visible) { S.stampM.material.color.set(k === 'ok' ? C.ok : k === 'bad' ? C.bad : C.fixed); const m = (r, kk) => r[0].map((v, j) => v + (r[1][j] - v) * kk + p.n[j] * .08), a0 = m(rows[4], .3), a1 = m(rows[4], .72), b1 = m(rows[7], .72), b0 = m(rows[7], .3); S.stampM.geometry.setFromPoints([a0, b0, b1, a0, b1, a1].map((v) => new THREE.Vector3(...V(v)))); } }
    const tr = sheetTrail(S.q, s); S.tl.visible = !!tr;
    if (tr) { const tp = S.tg.attributes.position.array; tr.pts.slice(-10).forEach((v, i) => { const w = 1.2 * Math.sin(i * 1.9 - s * 11) * Math.sin(Math.PI * i / 9); tp.set(V([v[0], v[1], v[2] + w]), i * 3); }); S.tg.attributes.position.needsUpdate = true; S.tg.computeBoundingSphere(); S.tl.material.opacity = .5 * tr.fade; }
  }

  function paintDial(o) {
    const { ctx, px, tex } = dial, k = px / 2 / 22.5, c0 = px / 2;
    ctx.fillStyle = '#fbfaf6'; ctx.fillRect(0, 0, px, px);
    ctx.strokeStyle = '#8a8a8f'; ctx.lineWidth = 1;
    for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU, r0 = i % 3 ? 20.6 : 19.2; ctx.beginPath(); ctx.moveTo(c0 + r0 * k * Math.cos(a), c0 + r0 * k * Math.sin(a)); ctx.lineTo(c0 + 22.4 * k * Math.cos(a), c0 + 22.4 * k * Math.sin(a)); ctx.stroke(); }
    const sp = (s) => { const a = s * DIAL.turns * TAU - Math.PI / 2, r = DIAL.r0 + (DIAL.r1 - DIAL.r0) * s; return [c0 + r * k * Math.cos(a), c0 + r * k * Math.sin(a)]; };
    ctx.strokeStyle = '#26262a'; ctx.lineWidth = 1.3; ctx.beginPath(); for (let i = 0; i <= 160; i++) { const [x, y] = sp(i / 160); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    CELLS.forEach((s, i) => { const [x, y] = sp(s); ctx.fillStyle = ['#fbfaf6', C.ok, C.bad, C.fixed, '#dbe6fb'][o.cells[i]]; ctx.strokeStyle = o.cells[i] === 4 ? C.prop : '#8a8a8f'; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.strokeRect(x - 6, y - 6, 12, 12); });
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
  let lastDial = '', lastVer = -1, lastCut = -1, lastGauge = '';
  function update(time) {
    const s = ((time % LOOP_T) + LOOP_T) % LOOP_T, o = stateAt(s), sp = (w, a, k) => { w.userData.spin.rotation.z = -a + (PH[k] ?? 0); };
    sp(wB1, o.b1, 'b1'); sp(wCrank, o.crank, 'crank'); sp(wIdle, o.idle, 'idle'); sp(wP2, o.p2, 'p2'); sp(wPin, o.pin, 'pin'); sp(wSlot, o.slot, 'pin'); sp(wP3, o.p3, 'p3'); sp(wD46, o.d46, 'd46'); sp(wO20, o.o20, 'o20');
    rings.forEach((w, i) => sp(w, o.corpus[i], i ? '' : 'corpus'));
    crank.rotation.z = -o.crank + PH.crank;
    lamps.forEach((m, i) => { m.material = o.lamps[i] ? lampOn[i] : lampOff; });
    okLamp.material = o.accord ? okOn : okOff;
    const key = o.cells.join('') + Math.round(o.spiral * 400); if (key !== lastDial) { lastDial = key; paintDial(o); }
    if (o.version !== lastVer) { lastVer = o.version; paintVer(o.version); }
    // fiche : descend dans la fente
    // la roue du modèle : à sa place, ou en train de sortir par la trappe (l'ancienne) ou d'y descendre (la candidate)
    const pc = pinInCase(o); wPin.visible = !!pc; if (pc) wPin.position.y = pc.z;
    seal.visible = o.sealed;
    // machine à diviser : axe nu, flan pressé, roue taillée et indexée ; couteau ; banc d'essai ; levier
    const onDiv = o.blank > 0 && !(o.newFly > 0);
    blank.visible = onDiv && o.blank < 1; blank.scale.set(.55 + .45 * o.blank, 1, .55 + .45 * o.blank);
    cutWheel.visible = onDiv && o.blank >= 1; candPeg.visible = o.peg; arbor.visible = !onDiv;
    if (o.cut !== lastCut) { lastCut = o.cut; cutWheel.geometry = wheelGeo[o.cut]; cutEdges.geometry.dispose(); cutEdges.geometry = new THREE.EdgesGeometry(wheelGeo[o.cut], 28); }
    cutWheel.rotation.y = -o.index;
    carriage.position.set(DIV.x - RW - 6 + o.cutter * 4.5, 0, 0); cutter.rotation.z = o.cutter > 0 ? s * 14 : 0;
    const gk = o.f1.toFixed(2) + o.u1.toFixed(2); if (gk !== lastGauge) { lastGauge = gk; paintGauge(o.f1, o.u1); }
    gLamp.material = o.pass ? okOn : okOff;
    lever.rotation.x = o.lever * 1.2;
    // roues en vol
    const nw = newInFlight(o); newWheel.visible = !!nw;
    if (nw) { const n = [0, -Math.sin(nw.alpha), Math.cos(nw.alpha)]; at(newWheel, nw.c[0] + n[0] * 3, nw.c[1] + n[1] * 3, nw.c[2] + n[2] * 3); newWheel.rotation.x = -(Math.PI / 2 + nw.alpha); newWheel.userData.spin.rotation.z = s * 1.6; }
    const ol = oldInFlight(o); oldWheel.visible = !!ol;
    if (ol) { at(oldWheel, ol.c[0], ol.c[1] + 3, ol.c[2]); oldWheel.userData.spin.rotation.z = -o.pin + PH.pin + o.oldFly * 3; }
    boardGears[2].visible = o.oldFly >= 1; boardGears[3].visible = false;
    sheets.forEach((S) => placeSheet(S, s));
    const hd = handAt(s); handH.visible = !!hd; spark.visible = !!hd && hd.press > 0.35;
    if (hd) at(handH, ...hd.tip);
    if (spark.visible) { at(spark, ...hd.tip); spark.scale.setScalar(.8 + 2 * hd.press); sparkM.color.set(hd.kind === 'ok' ? '#c9f5d6' : hd.kind === 'bad' ? '#ffc7bd' : '#ffe2a6'); sparkM.opacity = .5 + .5 * hd.press; }
  }
  update(0);
  return { group: g, update, controls: { label: 'Étape', min: 1, max: 9, step: 1, fmt: (v) => v + ' · ' + STATIONS[v - 1], get: (t) => stationAt(((t % LOOP_T) + LOOP_T) % LOOP_T) + 1, seek: (v) => TS[v - 1] + 1.5 } };
}
function gearShapeGeo(r, n, depth, T) { const geo = new THREE.ExtrudeGeometry(gearShape(r, n, depth), { depth: T, bevelEnabled: false, curveSegments: 12 }); geo.translate(0, 0, -T / 2); return geo; }
