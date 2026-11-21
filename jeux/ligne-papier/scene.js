// La Ligne de papier : un jeu pop-up construit avec le skill papercraft (harness.js fixe + ce fichier).
//
// PAPER SPEC ---------------------------------------------------------------------------------------------------------
// BRIEF    un jeu original pour le site : un plateau de Provence en fin de matinée, début d'été ; une petite ligne à
//          voie unique fermée ; le joueur, un cheminot en gilet orange, relève 5 sémaphores couchés pour rouvrir la
//          ligne, puis l'autorail repart. Ton calme, miniature, lisible. Pas de texte de marque, pas de neon.
// SUBJECT  la voie qui dessine un grand C à travers lavandes et oliviers ; le twist : des coins du monde restent
//          pliés à plat tant que le héros ne les a pas rejoints, et ils se déplient sous ses pas.
// STOCK    carte crème légèrement fibrée pour tout ; le sol en papier aquarelle mat (fibre 1.5, mottle 0.08).
// PALETTE  sol calcaire paille #d9d0b4 / #cfc8a6 ; famille principale lavande #8a72b6 #664f93 #b6a2d6 ;
//          oliviers #7d8a52 #a9b28a ; accents : coquelicot #c9442e, genêt #e2b737 ; encre prune #3b2633 ;
//          ombre ambre-brun #94603e ; brume #d8c8a4.
// LIGHT    clé chaude #ffdcb2 par la gauche (~55 deg de l'axe caméra, ~45 deg de haut), remplissage frontal ~0.27.
// LENS     fov 26, pitch 47, bande nette ~0.3, flou max 18 px ; lavandes et olivier en gros plan flous en bas.
// GROUND   calcaire paille en lavis, champs de lavande en rangs, une parcelle de blé, le ballast de la voie
//          (traverses, rails), cercles de craie autour des sémaphores, thym et cailloux en dérives.
// LAYOUT   ligne directrice : la voie (gare en bas à droite -> ouest -> nord -> est, hors cadre en haut) ;
//          repères : gare + quai + château d'eau, une borie, deux cabanons ; groupes de 4-7 pièces différentes.
// MOTION   charnières du kit ; les zones gardées à plat se déplient en cascade (0.12 s entre pièces) ;
//          balancement léger des lavandes ; l'autorail roule sur la voie quand les 5 sémaphores sont levés.
// LIFE     papillons sur les lavandes, abeilles aux ruches, hirondelles, ombres de nuages, un chat, des poules.
// TYPES    croix (oliviers, cyprès, sémaphores en demi-croix), cartes (buissons, rochers, accessoires),
//          box fold (gare, cabanons), prisme (château d'eau, autorail), tranches de dôme (borie),
//          plateforme (quai, marché dessus), voiles empilées (collines du fond).
// SOUND    plis de papier du kit, rares.
// BANNED   tells de look.md 12 ; aucune couleur reprise de l'exemple ; pas de rivière.
// QA       vue d'ensemble, une zone qui se déplie, la fin avec l'autorail en marche.
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, layeredCard, clusterLayout, platform, boxFold, prismFold } from 'papercraft/lib/paperkit-3d.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { createHarness } from './harness.js';

// ---- 1. palette (dérivée du plateau provençal) -------------------------------------------------------------------
const C = {
  ground: '#d4d0bd', washA: '#c9c8ab', washB: '#d9d2b9', washC: '#cfcbbf',
  lav: '#8a72b6', lavDeep: '#664f93', lavPale: '#b6a2d6', lavLeaf: '#8d9873',
  olive: '#7d8a52', oliveDeep: '#56653a', oliveSilver: '#c3c9a4', bark: '#7a6450',
  cypress: '#4f6a45', broom: '#e2b737', wheat: '#ddb153', poppy: '#c9442e', cream: '#f3e9d2',
  stone: '#cbbd9e', stoneDeep: '#a3927a', render: '#ead9b8', tile: '#b8674a', shutter: '#5b8a8f',
  wood: '#9a6a40', woodDark: '#6e4a2e', ink: '#3b2633', iron: '#4f6158',
  ballast: '#bdb3a0', sleeper: '#7c5a3e', rail: '#57505a',
  red: '#c63c30', vest: '#ef7a26', navy: '#2e3c63', skin: '#f1d9b8',
};
const sh = P2.shade, mix = P2.mix, rgba = P2.rgba, D = P2.draw2;

// ---- 2. the line: one route drives the print, the placement, the zones and the railcar -----------------------------
const ROUTE = [[64, 2.2], [30, 2.2], [16, 2.2], [5, 2.2], [-6, -1], [-14, -8], [-15.5, -17], [-9, -24.5], [3, -27.5], [15, -31], [22, -38], [30, -47], [64, -58]];
const line = P2.pathLine(ROUTE, { step: 0.5 });
const TP = line.pts, TS = [0];
for (let i = 1; i < TP.length; i++) TS.push(TS[i - 1] + Math.hypot(TP[i][0] - TP[i - 1][0], TP[i][1] - TP[i - 1][1]));
const TLEN = TS[TS.length - 1];
/** The track at arc length s: [x, z, tx, tz] (tangent toward growing s: west, then north, then east). */
function trackAt(s) {
  s = Math.max(0, Math.min(TLEN, s));
  let i = 1; while (i < TS.length - 1 && TS[i] < s) i++;
  const t = (s - TS[i - 1]) / ((TS[i] - TS[i - 1]) || 1), [ax, az] = TP[i - 1], [bx, bz] = TP[i], L = Math.hypot(bx - ax, bz - az) || 1;
  return [ax + (bx - ax) * t, az + (bz - az) * t, (bx - ax) / L, (bz - az) / L];
}
const sAtX = (x) => { let best = 0, d = Infinity; TP.forEach(([px, pz], i) => { if (pz > 0 && Math.abs(px - x) < d) { d = Math.abs(px - x); best = TS[i]; } }); return best; };
const S_STATION = sAtX(13);

// the five signal zones along the line, alternating sides, and the chalk ring each one sits in
const ZONES = [11, 24, 37, 50, 62].map((ds, i) => {
  const [x, z, tx, tz] = trackAt(S_STATION + ds), side = [1, -1, 1, -1, 1][i];
  const nx = -tz * side, nz = tx * side;                       // the normal on the chosen side
  return { i, sig: [x + nx * 2.7, z + nz * 2.7], c: [x + nx * 4.6, z + nz * 4.6], n: [nx, nz], hinges: [], up: false };
});

// a phone held upright: a longer view with the hero centred across it (the 16:9 framing keeps him lower right)
const NARROW = innerWidth < innerHeight;
const H = createHarness({
  ground: C.ground, stock: '#f4f0e4', view: NARROW ? { pitch: 47, dist: 78, target: [9.5, 1.5, -10], follow: [-1.5, -8] } : { pitch: 47, dist: 58, target: [1, 1.5, -9] }, play: true, clickFold: false,
  walkArea: { x0: -27, x1: 28, z0: -34, z1: 5 }, light: { leak: '#94603e', key: '#ffe4c4' },
  lens: { haze: '#cfc9b4', tint: [1.0, 0.99, 1.0], saturation: 1.02 },
});
const { walk, flags } = H;
let RES = 1;
const popup = (pts, paint, o = {}) => H.popup(pts, paint, { res: RES, ...o });

// ---- 3. the printed ground -----------------------------------------------------------------------------------------
const FIELDS = [   // lavender fields: x, z, w, d, angle
  [21, -17, 14, 9, 0.18], [-24, -24, 12, 8, -0.3], [-1, -38, 16, 7, 0.08], [34, -4, 10, 8, -0.15],
];
const WHEAT = [-21, -6, 10, 7, 0.35];
const inRect = (x, z, [fx, fz, fw, fd, fa], m = 0) => { const ca = Math.cos(-fa), sa = Math.sin(-fa), u = (x - fx) * ca - (z - fz) * sa, v = (x - fx) * sa + (z - fz) * ca; return Math.abs(u) < fw / 2 + m && Math.abs(v) < fd / 2 + m; };
const rectPts = ([fx, fz, fw, fd, fa]) => [[-fw / 2, -fd / 2], [fw / 2, -fd / 2], [fw / 2, fd / 2], [-fw / 2, fd / 2]].map(([u, v]) => [fx + u * Math.cos(fa) - v * Math.sin(fa), fz + u * Math.sin(fa) + v * Math.cos(fa)]);
const offsetLine = (pts, d) => pts.map(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(bx - ax, bz - az) || 1; return [x - (bz - az) / L * d, z + (bx - ax) / L * d]; });

