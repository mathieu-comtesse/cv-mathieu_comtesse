// La Ville pliée : un jeu pop-up noir et dystopique construit avec le skill papercraft (harness.js fixe + ce fichier).
//
// PAPER SPEC ---------------------------------------------------------------------------------------------------------
// BRIEF    nuit sans fin sur une ville de papier ; tonalité de film noir expressionniste : ambre de sodium contre
//          ombres vert-de-gris, couleurs éteintes, pluie fine. Le Bureau des Plis replie à plat les quartiers qui se
//          souviennent. L'héroïne, Erratum, une coquille échappée de la presse, rallume les cinq relais de la ligne pour
//          que le dernier autorail parte vers le bord de la feuille, sous les projecteurs des miradors, avant le Grand Pli.
// SUBJECT  la voie en C à travers la ville ; le twist : le pop-up est la menace (le Pli) et la délivrance (les relais).
// STOCK    papier journal gris crème pour tout ; sol en carton ardoise.
// PALETTE  sol ardoise #565b55 / trottoirs #6f716a ; pierre suie #8b877b #5e625b ; vert-de-gris #4f6a63 ;
//          ambre sodium #f0b45a ; un seul rouge, la marque de correcteur d'Erratum #a8322a ; encre #141614 ;
//          ombre vert-noir #0c1f1c ; brume #1d2a26.
// LIGHT    pas de soleil : une clé pâle et verdâtre faible, des flaques d'ambre sous les réverbères, la lanterne d'Erratum.
// LENS     fov 26, pitch 47, bande nette ~0.3, flou max 18 px ; vignette lourde.
// GROUND   pavés en dérives, trottoirs déchirés, flaques à reflets d'ambre, plaques d'égout, l'œil du Bureau peint
//          sur la place, la voie, les cercles d'ambre des relais, des avis déchirés au sol.
// LAYOUT   la voie (terminus en bas à droite -> ouest -> nord -> est) ; le Bureau des Plis et sa tour d'horloge au
//          centre ; immeubles en périphérie ; miradors le long de la voie ; une file d'attente devant le Bureau.
// MOTION   charnières du kit ; zones pliées face contre terre ; projecteurs qui balaient ; au Grand Pli tout se replie.
// LIFE     pluie, corbeaux, papillons de nuit aux réverbères, fumée des cheminées, papiers qui volent.
// TYPES    prismes (immeubles, Bureau, tour), box fold (terminus), croix (arbres morts, miradors, haut-parleurs,
//          relais en demi-croix), cartes (passants, affiches, accessoires), plateforme (quai), voiles (horizon urbain).
// SOUND    plis de papier du kit, rares.
// BANNED   tells de look.md 12 ; aucun personnage, lieu ou nom repris d'un film ; pas de couleur vive hors l'ambre et
//          la marque rouge.
// QA       vue d'ensemble, une zone qui se déplie, un projecteur qui attrape Erratum, le Grand Pli, le départ.
import * as THREE from 'three';
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, clusterLayout, platform, boxFold, prismFold } from 'papercraft/lib/paperkit-3d.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { createHarness } from './harness.js';

// ---- 1. palette and light ------------------------------------------------------------------------------------------
const C = {
  ground: '#565b55', washA: '#4e534d', washB: '#5f625a', washC: '#53584f', walk: '#6f716a', puddle: '#2b3836',
  stone: '#8b877b', soot: '#5e625b', brick: '#6f5d52', verdi: '#4f6a63', tar: '#3a3d38',
  amber: '#f0b45a', amberDeep: '#c98a3a', paneDark: '#1f2a28', news: '#d7d2c4', newsInk: '#55534c',
  red: '#a8322a', cream: '#e4dfd1', ink: '#141614', iron: '#2f3532', wood: '#5c4a3a',
  ballast: '#4a4b45', sleeper: '#3f342b', rail: '#9a9a92',
};
const sh = P2.shade, rgba = P2.rgba, D = P2.draw2;
// the light of a city with no sun: a weak greenish key, sodium pools, a heavy vignette, colour drained to amber and teal
const NOIR = { key: '#a9bfae', ki: 1.6, dir: [-0.7, 0.75, 0.45], fill: '#3d5652', fi: 0.55, sky: '#30423f', skyG: '#121816', si: 0.6, leak: '#0c1f1c', wrap: 0.42, glow: 1.5, lamp: 9,
  post: { exposure: 1.1, tint: [1.03, 1.0, 0.9], saturation: 0.55, haze: '#1d2a26', hazeStart: 16, hazeEnd: 64, hazeAmount: 0.75, vignette: 0.3, vignetteColor: '#050807', shadowTint: '#0d1a18', shadowLift: 0.03 } };

// ---- 2. the line: one route drives the print, the placement, the zones and the railcar -----------------------------
const ROUTE = [[64, 2.2], [30, 2.2], [16, 2.2], [5, 2.2], [-6, -1], [-14, -8], [-15.5, -17], [-9, -24.5], [3, -27.5], [15, -31], [22, -38], [30, -47], [64, -58]];
const line = P2.pathLine(ROUTE, { step: 0.5 });
const TP = line.pts, TS = [0];
for (let i = 1; i < TP.length; i++) TS.push(TS[i - 1] + Math.hypot(TP[i][0] - TP[i - 1][0], TP[i][1] - TP[i - 1][1]));
const TLEN = TS[TS.length - 1];
function trackAt(s) {
  s = Math.max(0, Math.min(TLEN, s));
  let i = 1; while (i < TS.length - 1 && TS[i] < s) i++;
  const t = (s - TS[i - 1]) / ((TS[i] - TS[i - 1]) || 1), [ax, az] = TP[i - 1], [bx, bz] = TP[i], L = Math.hypot(bx - ax, bz - az) || 1;
  return [ax + (bx - ax) * t, az + (bz - az) * t, (bx - ax) / L, (bz - az) / L];
}
const sAtX = (x) => { let best = 0, d = Infinity; TP.forEach(([px, pz], i) => { if (pz > 0 && Math.abs(px - x) < d) { d = Math.abs(px - x); best = TS[i]; } }); return best; };
const S_STATION = sAtX(13);
const ZONES = [11, 24, 37, 50, 62].map((ds, i) => {
  const [x, z, tx, tz] = trackAt(S_STATION + ds), side = [1, -1, 1, -1, 1][i];
  const nx = -tz * side, nz = tx * side;
  return { i, sig: [x + nx * 2.7, z + nz * 2.7], c: [x + nx * 4.6, z + nz * 4.6], n: [nx, nz], hinges: [], up: false };
});

const NARROW = innerWidth < innerHeight;   // a phone held upright: a longer view with the heroine centred across it
const H = createHarness({
  ground: C.ground, stock: '#e9e7df', mood: 'noir', moods: { noir: NOIR },
  view: NARROW ? { pitch: 47, dist: 78, target: [9.5, 1.5, -10], follow: [-1.5, -8] } : { pitch: 47, dist: 58, target: [1, 1.5, -9] }, play: true, clickFold: false,
  walkArea: { x0: -27, x1: 28, z0: -34, z1: 5 }, lens: { haze: '#1d2a26' },
});
const { walk, flags } = H;
let RES = 1;
const popup = (pts, paint, o = {}) => H.popup(pts, paint, { res: RES, ...o });

// ---- 3. the city plan: blocks of buildings, the plaza with the Bureau, the watchtowers -----------------------------
// [x, z, w, d, h, yaw]: tenements round the edges, never between the heroine and the camera
const BLOCKS = [
  [-24, -4, 6, 4, 7.5, 0.2], [-25, -13, 5.5, 4.5, 9, 0.35], [-25, -27, 6, 4, 8, 0.1], [-19, -38, 7, 4, 10, 0],
  [-6, -40, 6.5, 4, 9.5, 0], [8, -42, 7, 4, 11, 0], [30, -36, 6, 4, 9, -0.2], [30, -24, 5.5, 4.5, 8, -0.3],
  [31, -12, 6, 4, 7, -0.15], [-14, -31, 4.5, 3.5, 6, 0.4], [20, -21, 4.5, 3.5, 6.5, -0.25],
];
const BUREAU = [1, -15, 9, 5, 6.5, 0], CLOCK = [-5.2, -16.5];
const TOWERS = [   // a watchtower and the loop its searchlight sweeps: centre, radii, speed, phase
  { at: [-20, -18], c: [-10, -14], r: [3.2, 7], w: 0.48, ph: 0 },
  { at: [-2, -33], c: [-2, -26], r: [7, 2.6], w: 0.41, ph: 2 },
  { at: [24, -32], c: [15, -27], r: [4.5, 3.5], w: 0.54, ph: 4 },
];
const inBox = (x, z, [bx, bz, w, d, , yaw], m = 0) => { const c = Math.cos(yaw), s = Math.sin(yaw), u = (x - bx) * c - (z - bz) * s, v = (x - bx) * s + (z - bz) * c; return Math.abs(u) < w / 2 + m && v < m && v > -d - m; };

