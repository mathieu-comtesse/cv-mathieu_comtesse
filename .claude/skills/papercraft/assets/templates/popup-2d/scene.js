// papercraft / templates / popup-2d / scene.js
// The countryside WORKED EXAMPLE on the fixed 2D harness (harness-2d.js): a river and a path as leading lines, a
// footbridge built in depth (two side cards + a deck surface between them), a hamlet, a puppet hero who walks the path
// and the bridge, a fill of groups and clearings. Write your own scene.js with your own subject's pieces (the recipes
// are in references/procedural-art.md and references/mechanisms.md); the countryside painters imported here are
// examples to read, never parts for another subject.
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import * as EX from 'papercraft/examples/countryside.js';
import { createHarness2D } from './harness-2d.js';

// ---- 1. palette: THIS WORLD'S ONLY (warm lead on olive-khaki); derive yours from your brief (palettes.md section 3)
const C = {
  ground: '#cfc4a1', wash: '#a8ae84', washWarm: '#d6b680', path: '#f3e6c6', river: '#3a8c84', riverDeep: '#286c68', foam: '#f6ecd4',
  leaf: ['#e0852c', '#c9542b', '#d9a03a'], pine: '#62803f', bush: ['#3f8a74', '#8a9c55'], trunk: '#74452a', stone: '#b7a386',
  wall: '#f0e0c0', roof: ['#c8513b', '#9c5636'], window: '#ffc45a', wood: '#a8683a', ink: '#3a2412', hat: '#e3b04b',
  shadow: '#6e3010', kraft: '#c9a77c',
};
const H = createHarness2D({ ground: C.ground, shadow: C.shadow, kraft: C.kraft, view: { pitch: 40, dist: 70, across: 54 }, light: [-0.7, 1.1, 0.4], play: true });
const { g, proj, L } = H, D = P2.draw2;

// ---- 2. the printed ground: washes, a river, a winding path, marks in drifts ------------------------------------------
const riverX = (z) => 9 - z * 0.5 + Math.sin(z * 0.15) * 4;
const BZ = 0.4;                                          // where the footbridge crosses the river (inside the sharp band)
const pathX = (z) => -7 + z * 0.3 + Math.sin(z * 0.2 + 1) * 3;
H.printGround(({ x, W, GQ, X, Z, GX1, GZ0, GZ1, rnd, washes, ribbon, drifts }) => {
  washes([C.wash, C.wash, C.wash, C.washWarm, C.washWarm]);
  ribbon(riverX, 6.2, P2.rgba('#f2e6c6', 0.95), 0.3); ribbon(riverX, 5.2, C.river, 0.25); ribbon(riverX, 2.4, P2.rgba(C.riverDeep, 0.65), 0.4);
  for (let k = 0; k < 700; k++) { const z = GZ0 + rnd() * (GZ1 - GZ0), wx = riverX(z) + (rnd() - 0.5) * 4.2, l = (0.35 + rnd() * 0.6) * GQ; x.strokeStyle = k % 4 ? P2.rgba(C.foam, 0.85) : P2.rgba(C.riverDeep, 0.7); x.lineWidth = 0.12 * GQ; x.beginPath(); x.moveTo(X(wx) - l / 2, Z(z)); x.quadraticCurveTo(X(wx), Z(z) - 0.12 * GQ, X(wx) + l / 2, Z(z)); x.stroke(); }
  for (let k = 0; k < 3; k++) ribbon(pathX, 2.5 - k * 0.3, P2.rgba(C.path, 0.55 + k * 0.15), 0.35 - k * 0.1);
  for (let k = 0; k < 3; k++) { // the side path to the footbridge and on along the far bank
    x.strokeStyle = P2.rgba(C.path, 0.55 + k * 0.15); x.lineWidth = (2.1 - k * 0.3) * GQ; x.lineCap = x.lineJoin = 'round'; x.beginPath();
    for (let wx = pathX(BZ); wx <= GX1; wx += 0.5) { const wz = BZ + Math.sin(wx * 0.21) * 0.5 * Math.min(1, Math.abs(wx - riverX(BZ)) / 6); (wx === pathX(BZ) ? x.moveTo : x.lineTo).call(x, X(wx), Z(wz)); }
    x.stroke();
  }
  drifts((px, py) => {                                   // grass ticks and flowers gathered in drifts
    if (rnd() < 0.75) { x.strokeStyle = P2.rgba(rnd() < 0.5 ? '#6c7c4a' : '#8d9a58', 0.75); x.lineWidth = 0.07 * GQ; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 0.15 * GQ, py - (0.25 + rnd() * 0.25) * GQ); x.stroke(); }
    else { x.fillStyle = rnd() < 0.5 ? '#f3e6c8' : '#c8452d'; for (let q = 0; q < 5; q++) { const t = q / 5 * 6.283; x.beginPath(); x.arc(px + Math.cos(t) * 0.1 * GQ, py + Math.sin(t) * 0.1 * GQ, 0.075 * GQ, 0, 7); x.fill(); } }
  });
});