H.printGround(({ g, ppu, X, Z, rnd, washes, torn, bandOf, line: stroke, drifts }) => {
  washes([C.washA, C.washA, C.washB, C.washB, C.washC]);
  // lavender fields: torn sage beds, rows of violet dabs following the field's angle
  for (const F of FIELDS) {
    const [fx, fz, fw, fd, fa] = F;
    torn(rectPts(F), rgba('#b8b48f', 0.85));
    g.save(); g.translate(X(fx), Z(fz)); g.rotate(fa);
    for (let v = -fd / 2 + 0.7; v < fd / 2 - 0.3; v += 1.25) for (let u = -fw / 2 + 0.5; u < fw / 2 - 0.4; u += 0.42 + rnd() * 0.18) {
      const r = (0.26 + rnd() * 0.12) * ppu, y = (v + (rnd() - 0.5) * 0.12) * ppu;
      g.fillStyle = rgba(sh(C.lavDeep, -0.1), 0.45); g.beginPath(); g.ellipse(u * ppu + r * 0.25, y + r * 0.3, r * 1.1, r * 0.8, 0, 0, 7); g.fill();
      g.fillStyle = rgba(rnd() < 0.7 ? C.lav : C.lavPale, 0.8); g.beginPath(); g.ellipse(u * ppu, y, r, r * 0.72, 0, 0, 7); g.fill();
    }
    g.restore();
  }
  // the wheat patch: torn ochre paper with furrows
  {
    const [fx, fz, fw, fd, fa] = WHEAT;
    torn(rectPts(WHEAT), rgba(C.wheat, 0.8));
    g.save(); g.translate(X(fx), Z(fz)); g.rotate(fa);
    g.strokeStyle = rgba(sh(C.wheat, -0.35), 0.45); g.lineWidth = 0.2 * ppu;
    for (let v = -fd / 2 + 0.6; v < fd / 2 - 0.3; v += 0.85) { g.beginPath(); g.moveTo((-fw / 2 + 0.5) * ppu, v * ppu); g.lineTo((fw / 2 - 0.5) * ppu, (v + 0.15) * ppu); g.stroke(); }
    g.restore();
  }
  // the line: a torn ballast bed, a darker fringe, sleepers across it, two rails with a pale lit edge
  torn(bandOf(TP, 1.75), rgba('#c9bfa8', 0.95));
  torn(bandOf(TP, 1.45), C.ballast, 'rgba(250,244,230,0.35)');
  for (let k = 0; k < 2600; k++) {   // ballast grit
    const i = Math.floor(rnd() * TP.length), [x, z] = TP[i], a = rnd() * 6.283, r = rnd() * 1.4;
    g.fillStyle = rnd() < 0.55 ? rgba(sh(C.ballast, -0.28), 0.5) : rgba('#f6efe0', 0.55);
    g.beginPath(); g.ellipse(X(x + Math.cos(a) * r), Z(z + Math.sin(a) * r), (0.05 + rnd() * 0.06) * ppu, (0.04 + rnd() * 0.04) * ppu, rnd() * 3, 0, 7); g.fill();
  }
  for (let s = 0.4; s < TLEN; s += 0.95) {
    const [x, z, tx, tz] = trackAt(s), w = 2.7 + (rnd() - 0.5) * 0.15;
    g.save(); g.translate(X(x), Z(z)); g.rotate(Math.atan2(tz, tx) + Math.PI / 2 + (rnd() - 0.5) * 0.05);
    g.fillStyle = rgba(sh(C.sleeper, -0.35), 0.45); g.fillRect(-w / 2 * ppu + 1.5, -0.2 * ppu + 2, w * ppu, 0.4 * ppu);
    g.fillStyle = rgba(sh(C.sleeper, (rnd() - 0.5) * 0.16), 0.95); g.fillRect(-w / 2 * ppu, -0.2 * ppu, w * ppu, 0.4 * ppu);
    g.fillStyle = rgba('#f0dcc0', 0.3); g.fillRect(-w / 2 * ppu, -0.2 * ppu, w * ppu, 0.07 * ppu);
    g.restore();
  }
  for (const sd of [-1, 1]) {
    const rail = offsetLine(TP, sd * 0.72);
    stroke(rail, 0.2, rgba(sh(C.rail, -0.3), 0.6));
    stroke(rail, 0.15, C.rail);
    stroke(offsetLine(TP, sd * 0.72 - 0.04), 0.05, rgba('#e8e0d4', 0.75));
  }
  // chalk rings round each signal zone: where the world is still folded
  g.lineCap = 'round';
  for (const Zn of ZONES) {
    const [cx, cz] = Zn.c;
    g.strokeStyle = rgba('#fbf5e6', 0.85); g.lineWidth = 0.22 * ppu; g.setLineDash([0.7 * ppu, 0.45 * ppu]);
    g.beginPath(); g.arc(X(cx), Z(cz), 3.6 * ppu, 0, 7); g.stroke(); g.setLineDash([]);
    g.strokeStyle = rgba(C.red, 0.55); g.lineWidth = 0.18 * ppu;
    for (const a of [0.6, 2.4, 4.2]) { g.beginPath(); g.arc(X(cx), Z(cz), 3.95 * ppu, a, a + 0.5); g.stroke(); }
  }
  // garrigue in drifts: thyme cushions with pink dots, grass ticks, pale pebbles
  drifts((x, y) => {
    const q = rnd();
    if (q < 0.5) { g.strokeStyle = rgba(rnd() < 0.5 ? '#7d8656' : '#9aa070', 0.7); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 4 - rnd() * 5); g.stroke(); }
    else if (q < 0.8) { g.fillStyle = rgba('#8e9670', 0.75); g.beginPath(); g.ellipse(x, y, 4, 2.6, 0, 0, 7); g.fill(); g.fillStyle = rgba('#d9a2b8', 0.85); for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + (rnd() - 0.5) * 6, y - 1 + (rnd() - 0.5) * 3, 1.2, 0, 7); g.fill(); } }
    else { g.fillStyle = rgba('#f4ecdc', 0.8); g.beginPath(); g.ellipse(x, y, 2 + rnd() * 2, 1.4 + rnd(), rnd() * 3, 0, 7); g.fill(); }
  }, { n: 11000 });
}, { seed: 33 });

// ---- 4. the pieces: silhouettes + layered prints designed for this plateau -----------------------------------------
let rnd = P2.rng(101);
const between = (a, b) => a + rnd() * (b - a);
const base2 = (P, c, k = 0.1, felt = 0.5) => { P.gradient(sh(c, k), sh(c, -k), 0.5); P.felt(felt); };
const shadeIn = (P, c, a = 0.35) => P.innerShade(sh(c, -0.6), { alpha: a, blurPx: 8 });
const mound = (w, h, lobes = 6, depth = 0.16) => P2.shape.mound(rnd, { w, h, lobes, depth });
const text = (g, s, x, y, size, color, align = 'center') => {   // print text in shape units (y up)
  g.save(); g.translate(x, y); g.scale(size / 40, -size / 40); g.fillStyle = color; g.font = '700 40px Georgia, serif'; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
};

