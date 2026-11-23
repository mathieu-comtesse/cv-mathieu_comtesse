// papercraft / templates / popup-3d / scene.js: the countryside WORKED EXAMPLE scene. Replace this file with your own world:
// your palette, your printed ground, YOUR pieces (designed with references/procedural-art.md and mechanisms.md, not the
// countryside examples recoloured), your landmarks and built ground, your fill, your hero. Keep harness.js as it is.
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, layeredCard, clusterLayout, platform } from 'papercraft/lib/paperkit-3d.js';
import * as EX from 'papercraft/examples/countryside.js';
import { boxHouse, bridge } from 'papercraft/examples/built-ground.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { createHarness } from './harness.js';

// ---- 1. palette: THIS WORLD'S ONLY (autumn countryside: warm orange / rust / ochre lead; sage, teal and cream
// accents). Do not start from these hexes: derive your own from your brief (references/palettes.md section 3) ------
const C = {
  ground: '#cfc4a1', wash: '#a8ae84', washWarm: '#d4cba6', path: '#f3e6c6', river: '#46aa9e', riverDeep: '#2e8079', foam: '#f6ecd4',
  field: '#d6b86c', leafA: '#e0852c', leafB: '#c9542b', leafC: '#d9a03a', pine: '#62803f', bush: '#3f8a74', bushB: '#8a9c55',
  hill: '#86a07f', hillB: '#a9b98f',
  trunk: '#74452a', wall: '#ecd4b0', roof: '#c8513b', roofB: '#9c5636', roofC: '#b5683a', window: '#ffc45a', stone: '#b7a386',
  wood: '#a8683a', hay: '#dcb055', ink: '#3a2412', cloak: '#4f6a8a', hat: '#e3b04b', door: '#3f7a70', earth: '#b98a58', turf: '#8f9c4c', meadow: '#b3aa6a',
};
// one diorama: the hero walks anywhere the overview shows (walkArea), the camera drifts a few units with him (camBox),
// and the fill covers every frame that walk can bring (H.inReach), so he never finds bare page
const H = createHarness({ ground: C.ground, view: { pitch: 47, dist: 66, target: [2, 1.5, -6] }, bounds: { x0: -64, x1: 64, z0: -62, z1: 38 }, play: true,
  walkArea: { x0: -18, x1: 22, z0: -24, z1: 7 }, camBox: { x0: -1, x1: 5, z0: -8, z1: -4 } });
const { walk, flags } = H;
let RES = 1;   // print resolution of the fill (popup res): the ring past the overview prints a little coarser
const popup = (pts, paint, o = {}) => H.popup(pts, paint, { res: RES, ...o });

// ---- 2. the printed ground: watercolour washes, torn-paper river, path and fields, marks gathered in drifts ---------
// THIS WORLD'S ground, not a recipe: replace it with your world's own floor and features (deck plates, sand ripples,
// snow drifts, tiles, a lava channel), printed with the same tools; no river unless your world has water.
// Here the river and the path are the leading lines: both curve diagonally through the frame and cross ONCE, at a bridge.
// Each bends ~4 times in view (two sines, ~30 and ~45 units long): one gentle sine reads as a ruler-straight road.
const riverX = (z) => -26.4 - z * 0.8 + Math.sin(z * 0.15) * 3 + Math.sin(z * 0.23 + 2.1) * 2.6;   // top centre -> left edge
const pathX = (z) => 6 + z * 0.7 + Math.sin(z * 0.13 + 1) * 2.4 + Math.sin(z * 0.21 + 0.4) * 2.8;  // bottom right -> the bridge -> top left
const fields = [[22, -24, 12, 8, 0.2], [21, -3, 10, 7, -0.25]];      // x, z, w, d, angle
const POND = { x: pathX(-3) - 9.6, z: -3.4, rx: 6.2, rz: 3.4 };     // a pond by the path with a jetty: the ground stays flat
const inPond = (x, z, k = 1) => ((x - POND.x) / (POND.rx * k)) ** 2 + ((z - POND.z) / (POND.rz * k)) ** 2 < 1;
const pondPts = (k) => Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2, w = 1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5); return [POND.x + Math.cos(a) * POND.rx * k * w, POND.z + Math.sin(a) * POND.rz * k * w]; });
H.printGround(({ g, ppu, X, Z, rnd, washes, torn, band, ribbon, drifts }) => {
  washes([C.wash, C.wash, C.wash, C.washWarm, C.washWarm]);
  for (const [fx, fz, fw, fd, fa] of fields) {                       // field patches: torn ochre paper with furrows
    const ca = Math.cos(fa), sa = Math.sin(fa), corner = ([u, v]) => [fx + u * ca - v * sa, fz + u * sa + v * ca];
    torn([[-fw / 2, -fd / 2], [fw / 2, -fd / 2], [fw / 2, fd / 2], [-fw / 2, fd / 2]].map(corner), P2.rgba(C.field, 0.8));
    g.save(); g.translate(X(fx), Z(fz)); g.rotate(fa);
    g.strokeStyle = P2.rgba(P2.shade(C.field, -0.3), 0.45); g.lineWidth = 0.22 * ppu;
    for (let k = -fd / 2 + 0.7; k < fd / 2 - 0.4; k += 0.9) { g.beginPath(); g.moveTo((-fw / 2 + 0.6) * ppu, k * ppu); g.lineTo((fw / 2 - 0.6) * ppu, (k + 0.2) * ppu); g.stroke(); }
    g.restore();
  }
  // river (THIS world's water: a countryside stream; do not carry it, its torn rim or its ripples into a world whose
  // brief has no water): a torn pale paper border, the turquoise water piece on it, a deeper channel, ripple highlights
  torn(band(riverX, (z) => 3.1 + Math.sin(z * 0.4) * 0.15), '#f2e6c6');
  torn(band(riverX, (z) => 2.55 + Math.sin(z * 0.3 + 1) * 0.2), C.river, 'rgba(250,240,220,0.35)');
  ribbon(riverX, 2.4, P2.rgba(C.riverDeep, 0.55), undefined, undefined, 0.4);
  for (let k = 0; k < 260; k++) {
    const z = H.bounds.z0 + rnd() * (H.bounds.z1 - H.bounds.z0), x = riverX(z) + (rnd() - 0.5) * 3.8, l = (0.6 + rnd() * 1.1) * ppu, pale = k % 3 !== 0;
    g.strokeStyle = pale ? P2.rgba(C.foam, 0.85) : P2.rgba(C.riverDeep, 0.7); g.lineWidth = pale ? 0.12 * ppu : 0.09 * ppu;
    g.beginPath(); g.moveTo(X(x) - l / 2, Z(z)); g.quadraticCurveTo(X(x), Z(z) - 0.12 * ppu, X(x) + l / 2, Z(z)); g.stroke();
  }
  // the pond: a torn pale rim, the water, a deeper middle, ripples and lily pads
  torn(pondPts(1.12), '#f2e6c6'); torn(pondPts(1.0), C.river, 'rgba(250,240,220,0.35)'); torn(pondPts(0.6), P2.rgba(C.riverDeep, 0.5), 'rgba(0,0,0,0)');
  for (let k = 0; k < 70; k++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 0.85, x = POND.x + Math.cos(a) * POND.rx * r, z = POND.z + Math.sin(a) * POND.rz * r, l = (0.4 + rnd() * 0.7) * ppu;
    g.strokeStyle = P2.rgba(C.foam, 0.8); g.lineWidth = 0.1 * ppu; g.beginPath(); g.moveTo(X(x) - l / 2, Z(z)); g.quadraticCurveTo(X(x), Z(z) - 0.1 * ppu, X(x) + l / 2, Z(z)); g.stroke(); }
  for (let k = 0; k < 9; k++) { const a = rnd() * 6.283, r = 0.55 + rnd() * 0.3, x = POND.x + Math.cos(a) * POND.rx * r, z = POND.z + Math.sin(a) * POND.rz * r, rr = (0.35 + rnd() * 0.2) * ppu;
    g.fillStyle = '#5f8a4a'; g.beginPath(); g.moveTo(X(x), Z(z)); g.arc(X(x), Z(z), rr, a, a + 5.6); g.closePath(); g.fill();
    if (k % 3 === 0) { g.fillStyle = '#f3dce0'; g.beginPath(); g.arc(X(x) + rr * 0.3, Z(z) - rr * 0.2, rr * 0.28, 0, 7); g.fill(); } }
  torn(band(pathX, (z) => 1.25 + Math.sin(z * 0.5) * 0.12), C.path); // path: a torn strip of pale paper, a worn centre
  ribbon(pathX, 0.7, P2.rgba('#fbf1d8', 0.45), undefined, undefined, 0.2);
  // the path's edge: a slightly darker, greener fringe just outside it and fine grit inside (a bare pale strip reads
  // as an unprinted gap in the sheet)
  for (const sd of [-1, 1]) ribbon((z) => pathX(z) + sd * (1.47 + Math.sin(z * 0.5) * 0.12), 0.36, P2.rgba(P2.shade(C.turf, -0.15), 0.26), undefined, undefined, 0.15);
  for (let k = 0; k < 2000; k++) {
    const z = H.bounds.z0 + rnd() * (H.bounds.z1 - H.bounds.z0), x = pathX(z) + (rnd() - 0.5) * 2.2, r = (0.05 + rnd() * 0.06) * ppu;
    g.fillStyle = rnd() < 0.6 ? P2.rgba(P2.shade(C.path, -0.3), 0.55) : P2.rgba('#fff6e2', 0.7);
    g.beginPath(); g.ellipse(X(x), Z(z), r * 1.3, r, rnd() * 3, 0, 7); g.fill();
  }
  drifts((x, y) => {                                                  // grass ticks and flowers gathered in drifts
    if (rnd() < 0.75) { g.strokeStyle = P2.rgba(rnd() < 0.5 ? '#6c7c4a' : '#8d9a58', 0.75); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 5 - rnd() * 5); g.stroke(); }
    else { g.fillStyle = rnd() < 0.5 ? '#f3e6c8' : '#c8452d'; for (let q = 0; q < 5; q++) { const t = q / 5 * 6.283; g.beginPath(); g.arc(x + Math.cos(t) * 2.2, y + Math.sin(t) * 2.2, 1.6, 0, 7); g.fill(); } }
  });
});