// ---- 3. the pieces: each kind is a function of the seeded stream (no two the same card) ---------------------------------
let rnd = P2.rng(131);                   // one seeded stream per section: an edit in one section never reshuffles another
const between = (a, b) => a + rnd() * (b - a), pick = (a) => a[Math.floor(rnd() * a.length)];
const mound = (w, h, lobes = 7, depth = 0.18) => P2.roughen(P2.shape.mound(rnd, { w, h, lobes, depth }), rnd);
const tuft = (w, h, n) => P2.shape.mound(rnd, { w, h, lobes: n, depth: 0.42 }); // rounded blades: pointed ones read as combs
const K = {
  tree: () => { const h = between(7, 8.6), w = h * between(0.74, 0.86); return [P2.roughen(EX.shape.tree(rnd, { w, h, lobes: 7 + Math.floor(rnd() * 3), canopy: 0.7 }), rnd), EX.paintTree({ leaf: pick(C.leaf), trunk: C.trunk }, { trunkTop: 0.3, leaves: 20 })]; },
  pine: () => { const h = between(7.5, 9.5); return [P2.roughen(EX.shape.pine(rnd, { w: h * 0.6, h }), rnd), EX.paintPine({ leaf: C.pine, trunk: C.trunk })]; },
  shrub: () => { const w = between(3.6, 4.4); return [mound(w, w * 0.62, 9, 0.12), EX.paintBush({ leaf: C.leaf[1] }, { bands: 2 })]; },
  flowers: () => [mound(5, 1.8, 11, 0.25), EX.paintBush({ leaf: '#6f8f5a' }, { bands: 0, flowers: true, motifs: false })],
  tuft: () => [tuft(3, 2.1, 7), EX.paintBush({ leaf: '#8f9c5c' }, { bands: 2, flowers: false, motifs: false })],
  rock: () => { const w = between(3.2, 4.4); return [mound(w, w * 0.55, 4, 0.1), EX.paintRock({ stone: C.stone, ink: C.ink })]; },
  mushroom: () => [EX.props.mushroom(between(1.8, 2.3)), EX.paintMushroom()],
  fox: () => EX.critter.fox(2.0),
  cat: () => EX.critter.cat(1.7),
  duck: () => EX.critter.duck(1.5),
  bench: () => [EX.props.bench(1.8), EX.paintWood({ wood: C.wood })],
  sign: () => [EX.props.signpost(3), EX.paintWood({ wood: '#b9844f' }, { planks: 1 })],
  barrel: () => [EX.props.barrel(2), EX.paintWood({ wood: '#97552f' }, { planks: 4, vertical: true })],
  fence: () => [EX.shape.fence({ w: 5, h: 1.8, pickets: 6 }), EX.paintWood({ wood: '#b07a48' }, { planks: 1 })],
  house: (roof, w) => [EX.shape.house({ w, wallH: w * 0.62, roofH: w * 0.5 }), EX.paintHouse({ wall: C.wall, roof, window: C.window, ink: C.ink }, { wallH: w * 0.62 })],
  well: () => [P2.fromDrawing((gg) => { D.rect(gg, -0.62, 0, 1.24, 0.62, 0.08); D.rect(gg, -0.56, 0.5, 0.1, 0.8); D.rect(gg, 0.46, 0.5, 0.1, 0.8); D.poly(gg, [[-0.82, 1.2], [0, 1.62], [0.82, 1.2]]); }, { w: 1.7, h: 1.66 }).map(([a, b]) => [a * 1.7, b * 1.7]),
    (P) => { const { box, g: gg } = P; P.gradient(P2.shade(C.stone, 0.1), P2.shade(C.stone, -0.15), 0.4); P.marks('brick', { color: P2.shade(C.stone, -0.45), alpha: 0.55, size: 0.08 }); P.draw(() => { gg.fillStyle = C.wood; gg.fillRect(box.x0 - 1, box.y0 + box.h * 0.37, box.w + 2, box.h * 0.36); gg.fillStyle = C.roof[0]; gg.fillRect(box.x0 - 1, box.y0 + box.h * 0.72, box.w + 2, box.h); }); P.innerShade('#4a2a14', { alpha: 0.4, blurPx: 8 }); }],
};
const turn = () => (rnd() - 0.5) * 0.7;                                   // small cards turned a little about their hinge
const place = (kind, x, z, o = {}) => { const [pts, paint] = typeof kind === 'string' ? K[kind]() : kind; return H.piece(pts, paint, { x, z, ...o }); };
// bushes: two stacked cards (back darker and taller, front lighter, a little nearer), the shipped bush read
const bushStack = (x, z, s = 1) => {
  const w = between(5, 6.6) * s, col = pick(C.bush), y = turn();
  H.piece(mound(w, w * 0.42, 6, 0.2), EX.paintBush({ leaf: P2.shade(col, -0.12) }), { x, z, yaw: y, sway: 0.5 });
  H.piece(mound(w * 0.78, w * 0.3, 7, 0.22), EX.paintBush({ leaf: P2.mix(col, '#f2e3c0', 0.08) }, { bands: 1 }), { x: x + w * 0.06, z: z + 0.45, yaw: y, sway: 0.5 });
};
const taken = [];                                     // [x, z, r] kept clear of the fill (landmarks, the path, the river)
const riverDist = (x, z) => { let d = 1e9; for (let s = -7; s <= 7; s += 0.25) d = Math.min(d, Math.hypot(x - riverX(z + s), s)); return d; };
const pathDist = (x, z) => { let d = 1e9; for (let s = -5; s <= 5; s += 0.25) d = Math.min(d, Math.hypot(x - pathX(z + s), s)); return d; };
const free = (x, z, m = 0) => riverDist(x, z) > 3.4 + m && pathDist(x, z) > 1.7 + m && !(x > pathX(BZ) && Math.abs(z - BZ) < 1.6 + m) && taken.every(([a, b, r]) => Math.hypot(x - a, z - b) > r + m);
// in a pitched view tall pieces in FRONT of the subject hide it: keep the path in front of the hero clear of tall cards
const corridor = (x, z) => z > 2 && pathDist(x, z) < 6;