// olive tree: a gnarled split trunk, a silvery crown of lobes; narrow leaves in silver and deep olive, purple olives
function olive(h = between(6.2, 7.6)) {
  const w = h * between(0.95, 1.1), r = P2.rng(Math.floor(rnd() * 1e6));
  const blobs = Array.from({ length: 6 }, (_, i) => { const u = (i + 0.5) / 6 - 0.5; return { x: u * w * 0.78, y: h * (0.6 + 0.14 * Math.cos(u * 3) + (r() - 0.5) * 0.05), rx: w * (0.18 + r() * 0.05), ry: h * (0.19 + r() * 0.04) }; });
  const trunkTop = h * 0.56;
  const pts = P2.roughen(P2.fromDrawing((g) => {
    D.poly(g, [[-0.6, 0], [0.65, 0], [0.4, trunkTop * 0.45], [0.95, trunkTop], [0.15, trunkTop * 0.75], [-0.8, trunkTop], [-0.35, trunkTop * 0.42]]);
    for (const b of blobs) D.ell(g, b.x, b.y, b.rx, b.ry);
    D.ell(g, 0, h * 0.62, w * 0.36, h * 0.14);
  }, { w: w + 1.2, h: h + 0.6, name: 'olive' }), rnd);
  const paint = (P) => {
    base2(P, mix(C.olive, C.oliveSilver, 0.35), 0.1);
    P.layer((g) => { g.fillStyle = sh(C.olive, -0.18); for (const b of blobs) D.ell(g, b.x + b.rx * 0.18, b.y - b.ry * 0.22, b.rx * 0.72, b.ry * 0.62); }, sh(C.olive, -0.18));
    P.layer((g) => {
      g.fillStyle = C.bark;
      P2.fillLimb(g, -0.3, 0, -0.5, trunkTop * 0.6, -1.4, h * 0.6, 0.62, 0.2);
      P2.fillLimb(g, 0.35, 0, 0.7, trunkTop * 0.6, 1.3, h * 0.64, 0.6, 0.2);
      P2.fillLimb(g, 0.1, trunkTop * 0.5, 0, trunkTop, 0.2, h * 0.78, 0.36, 0.14);
    }, C.bark, { lip: 0.8 });
    const leaves = [];
    for (let k = 0; k < 26; k++) { const b = blobs[k % blobs.length], a = r() * 6.283, rr = Math.sqrt(r()) * 0.95; leaves.push({ x: b.x + Math.cos(a) * b.rx * rr, y: b.y + Math.sin(a) * b.ry * rr, L: w * (0.12 + r() * 0.04), a: r() * 6.283, c: k % 10 < 6 ? C.oliveSilver : k % 10 < 9 ? C.oliveDeep : sh(C.olive, 0.12) }); }
    P.layer((g) => { for (const q of leaves) { g.fillStyle = q.c; P2.fillLeaf(g, q.x, q.y, q.L, q.a, 0.24); } }, C.oliveSilver);
    P.layer((g) => { g.fillStyle = '#4b2c48'; for (let k = 0; k < 9; k++) { const b = blobs[k % blobs.length]; D.ell(g, b.x + (r() - 0.5) * b.rx, b.y + (r() - 0.4) * b.ry, w * 0.028, w * 0.034); } }, '#4b2c48');
    shadeIn(P, C.olive, 0.3);
  };
  return [pts, paint];
}
// cypress: a tall flame of dark green tiers, pale sage tips, a few ochre cones
function cypress(h = between(8, 10.5)) {
  const w = h * between(0.22, 0.27), r = P2.rng(Math.floor(rnd() * 1e6)), n = 40, prof = [];
  for (let i = 0; i <= n; i++) { const t = i / n, y = 0.55 + t * (h - 0.55); prof.push([w / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.9)), 0.4) * (1 - 0.3 * t), y]); }
  const pts = P2.roughen([[-0.22, 0], [0.22, 0], [0.22, 0.6], ...prof.map(([x, y]) => [x, y]), ...prof.slice().reverse().map(([x, y]) => [-x, y]), [-0.22, 0.6]], rnd);
  const paint = (P) => {
    base2(P, C.cypress, 0.12);
    for (let k = 0; k < 6; k++) {   // tiers from the bottom up, each overlapping the one below
      const y0 = 0.7 + k * (h - 1) / 6, y1 = y0 + (h - 1) / 6 * 1.25;
      P.layer((g) => { g.fillStyle = sh(C.cypress, k % 2 ? 0.08 : -0.06); g.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12, y = y0 + (y1 - y0) * (1 - Math.sin(t * Math.PI) * 0.25), x = (t - 0.5) * w * 1.2; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineTo(w, y1 + 2); g.lineTo(-w, y1 + 2); g.closePath(); g.fill(); }, C.cypress, { rim: 0.6 });
    }
    P.layer((g) => { for (let k = 0; k < 16; k++) { g.fillStyle = k % 4 ? sh('#9db086', -0.05) : '#c2c79e'; P2.fillLeaf(g, (r() - 0.5) * w * 0.6, 1 + r() * (h - 2), w * 0.28, Math.PI / 2 + (r() - 0.5) * 0.8, 0.3); } }, '#9db086');
    P.layer((g) => { g.fillStyle = '#b9843f'; for (let k = 0; k < 5; k++) D.ell(g, (r() - 0.5) * w * 0.5, 2 + r() * (h - 4), w * 0.07, w * 0.08); }, '#b9843f');
    shadeIn(P, C.cypress, 0.3);
  };
  return [pts, paint];
}
// lavender clump: a grey-green cushion, fat violet spikes fanned above it
function lavender(w = between(3.2, 4.2), r = P2.rng(Math.floor(rnd() * 1e6))) {
  const h = w * 0.42, spikes = Array.from({ length: 9 }, (_, i) => { const u = (i + 0.5) / 9 - 0.5, x = u * w * 0.78; return { x, y: h * Math.sqrt(Math.max(0, 1 - (2 * x / w) ** 2)) * 0.72, a: Math.PI / 2 - u * 1.1 + (r() - 0.5) * 0.2, L: h * (0.8 + r() * 0.3) }; });
  const tip = (s, k = 1) => [s.x + Math.cos(s.a) * s.L * k, s.y + Math.sin(s.a) * s.L * k];
  const pts = P2.roughen(P2.fromDrawing((g) => {
    g.beginPath(); g.ellipse(0, 0, w / 2, h, 0, 0, Math.PI); g.fill();
    for (const s of spikes) { const [tx, ty] = tip(s, 0.55); g.beginPath(); g.ellipse(tx, ty, s.L * 0.55, s.L * 0.13, s.a, 0, 7); g.fill(); }
  }, { w: w + 0.8, h: h * 2.3, name: 'lavender' }), rnd);
  const paint = (P) => {
    base2(P, C.lavLeaf, 0.1);
    P.layer((g) => { for (let k = 0; k < 14; k++) { g.fillStyle = k % 3 ? sh(C.lavLeaf, 0.14) : '#b9bf9c'; P2.fillLeaf(g, (r() - 0.5) * w * 0.8, h * (0.2 + r() * 0.5), h * 0.6, Math.PI / 2 + (r() - 0.5) * 1.6, 0.2); } }, C.lavLeaf);
    P.layer((g) => { spikes.forEach((s, i) => { const [tx, ty] = tip(s, 0.62); g.fillStyle = i % 3 === 1 ? C.lavDeep : C.lav; g.beginPath(); g.ellipse(tx, ty, s.L * 0.44, s.L * 0.12, s.a, 0, 7); g.fill(); }); }, C.lav, { rim: 0.5 });
    P.layer((g) => { g.fillStyle = C.lavPale; spikes.forEach((s) => { const [tx, ty] = tip(s, 0.9); D.ell(g, tx, ty, s.L * 0.08, s.L * 0.08); }); }, C.lavPale);
    shadeIn(P, C.lavLeaf, 0.3);
  };
  return [pts, paint];
}
// broom (genêt): a green mound under yellow flower sprays
function broom(w = between(3.4, 4.6)) {
  const h = w * 0.55, r = P2.rng(Math.floor(rnd() * 1e6));
  const pts = P2.roughen(mound(w, h, 7, 0.2), rnd);
  const paint = (P) => {
    base2(P, '#6f7d43', 0.1);
    P.layer((g) => { g.fillStyle = sh('#6f7d43', 0.16); for (let k = 0; k < 10; k++) P2.fillLeaf(g, (r() - 0.5) * w * 0.7, h * 0.15, h * (0.7 + r() * 0.4), Math.PI / 2 + (r() - 0.5) * 1.2, 0.16); }, '#6f7d43');
    P.layer((g) => { for (let k = 0; k < 26; k++) { const a = r() * Math.PI, rr = 0.35 + r() * 0.6; g.fillStyle = k % 5 ? C.broom : '#e8873a'; D.ell(g, Math.cos(a) * w / 2 * rr, Math.sin(a) * h * rr * 0.95, w * 0.045, w * 0.04); } }, C.broom);
    shadeIn(P, '#6f7d43', 0.3);
  };
  return [pts, paint];
}
// limestone rock: pale faces, a darker facet turned from the key, a lichen cap
function rock(w = between(2.8, 4.2)) {
  const h = w * between(0.45, 0.62), r = P2.rng(Math.floor(rnd() * 1e6));
  const pts = P2.roughen(mound(w, h, 3, 0.1), rnd, { amp: w * 0.025 });
  const paint = (P) => {
    const { box } = P;
    base2(P, C.stone, 0.12, 0.55);
    P.layer((g) => { g.fillStyle = sh(C.stone, -0.2); g.beginPath(); g.moveTo(box.x0 + box.w * 0.55, box.y1 + 1); g.lineTo(box.x1 + 1, box.y0 + box.h * 0.5); g.lineTo(box.x1 + 1, box.y0 - 1); g.lineTo(box.x0 + box.w * 0.38, box.y0 - 1); g.closePath(); g.fill(); }, sh(C.stone, -0.2), { lip: 0.7 });
    P.layer((g) => { g.fillStyle = sh(C.stone, 0.12); g.beginPath(); g.moveTo(box.x0 - 1, box.y0 + box.h * 0.6); g.lineTo(box.x0 + box.w * 0.3, box.y1 + 1); g.lineTo(box.x0 + box.w * 0.45, box.y0 + box.h * 0.55); g.closePath(); g.fill(); }, sh(C.stone, 0.12));
    P.marks('dot', { color: sh(C.stone, -0.45), alpha: 0.35, size: 0.03, density: 0.5 });
    P.layer((g) => { for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#c9a54a' : '#98a27a'; D.ell(g, box.x0 + box.w * (0.2 + r() * 0.6), box.y1 - box.h * (0.08 + r() * 0.12), w * 0.06, w * 0.035); } }, '#c9a54a');
    shadeIn(P, C.stone, 0.35);
  };
  return [pts, paint];
}
// poppies: a fan of fat blades and red cups on stems
function poppies(w = between(2.2, 2.8)) {
  const seed = Math.floor(rnd() * 1e6);
  return P2.drawnPiece((g, ink) => {
    const r = P2.rng(seed);
    g.fillStyle = ink('#7f8a4f'); for (let k = 0; k < 7; k++) P2.fillLeaf(g, (r() - 0.5) * w * 0.5, 0.45, 0.95 + r() * 0.3, Math.PI / 2 + (k - 3) * 0.22, 0.24);
    g.fillStyle = ink('#6c7744'); for (const x of [-0.55, 0.05, 0.6]) D.rect(g, x - 0.05, 0, 0.1, 1.45 + Math.abs(x) * 0.2, 0.04);
    for (const [x, y] of [[-0.55, 1.55], [0.05, 1.6], [0.6, 1.62]]) { g.fillStyle = ink(C.poppy); D.ell(g, x, y, 0.34, 0.26); g.fillStyle = ink('#3a1e22', 'print'); D.ell(g, x, y + 0.04, 0.1, 0.08); }
  }, { w: w + 0.4, h: 2.05, name: 'poppies' });
}
// sunflowers: three fat stems, leaves, yellow heads with brown hearts
function sunflowers() {
  const seed = Math.floor(rnd() * 1e6);
  return P2.drawnPiece((g, ink) => {
    const r = P2.rng(seed), heads = [[-0.7, 2.5], [0.1, 3.0], [0.8, 2.3]];
    g.fillStyle = ink('#6f7d43'); for (const [x, y] of heads) D.rect(g, x * 0.6 - 0.08, 0, 0.16, y, 0.06);
    g.fillStyle = ink('#7f8f4c'); for (const [x, y] of heads) { P2.fillLeaf(g, x * 0.6 + 0.05, y * 0.45, 0.75, 0.5 + r() * 0.3, 0.42); P2.fillLeaf(g, x * 0.6 - 0.05, y * 0.6, 0.65, Math.PI - 0.5, 0.42); }
    D.rect(g, -0.6, 0, 1.2, 0.25, 0.08);
    for (const [x, y] of heads) { g.fillStyle = ink(C.broom); D.ell(g, x, y, 0.55, 0.5); g.fillStyle = ink('#6a3f22'); D.ell(g, x, y, 0.25, 0.23); g.fillStyle = ink('#f0c64a', 'print'); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; D.ell(g, x + Math.cos(a) * 0.4, y + Math.sin(a) * 0.36, 0.06, 0.06); } }
  }, { w: 3.2, h: 3.7, name: 'sunflowers' });
}
// beehive: two painted supers on a stand, a tin lid, the entrance slot
function beehive(c = rnd() < 0.5 ? '#e9dcc0' : '#9ebdbf') {
  return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.woodDark); D.rect(g, -0.6, 0, 0.14, 0.5); D.rect(g, 0.46, 0, 0.14, 0.5); D.rect(g, -0.7, 0.4, 1.4, 0.14);
    g.fillStyle = ink(c); D.rect(g, -0.62, 0.52, 1.24, 0.6, 0.04);
    g.fillStyle = ink(sh(c, -0.08)); D.rect(g, -0.62, 1.1, 1.24, 0.55, 0.04);
    g.fillStyle = ink('#a8a39b'); D.poly(g, [[-0.78, 1.62], [0.78, 1.62], [0.66, 1.86], [-0.66, 1.86]]);
    g.fillStyle = ink('#3b2633', 'print'); D.rect(g, -0.3, 0.58, 0.6, 0.06);
    g.fillStyle = ink(C.broom, 'print'); D.ell(g, 0.25, 0.85, 0.05, 0.05); D.ell(g, -0.2, 1.35, 0.05, 0.05);
  }, { w: 1.7, h: 1.95, name: 'beehive' });
}
// drystone wall: a long low card, courses of stone, a coping of rounded stones, thyme at its foot
function wall(w = between(4.5, 6.5)) {
  const r = P2.rng(Math.floor(rnd() * 1e6)), top = Array.from({ length: 11 }, (_, i) => [w / 2 - i * w / 10, 1.25 + (r() - 0.5) * 0.18]);
  const pts = [[-w / 2, 0], [w / 2, 0], ...top];
  const paint = (P) => {
    base2(P, C.stone, 0.08);
    P.marks('brick', { color: sh(C.stone, -0.42), alpha: 0.55, size: 0.22 });
    P.layer((g) => { g.fillStyle = sh(C.stone, 0.12); for (let x = -w / 2 + 0.25; x < w / 2; x += 0.5 + r() * 0.15) D.ell(g, x, 1.2, 0.3, 0.17); }, sh(C.stone, 0.12));
    P.layer((g) => { for (let k = 0; k < 5; k++) { g.fillStyle = '#8e9670'; D.ell(g, (r() - 0.5) * w * 0.9, 0.12, 0.35, 0.2); g.fillStyle = '#d9a2b8'; D.ell(g, (r() - 0.5) * w * 0.9, 0.22, 0.06, 0.06); } }, '#8e9670');
    shadeIn(P, C.stone, 0.3);
  };
  return [pts, paint];
}
// stack of spare sleepers
function sleepers() {
  return P2.drawnPiece((g, ink) => {
    for (let k = 0; k < 4; k++) { const y = k * 0.32, dx = (k % 2 ? 0.15 : -0.1); g.fillStyle = ink(sh(C.sleeper, (k % 2 ? 0.08 : -0.04))); D.rect(g, -1.3 + dx, y, 2.6, 0.35, 0.05); g.fillStyle = ink(sh(C.sleeper, -0.3), 'print'); D.rect(g, -1.3 + dx, y + 0.13, 2.6, 0.03); D.rect(g, 1.12 + dx, y + 0.04, 0.12, 0.22, 0.04); }
    g.fillStyle = ink(C.red, 'print'); D.rect(g, -0.7, 0.36, 0.25, 0.22, 0.02);
  }, { w: 2.9, h: 1.35, name: 'sleepers' });
}
// tool crate with a striped band
function crate() {
  return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.wood); D.rect(g, -0.65, 0, 1.3, 1.05, 0.05);
    g.fillStyle = ink(sh(C.wood, -0.25), 'print'); for (const y of [0.33, 0.68]) D.rect(g, -0.65, y, 1.3, 0.04);
    g.fillStyle = ink(sh(C.wood, 0.15)); D.rect(g, -0.65, 0.95, 1.3, 0.12, 0.03);
    g.fillStyle = ink(C.red); D.rect(g, -0.65, 0.42, 1.3, 0.2);
    g.fillStyle = ink(C.cream, 'print'); for (let k = 0; k < 4; k++) D.poly(g, [[-0.55 + k * 0.32, 0.42], [-0.42 + k * 0.32, 0.42], [-0.3 + k * 0.32, 0.62], [-0.43 + k * 0.32, 0.62]]);
  }, { w: 1.5, h: 1.15, name: 'crate' });
}
// kilometre post: a cream post with a red cap and a printed number
function milestone(n) {
  return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.cream); D.rect(g, -0.32, 0, 0.64, 1.1, 0.12);
    g.fillStyle = ink(C.red); g.beginPath(); g.ellipse(0, 1.08, 0.32, 0.26, 0, 0, Math.PI); g.fill(); D.rect(g, -0.32, 0.98, 0.64, 0.1);
    if (n != null) text(g, String(n), 0, 0.62, 0.34, C.ink);
  }, { w: 0.8, h: 1.4, name: 'milestone' });
}
// station lamp post: cast iron, a glowing lantern
function lampPost() {
  const pts = P2.fromDrawing((g) => { D.rect(g, -0.26, 0, 0.52, 0.2, 0.05); D.rect(g, -0.08, 0, 0.16, 2.9); D.rect(g, -0.26, 2.8, 0.52, 0.55, 0.06); D.poly(g, [[-0.34, 3.32], [0, 3.6], [0.34, 3.32]]); }, { w: 0.8, h: 3.7, name: 'lamp' });
  const paint = (P) => { const { box, g } = P; P.fill(C.iron); P.draw(() => { g.fillStyle = '#ffd98a'; g.fillRect(box.x0 + box.w * 0.25, box.y0 + box.h * 0.78, box.w * 0.5, box.h * 0.12); }); P.glow((gg) => { gg.fillStyle = '#fff'; gg.fillRect(box.x0 + box.w * 0.25, box.y0 + box.h * 0.78, box.w * 0.5, box.h * 0.12); }); shadeIn(P, C.iron, 0.4); };
  return [pts, paint];
}
// bench
function bench() {
  return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.iron); D.rect(g, -0.95, 0, 0.12, 1.05); D.rect(g, 0.83, 0, 0.12, 1.05);
    g.fillStyle = ink(C.wood); D.rect(g, -1.05, 0.42, 2.1, 0.16, 0.03); D.rect(g, -1.05, 0.72, 2.1, 0.14, 0.03); D.rect(g, -1.05, 0.95, 2.1, 0.14, 0.03);
  }, { w: 2.3, h: 1.2, name: 'bench' });
}
// the station nameboard on two posts
function nameboard() {
  return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.iron); D.rect(g, -1.7, 0, 0.14, 2.2); D.rect(g, 1.56, 0, 0.14, 2.2);
    g.fillStyle = ink(C.cream); D.rect(g, -1.95, 1.55, 3.9, 0.8, 0.08);
    g.fillStyle = ink(C.lavDeep, 'print'); D.rect(g, -1.95, 1.55, 3.9, 0.1);
    text(g, 'LAVANDIÈRES', 0, 1.97, 0.42, C.ink);
  }, { w: 4.1, h: 2.45, name: 'nameboard' });
}
// critters: a tabby cat and hens, drawn as one cut each
function cat() {
  return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink('#c98a4a'); P2.fillLimb(g, -0.55, 0.35, -1.0, 0.5, -0.95, 1.05, 0.14, 0.1);
    g.fillStyle = ink('#d99a55'); D.ell(g, -0.1, 0.42, 0.55, 0.32); D.rect(g, -0.5, 0, 0.14, 0.4, 0.05); D.rect(g, 0.25, 0, 0.14, 0.4, 0.05);
    g.fillStyle = ink('#d99a55'); D.ell(g, 0.45, 0.82, 0.3, 0.26); D.poly(g, [[0.25, 0.98], [0.3, 1.25], [0.42, 1.02]]); D.poly(g, [[0.5, 1.02], [0.64, 1.26], [0.68, 0.96]]);
    g.fillStyle = ink('#f3e6c8'); D.ell(g, 0.48, 0.72, 0.15, 0.1);
    g.fillStyle = ink('#9a5f2e', 'print'); for (const x of [-0.4, -0.15, 0.1]) D.rect(g, x, 0.55, 0.08, 0.18, 0.03);
    g.fillStyle = ink('#2a1608', 'print'); D.ell(g, 0.38, 0.86, 0.04, 0.05); D.ell(g, 0.56, 0.86, 0.04, 0.05);
  }, { w: 2.2, h: 1.35, name: 'cat' });
}
function hen(c = rnd() < 0.5 ? '#efe2c6' : '#b5683a') {
  return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(sh(c, -0.12)); D.poly(g, [[-0.55, 0.5], [-0.85, 1.0], [-0.35, 0.75]]);
    g.fillStyle = ink('#d9a03a'); D.rect(g, -0.08, 0, 0.07, 0.3); D.rect(g, 0.12, 0, 0.07, 0.3);
    g.fillStyle = ink(c); D.ell(g, -0.05, 0.6, 0.55, 0.36); D.ell(g, 0.38, 0.95, 0.2, 0.22);
    g.fillStyle = ink(C.red); D.ell(g, 0.38, 1.18, 0.12, 0.08); D.ell(g, 0.5, 0.86, 0.05, 0.08);
    g.fillStyle = ink('#e8a03a'); D.poly(g, [[0.54, 0.98], [0.72, 0.94], [0.54, 0.9]]);
    g.fillStyle = ink(sh(c, -0.2), 'print'); D.ell(g, -0.1, 0.6, 0.3, 0.16);
    g.fillStyle = ink('#2a1608', 'print'); D.ell(g, 0.43, 1.0, 0.035, 0.04);
  }, { w: 1.7, h: 1.35, name: 'hen' });
}
// the signal: a stone plinth, an iron mast with a printed ladder, the red disc with a cream ring, a lamp box
function signal() {
  return P2.drawnPiece((g, ink) => {
    g.fillStyle = ink(C.stone); D.rect(g, -0.55, 0, 1.1, 0.5, 0.06);
    g.fillStyle = ink(C.iron); D.rect(g, -0.13, 0.4, 0.26, 4.6, 0.05);
    g.fillStyle = ink(sh(C.iron, 0.25), 'print'); for (let y = 0.7; y < 4.4; y += 0.38) D.rect(g, -0.13, y, 0.26, 0.05);
    g.fillStyle = ink(C.cream); D.ell(g, 0.62, 4.55, 0.68, 0.68);
    g.fillStyle = ink(C.red); D.ell(g, 0.62, 4.55, 0.52, 0.52);
    g.fillStyle = ink(C.cream, 'print'); D.rect(g, 0.25, 4.47, 0.74, 0.16, 0.04);
    g.fillStyle = ink(C.iron); D.rect(g, -0.62, 3.55, 0.5, 0.55, 0.06); D.rect(g, -0.12, 3.7, 0.3, 0.16);
    g.fillStyle = ink('#ffd98a', 'print'); D.ell(g, -0.37, 3.82, 0.13, 0.13);
    g.fillStyle = ink(C.iron); D.poly(g, [[-0.2, 5.0], [0.2, 5.0], [0, 5.25]]);
  }, { w: 2.9, h: 5.4, name: 'signal' });
}
// a far garrigue hill sail (stacked back to front)
function hillSail(w, h, col) {
  const pts = P2.roughen(P2.shape.hill(rnd, { w, h, bumps: 2 }), rnd);
  const r = P2.rng(Math.floor(rnd() * 1e6));
  const paint = (P) => {
    const { box } = P;
    base2(P, col, 0.08);
    P.layer((g) => { g.fillStyle = sh(col, 0.14); g.beginPath(); g.moveTo(box.x0 - 1, box.y1 + 1); g.lineTo(box.x1 + 1, box.y1 + 1); g.lineTo(box.x1 + 1, box.y1 - box.h * 0.22); for (let x = box.x1; x > box.x0; x -= w / 14) g.lineTo(x, box.y1 - box.h * (0.16 + r() * 0.1)); g.closePath(); g.fill(); }, sh(col, 0.14));
    P.layer((g) => { for (let k = 0; k < 18; k++) { g.fillStyle = k % 3 ? sh(col, -0.22) : C.lavDeep; D.ell(g, box.x0 + r() * box.w, box.y0 + r() * box.h * 0.55, w * 0.02, w * 0.014); } }, sh(col, -0.22));
    shadeIn(P, col, 0.25);
  };
  return [pts, paint];
}