// ---- 3. the pieces: silhouettes + layered prints (the countryside examples), a few drawn here with fromDrawing -----
// Proportions from the shipped frames: the hero ~8 % of the frame height, trees ~2-2.5x the hero, bushes and rocks
// ~0.5-0.9x the hero, houses ~1.7x. Each kind is a function returning [outline, print].
let rnd = P2.rng(101);                // one seeded stream per section: an edit in one section never reshuffles another
const D = P2.draw2, between = (a, b) => a + rnd() * (b - a);
// slotted crosses (trees, pines) are placed without a yaw: the harness turns them as the source game does
const tuft = (w, h, n) => P2.shape.mound(rnd, { w, h, lobes: n, depth: 0.42 }); // rounded blades: pointed ones read as combs
const dome = (w, h, n = 24) => { const p = [[-w / 2, 0], [w / 2, 0]]; for (let i = 1; i < n; i++) { const a = (i / n) * Math.PI; p.push([Math.cos(a) * w / 2, Math.sin(a) * h]); } return p; };
const mound = (w, h, lobes = 7, depth = 0.18) => P2.shape.mound(rnd, { w, h, lobes, depth }); // flat base: stands on its fold
const peak = (w, h, lean = 0.15) => { const p = [[w / 2, 0]]; for (let i = 1; i < 28; i++) { const t = i / 28, x = w / 2 - t * w, k = Math.min(1, Math.abs(x / (w / 2) - lean)); p.push([x, h * (1 - Math.pow(k, 1.7)) * (0.95 + 0.05 * Math.sin(t * 11))]); } p.push([-w / 2, 0]); return p; };
const stonePrint = (P) => { P.gradient(P2.shade(C.stone, 0.1), P2.shade(C.stone, -0.15), 0.4); P.marks('brick', { color: P2.shade(C.stone, -0.45), alpha: 0.55, size: 0.08 }); P.marks('dot', { color: P2.shade(C.stone, 0.4), alpha: 0.4, size: 0.03, density: 0.4 }); P.innerShade(P2.shade(C.stone, -0.6), { alpha: 0.4, blurPx: 8 }); };
const K = {
  tree: () => { const h = between(7, 9), w = h * between(0.76, 0.86); return [P2.roughen(EX.shape.tree(rnd, { w, h, lobes: 7 + Math.floor(rnd() * 3), canopy: 0.76, trunk: 0.26 }), rnd), EX.paintTree({ leaf: [C.leafA, C.leafB, C.leafC][Math.floor(rnd() * 3)], trunk: C.trunk, ink: C.ink }, { trunkTop: 0.24 })]; },
  pine: () => { const h = between(7.5, 10); return [P2.roughen(EX.shape.pine(rnd, { w: h * 0.6, h }), rnd), EX.paintPine({ leaf: C.pine, trunk: C.trunk, ink: C.ink })]; },
  shrub: () => { const w = between(4, 5); return [P2.roughen(mound(w, w * 0.62, 9, 0.12), rnd), EX.paintBush({ leaf: C.leafB }, { bands: 2 })]; },
  flowers: () => [P2.roughen(mound(6, 2.0, 11, 0.25), rnd), EX.paintBush({ leaf: '#6f8f5a' }, { bands: 0, flowers: true, motifs: false })],
  tuft: () => [tuft(3.4, 2.4, 7), EX.paintBush({ leaf: '#8f9c5c' }, { bands: 2, flowers: false, motifs: false })],
  reeds: () => [tuft(3.0, 3.6, 9), EX.paintBush({ leaf: '#7d8f4f' }, { bands: 1, flowers: false, motifs: false })],
  rock: () => { const w = between(3.6, 5); return [P2.roughen(mound(w, w * 0.55, 4, 0.1), rnd), EX.paintRock({ stone: C.stone, ink: C.ink })]; },
  mushroom: () => [EX.props.mushroom(between(2.0, 2.5)), EX.paintMushroom()],
  stump: () => [P2.fromDrawing((g) => { D.rect(g, -0.45, 0, 0.9, 0.9, 0.05); D.ell(g, 0, 0.9, 0.45, 0.14); D.rect(g, 0.4, 0.5, 0.35, 0.1); }, { w: 1.6, h: 1.1, name: 'stump' }).map(([x, y]) => [x * 1.8, y * 1.8]), EX.paintWood({ wood: '#8a5634' }, { planks: 1 })],
  fox: () => EX.critter.fox(2.2),
  cat: () => EX.critter.cat(1.9, { coat: rnd() < 0.5 ? '#d98a3e' : '#8f8172' }),
  duck: () => EX.critter.duck(1.6),
  hen: () => EX.critter.hen(1.5),
  bench: () => [EX.props.bench(2.0), EX.paintWood({ wood: C.wood })],
  sign: () => [EX.props.signpost(3.2), EX.paintWood({ wood: '#b9844f' }, { planks: 1 })],
  barrel: () => [EX.props.barrel(2.2), EX.paintWood({ wood: '#97552f' }, { planks: 4, vertical: true })],
  fence: () => [EX.shape.fence({ w: 5.4, h: 2.0, pickets: 6 }), EX.paintWood({ wood: '#b07a48' }, { planks: 1 })],
  hay: () => [P2.roughen(dome(3.4, 2.4), rnd), (P) => { P.gradient(P2.shade(C.hay, 0.15), P2.shade(C.hay, -0.18), 0.5); P.marks('hatch', { color: P2.shade(C.hay, -0.4), alpha: 0.4, size: 0.05, angle: 0.5 }); P.marks('hatch', { color: P2.shade(C.hay, 0.35), alpha: 0.35, size: 0.07, angle: -0.4 }); P.innerShade(P2.shade(C.hay, -0.6), { alpha: 0.4, blurPx: 8 }); }],
  well: () => [P2.fromDrawing((g) => { D.rect(g, -0.62, 0, 1.24, 0.62, 0.08); D.rect(g, -0.56, 0.5, 0.1, 0.8); D.rect(g, 0.46, 0.5, 0.1, 0.8); D.poly(g, [[-0.82, 1.2], [0, 1.62], [0.82, 1.2]]); }, { w: 1.7, h: 1.66, name: 'well' }),
    (P) => { const { box, g } = P; stonePrint(P); P.draw(() => { g.fillStyle = C.wood; g.fillRect(box.x0 - 1, box.y0 + box.h * 0.37, box.w + 2, box.h * 0.36); g.fillStyle = C.roof; g.fillRect(box.x0 - 1, box.y0 + box.h * 0.72, box.w + 2, box.h); }); P.marks('scallop', { color: P2.shade(C.roof, -0.35), alpha: 0.6, size: 0.1, region: { ...box, y0: box.y0 + box.h * 0.74 } }); }],
  lamp: () => [P2.fromDrawing((g) => { D.rect(g, -0.07, 0, 0.14, 2.3); D.rect(g, -0.22, 2.2, 0.44, 0.5, 0.06); D.poly(g, [[-0.3, 2.68], [0, 2.95], [0.3, 2.68]]); D.rect(g, -0.25, 0, 0.5, 0.14); }, { w: 0.7, h: 3.0, name: 'lamp' }),
    (P) => { const { box, g } = P; P.fill('#4a3424'); P.draw(() => { g.fillStyle = '#ffd27a'; g.fillRect(box.x0 + box.w * 0.25, box.y0 + box.h * 0.75, box.w * 0.5, box.h * 0.12); }); P.innerShade('#1e120a', { alpha: 0.4, blurPx: 4 }); }],
  boat: () => [P2.fromDrawing((g) => { D.poly(g, [[-0.95, 0.32], [0.95, 0.32], [0.62, 0], [-0.62, 0]]); D.rect(g, -0.04, 0.3, 0.08, 1.25); D.poly(g, [[0.0, 0.46], [0.0, 1.5], [0.72, 0.52]]); }, { w: 2.0, h: 1.6, name: 'boat' }), // the sail touches the mast
    (P) => { const { box, g } = P; P.fill('#f3e6c8'); P.marks('stripe', { color: '#c8452d', alpha: 0.55, size: 0.09 }); P.draw(() => { g.fillStyle = '#a8432e'; g.fillRect(box.x0 - 1, box.y0 - 1, box.w + 2, box.h * 0.2 + 1); g.fillStyle = P2.rgba('#f6ead2', 0.8); g.fillRect(box.x0 - 1, box.y0 + box.h * 0.12, box.w + 2, box.h * 0.025); }); P.innerShade('#4a2410', { alpha: 0.35, blurPx: 6 }); }],
  hill: (k) => [P2.roughen(peak(10 - k * 1.6, 8 - k * 1.8), rnd), EX.paintHill({ ground: P2.shade(C.hill, -0.16 + k * 0.12), accent: '#f3e6c8', ink: C.ink })]   // stepped lighter toward the front,
};
// the shipped bush: a darker scalloped body card and, in front of it, a lighter inner card with the printed sprigs,
// berries and a grass fan at its foot (two cards on one hinge, a soft shadow between them)
function bushStack(x, z, { yaw = 0, scale = 1, sway = 0.6, parent = null, order = null } = {}) {
  const w = between(5.5, 7.5), col = rnd() < 0.55 ? C.bush : C.bushB, inner = P2.mix(col, col === C.bush ? '#efdcae' : '#f2b45a', 0.55);
  const node = layeredCard([
    { pts: P2.roughen(mound(w, w * 0.42, 6, 0.2), rnd), paint: EX.paintBush({ leaf: P2.shade(col, -0.1) }, { bands: 0, motifs: false, grass: false }) },
    { pts: P2.roughen(mound(w * 0.74, w * 0.3, 5, 0.14), rnd), paint: EX.paintBush({ leaf: inner, stem: P2.shade(col, -0.35) }, { bands: 0 }), z: 0.4 },
  ], H.cardOpts(x, z, scale, parent, RES));
  return popup(null, null, { node, height: w * 0.42, x, z, yaw, scale, sway, parent, order });
}
// a nested landform for the MID-ground (the shipped frames get height from nested cards and rocks, never from a raised
// block of terrain): a hillock of n tall curved 'sails', the back one tallest and darkest, each nearer one lower and
// ~12 % lighter, ~0.5 units apart so the gaps read as shadow bands, with a pale crest band; never walked on (a solid)
function hillock(x, z, { w = 4.2, h = 4.6, n = 4, col = C.hill, yaw = 0, lean = 0.2 } = {}) {
  const layers = Array.from({ length: n }, (_, k) => ({
    pts: P2.roughen(peak(w * (1 - k * 0.1), h * (1 - k * 0.18), lean + (k % 2 ? 0.08 : -0.04)), rnd),
    paint: EX.paintHill({ ground: P2.shade(col, -0.2 + k * 0.12), accent: '#f3e6c8', ink: C.ink }), z: k * 0.5 }));
  return popup(null, null, { node: layeredCard(layers.map((L, k) => ({ ...L, pts: L.pts.map(([px, py]) => [px + (k - 1) * w * 0.12, py]) })), H.cardOpts(x, z, 1, null, RES)), height: h, x, z, yaw, solid: w * 0.45 });
}
// a rock outcrop: 3-5 tall slanted cards in a tight cluster, each a lit face and a darker facet turned from the key
const paintSpire = (col) => (P) => {
  const { box } = P;
  P.gradient(P2.shade(col, 0.16), P2.shade(col, -0.08), 0.5); P.felt(0.5);
  P.layer((g) => { g.fillStyle = P2.shade(col, -0.24); g.beginPath(); g.moveTo(box.x0 + box.w * 0.52, box.y1); g.lineTo(box.x1 + 0.1, box.y0 - 0.1); g.lineTo(box.x0 + box.w * 0.42, box.y0 - 0.1); g.closePath(); g.fill(); }, P2.shade(col, -0.24), { lip: 0.7 });
  P.marks('tick', { color: P2.shade(col, -0.4), alpha: 0.35, size: 0.05, angle: 0.9 });
};
function rockOutcrop(x, z, { n = 4, col = '#a07a58', scale = 1 } = {}) {
  for (let k = 0; k < n; k++) {
    const h = (3 + rnd() * 2.2) * scale * (k === 1 ? 1.25 : 1), w = h * (0.42 + rnd() * 0.12);
    popup(peak(w, h, 0.32 + rnd() * 0.2), paintSpire(P2.shade(col, (rnd() - 0.5) * 0.12)), { x: x + (k - (n - 1) / 2) * w * 0.55, z: z + (k % 2) * 0.6 - k * 0.15, yaw: (rnd() - 0.5) * 0.5, solid: w * 0.45 });
  }
}
// keep pieces off the water, the path and the landmarks (distance to the river measured across the curve)
const riverDist = (x, z) => { let d = 1e9; for (let s = -7; s <= 7; s += 0.25) d = Math.min(d, Math.hypot(x - riverX(z + s), s)); return d; };
const pathDist = (x, z) => { let d = 1e9; for (let s = -5; s <= 5; s += 0.25) d = Math.min(d, Math.hypot(x - pathX(z + s), s)); return d; };
const keepOut = [], mark = (x, z, r) => keepOut.push([x, z, r]);
const free = (x, z, m = 0) => riverDist(x, z) > 3.4 + m && pathDist(x, z) > 1.7 + m && keepOut.every(([hx, hz, r]) => Math.hypot(x - hx, z - hz) > r + m);
// what the world's life needs to know (section 6): chimneys, flower beds, creatures and what each one does
const LIFE = { chimneys: [], flowers: [], floaters: [], creatures: [] };
const BEHAVIOUR = { hen: 'peck', fox: 'shy', cat: 'pet' };
// a group: 4-8 DIFFERENT pieces tight together (a door scene may be 2-3), biggest at the back; every member needs room
const BACK_TO_FRONT = ['bush', 'shrub', 'flowers', 'rock', 'fence', 'barrel', 'tuft', 'stump', 'mushroom', 'fox', 'cat', 'hen'];
function group(x, z, kinds, size = 1, ok = free) {
  const rank = (k) => { const i = BACK_TO_FRONT.indexOf(k); return i < 0 ? BACK_TO_FRONT.length : i; };
  kinds = kinds.slice().sort((a, b) => rank(a) - rank(b));
  clusterLayout(x, z, { n: kinds.length, size: size * 5.5, seed: Math.round(x * 13 + z * 7) & 1023 }).forEach((c, i) => {
    if (!ok(c.x, c.z, 0.2)) return;
    if (kinds[i] === 'bush') { bushStack(c.x, c.z, { yaw: c.yaw, scale: c.scale * size }); return; }
    const [pts, paint] = K[kinds[i]]();
    const h = popup(pts, paint, { x: c.x, z: c.z, yaw: c.yaw, scale: c.scale * size, sway: ['shrub', 'tuft', 'reeds', 'flowers'].includes(kinds[i]) ? 0.6 : 0 });
    if (BEHAVIOUR[kinds[i]]) LIFE.creatures.push([h, BEHAVIOUR[kinds[i]]]);
    if (kinds[i] === 'flowers') LIFE.flowers.push([c.x, c.z]);
  });
}
const houseColors = (roof) => ({ wall: C.wall, roof, window: C.window, door: C.door, ink: C.ink });
// the hero: a small 3D PAPER MODEL that reads from every side (it yaws to face the way it walks, so the camera sees
// its front, side and back), designed for this example world: a young gardener. Every body part is a frontal card
// with a profile card standing right BEHIND it (a T, not a cross: from the front no edge line cuts the face; from the
// side the profile shows the depth; slightly different tones, so the build reads as construction): legs and arms on hip
// and shoulder pivots that swing forward and back with the distance walked, the torso, the head (a face in front,
// hair behind), a knitted bobble hat, a basket of greens on the back, a watering can hanging from one hand (it swings
// with that arm, less than the free one). The model faces +z. ~0.4-0.5 of a tree's height.
const heroDoll = () => {
  const g = new H.THREE.Group(), body = new H.THREE.Group(); g.add(body);
  const PROFILE = -Math.PI / 2;                                       // a profile card: its +x points forward (+z)
  const card = ([pts, paint], seed, { x = 0, y = 0, z = 0, ry = 0, parent = body, back = 'mirror' } = {}) => {
    const m = makeCard(pts, { paint, paper: H.paper, thickness: 0.05, edgeWidth: 0.04, pxPerUnit: 64, seed, back, folds: [] });
    m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
  };
  const plain = (c) => (P) => { P.gradient(P2.shade(c, 0.08), P2.shade(c, -0.1), 0.5); P.felt(); P.innerShade(P2.shade(c, -0.5), { alpha: 0.25, blurPx: 8 }); };
  const jacket = '#2f6f8a', jacketSide = '#2a6178', collar = '#efe2c4', hat = '#d9a33a', trousers = '#3c5a3a', skin = '#f1d9b8', hair = '#9a5a2a';
  // legs: a frontal + a profile card per leg, hanging from a hip pivot
  const legs = [-0.12, 0.12].map((x, i) => {
    const hip = new H.THREE.Group(); hip.position.set(x, 0.95, 0); body.add(hip);
    const front = P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(trousers); D.rect(gg, -0.1, 0.18, 0.2, 0.8, 0.05); gg.fillStyle = ink('#4a2a18'); D.rect(gg, -0.12, 0, 0.24, 0.22, 0.07); }, { w: 0.3, h: 1.0, name: 'leg' });
    const side = P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(P2.shade(trousers, -0.08)); D.rect(gg, -0.1, 0.18, 0.2, 0.8, 0.05); gg.fillStyle = ink('#4a2a18'); D.rect(gg, -0.1, 0, 0.3, 0.22, 0.08); }, { w: 0.45, h: 1.0, name: 'leg side' });
    card(front, 310 + i, { y: -0.97, parent: hip }); card(side, 320 + i, { y: -0.97, z: -0.2, ry: PROFILE, parent: hip });
    return hip;
  });
  // the torso: the jacket front (collar, buttons, a pocket) crossed with its side (a seam, a side pocket); a plain back
  const jacketFront = P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(jacket); D.rect(gg, -0.38, 0, 0.76, 1.28, 0.22);
    gg.fillStyle = ink(collar); D.poly(gg, [[-0.26, 1.28], [0.26, 1.28], [0.1, 1.08], [-0.1, 1.08]]);
    gg.fillStyle = ink('#245a72', 'print'); D.rect(gg, -0.3, 0.18, 0.2, 0.2, 0.04); D.rect(gg, -0.38, 0.62, 0.76, 0.04);
    gg.fillStyle = ink('#e8c25a', 'print'); D.ell(gg, 0.04, 0.95, 0.035, 0.035); D.ell(gg, 0.04, 0.75, 0.035, 0.035); D.ell(gg, 0.04, 0.45, 0.035, 0.035);
  }, { w: 0.85, h: 1.3, name: 'jacket' });
  card(jacketFront, 301, { y: 0.78, back: plain(P2.shade(jacket, -0.06)) });
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(jacketSide); D.rect(gg, -0.24, 0, 0.48, 1.24, 0.18);
    gg.fillStyle = ink('#1f5064', 'print'); D.rect(gg, -0.02, 0.05, 0.04, 1.1); D.rect(gg, 0.06, 0.2, 0.14, 0.16, 0.03);
  }, { w: 0.55, h: 1.3, name: 'jacket side' }), 302, { y: 0.8, z: -0.27, ry: PROFILE });
  // the head: a face in front (hair printed on its back), crossed with a profile (hair behind, an ear)
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(skin); D.ell(gg, 0, 0.38, 0.36, 0.38);
    gg.fillStyle = ink(hair, 'print'); D.rect(gg, -0.3, 0.5, 0.6, 0.12, 0.06);
    gg.fillStyle = ink('#2a1608', 'print'); D.ell(gg, -0.12, 0.35, 0.04, 0.05); D.ell(gg, 0.12, 0.35, 0.04, 0.05);
    gg.fillStyle = ink('#c9845a', 'print'); for (const fx of [-0.2, -0.16, 0.16, 0.2]) D.ell(gg, fx, 0.25, 0.015, 0.015);
    gg.fillStyle = ink('#8a3a22', 'print'); D.rect(gg, -0.07, 0.17, 0.14, 0.03, 0.015);
  }, { w: 0.8, h: 0.8, name: 'face' }), 304, { y: 1.88, back: plain(hair) });
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(P2.shade(skin, -0.04)); D.ell(gg, 0, 0.38, 0.34, 0.38);
    gg.fillStyle = ink(hair); D.ell(gg, -0.12, 0.44, 0.24, 0.32);
    gg.fillStyle = ink('#e0b896', 'print'); D.ell(gg, 0.02, 0.36, 0.06, 0.08);
    gg.fillStyle = ink('#2a1608', 'print'); D.ell(gg, 0.22, 0.35, 0.03, 0.045);
  }, { w: 0.75, h: 0.8, name: 'head side' }), 305, { y: 1.86, z: -0.37, ry: PROFILE });
  // the knitted bobble hat: a frontal crown crossed with a profile crown, a pompom on both
  const hatCard = (c, seed, ry) => card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(c); D.rect(gg, -0.34, 0, 0.68, 0.36, 0.16);
    gg.fillStyle = ink(P2.shade(c, -0.22)); D.rect(gg, -0.35, 0, 0.7, 0.1, 0.04);
    gg.fillStyle = ink('#c8452d', 'print'); D.rect(gg, -0.34, 0.18, 0.68, 0.05);
    gg.fillStyle = ink('#f3e6c8'); D.ell(gg, 0, 0.42, 0.13, 0.12);
  }, { w: 0.75, h: 0.6, name: 'hat' }), seed, { y: 2.42, z: ry ? -0.37 : 0.02, ry });
  hatCard(hat, 306, 0); hatCard(P2.shade(hat, -0.06), 307, PROFILE);
  // arms: a frontal + a profile card each, hanging from a shoulder pivot; the right hand carries the watering can
  const arms = [-0.44, 0.44].map((x, i) => {
    const sh = new H.THREE.Group(); sh.position.set(x, 1.98, 0); body.add(sh);
    const art = (c) => P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(c); D.rect(gg, -0.1, 0.14, 0.2, 0.66, 0.09); gg.fillStyle = ink(collar); D.rect(gg, -0.1, 0.12, 0.2, 0.09, 0.04); gg.fillStyle = ink(skin); D.ell(gg, 0, 0.08, 0.09, 0.08); }, { w: 0.26, h: 0.82, name: 'arm' });
    card(art(jacket), 330 + i, { y: -0.8, parent: sh }); card(art(jacketSide), 340 + i, { y: -0.8, z: -0.12, ry: PROFILE, parent: sh });
    return sh;
  });
  card(P2.drawnPiece((gg, ink) => {                                   // the can, in profile: spout forward, a handle on top
    gg.fillStyle = ink('#9fb0b0'); D.rect(gg, -0.2, 0, 0.4, 0.36, 0.05); D.poly(gg, [[0.16, 0.12], [0.24, 0.16], [0.48, 0.44], [0.44, 0.48]]);
    gg.fillStyle = ink('#7c8c8c'); D.rect(gg, -0.12, 0.34, 0.24, 0.12, 0.04);
    gg.fillStyle = ink('#5f6d6d', 'print'); D.rect(gg, -0.2, 0.1, 0.4, 0.03); D.rect(gg, -0.2, 0.24, 0.4, 0.03);
  }, { w: 1.05, h: 0.55, name: 'watering can' }), 350, { y: -1.25, ry: PROFILE, parent: arms[1] });
  // the basket on the back: a crossed box (front + side), greens poking out above the shoulders
  const basket = (side) => P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink('#3f7a3a'); for (const [x, a] of [[-0.18, -0.3], [-0.02, 0.1], [0.14, 0.4]]) D.poly(gg, [[x - 0.05, 0.8], [x + 0.05, 0.8], [x + Math.sin(a) * 0.3 + 0.03, 1.32], [x + Math.sin(a) * 0.3 - 0.03, 1.32]]);
    gg.fillStyle = ink(side ? '#a67c40' : '#b58a4a'); D.rect(gg, side ? -0.22 : -0.32, 0, side ? 0.44 : 0.64, 0.86, 0.1);
    gg.fillStyle = ink('#8a6230', 'print'); for (let k = 0; k < 4; k++) D.rect(gg, side ? -0.22 : -0.32, 0.12 + k * 0.18, side ? 0.44 : 0.64, 0.05);
  }, { w: 0.75, h: 1.4, name: 'basket' });
  card(basket(false), 360, { y: 1.05, z: -0.32 }); card(basket(true), 361, { y: 1.05, z: -0.56, ry: PROFILE });
  // the stride (motion.md section 8): the phase runs with the distance walked; in the stance a leg's angle is LINEAR in
  // distance, so the planted foot stays put; the swing eases forward; arms swing opposite the legs (the loaded arm
  // less); the body bobs twice per stride. Rotation only, never a scale.
  const legLen = 0.97 * 1.25, stepLen = 1.2, R = stepLen / (2 * legLen);
  const leg = (ph, gait) => { const u = (ph / Math.PI) % 2, A = gait * R; if (u >= 1) return A * (3 - 2 * u); const e = u * u * (3 - 2 * u); return A * (2 * e - 1); };
  g.userData.stride = (walked, gait) => {
    const ph = walked / stepLen * Math.PI, l0 = leg(ph, gait), l1 = leg(ph + Math.PI, gait);
    legs[0].rotation.x = -l0; legs[1].rotation.x = -l1;              // + forward = the foot toward +z
    arms[0].rotation.x = l0 * 0.7; arms[1].rotation.x = l1 * 0.7 * 0.3;   // opposite the leg on its side; the can arm swings less
    body.position.y = Math.abs(Math.sin(ph)) * 0.05 * gait;
  };
  return g;
};