// ---- 4. landmarks by hand: a hamlet by the path, a well, ducks on the river, the footbridge, the hero ---------------------
place(K.house(C.roof[0], 5.6), pathX(-12) + 5.5, -12, { yaw: -0.25 }); place(K.house(C.roof[1], 4.4), pathX(-7) + 7.5, -7, { yaw: 0.3 }); place('well', pathX(-9) + 11.5, -9.5);
taken.push([pathX(-12) + 5.5, -12, 4], [pathX(-7) + 7.5, -7, 3.6], [pathX(-9) + 11.5, -9.5, 2]);
const solids = taken.slice();                         // the houses and the well block the walk
place('barrel', pathX(-4) + 4.2, -4); place('cat', pathX(-3.3) + 5.6, -3.3, { yaw: 0.4 }); place('fence', pathX(-1) + 3.2, -1, { yaw: -0.35 }); place('sign', pathX(-15) - 2, -15, { yaw: 0.3 });
taken.push([pathX(-4) + 4.6, -4, 2.4], [pathX(-1) + 3.2, -1, 2.8], [pathX(-15) - 2, -15, 1.4]);
for (const [z, dx] of [[-8, 0.6], [5, -0.8], [6.5, 0.6]]) place('duck', riverX(z) + dx, z, { yaw: 0.4, bob: 0.06, reflect: true });
// the footbridge: built in depth like bridge() in examples/built-ground.js, never one flat card on the water. Two side cards (foot on
// the banks, an arch over the water, a parapet over the deck line; the FRONT one lower so the deck shows over it) and a
// deck surface drawn between them (drawDeck2D), rising with them. deckAt(x, z): the walk height on the deck.
const BX = riverX(BZ), BHS = 5.2, BW = 1.7, DA1 = 26 * Math.PI / 180, DA2 = 8 * Math.PI / 180, Dz1 = BHS * 0.42, Dh1 = (BHS - Dz1) * Math.tan(DA1);
const deckH = (u) => { u = Math.abs(u); return u >= BHS ? 0 : u >= Dz1 ? (BHS - u) * Math.tan(DA1) : Dh1 + (Dz1 - u) * Math.tan(DA2); };
const deckAt = (x, z) => (Math.abs(x - BX) < BHS && Math.abs(z - BZ) < BW ? deckH(x - BX) : null);
const sideCard = (railH) => {
  const ext = BHS * 1.06, ah = deckH(0) * 0.7, aw = BHS * 0.58, pts = [[-ext, 0], [-aw, 0]];
  for (let i = 1; i < 16; i++) { const a = Math.PI - Math.PI * i / 16; pts.push([Math.cos(a) * aw, Math.sin(a) * ah]); }
  pts.push([aw, 0], [ext, 0]);
  for (let i = 0; i <= 26; i++) { const u = ext - 2 * ext * i / 26; pts.push([u, deckH(u) + railH * (Math.abs(u) > BHS ? 0.8 : 1)]); }
  return [pts, EX.paintBridgeSide({ stone: C.stone, wood: C.wood }, { deckH, arch: { w: aw * 2, h: ah } })];
};
const bridgeBack = place(sideCard(1.1), BX, BZ - BW); place(sideCard(0.55), BX, BZ + BW);
taken.push([BX, BZ, BHS + 1.2], [BX - BHS - 2, BZ, 2], [BX + BHS + 2, BZ, 2]);
// the deck's print: planks ACROSS the deck (its top row is the far edge), graded like every other print; the deck must
// differ from the side faces in unit size and value, or it reads as a third wall instead of a floor
const deckPrint = (() => {
  const pr = P2.printCard(P2.shape.rect(2 * BHS, 2 * BW), { pxPerUnit: H.Q, sheet: H.sheet, seed: 77, paint: EX.paintWood({ wood: C.wood }, { planks: 18, vertical: true }) });
  const c = H.mk(pr.canvas.width, pr.canvas.height), x = c.getContext('2d'); x.filter = H.grade; x.drawImage(pr.canvas, 0, 0); return c;
})();
// keyed at its FAR edge: after the far side card, before everything standing on it and the near side card
const deckSpec = (rise) => ({ print: deckPrint, x0: BX - BHS, x1: BX + BHS, z0: BZ - BW, z1: BZ + BW, heightAt: (x) => deckH(x - BX), rise, light: [L[0], L[1]], edge: 0 });
const bridgeRise = () => Math.min(1, Math.max(0, bridgeBack.spring.p));
H.decks.push({ z: BZ - BW, draw: () => P2.drawDeck2D(g, proj, deckSpec(bridgeRise())), shadow: () => P2.deckShadow2D(g, proj, { ...deckSpec(bridgeRise()), light3: L, color: C.shadow, alpha: 0.32 }) });