// ---- 4. the printed ground: cobbles, torn pavements, puddles, the Bureau's eye, the line ---------------------------
const offsetLine = (pts, d) => pts.map(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(bx - ax, bz - az) || 1; return [x - (bz - az) / L * d, z + (bx - ax) / L * d]; });
const boxPts = ([bx, bz, w, d, , yaw], m) => [[-w / 2 - m, m], [w / 2 + m, m], [w / 2 + m, -d - m], [-w / 2 - m, -d - m]].map(([u, v]) => [bx + u * Math.cos(yaw) + v * Math.sin(yaw), bz - u * Math.sin(yaw) + v * Math.cos(yaw)]);
H.printGround(({ g, ppu, X, Z, rnd, washes, torn, bandOf, line: stroke, drifts }) => {
  washes([C.washA, C.washA, C.washB, C.washC]);
  // pavements round every block and a paved plaza round the Bureau
  for (const B of [...BLOCKS, BUREAU]) torn(boxPts(B, 2.2), rgba(C.walk, 0.9), 'rgba(200,196,180,0.35)');
  torn(Array.from({ length: 28 }, (_, i) => { const a = i / 28 * 6.283; return [2 + Math.cos(a) * 10, -14 + Math.sin(a) * 7.5]; }), rgba(sh(C.walk, 0.06), 0.85), 'rgba(200,196,180,0.3)');
  // the Bureau's eye painted on the plaza, flaking
  g.save(); g.translate(X(2), Z(-7.8)); g.scale(1, 0.62);
  g.strokeStyle = rgba(C.cream, 0.32); g.lineWidth = 0.35 * ppu; g.beginPath(); g.ellipse(0, 0, 3.2 * ppu, 1.6 * ppu, 0, 0, 7); g.stroke();
  g.fillStyle = rgba(C.cream, 0.28); g.beginPath(); g.arc(0, 0, 0.9 * ppu, 0, 7); g.fill();
  g.fillStyle = rgba(C.ink, 0.5); g.beginPath(); g.arc(0, 0, 0.42 * ppu, 0, 7); g.fill();
  g.restore();
  // cobbles gathered in drifts, manholes
  drifts((x, y) => { g.fillStyle = rgba(rnd() < 0.5 ? sh(C.ground, 0.12) : sh(C.ground, -0.14), 0.55); g.beginPath(); g.roundRect(x - 3, y - 2, 6 + rnd() * 3, 4, 1.5); g.fill(); }, { n: 26000, inside: 0.7, threshold: 0.5 });
  for (let k = 0; k < 9; k++) { const x = -24 + rnd() * 52, z = -32 + rnd() * 34; if (line.dist(x, z) < 3) continue; g.fillStyle = rgba(C.ink, 0.45); g.beginPath(); g.arc(X(x), Z(z), 0.55 * ppu, 0, 7); g.fill(); g.strokeStyle = rgba(C.stone, 0.4); g.lineWidth = 0.06 * ppu; for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(X(x) - 0.45 * ppu, Z(z) + j * 0.18 * ppu); g.lineTo(X(x) + 0.45 * ppu, Z(z) + j * 0.18 * ppu); g.stroke(); } }
  // puddles: dark teal with broken amber reflections
  for (let k = 0; k < 26; k++) {
    const x = -26 + rnd() * 58, z = -36 + rnd() * 44, rx = (0.8 + rnd() * 1.8) * ppu, rz = rx * (0.4 + rnd() * 0.3);
    g.fillStyle = rgba(C.puddle, 0.8); g.beginPath(); g.ellipse(X(x), Z(z), rx, rz, rnd() * 0.6, 0, 7); g.fill();
    g.strokeStyle = rgba(C.amber, 0.45); g.lineWidth = 0.07 * ppu; for (let j = 0; j < 3; j++) { const dx = (rnd() - 0.5) * rx, dz = (rnd() - 0.5) * rz; g.beginPath(); g.moveTo(X(x) + dx - rx * 0.25, Z(z) + dz); g.lineTo(X(x) + dx + rx * 0.25, Z(z) + dz); g.stroke(); }
  }
  // the line: a sooty ballast bed, sleepers, two pale steel rails
  torn(bandOf(TP, 1.75), rgba(sh(C.ballast, -0.1), 0.95), 'rgba(160,160,150,0.25)');
  torn(bandOf(TP, 1.45), C.ballast, 'rgba(160,160,150,0.2)');
  for (let s = 0.4; s < TLEN; s += 0.95) {
    const [x, z, tx, tz] = trackAt(s), w = 2.7 + (rnd() - 0.5) * 0.15;
    g.save(); g.translate(X(x), Z(z)); g.rotate(Math.atan2(tz, tx) + Math.PI / 2 + (rnd() - 0.5) * 0.05);
    g.fillStyle = rgba(sh(C.sleeper, (rnd() - 0.5) * 0.2), 0.95); g.fillRect(-w / 2 * ppu, -0.2 * ppu, w * ppu, 0.4 * ppu);
    g.restore();
  }
  for (const sd of [-1, 1]) { const rail = offsetLine(TP, sd * 0.72); stroke(rail, 0.2, rgba(C.ink, 0.6)); stroke(rail, 0.13, C.rail); stroke(offsetLine(TP, sd * 0.72 - 0.04), 0.04, rgba('#e8e2c8', 0.6)); }
  // amber rings round the dark relays
  g.lineCap = 'round';
  for (const Zn of ZONES) {
    const [cx, cz] = Zn.c;
    g.strokeStyle = rgba(C.amber, 0.55); g.lineWidth = 0.2 * ppu; g.setLineDash([0.7 * ppu, 0.45 * ppu]);
    g.beginPath(); g.arc(X(cx), Z(cz), 3.6 * ppu, 0, 7); g.stroke(); g.setLineDash([]);
  }
  // torn notices on the ground, the litter of a city that obeys
  for (let k = 0; k < 60; k++) { const x = -26 + rnd() * 58, z = -36 + rnd() * 44; g.save(); g.translate(X(x), Z(z)); g.rotate(rnd() * 6.28); g.fillStyle = rgba(C.news, 0.55); g.fillRect(-0.3 * ppu, -0.2 * ppu, 0.6 * ppu, 0.4 * ppu); g.fillStyle = rgba(C.newsInk, 0.5); for (let j = 0; j < 3; j++) g.fillRect(-0.24 * ppu, (-0.12 + j * 0.1) * ppu, 0.48 * ppu, 0.03 * ppu); g.restore(); }
}, { seed: 33 });