// ---- 5. the hero: a cheminot as a 3D paper model (frontal + profile card per part, limbs on pivots) ----------------
const heroDoll = () => {
  const THREE = H.THREE, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const PROFILE = -Math.PI / 2;
  const card = ([pts, paint], seed, { x = 0, y = 0, z = 0, ry = 0, parent = body, back = 'mirror' } = {}) => {
    const m = makeCard(pts, { paint, paper: H.paper, thickness: 0.05, edgeWidth: 0.04, pxPerUnit: 64, seed, back, folds: [] });
    m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
  };
  const plain = (c) => (P) => { P.gradient(sh(c, 0.08), sh(c, -0.1), 0.5); P.felt(); P.innerShade(sh(c, -0.5), { alpha: 0.25, blurPx: 8 }); };
  const boot = '#3a2a24', band = '#f4ecd4';
  const legs = [-0.13, 0.13].map((x, i) => {
    const hip = new THREE.Group(); hip.position.set(x, 0.95, 0); body.add(hip);
    const art = (c, wide) => P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(c); D.rect(gg, -0.11, 0.18, 0.22, 0.82, 0.05); gg.fillStyle = ink(boot); D.rect(gg, -0.13, 0, wide ? 0.36 : 0.26, 0.24, 0.07); gg.fillStyle = ink(band, 'print'); D.rect(gg, -0.11, 0.36, 0.22, 0.05); }, { w: wide ? 0.5 : 0.32, h: 1.0, name: 'leg' });
    card(art(C.navy, false), 410 + i, { y: -0.97, parent: hip }); card(art(sh(C.navy, -0.08), true), 420 + i, { y: -0.97, z: -0.2, ry: PROFILE, parent: hip });
    return hip;
  });
  // torso: navy shirt under an orange safety vest with two cream reflective bands
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(C.navy); D.rect(gg, -0.4, 0, 0.8, 1.3, 0.2);
    gg.fillStyle = ink(C.vest); D.poly(gg, [[-0.4, 0.05], [0.4, 0.05], [0.38, 1.12], [0.14, 1.25], [0.05, 0.62], [-0.05, 0.62], [-0.14, 1.25], [-0.38, 1.12]]);
    gg.fillStyle = ink(band, 'print'); D.rect(gg, -0.4, 0.28, 0.8, 0.09); D.rect(gg, -0.4, 0.52, 0.8, 0.09);
    gg.fillStyle = ink('#2a1e30', 'print'); D.rect(gg, -0.3, 0.75, 0.16, 0.14, 0.03);
  }, { w: 0.85, h: 1.3, name: 'vest' }), 401, { y: 0.78, back: (P) => { plain(C.vest)(P); P.draw((gg) => { gg.fillStyle = band; gg.fillRect(-0.4, 0.95, 0.8, 0.09); gg.fillRect(-0.04, 0.05, 0.08, 1.2); }); } });
  card(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(sh(C.vest, -0.08)); D.rect(gg, -0.25, 0, 0.5, 1.24, 0.16); gg.fillStyle = ink(band, 'print'); D.rect(gg, -0.25, 0.28, 0.5, 0.09); D.rect(gg, -0.25, 0.52, 0.5, 0.09); }, { w: 0.55, h: 1.3, name: 'vest side' }), 402, { y: 0.8, z: -0.28, ry: PROFILE });
  // head: face in front, a moustache; profile behind with an ear
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(C.skin); D.ell(gg, 0, 0.38, 0.36, 0.38);
    gg.fillStyle = ink('#2a1608', 'print'); D.ell(gg, -0.12, 0.38, 0.04, 0.05); D.ell(gg, 0.12, 0.38, 0.04, 0.05);
    gg.fillStyle = ink('#d98a6a', 'print'); D.ell(gg, -0.2, 0.27, 0.05, 0.035); D.ell(gg, 0.2, 0.27, 0.05, 0.035);
    gg.fillStyle = ink('#5a3a28', 'print'); D.ell(gg, 0, 0.2, 0.14, 0.045);
  }, { w: 0.8, h: 0.8, name: 'face' }), 404, { y: 1.88, back: plain('#5a3a28') });
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(sh(C.skin, -0.04)); D.ell(gg, 0, 0.38, 0.34, 0.38);
    gg.fillStyle = ink('#5a3a28'); D.ell(gg, -0.14, 0.42, 0.2, 0.28);
    gg.fillStyle = ink('#e0b896', 'print'); D.ell(gg, 0.0, 0.36, 0.06, 0.08);
    gg.fillStyle = ink('#2a1608', 'print'); D.ell(gg, 0.22, 0.38, 0.03, 0.045);
  }, { w: 0.75, h: 0.8, name: 'head side' }), 405, { y: 1.86, z: -0.37, ry: PROFILE });
  // the cap: navy crown, a red band, a peak toward +z on the profile
  card(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(C.navy); D.rect(gg, -0.36, 0, 0.72, 0.34, 0.12); gg.fillStyle = ink(C.red); D.rect(gg, -0.37, 0.02, 0.74, 0.1, 0.03); gg.fillStyle = ink('#e8c25a', 'print'); D.ell(gg, 0, 0.22, 0.06, 0.05); }, { w: 0.8, h: 0.4, name: 'cap' }), 406, { y: 2.48, z: 0.02 });
  card(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(sh(C.navy, -0.06)); D.rect(gg, -0.34, 0, 0.62, 0.34, 0.12); gg.fillStyle = ink(C.red); D.rect(gg, -0.35, 0.02, 0.64, 0.1, 0.03); gg.fillStyle = ink(sh(C.navy, -0.2)); D.poly(gg, [[0.15, 0.02], [0.55, 0.0], [0.5, 0.1], [0.15, 0.12]]); }, { w: 1.2, h: 0.5, name: 'cap side' }), 407, { y: 2.5, z: -0.37, ry: PROFILE });
  // arms on shoulder pivots; the right hand carries a signal lantern
  const arms = [-0.46, 0.46].map((x, i) => {
    const s = new THREE.Group(); s.position.set(x, 1.98, 0); body.add(s);
    const art = (c) => P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(c); D.rect(gg, -0.1, 0.14, 0.2, 0.66, 0.09); gg.fillStyle = ink(C.skin); D.ell(gg, 0, 0.08, 0.09, 0.08); }, { w: 0.26, h: 0.82, name: 'arm' });
    card(art(C.navy), 430 + i, { y: -0.8, parent: s }); card(art(sh(C.navy, -0.06)), 440 + i, { y: -0.8, z: -0.12, ry: PROFILE, parent: s });
    return s;
  });
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(C.iron); D.rect(gg, -0.18, 0, 0.36, 0.42, 0.05); D.rect(gg, -0.05, 0.4, 0.1, 0.16);
    gg.fillStyle = ink(C.red); D.ell(gg, 0, 0.2, 0.12, 0.12); gg.fillStyle = ink('#ffd98a', 'print'); D.ell(gg, -0.03, 0.23, 0.04, 0.04);
  }, { w: 0.45, h: 0.6, name: 'lantern' }), 450, { y: -1.28, z: 0.05, parent: arms[1] });
  // a canvas satchel on the back
  card(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink('#b49a6a'); D.rect(gg, -0.28, 0, 0.56, 0.5, 0.08); gg.fillStyle = ink(sh('#b49a6a', -0.2)); D.rect(gg, -0.28, 0.32, 0.56, 0.18, 0.06); gg.fillStyle = ink('#e8c25a', 'print'); D.rect(gg, -0.05, 0.28, 0.1, 0.08); }, { w: 0.6, h: 0.55, name: 'satchel' }), 460, { y: 1.15, z: -0.3 });
  // the stride: the phase runs with the distance walked; rotation only, a small double bob
  const legLen = 0.97 * 1.25, stepLen = 1.2, R = stepLen / (2 * legLen);
  const leg = (ph, gait) => { const u = (ph / Math.PI) % 2, A = gait * R; if (u >= 1) return A * (3 - 2 * u); const e = u * u * (3 - 2 * u); return A * (2 * e - 1); };
  g.userData.stride = (walked, gait) => {
    const ph = walked / stepLen * Math.PI, l0 = leg(ph, gait), l1 = leg(ph + Math.PI, gait);
    legs[0].rotation.x = -l0; legs[1].rotation.x = -l1;
    arms[0].rotation.x = l0 * 0.7; arms[1].rotation.x = l1 * 0.25;
    body.position.y = Math.abs(Math.sin(ph)) * 0.04 * gait;
  };
  return g;
};