// the hero: a paper puppet (never one flat card), designed for this example world: a young gardener. The body card
// (a teal jacket with buttons and a pocket, an arm, a head with a face) carries the walk; two leg cards step with the
// distance walked; a basket of greens pokes out beside and above the shoulder; a knitted bobble hat; the watering can
// it carries. Colours chosen to contrast with this world's ground and dressing. Floating parts and the legs cast no
// shadow of their own (the body's covers them).
const hero = place(P2.drawnPiece((gg, ink) => {
  gg.fillStyle = ink('#2f6f8a'); D.rect(gg, -0.38, 0.75, 0.76, 1.3, 0.22);                                       // jacket
  gg.fillStyle = ink('#245a72', 'print'); D.rect(gg, -0.3, 0.93, 0.2, 0.2, 0.04); D.rect(gg, -0.38, 1.37, 0.76, 0.04); // pocket, seam
  gg.fillStyle = ink('#e8c25a', 'print'); D.ell(gg, 0.04, 1.2, 0.035, 0.035); D.ell(gg, 0.04, 1.5, 0.035, 0.035); D.ell(gg, 0.04, 1.75, 0.035, 0.035);
  gg.fillStyle = ink('#2f6f8a'); D.rect(gg, 0.3, 1.24, 0.22, 0.62, 0.1);                                         // arm
  gg.fillStyle = ink('#f1d9b8'); D.ell(gg, 0.41, 1.2, 0.1, 0.09);                                                 // hand
  gg.fillStyle = ink('#f1d9b8'); D.ell(gg, 0, 2.3, 0.36, 0.38);                                                   // head
  gg.fillStyle = ink('#9a5a2a', 'print'); D.rect(gg, -0.3, 2.42, 0.6, 0.12, 0.06);                                // fringe
  gg.fillStyle = ink('#2a1608', 'print'); D.ell(gg, -0.12, 2.27, 0.04, 0.05); D.ell(gg, 0.12, 2.27, 0.04, 0.05); // eyes
  gg.fillStyle = ink('#c9845a', 'print'); for (const fx of [-0.2, -0.16, 0.16, 0.2]) D.ell(gg, fx, 2.17, 0.015, 0.015); // freckles
  gg.fillStyle = ink('#8a3a22', 'print'); D.rect(gg, -0.07, 2.09, 0.14, 0.03, 0.015);                             // mouth
}, { w: 1.2, h: 2.8, name: 'hero body' }), pathX(4) + 0.2, 4, { sway: 0.2, sharp: true });
const leg = () => P2.drawnPiece((gg, ink) => { gg.fillStyle = ink('#3c5a3a'); D.rect(gg, -0.1, 0.18, 0.2, 0.66, 0.05); gg.fillStyle = ink('#4a2a18'); D.rect(gg, -0.12, 0, 0.28, 0.22, 0.08); }, { w: 0.4, h: 0.86, name: 'leg' });
const parts = [   // [cut + print, dx, dy, dz, float, leg]
  [leg(), -0.12, 0, -0.02, true, 0], [leg(), 0.12, 0, -0.03, true, 1],
  [P2.drawnPiece((gg, ink) => {                                    // a wicker basket of greens
    gg.fillStyle = ink('#3f7a3a'); for (const [x, a] of [[-0.18, -0.3], [-0.02, 0.1], [0.14, 0.4]]) D.poly(gg, [[x - 0.05, 0.8], [x + 0.05, 0.8], [x + Math.sin(a) * 0.3 + 0.03, 1.32], [x + Math.sin(a) * 0.3 - 0.03, 1.32]]);
    gg.fillStyle = ink('#b58a4a'); D.rect(gg, -0.32, 0, 0.64, 0.86, 0.12);
    gg.fillStyle = ink('#8a6230', 'print'); for (let k = 0; k < 4; k++) D.rect(gg, -0.32, 0.12 + k * 0.18, 0.64, 0.05);
  }, { w: 0.75, h: 1.4, name: 'basket' }), -0.36, 0.95, -0.22, true],
  [P2.drawnPiece((gg, ink) => { gg.fillStyle = ink('#d9a33a'); D.rect(gg, -0.34, 0, 0.68, 0.36, 0.16); gg.fillStyle = ink('#b07e22'); D.rect(gg, -0.35, 0, 0.7, 0.1, 0.04); gg.fillStyle = ink('#c8452d', 'print'); D.rect(gg, -0.34, 0.18, 0.68, 0.05); gg.fillStyle = ink('#f3e6c8'); D.ell(gg, 0, 0.42, 0.13, 0.12); }, { w: 0.75, h: 0.6, name: 'hat' }), 0, 2.5, 0.05, true],
  [P2.drawnPiece((gg, ink) => { gg.fillStyle = ink('#9fb0b0'); D.rect(gg, -0.2, 0, 0.4, 0.36, 0.05); D.poly(gg, [[0.16, 0.12], [0.24, 0.16], [0.48, 0.44], [0.44, 0.48]]); gg.fillStyle = ink('#7c8c8c'); D.rect(gg, -0.12, 0.34, 0.24, 0.1, 0.04); gg.fillStyle = ink('#5f6d6d', 'print'); D.rect(gg, -0.2, 0.1, 0.4, 0.03); D.rect(gg, -0.2, 0.24, 0.4, 0.03); }, { w: 1.05, h: 0.55, name: 'watering can' }), 0.42, 0.72, 0.12, true],
].map(([pp, dx, dy, dz, float, legIndex]) => ({ p: place(pp, hero.x + dx, hero.z + dz, { sharp: true, float }), dx, dy, dz, ...(legIndex !== undefined ? { leg: legIndex } : {}) }));
H.setHero(hero, { parts, step: 0.9 });
place('bench', pathX(7) + 3, 7, { yaw: -0.3 }); taken.push([pathX(4), 4, 2.2], [pathX(7) + 3, 7, 2.4]);