// ---- 4. ?test: the material on a few cards under the final light and lens (workflow step 2) ----------------------
if (flags.TEST) {
  { const doll = heroDoll(); H.setHero(popup(null, null, { node: doll, height: 3.1, x: 2, z: -4, sway: 0.2, scale: 1.25 }), { stride: doll.userData.stride }); }
  popup(...K.tree(), { x: -3, z: -8, cross: true, sway: 0.8 }); bushStack(6.5, -6, {}); popup(...K.rock(), { x: -1, z: -2.5, yaw: -0.2 });
  H.glowing(popup(null, null, { node: boxHouse({ w: 4.8, d: 3.8, wallH: 3.4, roofH: 2.5, colors: houseColors(C.roof), paper: H.paper, seed: 79 }), height: 5.9, x: 9, z: -11, yaw: -0.3 }).group);
} else buildWorld();

// ---- 6. a living world (references/motion.md section 12): THIS world's weather and creatures, chosen for an autumn
// countryside: leaves falling in the trees' own colours, a few birds crossing above the treetops, butterflies at the
// flower beds, smoke from the chimneys, cloud shadows, ducks drifting on the water, hens that peck and scatter, a fox
// that bounds away from the hero, cats that wander and nap. Another brief picks its own (snow, petals, rain and mist,
// dust and gusts, bubbles and fish...), in its own colours: never this list by default.
if (!flags.TEST) {
  const life = createLife({ scene: H.scene, camera: H.camera, heroHeight: H.heroHeight, seed: 41, wind: [0.94, 0.34] });
  life.fallers({ count: 60, cut: 'leaf', colors: [C.leafA, C.leafB, C.leafC, '#a8452a'], size: [0.2, 0.3], land: 9 });
  life.flock({ size: 5, height: 3.4, colors: ['#f6f1e6', '#e9e2d4'] });
  life.flyers({ count: 8, colors: ['#fff6e0', '#f6c64a', '#ef8a3c'], anchors: LIFE.flowers.slice(0, 8), roam: 1.4 });
  life.puffs({ at: LIFE.chimneys, perEmitter: 3, life: 4.5, rise: 0.45, size: [0.2, 0.45], colors: ['#f3e8d2', '#ece0c8'] });   // paper discs with a cut spiral, just above the chimney
  life.cloudShadows({ count: 4 });
  for (const [h, roam] of LIFE.floaters) life.critter(h.group, { behaviour: 'float', roam });
  for (const [h, behaviour] of LIFE.creatures) life.critter(h.group, { behaviour, hero: H.hero.group.position, walk: H.walk, roam: 1.2 });
  life.setNight({ night: 1, dusk: 0.5 }[flags.MOOD] ?? 0);   // butterflies sleep, fewer birds, no smoke at night
  life.reset(H.target);
  H.onStep((t, dt) => life.update(dt, H.target));
  H.onRestart(() => life.reset(H.target));
}