// ---- 6. buildings: the station, the water tower, cabanons, the borie, the railcar -----------------------------------
const wallPrint = (c = C.render, { quoins = true, windows = 0, shutters = C.shutter, door = false, sign = null, oculus = false } = {}) => (P) => {
  const { box } = P, r = P2.rng(7);
  base2(P, c, 0.07);
  P.layer((gg) => { gg.fillStyle = sh(c, -0.1); for (let k = 0; k < 7; k++) D.ell(gg, box.x0 + r() * box.w, box.y0 + r() * box.h, box.w * 0.04, box.h * 0.03); }, sh(c, -0.1), { shadow: 0.5 });
  if (quoins) P.layer((gg) => { gg.fillStyle = C.stone; for (const x of [box.x0, box.x1 - 0.42]) for (let y = box.y0, k = 0; y < box.y1 - 0.2; y += 0.36, k++) D.rect(gg, x + (k % 2 ? 0 : 0.0), y, k % 2 ? 0.42 : 0.3, 0.32, 0.04); }, C.stone);
  P.layer((gg) => { gg.fillStyle = sh(C.stone, -0.08); gg.fillRect(box.x0 - 1, box.y0 - 1, box.w + 2, 0.4 + 1); }, C.stone);
  const ww = 0.72, wh = 1.25;
  for (let k = 0; k < windows; k++) {
    const cx = box.x0 + box.w * (k + 0.5) / windows, cy = box.y0 + box.h * 0.36;
    if (door && k === Math.floor(windows / 2)) continue;
    P.layer((gg) => { gg.fillStyle = shutters; D.rect(gg, cx - ww / 2 - 0.42, cy, 0.38, wh, 0.03); D.rect(gg, cx + ww / 2 + 0.04, cy, 0.38, wh, 0.03); }, shutters);
    P.layer((gg) => { gg.fillStyle = C.cream; D.rect(gg, cx - ww / 2 - 0.06, cy - 0.12, ww + 0.12, wh + 0.2, 0.05); }, C.cream);
    P.draw((gg) => { gg.fillStyle = '#f7d98a'; gg.fillRect(cx - ww / 2, cy, ww, wh); gg.fillStyle = sh(shutters, -0.25); gg.fillRect(cx - 0.03, cy, 0.06, wh); gg.fillRect(cx - ww / 2, cy + wh * 0.5, ww, 0.06); });
    P.glow((gg) => { gg.fillStyle = '#fff'; gg.fillRect(cx - ww / 2, cy, ww, wh); });
    P.layer((gg) => { gg.fillStyle = C.poppy; for (let j = 0; j < 4; j++) D.ell(gg, cx - ww / 2 + 0.1 + j * 0.18, cy - 0.06, 0.09, 0.09); }, C.poppy);
  }
  if (door) {
    const cx = (box.x0 + box.x1) / 2;
    P.layer((gg) => { gg.fillStyle = shutters; D.rect(gg, cx - 0.55, box.y0 + 0.38, 1.1, 2.05, 0.06); gg.beginPath(); gg.ellipse(cx, box.y0 + 2.4, 0.55, 0.35, 0, 0, Math.PI); gg.fill(); }, shutters, { rim: 0.7 });
    P.draw((gg) => { gg.fillStyle = sh(shutters, -0.3); gg.fillRect(cx - 0.03, box.y0 + 0.45, 0.06, 1.9); gg.fillStyle = '#e8c25a'; gg.beginPath(); gg.arc(cx + 0.3, box.y0 + 1.3, 0.06, 0, 7); gg.fill(); });
  }
  if (sign) { P.layer((gg) => { gg.fillStyle = C.cream; D.rect(gg, box.x0 + box.w * 0.2, box.y1 - 0.85, box.w * 0.6, 0.55, 0.06); }, C.cream); P.draw((gg) => text(gg, sign, (box.x0 + box.x1) / 2, box.y1 - 0.57, 0.36, C.ink)); }
  if (oculus) { P.layer((gg) => { gg.fillStyle = C.stone; D.ell(gg, 0, box.y0 + box.h * 0.72, 0.4, 0.4); }, C.stone); P.draw((gg) => { gg.fillStyle = '#f7d98a'; gg.beginPath(); gg.arc(0, box.y0 + box.h * 0.72, 0.26, 0, 7); gg.fill(); }); }
  shadeIn(P, c, 0.25);
};
const tilePrint = (c = C.tile) => (P) => { base2(P, c, 0.1); P2.scallopTiles(P, P.box, { color: c, rows: 6 }); shadeIn(P, c, 0.2); };
function station(x, z) {
  const node = boxFold({ w: 8.4, d: 4.4, wallH: 3.8, roofH: 2.0, paper: H.paper, seed: 501, print: H.cardOpts(x, z),
    paints: { front: wallPrint(C.render, { windows: 3, door: true, sign: 'GARE' }), gable: wallPrint(C.render, { quoins: false, oculus: true }), roof: tilePrint() } });
  const h = popup(null, null, { node, height: 5.8, x, z, yaw: 0 });
  H.glowing(h.group); walk.wall(x - 4.2, z - 2.2, x + 4.2, z - 2.2, { r: 2.15 });
  return h;
}
function cabanon(x, z, yaw, seed) {
  const node = boxFold({ w: 4.0, d: 3.2, wallH: 2.7, roofH: 1.4, paper: H.paper, seed, print: H.cardOpts(x, z),
    paints: { front: wallPrint(C.stone, { quoins: false, windows: 2, door: true, shutters: seed % 2 ? C.shutter : '#8a6aa8' }), gable: wallPrint(C.stone, { quoins: false }), roof: tilePrint(sh(C.tile, 0.05)) } });
  const h = popup(null, null, { node, height: 4.1, x, z, yaw, solid: 2.1 });
  H.glowing(h.group); return h;
}
function waterTower(x, z) {
  const ngon = (n, r) => Array.from({ length: n }, (_, i) => [Math.cos(-i / n * 6.283) * r, Math.sin(-i / n * 6.283) * r]);
  const tower = (P) => { const { box } = P; base2(P, C.stone, 0.08); P.marks('brick', { color: sh(C.stone, -0.4), alpha: 0.5, size: 0.18 }); P.layer((gg) => { gg.fillStyle = sh(C.render, -0.02); gg.fillRect(box.x0 - 1, box.y1 - box.h * 0.32, box.w + 2, box.h); }, C.render); P.layer((gg) => { gg.fillStyle = C.lavDeep; gg.fillRect(box.x0 - 1, box.y1 - box.h * 0.34, box.w + 2, box.h * 0.05); }, C.lavDeep); shadeIn(P, C.stone, 0.25); };
  const node = prismFold(ngon(10, 1.6), { h: 5.2, roof: 'pyramid', roofH: 1.4, paper: H.paper, seed: 521, print: H.cardOpts(x, z), paints: { wall: tower, roof: tilePrint(sh(C.tile, -0.05)) } });
  return popup(null, null, { node, height: 6.6, x, z, yaw: 0, solid: 1.8 });
}
function borie(x, z) {
  const course = (k) => (P) => { const { box } = P; base2(P, sh(C.stone, -0.04 + k * 0.05), 0.08); P.marks('brick', { color: sh(C.stone, -0.45), alpha: 0.5, size: 0.16 }); if (k === 4) P.layer((gg) => { gg.fillStyle = '#3a2a30'; gg.beginPath(); gg.moveTo(-0.55, box.y0 - 1); gg.lineTo(-0.55, box.y0 + 1.3); gg.ellipse(0, box.y0 + 1.3, 0.55, 0.42, 0, Math.PI, 0, true); gg.lineTo(0.55, box.y0 - 1); gg.closePath(); gg.fill(); }, '#3a2a30', { lip: 0 }); P.layer((gg) => { gg.fillStyle = '#8e9670'; for (let j = 0; j < 4; j++) D.ell(gg, box.x0 + box.w * (0.15 + j * 0.23), box.y0 + 0.1, 0.3, 0.16); }, '#8e9670'); shadeIn(P, C.stone, 0.3); };
  const hs = H.dome(x, z, { r: 2.6, h: 3.3, n: 5, paint: [0, 1, 2, 3, 4].map(course), yaw: 0 });
  walk.solid(x, z, 2.4); return hs;
}
// the railcar: a cream-and-red box on bogies (a prism on a rectangle), centred on the track
function railcar() {
  const L = 7.2, W = 2.3, Hh = 2.3;
  const side = (P) => {
    const { box } = P;
    base2(P, C.cream, 0.06);
    P.layer((gg) => { gg.fillStyle = C.red; gg.fillRect(box.x0 - 1, box.y0 - 1, box.w + 2, box.h * 0.42 + 1); }, C.red);
    P.layer((gg) => { gg.fillStyle = sh(C.red, -0.25); gg.fillRect(box.x0 - 1, box.y0 + box.h * 0.4, box.w + 2, box.h * 0.05); }, C.red, { shadow: 0.5 });
    P.layer((gg) => { gg.fillStyle = '#3b3340'; for (const u of [0.18, 0.82]) { D.rect(gg, box.x0 + box.w * u - 0.8, box.y0 - 0.2, 1.6, 0.42, 0.08); } }, '#3b3340');
    P.draw((gg) => { for (let k = 0; k < 6; k++) { const x = box.x0 + 0.5 + k * (box.w - 1) / 6 + 0.06; gg.fillStyle = '#4a3a44'; gg.fillRect(x - 0.04, box.y0 + box.h * 0.52 - 0.04, 0.88, 0.7); gg.fillStyle = '#f7d98a'; gg.fillRect(x, box.y0 + box.h * 0.52, 0.8, 0.62); } });
    P.glow((gg) => { gg.fillStyle = '#fff'; for (let k = 0; k < 6; k++) { const x = box.x0 + 0.5 + k * (box.w - 1) / 6 + 0.06; gg.fillRect(x, box.y0 + box.h * 0.52, 0.8, 0.62); } });
    P.layer((gg) => { gg.fillStyle = C.cream; for (const u of [0.18, 0.82]) for (const d of [-0.45, 0.45]) D.ell(gg, box.x0 + box.w * u + d, box.y0 + 0.02, 0.2, 0.2); }, C.cream);
    shadeIn(P, C.red, 0.2);
  };
  const end = (P) => {
    const { box } = P;
    base2(P, C.cream, 0.06);
    P.layer((gg) => { gg.fillStyle = C.red; gg.fillRect(box.x0 - 1, box.y0 - 1, box.w + 2, box.h * 0.42 + 1); }, C.red);
    P.draw((gg) => { gg.fillStyle = '#4a3a44'; gg.fillRect(box.x0 + 0.3, box.y0 + box.h * 0.52, box.w - 0.6, 0.66); gg.fillStyle = '#f7d98a'; gg.fillRect(box.x0 + 0.36, box.y0 + box.h * 0.54, box.w - 0.72, 0.58); });
    P.layer((gg) => { gg.fillStyle = '#fff2c8'; D.ell(gg, box.x0 + 0.45, box.y0 + box.h * 0.25, 0.16, 0.16); D.ell(gg, box.x1 - 0.45, box.y0 + box.h * 0.25, 0.16, 0.16); }, '#fff2c8');
    shadeIn(P, C.red, 0.2);
  };
  const roof = (P) => { base2(P, '#bdb6ad', 0.06); P.layer((gg) => { gg.fillStyle = sh('#bdb6ad', -0.18); for (const u of [-0.25, 0.25]) D.rect(gg, u * L - 0.4, -0.35, 0.8, 0.7, 0.1); }, '#bdb6ad'); P.marks('rivet', { color: sh('#bdb6ad', -0.4), alpha: 0.5, size: 0.05 }); shadeIn(P, '#bdb6ad', 0.2); };
  const tube = prismFold([[-L / 2, 0], [L / 2, 0], [L / 2, -W], [-L / 2, -W]], { h: Hh, roof: 'flat', paper: H.paper, seed: 541, print: { pxPerUnit: 40, effects: 1 }, paints: { wall: [side, end, side, end], roof } });
  const g = new H.THREE.Group(); tube.position.z = W / 2; g.add(tube);
  g.userData.follow = (p) => tube.userData.follow?.(p);
  return g;
}