// ---- 5. the fill: a slow noise -> woods (high), groups of 2-5 different pieces (middle), clearings (low), in frame only --
rnd = P2.rng(231);                       // the fill's stream
const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
const lush = (x, z) => 0.5 + 0.25 * Math.sin(x * 0.13 + ph[0]) * Math.sin(z * 0.15 + ph[1]) + 0.18 * Math.sin(x * 0.22 + z * 0.17 + ph[2]);
const DRESS = ['bush', 'bush', 'shrub', 'rock', 'tuft', 'flowers', 'mushroom', 'fox', 'cat'];
const CAP = { fox: 2, cat: 2, mushroom: 4 }, used = {};   // at most a few identical pieces in view: clones read as a demo
const trees = [], spots = [];
for (let gz = H.zTop - 6; gz <= H.zBot + 5; gz += 3.4) for (let gx = -(H.halfAt(gz) + 3); gx <= H.halfAt(gz) + 3; gx += 3.4) {
  const x = gx + (rnd() - 0.5) * 2.6, z = gz + (rnd() - 0.5) * 2.6, l = lush(x, z);
  if (l < 0.27 || spots.some(([a, b]) => Math.hypot(x - a, z - b) < 3.1)) continue;
  spots.push([x, z]);
  if (l > 0.56 && free(x, z, 1.5) && !corridor(x, z) && trees.every(([a, b]) => Math.hypot(x - a, z - b) > 3.6)) { trees.push([x, z]); place(rnd() < 0.3 ? 'pine' : 'tree', x, z, { sway: 0.7, slotted: true }); continue; }
  if (!free(x, z, 1)) continue;
  const avail = [...new Set(DRESS)].filter((k) => (used[k] || 0) < (CAP[k] ?? Infinity));
  const n = Math.min(avail.length, 2 + Math.floor(rnd() * 4)), kinds = [];   // groups of 2-5 DIFFERENT pieces
  while (kinds.length < n) { const k = pick(DRESS); if (!kinds.includes(k) && (used[k] || 0) < (CAP[k] ?? Infinity)) kinds.push(k); }
  kinds.forEach((k, i) => { const px = x + (i - (n - 1) / 2) * 1.9 + (rnd() - 0.5), pz = z + (i % 2) * 1.0 - 0.5 + (rnd() - 0.5) * 0.4;
    if (!free(px, pz, 0.6)) return;                                     // every member, not just the group's anchor
    used[k] = (used[k] || 0) + 1;
    if (k === 'bush') bushStack(px, pz); else place(k, px, pz, { yaw: turn(), sway: ['shrub', 'tuft', 'flowers'].includes(k) ? 0.5 : 0 }); });
}
// big blurred pieces overlapping the bottom edge sell the miniature scale
for (const [x, dz, kind] of [[-24, 3, 'tree'], [-9, 4.5, 'bush'], [13, 4, 'bush'], [26, 3.5, 'tree']]) kind === 'bush' ? bushStack(x, H.zBot + dz, 1.5) : place('tree', x, H.zBot + dz, { sway: 0.6, slotted: true });

// ---- 6. the walk field reads the same constructions the camera sees: the deck, the water, walls, solid footprints -----
const walk = H.walk;
walk.add({ heightAt: (x, z) => deckAt(x, z) });
walk.block((x, z) => riverDist(x, z) < 2.7);
// the side cards are walls: off the deck, a strip along each one stops the hero (where the deck is low near the banks
// he would otherwise step straight through them)
walk.block((x, z) => Math.abs(x - BX) < BHS * 1.06 && Math.abs(z - BZ) >= BW && Math.abs(z - BZ) < BW + 0.35);
for (const [a, b, r] of solids) walk.solid(a, b, r * 0.7);   // the houses and the well
for (const [a, b] of trees) walk.solid(a, b, 0.9);

H.start();