// ---- 5. the pieces ------------------------------------------------------------------------------------------------
let rnd = P2.rng(101);
const between = (a, b) => a + rnd() * (b - a);
const base2 = (P, c, k = 0.1, felt = 0.5) => { P.gradient(sh(c, k), sh(c, -k), 0.5); P.felt(felt); };
const shadeIn = (P, c, a = 0.35) => P.innerShade(sh(c, -0.6), { alpha: a, blurPx: 8 });
const text = (g, s, x, y, size, color, align = 'center') => {   // print text in shape units (y up)
  g.save(); g.translate(x, y); g.scale(size / 40, -size / 40); g.fillStyle = color; g.font = '700 40px Georgia, serif'; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
};
const withPrint = ([pts, paint], extra) => [pts, (P) => { paint(P); extra(P); }];
// tenement facade: soot-streaked stone, cornices per floor, a grid of windows (a few lit in amber), a shuttered shop
const facade = (c, seed, { lit = 0.2, shop = true, poster = null } = {}) => (P) => {
  const { box } = P, r = P2.rng(seed);
  base2(P, c, 0.08, 0.6);
  P.marks('brick', { color: sh(c, -0.35), alpha: 0.25, size: 0.4, units: true });
  const floorH = 1.45, cols = Math.max(1, Math.floor(box.w / 1.15)), cw = box.w / cols, rows = Math.max(1, Math.floor((box.h - 1.9) / floorH));
  P.layer((gg) => { gg.fillStyle = sh(c, 0.14); for (let k = 0; k <= rows; k++) gg.fillRect(box.x0 - 1, box.y0 + 1.75 + k * floorH, box.w + 2, 0.12); }, sh(c, 0.14));
  const lights = [];
  P.layer((gg) => { gg.fillStyle = C.ink; for (let k = 0; k < rows; k++) for (let j = 0; j < cols; j++) { const x = box.x0 + j * cw + cw * 0.22, y = box.y0 + 2.0 + k * floorH; D.rect(gg, x - 0.05, y - 0.05, cw * 0.56 + 0.1, 0.95, 0.03); if (r() < lit) lights.push([x, y, cw * 0.56, 0.85]); } }, C.ink, { lip: 0.4 });
  P.draw((gg) => { for (let k = 0; k < rows; k++) for (let j = 0; j < cols; j++) { const x = box.x0 + j * cw + cw * 0.22, y = box.y0 + 2.0 + k * floorH; gg.fillStyle = C.paneDark; gg.fillRect(x, y, cw * 0.56, 0.85); } for (const [x, y, w, h] of lights) { gg.fillStyle = C.amber; gg.fillRect(x, y, w, h); gg.fillStyle = rgba(C.ink, 0.6); gg.fillRect(x + w * 0.46, y, w * 0.08, h); } });
  P.glow((gg) => { gg.fillStyle = '#fff'; for (const [x, y, w, h] of lights) gg.fillRect(x, y, w, h); });
  if (shop) {
    P.layer((gg) => { gg.fillStyle = C.verdi; D.rect(gg, box.x0 + box.w * 0.15, box.y0, box.w * 0.7, 1.45, 0.04); }, C.verdi);
    P.draw((gg) => { gg.fillStyle = rgba(C.ink, 0.45); for (let y = box.y0 + 0.12; y < box.y0 + 1.4; y += 0.16) gg.fillRect(box.x0 + box.w * 0.16, y, box.w * 0.68, 0.05); });
  }
  if (poster) {
    P.layer((gg) => { gg.fillStyle = C.cream; D.rect(gg, box.x1 - 1.6, box.y0 + 0.3, 1.1, 1.3, 0.03); }, C.cream);
    P.draw((gg) => { gg.strokeStyle = C.ink; gg.lineWidth = 0.08; gg.beginPath(); gg.ellipse(box.x1 - 1.05, box.y0 + 1.1, 0.4, 0.2, 0, 0, 7); gg.stroke(); gg.fillStyle = C.ink; gg.beginPath(); gg.arc(box.x1 - 1.05, box.y0 + 1.1, 0.1, 0, 7); gg.fill(); text(gg, poster, box.x1 - 1.05, box.y0 + 0.55, 0.2, C.red); });
  }
  P.innerShade('#0a1210', { alpha: 0.45, blurPx: 14 });
};
const roofPrint = (P) => { const { box } = P; base2(P, C.tar, 0.06); P.marks('dot', { color: sh(C.tar, 0.25), alpha: 0.4, size: 0.02, density: 0.6 }); P.layer((gg) => { gg.fillStyle = C.soot; D.rect(gg, box.x0 + box.w * 0.2, box.y0 + box.h * 0.3, box.w * 0.18, box.h * 0.3, 0.05); D.ell(gg, box.x0 + box.w * 0.7, box.y0 + box.h * 0.55, box.w * 0.1, box.h * 0.2); }, C.soot); };
const rect = (w, d) => [[-w / 2, 0], [w / 2, 0], [w / 2, -d], [-w / 2, -d]];
const CHIMNEYS = [];
function tenement(B, seed) {
  const [x, z, w, d, h, yaw] = B, c = [C.stone, C.soot, C.brick, sh(C.stone, -0.08)][seed % 4];
  const node = prismFold(rect(w, d), { h, roof: 'flat', paper: H.paper, seed, print: H.cardOpts(x, z, 1, null, 0.75),
    paints: { wall: [facade(c, seed, { poster: seed % 3 === 0 ? 'OBÉIR' : null }), facade(c, seed + 1, { shop: false }), facade(c, seed + 2, { shop: false }), facade(c, seed + 3, { shop: false })], roof: roofPrint } });
  H.glowing(popup(null, null, { node, height: h, x, z, yaw }).group);
  const ca = Math.cos(yaw), sa = Math.sin(yaw), at = (u, v) => [x + u * ca + v * sa, z - u * sa + v * ca];
  const [x0, z0] = at(-w / 2, -d / 2), [x1, z1] = at(w / 2, -d / 2); walk.wall(x0, z0, x1, z1, { r: d / 2 + 0.2 });
  const [cx, cz] = at(w * 0.25, -d * 0.6); CHIMNEYS.push([cx, h + 0.3, cz]);
}
function bureau() {
  const [x, z, w, d, h] = BUREAU;
  const front = (P) => {
    const { box } = P;
    base2(P, sh(C.stone, 0.05), 0.07, 0.6);
    P.layer((gg) => { gg.fillStyle = sh(C.stone, 0.16); for (let k = 0; k < 7; k++) D.rect(gg, box.x0 + 0.5 + k * (box.w - 1) / 6.2, box.y0 + 0.6, 0.55, box.h - 2.2, 0.05); }, sh(C.stone, 0.16));
    P.layer((gg) => { gg.fillStyle = sh(C.stone, -0.18); gg.fillRect(box.x0 - 1, box.y1 - 1.6, box.w + 2, 0.6); gg.fillRect(box.x0 - 1, box.y0 - 1, box.w + 2, 1.6); }, sh(C.stone, -0.18));
    P.layer((gg) => { gg.fillStyle = C.ink; D.rect(gg, -0.8, box.y0 + 0.6, 1.6, 2.4, 0.08); }, C.ink);
    P.layer((gg) => { gg.fillStyle = C.cream; gg.beginPath(); gg.ellipse(0, box.y1 - 0.75, 1.3, 0.55, 0, 0, 7); gg.fill(); }, C.cream);
    P.draw((gg) => { gg.fillStyle = C.ink; gg.beginPath(); gg.arc(0, box.y1 - 0.75, 0.32, 0, 7); gg.fill(); gg.fillStyle = C.amber; gg.beginPath(); gg.arc(0, box.y1 - 0.75, 0.12, 0, 7); gg.fill(); text(gg, 'BUREAU DES PLIS', 0, box.y1 - 1.3, 0.34, C.cream); });
    P.glow((gg) => { gg.fillStyle = '#fff'; gg.beginPath(); gg.arc(0, box.y1 - 0.75, 0.12, 0, 7); gg.fill(); });
    P.innerShade('#0a1210', { alpha: 0.45, blurPx: 14 });
  };
  const node = prismFold(rect(w, d), { h, roof: 'flat', paper: H.paper, seed: 601, print: H.cardOpts(x, z), paints: { wall: [front, facade(C.stone, 602, { shop: false }), facade(C.stone, 603, { shop: false }), facade(C.stone, 604, { shop: false })], roof: roofPrint } });
  H.glowing(popup(null, null, { node, height: h, x, z, yaw: 0 }).group);
  walk.wall(x - w / 2, z - d / 2, x + w / 2, z - d / 2, { r: d / 2 + 0.2 });
  // the clock tower, its hands stopped one minute before midnight
  const [tx, tz] = CLOCK;
  const tower = (P) => {
    const { box } = P, cy = box.y1 - 1.5;
    base2(P, C.soot, 0.08, 0.6);
    P.marks('brick', { color: sh(C.soot, -0.35), alpha: 0.3, size: 0.4, units: true });
    P.layer((gg) => { gg.fillStyle = C.cream; D.ell(gg, 0, cy, 1.05, 1.05); }, C.cream, { rim: 0.6 });
    P.draw((gg) => { gg.strokeStyle = C.ink; gg.lineWidth = 0.09; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; gg.beginPath(); gg.moveTo(Math.sin(a) * 0.8, cy + Math.cos(a) * 0.8); gg.lineTo(Math.sin(a) * 0.95, cy + Math.cos(a) * 0.95); gg.stroke(); } gg.lineWidth = 0.12; gg.beginPath(); gg.moveTo(0, cy); gg.lineTo(-0.1, cy + 0.62); gg.moveTo(0, cy); gg.lineTo(-0.05, cy + 0.78); gg.stroke(); });
    P.glow((gg) => { gg.fillStyle = 'rgba(255,255,255,0.55)'; gg.beginPath(); gg.arc(0, cy, 1.0, 0, 7); gg.fill(); });
    P.innerShade('#0a1210', { alpha: 0.45, blurPx: 12 });
  };
  const tnode = prismFold(rect(3, 3), { h: 13, roof: 'pyramid', roofH: 2.4, paper: H.paper, seed: 611, print: H.cardOpts(tx, tz), paints: { wall: tower, roof: (P) => { base2(P, C.verdi, 0.1); P.marks('scale', { color: sh(C.verdi, -0.3), alpha: 0.4, size: 0.12 }); } } });
  H.glowing(popup(null, null, { node: tnode, height: 15, x: tx, z: tz + 1.5, yaw: 0, solid: 2 }).group);
}
// the terminus building
const tilePrint = (P) => { base2(P, C.verdi, 0.1); P2.scallopTiles(P, P.box, { color: C.verdi, rows: 6 }); shadeIn(P, C.verdi, 0.25); };
function terminus(x, z) {
  const front = (P) => { facade(C.stone, 501, { lit: 0.6, shop: false })(P); P.layer((gg) => { gg.fillStyle = C.cream; D.rect(gg, -2.2, P.box.y1 - 0.75, 4.4, 0.55, 0.05); }, C.cream); P.draw((gg) => text(gg, 'TERMINUS', 0, P.box.y1 - 0.47, 0.36, C.ink)); };
  const node = boxFold({ w: 8.4, d: 4.4, wallH: 3.8, roofH: 2.0, paper: H.paper, seed: 501, print: H.cardOpts(x, z), paints: { front, gable: facade(C.stone, 502, { shop: false }), roof: tilePrint } });
  H.glowing(popup(null, null, { node, height: 5.8, x, z, yaw: 0 }).group);
  walk.wall(x - 4.2, z - 2.2, x + 4.2, z - 2.2, { r: 2.15 });
}
// props
function lampPost() {
  const pts = P2.fromDrawing((g) => { D.rect(g, -0.26, 0, 0.52, 0.2, 0.05); D.rect(g, -0.08, 0, 0.16, 3.3); D.rect(g, -0.08, 3.1, 0.9, 0.14); D.poly(g, [[0.45, 3.2], [1.05, 3.2], [0.9, 2.85], [0.6, 2.85]]); }, { w: 2.3, h: 3.6, name: 'lamp' });
  const paint = (P) => { P.fill(C.iron); P.draw((g) => { g.fillStyle = C.amber; g.fillRect(0.55, 2.86, 0.4, 0.14); }); P.glow((g) => { g.fillStyle = '#fff'; g.fillRect(0.55, 2.86, 0.4, 0.14); }); shadeIn(P, C.iron, 0.4); };
  return [pts, paint];
}
function deadTree(h = between(6, 8)) {
  const r = P2.rng(Math.floor(rnd() * 1e6)), limbs = Array.from({ length: 6 }, (_, i) => { const u = (i + 0.5) / 6 - 0.5; return [u * h * 0.32, h * (0.45 + r() * 0.12), u * h * 0.7 + (r() - 0.5), h * (0.8 + r() * 0.2)]; });
  const pts = P2.fromDrawing((g) => { P2.fillLimb(g, 0, 0, 0.1, h * 0.3, 0, h * 0.55, 0.55, 0.3); for (const [cx, cy, ex, ey] of limbs) P2.fillLimb(g, 0, h * 0.42, cx, cy, ex, ey, 0.28, 0.14); }, { w: h * 0.9, h: h * 1.05, name: 'dead tree' });
  const paint = (P) => { base2(P, '#3b3632', 0.12); P.marks('tick', { color: '#1c1a18', alpha: 0.4, size: 0.05, angle: 1.4 }); P.layer((gg) => { gg.fillStyle = '#4a443e'; P2.fillLimb(gg, -0.12, 0, -0.05, h * 0.3, -0.1, h * 0.5, 0.22, 0.12); }, '#4a443e'); shadeIn(P, '#3b3632', 0.35); };
  return [pts, paint];
}
function passerby(seed) {
  const tone = ['#4a4d48', '#3f423f', '#55534c'][seed % 3];
  return P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink('#1d1f1e'); D.rect(gg, -0.22, 0, 0.16, 0.7); D.rect(gg, 0.06, 0, 0.16, 0.7);
    gg.fillStyle = ink(tone); D.poly(gg, [[-0.42, 0.45], [0.42, 0.45], [0.3, 1.9], [-0.3, 1.9]]);
    gg.fillStyle = ink(sh(tone, -0.25), 'print'); D.rect(gg, -0.02, 0.5, 0.04, 1.35); D.rect(gg, -0.42, 1.05, 0.84, 0.06);
    gg.fillStyle = ink('#a89f90'); D.ell(gg, 0, 2.12, 0.22, 0.25);
    gg.fillStyle = ink('#1d1f1e'); D.rect(gg, -0.34, 2.24, 0.68, 0.08, 0.03); D.rect(gg, -0.2, 2.28, 0.4, 0.26, 0.06);
    gg.fillStyle = ink(C.ink, 'print'); D.rect(gg, -0.12, 2.08, 0.24, 0.03);
  }, { w: 1.0, h: 2.6, name: 'passerby' });
}
function poster(msg) {
  return withPrint(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(C.iron); D.rect(gg, -1.15, 0, 0.12, 1.2); D.rect(gg, 1.03, 0, 0.12, 1.2);
    gg.fillStyle = ink(C.cream); D.rect(gg, -1.3, 0.9, 2.6, 1.9, 0.04);
    gg.fillStyle = ink(C.ink, 'print'); D.ell(gg, 0, 2.15, 0.75, 0.38); gg.fillStyle = ink(C.cream, 'print'); D.ell(gg, 0, 2.15, 0.55, 0.26); gg.fillStyle = ink(C.ink, 'print'); D.ell(gg, 0, 2.15, 0.18, 0.18);
  }, { w: 2.8, h: 2.9, name: 'poster' }), (P) => P.draw((gg) => text(gg, msg, 0, 1.3, msg.length > 12 ? 0.2 : 0.28, C.red)));
}
function speaker() {
  return P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(C.iron); D.rect(gg, -0.08, 0, 0.16, 4.3);
    gg.fillStyle = ink(C.soot); D.poly(gg, [[0, 3.7], [0.9, 3.35], [0.9, 4.35], [0, 4.0]]); D.poly(gg, [[0, 3.7], [-0.9, 3.35], [-0.9, 4.35], [0, 4.0]]);
    gg.fillStyle = ink(C.ink, 'print'); D.ell(gg, 0.85, 3.85, 0.08, 0.42); D.ell(gg, -0.85, 3.85, 0.08, 0.42);
  }, { w: 2.0, h: 4.5, name: 'speaker' });
}
function bin() { return P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(C.iron); D.rect(gg, -0.45, 0, 0.9, 1.0, 0.06); gg.fillStyle = ink(sh(C.iron, 0.2)); D.rect(gg, -0.52, 0.95, 1.04, 0.14, 0.04); gg.fillStyle = ink(C.news); D.poly(gg, [[-0.3, 1.05], [0.1, 1.35], [0.35, 1.05]]); gg.fillStyle = ink(sh(C.iron, -0.3), 'print'); for (const x of [-0.25, 0, 0.25]) D.rect(gg, x - 0.02, 0.1, 0.04, 0.75); }, { w: 1.2, h: 1.45, name: 'bin' }); }
function crates() { return withPrint(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(C.wood); D.rect(gg, -0.8, 0, 1.0, 0.9, 0.04); D.rect(gg, 0.1, 0, 0.8, 0.75, 0.04); D.rect(gg, -0.5, 0.85, 0.8, 0.7, 0.04); gg.fillStyle = ink(sh(C.wood, -0.3), 'print'); for (const y of [0.3, 0.6, 1.15]) D.rect(gg, -0.8, y, 1.7, 0.04); }, { w: 1.9, h: 1.65, name: 'crates' }), (P) => P.draw((gg) => text(gg, 'SAISI', -0.1, 1.2, 0.2, C.cream))); }
function barrier() { return P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(C.iron); D.rect(gg, -1.4, 0, 0.12, 1.1); D.rect(gg, 1.28, 0, 0.12, 1.1); gg.fillStyle = ink(C.cream); D.rect(gg, -1.5, 0.6, 3.0, 0.32, 0.04); gg.fillStyle = ink(C.ink, 'print'); for (let k = 0; k < 6; k++) D.poly(gg, [[-1.45 + k * 0.5, 0.6], [-1.2 + k * 0.5, 0.6], [-1.0 + k * 0.5, 0.92], [-1.25 + k * 0.5, 0.92]]); }, { w: 3.1, h: 1.2, name: 'barrier' }); }
function rubble(w = between(2.4, 3.4)) { const pts = P2.roughen(P2.shape.mound(rnd, { w, h: w * 0.4, lobes: 4, depth: 0.2 }), rnd, { amp: w * 0.04 }); return [pts, (P) => { const { box } = P; base2(P, C.soot, 0.12); P.marks('brick', { color: sh(C.soot, -0.4), alpha: 0.4, size: 0.18 }); P.layer((gg) => { gg.fillStyle = C.news; D.rect(gg, box.x0 + box.w * 0.3, box.y0 + box.h * 0.3, box.w * 0.2, box.h * 0.25, 0.02); }, C.news); shadeIn(P, C.soot, 0.4); }]; }
// the relay: a mast with an amber lamp housing and the Bureau's eye plate, struck through in red
function relay() {
  return withPrint(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(C.stone); D.rect(gg, -0.55, 0, 1.1, 0.5, 0.06);
    gg.fillStyle = ink(C.iron); D.rect(gg, -0.13, 0.4, 0.26, 4.6, 0.05);
    gg.fillStyle = ink(sh(C.iron, 0.3), 'print'); for (let y = 0.7; y < 3.8; y += 0.38) D.rect(gg, -0.13, y, 0.26, 0.05);
    gg.fillStyle = ink(C.iron); D.rect(gg, -0.6, 3.9, 1.2, 1.0, 0.1); D.poly(gg, [[-0.7, 4.85], [0.7, 4.85], [0, 5.3]]);
    gg.fillStyle = ink(C.amber, 'print'); D.ell(gg, 0, 4.4, 0.36, 0.36);
    gg.fillStyle = ink(C.cream); D.rect(gg, -0.45, 2.2, 0.9, 0.5, 0.04);
    gg.fillStyle = ink(C.ink, 'print'); D.ell(gg, 0, 2.45, 0.28, 0.13); gg.fillStyle = ink(C.red, 'print'); D.rect(gg, -0.38, 2.42, 0.76, 0.06);
  }, { w: 1.6, h: 5.4, name: 'relay' }), (P) => P.glow((gg) => { gg.fillStyle = '#fff'; gg.beginPath(); gg.arc(0, 4.4, 0.34, 0, 7); gg.fill(); }));
}
// a watchtower: an iron lattice on two legs, a cabin, the searchlight housing
function watchtower() {
  return withPrint(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(C.iron); D.poly(gg, [[-1.2, 0], [-0.95, 0], [-0.35, 6.2], [-0.55, 6.2]]); D.poly(gg, [[1.2, 0], [0.95, 0], [0.35, 6.2], [0.55, 6.2]]);
    for (let k = 0; k < 5; k++) { const y = 0.6 + k * 1.15, wv = 1.05 - k * 0.12; D.poly(gg, [[-wv, y], [wv, y + 0.9], [wv, y + 1.05], [-wv, y + 0.15]]); }
    gg.fillStyle = ink(C.soot); D.rect(gg, -1.0, 6.1, 2.0, 1.3, 0.06); D.poly(gg, [[-1.2, 7.35], [1.2, 7.35], [0, 7.9]]);
    gg.fillStyle = ink(C.amber, 'print'); D.rect(gg, -0.7, 6.5, 1.4, 0.45);
    gg.fillStyle = ink(C.ink, 'print'); D.rect(gg, -0.04, 6.5, 0.08, 0.45);
  }, { w: 2.6, h: 8.0, name: 'watchtower' }), (P) => P.glow((gg) => { gg.fillStyle = '#fff'; gg.fillRect(-0.7, 6.5, 1.4, 0.45); }));
}
// the far skyline: stacked sails of roofs and chimneys with a few lit windows
function skyline(w, h, col, seed) {
  const r = P2.rng(seed), top = [];
  for (let x = -w / 2; x < w / 2 - 1; x += 1.6 + r() * 2.4) { const y = h * (0.45 + r() * 0.55), x1 = Math.min(w / 2, x + 1.2 + r() * 1.5); top.push([x, y], [x1, y]); }
  const pts = [[-w / 2, 0], [w / 2, 0], [w / 2, top[top.length - 1][1]], ...top.slice().reverse()];
  const wins = Array.from({ length: 14 }, () => [-w / 2 + r() * w, r() * h * 0.45]);
  return [pts, (P) => { base2(P, col, 0.05); P.draw((gg) => { gg.fillStyle = C.amber; for (const [x, y] of wins) gg.fillRect(x, y, 0.35, 0.45); }); P.glow((gg) => { gg.fillStyle = '#fff'; for (const [x, y] of wins) gg.fillRect(x, y, 0.35, 0.45); }); }];
}