// ---- 7. the world --------------------------------------------------------------------------------------------------
// a piece the game unfolds lies FACE DOWN toward the camera: its kraft back shows, the print appears as it rises
// (lying back, a card reads almost as if it stood: the camera looks 47 deg down)
const FACE_DOWN = Math.PI / 2 - 0.02;
const keepOut = [], mark = (x, z, r) => keepOut.push([x, z, r]);
const STATION = { x0: 4, x1: 31, z0: -8.5, z1: 0.8 };
const inStation = (x, z, m = 0) => x > STATION.x0 - m && x < STATION.x1 + m && z > STATION.z0 - m && z < STATION.z1 + m;
const free = (x, z, m = 0) => line.dist(x, z) > 3.0 + m && !inStation(x, z, m) && keepOut.every(([hx, hz, r]) => Math.hypot(x - hx, z - hz) > r + m)
  && ZONES.every((Zn) => Math.hypot(x - Zn.c[0], z - Zn.c[1]) > 4.4 + m);
const LIFE = { lav: [], hives: [], creatures: [] };

let hero = null;
function buildStation() {
  // the platform (quai): a deck on a stone face, low enough to step onto, the railcar beside it
  const QX = 16, QZ = 0.6, QW = 18, QD = 3.0, QH = 0.55;
  const stoneFace = (P) => { base2(P, C.stone, 0.06); P.marks('brick', { color: sh(C.stone, -0.42), alpha: 0.5, size: 0.5 }); P.layer((gg) => { gg.fillStyle = C.cream; gg.fillRect(P.box.x0 - 1, P.box.y1 - 0.14, P.box.w + 2, 0.2); }, C.cream); shadeIn(P, C.stone, 0.2); };
  const deckPrint = (P) => { base2(P, '#d6c7a6', 0.05); P.marks('dot', { color: sh('#d6c7a6', -0.3), alpha: 0.35, size: 0.02, density: 0.5 }); P.layer((gg) => { gg.fillStyle = '#efe3c4'; gg.fillRect(P.box.x0 - 1, P.box.y0 - 1, P.box.w + 2, 0.5); }, '#efe3c4'); P.layer((gg) => { gg.fillStyle = '#e8c25a'; gg.fillRect(P.box.x0 - 1, P.box.y0 + 0.62, P.box.w + 2, 0.1); }, '#e8c25a', { shadow: 0.4 }); };
  const quai = platform({ w: QW, d: QD, h: QH, paper: H.paper, seed: 511, support: true, paints: { face: stoneFace, deck: deckPrint, support: stoneFace }, print: H.cardOpts(QX, QZ) });
  quai.name = 'quai';
  const q = popup(null, null, { node: quai, height: QH, x: QX, z: QZ, yaw: 0, level: true });
  walk.add(quai);
  const deck = quai.userData.deck, o = q.order + 0.5;
  popup(...bench(), { parent: deck, x: -2.5, z: -2.3, order: o });
  popup(...nameboard(), { parent: deck, x: 4.2, z: -2.4, order: o });
  for (const dx of [-7.5, 1, 7.8]) popup(...lampPost(), { parent: deck, x: dx, z: -0.5, order: o });
  popup(...crate(), { parent: deck, x: -6, z: -2.2, order: o, yaw: 0.1 });
  popup(...cat(), { parent: deck, x: 0.6, z: -1.4, order: o + 0.2, yaw: -0.15 });
  station(QX, QZ - QD - 0.05);
  waterTower(27.5, -4.5);
  popup(...sleepers(), { x: 27, z: -0.6, yaw: -0.2 });
  popup(...crate(), { x: 25, z: -0.4, yaw: 0.15 });
  popup(...milestone(0), { x: 5.2, z: -0.4 });
  for (const x of [6.5, 30.5]) popup(...lavender(3.6), { x, z: -2.5, sway: 0.5 });
  popup(...cypress(9.5), { x: 9.0, z: -6.5, cross: true, sway: 0.3 });
  popup(...cypress(8.5), { x: 22.5, z: -7.4, cross: true, sway: 0.3 });
  // the hero, on the platform
  const doll = heroDoll();
  hero = popup(null, null, { node: doll, height: 3.1, x: 11.5, z: -0.9, sway: 0.15, scale: 1.25 });
  H.setHero(hero, { stride: doll.userData.stride });
  // the railcar, folded flat on the track until the line is open
  const [tx, tz] = trackAt(S_STATION);
  const car = popup(null, null, { node: railcar(), height: 2.3, x: tx, z: tz, yaw: 0, level: true, sight: false, flat: FACE_DOWN });
  car.held = true;
  return car;
}

