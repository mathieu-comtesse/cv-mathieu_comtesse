// Fig 11 · Lecteur VRE : la boîte à musique, en 3D (cotes et modèle partagés avec la figure : ./musicbox-model.js).
// Un boîtier de bois ouvert à l'avant, couvercle dressé. Le modèle est un cylindre à picots : il tourne, ses picots pincent les lamelles du peigne
// (une couleur par champ) et l'étouffoir, c'est-à-dire les règles métiers, coupe les notes impossibles. Douze cases proposent les pages inédites,
// l'agent valide chacune sur la table lumineuse, le corpus figé sert à planter les picots d'un cylindre neuf, le banc d'essai le juge,
// le levier le publie : l'ancien cylindre rejoint l'étagère des versions, le nouveau descend dans le boîtier. 46 dents mènent 20 dents : × 2,3.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, cylY, group, bench, finish } from './core.js';
import { TAU, CASE, CYL, GEARS, GEAR_X, phases, NT as NTEETH, tx, TOOTH, IMPOSSIBLE, PINS3, PINS4, PLANT, NEWPINS, CELLS, FACIA, cellX, TRAY, DECK, READER, READ_SLOT, EXIT, DIV, BLANK, GAUGE, LEVER, BOARD, T, LOOP_T, TS, STATIONS, stationAt, SHEETS, sheetPose, sheetRows, sheetTrail, stateAt, cylInCase, newInFlight, oldInFlight, handAt, stampOf, DESK, AGENT } from './musicbox-model.js';

export const WIDTH = 340;
const PLATE = { x: -128, y: -64, w: 340, d: 150, r: 12 };
const PH = phases(true);
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

/* un cylindre à picots (axe x, centré sur l'origine du groupe) : corps, flasques, tourillons, picots qui tournent avec lui */
const pinGeo = new THREE.CylinderGeometry(.42, .42, 1.8, 8), headGeo = new THREE.SphereGeometry(.7, 10, 8);
function makeCylinder(list, { marks = false, color = C.bronzeHi } = {}) {
  const g = new THREE.Group(), len = CYL.x1 - CYL.x0, r = CYL.r, h = len / 2, spin = new THREE.Group(); g.add(spin);
  g.add(finish(new THREE.CylinderGeometry(r, r, len, 56).rotateZ(Math.PI / 2), mat(color, { roughness: .5, metalness: 0 }), 40));
  for (const sg of [-1, 1]) {
    g.add(finish(new THREE.CylinderGeometry(r + .5, r + .5, 1.4, 56).rotateZ(Math.PI / 2).translate(sg * (h - .7), 0, 0), mat(C.steelLo, { roughness: .5 }), 40));
    g.add(finish(new THREE.CylinderGeometry(1.6, 1.6, 4, 14).rotateZ(Math.PI / 2).translate(sg * (h + 2), 0, 0), mat(C.bronzeLo), 40));
  }
  const pm = mat('#2a2a2e', { roughness: .4 }), nm = mat(C.fixed, { roughness: .4 }), newSet = new Set(NEWPINS.map(([i, a]) => i + ':' + a)), pins = [];
  for (const { i, an } of list) {
    const m = marks && newSet.has(i + ':' + an) ? nm : pm, p = new THREE.Group(), s = new THREE.Mesh(pinGeo, m), hd = new THREE.Mesh(headGeo, m);
    s.position.y = r + .9; hd.position.y = r + 1.8; p.add(s, hd); p.position.x = tx(i) - CYL.xc; p.rotation.x = Math.PI / 2 - an;   // un picot posé à l angle an
    spin.add(p); pins.push(p);
  }
  g.userData = { spin, pins };
  return g;
}