// ---- 6. the heroine: Erratum, a misprint cut from newsprint, marked for deletion -----------------------------------
// No hat: a shock of shredder strips for hair; a long newsprint coat with a torn hem; a pale face with a fold across
// it and the dark rings of someone who never sleeps; the proofreader's red deletion mark on her chest (the only red
// in the city); a paper lantern whose light is real and moves with her.
const E = { news: '#d7d2c4', newsSide: '#c4bfb1', face: '#e6e0d0', faceSide: '#d2ccbc', ink: '#1d1f1e', boot: '#2a2622', hair: '#cfc9b8' };
const heroDoll = () => {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const PROFILE = -Math.PI / 2;
  const card = ([pts, paint], seed, { x = 0, y = 0, z = 0, ry = 0, parent = body, back = 'mirror' } = {}) => {
    const m = makeCard(pts, { paint, paper: H.paper, thickness: 0.05, edgeWidth: 0.04, pxPerUnit: 72, seed, back, folds: [] });
    m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
  };
  const cols = (P) => P.draw((gg) => { const { box } = P, r = P2.rng(9); gg.fillStyle = rgba(C.newsInk, 0.5); for (let y = box.y0 + 0.08; y < box.y1 - 0.08; y += 0.07) { if (r() < 0.1) continue; gg.fillRect(box.x0 + 0.06, y, box.w * (0.35 + r() * 0.1), 0.022); gg.fillRect(box.x0 + box.w * 0.52, y, box.w * (0.32 + r() * 0.1), 0.022); } });
  const plainNews = (c) => (P) => { base2(P, c, 0.06); cols(P); };
  // legs: dark stockings, buttoned boots (the profile boot runs forward)
  const legs = [-0.12, 0.12].map((x, i) => {
    const hip = new THREE.Group(); hip.position.set(x, 0.95, 0); body.add(hip);
    const art = (side) => P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(E.ink); D.rect(gg, -0.09, 0.3, 0.18, 0.72, 0.05); gg.fillStyle = ink(E.boot); D.rect(gg, -0.12, 0, side ? 0.38 : 0.24, 0.38, 0.07); gg.fillStyle = ink(E.hair, 'print'); for (const y of [0.12, 0.22, 0.32]) D.ell(gg, side ? 0.12 : 0, y, 0.022, 0.022); }, { w: side ? 0.52 : 0.3, h: 1.04, name: 'leg' });
    card(art(false), 410 + i, { y: -0.97, parent: hip }); card(art(true), 420 + i, { y: -0.97, z: -0.2, ry: PROFILE, parent: hip });
    return hip;
  });
  // the coat: newsprint, a torn hem, lapels, a headline block, buttons, the red deletion mark
  const coat = (side) => withPrint(P2.drawnPiece((gg, ink) => {
    const r = P2.rng(side ? 12 : 11), w = side ? 0.27 : 0.42, hem = [];
    for (let k = 0; k <= 8; k++) hem.push([w - k * w / 4, 0.02 + r() * 0.12]);
    gg.fillStyle = ink(side ? E.newsSide : E.news); D.poly(gg, [...hem, [-w + 0.04, 1.5], [-w + 0.1, 1.62], [w - 0.1, 1.62], [w - 0.04, 1.5]]);
    if (!side) { gg.fillStyle = ink(sh(E.news, -0.12)); D.poly(gg, [[-0.16, 1.62], [0.16, 1.62], [0.04, 1.15], [-0.04, 1.15]]); }
  }, { w: side ? 0.6 : 0.9, h: 1.68, name: side ? 'coat side' : 'coat' }), (P) => {
    cols(P);
    if (side) return;
    P.draw((gg) => {
      gg.fillStyle = rgba(E.ink, 0.75); gg.fillRect(-0.38, 1.18, 0.2, 0.12); gg.fillRect(-0.38, 1.36, 0.16, 0.05);
      gg.fillStyle = E.ink; for (const y of [0.55, 0.8, 1.05]) { gg.beginPath(); gg.arc(0.08, y, 0.03, 0, 7); gg.fill(); }
      gg.strokeStyle = C.red; gg.lineWidth = 0.05; gg.lineCap = 'round'; gg.beginPath(); gg.moveTo(-0.32, 0.9); gg.lineTo(-0.12, 1.08); gg.bezierCurveTo(-0.02, 1.2, 0.12, 1.08, 0.02, 0.98); gg.bezierCurveTo(-0.08, 0.9, -0.16, 1.06, -0.04, 1.14); gg.stroke();
    });
  });
  card(coat(false), 401, { y: 0.45, back: plainNews(E.newsSide) });
  card(coat(true), 402, { y: 0.47, z: -0.36, ry: PROFILE });
  // the hair: shredder strips fanning up and out behind the face (newsprint too), and a profile fan
  const strips = (side) => withPrint(P2.drawnPiece((gg, ink) => {
    const r = P2.rng(side ? 32 : 31), n = side ? 9 : 13;
    gg.fillStyle = ink(E.hair); D.ell(gg, 0, 0.42, side ? 0.34 : 0.4, 0.4);
    for (let k = 0; k < n; k++) { const a = (side ? -1.9 : -1.25) + k / (n - 1) * (side ? 2.15 : 2.5), L = 0.55 + r() * 0.3, x0 = Math.sin(a) * 0.22, y0 = 0.5 + Math.cos(a) * 0.22; gg.fillStyle = ink(k % 3 ? E.hair : sh(E.hair, -0.12)); D.poly(gg, [[x0 - 0.045, y0], [x0 + 0.045, y0], [x0 + Math.sin(a) * L + 0.035, y0 + Math.cos(a) * L], [x0 + Math.sin(a) * L - 0.035, y0 + Math.cos(a) * L]]); }
  }, { w: 2.3, h: 1.7, name: 'hair' }), cols);
  card(strips(false), 403, { y: 1.62, z: -0.07, back: plainNews(E.hair) });
  card(strips(true), 408, { y: 1.62, z: -0.6, ry: PROFILE });
  // the face: pale, a fold across it, wide insomniac eyes with dark rings, a thin mouth
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(E.face); D.ell(gg, 0, 0.38, 0.33, 0.4);
    gg.fillStyle = ink(sh(E.face, -0.06), 'print'); D.poly(gg, [[-0.33, 0.62], [0.33, 0.3], [0.33, 0.26], [-0.33, 0.58]]);
    gg.fillStyle = ink('#8f877a', 'print'); D.ell(gg, -0.13, 0.4, 0.1, 0.11); D.ell(gg, 0.13, 0.4, 0.1, 0.11);
    gg.fillStyle = ink('#f4f0e4', 'print'); D.ell(gg, -0.13, 0.42, 0.07, 0.08); D.ell(gg, 0.13, 0.42, 0.07, 0.08);
    gg.fillStyle = ink(E.ink, 'print'); D.ell(gg, -0.12, 0.42, 0.035, 0.045); D.ell(gg, 0.14, 0.42, 0.035, 0.045);
    gg.fillStyle = ink(E.ink, 'print'); D.rect(gg, -0.07, 0.17, 0.14, 0.025, 0.01); D.rect(gg, -0.22, 0.56, 0.14, 0.03, 0.01); D.rect(gg, 0.08, 0.57, 0.14, 0.03, 0.01);
  }, { w: 0.74, h: 0.82, name: 'face' }), 404, { y: 1.86, back: plainNews(E.hair) });
  card(P2.drawnPiece((gg, ink) => {
    gg.fillStyle = ink(E.faceSide); D.ell(gg, 0.04, 0.38, 0.28, 0.38); D.poly(gg, [[0.28, 0.42], [0.38, 0.34], [0.28, 0.3]]);
    gg.fillStyle = ink('#8f877a', 'print'); D.ell(gg, 0.2, 0.42, 0.07, 0.08); gg.fillStyle = ink(E.ink, 'print'); D.ell(gg, 0.22, 0.43, 0.03, 0.04);
  }, { w: 0.76, h: 0.8, name: 'head side' }), 405, { y: 1.86, z: -0.56, ry: PROFILE });
  // arms: newsprint sleeves; the left hand holds the paper lantern
  const arms = [-0.44, 0.44].map((x, i) => {
    const s = new THREE.Group(); s.position.set(x, 1.98, 0); body.add(s);
    const art = (c) => withPrint(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(E.face); D.ell(gg, 0, 0.08, 0.08, 0.08); gg.fillStyle = ink(c); D.rect(gg, -0.11, 0.12, 0.22, 0.72, 0.08); }, { w: 0.26, h: 0.86, name: 'arm' }), cols);
    card(art(E.news), 430 + i, { y: -0.82, parent: s }); card(art(E.newsSide), 440 + i, { y: -0.82, z: -0.12, ry: PROFILE, parent: s });
    return s;
  });
  const lantern = new THREE.Group(); lantern.position.set(0, -1.05, 0.12); arms[1].add(lantern);
  card(withPrint(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(E.ink); D.rect(gg, -0.02, 0.5, 0.04, 0.22); gg.fillStyle = ink(C.amber); D.ell(gg, 0, 0.28, 0.2, 0.26); gg.fillStyle = ink(C.amberDeep, 'print'); for (const y of [0.16, 0.28, 0.4]) D.rect(gg, -0.19, y, 0.38, 0.025); gg.fillStyle = ink(E.ink); D.rect(gg, -0.12, 0, 0.24, 0.06); D.rect(gg, -0.1, 0.5, 0.2, 0.05); }, { w: 0.46, h: 0.76, name: 'lantern' }),
    (P) => P.glow((gg) => { gg.fillStyle = '#fff'; gg.beginPath(); gg.ellipse(0, 0.28, 0.2, 0.26, 0, 0, 7); gg.fill(); })), 450, { y: -0.72, parent: lantern });
  const glow = new THREE.PointLight('#ffb468', 7, 11, 1.3); glow.position.set(0, -0.45, 0.1); lantern.add(glow);   // her light is real: it lights the cobbles round her
  // the stride: rotation only; the lantern swings
  const legLen = 0.97 * 1.25, stepLen = 1.15, R = stepLen / (2 * legLen);
  const leg = (ph, gait) => { const u = (ph / Math.PI) % 2, A = gait * R; if (u >= 1) return A * (3 - 2 * u); const e = u * u * (3 - 2 * u); return A * (2 * e - 1); };
  g.userData.stride = (walked, gait) => {
    const ph = walked / stepLen * Math.PI, l0 = leg(ph, gait), l1 = leg(ph + Math.PI, gait);
    legs[0].rotation.x = -l0; legs[1].rotation.x = -l1;
    arms[0].rotation.x = l0 * 0.7; arms[1].rotation.x = 0.15 * gait;
    lantern.rotation.x = -0.15 * gait + Math.sin(ph) * 0.18 * gait;
    body.position.y = Math.abs(Math.sin(ph)) * 0.04 * gait;
  };
  return g;
};