function buildZone(Zn) {
  const [sx, sz] = Zn.sig, [nx, nz] = Zn.n;
  rnd = P2.rng(700 + Zn.i * 31);
  const hold = (h) => { h.held = true; Zn.hinges.push(h); return h; };
  hold(popup(...signal(), { x: sx, z: sz, cross: 'half-front', second: { ymax: 1.3 }, flat: FACE_DOWN }));
  const SETS = [
    [['sleepers'], ['crate'], ['lavender'], ['milestone', 12], ['poppies']],
    [['broom'], ['rock'], ['crate'], ['poppies'], ['wall']],
    [['beehive'], ['beehive'], ['lavender'], ['sunflowers'], ['rock']],
    [['olive'], ['rock'], ['sleepers'], ['milestone', 37], ['broom']],
    [['sunflowers'], ['wall'], ['lavender'], ['crate'], ['poppies']],
  ];
  const KIND = { sleepers, crate, lavender: () => lavender(), milestone, poppies, broom: () => broom(), rock: () => rock(), wall: () => wall(), beehive: () => beehive(), sunflowers, olive: () => olive() };
  const [cx, cz] = Zn.c;
  clusterLayout(cx + nx * 0.6, cz + nz * 0.6, { n: SETS[Zn.i].length, size: 4.6, seed: 90 + Zn.i }).forEach((p, k) => {
    const [kind, arg] = SETS[Zn.i][k], [pts, paint] = KIND[kind](arg);
    if (line.dist(p.x, p.z) < 2.6) return;
    const h = hold(popup(pts, paint, { x: p.x, z: p.z, scale: p.scale, cross: kind === 'olive', sway: ['lavender', 'poppies', 'broom', 'sunflowers'].includes(kind) ? 0.5 : 0, flat: FACE_DOWN }));
    if (kind === 'lavender') LIFE.lav.push([p.x, p.z]);
    if (kind === 'beehive') LIFE.hives.push([p.x, p.z]);
  });
  walk.solid(sx, sz, 0.45);
}