export function build() {
  const g = new THREE.Group();
  const add = (...o) => o.forEach((m) => g.add(m));
  add(bench(PLATE, { strip: { x: -112, y: PLATE.y + PLATE.d - 12, w: 120, d: 7 }, label: { x: 30, y: PLATE.y + PLATE.d - 14, w: 50, d: 10 }, plateH: 14, footH: 7 }));
  const W = (c, o) => mat(c, { roughness: .78, ...o }), { x0, x1, y0, y1, h, t } = CASE;
  const wbox = (cx, cy, cz, w, d, hh, c = C.wood) => { const m = finish(new THREE.BoxGeometry(w, hh, d), W(c), 30); m.position.set(cx, cz, cy); return m; };
  const dark = '#3a332a';
  // ---- boîtier de bois ouvert à l'avant : socle mouluré sur pieds, plancher, fond, flancs, plateau du lecteur, couvercle dressé derrière ----
  for (const [x, y] of [[x0 - 1, y0 - 1], [x1 + 1, y0 - 1], [x0 - 1, y1 + 1], [x1 + 1, y1 + 1]]) add(cyl(x, y, 2.6, 0, 2, C.bronzeLo, 16));
  add(slab(x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 10, 2, 3, C.woodDk, 1.2), slab(x0 - 3.5, y0 - 3.5, x1 - x0 + 7, y1 - y0 + 7, 5, 2, C.woodLo, 1));
  add(wbox((x0 + x1) / 2, (y0 + t + y1) / 2, 7.6, x1 - x0 - 2 * t, y1 - y0 - t, 1.2, C.woodDk));
  add(wbox((x0 + x1) / 2, y0 + t / 2, 7 + (h - 7) / 2, x1 - x0, t, h - 7, C.woodLo));
  add(wbox(x0 + t / 2, (y0 + y1) / 2, 7 + (h - 7) / 2, t, y1 - y0, h - 7), wbox(x1 - t / 2, (y0 + y1) / 2, 7 + (h - 7) / 2, t, y1 - y0, h - 7));
  add(wbox((DECK.x0 + DECK.x1) / 2, (y0 + y1) / 2, h + DECK.h / 2, DECK.x1 - DECK.x0 + 3, y1 - y0 + 6, DECK.h, C.wood));
  add(wbox((x0 + x1) / 2, y0 - 4, h + 28, x1 - x0 + 6, 4, 56, C.woodLo), box((x0 + x1) / 2, y0 - 1.8, h + 28, 44, .6, 18, C.bronze));
  for (const x of [-50, 56]) add(cylX(x - 6, x + 6, y0 - 2, h, 1.6, C.steelLo, 14));
  // lecteur : bloc d'acier sur le plateau, fente d'entrée entre deux lèvres de laiton
  const rx = (READER.x0 + READER.x1) / 2, ry = (READER.y0 + READER.y1) / 2;
  add(box(rx, ry, (READER.z0 + READER.z1) / 2, READER.x1 - READER.x0, READER.y1 - READER.y0, READER.z1 - READER.z0, C.steel));
  add(box(READ_SLOT[0], READ_SLOT[1], READER.z1 + .6, 17, 5.2, 1.2, C.bronze), box(READ_SLOT[0], READ_SLOT[1], READER.z1 + 1.25, 13.2, 1.8, .2, dark));
  // tête de lecture sous le plateau : bloc d'acier, vitre sombre, objectif dont le voyant s'allume pendant la lecture
  add(box(65, (y0 + t + 1 - 30) / 2, 33, 22, -30 - (y0 + t + 1), 50, C.steel), box(65, -30.05, 37, 16, .2, 14, dark));
  const lens = cylY(-30.1, -29.6, 65, 37, 2.6, '#cfcdc4', 20); add(lens);
  const okOn = new THREE.MeshStandardMaterial({ color: C.ok, emissive: C.ok, emissiveIntensity: .9 }), okOff = lens.material;
  // paliers du cylindre ; arbre d'entraînement qui vient de la roue du flanc gauche ; peigne : pieds, socle d'acier, lamelles ; montants de l'étouffoir
  add(box(CYL.x0 - 3.5, CYL.y, (7 + CYL.z - 1.6) / 2, 5, 8, CYL.z - 8.6, C.steel), box(CYL.x1 + 2.5, CYL.y, (7 + CYL.z - 1.6) / 2, 4, 8, CYL.z - 8.6, C.steel));
  add(cylX(GEAR_X, CYL.x0 - 3.5, CYL.y, CYL.z, 1.8, C.bronzeLo, 14));
  const bz = TOOTH.z - 4;
  for (const xx of [CYL.x0 - .25, CYL.x1 + .25]) add(box(xx, TOOTH.y0 + 2.25, (7 + bz) / 2, 3.5, 4.5, bz - 7, C.steel));
  add(box(CYL.xc, TOOTH.y0 + 2.25, bz + 2.9, CYL.x1 - CYL.x0 + 4, 4.5, 5.8, C.steel));
  for (const xx of [CYL.x0 - 1.6, CYL.x1 + 1.9]) add(box(xx, TOOTH.y0 + 1, bz + 11.8, 1.8, 2, 12, C.steel));
  const teeth = Array.from({ length: NTEETH }, (_, i) => {
    const col = C.f[(i / 3) | 0], m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0, roughness: .5 }), len = TOOTH.y0 - TOOTH.tip;
    const mesh = finish(new THREE.BoxGeometry(TOOTH.w, .8, len), m, 20); at(mesh, tx(i), (TOOTH.tip + TOOTH.y0) / 2, TOOTH.z); add(mesh); return { mesh, m, col };
  });
  const felt = mat('#c9b26a', { roughness: .9 }), grey = '#7a7a76';
  const damper = new THREE.Group(); add(damper);
  damper.add(box(CYL.xc, -11.5, 1, CYL.x1 - CYL.x0 + 2, 3, 2, C.steel), box(CYL.x0 - 1.6, -8.5, 1, 1.8, 9, 2, C.steel), box(CYL.x1 + 1.9, -8.5, 1, 1.8, 9, 2, C.steel));
  for (const i of IMPOSSIBLE) damper.add(at(finish(new THREE.BoxGeometry(3, 1.1, 3), felt, 10), tx(i), -11.5, -.1));
  // douze cases au bas du devant du boîtier : une par page inédite ; flanc droit : bouche de sortie des pages et plaque du gain
  add(wbox((x0 + x1) / 2, y1 + 1, (FACIA.z0 + FACIA.z1) / 2, x1 - x0 + 6, 4, FACIA.z1 - FACIA.z0, C.wood));
  const cells = CELLS.map((_, i) => { const m = new THREE.MeshStandardMaterial({ color: '#fbfaf6', roughness: .6 }), c = new THREE.Mesh(new THREE.BoxGeometry(6, 4.4, .4), m); at(c, cellX(i), FACIA.y + .15, FACIA.z0 + 4.4); add(c); return m; });
  add(box(x1 + 4, EXIT[1], EXIT[2], 8, 22, 12, C.steel), box(EXIT[0] + .08, EXIT[1], EXIT[2], .2, 18, 7, dark));
  { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#8a8a8f'; x.lineWidth = 4; x.strokeRect(4, 4, 248, 120);
    x.fillStyle = '#26262a'; x.font = 'bold 54px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('46 : 20', 128, 68);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const pl = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), new THREE.MeshStandardMaterial({ map: tex, roughness: .7 })); pl.rotation.y = Math.PI / 2; at(pl, x1 + .1, -25, 24); add(pl); }
  // train du gain, sur la face intérieure du flanc gauche : la roue de 46 dents mène la roue de 20 dents du cylindre ; la manivelle suit
  const gearAt = (key, o = {}) => { const q = GEARS[key], w = wheel(q.r, q.n, o.T ?? (q.r > 12 ? 3 : 2.2), C.bronze, { depth: q.d, ...o }), p = new THREE.Group(); p.add(w); p.rotation.y = Math.PI / 2; at(p, GEAR_X, -q.u, q.z); add(p); return w; };
  const wD46 = gearAt('d46'), wO20 = gearAt('o20');
  wD46.userData.spin.add(finish(new THREE.BoxGeometry(12, 2.2, 1.2).translate(6, 0, 5), mat(C.bronzeLo), 30), finish(new THREE.CylinderGeometry(2.2, 2.2, 3.4, 16).rotateX(Math.PI / 2).translate(12, 0, 5.4), W(C.woodDk), 40));
  const hand = finish(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 7, 0), new THREE.Vector3(1, 0, 0)]).setIndex([0, 2, 1]), mat('#1d2230', { side: THREE.DoubleSide }), 0);
  hand.position.z = 2.8; wO20.userData.spin.add(hand);
  // ---- les cylindres : le courant (v3), le neuf (v4), deux de l'étagère ----
  const L3 = PINS3.flatMap((a, i) => a.map((an) => ({ i, an }))), cylA = makeCylinder(L3), cylB = makeCylinder(PLANT, { marks: true }), rack = [0, 1].map((k) => { const c = makeCylinder(L3); c.userData.spin.rotation.x = .5 + k * 1.1; return c; });
  add(cylA, cylB, ...rack);
  // ---- établi : plateau des fiches, boîte du corpus, outils ----
  add(slab(TRAY.x - 24, TRAY.y - 18, 48, 36, 0, 3, C.woodLo, 1));
  for (let i = 0; i < 7; i++) add(box(TRAY.x - 10 + (i % 2) * .6, TRAY.y, 3.5 + i * 1.1, 18, 23, 1, C.paper));
  C.f.forEach((c, i) => add(box(TRAY.x - 16 + [11, 7, 13, 9][i] / 2, TRAY.y - 8 + i * 4.5, 3 + 7 * 1.1 + .1, [11, 7, 13, 9][i], 1.1, .1, c)));
  add(slab(TRAY.x + 3, TRAY.y - 14, 19, 28, 3, 11, C.wood, 1));
  C.r.forEach((c, i) => add(box(TRAY.x + 6.2 + i * 5.6, TRAY.y, 15.5 + i * .3, 2.4, 22, 3 + i * .6, c)));
  const seal = cylY(TRAY.y + 14, TRAY.y + 14.8, TRAY.x + 12.5, 8.5, 2.6, '#a8392b', 20); add(seal);
  add(slab(-122, -10, 40, 28, 0, .4, C.paper, .6));
  add(box(-45, 57, 1.2, 22, 14, 2.4, C.woodLo));
  for (let i = 0; i < 14; i++) add(cyl(-53 + (i % 5) * 4.2, 53 + Math.floor(i / 5) * 4, .35, 2.4, 1.6, '#2a2a2e', 6));
  add(cyl(-70, 66, 5, 0, 5, C.bronze, 24), cyl(-70, 66, 3.2, 5, 2, C.bronze, 20), cyl(36, 64, 5, 0, 2.4, C.steelLo, 28), cyl(36, 64, 3.8, 2.4, .2, '#d8eef2', 28));
  add(box(-1, 53.5, .7, 22, 3, 1.4, C.steelLo), box(16, 53.5, 1.1, 12, 3.8, 2.2, C.woodDk));
  // ---- table lumineuse « Radiographie » et main de l'agent (manche, poignet, paume, quatre doigts, pouce, tampon) ----
  add(slab(DESK.x0, DESK.y0, DESK.x1 - DESK.x0, DESK.y1 - DESK.y0, 0, DESK.z - 1, C.wood, 1.2));
  add(at(new THREE.Mesh(new THREE.BoxGeometry(DESK.x1 - DESK.x0 - 3.2, 1, DESK.y1 - DESK.y0 - 3.2), new THREE.MeshStandardMaterial({ color: '#eef5ff', emissive: '#ffffff', emissiveIntensity: .15, roughness: .6 })), (DESK.x0 + DESK.x1) / 2, (DESK.y0 + DESK.y1) / 2, DESK.z - .5));
  // la main de l'agent : la main détourée de la fresque, un vrai plan à plat dans l'espace 3D (recto verso), le bout de l'index à l'origine
  const handH = new THREE.Group(); add(handH);
  { const tex = new THREE.TextureLoader().load('assets/figures/main-agent.webp'); tex.colorSpace = THREE.SRGBColorSpace;
    const { w, h: hh, tip, k } = AGENT, g = new THREE.PlaneGeometry(w * k, hh * k);
    g.translate((w / 2 - tip[0]) * k, (tip[1] - hh / 2) * k, 0);
    const ex = new THREE.Vector3(.7, .7, .15).normalize(), ez = new THREE.Vector3(.45, .5, .7), ey = new THREE.Vector3();
    ez.sub(ex.clone().multiplyScalar(ez.dot(ex))).normalize(); ey.crossVectors(ez, ex);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .4, side: THREE.DoubleSide }));
    m.matrixAutoUpdate = false; m.matrix.makeBasis(ex, ey, ez); handH.add(m); }
  const sparkM = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true }), spark = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), sparkM); add(spark);
  // ---- machine à planter les picots : berceaux, portique et chariot à aiguille ; banc d'essai ; levier de publication ----
  const topZ = BLANK.z + CYL.r;
  add(slab(DIV.x - 54, DIV.y - 24, 108, 50, 0, 2, C.steelLo, 1), slab(DIV.x - 52, DIV.y - 22, 104, 46, 2, 4, C.steel, 1.4));
  for (const dx of [-36, 36]) add(box(DIV.x + dx, DIV.y, (6 + BLANK.z - CYL.r) / 2 + 3, 8, 18, BLANK.z - CYL.r - 6, C.steel));
  for (const dx of [-50.5, 50.5]) add(box(DIV.x + dx, DIV.y - 19, (6 + topZ - 2) / 2 + 3, 3, 4, topZ - 8, C.steel));
  add(box(DIV.x, DIV.y - 19, topZ + 7.5, 104, 4, 3, C.steel));
  const carriage = new THREE.Group(); add(carriage);
  carriage.add(box(0, DIV.y - 19, topZ + 11, 7, 6, 4, C.steel), box(0, DIV.y - 7.6, topZ + 12.6, 3, 17, 2.2, C.steel));
  const needle = box(0, DIV.y, 0, 1, 1, 1, C.steelLo); add(needle);
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
  // ---- étagère des versions : planche, socle, un berceau par cylindre, une étiquette par emplacement ----
  add(wbox((BOARD.x0 + BOARD.x1) / 2, BOARD.y + 1.5, 4 + (BOARD.z1 - 4) / 2, BOARD.x1 - BOARD.x0, 3, BOARD.z1 - 4, C.woodLo));
  add(slab(BOARD.x0 - 3, BOARD.y - 3, BOARD.x1 - BOARD.x0 + 6, 15, 0, 4, C.woodLo, 1), wbox((BOARD.x0 + BOARD.x1) / 2, BOARD.y + 1.5, BOARD.z1 + 1.5, BOARD.x1 - BOARD.x0 + 2, 7, 3, C.woodLo));
  BOARD.slots.forEach(([u, z]) => { for (const dx of [-42, 36]) add(box(u + dx + 3, (BOARD.y + 3 + BOARD.cy + 5) / 2, z - CYL.r - 1, 6, BOARD.cy + 5 - BOARD.y - 3, 2, C.woodDk)); add(box(BOARD.x1 - 5, BOARD.y + 3.2, z, 6, .4, 4.2, C.paper)); });
  rack.forEach((c, i) => at(c, BOARD.slots[i][0], BOARD.cy, BOARD.slots[i][1]));
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
  const cellCol = ['#fbfaf6', C.ok, C.bad, C.fixed, '#dbe6fb'];
  let lastCells = '', lastGauge = '';
  const setPins = (c, n) => c.userData.pins.forEach((p, i) => { p.visible = i < n; });
  function update(time) {
    const s = ((time % LOOP_T) + LOOP_T) % LOOP_T, o = stateAt(s), cc = cylInCase(o), ol = oldInFlight(o), nw = newInFlight(o);
    // engrenages et manivelle : un tour de manivelle, 2,3 tours de cylindre
    const sp = (w, a, k) => { w.userData.spin.rotation.z = -a + (PH[k] ?? 0); };
    sp(wD46, o.d46, 'd46'); sp(wO20, o.o20, 'o20');
    // cylindre courant (v3) : dans le boîtier, puis il monte, vole et se pose sur l'étagère ; cylindre neuf (v4) : sur la machine, en vol, puis dans le boîtier
    const slot = BOARD.slots[2];
    cylA.visible = true;
    if (!o.swap && o.version === 3) { at(cylA, ...[CYL.xc, CYL.y, CYL.z]); cylA.userData.spin.rotation.x = o.cyl; }
    else if (cc && cc.which === 'old') { at(cylA, ...cc.c); cylA.userData.spin.rotation.x = o.cyl; }
    else if (ol) { at(cylA, ...ol.c); cylA.userData.spin.rotation.x = o.cyl + o.oldFly * 2; }
    else { at(cylA, slot[0], BOARD.cy, slot[1]); cylA.userData.spin.rotation.x = .9; }
    const BC = [BLANK.x, BLANK.y, BLANK.z], onDiv = o.blank && !(o.newFly > 0);
    cylB.visible = onDiv || !!nw || (cc && cc.which === 'new') || (o.version === 4 && !o.swap);
    if (onDiv) { at(cylB, ...BC); setPins(cylB, o.planted); cylB.userData.spin.rotation.x = o.divRot - Math.PI / 2; }
    else {
      setPins(cylB, PLANT.length);
      const rotEnd = PLANT[PLANT.length - 1].an - Math.PI / 2;
      if (nw) { at(cylB, ...nw.c); cylB.userData.spin.rotation.x = lerp(rotEnd, .3, o.newFly); }
      else if (cc && cc.which === 'new') { at(cylB, ...cc.c); cylB.userData.spin.rotation.x = .3; }
      else { at(cylB, CYL.xc, CYL.y, CYL.z); cylB.userData.spin.rotation.x = o.cyl; }
    }
    // lamelles pincées, étouffoir des règles métiers
    teeth.forEach((q, i) => { const mute = IMPOSSIBLE.includes(i) && o.damp > .5; q.m.color.set(mute ? grey : q.col); q.m.emissive.set(mute ? '#000000' : q.col); q.m.emissiveIntensity = o.pluck[i] * .9; });
    damper.position.y = lerp(53, TOOTH.z + 1.3, o.damp);
    lens.material = (s > T.read[0] && s < T.read[1] + 1) || (s > 45 && s < 48) ? okOn : okOff;
    const ck = o.cells.join(''); if (ck !== lastCells) { lastCells = ck; cells.forEach((m, i) => m.color.set(cellCol[o.cells[i]])); }
    seal.visible = o.sealed;
    // machine à planter : le chariot suit la piste du prochain picot, l'aiguille descend à chaque pose
    carriage.position.x = BLANK.x + (o.carriage - CYL.xc);
    const tip = lerp(topZ + 7, topZ + .4, o.needle), top = topZ + 10.6; needle.scale.set(1, top - tip, 1); needle.position.set(carriage.position.x, (top + tip) / 2, DIV.y);
    const gk = o.f1.toFixed(2) + o.u1.toFixed(2); if (gk !== lastGauge) { lastGauge = gk; paintGauge(o.f1, o.u1); }
    gLamp.material = o.pass ? okOn : okOff;
    lever.rotation.x = o.lever * 1.2;
    sheets.forEach((S) => placeSheet(S, s));
    const hd = handAt(s); handH.visible = !!hd; spark.visible = !!hd && hd.press > 0.35;
    if (hd) at(handH, ...hd.tip);
    if (spark.visible) { at(spark, ...hd.tip); spark.scale.setScalar(.8 + 2 * hd.press); sparkM.color.set(hd.kind === 'ok' ? '#c9f5d6' : hd.kind === 'bad' ? '#ffc7bd' : '#ffe2a6'); sparkM.opacity = .5 + .5 * hd.press; }
  }
  update(0);
  return { group: g, update, controls: { label: 'Étape', min: 1, max: 9, step: 1, fmt: (v) => v + ' · ' + STATIONS[v - 1], get: (t) => stationAt(((t % LOOP_T) + LOOP_T) % LOOP_T) + 1, seek: (v) => TS[v - 1] + 1.5 } };
}