// ---- 7. the railcar: soot green, amber windows ---------------------------------------------------------------------
function railcar() {
  const L = 7.2, W = 2.3, Hh = 2.3, body = '#2f3a33';
  const side = (P) => {
    const { box } = P;
    base2(P, body, 0.06);
    P.layer((gg) => { gg.fillStyle = sh(C.cream, -0.2); gg.fillRect(box.x0 - 1, box.y0 + box.h * 0.4, box.w + 2, box.h * 0.06); }, C.cream, { shadow: 0.5 });
    P.layer((gg) => { gg.fillStyle = C.ink; for (const u of [0.18, 0.82]) D.rect(gg, box.x0 + box.w * u - 0.8, box.y0 - 0.2, 1.6, 0.42, 0.08); }, C.ink);
    P.draw((gg) => { for (let k = 0; k < 6; k++) { const x = box.x0 + 0.5 + k * (box.w - 1) / 6 + 0.06; gg.fillStyle = C.ink; gg.fillRect(x - 0.04, box.y0 + box.h * 0.52 - 0.04, 0.88, 0.7); gg.fillStyle = C.amber; gg.fillRect(x, box.y0 + box.h * 0.52, 0.8, 0.62); } });
    P.glow((gg) => { gg.fillStyle = '#fff'; for (let k = 0; k < 6; k++) { const x = box.x0 + 0.5 + k * (box.w - 1) / 6 + 0.06; gg.fillRect(x, box.y0 + box.h * 0.52, 0.8, 0.62); } });
    shadeIn(P, body, 0.3);
  };
  const end = (P) => { const { box } = P; base2(P, body, 0.06); P.draw((gg) => { gg.fillStyle = C.ink; gg.fillRect(box.x0 + 0.3, box.y0 + box.h * 0.52, box.w - 0.6, 0.66); gg.fillStyle = C.amber; gg.fillRect(box.x0 + 0.36, box.y0 + box.h * 0.54, box.w - 0.72, 0.58); gg.fillStyle = '#fff2c8'; gg.beginPath(); gg.arc(box.x0 + 0.45, box.y0 + box.h * 0.25, 0.16, 0, 7); gg.arc(box.x1 - 0.45, box.y0 + box.h * 0.25, 0.16, 0, 7); gg.fill(); }); P.glow((gg) => { gg.fillStyle = '#fff'; gg.fillRect(box.x0 + 0.36, box.y0 + box.h * 0.54, box.w - 0.72, 0.58); }); };
  const roof = (P) => { base2(P, '#4a4f49', 0.06); P.marks('rivet', { color: sh('#4a4f49', -0.4), alpha: 0.5, size: 0.05 }); };
  const tube = prismFold(rect(L, W), { h: Hh, roof: 'flat', paper: H.paper, seed: 541, print: { pxPerUnit: 40, effects: 1 }, paints: { wall: [side, end, side, end], roof } });
  const g = new THREE.Group(); tube.position.z = W / 2; g.add(tube);
  g.userData.follow = (p) => tube.userData.follow?.(p);
  return g;
}