// ---- 5. the world: landmarks and built ground by hand, then the fill ------------------------------------------------
function buildWorld() {
  const side = (z) => Math.sign(pathX(z) - riverX(z)) || 1;          // the side of the path away from the river
  const at = (z, off) => [pathX(z) + side(z) * off, z];
  // the hamlet: box-fold houses (gables open first, then the roof), a well, life at the doors
  const homes = [[at(-11, 5.5), { w: 5.4, d: 4.2, wallH: 3.7, roofH: 2.7 }, C.roof, 71, -0.25, 3.4, 4.4], [at(-4.5, 7), { w: 4.2, d: 3.6, wallH: 3.1, roofH: 2.3, windows: 1 }, C.roofB, 73, -0.5, 2.9, 3.8], [at(-17.5, 6.5), { w: 4.8, d: 3.8, wallH: 3.4, roofH: 2.5 }, C.roofC, 79, 0.2, 3.1, 4]];
  for (const [[x, z], dims, roof, seed, yaw, solid, keep] of homes) {
    const node = boxHouse({ ...dims, colors: houseColors(roof), paper: H.paper, seed, print: H.cardOpts(x, z) });
    const h = popup(null, null, { node, height: dims.wallH + dims.roofH, x, z, yaw, solid });   // print quality follows the lens
    if (node.userData.chimneyTop) LIFE.chimneys.push(node.userData.chimneyTop);
    H.glowing(h.group); H.lamp(x + Math.sin(yaw) * 2.6, 2.2, z + Math.cos(yaw) * 2.6, 1, 11); mark(x, z, keep);   // a warm pool at the door at dusk
  }
  // a small scene beside each door (2-3 different pieces, never the same set twice): a home reads as lived in
  const DOOR = [['flowers', 'barrel', 'hen'], ['bench', 'flowers'], ['hay', 'barrel', 'cat']];
  homes.forEach(([[x, z], dims, , , yaw], i) => {                    // at the front corner away from the path
    const u = side(z) * (dims.w / 2 + 1.3), v = dims.d / 2 + 1.1, gx = x + u * Math.cos(yaw) + v * Math.sin(yaw), gz = z - u * Math.sin(yaw) + v * Math.cos(yaw);
    group(gx, gz, DOOR[i], 0.6, (px, pz) => pathDist(px, pz) > 1.7 && riverDist(px, pz) > 3.4); mark(gx, gz, 1.8);
  });
  { const [x, z] = at(-8, 10.5); popup(...K.well(), { x, z, yaw: -0.3, scale: 1.6, solid: 1.3 }); mark(x, z, 2); }
  { const [x, z] = at(-7.5, 3.4); group(x + 2.6, z, ['barrel', 'bush', 'cat']); mark(x + 2.6, z, 2.6); }
  { const [x, z] = at(-14.5, 2.6); group(x, z, ['hen', 'flowers', 'tuft']); mark(x, z, 2.4); }
  { const [x, z] = at(-1, 11); group(x, z, ['shrub', 'barrel']); mark(x, z, 2.4); }
  for (const z of [0, 4.2]) { const [x] = at(z, 2.6); popup(...K.fence(), { x, z, yaw: -0.55 + (z > 2 ? 0.25 : 0) }); mark(x, z, 2.2); }
  for (const [z, sd] of [[-6, 1], [-15, -1]]) { const x = pathX(z) + side(z) * sd * 1.9; popup(...K.lamp(), { x, z, scale: 1.25 }); mark(x, z, 1); H.lamp(x, 3.6, z + 0.3, 0.66, 9); }
  // the river crossing: a BUILT bridge (deck ramps + crown, leaning parapet sides, posts), its span along the path and
  // long enough to clear the river band where the path crosses it obliquely; the hero walks over it (walk field)
  let bz = -20; for (let z = -42; z < 10; z += 0.1) if (Math.sign(pathX(z) - riverX(z)) !== Math.sign(pathX(z + 0.1) - riverX(z + 0.1))) { bz = z; break; }
  {
    const dxp = pathX(bz + 0.5) - pathX(bz - 0.5), dxr = riverX(bz + 0.5) - riverX(bz - 0.5);
    const yawB = Math.atan2(dxp, 1), cross = Math.abs(Math.sin(yawB - Math.atan2(dxr, 1))), span = Math.min(15, 2 * 3.4 / Math.max(0.4, cross) + 1.6);
    const br = popup(null, null, { node: bridge({ span, width: 3.2, paper: H.paper, colors: { stone: C.stone, wood: C.wood }, seed: 91,
      paints: { deck: EX.paintWood({ wood: C.wood }, { planks: 5 }), side: (deckH, arch) => EX.paintBridgeSide({ stone: C.stone, wood: C.wood }, { deckH, arch }) } }), height: 4, x: riverX(bz), z: bz, yaw: yawB, self: true });
    br.pivot.children[0].name = 'bridge'; walk.add(br.pivot.children[0]); mark(riverX(bz), bz, span / 2 + 1.2); H.spots.bridge = [riverX(bz), bz, yawB, span];
  }
  { const z = bz + 4, [x] = at(z, 2.2); popup(...K.sign(), { x, z, yaw: -0.4 }); mark(x, z, 1.2); }
  walk.block((x, z) => riverDist(x, z) < 2.8);                         // the water blocks the walk except on a deck
  for (const [z, dx, yaw, sc] of [[-11, -0.8, 0.5, 1.0], [-9.5, 0.6, -0.35, 0.85]]) LIFE.floaters.push([popup(...K.duck(), { x: riverX(z) + dx, z, yaw, scale: sc }), 0.3]);   // twins vary in size and turn
  // the pond and its jetty: an OPEN construction (a posts face, a plank deck, a posts support: platform() with the
  // deck's walk surface), low over the water, reached from the bank; the water blocks the walk everywhere else.
  {
    const JW = 6, JD = 2, JH = 0.55, x0 = POND.x + POND.rx * 0.95, jx = x0 - JW / 2 + 0.4, jz = POND.z + JD / 2;
    const posts = (w, h) => P2.fromDrawing((gg) => { D.rect(gg, -w / 2, h - 0.16, w, 0.16); const n = Math.round(w / 0.75); for (let i = 0; i <= n; i++) D.rect(gg, -w / 2 + (n ? i * (w - 0.16) / n : 0), 0, 0.16, h); }, { w: w + 0.1, h: h + 0.05, name: 'posts' });
    const wood = (n, vertical) => EX.paintWood({ wood: C.wood }, { planks: n, vertical });
    const jetty = platform({ w: JW, d: JD, h: JH, paper: H.paper, seed: 141, facePts: posts(JW, JH), supportPts: posts(JW * 0.9, JH).map(([px, py]) => [px, py - JH]),
      paints: { face: wood(1, true), deck: wood(Math.round(JW / 0.42), true), support: wood(1, true) }, print: H.cardOpts(jx, jz) });
    jetty.name = 'jetty';
    const j = popup(null, null, { node: jetty, height: JH, x: jx, z: jz, level: true });
    walk.add(jetty); H.spots.jetty = [jx, jz, JW, JD, JH];
    const o = j.order + 0.5;
    for (const dx of [-JW / 2 + 0.2, -JW / 2 + 1.4]) popup(posts(0.18, 1.1), wood(1, true), { parent: jetty.userData.deck, x: dx, z: 0.05, order: o });   // mooring posts
    popup(...K.boat(), { x: jx - JW / 2 + 0.6, z: jz + 1.5, yaw: 0.25, scale: 1.3, sway: 0.35 });
    for (const [a, r] of [[2.3, 1.02], [2.9, 1.04], [3.9, 1.0], [4.6, 1.03], [5.6, 1.05]]) popup(...K.reeds(), { x: POND.x + Math.cos(a) * POND.rx * r, z: POND.z + Math.sin(a) * POND.rz * r, yaw: (rnd() - 0.5) * 0.6, sway: 0.7 });
    LIFE.floaters.push([popup(...K.duck(), { x: POND.x - 2.6, z: POND.z + 1.4, yaw: 0.65, scale: 1.12 }), 0.5]);
    walk.block((x, z) => inPond(x, z, 0.98));
    mark(POND.x, POND.z, Math.max(POND.rx, POND.rz) * 1.08);
  }
  // a rock outcrop and life on the far bank of the pond
  { const x = POND.x - POND.rx - 2.5, z = POND.z - 1.5; if (free(x, z, 1)) { rockOutcrop(x, z); mark(x, z, 3.2); } }
  // nested landforms in the mid-ground, in the open ground the fill leaves: volume from stepped cards, not only boxes
  for (const [x, z, o] of [[30, -8, { col: C.hillB, yaw: -0.25 }], [-17, 4, { w: 3.8, h: 4.2, yaw: 0.3 }], [25, 7, { w: 3.6, h: 3.8, n: 3, col: C.hillB, yaw: -0.15 }], [8, -16, { w: 4.4, h: 5, yaw: 0.1 }]])
    if (free(x, z, 1.5)) { hillock(x, z, o); mark(x, z, (o.w || 4.2) * 0.8); }
  popup(...K.boat(), { x: riverX(-27) + 0.4, z: -27, yaw: 0.3, scale: 1.6, sway: 0.35 });
  for (const [z, sd] of [[-38, -1], [-30, 1], [-14, -1], [-6, 1], [-2, -1]]) { const x = riverX(z) + sd * 4.6; popup(...K.reeds(), { x, z, yaw: (rnd() - 0.5) * 0.6, sway: 0.7 }); mark(x, z, 1.6); }
  // layered hills at the far edge (never walked on): 3 parallel cards stepping back, alternating tones
  for (const [hx, hz] of [[-30, -34], [26, -33]]) { for (let k = 0; k < 3; k++) popup(...K.hill(k), { x: hx + (k - 1) * 0.8, z: hz + k * 1.3 }); mark(hx, hz + 1.3, 5.5); }
  for (const [dx, dz] of [[-3, -1], [2, 0.8], [5.5, -1.6]]) popup(...K.hay(), { x: fields[0][0] + dx, z: fields[0][1] + dz, yaw: (rnd() - 0.5) * 0.5 });
  mark(fields[0][0], fields[0][1], 7.5); mark(fields[1][0], fields[1][1], 6.5);
  // the hero, off-centre on the path (lower right third), and a bench to rest on
  const doll = heroDoll(), hero = popup(null, null, { node: doll, height: 3.1, x: pathX(3) + 0.2, z: 3, sway: 0.2, scale: 1.25 }); H.setHero(hero, { stride: doll.userData.stride });
  { const [x, z] = at(6.5, 3); popup(...K.bench(), { x, z, yaw: -0.3 }); mark(x, z, 2.2); mark(pathX(3), 3, 2.4); }

  // the fill: a slow noise decides woods (high), groups (middle) and clearings (low), only where the camera can see:
  // first the overview (inFrame), then the ring past it that the walking camera can bring (inReach minus inFrame)
  rnd = P2.rng(202);
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const lush = (x, z) => 0.5 + 0.24 * Math.sin(x * 0.12 + ph[0]) * Math.sin(z * 0.14 + ph[1]) + 0.16 * Math.sin(x * 0.21 + z * 0.15 + ph[2]) + 0.1 * Math.sin(x * 0.05 - z * 0.31 + ph[3]);
  const trees = [], placed = [];
  const DRESS = ['bush', 'bush', 'shrub', 'rock', 'rock', 'tuft', 'flowers', 'flowers', 'mushroom', 'mushroom', 'stump', 'fox', 'cat'];
  const CAP = { fox: 2, cat: 2 }, used = {};   // at most a few identical props or creatures in view: clones read as a demo
  const kindsFor = (n) => { const out = []; n = Math.min(n, [...new Set(DRESS)].filter((k) => (used[k] || 0) < (CAP[k] ?? Infinity)).length); while (out.length < n) { const k = DRESS[Math.floor(rnd() * DRESS.length)]; if (!out.includes(k) && (used[k] || 0) < (CAP[k] ?? Infinity)) { out.push(k); used[k] = (used[k] || 0) + 1; } } return out; };   // never more kinds than are left
  // tall pieces in FRONT of the subject hide it in a down-looking view: keep a low-dress corridor before the hero
  const [hx0, hz0] = [hero.group.position.x, hero.group.position.z];
  const corridor = (x, z) => z > hz0 - 1 && z < hz0 + 16 && Math.abs(x - hx0) < 7 + (z - hz0) * 0.35;
  const fillGroups = (see) => { for (let gz = -46; gz <= 18; gz += 3.1) for (let gx = -46; gx <= 46; gx += 3.1) {
    const x = gx + (rnd() - 0.5) * 2.6, z = gz + (rnd() - 0.5) * 2.6, l = lush(x, z);
    if (!see(x, z, 0.12, 4) || l < 0.26 || placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3.0)) continue;
    placed.push([x, z]);
    if (l > 0.55 && free(x, z, 1.6) && !corridor(x, z) && trees.every(([tx, tz]) => Math.hypot(x - tx, z - tz) > 4.8)) {   // canopies never stack
      trees.push([x, z]);
      if (rnd() < 0.3) popup(...K.pine(), { x, z, cross: true, sway: 0.5 });
      else popup(...K.tree(), { x, z, cross: true, sway: 0.8 });
    } else if (free(x, z, 1.0)) group(x, z, kindsFor(4 + Math.floor(rnd() * 4)), 1.15);   // groups of 4-7 different pieces
  } };
  fillGroups(H.inFrame);
  // small fillers between the groups (tufts, flowers, mushrooms, stones), never in the clearings: the sharp band of the
  // shipped frames is ~45-55 % open ground (measure.py barePct)
  const fillSmall = (see, z0 = -30, x0 = 40) => { for (let gz = z0; gz <= 12; gz += 2.0) for (let gx = -x0; gx <= x0; gx += 2.0) {
    const x = gx + (rnd() - 0.5) * 1.6, z = gz + (rnd() - 0.5) * 1.6, l = lush(x, z);
    if (!see(x, z, 0.05, 1) || l < 0.3 || !free(x, z, 0.4) || placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.8)) continue;
    placed.push([x, z]);
    const k = ['tuft', 'flowers', 'mushroom', 'tuft', 'rock'][Math.floor(rnd() * 5)];
    popup(...K[k](), { x, z, yaw: (rnd() - 0.5) * 0.7, scale: 0.65 + rnd() * 0.25, sway: k === 'tuft' || k === 'flowers' ? 0.6 : 0 });
  } };
  fillSmall(H.inFrame);
  // big, blurred pieces overlapping the bottom edge sell the miniature scale
  for (const [x, z, s, kind] of [[-23, 15.5, 2.0, 'tree'], [-7, 17, 1.8, 'bush'], [27, 17.5, 2.1, 'tree'], [9, 18.5, 1.5, 'bush']]) {
    if (kind === 'bush') bushStack(x, z, { scale: s, yaw: (rnd() - 0.5) * 0.4 });
    else popup(...K.tree(), { x, z, cross: true, scale: s, sway: 0.6 });
  }
  // the ring the walk can bring into view (after the overview, so the overview's own draws never change)
  // (the overview's own margin already covers most of the drift: the ring is what the drift shows beyond it)
  const ring = (x, z, m, y) => H.inReach(x, z, 0.02, y) && !H.inFrame(x, z, m, y);
  RES = 0.75; fillGroups(ring); fillSmall(ring, -36, 44); RES = 1;
}

H.start();