function buildWorld() {
  const car = buildStation();
  for (const Zn of ZONES) buildZone(Zn);
  rnd = P2.rng(301);
  // landmarks: two cabanons and a borie, with hens; a beehive row by the lavender field
  const cab = [[-21, -15.5, 0.25, 551], [26, -27, -0.2, 553]];
  for (const [x, z, yaw, seed] of cab) if (free(x, z)) { cabanon(x, z, yaw, seed); mark(x, z, 3.6); }
  if (free(4, -16)) { borie(4, -16); mark(4, -16, 3.6); }
  for (const [x, z] of [[-18, -11.5], [-16.8, -12.4]]) { const h = popup(...hen(), { x, z }); LIFE.creatures.push([h, 'peck']); mark(x, z, 1.2); }
  for (const [x, z] of [[28, -22.5], [26.2, -22.2]]) { const h = popup(...hen(), { x, z }); LIFE.creatures.push([h, 'peck']); mark(x, z, 1.2); }
  for (let k = 0; k < 4; k++) { const x = 13 + k * 1.9, z = -23.2 + k * 0.35; if (free(x, z)) { popup(...beehive(), { x, z, yaw: -0.15 }); LIFE.hives.push([x, z]); mark(x, z, 1.1); } }
  for (const [x, z, yaw] of [[-9, -32, 0.1], [9, -21.5, -0.3], [-25, -1.5, 0.2]]) if (free(x, z)) { popup(...wall(6.5), { x, z, yaw }); mark(x, z, 3.4); }
  // the far garrigue: stacked sails along the top edge, darker and taller at the back
  for (const [hx, hz] of [[-34, -52], [0, -56], [34, -50]]) {
    H.stack(hx, hz, [0, 1, 2].map((k) => { const [pts, paint] = hillSail(22 - k * 3, 9 - k * 2.2, sh('#8f8aa0', -0.12 + k * 0.12)); return { pts, paint, d: k * 1.6, dx: (k - 1) * 2 }; }));
  }

  // the fill: woods, groups and clearings decided by a slow noise, only where the walking camera can see
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const lush = (x, z) => 0.5 + 0.25 * Math.sin(x * 0.13 + ph[0]) * Math.sin(z * 0.15 + ph[1]) + 0.18 * Math.sin(x * 0.2 + z * 0.17 + ph[2]);
  // a few shared prints per kind: the forest of olives is 6 prints stamped many times, turned and scaled
  const V = (fn, n, cross = false) => Array.from({ length: n }, () => { const [pts, paint] = fn(); return [pts, H.printed(pts, paint, { res: 0.8, cross })]; });
  const VAR = { olive: V(() => olive(), 5, true), cypress: V(() => cypress(), 3, true), lavender: V(() => lavender(), 5), broom: V(() => broom(), 4), rock: V(() => rock(), 5), poppies: V(poppies, 3), sunflowers: V(sunflowers, 2), wall: V(() => wall(), 2) };
  const put = (kind, x, z, o = {}) => { const vs = VAR[kind], [pts, mat] = vs[Math.floor(rnd() * vs.length)]; return popup(pts, null, { materials: mat, x, z, cross: kind === 'olive' || kind === 'cypress', sway: ['lavender', 'broom', 'poppies', 'sunflowers'].includes(kind) ? 0.5 : kind === 'olive' ? 0.25 : 0, ...o }); };
  const DRESS = ['lavender', 'lavender', 'broom', 'rock', 'rock', 'poppies', 'sunflowers', 'lavender'];
  const placed = [], trees = [];
  const [hx0, hz0] = [hero.group.position.x, hero.group.position.z];
  const corridor = (x, z) => z > hz0 - 1 && z < hz0 + 14 && Math.abs(x - hx0) < 8;
  const fill = (see, res) => {
    RES = res;
    for (let gz = -44; gz <= 14; gz += 3.2) for (let gx = -48; gx <= 50; gx += 3.2) {
      const x = gx + (rnd() - 0.5) * 2.6, z = gz + (rnd() - 0.5) * 2.6, l = lush(x, z);
      if (!see(x, z, 0.12, 4) || l < 0.3 || placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3.0)) continue;
      const inLav = FIELDS.some((F) => inRect(x, z, F, 0.5));
      placed.push([x, z]);
      if (!inLav && !inRect(x, z, WHEAT, 1) && l > 0.56 && free(x, z, 1.6) && !corridor(x, z) && trees.every(([tx, tz]) => Math.hypot(x - tx, z - tz) > 5)) {
        trees.push([x, z]); put(rnd() < 0.72 ? 'olive' : 'cypress', x, z, { scale: 0.9 + rnd() * 0.25 });
      } else if (free(x, z, 0.8)) {
        const kinds = inLav ? ['lavender', 'lavender', 'lavender'] : [...new Set(Array.from({ length: 4 + Math.floor(rnd() * 3) }, () => DRESS[Math.floor(rnd() * DRESS.length)]))];
        clusterLayout(x, z, { n: kinds.length, size: 4.4, seed: Math.round(x * 13 + z * 7) & 1023 }).forEach((p, k) => {
          if (!free(p.x, p.z, 0.2)) return;
          put(kinds[k], p.x, p.z, { scale: p.scale * (0.85 + rnd() * 0.3) });
          if (kinds[k] === 'lavender') LIFE.lav.push([p.x, p.z]);
        });
      }
    }
  };
  fill(H.inFrame, 1);
  fill((x, z, m, y) => H.inReach(x, z, 0.02, y) && !H.inFrame(x, z, m, y), 0.75);
  RES = 1;
  // big blurred pieces across the bottom edge sell the miniature scale
  for (const [x, z, s, k] of [[-22, 8.5, 1.9, 'lavender'], [-9, 9.5, 1.6, 'broom'], [30, 9.5, 1.8, 'lavender'], [3, 9, 1.5, 'lavender']]) put(k, x, z, { scale: s });
  return car;
}

// ---- 8. ?test: the material on a few cards ------------------------------------------------------------------------
let CAR = null;
if (flags.TEST) {
  const doll = heroDoll(); hero = popup(null, null, { node: doll, height: 3.1, x: 2, z: -4, scale: 1.25 }); H.setHero(hero, { stride: doll.userData.stride });
  popup(...olive(), { x: -3, z: -8, cross: true }); popup(...lavender(), { x: 6.5, z: -6 }); popup(...rock(), { x: -1, z: -2.5 });
  popup(...signal(), { x: 9, z: -9, cross: 'half-front', second: { ymax: 1.3 } }); popup(...beehive(), { x: -6, z: -3 });
} else CAR = buildWorld();

// ---- 9. a living world: butterflies at the lavender, bees at the hives, swallows, cloud shadows, cat and hens -------
const life = createLife({ scene: H.scene, camera: H.camera, heroHeight: H.heroHeight, seed: 41, wind: [0.9, 0.4] });
if (!flags.TEST) {
  life.flyers({ count: 9, colors: ['#f4ecd8', '#e9c64a', '#c9b6e6'], anchors: LIFE.lav.filter((_, i) => i % 3 === 0).slice(0, 12), roam: 1.3 });
  life.flyers({ count: 10, size: 0.12, colors: ['#e2a92a', '#5a3e22'], anchors: LIFE.hives, roam: 0.6, flap: 18 });
  life.flock({ size: 5, height: 3.6, colors: ['#3c3a52', '#f1e8d6'] });
  life.cloudShadows({ count: 3, alpha: 0.12 });
  for (const [h, behaviour] of LIFE.creatures) life.critter(h.group, { behaviour, hero: H.hero.group.position, walk: H.walk, roam: 1.0 });
}
life.reset(H.target);
H.onStep((t, dt) => life.update(dt, H.target));
H.onRestart(() => life.reset(H.target));

// ---- 10. the game: unfold each zone when the cheminot reaches its chalk ring, then send the railcar ----------------
const $ = (id) => document.getElementById(id);
const pips = $('pips'); ZONES.forEach(() => pips.appendChild(document.createElement('i')));
let started = false, done = false, t0 = 0, tEnd = 0, toastT = 0;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const toast = (msg) => { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); };
const best = () => { try { return Number(localStorage.getItem('ligne-papier-best')) || 0; } catch { return 0; } };
const saveBest = (s) => { try { if (!best() || s < best()) localStorage.setItem('ligne-papier-best', String(s)); } catch { /* sans stockage : pas de record */ } };

function unfold(Zn) {
  Zn.up = true;
  Zn.hinges.forEach((h, k) => { h.held = false; h.set(1, 0.05 + k * 0.12); });
  const n = ZONES.filter((z) => z.up).length;
  $('count').textContent = `${n} / ${ZONES.length}`;
  pips.children[Zn.i].classList.add('on');
  if (n < ZONES.length) toast(`Sémaphore relevé · encore ${ZONES.length - n}`);
  else finish();
}
// the railcar: rises at the station, waits, runs to the end of the line and back, again and again
const train = { s: S_STATION, v: 0, dir: 1, wait: 0, live: false };
function finish() {
  done = true; tEnd = (performance.now() - t0) / 1000; saveBest(tEnd);
  toast('Voie libre : l’autorail part');
  if (CAR) { CAR.held = false; CAR.set(1, 0.4); }
  train.live = true; train.wait = 2.4;
  setTimeout(() => { $('endTime').textContent = `Temps : ${fmt(tEnd)}${best() ? ` · record : ${fmt(best())}` : ''}`; $('end').hidden = false; $('again').focus(); }, 4200);
}
const S_END = TLEN - 6;
H.onStep((t, dt) => {
  if (started && !done) $('clock').textContent = fmt((performance.now() - t0) / 1000);
  if (!flags.TEST && started && !done) {
    const p = H.hero.group.position;
    for (const Zn of ZONES) if (!Zn.up && Math.hypot(p.x - Zn.c[0], p.z - Zn.c[1]) < 3.7) unfold(Zn);
  }
  if (!train.live || !CAR) return;
  if (train.wait > 0) { train.wait -= dt; return; }
  const goal = train.dir > 0 ? S_END : S_STATION, left = Math.abs(goal - train.s);
  const vmax = 7.5, a = 2.2;
  train.v = Math.min(vmax, train.v + a * dt, Math.sqrt(2 * a * left) + 0.05);
  train.s += train.dir * train.v * dt;
  if ((train.dir > 0 && train.s >= goal) || (train.dir < 0 && train.s <= goal)) { train.s = goal; train.v = 0; train.dir = -train.dir; train.wait = train.dir > 0 ? 6 : 3; }
  const [x, z, tx, tz] = trackAt(train.s);
  CAR.group.position.x = x; CAR.group.position.z = z;
  CAR.group.rotation.y = Math.atan2(tz, -tx);   // its long side along the track; at the station (tangent -x) yaw 0
});

// intro: the keys do nothing until "En route"; Enter or Space starts too
const intro = $('intro');
addEventListener('keydown', (e) => {
  if (intro.hidden) return;
  if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); begin(); }
  e.stopImmediatePropagation();
}, true);
function begin() { if (started) return; intro.hidden = true; started = true; t0 = performance.now(); }
$('go').addEventListener('click', begin);
$('again').addEventListener('click', () => location.reload());
$('stay').addEventListener('click', () => { $('end').hidden = true; });
if (flags.TEST || new URLSearchParams(location.search).has('capture')) { intro.hidden = true; document.getElementById('hud').hidden = true; }
// touch pad: virtual keys through the same keyboard path the harness listens to
for (const b of document.querySelectorAll('#pad button')) {
  const code = b.dataset.k, send = (type) => dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('on'); send('keydown'); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { if (!b.classList.contains('on')) return; b.classList.remove('on'); send('keyup'); });
}
window.__ligne = { ZONES, unfold, train, trackAt, begin };

H.start();