// ---- 8. the world --------------------------------------------------------------------------------------------------
// a piece the game unfolds lies FACE DOWN toward the camera: its blank back shows, the print appears as it rises
const FACE_DOWN = Math.PI / 2 - 0.02;
const keepOut = [], mark = (x, z, r) => keepOut.push([x, z, r]);
const STATION = { x0: 4, x1: 31, z0: -8.5, z1: 0.8 };
const inStation = (x, z, m = 0) => x > STATION.x0 - m && x < STATION.x1 + m && z > STATION.z0 - m && z < STATION.z1 + m;
const free = (x, z, m = 0) => line.dist(x, z) > 3.0 + m && !inStation(x, z, m) && keepOut.every(([hx, hz, r]) => Math.hypot(x - hx, z - hz) > r + m)
  && ZONES.every((Zn) => Math.hypot(x - Zn.c[0], z - Zn.c[1]) > 4.4 + m) && [...BLOCKS, BUREAU].every((B) => !inBox(x, z, B, 1.2 + m)) && Math.hypot(x - CLOCK[0], z - CLOCK[1]) > 3 + m;
const LIFE = { lamps: [] };
const street = (x, z, o = {}) => { const h = popup(...lampPost(), { x, z, ...o }); H.glowing(h.group); LIFE.lamps.push([x, z]); return h; };
let hero = null;

function buildStation() {
  const QX = 16, QZ = 0.6, QW = 18, QD = 3.0, QH = 0.55;
  const stoneFace = (P) => { base2(P, C.soot, 0.06); P.marks('brick', { color: sh(C.soot, -0.42), alpha: 0.5, size: 0.5 }); P.layer((gg) => { gg.fillStyle = C.amber; gg.fillRect(P.box.x0 - 1, P.box.y1 - 0.12, P.box.w + 2, 0.12); }, C.amber); };
  const deckPrint = (P) => { base2(P, '#6a6b62', 0.05); P.marks('dot', { color: sh('#6a6b62', -0.3), alpha: 0.35, size: 0.02, density: 0.5 }); P.layer((gg) => { gg.fillStyle = C.amberDeep; gg.fillRect(P.box.x0 - 1, P.box.y0 + 0.62, P.box.w + 2, 0.1); }, C.amberDeep, { shadow: 0.4 }); };
  const quai = platform({ w: QW, d: QD, h: QH, paper: H.paper, seed: 511, support: true, paints: { face: stoneFace, deck: deckPrint, support: stoneFace }, print: H.cardOpts(QX, QZ) });
  quai.name = 'quai';
  const q = popup(null, null, { node: quai, height: QH, x: QX, z: QZ, yaw: 0, level: true });
  walk.add(quai);
  const deck = quai.userData.deck, o = q.order + 0.5;
  for (const [dx, k] of [[-6.5, 0], [-3.3, 1], [-0.6, 2]]) popup(...passerby(k), { parent: deck, x: dx, z: -2.2, order: o });   // waiting for a train that never leaves
  popup(...poster('ATTENDEZ'), { parent: deck, x: 4.6, z: -2.5, order: o });
  for (const dx of [-8, 7.8]) H.glowing(popup(...lampPost(), { parent: deck, x: dx, z: -0.4, order: o }).group);
  popup(...bin(), { parent: deck, x: 2.3, z: -2.2, order: o });
  terminus(QX, QZ - QD - 0.05);
  H.lamp(QX - 8, 3, QZ - 0.6, 1, 12); H.lamp(QX + 7.8, 3, QZ - 0.6, 1, 12);
  popup(...crates(), { x: 27, z: -0.6, yaw: -0.2 });
  popup(...barrier(), { x: 5.4, z: -0.9 });
  // the heroine, on the platform
  const doll = heroDoll();
  hero = popup(null, null, { node: doll, height: 3.1, x: 11.5, z: -0.9, sway: 0.1, scale: 1.45 });
  H.setHero(hero, { stride: doll.userData.stride }); H.glowing(hero.group);
  const [tx, tz] = trackAt(S_STATION);
  const car = popup(null, null, { node: railcar(), height: 2.3, x: tx, z: tz, yaw: 0, level: true, sight: false, flat: FACE_DOWN });
  car.held = true; H.glowing(car.group);
  return car;
}

function buildZone(Zn) {
  const [sx, sz] = Zn.sig, [nx, nz] = Zn.n;
  rnd = P2.rng(700 + Zn.i * 31);
  const hold = (h) => { h.held = true; Zn.hinges.push(h); return h; };
  H.glowing(hold(popup(...relay(), { x: sx, z: sz, cross: 'half-front', second: { ymax: 1.3 }, flat: FACE_DOWN })).group);
  // what each relay brings back: a corner of the city the Bureau had folded away
  const SETS = [
    [['passer', 0], ['bin'], ['poster', 'SOUVENEZ-VOUS'], ['crates']],
    [['tree'], ['rubble'], ['passer', 1], ['barrier']],
    [['speaker'], ['passer', 2], ['bin'], ['rubble']],
    [['tree'], ['poster', 'NOUS ÉTIONS ICI'], ['crates'], ['passer', 0]],
    [['rubble'], ['passer', 1], ['barrier'], ['bin']],
  ];
  const KIND = { passer: passerby, bin, poster, crates, tree: () => deadTree(), rubble: () => rubble(), barrier, speaker };
  const [cx, cz] = Zn.c;
  clusterLayout(cx + nx * 0.6, cz + nz * 0.6, { n: SETS[Zn.i].length, size: 4.6, seed: 90 + Zn.i }).forEach((p, k) => {
    const [kind, arg] = SETS[Zn.i][k], [pts, paint] = KIND[kind](arg);
    if (line.dist(p.x, p.z) < 2.6) return;
    hold(popup(pts, paint, { x: p.x, z: p.z, scale: p.scale, cross: kind === 'tree' || kind === 'speaker', flat: FACE_DOWN }));
  });
  walk.solid(sx, sz, 0.45);
}

function buildWorld() {
  const car = buildStation();
  for (const Zn of ZONES) buildZone(Zn);
  rnd = P2.rng(301);
  BLOCKS.forEach((B, i) => tenement(B, 621 + i * 7));
  bureau();
  for (const T of TOWERS) { H.glowing(popup(...watchtower(), { x: T.at[0], z: T.at[1], cross: true }).group); walk.solid(T.at[0], T.at[1], 1.1); mark(T.at[0], T.at[1], 2.4); }
  // the plaza: a queue at the Bureau's window, speakers, posters, lamps
  { const qx = 7, qz = -10.2; for (let k = 0; k < 6; k++) popup(...passerby(k), { x: qx - k * 1.1, z: qz + k * 0.25, yaw: 0.05 }); mark(qx - 3, qz, 3.6); }
  for (const [x, z] of [[-6, -8], [9.5, -19]]) { popup(...speaker(), { x, z, cross: true }); mark(x, z, 1.4); }
  for (const [x, z, msg] of [[11, -8.5, 'TOUT EST EN ORDRE'], [-11.5, -2.5, 'PLIEZ-VOUS'], [16, -14, 'DORMEZ']]) if (free(x, z)) { popup(...poster(msg), { x, z }); mark(x, z, 1.8); }
  for (const [x, z] of [[-3, -5], [13, -12], [-17, -24], [6, -21], [-18, -3], [22, -17]]) if (free(x, z, -0.5)) { street(x, z); H.lamp(x + 0.8, 3.1, z, 0.8, 9); mark(x, z, 1.2); }
  // the far skyline along the top edge
  for (const [hx, hz] of [[-30, -52], [4, -56], [36, -50]]) H.stack(hx, hz, [0, 1, 2].map((k) => { const [pts, paint] = skyline(26 - k * 3, 12 - k * 2.5, sh('#3a423e', -0.1 + k * 0.08), 900 + k + hx); return { pts, paint, d: k * 1.6, dx: (k - 1) * 2 }; }));

  // the fill: dead trees, rubble, bins, crates and passers-by in small groups, only where the walking camera can see
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const dense = (x, z) => 0.5 + 0.25 * Math.sin(x * 0.13 + ph[0]) * Math.sin(z * 0.15 + ph[1]) + 0.18 * Math.sin(x * 0.2 + z * 0.17 + ph[2]);
  const V = (fn, n, cross = false) => Array.from({ length: n }, () => { const [pts, paint] = fn(); return [pts, H.printed(pts, paint, { res: 0.8, cross })]; });
  const VAR = { tree: V(() => deadTree(), 4, true), rubble: V(() => rubble(), 4), bin: V(bin, 1), crates: V(crates, 1), passer: [0, 1, 2].map((k) => { const [pts, paint] = passerby(k); return [pts, H.printed(pts, paint, { res: 0.8 })]; }), barrier: V(barrier, 1) };
  const put = (kind, x, z, o = {}) => { const vs = VAR[kind], [pts, mat] = vs[Math.floor(rnd() * vs.length)]; return popup(pts, null, { materials: mat, x, z, cross: kind === 'tree', sway: kind === 'tree' ? 0.15 : 0, ...o }); };
  const DRESS = ['rubble', 'rubble', 'bin', 'crates', 'passer', 'barrier', 'rubble'];
  const placed = [], trees = [];
  const [hx0, hz0] = [hero.group.position.x, hero.group.position.z];
  const corridor = (x, z) => z > hz0 - 1 && z < hz0 + 14 && Math.abs(x - hx0) < 8;
  const fill = (see, res) => {
    RES = res;
    for (let gz = -44; gz <= 14; gz += 3.6) for (let gx = -48; gx <= 50; gx += 3.6) {
      const x = gx + (rnd() - 0.5) * 2.6, z = gz + (rnd() - 0.5) * 2.6, l = dense(x, z);
      if (!see(x, z, 0.12, 4) || l < 0.36 || placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3.4)) continue;
      placed.push([x, z]);
      if (l > 0.6 && free(x, z, 1.4) && !corridor(x, z) && trees.every(([tx, tz]) => Math.hypot(x - tx, z - tz) > 7)) { trees.push([x, z]); put('tree', x, z, { scale: 0.9 + rnd() * 0.25 }); }
      else if (free(x, z, 0.8)) {
        const kinds = [...new Set(Array.from({ length: 2 + Math.floor(rnd() * 3) }, () => DRESS[Math.floor(rnd() * DRESS.length)]))];
        clusterLayout(x, z, { n: kinds.length, size: 3.6, seed: Math.round(x * 13 + z * 7) & 1023 }).forEach((p, k) => { if (free(p.x, p.z, 0.2)) put(kinds[k], p.x, p.z, { scale: p.scale * (0.85 + rnd() * 0.3) }); });
      }
    }
  };
  fill(H.inFrame, 1);
  fill((x, z, m, y) => H.inReach(x, z, 0.02, y) && !H.inFrame(x, z, m, y), 0.75);
  RES = 1;
  for (const [x, z, s, k] of [[-22, 8.5, 1.8, 'tree'], [-8, 9.5, 1.6, 'rubble'], [30, 9.5, 1.7, 'tree']]) put(k, x, z, { scale: s });
  return car;
}

let CAR = null;
if (flags.TEST) {
  const doll = heroDoll(); hero = popup(null, null, { node: doll, height: 3.1, x: 2, z: -4, scale: 1.45 }); H.setHero(hero, { stride: doll.userData.stride }); H.glowing(hero.group);
  popup(...deadTree(), { x: -3, z: -8, cross: true }); popup(...passerby(0), { x: 6.5, z: -6 }); popup(...rubble(), { x: -1, z: -2.5 });
  H.glowing(popup(...relay(), { x: 9, z: -9, cross: 'half-front', second: { ymax: 1.3 } }).group); street(-6, -3); H.lamp(-5.2, 3.1, -3, 1, 9);
} else CAR = buildWorld();

// ---- 9. the searchlights: a pale pool on the cobbles and a faint beam from each tower ------------------------------
const beamMat = (opacity, double = false) => new THREE.MeshBasicMaterial({ color: '#e8c890', transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: double ? THREE.DoubleSide : THREE.FrontSide });
const lights = TOWERS.map((T) => {
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.0, 40), beamMat(0.11));
  const halo = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.6, 40), beamMat(0.045));
  pool.rotation.x = halo.rotation.x = -Math.PI / 2; pool.position.y = 0.06; halo.position.y = 0.05;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 2.6, 1, 24, 1, true), beamMat(0.022, true));
  if (!flags.TEST) H.scene.add(pool, halo, beam);
  return { T, pool, halo, beam, x: T.c[0], z: T.c[1] };
});
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _top = new THREE.Vector3();
function sweep(t) {
  for (const L of lights) {
    const { T } = L, a = t * T.w + T.ph;
    L.x = T.c[0] + Math.cos(a) * T.r[0]; L.z = T.c[1] + Math.sin(a * 1.3) * T.r[1];
    L.pool.position.x = L.halo.position.x = L.x; L.pool.position.z = L.halo.position.z = L.z;
    _top.set(T.at[0], 6.8, T.at[1]); _d.set(L.x - _top.x, -_top.y, L.z - _top.z); const len = _d.length();
    L.beam.position.copy(_top).addScaledVector(_d, 0.5); L.beam.scale.set(1, len, 1);
    L.beam.quaternion.setFromUnitVectors(_up, _d.normalize().negate());   // the narrow end (+y) at the tower
  }
}
sweep(0);

// ---- 10. a living city: rain, crows, moths at the lamps, smoke, blowing paper -------------------------------------
const life = createLife({ scene: H.scene, camera: H.camera, heroHeight: H.heroHeight, seed: 41, wind: [0.9, 0.4] });
if (!flags.TEST) {
  life.fallers({ count: 160, cut: 'streak', streak: true, colors: ['#8c948c', '#a8aea4'], size: [0.5, 0.8], fall: [7, 9], land: 0.1, tumble: 0, sway: 0 });
  life.fallers({ count: 16, cut: 'confetti', colors: [C.news, '#bdb8aa'], size: [0.25, 0.35], fall: [0.3, 0.6], wind: 1.6, land: 6 });
  life.flock({ size: 6, height: 4, colors: ['#151716', '#232624'] });
  life.flyers({ count: 10, size: 0.1, colors: ['#e9e2cc', '#cfc6ad'], anchors: LIFE.lamps, roam: 0.5, height: [2.6, 3.4], flap: 16 });
  life.puffs({ at: CHIMNEYS, perEmitter: 3, life: 5, rise: 0.5, size: [0.3, 0.6], colors: ['#4a4f4a', '#5c605a'] });
}
life.reset(H.target);
H.onStep((t, dt) => life.update(dt, H.target));
H.onRestart(() => life.reset(H.target));

// ---- 11. the game: light the relays under the searchlights before the Pli, then the last railcar leaves ------------
const $ = (id) => document.getElementById(id);
const pips = $('pips'); ZONES.forEach(() => pips.appendChild(document.createElement('i')));
const LIMIT = 150, START = [11.5, -0.9];
const ANNOUNCE = ['Le Bureau des Plis vous remercie de votre calme.', 'Ce qui est plié n’a jamais existé.', 'Rentrez chez vous. Dormez.', 'Tout souvenir doit être déclaré au guichet.'];
let started = false, done = false, t0 = 0, toastT = 0, caughtT = 0, announceT = 18, ann = 0, respawn = START, warned = false;
const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const toast = (msg, ms = 2600) => { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); };
const best = () => { try { return Number(localStorage.getItem('ville-pliee-best')) || 0; } catch { return 0; } };
const saveBest = (s) => { try { if (!best() || s < best()) localStorage.setItem('ville-pliee-best', String(s)); } catch { /* sans stockage : pas de record */ } };
const elapsed = () => (performance.now() - t0) / 1000;

function unfold(Zn) {
  Zn.up = true; respawn = Zn.c;
  Zn.hinges.forEach((h, k) => { h.held = false; h.set(1, 0.05 + k * 0.12); });
  const n = ZONES.filter((z) => z.up).length;
  $('count').textContent = `${n} / ${ZONES.length}`;
  pips.children[Zn.i].classList.add('on');
  if (n < ZONES.length) toast(`Relais rallumé · encore ${ZONES.length - n}`);
  else finish();
}
const train = { s: S_STATION, v: 0, dir: 1, wait: 0, live: false };
function finish() {
  done = true; const t = elapsed(); saveBest(t);
  toast('Voie libre : le dernier autorail part');
  if (CAR) { CAR.held = false; CAR.set(1, 0.4); }
  train.live = true; train.wait = 2.4;
  setTimeout(() => { $('endTime').textContent = `Temps : ${fmt(t)}${best() ? ` · record : ${fmt(best())}` : ''}`; $('end').hidden = false; $('again').focus(); }, 4200);
}
function fold() {   // the Grand Pli: the whole city folds flat, the heroine with it
  done = true;
  toast('Le Grand Pli', 4000);
  window.__papercraft.toggle();
  setTimeout(() => { $('lost').hidden = false; $('again2').focus(); }, 3800);
}
function caught() {
  caughtT = 2; toast('Repérée. Retour au dernier relais.');
  document.body.classList.add('flash'); setTimeout(() => document.body.classList.remove('flash'), 420);
  if (window.__papercraft.place(respawn[0] + 0.8, respawn[1] + 0.8) == null) window.__papercraft.place(...START);
}
const S_END = TLEN - 6;
H.onStep((t, dt) => {
  if (!flags.TEST) sweep(t);
  if (started && !done) {
    const left = LIMIT - elapsed();
    $('clock').textContent = fmt(left);
    if (left < 30 && !warned) { warned = true; toast('Le Pli approche'); document.body.classList.add('late'); }
    if (left <= 0) fold();
    if ((announceT -= dt) <= 0) { announceT = 26; toast(ANNOUNCE[ann++ % ANNOUNCE.length], 3400); }
    const p = H.hero.group.position;
    for (const Zn of ZONES) if (!Zn.up && Math.hypot(p.x - Zn.c[0], p.z - Zn.c[1]) < 3.7) unfold(Zn);
    if ((caughtT -= dt) <= 0 && !done && lights.some((L) => Math.hypot(p.x - L.x, p.z - L.z) < 2.8)) caught();
  }
  if (!train.live || !CAR) return;
  if (train.wait > 0) { train.wait -= dt; return; }
  const goal = train.dir > 0 ? S_END : S_STATION, left = Math.abs(goal - train.s), vmax = 7.5, a = 2.2;
  train.v = Math.min(vmax, train.v + a * dt, Math.sqrt(2 * a * left) + 0.05);
  train.s += train.dir * train.v * dt;
  if ((train.dir > 0 && train.s >= goal) || (train.dir < 0 && train.s <= goal)) { train.s = goal; train.v = 0; train.dir = -train.dir; train.wait = train.dir > 0 ? 6 : 3; }
  const [x, z, tx, tz] = trackAt(train.s);
  CAR.group.position.x = x; CAR.group.position.z = z; CAR.group.rotation.y = Math.atan2(tz, -tx);
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
for (const id of ['again', 'again2']) $(id).addEventListener('click', () => location.reload());
$('stay').addEventListener('click', () => { $('end').hidden = true; });
if (flags.TEST || new URLSearchParams(location.search).has('capture')) { intro.hidden = true; $('hud').hidden = true; }
for (const b of document.querySelectorAll('#pad button')) {
  const code = b.dataset.k, send = (type) => dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('on'); send('keydown'); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { if (!b.classList.contains('on')) return; b.classList.remove('on'); send('keyup'); });
}
window.__ligne = { ZONES, unfold, train, trackAt, begin, fold, lights };

H.start();
