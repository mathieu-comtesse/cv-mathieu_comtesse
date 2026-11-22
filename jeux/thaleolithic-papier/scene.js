// THALEOLITHIC : papier : le village des Crânes Fendus en pop-up de carton (skill papercraft). Seul le rendu change :
// la campagne, les quêtes, les mini-jeux et les contenus ISO 45001 sont ceux du jeu Unity (campaign.js + ses données).
//
// PAPER SPEC ---------------------------------------------------------------------------------------------------------
// BRIEF    le village préhistorique de l'écran d'accueil du jeu : crépuscule pourpre et orangé, pins rouge sang, huttes de
//          peaux sur arceaux d'os de mammouth, feu de camp, grand menhir veillé par un ancien, rivière, mammouths.
// PALETTE  sol herbe sèche #b9a06a / terre battue #c79a6a ; pins #b8402e #8e2f2a ; peaux #8a5a3a ; os #ead9b8 ;
//          menhir #8f8aa0 ; rivière #6f7fb0 ; accent feu #f0a040 ; encre #2a1a1e ; ombre prune #6a3048.
// LIGHT    soleil bas et orangé (golden hour) venant de la gauche, remplissage mauve, ombres prune, feux qui éclairent.
// TYPES    dômes en tranches (huttes cousues), croix (pins, flammes, fumée), cartes (habitants, palissade, ateliers,
//          greniers, séchoirs), menhir taillé et cromlech, eau imprimée (rivière), voiles (crêtes du fond).
// PLAN     une enceinte ovale de pieux autour de la place du foyer ; huttes en anneau ; sanctuaire au nord ; métiers à
//          l'ouest, réserves à l'est ; porte au sud ; le village change avec les chapitres et les choix (STAGES).
import * as THREE from 'three';
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, clusterLayout, boxFold } from 'papercraft/lib/paperkit-3d.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { createHarness } from './harness.js';
import { MENHIR_QUEST } from './campaign.js';
import { PROFILE, DEFAULT, GESTURE, PROPS, dress, dressTop } from './characters.js';
import { BEASTS, HERDS, PIECES } from './fauna.js';

export const C = {
  ground: '#a6a274', dirt: '#c8a47c', grassA: '#9a9a66', grassB: '#aca676', pine: '#b8402e', pineDeep: '#8e2f2a', trunk: '#4a2c24',
  hide: '#8a5a3a', hideB: '#a0683e', bone: '#ead9b8', stone: '#8f8aa0', stoneB: '#a39cb0', water: '#6f7fb0', fire: '#f0a040',
  ink: '#2a1a1e', skin: '#d9a07a', skinB: '#b97a54', hair: '#3a2418', ochre: '#c98a3a', red: '#a83a2a', moss: '#7a8a4a',
};
const sh = P2.shade, rgba = P2.rgba, D = P2.draw2;
const CREPUSCULE = { key: '#ffbe8a', ki: 2.7, dir: [-0.85, 0.48, 0.5], fill: '#8a7ab8', fi: 1.0, sky: '#c8a0c8', skyG: '#6a4a5a', si: 0.55, leak: '#6a3048', wrap: 0.35, glow: 1.0, lamp: 5,
  post: { exposure: 0.9, tint: [1.0, 0.98, 1.02], saturation: 0.95, haze: '#c89aa8', hazeStart: 30, hazeEnd: 90, hazeAmount: 0.3, vignette: 0.08, vignetteColor: '#2a1830', shadowTint: '#3a2040' } };

// ---- the village plan: a palisaded oval round a hearth square ------------------------------------------------------
// the square and its great hearth in the middle; a ring of huts with their doors on the square; the chief's hut to the
// north-west; the sanctuary of the Grand Menhir at the far end; the trades to the west (flint, wood), the stores to the
// east, the infirmary by the gate; a palisade all round, a gate to the south (the gathering point just outside) and two
// gaps, toward the hunting clearing and the quarry; the river beyond the east wall.
export const SITES = {
  foyer: { x: 0, z: -5, label: 'Le foyer' }, grand_menhir: { x: 0, z: -18, label: 'Le Grand Menhir' }, rassemblement: { x: 12, z: 10, label: 'Point de rassemblement' },
  atelier_silex: { x: -15, z: -2, label: 'L’atelier de silex' }, pierre_carriere: { x: 22, z: -28, label: 'La carrière' }, stockage: { x: 14, z: -6, label: 'Le stockage' },
  chasse_clairiere: { x: -22, z: -29, label: 'La clairière de chasse' }, habitations: { x: 13, z: -17, label: 'Les habitations' },
  aurelien: { x: -4, z: -10, label: 'Aurélien' }, mathieu: { x: 5, z: -2, label: 'Mathieu' }, lorette: { x: -9, z: -13, label: 'Lorette' },
  nork: { x: -11, z: -20, label: 'Ouways' }, alban: { x: 5, z: -17, label: 'Alban' },
  repos: { x: -8, z: 4, label: 'L’infirmerie' }, bois_construction: { x: -19, z: -11, label: 'Bûcherons' },
};
export const WALL = { cx: 0, cz: -9, rx: 25, rz: 17.5, gates: [[0, 0.13], [2.41, 0.15], [-2.44, 0.15]] };   // angle 0 = south (toward the camera)
// where each villager stands (the givers stand on their own site)
const HOME = { aurelien: 'aurelien', mathieu: 'mathieu', lorette: 'lorette', nork: 'nork', alban: 'alban', georges: [-13, 0], eliott: [-20, -25], mathilde: [3, 0.5],
  milena: [26.6, -6.2], neila: [16.5, -3.5], orok: [-2.5, -1.5], brok: [-17, 0.5], tarek: [-21, -8.5], uma: [10.5, -20], kora: [-24, -26], sila: [-3.5, 0], varg: [7, 8], grumb: [-6, -19.6], petit_os: [1.5, 0] };

const LOOK = {   // tunic, trim, hair, a prop: each villager in their own colours
  milena: ['#5a6a8a', '#c8d0e8', '#3a2418', null], aurelien: ['#7a3a2a', '#e0b04a', '#5a3a28', null], mathieu: ['#4a6a6a', '#ead9b8', '#2a1a12', 'tablette'], lorette: ['#8a5a8a', '#ead9b8', '#6a2a1a', null],
  nork: ['#5a6a8a', '#e0b04a', '#2a1a12', 'pinceau'], alban: ['#ead9b8', '#8a5a3a', '#d8d0c0', 'baton'], georges: ['#8a6a3a', '#3a2a1a', '#3a2a1a', 'masse'],
  eliott: ['#5a7a4a', '#c98a3a', '#4a2a18', 'lance'], mathilde: ['#c8c0a0', '#a83a2a', '#7a3a1a', null], neila: ['#a0683e', '#4a6a6a', '#1a1210', null],
  orok: ['#6a4a3a', '#f0a040', '#2a1a12', null], brok: ['#7a5a4a', '#ead9b8', '#4a3a2a', null], tarek: ['#5a4a2a', '#c98a3a', '#2a1a12', 'hache'],
  uma: ['#8a7a5a', '#a83a2a', '#5a2a1a', null], kora: ['#7a6a4a', '#ead9b8', '#8a4a1a', 'lance'], sila: ['#a07a5a', '#f0a040', '#3a2418', null],
  varg: ['#4a3a3a', '#a83a2a', '#1a1210', 'lance'], grumb: ['#d8d0c0', '#6a4a8a', '#e8e0d0', 'baton'], petit_os: ['#c98a3a', '#ead9b8', '#3a2418', null],
};

export function buildVillage(campaign) {
  const H = createHarness({ ground: C.ground, stock: '#f6ecdc', mood: 'crepuscule', moods: { crepuscule: CREPUSCULE }, play: true, clickFold: false,
    view: innerWidth < innerHeight ? { pitch: 47, dist: 78, target: [2, 1.5, -7], follow: [-1.5, -8] } : { pitch: 47, dist: 62, target: [0, 1.5, -8] },
    walkArea: { x0: -28, x1: 28, z0: -32, z1: 12 } });
  const { walk } = H;
  const FIRES = [], TREES = [];   // the flames that flicker (three prints shown in turn), the pines the wind bends
  let rnd = P2.rng(301);
  const between = (a, b) => a + rnd() * (b - a);
  const base2 = (P, c, k = 0.1, felt = 0.5) => { P.gradient(sh(c, k), sh(c, -k), 0.5); P.felt(felt); };
  const shadeIn = (P, c, a = 0.35) => P.innerShade(sh(c, -0.6), { alpha: a, blurPx: 8 });
  const RIVER = P2.pathLine([[36, -40], [32, -28], [34, -16], [30.5, -4], [33, 8], [30, 20]], { step: 0.6 });
  // the palisade's oval: a point at angle a (0 = south), whether a point lies on the wall line, inside, in a gap
  const wallAt = (a, k = 1) => [WALL.cx + WALL.rx * k * Math.sin(a), WALL.cz + WALL.rz * k * Math.cos(a)];
  const ovalE = (x, z) => Math.hypot((x - WALL.cx) / WALL.rx, (z - WALL.cz) / WALL.rz);
  const angleOf = (x, z) => Math.atan2((x - WALL.cx) / WALL.rx, (z - WALL.cz) / WALL.rz);
  const inGap = (a) => WALL.gates.some(([g, w]) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < w);

  // ---- the printed ground: dry grass, the beaten square, paths, the wall's ditch, garden plots, the river -----------
  const PATHS = [[[0, 11], [0, 4], [0, -5]], [[0, -5], [0, -12], [0, -18]], [[0, -5], [-7, -3], [-15, -2], [-19, -11]], [[0, -5], [7, -4], [14, -6], [13, -17]],
    [[0, 4], [6, 8], [12, 10]], [[0, 2], [-8, 4]], [[13, -17], [18, -22], [22, -28]], [[-19, -11], [-19, -21], [-22, -29]], [[0, -18], [-6, -19], [-11, -20]], [[0, -5], [-4, -10], [-9, -13]]];
  H.printGround(({ g, ppu, X, Z, rnd: r, washes, torn, bandOf, drifts, water }) => {
    washes([C.grassA, C.grassA, C.grassB, '#b8a77a']);
    // inside the wall the grass is trodden paler; the square is beaten earth; a ditch runs outside the stakes
    torn(Array.from({ length: 60 }, (_, i) => wallAt(i / 60 * 6.283, 0.98)), rgba('#c2b080', 0.55));
    torn(Array.from({ length: 40 }, (_, i) => { const a = i / 40 * 6.283; return [SITES.foyer.x + Math.cos(a) * 8.5 * (1 + 0.06 * Math.sin(a * 3)), SITES.foyer.z + Math.sin(a) * 5.8]; }), rgba(C.dirt, 0.9));
    torn(Array.from({ length: 30 }, (_, i) => { const a = i / 30 * 6.283; return [Math.cos(a) * 6, -21 + Math.sin(a) * 4.2]; }), rgba('#b89a78', 0.75));   // the sanctuary
    g.strokeStyle = rgba('#6a5a3a', 0.35); g.lineWidth = 1.1 * ppu; g.beginPath();
    for (let i = 0; i <= 120; i++) { const [x, z] = wallAt(i / 120 * 6.283, 1.035); i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)); } g.stroke();
    for (const pl of PATHS) torn(bandOf(P2.pathLine(pl, { step: 0.5 }).pts, 1.15), rgba('#d8b483', 0.85));
    // ash rings under the hearths, chips by the flint workshop, sawdust at the woodcutters'
    for (const [x, z, rr] of [[SITES.foyer.x, SITES.foyer.z, 2.1], [-11, -4.6, 1.3]]) { g.fillStyle = rgba('#5a4a44', 0.55); g.beginPath(); g.ellipse(X(x), Z(z), rr * ppu, rr * 0.75 * ppu, 0, 0, 7); g.fill(); }
    for (let k = 0; k < 160; k++) { const x = SITES.atelier_silex.x + (r() - 0.5) * 4, z = SITES.atelier_silex.z - 1.4 + (r() - 0.5) * 2.4; g.fillStyle = rgba(r() < 0.5 ? '#8f8aa0' : '#d8d0e0', 0.8); g.fillRect(X(x), Z(z), 0.12 * ppu, 0.08 * ppu); }
    for (let k = 0; k < 220; k++) { const x = SITES.bois_construction.x + (r() - 0.5) * 4.5, z = SITES.bois_construction.z - 1 + (r() - 0.5) * 3; g.fillStyle = rgba('#e0c08a', 0.7); g.fillRect(X(x), Z(z), 0.1 * ppu, 0.06 * ppu); }
    // garden plots behind the huts: rows of sprouts
    for (const [x0, z0] of [[17, 1], [-21, 1.5], [8, -27]]) for (let row = 0; row < 5; row++) for (let k = 0; k < 9; k++) { g.fillStyle = rgba(k % 2 ? '#6a7a3a' : '#8a9a4a', 0.9); g.beginPath(); g.ellipse(X(x0 + k * 0.55), Z(z0 + row * 0.7), 0.16 * ppu, 0.1 * ppu, 0, 0, 7); g.fill(); }
    water(bandOf(RIVER.pts, 3.2), { colors: [C.water, sh(C.water, -0.2)], rim: '#e8d8b4', marks: 'none' });   // its strokes flow on a ribbon above (below)
    drifts((x, y) => { g.strokeStyle = rgba(r() < 0.5 ? '#8a8a4a' : '#a09a5a', 0.75); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 5 - r() * 5); g.stroke(); if (r() < 0.12) { g.fillStyle = r() < 0.5 ? '#c86a8a' : '#e0c050'; g.beginPath(); g.arc(x, y - 6, 1.7, 0, 7); g.fill(); } }, { n: 12000 });
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, x = SITES.rassemblement.x + Math.cos(a) * 2.8, z = SITES.rassemblement.z + Math.sin(a) * 2.2; g.fillStyle = '#efe4cc'; g.beginPath(); g.ellipse(X(x), Z(z), 0.32 * ppu, 0.22 * ppu, 0, 0, 7); g.fill(); }
  }, { seed: 12 });
  walk.block((x, z) => RIVER.dist(x, z) < 2.6);
  walk.block((x, z) => Math.abs(ovalE(x, z) - 1) < 0.035 && !inGap(angleOf(x, z)));   // the palisade, but its gate and gaps

  // ---- pieces ------------------------------------------------------------------------------------------------------
  const pine = (h = between(8, 11)) => {
    const w = h * 0.42, r = P2.rng(Math.floor(rnd() * 1e6)), tiers = 5;
    const pts = P2.roughen(P2.fromDrawing((g) => { D.rect(g, -0.25, 0, 0.5, h * 0.3); for (let k = 0; k < tiers; k++) { const y = h * (0.18 + k * 0.16), ww = w * (1 - k * 0.17); D.poly(g, [[-ww / 2, y], [ww / 2, y], [0, y + h * 0.3]]); } }, { w: w + 1.2, h: h * 1.25, name: 'pine' }), rnd);
    return [pts, (P) => {
      base2(P, C.pine, 0.12);
      for (let k = 0; k < tiers; k++) { const y = h * (0.18 + k * 0.16), ww = w * (1 - k * 0.17); P.layer((g) => { g.fillStyle = sh(k % 2 ? C.pine : C.pineDeep, 0.05 * k); D.poly(g, [[-ww / 2, y], [ww / 2, y], [0, y + h * 0.3]]); }, C.pine, { rim: 0.6 }); }
      P.layer((g) => { g.fillStyle = C.trunk; D.rect(g, -0.25, 0, 0.5, h * 0.2); }, C.trunk);
      P.layer((g) => { for (let k = 0; k < 14; k++) { g.fillStyle = k % 3 ? '#e07a3a' : '#f0b050'; P2.fillLeaf(g, (r() - 0.5) * w * 0.6, h * (0.25 + r() * 0.6), w * 0.12, -Math.PI / 2 + (r() - 0.5), 0.3); } }, '#e07a3a');
      shadeIn(P, C.pine, 0.3);
    }];
  };
  const rock = (w = between(2.4, 3.8)) => {
    const pts = P2.roughen(P2.shape.mound(rnd, { w, h: w * 0.6, lobes: 3, depth: 0.12 }), rnd, { amp: w * 0.03 });
    return [pts, (P) => { const { box } = P; base2(P, C.stone, 0.12); P.layer((g) => { g.fillStyle = sh(C.stone, -0.2); g.beginPath(); g.moveTo(box.x0 + box.w * 0.55, box.y1 + 1); g.lineTo(box.x1 + 1, box.y0 + box.h * 0.4); g.lineTo(box.x1 + 1, box.y0 - 1); g.lineTo(box.x0 + box.w * 0.4, box.y0 - 1); g.closePath(); g.fill(); }, sh(C.stone, -0.2), { lip: 0.7 }); P.layer((g) => { for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? C.moss : '#a0a060'; D.ell(g, box.x0 + box.w * (0.2 + rnd() * 0.6), box.y1 - box.h * 0.1, w * 0.07, w * 0.04); } }, C.moss); shadeIn(P, C.stone, 0.35); }];
  };
  const tuft = () => P2.drawnPiece((g, ink) => { const r = P2.rng(7); g.fillStyle = ink('#9a9a4a'); for (let k = 0; k < 7; k++) P2.fillLeaf(g, (k - 3) * 0.12, 0.05, 0.9 + r() * 0.4, Math.PI / 2 + (k - 3) * 0.25, 0.26); g.fillStyle = ink('#c86a8a', 'print'); D.ell(g, -0.2, 1.0, 0.09, 0.09); D.ell(g, 0.25, 0.9, 0.09, 0.09); }, { w: 2.4, h: 1.5, name: 'tuft' });
  const logs = () => P2.drawnPiece((g, ink) => { for (let k = 0; k < 3; k++) { g.fillStyle = ink(sh('#7a4a2a', k * 0.06)); D.rect(g, -1.1 + k * 0.15, k * 0.36, 2.2, 0.4, 0.18); g.fillStyle = ink('#e0b080', 'print'); D.ell(g, 1.0 + k * 0.15, k * 0.36 + 0.2, 0.14, 0.14); } }, { w: 3.2, h: 1.5, name: 'logs' });
  const pots = () => P2.drawnPiece((g, ink) => { for (const [x, s, c] of [[-0.7, 1, '#b8683a'], [0.2, 1.25, '#a0583a'], [0.9, 0.85, '#c88a4a']]) { g.fillStyle = ink(c); D.ell(g, x, 0.5 * s, 0.42 * s, 0.5 * s); D.rect(g, x - 0.2 * s, 0.85 * s, 0.4 * s, 0.25 * s, 0.05); g.fillStyle = ink(C.ink, 'print'); D.rect(g, x - 0.4 * s, 0.5 * s, 0.8 * s, 0.05 * s); } }, { w: 2.6, h: 1.5, name: 'pots' });
  // a dome hut: hide slices sewn from skins (seams, patches), cream bone arches, smoke-hole poles, and on the front
  // slice the doorway framed by two tusks, a half-drawn curtain and the household's mark (hands, zigzag, a skull)
  const hut = (x, z, r = 2.8, { hide = C.hide, mark = 'hands', open = true, held = false, solid = true } = {}) => {
    const R = P2.rng(Math.floor(x * 131 + z * 17 + 999));
    const slice = (k, n) => (P) => {
      const { box } = P, hc = sh(hide, -0.08 + k * 0.05); base2(P, hc, 0.1);
      P.marks('hatch', { color: sh(hide, -0.35), alpha: 0.3, size: 0.06, angle: 0.4 });
      P.layer((g) => { for (let p = 0; p < 3; p++) { g.fillStyle = sh(hide, (R() - 0.5) * 0.3); D.rect(g, box.x0 + box.w * (0.15 + R() * 0.6), box.y0 + box.h * (0.15 + R() * 0.5), box.w * 0.16, box.h * 0.16, 0.05); } }, hc, { lip: 0.6 });
      P.draw((g) => { g.strokeStyle = rgba(C.bone, 0.75); g.lineWidth = 0.07; g.setLineDash([0.18, 0.14]); for (const s of [-0.33, 0.33]) { g.beginPath(); g.moveTo(s * box.w, box.y0); g.quadraticCurveTo(s * box.w * 0.6, box.y1 * 0.8, 0, box.y1); g.stroke(); } g.setLineDash([]); });
      P.layer((g) => { g.strokeStyle = C.bone; g.lineWidth = 0.3; for (const s of [-0.62, 0, 0.62]) { g.beginPath(); g.ellipse(s * box.w * 0.5, box.y0, box.w * 0.24, box.h * 0.95, 0, Math.PI, 0, true); g.stroke(); } }, C.bone);
      if (k === n - 1 && open) {
        const dw = Math.min(1.1, box.w * 0.2), dh = Math.min(2.3, box.h * 0.62);
        P.layer((g) => { g.strokeStyle = C.bone; g.lineWidth = 0.34; g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * (dw + 0.35), box.y0); g.quadraticCurveTo(s * (dw + 0.55), box.y0 + dh, -s * 0.15, box.y0 + dh + 0.55); g.stroke(); } }, C.bone, { rim: 0.6 });
        P.layer((g) => { g.fillStyle = '#2a1a1e'; g.beginPath(); g.ellipse(0, box.y0, dw, dh, 0, Math.PI, 0, true); g.fill(); }, '#2a1a1e', { lip: 0 });
        P.layer((g) => { g.fillStyle = sh(hide, -0.25); D.poly(g, [[-dw, box.y0], [-dw * 0.2, box.y0], [0.1, box.y0 + dh * 0.95], [-dw * 0.6, box.y0 + dh * 0.8]]); }, sh(hide, -0.25));
        P.layer((g) => {
          g.fillStyle = mark === 'skull' ? C.bone : mark === 'zigzag' ? '#e0a24a' : '#c84a2a';
          if (mark === 'hands') for (const [hx, hy] of [[-box.w * 0.3, box.y0 + box.h * 0.45], [box.w * 0.28, box.y0 + box.h * 0.5]]) { D.ell(g, hx, hy, 0.22, 0.26); for (let f = 0; f < 5; f++) { const a = -0.9 + f * 0.45; D.ell(g, hx + Math.sin(a) * 0.36, hy + Math.cos(a) * 0.36, 0.06, 0.15, -a); } }
          if (mark === 'zigzag') { const y = box.y0 + box.h * 0.4; for (let i = 0; i < 10; i++) { const xx = -box.w * 0.42 + i * box.w * 0.09; if (Math.abs(xx) < dw + 0.5) continue; D.poly(g, [[xx, y], [xx + box.w * 0.045, y + 0.35], [xx + box.w * 0.09, y]]); } }
          if (mark === 'skull') { const y = box.y0 + dh + 0.6; D.ell(g, 0, y + 0.25, 0.42, 0.38); D.rect(g, -0.24, y - 0.15, 0.48, 0.3, 0.06); g.fillStyle = '#6a4a2a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 0.85, y + 0.55, 0.5, 0.12, s * 0.5, 0, 7); g.fill(); } }
        }, '#c84a2a');
        if (mark === 'skull') P.layer((g) => { const y = box.y0 + dh + 0.6; g.fillStyle = '#2a1a1e'; D.ell(g, -0.15, y + 0.28, 0.1, 0.11); D.ell(g, 0.15, y + 0.28, 0.1, 0.11); }, '#2a1a1e', { lip: 0 });
      }
      shadeIn(P, hide, 0.3);
    };
    const hs = H.dome(x, z, { r, h: r * 1.05, n: 4, paint: [0, 1, 2, 3].map((k) => slice(k, 4)), yaw: 0, flat: held ? FACE_DOWN : null });
    // the smoke-hole poles above the roof, on the middle slice
    hs.push(popup(...P2.drawnPiece((g, ink) => { g.strokeStyle = ink('#5a3a22'); g.lineWidth = 0.14; g.lineCap = 'round'; for (const s of [-1, 0, 1]) { g.beginPath(); g.moveTo(s * 0.5, r * 0.6); g.lineTo(-s * 0.5, r * 1.05 + 0.9); g.stroke(); } g.fillStyle = ink(C.bone); D.ell(g, 0, r * 1.05 + 0.55, 0.12, 0.12); }, { w: 1.6, h: r * 1.05 + 1.1, name: 'poles' }), { x, z: z - 0.2, yaw: 0, flat: held ? FACE_DOWN : null }));
    if (!held && solid) walk.solid(x, z, r * 0.95); return hs;
  };
  // a house of wattle and daub on a timber frame, thatched: while it is being built the wattle shows bare and the roof
  // is half thatched over its rafters; a box fold that rises from the page like the huts
  const daubWall = (wattle, door, seed) => (P) => {
    const { box } = P, r = P2.rng(seed);
    const weave = (g, x0, x1, y0, y1) => { g.fillStyle = '#7a5a32'; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.strokeStyle = '#d8b880'; g.lineWidth = 0.075; for (let y = y0 + 0.08; y < y1; y += 0.19) { g.beginPath(); for (let x = x0; x <= x1; x += 0.1) g.lineTo(x, y + Math.sin(x * 9 + y * 13) * 0.045); g.stroke(); } g.fillStyle = '#5a3a22'; for (let x = x0 + 0.3; x < x1; x += 0.6) g.fillRect(x, y0, 0.07, y1 - y0); };
    if (wattle) { P.fill('#7a5a32'); P.draw((g) => weave(g, box.x0, box.x1, box.y0, box.y1)); }
    else {
      base2(P, '#c9a476', 0.08, 0.6); P.marks('hatch', { color: '#8a6a40', alpha: 0.18, size: 0.05, angle: 0.9 });
      P.draw((g) => { for (let k = 0; k < 2; k++) { const cx = box.x0 + box.w * (0.2 + 0.55 * k + r() * 0.1), cy = box.y0 + box.h * (0.3 + r() * 0.3); g.save(); g.beginPath(); g.ellipse(cx, cy, 0.38, 0.26, r(), 0, 7); g.clip(); weave(g, cx - 0.5, cx + 0.5, cy - 0.4, cy + 0.4); g.restore(); } });
    }
    P.layer((g) => { g.fillStyle = '#5a3a22'; D.rect(g, box.x0, box.y0, 0.24, box.h); D.rect(g, box.x1 - 0.24, box.y0, 0.24, box.h); D.rect(g, box.x0, box.y0, box.w, 0.16); if (door) { D.rect(g, box.x0, box.y1 - 0.22, box.w, 0.22); g.save(); g.translate(box.x0 + 0.2, box.y0 + 0.16); g.rotate(Math.atan2(box.h - 0.4, box.w * 0.28)); D.rect(g, 0, -0.08, Math.hypot(box.w * 0.28, box.h - 0.4), 0.16); g.restore(); } }, '#5a3a22');
    if (door) P.layer((g) => { const dw = 0.55, cx = (box.x0 + box.x1) / 2; g.fillStyle = '#2a1a1e'; D.rect(g, cx - dw, box.y0, dw * 2, box.h * 0.74, 0.25); g.fillStyle = '#7a4a32'; D.poly(g, [[cx - dw, box.y0], [cx - dw * 0.1, box.y0], [cx + 0.15, box.y0 + box.h * 0.72], [cx - dw, box.y0 + box.h * 0.72]]); }, '#2a1a1e', { lip: 0 });
    if (door && !wattle) P.layer((g) => { g.fillStyle = '#c84a2a'; const hx = box.x0 + box.w * 0.8, hy = box.y0 + box.h * 0.55; D.ell(g, hx, hy, 0.18, 0.22); for (let f = 0; f < 5; f++) { const a = -0.9 + f * 0.45; D.ell(g, hx + Math.sin(a) * 0.3, hy + Math.cos(a) * 0.3, 0.05, 0.13, -a); } g.fillStyle = '#e0a24a'; D.rect(g, box.x0 + box.w * 0.12, box.y0 + box.h * 0.5, 0.5, 0.42, 0.06); }, '#c84a2a');
    shadeIn(P, '#a07a52', 0.3);
  };
  const thatch = (bare) => (P) => {
    const { box } = P;
    if (bare) { P.fill('#6a4a2a'); P.draw((g) => { g.fillStyle = '#4a2c1a'; for (let x = box.x0 + 0.3; x < box.x1; x += 0.7) g.fillRect(x, box.y0, 0.12, box.h); }); }
    else base2(P, '#c8a050', 0.1, 0.4);
    P.draw((g) => { const top = bare ? box.y0 + box.h * 0.45 : box.y1; g.fillStyle = '#c8a050'; if (bare) g.fillRect(box.x0, box.y0, box.w, top - box.y0); g.strokeStyle = 'rgba(110,72,26,.55)'; g.lineWidth = 0.05; for (let x = box.x0; x < box.x1; x += 0.085) { g.beginPath(); g.moveTo(x, box.y0); g.lineTo(x + 0.06, top); g.stroke(); } g.fillStyle = 'rgba(130,88,36,.55)'; for (let y = box.y0 + 0.45; y < top; y += 0.55) g.fillRect(box.x0, y, box.w, 0.07); });
    shadeIn(P, '#c8a050', 0.25);
  };
  const houseOf = (x, z, { w = 4.4, d = 3.4, wallH = 2.2, roofH = 2.0, wattle = false, seed = 1 } = {}) => {
    const g = boxFold({ w, d, wallH, roofH, overhang: 0.35, paper: H.paper, seed, print: { pxPerUnit: 36 }, paints: { front: daubWall(wattle, true, seed), gable: daubWall(wattle, false, seed + 1), roof: thatch(wattle) } });
    let top = null;
    if (!wattle) {   // a chimney of daubed stones on the ridge: it rides the roof and folds flat with it; the smoke comes from its top
      const chH = roofH * 0.8, [cp, cpaint] = P2.drawnPiece((gg, ink) => { gg.fillStyle = ink('#8f8aa0'); D.poly(gg, [[-0.32, 0], [0.32, 0], [0.27, chH], [-0.27, chH]]); gg.fillStyle = ink('#c9a476'); for (let k = 0; k < 4; k++) D.rect(gg, -0.3 + (k % 2) * 0.1, k * chH / 4 + 0.05, 0.42, chH / 4 - 0.1, 0.06); gg.fillStyle = ink('#5a5470'); D.rect(gg, -0.36, chH - 0.12, 0.72, 0.18, 0.05); gg.fillStyle = ink('#2a1a1e'); D.ell(gg, 0, chH + 0.02, 0.2, 0.06); }, { w: 0.9, h: chH + 0.3, name: 'chimney' });
      const ch = makeCard(cp, { paint: cpaint, paper: H.paper, thickness: 0.05, edgeWidth: 0.04, pxPerUnit: 48, seed: seed + 11, back: 'mirror', folds: [] });
      ch.position.set(w * 0.24, -roofH * 0.25, 0.02); g.userData.ridge.add(ch); top = new THREE.Object3D(); top.position.set(0, chH + 0.15, 0); ch.add(top);
    }
    const h = popup(null, null, { node: g, x, z, yaw: 0, height: wallH + roofH });   // lifted from the page like a card, its walls and roof unfolding
    return { h, x, y: wallH + roofH, z, top };
  };
  // the hearth: a ring of stones, a teepee of sticks, the flame, a spit on forked sticks, log seats round it
  // a flame: three or four tongues, red outside, fire inside, a pale heart; three prints of it alternate (stop motion)
  const tongues = (seed, y0 = 0, k = 1) => P2.drawnPiece((g, ink) => { const r = P2.rng(seed);
    g.fillStyle = ink('#c84a2a'); P2.fillLeaf(g, (r() - 0.5) * 0.2 * k, y0, (2.0 + r() * 0.5) * k, Math.PI / 2 + (r() - 0.5) * 0.25, 0.45); for (const sd of [-1, 1]) P2.fillLeaf(g, sd * 0.42 * k, y0, (1.0 + r() * 0.5) * k, Math.PI / 2 + sd * (0.28 + r() * 0.25), 0.4);
    g.fillStyle = ink(C.fire); P2.fillLeaf(g, (r() - 0.5) * 0.3 * k, y0 + 0.1 * k, (1.5 + r() * 0.3) * k, Math.PI / 2 + (r() - 0.5) * 0.4, 0.42);
    g.fillStyle = ink('#f8e08a'); P2.fillLeaf(g, (r() - 0.5) * 0.2 * k, y0 + 0.15 * k, (0.8 + r() * 0.3) * k, Math.PI / 2 + (r() - 0.5) * 0.3, 0.4); }, { w: 2.4 * k, h: y0 + 3.0 * k, name: 'flame' });
  const hearthAt = (x, z, { big = false, lamp = true } = {}) => {
    const hs = [];
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, front = Math.cos(a) > 0.3; const s = (front ? 0.45 : 0.65) * (big ? 1.2 : 1); hs.push(popup(...rock(1.1), { x: x + Math.sin(a) * 1.5 * (big ? 1.25 : 1), z: z + Math.cos(a) * 1.05 * (big ? 1.25 : 1), scale: s, yaw: 0 })); }
    hs.push(popup(...P2.drawnPiece((g, ink) => { g.strokeStyle = ink('#5a3a22'); g.lineWidth = 0.16; g.lineCap = 'round'; for (const [a, b] of [[-0.9, 0.3], [0.9, -0.3], [-0.5, 0.6], [0.6, -0.5]]) { g.beginPath(); g.moveTo(a, 0); g.lineTo(b, 1.6); g.stroke(); } }, { w: 2.2, h: 1.8, name: 'teepee' }), { x, z: z - 0.25, yaw: 0 }));
    const fl = [0, 1, 2].map((k) => { const [pts, paint] = tongues(31 + k * 7); const f = popup(pts, (P) => { paint(P); P.glow((g) => { g.fillStyle = '#fff'; g.fillRect(-1.2, 0, 2.4, 3); }); }, { x, z, cross: true, sway: 0.6, scale: big ? 1.2 : 0.85 }); H.glowing(f.group); f.flame = true; hs.push(f); return f; });
    FIRES.push(fl); if (lamp) H.lamp(x, 1.6, z, big ? 1.4 : 0.9, big ? 13 : 8);
    if (big) {
      hs.push(popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const s of [-1, 1]) { D.rect(g, s * 1.9 - 0.08, 0, 0.16, 2.3); D.poly(g, [[s * 1.9 - 0.08, 2.2], [s * 1.9 - 0.4, 2.7], [s * 1.9 - 0.25, 2.75], [s * 1.9, 2.4], [s * 1.9 + 0.25, 2.75], [s * 1.9 + 0.4, 2.7], [s * 1.9 + 0.08, 2.2]]); } D.rect(g, -2.1, 2.42, 4.2, 0.13); g.fillStyle = ink('#3a2a2a'); D.ell(g, 0.4, 1.95, 0.42, 0.36); D.rect(g, 0.36, 2.25, 0.06, 0.2); g.fillStyle = ink('#a05a3a'); D.ell(g, -0.6, 2.25, 0.32, 0.18); }, { w: 4.8, h: 2.9, name: 'spit' }), { x, z: z - 0.5, yaw: 0 }));
      for (const a of [-1.9, -1.2, 1.2, 1.9, 2.6, -2.6]) hs.push(popup(...logSeat(), { x: x + Math.sin(a) * 3.4, z: z + Math.cos(a) * 2.6, yaw: a * 0.5, scale: 0.9 }));
    }
    walk.solid(x, z, big ? 1.8 : 1.3);
    return hs;
  };
  const logSeat = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#7a4a2a'); D.rect(g, -1.1, 0, 2.2, 0.55, 0.25); g.fillStyle = ink('#e0b080'); D.ell(g, 1.0, 0.28, 0.24, 0.26); g.fillStyle = ink('#5a3a22', 'print'); for (let k = 0; k < 4; k++) D.rect(g, -0.9 + k * 0.45, 0.2, 0.3, 0.04); }, { w: 2.6, h: 0.7, name: 'log seat' });
  // a palisade panel: pointed stakes of three woods lashed by two bands of fibre
  const stakes = (seed, L = 3.3, Hh = 2.8) => { const r = P2.rng(seed), n = 6, sw = L / n, hs = Array.from({ length: n }, () => Hh * (0.85 + r() * 0.3)), wood = ['#7a4a2a', '#8a5a32', '#6a4024'];
    return P2.drawnPiece((g, ink) => {
      for (let i = 0; i < n; i++) { const x0 = -L / 2 + i * sw + sw * 0.05, x1 = x0 + sw * 0.9, h = hs[i]; g.fillStyle = ink(wood[i % 3]); D.poly(g, [[x0, 0], [x1, 0], [x1, h - 0.35], [(x0 + x1) / 2 + (r() - 0.5) * 0.1, h], [x0, h - 0.35]]); g.fillStyle = ink(sh(wood[i % 3], -0.25), 'print'); D.rect(g, x0 + sw * 0.25, 0.2, 0.04, h * 0.6); D.rect(g, x0 + sw * 0.6, h * 0.3, 0.04, h * 0.4); }
      g.fillStyle = ink('#c8a870'); for (const y of [Hh * 0.22, Hh * 0.66]) D.poly(g, [[-L / 2, y], [L / 2, y + (r() - 0.5) * 0.1], [L / 2, y + 0.16], [-L / 2, y + 0.16]]);
      g.fillStyle = ink('#8a6a3a', 'print'); for (let i = 0; i <= n; i++) for (const y of [Hh * 0.22, Hh * 0.66]) D.rect(g, -L / 2 + i * sw - 0.04, y - 0.04, 0.08, 0.24);
    }, { w: L + 0.2, h: Hh * 1.2, name: 'stakes' }); };
  // a lean-to workshop: two forked posts, a slanted hide roof, a back screen, tools hanging under the eave
  const leanTo = (tools = 'flint') => P2.drawnPiece((g, ink) => {
    g.fillStyle = ink('#9a7a5a'); D.poly(g, [[-2.1, 0], [2.1, 0], [2.1, 2.2], [-2.1, 2.9]]);
    g.fillStyle = ink('#5a3a22'); for (const s of [-1, 1]) D.rect(g, s * 2.0 - 0.1, 0, 0.2, s < 0 ? 3.1 : 2.4);
    g.fillStyle = ink('#8a5a3a'); D.poly(g, [[-2.5, 3.0], [2.5, 2.25], [2.5, 2.6], [-2.5, 3.5]]);
    g.fillStyle = ink(C.bone, 'print'); for (let k = 0; k < 6; k++) D.rect(g, -2.3 + k * 0.85, 3.15 - k * 0.12, 0.05, 0.3);
    g.fillStyle = ink('#6a4a2a'); for (const hx of [-1.2, -0.2, 0.9]) D.rect(g, hx, 1.75 - (hx + 1.2) * 0.12, 0.05, 0.5);
    if (tools === 'flint') { g.fillStyle = ink(C.stone); D.poly(g, [[-1.4, 1.2], [-1.0, 1.25], [-1.15, 1.75]]); D.ell(g, -0.17, 1.4, 0.22, 0.14); g.fillStyle = ink('#e0a24a'); D.poly(g, [[0.7, 1.1], [1.1, 1.15], [0.95, 1.6]]); }
    else { g.fillStyle = ink('#a05a3a'); D.ell(g, -1.15, 1.2, 0.2, 0.25); g.fillStyle = ink('#e0a24a'); D.ell(g, -0.15, 1.25, 0.18, 0.2); g.fillStyle = ink('#6f7fb0'); D.ell(g, 0.95, 1.1, 0.2, 0.22); }
  }, { w: 5.4, h: 3.7, name: 'lean-to' });
  const anvil = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.stone); D.poly(g, [[-0.9, 0], [0.9, 0], [0.7, 0.9], [-0.8, 0.8]]); g.fillStyle = ink(sh(C.stone, 0.15)); D.poly(g, [[-0.8, 0.8], [0.7, 0.9], [0.5, 1.05], [-0.6, 1.0]]); g.fillStyle = ink('#5a5470'); for (const [x, y] of [[-0.3, 1.08], [0.15, 1.12]]) D.poly(g, [[x, y], [x + 0.25, y], [x + 0.1, y + 0.35]]); g.fillStyle = ink('#7a4a2a'); D.rect(g, 1.2, 0, 1.0, 0.5, 0.15); }, { w: 2.6, h: 1.5, name: 'anvil' });
  const wicker = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#a8885a'); D.rect(g, -1.7, 0, 3.4, 1.8, 0.1); g.strokeStyle = ink('#7a5a32', 'print'); g.lineWidth = 0.09; for (let y = 0.15; y < 1.8; y += 0.22) { g.beginPath(); for (let x = -1.7; x <= 1.7; x += 0.1) g.lineTo(x, y + Math.sin(x * 6 + y * 9) * 0.05); g.stroke(); } g.fillStyle = ink('#5a3a22'); for (let k = 0; k < 6; k++) D.rect(g, -1.7 + k * 0.68 - 0.05, 0, 0.1, 2.0); }, { w: 3.6, h: 2.1, name: 'wicker' });
  const rope = (L = 5, flags = '#e0a24a') => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); const n = Math.round(L / 1.7); for (let k = 0; k <= n; k++) D.rect(g, -L / 2 + k * L / n - 0.07, 0, 0.14, 1.25); g.strokeStyle = ink('#c8a870'); g.lineWidth = 0.07; g.beginPath(); for (let k = 0; k < n; k++) { const a = -L / 2 + k * L / n, b = a + L / n; g.moveTo(a, 1.1); g.quadraticCurveTo((a + b) / 2, 0.85, b, 1.1); } g.stroke(); g.fillStyle = ink(flags); for (let k = 0; k < n * 3; k++) { const x = -L / 2 + (k + 0.5) * L / (n * 3), y = 1.08 - 0.18 * Math.sin(((k % 3) + 0.5) / 3 * Math.PI); D.poly(g, [[x - 0.12, y], [x + 0.12, y], [x, y - 0.32]]); } }, { w: L + 0.4, h: 1.4, name: 'rope' });
  const granary = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const x of [-1.2, -0.4, 0.4, 1.2]) D.rect(g, x - 0.09, 0, 0.18, 1.5); g.fillStyle = ink('#a08860'); D.rect(g, -1.5, 1.4, 3, 1.6, 0.1); g.fillStyle = ink('#7a5a32', 'print'); for (let k = 0; k < 5; k++) D.rect(g, -1.5, 1.6 + k * 0.3, 3, 0.05); g.fillStyle = ink('#c8a050'); D.poly(g, [[-1.9, 2.9], [1.9, 2.9], [0.1, 4.6]]); g.fillStyle = ink('#a8802a', 'print'); for (let k = 0; k < 7; k++) D.rect(g, -1.6 + k * 0.48, 2.9, 0.05, 0.6); g.fillStyle = ink('#5a3a22'); D.poly(g, [[-0.5, 0.2], [-0.2, 0.2], [0.4, 1.45], [0.1, 1.45]]); }, { w: 4.2, h: 4.8, name: 'granary' });
  const rack = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const x of [-1.6, 1.6]) D.rect(g, x - 0.09, 0, 0.18, 2.4); for (const y of [0.3, 1.1, 1.9]) D.rect(g, -1.7, y, 3.4, 0.12); g.strokeStyle = ink('#5a3a22'); g.lineWidth = 0.1; g.beginPath(); g.moveTo(-1.6, 0.3); g.lineTo(1.6, 1.9); g.stroke(); for (const [x, y, c] of [[-1, 0.42, '#b8683a'], [0, 0.42, '#a0583a'], [1, 0.42, '#c88a4a'], [-0.8, 1.22, '#c8b090'], [0.6, 1.22, '#b8683a'], [-0.2, 2.02, '#a0583a'], [0.9, 2.02, '#c8b090']]) { g.fillStyle = ink(c); D.ell(g, x, y + 0.3, 0.32, 0.3); } }, { w: 3.8, h: 2.8, name: 'rack' });
  const wobblyPile = () => P2.drawnPiece((g, ink) => { let x = 0; for (let k = 0; k < 6; k++) { x += 0.22 + k * 0.05; g.fillStyle = ink(k % 2 ? '#c8b090' : '#a0683e'); D.rect(g, x - 0.9, k * 0.55, 1.8 - k * 0.1, 0.55, 0.15); } g.fillStyle = ink('#7a4a2a'); D.ell(g, x + 0.3, 3.5, 0.4, 0.3); }, { w: 4.4, h: 4.0, name: 'pile' });
  const chests = () => P2.drawnPiece((g, ink) => { for (const [x, c] of [[-1.5, '#8a5a32'], [0, '#7a4a2a'], [1.5, '#9a6a3a']]) { g.fillStyle = ink(c); D.rect(g, x - 0.6, 0, 1.2, 0.8, 0.08); g.fillStyle = ink(sh(c, 0.12)); D.rect(g, x - 0.65, 0.75, 1.3, 0.3, 0.12); g.fillStyle = ink('#e0a24a', 'print'); D.rect(g, x - 0.1, 0.55, 0.2, 0.3); } }, { w: 4.0, h: 1.2, name: 'chests' });
  const noticePost = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); D.rect(g, -0.1, 0, 0.2, 3.2); D.rect(g, -1.3, 2.9, 2.6, 0.14); g.fillStyle = ink(C.stoneB); for (const [x, y] of [[-0.95, 2.0], [0, 1.9], [0.95, 2.05]]) D.rect(g, x - 0.36, y, 0.72, 0.86, 0.06); g.fillStyle = ink(C.ink, 'print'); for (const [x, y] of [[-0.95, 2.0], [0, 1.9], [0.95, 2.05]]) for (let k = 0; k < 3; k++) D.rect(g, x - 0.25, y + 0.2 + k * 0.2, 0.5, 0.04); g.fillStyle = ink('#c84a2a', 'print'); D.ell(g, 0, 2.6, 0.08, 0.08); }, { w: 2.8, h: 3.4, name: 'notice' });
  const hornPost = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); D.rect(g, -0.1, 0, 0.2, 2.8); g.fillStyle = ink(C.bone); P2.fillLimb(g, -0.1, 2.5, 0.8, 3.1, 1.4, 2.3, 0.12, 0.35); g.fillStyle = ink('#c84a2a'); D.rect(g, -0.15, 2.3, 0.3, 0.12); }, { w: 3.0, h: 3.3, name: 'horn' });
  const seats = () => P2.drawnPiece((g, ink) => { for (let k = 0; k < 5; k++) { const x = -2.6 + k * 1.3; g.fillStyle = ink(sh(C.stone, (k % 2) * 0.1)); D.poly(g, [[x - 0.5, 0], [x + 0.5, 0], [x + 0.45, 0.9], [x - 0.42, 0.95]]); g.fillStyle = ink('#c84a2a', 'print'); D.ell(g, x, 0.5, 0.12, 0.12); } }, { w: 6.6, h: 1.1, name: 'seats' });
  const bunting = (L = 9) => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const s of [-1, 1]) D.rect(g, s * L / 2 - 0.1, 0, 0.2, 3.6); g.strokeStyle = ink('#c8a870'); g.lineWidth = 0.06; g.beginPath(); g.moveTo(-L / 2, 3.4); g.quadraticCurveTo(0, 2.6, L / 2, 3.4); g.stroke(); const cols = ['#c84a2a', '#e0a24a', '#ead9b8', '#6f7fb0', '#7a8a4a']; for (let k = 0; k < 13; k++) { const t = (k + 0.5) / 13, x = -L / 2 + t * L, y = 3.4 - 0.8 * 4 * t * (1 - t); g.fillStyle = ink(cols[k % 5]); D.poly(g, [[x - 0.25, y], [x + 0.25, y], [x, y - 0.55]]); } }, { w: L + 0.4, h: 3.8, name: 'bunting' });
  const marker = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); D.rect(g, -0.1, 0, 0.2, 2.2); g.fillStyle = ink('#e0a24a'); D.poly(g, [[-0.25, 1.9], [0.25, 1.9], [0, 2.6]]); g.fillStyle = ink(C.bone); D.ell(g, 0, 1.55, 0.25, 0.18); g.fillStyle = ink('#c84a2a'); D.poly(g, [[0.1, 1.2], [0.8, 1.05], [0.1, 0.9]]); }, { w: 1.2, h: 2.7, name: 'marker' });
  const tower = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const s of [-1, 1]) D.poly(g, [[s * 1.3 - 0.1, 0], [s * 1.3 + 0.1, 0], [s * 0.95 + 0.1, 4.2], [s * 0.95 - 0.1, 4.2]]); for (const y of [1.2, 2.6]) D.rect(g, -1.2, y, 2.4, 0.12); g.fillStyle = ink('#8a5a32'); D.rect(g, -1.3, 4.1, 2.6, 0.9, 0.08); g.fillStyle = ink('#8a5a3a'); D.poly(g, [[-1.6, 5.0], [1.6, 5.0], [0, 6.4]]); g.fillStyle = ink('#c84a2a'); D.poly(g, [[0, 6.4], [0.9, 6.15], [0, 5.95]]); }, { w: 3.4, h: 6.6, name: 'tower' });
  const bridge = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const x of [-3.2, -1.1, 1.1, 3.2]) D.rect(g, x - 0.12, 0, 0.24, 1.9); g.fillStyle = ink('#9a6a3a'); D.rect(g, -3.6, 0.8, 7.2, 0.35, 0.05); g.fillStyle = ink('#6a4024', 'print'); for (let k = 0; k < 18; k++) D.rect(g, -3.5 + k * 0.4, 0.82, 0.04, 0.31); g.strokeStyle = ink('#c8a870'); g.lineWidth = 0.08; g.beginPath(); for (const [a, b] of [[-3.2, -1.1], [-1.1, 1.1], [1.1, 3.2]]) { g.moveTo(a, 1.8); g.quadraticCurveTo((a + b) / 2, 1.45, b, 1.8); } g.stroke(); }, { w: 7.6, h: 2.1, name: 'bridge' });
  const hidesRack = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const s of [-1, 1]) D.rect(g, s * 1.3 - 0.08, 0, 0.16, 2.6); D.rect(g, -1.4, 2.45, 2.8, 0.12); g.fillStyle = ink('#b8885a'); D.poly(g, [[-1.1, 2.3], [1.1, 2.3], [1.0, 0.7], [0.3, 0.45], [-0.5, 0.5], [-1.05, 0.8]]); g.strokeStyle = ink('#5a3a22', 'print'); g.lineWidth = 0.04; for (const [a, b] of [[-1.1, 2.3], [1.1, 2.3], [1.0, 0.7], [-1.05, 0.8]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(a * 1.18, b); g.stroke(); } g.fillStyle = ink('#7a8a4a', 'print'); D.poly(g, [[-0.25, 1.4], [-0.1, 1.25], [0.3, 1.7], [0.2, 1.8], [-0.1, 1.45]]); }, { w: 3.0, h: 2.8, name: 'hides' });
  const trough = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const s of [-1, 1]) D.poly(g, [[s * 1.1 - 0.1, 0], [s * 1.1 + 0.1, 0], [s * 0.9 + 0.1, 0.9], [s * 0.9 - 0.1, 0.9]]); g.fillStyle = ink('#8a5a3a'); g.beginPath(); g.moveTo(-1.3, 0.95); g.quadraticCurveTo(0, 0.1, 1.3, 0.95); g.closePath(); g.fill(); g.fillStyle = ink('#6f7fb0'); D.ell(g, 0, 0.92, 1.15, 0.1); g.fillStyle = ink('#e8e0f4', 'print'); D.rect(g, -0.6, 0.9, 0.5, 0.04); }, { w: 2.8, h: 1.2, name: 'trough' });
  const hideHeap = () => P2.drawnPiece((g, ink) => { for (const [x, y, c] of [[-0.6, 0, '#a0683e'], [0.4, 0.15, '#8a5a3a'], [-0.1, 0.45, '#b8885a']]) { g.fillStyle = ink(c); D.poly(g, [[x - 0.9, y], [x + 0.9, y], [x + 0.7, y + 0.45], [x - 0.5, y + 0.5]]); } }, { w: 2.8, h: 1.1, name: 'heap' });
  const rollers = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.stone); D.poly(g, [[-1.6, 0.6], [1.6, 0.6], [1.3, 3.0], [-1.2, 2.8]]); g.fillStyle = ink('#7a4a2a'); for (const x of [-1.1, 0, 1.1]) { D.ell(g, x, 0.3, 0.3, 0.3); } g.strokeStyle = ink('#5a3a22'); g.lineWidth = 0.14; g.beginPath(); g.moveTo(1.4, 1.2); g.lineTo(2.8, 2.6); g.stroke(); g.strokeStyle = ink('#c8a870'); g.lineWidth = 0.07; g.beginPath(); g.moveTo(-1.4, 2.0); g.lineTo(-2.8, 1.0); g.stroke(); }, { w: 6.0, h: 3.2, name: 'rollers' });
  const clutter = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#7a4a2a'); D.rect(g, -1.4, 0, 2.6, 0.32, 0.12); D.poly(g, [[-0.6, 0.3], [1.6, 0.9], [1.5, 1.15], [-0.7, 0.55]]); g.fillStyle = ink(C.stone); D.ell(g, 1.2, 0.3, 0.4, 0.3); D.ell(g, -1.5, 0.25, 0.3, 0.25); }, { w: 3.6, h: 1.4, name: 'clutter' });
  const smoke = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#8a7a7a'); for (const [x, y, rr] of [[0, 0.6, 0.5], [0.3, 1.3, 0.6], [-0.2, 2.1, 0.75], [0.4, 2.9, 0.85]]) D.ell(g, x, y, rr, rr * 0.8); }, { w: 2.2, h: 3.8, name: 'smoke' });
  const rubble = () => P2.drawnPiece((g, ink) => { g.strokeStyle = ink(C.bone); g.lineWidth = 0.28; g.lineCap = 'round'; for (const [a, b, c, d] of [[-2.6, 0.1, -0.4, 1.6], [2.4, 0.1, 0.1, 1.3], [-1.2, 0.2, 1.6, 0.9]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); } g.fillStyle = ink('#7a4a32'); D.poly(g, [[-2.8, 0], [2.8, 0], [2.0, 0.7], [0.2, 1.1], [-1.8, 0.8]]); g.fillStyle = ink('#c84a2a'); D.poly(g, [[-0.2, 1.0], [0.4, 1.0], [0.1, 2.4]]); }, { w: 6.0, h: 2.6, name: 'rubble' });
  const props = () => P2.drawnPiece((g, ink) => { g.lineCap = 'round'; for (const sd of [-1, 1]) { g.strokeStyle = ink('#6a4024'); g.lineWidth = 0.42; g.beginPath(); g.moveTo(sd * 3.9, 0); g.lineTo(sd * 1.2, 3.4); g.stroke(); g.strokeStyle = ink('#c8a870'); g.lineWidth = 0.16; for (const t of [0.35, 0.7]) { g.beginPath(); g.moveTo(sd * (3.9 - 2.7 * t) - 0.25, 3.4 * t); g.lineTo(sd * (3.9 - 2.7 * t) + 0.25, 3.4 * t + 0.1); g.stroke(); } } g.fillStyle = ink('#c8402e'); D.poly(g, [[-2.75, 2.0], [-2.1, 2.1], [-2.3, 1.2], [-2.6, 1.4]]); g.fillStyle = ink('#d8c090'); D.rect(g, -0.9, 2.2, 1.2, 0.8, 0.05); g.fillStyle = ink('#6f7fb0'); D.rect(g, 0.6, 1.5, 0.9, 0.7, 0.05); g.fillStyle = ink('#2a1a1e', 'print'); for (let k = 0; k < 4; k++) D.rect(g, -0.85 + k * 0.3, 2.95, 0.05, 0.1); }, { w: 8.4, h: 3.8, name: 'props' });
  const tablet = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.stoneB); D.poly(g, [[-0.9, 0], [0.9, 0], [0.85, 1.7], [0, 1.95], [-0.85, 1.7]]); g.fillStyle = ink(sh(C.stone, -0.3), 'print'); for (let k = 0; k < 5; k++) D.rect(g, -0.6, 0.3 + k * 0.26, 1.2 - (k % 2) * 0.3, 0.05); g.fillStyle = ink('#c84a2a'); D.ell(g, 0.5, 0.35, 0.16, 0.16); }, { w: 2.0, h: 2.1, name: 'tablet' });
  const stepping = () => P2.drawnPiece((g, ink) => { for (const [x, s] of [[-2.4, 0.5], [-0.8, 0.4], [0.8, 0.45], [2.4, 0.5]]) { g.fillStyle = ink(C.stone); D.ell(g, x, s * 0.6, s * 1.2, s * 0.6); } }, { w: 6, h: 0.8, name: 'stepping' });
  const pigmentHood = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); for (const s of [-1, 1]) D.rect(g, s * 1.3 - 0.08, 0, 0.16, 2.2); g.fillStyle = ink('#b8885a'); D.poly(g, [[-1.7, 2.1], [1.7, 2.1], [0, 3.1]]); g.fillStyle = ink('#2a1a1e'); D.ell(g, 0, 2.55, 0.25, 0.18); for (const [x, c] of [[-0.6, '#c84a2a'], [0, '#e0a24a'], [0.6, '#2a1a1e']]) { g.fillStyle = ink(c); D.ell(g, x, 0.35, 0.28, 0.32); } }, { w: 3.6, h: 3.3, name: 'hood' });
  // the Grand Menhir: carved spirals, red hands, tablets; two lesser stones; a horseshoe of standing stones behind
  const menhir = (x, z) => {
    const hs = [];
    const slab = (h, w, tilt) => { const pts = [[-w / 2, 0], [w / 2, 0], [w * 0.38 + tilt, h * 0.9], [tilt * 0.4, h], [-w * 0.42 + tilt, h * 0.85]]; return P2.roughen(pts, rnd, { amp: w * 0.02 }); };
    const carve = (P) => {
      const { box } = P; base2(P, C.stone, 0.14, 0.6);
      P.layer((g) => { g.fillStyle = sh(C.stone, -0.22); D.poly(g, [[box.x0 + box.w * 0.55, box.y0 - 1], [box.x1 + 1, box.y0 - 1], [box.x0 + box.w * 0.75, box.y1 + 1]]); }, sh(C.stone, -0.22));
      P.draw((g) => { g.strokeStyle = rgba('#3a3448', 0.6); g.lineWidth = 0.1; for (const [cx, cy, n] of [[-0.3, box.h * 0.72, 3.4], [0.5, box.h * 0.58, 2.6]]) { g.beginPath(); for (let t = 0; t < n * 6.283; t += 0.15) { const rr = 0.06 * t; g.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr); } g.stroke(); } });
      P.layer((g) => { g.fillStyle = '#b8402e'; for (const [hx, hy] of [[-0.9, box.h * 0.45], [0.95, box.h * 0.82]]) { D.ell(g, hx, hy, 0.2, 0.24); for (let f = 0; f < 5; f++) { const a = -0.9 + f * 0.45; D.ell(g, hx + Math.sin(a) * 0.33, hy + Math.cos(a) * 0.33, 0.055, 0.14, -a); } } }, '#b8402e', { shadow: 0.3 });
      P.marks('tick', { color: sh(C.stone, -0.45), alpha: 0.4, size: 0.05, angle: 1.2 }); P.layer((g) => { for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? C.moss : '#a0a060'; D.ell(g, box.x0 + box.w * (0.2 + rnd() * 0.6), box.y0 + box.h * 0.06, 0.3, 0.12); } }, C.moss); shadeIn(P, C.stone, 0.35);
    };
    hs.push(popup(slab(10, 3.6, 0.3), carve, { x, z, yaw: -0.05, solid: 1.8 }));
    hs.push(popup(slab(6, 2.3, -0.4), (P) => { base2(P, C.stoneB, 0.12); P.marks('tick', { color: sh(C.stone, -0.4), alpha: 0.35, size: 0.05, angle: 1.0 }); shadeIn(P, C.stone, 0.35); }, { x: x - 2.8, z: z + 0.9, yaw: 0.2, solid: 1 }));
    hs.push(popup(slab(4.6, 1.9, 0.3), (P) => { base2(P, sh(C.stone, -0.06), 0.12); shadeIn(P, C.stone, 0.35); }, { x: x + 2.7, z: z + 1.2, yaw: -0.3, solid: 0.9 }));
    for (let k = 0; k < 9; k++) { const a = -1.75 + k * 3.5 / 8, R = 6.2, h = 2.2 + ((k * 7) % 5) * 0.35; hs.push(popup(slab(h, 1.2 + (k % 3) * 0.25, (k % 2 - 0.5) * 0.3), (P) => { base2(P, sh(C.stone, (k % 3) * 0.05 - 0.05), 0.12); shadeIn(P, C.stone, 0.35); }, { x: x + Math.sin(a) * R, z: z - Math.cos(a) * R * 0.7, solid: 0.6 })); }
    hs.push(popup(...pots(), { x: x - 1.2, z: z + 2.3, scale: 0.7 }), popup(...P2.drawnPiece((g, ink) => { g.strokeStyle = ink(C.bone); g.lineWidth = 0.2; g.lineCap = 'round'; for (const [a, b] of [[-0.8, 0.5], [0.7, -0.3]]) { g.beginPath(); g.moveTo(a, 0.1); g.lineTo(b, 0.6); g.stroke(); } g.fillStyle = ink(C.bone); D.ell(g, 0.1, 0.45, 0.32, 0.28); }, { w: 2.0, h: 1.0, name: 'bones' }), { x: x + 1.3, z: z + 2.4 }));
    return hs;
  };

  const totem = (x, z) => popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.trunk); D.rect(g, -0.18, 0, 0.36, 3.6); g.fillStyle = ink(C.bone); D.ell(g, 0, 3.7, 0.55, 0.45); g.fillStyle = ink(C.ink, 'print'); D.ell(g, -0.18, 3.75, 0.1, 0.12); D.ell(g, 0.18, 3.75, 0.1, 0.12); g.fillStyle = ink(C.red); D.poly(g, [[0.18, 3.0], [1.0, 2.8], [0.18, 2.5]]); }, { w: 2.2, h: 4.3, name: 'totem' }), { x, z, cross: 'half-front', second: { ymax: 1.2 } });
  const mammoth = () => P2.drawnPiece((g, ink) => {
    g.fillStyle = ink('#6a4a3a'); D.ell(g, 0, 1.6, 1.7, 1.15); D.ell(g, 1.5, 2.0, 0.85, 0.8); for (const x of [-1.1, -0.5, 0.5, 1.0]) D.rect(g, x - 0.22, 0, 0.44, 1.3, 0.12);
    g.fillStyle = ink('#5a3a2e'); P2.fillLimb(g, 2.1, 1.8, 2.5, 1.0, 2.2, 0.3, 0.32, 0.16);
    g.fillStyle = ink(C.bone); P2.fillLimb(g, 1.9, 1.5, 2.6, 1.2, 2.9, 1.8, 0.14, 0.06);
    g.fillStyle = ink('#8a6a4a', 'print'); for (let k = 0; k < 6; k++) D.rect(g, -1.3 + k * 0.4, 1.0, 0.06, 0.9); g.fillStyle = ink(C.ink, 'print'); D.ell(g, 1.75, 2.25, 0.07, 0.07);
  }, { w: 6.2, h: 3.0, name: 'mammoth' });
  // a villager: one card, hide tunic in their colours, hair, face, a prop of their trade
  const villager = (id) => {
    const [tunic, trim, hair, prop] = LOOK[id] || ['#8a6a4a', '#ead9b8', '#3a2418', null], tall = id === 'petit_os' ? 0.7 : 1;
    const own = PROFILE[id]?.prop;   // an accessory on a pivot is its own card, not printed here
    return P2.drawnPiece((g, ink) => {
      dress(id, g, ink, D, P2, C, tall, 'under');
      if (!own && (prop === 'lance' || prop === 'baton')) { g.fillStyle = ink('#6a4a2a'); D.rect(g, 0.62, 0, 0.1, 3.1 * tall); if (prop === 'lance') { g.fillStyle = ink(C.stone); D.poly(g, [[0.52, 3.05 * tall], [0.82, 3.05 * tall], [0.67, 3.5 * tall]]); } }
      g.fillStyle = ink(C.skinB); D.rect(g, -0.26, 0, 0.2, 0.9 * tall, 0.06); D.rect(g, 0.06, 0, 0.2, 0.9 * tall, 0.06);
      g.fillStyle = ink(tunic); D.poly(g, [[-0.55, 0.65 * tall], [0.55, 0.65 * tall], [0.42, 2.0 * tall], [-0.42, 2.0 * tall]]);
      g.fillStyle = ink(trim, 'print'); for (let k = 0; k < 5; k++) D.poly(g, [[-0.55 + k * 0.22, 0.65 * tall], [-0.44 + k * 0.22, 0.85 * tall], [-0.33 + k * 0.22, 0.65 * tall]]); D.rect(g, -0.45, 1.6 * tall, 0.9, 0.08);
      g.fillStyle = ink(C.skin); D.rect(g, -0.68, 1.15 * tall, 0.18, 0.75 * tall, 0.08); D.rect(g, 0.5, 1.15 * tall, 0.18, 0.75 * tall, 0.08);
      dress(id, g, ink, D, P2, C, tall, 'over');
      g.fillStyle = ink(hair); D.ell(g, 0, 2.42 * tall, 0.4, 0.42); g.fillStyle = ink(C.skin); D.ell(g, 0, 2.32 * tall, 0.32, 0.34);
      g.fillStyle = ink(hair); D.ell(g, 0, 2.6 * tall, 0.36, 0.16);
      if (id === 'aurelien') { g.fillStyle = ink(hair); D.poly(g, [[-0.25, 2.18 * tall], [0.25, 2.18 * tall], [0, 1.75 * tall]]); }
      g.fillStyle = ink(C.ink, 'print'); D.ell(g, -0.12, 2.36 * tall, 0.045, 0.055); D.ell(g, 0.12, 2.36 * tall, 0.045, 0.055); D.rect(g, -0.08, 2.17 * tall, 0.16, 0.03);
      dressTop(id, g, ink, D, P2, C, tall);
      if (!own && prop === 'tablette') { g.fillStyle = ink(C.stoneB); D.rect(g, -0.85, 1.1 * tall, 0.55, 0.7, 0.06); g.fillStyle = ink(C.ink, 'print'); for (let k = 0; k < 3; k++) D.rect(g, -0.78, 1.25 * tall + k * 0.18, 0.4, 0.04); }
      if (!own && (prop === 'masse' || prop === 'hache')) { g.fillStyle = ink('#6a4a2a'); D.rect(g, 0.55, 0.9, 0.09, 1.2); g.fillStyle = ink(C.stone); D.ell(g, 0.6, 2.1, 0.28, 0.2); }
      if (!own && prop === 'pinceau') { g.fillStyle = ink('#6a4a2a'); D.rect(g, 0.55, 1.2, 0.07, 1.0); g.fillStyle = ink(C.red); D.ell(g, 0.58, 2.2, 0.09, 0.14); }
      if (prop === 'transat') { g.fillStyle = ink('#a0683e'); D.poly(g, [[-1.2, 0], [-1.05, 0], [-0.62, 1.3], [-0.8, 1.4]]); D.rect(g, -0.85, 1.15, 0.4, 0.14); }
    }, { w: 3.0, h: 3.9 * tall, name: 'villager ' + id });
  };

  // ---- placement helpers -------------------------------------------------------------------------------------------
  const FACE_DOWN = Math.PI / 2 - 0.02;
  const popup = (pts, paint, o = {}) => H.popup(pts, paint, o);
  const keep = [], mark = (x, z, r) => keep.push([x, z, r]);
  const free = (x, z, m = 0) => RIVER.dist(x, z) > 4.2 + m && keep.every(([a, b, r]) => Math.hypot(x - a, z - b) > r + m) && Object.values(SITES).every((s) => Math.hypot(x - s.x, z - s.z) > 3.2 + m)
    && Math.abs(ovalE(x, z) - 1) > 0.09 && PATHS.every((pl) => P2.pathLine(pl, { step: 1 }).dist(x, z) > 1.6 + m);
  // the village changes with the campaign: pieces built under a condition stay folded flat until it holds (built later
  // in the story), or stand until it holds and then fold away (what the tribe corrects)
  const STAGES = [];
  const staged = (when, make, { undo = false, slot = null } = {}) => { const n0 = H.hinges.length; make(); const hs = H.hinges.slice(n0); if (!undo) for (const h of hs) h.held = true; STAGES.push({ when, hs, undo, on: undo, slot }); return hs; };
  const quest = (id) => { const q = campaign.data.quests.find((x) => x.id === id); return () => !!q && campaign.questDone(q); };
  const flag = (k) => () => !!campaign.state.flags[k];
  const any = (...fs) => () => fs.some((f) => f());

  // ---- the square: the great hearth, Aurélien's chair, the notice post (support), the alarm horn (emergency) -----
  const hearth = hearthAt(SITES.foyer.x, SITES.foyer.z, { big: true }); mark(SITES.foyer.x, SITES.foyer.z, 4.5);
  // ---- the huts round the square, doors to the camera; the chief's is the biggest, under a skull -------------------
  const HUTS = [[-7, -14.5, 3.4, '#7a4a32', 'skull'], [7.5, -12.5, 2.8, '#8a5a3a', 'hands'], [10, 0.5, 2.6, '#9a6a42', 'zigzag'], [-11, -7.5, 2.7, '#8a5a3a', 'zigzag'],
    [-8, 1, 2.5, '#a07a52', 'hands'], [-15.5, -16, 2.5, '#7a5236', 'hands'], [8, -23.5, 2.4, '#8a6044', 'zigzag'], [-16.5, 5.5, 2.3, '#946446', 'hands'], [18.5, -13, 2.3, '#7f5a3e', 'zigzag']];
  // the huts become houses of wattle and daub: the hut, then its wattle frame (wave 1 once the tribe has the means, wave 2
  // with the 15 differences), then the daubed and thatched house (the métamorphose, then the next cycle); the chief's last
  const CHIMNEYS = [];
  HUTS.forEach(([x, z, r, hide, m], i) => {
    mark(x, z, r + 1.4);
    const [t1, t2] = i === 0 ? [quest('V17_EVALUATION'), quest('V17_IMPROVEMENT')] : i % 2 ? [quest('V17_SUPPORT'), quest('V17_OPERATIONS')] : [quest('V17_OPERATIONS'), quest('V17_IMPROVEMENT')];
    const big = i === 0 ? 1.25 : 1, size = { w: r * 1.6 * big, d: r * 1.15 * big, wallH: 2.0 * big, roofH: 1.9 * big };
    const slot = { i, x, z };
    staged(t1, () => hut(x, z, r, { hide, mark: m }), { undo: true, slot: { ...slot, kind: 'hut' } });
    staged(() => t1() && !t2(), () => houseOf(x, z - 0.3, { ...size, wattle: true, seed: 900 + i * 7 }), { slot: { ...slot, kind: 'wattle' } });
    staged(t2, () => { const c = houseOf(x, z - 0.3, { ...size, seed: 950 + i * 7 }); c.dummy = new THREE.Object3D(); c.top.add(c.dummy); CHIMNEYS.push(c); }, { slot: { ...slot, kind: 'torchis' } });
  });
  // ---- the sanctuary: the Grand Menhir at the far end; the policy tablet appears once the duel is won ---------------
  const MEN = menhir(0, -22.5); mark(0, -22.5, 7);
  // ---- the trades: the flint workshop (west), the woodcutters, the stores (east) ---------------------------------
  const A = SITES.atelier_silex, B = SITES.bois_construction, S = SITES.stockage;
  popup(...leanTo('flint'), { x: A.x - 1.2, z: A.z - 3.2, yaw: 0.15 }); popup(...anvil(), { x: A.x + 0.4, z: A.z - 1.3 }); mark(A.x, A.z - 2, 3.4);
  popup(...logs(), { x: B.x - 1.8, z: B.z - 2.2 }); popup(...logs(), { x: B.x - 0.6, z: B.z - 2.8, yaw: 0.3 }); popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#7a4a2a'); D.rect(g, -0.6, 0, 1.2, 0.8, 0.1); g.fillStyle = ink('#e0b080'); D.ell(g, 0, 0.8, 0.6, 0.15); g.fillStyle = ink('#5a3a22'); D.poly(g, [[0.1, 0.85], [0.25, 0.85], [0.9, 2.0], [0.75, 2.05]]); g.fillStyle = ink(C.stone); D.poly(g, [[0.6, 1.8], [1.2, 1.6], [1.05, 2.2]]); }, { w: 2.0, h: 2.3, name: 'block' }), { x: B.x + 1.6, z: B.z - 1.2 }); mark(B.x, B.z - 2, 3.4);
  popup(...granary(), { x: S.x + 2.4, z: S.z - 2.6, solid: 1.4 }); popup(...pots(), { x: S.x - 0.4, z: S.z - 1.4 }); mark(S.x + 1, S.z - 2, 3.6);
  popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#c8b090'); D.rect(g, -2, 0, 4, 2.6, 0.1); g.fillStyle = ink(C.red, 'print'); D.ell(g, -0.9, 1.4, 0.45, 0.3); D.poly(g, [[0.2, 0.6], [1.6, 1.0], [0.6, 2.0]]); g.fillStyle = ink(C.ink, 'print'); for (let k = 0; k < 4; k++) D.rect(g, -1.6 + k * 0.9, 0.4, 0.08, 0.5); }, { w: 4.4, h: 2.8, name: 'painted wall' }), { x: SITES.nork.x - 0.8, z: SITES.nork.z - 2, yaw: 0.1 }); mark(SITES.nork.x, SITES.nork.z - 1, 3);
  popup(...pots(), { x: SITES.repos.x + 2.2, z: SITES.repos.z - 1.2 });
  for (const [dx, dz, w] of [[0, -2, 4.2], [3, 0, 3.4], [-2.5, 0.6, 3]]) popup(...rock(w), { x: SITES.pierre_carriere.x + dx, z: SITES.pierre_carriere.z + dz });
  mark(SITES.chasse_clairiere.x, SITES.chasse_clairiere.z, 4); mark(SITES.pierre_carriere.x, SITES.pierre_carriere.z, 4.5);
  totem(SITES.rassemblement.x + 3.2, SITES.rassemblement.z - 1); mark(SITES.rassemblement.x, SITES.rassemblement.z, 3.6);
  // ---- the trades as the Unity game has them: the knapper's bench and heat pit, the woodcutters' sawhorse, woodpile
  // and stump, the quarry's sledge, the tanners' beam and pit outside the wall, the smoking rack, the kitchen's oven and
  // quern, the potter's plank and kiln, the stores' baskets; the folds: the wattle fold of goats and sheep south-west of
  // the gate, the pigs' sty, the hens' coop on stilts by the stores
  const piece = (name) => { const Pc = PIECES[name]; return P2.drawnPiece((g, ink) => Pc.draw(g, ink, D, P2, C), { w: Pc.w, h: Pc.h, name }); };
  const beast = (kind, v) => { const B = BEASTS[kind]; return P2.drawnPiece((g, ink) => B.draw(g, ink, D, P2, C, v), { w: B.w, h: B.h, name: kind }); };
  popup(...piece('flintBench'), { x: A.x - 3.4, z: A.z - 0.6 }); popup(...piece('heatPit'), { x: A.x + 2.8, z: A.z - 2.8 }); mark(A.x - 3.4, A.z - 0.6, 2.6);
  popup(...piece('sawhorse'), { x: B.x + 0.4, z: B.z + 1.7 }); popup(...piece('woodpile'), { x: B.x - 3.4, z: B.z - 0.6, solid: 1.2 }); popup(...piece('stumpAxe'), { x: B.x + 2.6, z: B.z + 0.6 }); mark(B.x - 3.4, B.z - 0.6, 2.4);
  popup(...piece('quarrySledge'), { x: SITES.pierre_carriere.x - 3.2, z: SITES.pierre_carriere.z + 1.8 });
  popup(...piece('scrapeBeam'), { x: -27.4, z: -12.6 }); popup(...piece('tanPit'), { x: -25.2, z: -14.2 }); mark(-26.5, -13.4, 3);
  const SMOKER = [20.6, -7.6]; popup(...piece('smokeRack'), { x: SMOKER[0], z: SMOKER[1], solid: 1.2 }); mark(SMOKER[0], SMOKER[1], 2.8);
  popup(...piece('oven'), { x: 10.8, z: -9.4, solid: 1 }); popup(...piece('quern'), { x: 12.8, z: -9.0 }); mark(11.8, -9.3, 2.6);
  popup(...piece('pottery'), { x: -21, z: -15.4 }); mark(-21, -15.4, 2.6);
  popup(...piece('baskets'), { x: 12.2, z: -3.4 });
  const FOLD = { x: -17.3, z: 11.1, rx: 3.6, rz: 2.5 };
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, x = FOLD.x + Math.sin(a) * FOLD.rx, z = FOLD.z + Math.cos(a) * FOLD.rz, tx = FOLD.rx * Math.cos(a), tz = -FOLD.rz * Math.sin(a); let yaw = Math.atan2(-tz, tx); if (Math.cos(yaw) < 0) yaw += Math.PI; popup(...piece('hurdle'), { x, z, yaw, scale: Math.cos(a) > 0.5 ? 0.75 : 0.9 }); walk.solid(x, z, 0.5); }
  mark(FOLD.x, FOLD.z, 5);
  popup(...piece('sty'), { x: -25.6, z: 4.4 }); for (const [x, z, yaw] of [[-27.4, 7.6, 0.4], [-24.0, 8.2, -0.3]]) popup(...piece('hurdle'), { x, z, yaw, scale: 0.8 }); mark(-25.6, 6, 3.6);
  popup(...piece('coop'), { x: 21.2, z: -3.6, solid: 1.3 }); mark(21, -2, 3.2);
  // the herds: tame and wild, each a card of its kind (a few coats), set free to graze, peck, nap or keep away
  const HERD = [];
  for (const hd of HERDS) hd.at.forEach(([x, z], v) => { HERD.push({ hd, x, z, h: popup(...beast(hd.kind, v), { x, z, scale: hd.scale }) }); if (hd.wild) mark(x, z, 3.2); });
  // ---- the palisade: four printed panels stamped all round the oval; the gate's posts; the wall grows with the story --
  const PANELS = [0, 1, 2, 3].map((k) => { const [pts, paint] = stakes(700 + k); return [pts, H.printed(pts, paint)]; });
  const segs = [];
  for (let i = 0; i < 44; i++) {
    const a = (i + 0.5) / 44 * 6.283 - Math.PI; if (inGap(a)) continue;
    const [x, z] = wallAt(a), tx = WALL.rx * Math.cos(a), tz = -WALL.rz * Math.sin(a); let yaw = Math.atan2(-tz, tx); if (Math.cos(yaw) < 0) yaw += Math.PI;
    segs.push({ x, z, yaw, k: i, front: Math.cos(a) > 0.55 });
  }
  const panel = (s) => { const [pts, mat] = PANELS[s.k % 4]; popup(pts, null, { materials: mat, x: s.x, z: s.z, yaw: s.yaw, scale: s.front ? 0.7 : 1 }); };
  const growth = [quest('V17_CONTEXT'), quest('V17_SUPPORT'), quest('V17_OPERATIONS'), quest('V17_IMPROVEMENT')];
  segs.forEach((s, i) => { const tier = (i * 7) % 10; if (tier < 5) panel(s); else staged(growth[Math.min(3, tier - 5)] ?? growth[3], () => panel(s)); });
  for (const s of [-1, 1]) popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); D.rect(g, -0.22, 0, 0.44, 4.2); g.fillStyle = ink('#c8a870'); D.rect(g, -0.26, 1.2, 0.52, 0.2); D.rect(g, -0.26, 3.2, 0.52, 0.2); g.fillStyle = ink(C.bone); D.ell(g, 0, 4.35, 0.32, 0.3); }, { w: 1.0, h: 4.8, name: 'gate post' }), { x: s * 3.3, z: 8.3, yaw: 0 });
  staged(quest(MENHIR_QUEST), () => popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#6a4024'); D.rect(g, -3.6, 3.7, 7.2, 0.35, 0.1); g.fillStyle = ink(C.bone); D.ell(g, 0, 4.35, 0.75, 0.6); D.rect(g, -0.4, 3.85, 0.8, 0.4, 0.1); for (const s2 of [-1, 1]) P2.fillLimb(g, s2 * 0.5, 4.5, s2 * 1.8, 5.4, s2 * 1.4, 4.1, 0.22, 0.08); g.fillStyle = ink('#2a1a1e', 'print'); D.ell(g, -0.28, 4.4, 0.16, 0.18); D.ell(g, 0.28, 4.4, 0.16, 0.18); }, { w: 7.6, h: 5.6, name: 'lintel' }), { x: 0, z: 8.25, yaw: 0 }));

  // ---- chapters and choices -----------------------------------------------------------------------------------------
  // I : context: the scope is staked out, ochre-tipped markers round the village
  staged(quest('V17_CONTEXT'), () => { for (const [x, z] of [[-27, -6], [27, -6], [-6, -29.5], [17, 10.5], [-14, 9.5]]) popup(...marker(), { x, z, scale: 1.5 }); });
  // II : the duel won: the policy carved on a tablet at the menhir's foot
  staged(quest(MENHIR_QUEST), () => popup(...tablet(), { x: 0, z: -19.3 }));
  // III : the hunt for risks: the flint workshop, cut too close to the path (difference 11), gets a wicker screen and a roped-off zone
  staged(quest('V17_RISKS'), () => { popup(...wicker(), { x: A.x + 1.2, z: A.z + 0.6, yaw: -0.1 }); popup(...rope(5.5), { x: A.x - 0.5, z: A.z - 5.2, yaw: 0 }); });
  // IV : the means: three chests at the stores, the notice post with the tablets on the square
  staged(quest('V17_SUPPORT'), () => { popup(...chests(), { x: S.x - 2.4, z: S.z - 0.2 }); popup(...noticePost(), { x: 4.6, z: -10.2 }); });
  // V : the shelter: bare arches until the roof is chosen; C (checked) a sound hut; B (makeshift) the hut on props;
  //     A maintained against the alert: the collapse, and a cairn for the builder
  const Hb = SITES.habitations;
  staged(any(flag('choice:D_ABRI_A'), flag('choice:D_ABRI_B'), flag('choice:D_ABRI_C')), () => popup(...P2.drawnPiece((g, ink) => { g.strokeStyle = ink(C.bone); g.lineWidth = 0.3; for (const s of [-1.6, 0, 1.6]) { g.beginPath(); g.ellipse(s, 0, 1.3, 2.9, 0, Math.PI, 0, true); g.stroke(); } g.fillStyle = ink(C.bone); D.rect(g, -3, 0, 6, 0.3); g.fillStyle = ink('#7a4a2a'); D.rect(g, 2.2, 0, 1.4, 0.4, 0.1); }, { w: 6.6, h: 3.2, name: 'frame' }), { x: Hb.x, z: Hb.z - 0.6, yaw: 0 }), { undo: true });
  staged(any(flag('effective:M_V_ABRI'), flag('choice:D_ABRI_B')), () => hut(Hb.x, Hb.z - 1, 2.9, { hide: '#9a6a42', mark: 'hands', solid: false }));
  staged(flag('choice:D_ABRI_B'), () => popup(...props(), { x: Hb.x, z: Hb.z + 1.9 }));
  staged(flag('catastrophe'), () => { popup(...rubble(), { x: Hb.x, z: Hb.z - 0.6 }); popup(...rock(1.6), { x: Hb.x + 3.4, z: Hb.z + 1.2, scale: 0.8 }); });
  // VI : the 15 differences: what the tribe changed
  //   1 : the fire inside the tent: smoke out of the doorway, then the hearth moved outside in its stone ring
  staged(quest('V17_OPERATIONS'), () => popup(...smoke(), { x: -11, z: -5.2, cross: true, sway: 0.4 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => hearthAt(-11, -3.9, { lamp: false }));
  //   9 : the building site in the walkways: clutter on the path, then a roped-off zone
  staged(quest('V17_OPERATIONS'), () => popup(...clutter(), { x: 11.5, z: -13.2, yaw: 0.4 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => popup(...rope(6.5, '#c84a2a'), { x: Hb.x, z: Hb.z + 3.1 }));
  //  12 : Neila's stores stacked unsteadily, then a braced rack and clear passages
  staged(quest('V17_OPERATIONS'), () => popup(...wobblyPile(), { x: S.x - 2.6, z: S.z - 2.4 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => popup(...rack(), { x: S.x - 2.2, z: S.z - 2.8 }));
  //  14 : the river ford grown dangerous, then a footbridge; 5 : the megalith on rollers with levers; 3 : the pigments
  //  under a ventilated hood; 15 : the hides heaped on the square, then racks checked outside the wall
  staged(quest('V17_OPERATIONS'), () => popup(...stepping(), { x: 32, z: -10, yaw: 0 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => popup(...bridge(), { x: 31.5, z: -10, yaw: 0 }));
  staged(quest('V17_OPERATIONS'), () => popup(...rollers(), { x: SITES.pierre_carriere.x - 4.4, z: SITES.pierre_carriere.z + 1.6 }));
  staged(quest('V17_OPERATIONS'), () => popup(...pigmentHood(), { x: SITES.nork.x + 2.6, z: SITES.nork.z - 1.6 }));
  staged(quest('V17_OPERATIONS'), () => popup(...hideHeap(), { x: -3.6, z: -1.8 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => { for (const [x, z] of [[-28, -17], [-25.5, -21]]) popup(...hidesRack(), { x, z }); });
  // VII : fire!: the alarm horn on the square and water jars by the huts
  staged(quest('V17_EMERGENCY'), () => popup(...hornPost(), { x: 2.4, z: -10.9, scale: 1.4 }));
  // the fire's preparation (its game) leaves water jars by the huts and a water point of jars and a hide trough west of
  // the square: the bucket chain draws from it when the fire takes
  const WATER = [-6.2, -2.6];
  staged(flag('done:V17_PREPARE_FIRE'), () => { for (const [x, z] of [[-5, 1.5], [12.6, 1.6], [-8.6, -6], [10, -11.5]]) popup(...pots(), { x, z, scale: 0.6 }); popup(...pots(), { x: WATER[0] - 0.6, z: WATER[1] - 0.5, scale: 0.9 }); popup(...trough(), { x: WATER[0] + 0.9, z: WATER[1] + 0.2, scale: 0.9 }); });
  // VIII : the elders' audit: a ring of seats by the sanctuary
  staged(quest('V17_EVALUATION'), () => popup(...seats(), { x: -4.2, z: -18.4, yaw: 0.2, scale: 0.8 }));
  // the métamorphose (C03): Aurélien's own statue, under the awning he "had always planned"
  staged(quest('V17_OPERATIONS'), () => popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.stone); D.rect(g, -0.9, 0, 1.8, 0.8, 0.08); g.fillStyle = ink(C.stoneB); D.poly(g, [[-0.5, 0.8], [0.5, 0.8], [0.42, 2.1], [-0.42, 2.1]]); D.ell(g, 0, 2.5, 0.38, 0.42); D.rect(g, -0.75, 1.35, 0.25, 0.7, 0.08); D.rect(g, 0.5, 1.35, 0.25, 0.7, 0.08); g.fillStyle = ink(sh(C.stone, -0.25), 'print'); D.ell(g, -0.12, 2.55, 0.05, 0.06); D.ell(g, 0.12, 2.55, 0.05, 0.06); D.poly(g, [[-0.25, 2.2], [0.25, 2.2], [0, 1.85]]); g.fillStyle = ink('#5a3a22'); for (const sd of [-1, 1]) D.rect(g, sd * 1.35 - 0.07, 0, 0.14, 3.4); g.fillStyle = ink('#c8402e'); D.poly(g, [[-1.7, 3.2], [1.7, 3.2], [1.5, 3.7], [-1.5, 3.7]]); g.fillStyle = ink('#e0a24a', 'print'); for (let k = 0; k < 6; k++) D.poly(g, [[-1.7 + k * 0.57, 3.2], [-1.42 + k * 0.57, 2.95], [-1.13 + k * 0.57, 3.2]]); }, { w: 3.8, h: 3.9, name: 'statue' }), { x: -5.8, z: -11.6 }));
  // the next cycle (C06): an immense stone wheel stands before the gate
  staged(quest('V17_IMPROVEMENT'), () => popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.stone); D.ell(g, 0, 2.6, 2.5, 2.5); g.fillStyle = ink(sh(C.stone, 0.12)); D.ell(g, -0.2, 2.75, 2.0, 2.0); g.fillStyle = ink('#3a3448'); D.ell(g, 0, 2.6, 0.45, 0.45); g.fillStyle = ink(sh(C.stone, -0.3), 'print'); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; D.poly(g, [[Math.cos(a) * 0.6, 2.6 + Math.sin(a) * 0.6], [Math.cos(a + 0.12) * 1.9, 2.6 + Math.sin(a + 0.12) * 1.9], [Math.cos(a - 0.12) * 1.9, 2.6 + Math.sin(a - 0.12) * 1.9]]); } g.fillStyle = ink('#5a3a22'); D.poly(g, [[-1.6, 0], [-0.6, 0], [-1.1, 0.5]]); D.poly(g, [[0.6, 0], [1.6, 0], [1.1, 0.5]]); }, { w: 5.4, h: 5.4, name: 'wheel' }), { x: -7, z: 10.5 })); mark(-7, 10.5, 5);
  // IX : the next cycle: bunting over the square, a watchtower by the wall
  staged(quest('V17_IMPROVEMENT'), () => { popup(...bunting(10), { x: 0, z: -9.6 }); popup(...tower(), { x: 16, z: -22 }); });
  // the uprooted fire of the tent stays out (difference 1), kept clear of the walk
  walk.solid(-11, -3.9, 1.2);

  // ---- torches: a bound stake, a cup of clay, a little fire that flickers and lights the path ---------------------
  const torchCard = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); D.poly(g, [[-0.1, 0], [0.1, 0], [0.14, 2.5], [-0.14, 2.5]]); g.fillStyle = ink('#c8a870'); D.rect(g, -0.2, 2.2, 0.4, 0.14); D.rect(g, -0.2, 1.4, 0.4, 0.1); g.fillStyle = ink('#4a3030'); D.poly(g, [[-0.3, 2.45], [0.3, 2.45], [0.2, 2.85], [-0.2, 2.85]]); }, { w: 0.9, h: 3.0, name: 'torch' });
  const torchMat = H.printed(torchCard[0], torchCard[1]);
  const torchFire = [0, 1, 2].map((k) => { const [pts, paint] = tongues(77 + k * 5, 2.8, 0.42); return [pts, H.printed(pts, (P) => { paint(P); P.glow((g) => { g.fillStyle = '#fff'; g.fillRect(-1, 2.6, 2, 2); }); }, { cross: true })]; });
  for (const [x, z] of [[-4.6, 7.2], [4.6, 7.2], [-7.6, -8.8], [7.6, -8.4], [-3.4, -17.8], [7, -17.6], [-10.6, -1.4], [10.8, -9.8]]) {
    popup(torchCard[0], null, { materials: torchMat, x, z, yaw: 0 }); walk.solid(x, z, 0.35);
    FIRES.push(torchFire.map(([pts, mat]) => { const f = popup(pts, null, { materials: mat, x, z, cross: true, sway: 0.5 }); H.glowing(f.group); return f; }));
    H.lamp(x, 3.0, z, 0.55, 7);
  }

  // ---- outside the wall: the far ridge with mammoths, crimson pines in the woods, rocks; inside, tufts only ------------
  for (const [x, z, s] of [[-30, -44, 1.4], [-10, -48, 1.2], [18, -46, 1.5]]) H.stack(x, z, [0, 1, 2].map((k) => ({ pts: P2.roughen(P2.shape.hill(rnd, { w: 26 - k * 4, h: 7 - k * 1.6, bumps: 2 }), rnd), paint: (P) => { base2(P, sh('#8a6a8a', -0.12 + k * 0.1), 0.08); shadeIn(P, '#8a6a8a', 0.25); }, d: k * 1.6 })), { scale: s });
  const herd = [];
  for (const [x, z, s] of [[-20, -37, 1.0], [-14, -38, 0.8], [24, -37, 1.1]]) herd.push(popup(...mammoth(), { x, z, scale: s }));
  const PV = Array.from({ length: 4 }, () => { const [pts, paint] = pine(); return [pts, H.printed(pts, paint, { cross: true })]; });
  for (let gz = -42; gz <= 16; gz += 3.4) for (let gx = -42; gx <= 42; gx += 3.4) {
    const x = gx + (rnd() - 0.5) * 2.4, z = gz + (rnd() - 0.5) * 2.4, e = ovalE(x, z);
    if (!H.inReach(x, z, 0.05, 4) || !free(x, z, 0.5)) continue;
    if (e > 1.12 && (z < -24 || Math.abs(x) > 27 || z > 12) && rnd() < 0.8 && Math.hypot(x - SITES.rassemblement.x, z - SITES.rassemblement.z) > 5) { const [pts, mat] = PV[Math.floor(rnd() * PV.length)]; TREES.push(popup(pts, null, { materials: mat, x, z, cross: true, scale: 0.85 + rnd() * 0.3, sway: 0.3 })); mark(x, z, 2.6); }
    else if (rnd() < (e < 1 ? 0.18 : 0.35)) { popup(...(e < 1 || rnd() < 0.5 ? tuft() : rock(between(1.6, 2.6))), { x, z, scale: 0.8 + rnd() * 0.4, sway: 0.4 }); mark(x, z, 1.6); }
  }


  // ---- the villagers -------------------------------------------------------------------------------------------------
  const people = {};
  for (const id of Object.keys(LOOK)) {
    const home = HOME[id], [x, z] = typeof home === 'string' ? [SITES[home].x, SITES[home].z] : home;
    const h = popup(...villager(id), { x, z, yaw: 0 });
    const pr = { ...DEFAULT, ...(PROFILE[id] || {}) }, tall = id === 'petit_os' ? 0.7 : 1;
    const p = people[id] = { id, h, home: [x, z], x, z, target: null, y0: h.group.position.y, seed: Object.keys(people).length * 1.7, ph: 0, face: 1, pr };
    if (pr.prop) {   // the accessory turns about the right hand
      const A = PROPS[pr.prop], [ppts, ppaint] = P2.drawnPiece((g, ink) => A.draw(g, ink, D, P2, C), { w: A.w + 0.4, h: A.h + 1.6, name: 'prop ' + pr.prop }), card = makeCard(ppts, { paint: ppaint, paper: H.paper, thickness: 0.04, edgeWidth: 0.03, pxPerUnit: 56, seed: 800 + p.seed * 10, back: 'mirror', folds: [] });
      const g = new THREE.Group(); g.position.set(0.6, 1.5 * tall, 0.05); g.add(card); h.pivot.add(g); p.propG = g; p.propY = g.position.y;
      if (pr.prop === 'map') { card.position.x = -0.1; p.map = card; card.scale.x = 0.25; }
      if (pr.prop === 'staff') { p.smoke = new THREE.Object3D(); p.smoke.position.set(0, A.tip + 0.1, 0); g.add(p.smoke); }
    }
    walk.solid(x, z, 0.5);
  }
  // Aurélien's deck chair beside him; Alban's ritual circle with its smoking bowl; Milena's lookout stone on the bank
  popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#a0683e'); D.poly(g, [[-0.9, 0], [-0.75, 0], [0.1, 1.5], [-0.08, 1.6]]); D.poly(g, [[0.5, 0], [0.65, 0], [0.35, 0.7], [0.2, 0.7]]); g.fillStyle = ink('#c8402e'); D.poly(g, [[-0.62, 0.55], [0.6, 0.6], [0.05, 1.45], [-0.15, 1.42]]); g.fillStyle = ink('#e0a24a', 'print'); for (let k = 0; k < 4; k++) D.rect(g, -0.4 + k * 0.22, 0.7 + k * 0.17, 0.08, 0.35); }, { w: 1.9, h: 1.8, name: 'transat' }), { x: SITES.aurelien.x - 1.4, z: SITES.aurelien.z - 0.5 });
  const AL = SITES.alban;
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; if (Math.cos(a) > 0.6) continue; popup(...rock(0.9), { x: AL.x + Math.sin(a) * 1.9, z: AL.z + Math.cos(a) * 1.3, scale: 0.5, yaw: 0 }); }
  popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); D.poly(g, [[-0.3, 0], [0.3, 0], [0.18, 0.5], [-0.18, 0.5]]); g.fillStyle = ink('#3a2a2a'); D.ell(g, 0, 0.62, 0.42, 0.18); g.fillStyle = ink('#e0a24a'); D.ell(g, 0, 0.7, 0.2, 0.06); }, { w: 1.0, h: 0.9, name: 'bowl' }), { x: AL.x + 1.1, z: AL.z - 0.9 });
  popup(...rock(2.0), { x: 26.6, z: -7.4, scale: 0.8 });
  popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); D.rect(g, -0.05, 0, 0.1, 2.2); g.fillStyle = ink('#e0e8f4'); P2.fillLeaf(g, 0.05, 2.0, 0.6, 0.15, 0.35); g.fillStyle = ink('#6f7fb0'); P2.fillLeaf(g, 0.05, 1.7, 0.45, -0.3, 0.35); }, { w: 1.0, h: 2.6, name: 'vane' }), { x: 27.6, z: -6.8 });

  // ---- Dylan, the apprentice: a 3D paper model (frontal + profile card per part, limbs on pivots) ------------------
  const dylan = () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const PROFILE = -Math.PI / 2;
    const card = ([pts, paint], seed, { x = 0, y = 0, z = 0, ry = 0, parent = body } = {}) => { const m = makeCard(pts, { paint, paper: H.paper, thickness: 0.05, edgeWidth: 0.04, pxPerUnit: 64, seed, back: 'mirror', folds: [] }); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };
    const tunic = '#a0683e', sash = '#4a6a8a', skin = C.skin, hair = '#4a2a18';
    const legs = [-0.13, 0.13].map((x, i) => { const hip = new THREE.Group(); hip.position.set(x, 0.95, 0); body.add(hip); const art = (side) => P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(C.skinB); D.rect(gg, -0.1, 0.2, 0.2, 0.82, 0.06); gg.fillStyle = ink('#6a4a2a'); D.rect(gg, -0.13, 0, side ? 0.36 : 0.26, 0.26, 0.08); gg.fillStyle = ink(C.bone, 'print'); D.rect(gg, -0.13, 0.22, side ? 0.36 : 0.26, 0.05); }, { w: side ? 0.5 : 0.32, h: 1.05, name: 'leg' }); card(art(false), 410 + i, { y: -0.97, parent: hip }); card(art(true), 420 + i, { y: -0.97, z: -0.2, ry: PROFILE, parent: hip }); return hip; });
    card(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(tunic); D.poly(gg, [[-0.45, 0], [0.45, 0], [0.38, 1.3], [-0.38, 1.3]]); gg.fillStyle = ink(sash); D.poly(gg, [[-0.38, 1.25], [-0.2, 1.3], [0.42, 0.2], [0.28, 0.12]]); gg.fillStyle = ink(C.bone, 'print'); for (let k = 0; k < 5; k++) D.poly(gg, [[-0.45 + k * 0.18, 0], [-0.36 + k * 0.18, 0.16], [-0.27 + k * 0.18, 0]]); gg.fillStyle = ink(C.stoneB); D.rect(gg, -0.36, 0.35, 0.32, 0.42, 0.04); gg.fillStyle = ink(C.ink, 'print'); for (let k = 0; k < 3; k++) D.rect(gg, -0.32, 0.45 + k * 0.1, 0.24, 0.03); }, { w: 0.95, h: 1.35, name: 'tunic' }), 401, { y: 0.72 });
    card(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(sh(tunic, -0.08)); D.poly(gg, [[-0.26, 0], [0.26, 0], [0.22, 1.28], [-0.22, 1.28]]); }, { w: 0.6, h: 1.3, name: 'tunic side' }), 402, { y: 0.74, z: -0.3, ry: PROFILE });
    card(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(hair); D.ell(gg, 0, 0.46, 0.42, 0.4); gg.fillStyle = ink(skin); D.ell(gg, 0, 0.36, 0.34, 0.36); gg.fillStyle = ink(hair); D.poly(gg, [[-0.38, 0.55], [0.38, 0.55], [0.3, 0.75], [-0.1, 0.66], [-0.34, 0.74]]); gg.fillStyle = ink(C.ink, 'print'); D.ell(gg, -0.12, 0.36, 0.04, 0.05); D.ell(gg, 0.12, 0.36, 0.04, 0.05); gg.fillStyle = ink('#8a3a22', 'print'); D.rect(gg, -0.08, 0.18, 0.16, 0.03); }, { w: 0.9, h: 0.88, name: 'face' }), 404, { y: 1.88 });
    card(P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(sh(skin, -0.05)); D.ell(gg, 0.04, 0.36, 0.3, 0.36); gg.fillStyle = ink(hair); D.ell(gg, -0.1, 0.46, 0.3, 0.36); gg.fillStyle = ink(C.ink, 'print'); D.ell(gg, 0.2, 0.37, 0.03, 0.045); }, { w: 0.8, h: 0.85, name: 'head side' }), 405, { y: 1.86, z: -0.46, ry: PROFILE });
    const arms = [-0.46, 0.46].map((x, i) => { const s = new THREE.Group(); s.position.set(x, 1.96, 0); body.add(s); const art = (c) => P2.drawnPiece((gg, ink) => { gg.fillStyle = ink(c); D.rect(gg, -0.09, 0.12, 0.18, 0.68, 0.08); gg.fillStyle = ink(tunic); D.rect(gg, -0.12, 0.55, 0.24, 0.27, 0.08); }, { w: 0.26, h: 0.84, name: 'arm' }); card(art(skin), 430 + i, { y: -0.82, parent: s }); card(art(C.skinB), 440 + i, { y: -0.82, z: -0.12, ry: PROFILE, parent: s }); return s; });
    const legLen = 1.2, stepLen = 1.15, R = stepLen / (2 * legLen);
    const leg = (ph, gait) => { const u = (ph / Math.PI) % 2, A = gait * R; if (u >= 1) return A * (3 - 2 * u); const e = u * u * (3 - 2 * u); return A * (2 * e - 1); };
    g.userData.stride = (walked, gait) => { const ph = walked / stepLen * Math.PI, l0 = leg(ph, gait), l1 = leg(ph + Math.PI, gait); legs[0].rotation.x = -l0; legs[1].rotation.x = -l1; arms[0].rotation.x = l0 * 0.7; arms[1].rotation.x = l1 * 0.7; body.position.y = Math.abs(Math.sin(ph)) * 0.04 * gait; };
    return g;
  };
  const doll = dylan();
  const hero = popup(null, null, { node: doll, height: 3.1, x: 2, z: 3, sway: 0.1, scale: 1.3 });
  H.setHero(hero, { stride: doll.userData.stride });

  // ---- life: embers over the fire, swallows, butterflies in the grass, smoke, the mammoths grazing -------------------
  const life = createLife({ scene: H.scene, camera: H.camera, heroHeight: H.heroHeight, seed: 41, wind: [0.9, 0.4] });
  // the incense of the rites: from the bowl of Alban's circle, and from his staff when he raises it
  life.puffs({ at: [[AL.x + 1.1, 0.9, AL.z - 0.9]], perEmitter: 2, life: 4, rise: 0.35, size: [0.15, 0.3], colors: ['#e0d8e8', '#c8c0d8'] });
  if (people.alban?.smoke) life.puffs({ at: [{ object: people.alban.smoke, offset: [0, 0, 0] }], perEmitter: 3, life: 3.5, rise: 0.4, size: [0.14, 0.28], colors: ['#e8e0f0', '#d0c8e0'] });
  life.puffs({ at: [[SITES.foyer.x, 2.6, SITES.foyer.z]], perEmitter: 4, life: 5, rise: 0.5, size: [0.3, 0.55], colors: ['#d8c8c0', '#c8b8b8'] });
  life.motes({ count: 18, colors: ['#ffb060', '#ffd080'], size: [0.05, 0.09], rise: 0.6, glow: 1, height: [0.5, 3] });
  life.flock({ size: 5, height: 4, colors: ['#3a2a3a', '#f0e0d0'] });
  life.flyers({ count: 8, colors: ['#f4ecd8', '#e9c64a', '#d88aa0'], anchors: [[-6, -3], [8, 3], [-6, -20], [18, -10], [-20, 2]], roam: 1.6 });
  for (const m of herd) life.critter(m.group, { behaviour: 'graze', roam: 1.0 });
  for (const a of HERD) life.critter(a.h.group, { behaviour: a.hd.behaviour, roam: a.hd.roam, speed: a.hd.speed ?? 0.6, home: [a.x, a.z], hero: H.hero.group.position });
  life.puffs({ at: [[SMOKER[0], 0.8, SMOKER[1]]], perEmitter: 3, life: 4, rise: 0.5, size: [0.25, 0.45], colors: ['#c8c0c8', '#b8b0b8'] });
  life.fallers({ count: 24, cut: 'leaf', colors: ['#c8402e', '#e07a3a', '#8e2f2a', '#e0a24a'], size: [0.1, 0.16], fall: [0.6, 1.0], sway: 0.6, land: 8 });
  const rain = life.fallers({ count: 700, cut: 'streak', streak: true, colors: ['#c8b8d0', '#a898b8'], size: [0.18, 0.32], fall: [11, 13], sway: 0, tumble: 0, wind: 2.8, land: 0.12, day: 0, night: 0 });
  life.cloudShadows({ count: 4, alpha: 0.13 });
  life.mist({ count: 6, y: 0.7, alpha: 0.08, color: '#d8c8d8' });
  // smoke from the houses' roofs, only once they stand (a marker laid flat until then: the kit puffs only upright emitters)
  H.onStep(() => { for (const c of CHIMNEYS) c.dummy.rotation.x = !c.h.held && c.h.p > 0.9 ? 0 : Math.PI / 2; });
  if (CHIMNEYS.length) life.puffs({ at: CHIMNEYS.map((c) => ({ object: c.dummy, offset: [0, 0, 0] })), perEmitter: 3, life: 4.5, rise: 0.45, size: [0.22, 0.4], colors: ['#d8c8c0', '#c8b8b8'] });
  life.reset(H.target);
  H.onStep((t, dt) => life.update(dt, H.target));
  // ---- weather and light: gusts in the pines, rain with the métamorphose and in showers after it, the low sun turning
  // slowly, clouds dimming it, the fires and torches flickering; the grade cools and softens under the rain
  const weather = { rain: 0, gust: 0.4, forced: null, base: null, gustBoost: 0, sunSpeed: 1, sunPhase: 0 };
  const flick = (t, i) => 0.5 + 0.5 * Math.sin(t * 9.1 + i * 1.7) * Math.sin(t * 13.7 + i * 0.6);
  H.onStep((t, dt) => {
    const after = quest('V17_OPERATIONS')(), shower = after && (t % 150 < 45 || weather.metamorph > 0);
    if (weather.metamorph > 0) weather.metamorph -= dt;
    const target = weather.forced ?? (shower ? 1 : 0);
    weather.rain += (target - weather.rain) * (1 - Math.exp(-dt * 0.6)); rain.day = rain.night = weather.rain;
    weather.gust = 0.3 + 0.7 * Math.max(0, Math.sin(t * 0.21) * Math.sin(t * 0.53 + 1.3)) + 0.45 * weather.rain + weather.gustBoost;
    for (const h of TREES) h.swayAmp = 0.3 * (0.5 + 2.0 * weather.gust);
    const frame = Math.floor(t * 8);
    FIRES.forEach((fl, i) => fl.forEach((f, k) => { f.group.visible = k === (frame + i) % 3 && (!f.held || f.p > 0.02); }));
    if (!H.lights || !H.post) return;
    const L = H.lights;
    if (!weather.base) weather.base = { ki: L.key.intensity, fi: L.fill.intensity, si: L.sky.intensity, pos: L.key.position.clone(), tgt: L.key.target.position.clone(), sat: H.post.o.saturation, haze: H.post.o.hazeAmount, exp: H.post.o.exposure, con: H.post.o.contrast };
    const B = weather.base, cloud = 0.5 + 0.5 * Math.sin(t * 0.09) * Math.sin(t * 0.041 + 2);
    L.key.intensity = B.ki * (1 - 0.45 * weather.rain - 0.1 * cloud); L.sky.intensity = B.si * (1 + 0.2 * weather.rain); L.fill.intensity = B.fi * (1 + 0.15 * weather.rain);
    weather.sunPhase += dt * 0.017 * weather.sunSpeed; const a = 0.14 * Math.sin(weather.sunPhase) * Math.min(4, weather.sunSpeed), v = B.pos.clone().sub(B.tgt), ca = Math.cos(a), sa = Math.sin(a);
    L.key.position.set(B.tgt.x + v.x * ca - v.z * sa, B.tgt.y + v.y * (1 + 0.05 * Math.sin(t * 0.011)), B.tgt.z + v.x * sa + v.z * ca);
    for (const [i, P] of H.lampLights.entries()) P.intensity = P.userData.base * (0.78 + 0.3 * flick(t, i)) * (1 + 0.25 * weather.rain);
    const want = [B.sat * (1 - 0.18 * weather.rain), B.haze + 0.22 * weather.rain, B.exp * (1 - 0.06 * weather.rain), B.con * (1 - 0.06 * weather.rain)];
    if (!weather.last || want.some((x, k) => Math.abs(x - weather.last[k]) > 0.004)) { weather.last = want; Object.assign(H.post.o, { saturation: want[0], hazeAmount: want[1], exposure: want[2], contrast: want[3] }); H.post.apply(); }
  });
  H.onRestart(() => life.reset(H.target));

  // ---- the river moves: cut-paper ripples (a pale arc over a darker one) drift downstream along its course, born and
  // shrinking away; under the rain, rings open where the drops fall; its babble is heard near the banks
  const RV = (() => { const pts = RIVER.pts, L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, L, len: L[L.length - 1] }; })();
  const along = (s) => { let i = 1; while (i < RV.L.length - 1 && RV.L[i] < s) i++; const [x0, z0] = RV.pts[i - 1], [x1, z1] = RV.pts[i], u = (s - RV.L[i - 1]) / Math.max(1e-6, RV.L[i] - RV.L[i - 1]), l = Math.hypot(x1 - x0, z1 - z0) || 1; return [x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, (x1 - x0) / l, (z1 - z0) / l]; };
  const inkTex = (draw) => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.lineCap = 'round'; draw(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  // the river's strokes flow: the pale dashes and the foam lines along the banks are drawn on two ribbons laid on its
  // bed, their print sliding downstream (the near layer faster), seamless along the course
  const strokeTile = (seed, n, foam) => { const W = 512, c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'), r = P2.rng(seed); g.lineCap = 'round';
    const line = (x0, y0, x1, y1, col, w) => { for (const o of [-W, 0, W]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0 + o, y0); g.lineTo(x1 + o, y1); g.stroke(); } };
    for (let k = 0; k < n; k++) { const x = r() * W, y = W * (0.12 + r() * 0.76), l = W * (0.035 + r() * 0.07), a = (r() - 0.5) * 0.2; line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, r() < 0.78 ? 'rgba(250,244,228,0.85)' : 'rgba(70,82,130,0.55)', 5 + r() * 4); }
    if (foam) for (const y of [W * 0.05, W * 0.95]) for (let x = 0; x < W; x += W / 6) line(x + r() * 20, y + (r() - 0.5) * 8, x + W / 10 + r() * 20, y + (r() - 0.5) * 8, 'rgba(244,234,212,0.75)', 10);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const ribbon = (half, tex, y) => {
    const pos = [], uv = [], idx = [], TILE = 6; let s0 = 0;
    RIVER.pts.forEach(([x, z], i) => { const [x1, z1] = RIVER.pts[Math.min(i + 1, RIVER.pts.length - 1)], [x0, z0] = RIVER.pts[Math.max(i - 1, 0)], l = Math.hypot(x1 - x0, z1 - z0) || 1, nx = -(z1 - z0) / l, nz = (x1 - x0) / l;
      if (i) s0 += Math.hypot(x - RIVER.pts[i - 1][0], z - RIVER.pts[i - 1][1]);
      pos.push(x + nx * half, y, z + nz * half, x - nx * half, y, z - nz * half); uv.push(s0 / TILE, 0, s0 / TILE, 1);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.15, depthWrite: false, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true; H.scene.add(m); return tex; };
  const FLOW = [[ribbon(2.7, strokeTile(77, 30, true), 0.03), 1.45], [ribbon(2.3, strokeTile(91, 12, false), 0.035), 0.85]];
  H.onStep((t, dt) => { for (const [tex, sp] of FLOW) tex.offset.x -= sp * dt / 6; });
  const ringTex = inkTex((g) => { g.strokeStyle = '#e0dcf0'; g.lineWidth = 5; g.beginPath(); g.ellipse(64, 32, 52, 26, 0, 0, 7); g.stroke(); });
  const flatMat = (map) => new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.25, depthWrite: false, roughness: 1, side: THREE.DoubleSide });
  const RG = 60, rings = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.5), flatMat(ringTex), RG);
  rings.frustumCulled = false; rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage); H.scene.add(rings);
  const G = Array.from({ length: RG }, () => ({ age: 9, life: 0.9, x: 0, z: 0 }));
  const _o = new THREE.Object3D(); let ringAt = 0;
  H.onStep((t, dt) => {
    ringAt -= dt * (2 + 40 * weather.rain);
    G.forEach((g, i) => {
      g.age += dt; if (g.age > g.life && ringAt <= 0 && weather.rain > 0.05) { ringAt += 1; const [x, z, tx, tz] = along(Math.random() * RV.len), off = (Math.random() - 0.5) * 2.6; Object.assign(g, { age: 0, x: x - tz * off, z: z + tx * off }); }
      const u = Math.min(1, g.age / g.life), k = g.age < g.life ? 0.3 + 1.3 * u : 0.001;
      _o.position.set(g.x, 0.065, g.z); _o.rotation.set(-Math.PI / 2, 0, 0); _o.scale.set(k, k, 1); _o.updateMatrix(); rings.setMatrixAt(i, _o.matrix);
    });
    rings.instanceMatrix.needsUpdate = true;
  });
  const riverNear = (x, z) => Math.max(0, 1 - RIVER.dist(x, z) / 16);

  // ---- what the campaign changes in the world -------------------------------------------------------------------------
  // the evacuation: the villagers walk to the gathering point
  const assembly = SITES.rassemblement;
  function sendToAssembly() { let k = 0; for (const p of Object.values(people)) { if (p.h.held) continue; const a = (k++ / 19) * 6.283; p.hurry = true; p.target = [assembly.x + Math.cos(a) * 1.8, assembly.z + Math.sin(a) * 1.4]; } burn.start(); }
  function sendHome() { burn.stop(); for (const p of Object.values(people)) { if (p.crew || (burn.douse && burn.douse.crew.includes(p.id))) continue; p.hurry = false; p.target = p.home.slice(); } }
  // the tribe's daily life (campaign.villageStep decides, the cards walk): each villager to their goal, a slot round a site
  const ids = Object.keys(people), slotOf = (id, site) => { const s = SITES[site], a = ids.indexOf(id) * 2.4; return [s.x + Math.cos(a) * 1.5, s.z + Math.sin(a) * 1.2]; };
  const goalPoint = (id, place) => (place === 'home' ? people[id].home : SITES[place] ? slotOf(id, place) : null);
  const arrivedAt = (id, place) => { const p = people[id], g = goalPoint(id, place); return !!g && Math.hypot(p.x - g[0], p.z - g[1]) < 0.4; };
  function lead(campaign) {
    for (const id of ids) {
      const b = campaign.brain(id), p = people[id]; if (!b || !b.goal || p.h.held || p.busy) continue;
      const g = goalPoint(id, b.goal); if (g && (!p.target || p.target[0] !== g[0] || p.target[1] !== g[1]) && !arrivedAt(id, b.goal)) p.target = g;
    }
  }
  const everyoneAtAssembly = () => Object.values(people).every((p) => p.h.held || Math.hypot(p.x - assembly.x, p.z - assembly.z) < 3);
  // the stages unfold (or fold away) as their condition starts (or stops) to hold; a new game folds everything back
  // the dwellings change one after the other, west to east: the old one folds down flat like a sheet laid back on the
  // page, then the new one is lifted in its place; the tour cinematic follows the same order and times
  const timers = []; let clock = 0; const swaps = []; const ctl = { burn: null };   // ctl: what is built further down
  const later = (dt, fn) => timers.push([clock + dt, fn]);
  const fold = (st, at) => { st.hs.forEach((h, i) => { h.held = true; h.set(0, at + i * 0.08); }); };
  const lift = (st, at) => later(at, () => { if (!st.on) return; st.hs.forEach((h, i) => { h.held = false; h.set(1, i * 0.12); }); });
  function sync() {
    const bySlot = new Map();
    for (const st of STAGES) {
      const want = st.undo ? !st.when() : st.when(); if (want === st.on) continue;
      st.on = want;
      if (st.slot && booted) { const k = st.slot.i; if (!bySlot.has(k)) bySlot.set(k, { slot: st.slot, out: [], in: [] }); bySlot.get(k)[want ? 'in' : 'out'].push(st); continue; }
      if (want) st.hs.forEach((h, i) => { h.held = false; h.set(1, 0.2 + i * 0.07); }); else fold(st, 0);
    }
    [...bySlot.values()].sort((a, b) => a.slot.x - b.slot.x).forEach((c, k) => {
      const t0 = 0.9 + k * 2.6;
      for (const st of c.out) fold(st, t0);
      for (const st of c.in) lift(st, t0 + (c.out.length ? 1.1 : 0));
      const from = c.out.map((st) => st.slot.kind)[0], to = c.in.map((st) => st.slot.kind)[0];
      swaps.push({ x: c.slot.x, z: c.slot.z, at: t0, from, to, chief: c.slot.i === 0 });
    });
    if (ctl.burn?.on && quest('V17_EMERGENCY')()) ctl.burn.stop();
    const engraved = quest(MENHIR_QUEST)();
    if (!engraved) engraving.hideAll();
    else if (!booted) engraving.showAll(false);
    else if (!engraving.shown.some(Boolean)) later(0.6, () => { if (!engraving.cine) engraving.showAll(true); });
    for (const id of campaign.state.dead) if (people[id] && !deaths.has(id)) die(id, booted);
    for (const id of [...deaths.keys()]) if (!campaign.state.dead.includes(id)) revive(id);
  }
  // ---- death, grotesque and paper: the villager shudders, its eyes turn to crosses and its tongue lolls; it falls flat,
  // a burst of red paper confetti and ribbons flies and settles, a red paper splat spreads under it, and a paper-sheet
  // ghost rises, wobbling, and shrinks away. A villager dead at load already lies there.
  const deaths = new Map(); let booted = false;
  const flatCard = (pts, paint, seed) => makeCard(pts, { paint, paper: H.paper, thickness: 0.03, edgeWidth: 0.03, pxPerUnit: 64, seed, back: 'mirror', folds: [] });
  const deadFace = P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.skin); D.ell(g, 0, 0.34, 0.34, 0.36); g.strokeStyle = ink('#2a1a1e', 'print'); g.lineWidth = 0.06; g.lineCap = 'round'; for (const ex of [-0.13, 0.13]) { g.beginPath(); g.moveTo(ex - 0.07, 0.34); g.lineTo(ex + 0.07, 0.48); g.moveTo(ex - 0.07, 0.48); g.lineTo(ex + 0.07, 0.34); g.stroke(); } g.fillStyle = ink('#2a1a1e'); D.ell(g, 0, 0.16, 0.12, 0.07); g.fillStyle = ink('#d8506a'); D.ell(g, 0.05, 0.08, 0.06, 0.1); }, { w: 0.8, h: 0.75, name: 'dead face' });
  const splatShape = P2.drawnPiece((g, ink) => { const r = P2.rng(5); g.fillStyle = ink('#9a1a1a'); D.ell(g, 0, 1, 0.9, 0.8); for (let k = 0; k < 11; k++) { const a = k / 11 * 6.283 + r() * 0.3, d = 0.8 + r() * 0.7; D.ell(g, Math.cos(a) * d, 1 + Math.sin(a) * d, 0.12 + r() * 0.2, 0.1 + r() * 0.16); } g.fillStyle = ink('#c8282a'); D.ell(g, -0.15, 1.1, 0.5, 0.42); }, { w: 3.6, h: 3.4, name: 'splat' });
  const ghostShape = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#f4ecdc'); g.beginPath(); g.moveTo(-0.8, 0.2); for (let k = 0; k <= 6; k++) g.lineTo(-0.8 + k * 0.267, k % 2 ? 0 : 0.25); g.lineTo(0.8, 1.4); g.quadraticCurveTo(0.8, 2.4, 0, 2.4); g.quadraticCurveTo(-0.8, 2.4, -0.8, 1.4); g.closePath(); g.fill(); g.fillStyle = ink('#2a1a1e'); D.ell(g, -0.28, 1.65, 0.14, 0.2); D.ell(g, 0.28, 1.65, 0.14, 0.2); D.ell(g, 0, 1.2, 0.14, 0.18); }, { w: 1.8, h: 2.6, name: 'ghost' });
  const bits = []; const bitGeo = new THREE.PlaneGeometry(1, 1);
  const bitMats = ['#b8202a', '#8e1a22', '#d84a3a', '#e0a24a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
  function die(id, animate) {
    const p = people[id], h = p.h, d = { t: animate ? 0 : 9, parts: [] }; deaths.set(id, d); p.dying = d; p.busy = true; p.target = null; h.held = true;
    const face = flatCard(...deadFace, 611); face.position.set(0, 2.0 * (id === 'petit_os' ? 0.7 : 1), 0.06); h.pivot.add(face); d.parts.push([h.pivot, face]);
    const splat = flatCard(...splatShape, 613); splat.rotation.x = -Math.PI / 2; splat.position.set(p.x, 0.03, p.z - 1.0); splat.scale.setScalar(animate ? 0.001 : 1); H.scene.add(splat); d.splat = splat; d.parts.push([H.scene, splat]);
    if (!animate) { h.reset(0); return; }
    const ghost = flatCard(...ghostShape, 617); ghost.position.set(p.x, 0.5, p.z); ghost.scale.setScalar(0.001); H.scene.add(ghost); d.ghost = ghost; d.parts.push([H.scene, ghost]);
    for (let k = 0; k < 40; k++) { const m = new THREE.Mesh(bitGeo, bitMats[k % 4]); const ribbon = k % 5 === 0; m.scale.set(ribbon ? 0.12 : 0.22, ribbon ? 0.7 : 0.22, 1); m.position.set(p.x, 1.6, p.z); H.scene.add(m); const a = Math.random() * 6.283, sp = 2 + Math.random() * 4; bits.push({ m, v: [Math.cos(a) * sp, 6 + Math.random() * 6, Math.sin(a) * sp * 0.6], w: [Math.random() * 9, Math.random() * 9], life: 9 + Math.random() * 3, down: false }); }
    for (const sd of [-1, 1]) {   // the eyes pop out of the head and bounce away
      const eye = new THREE.Group(), white = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), new THREE.MeshStandardMaterial({ color: '#f4ecdc', roughness: 1, side: THREE.DoubleSide })), pupil = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshStandardMaterial({ color: '#2a1a1e', roughness: 1, side: THREE.DoubleSide }));
      pupil.position.z = 0.01; eye.add(white, pupil); eye.position.set(p.x + sd * 0.15, 2.2, p.z + 0.1); H.scene.add(eye);
      bits.push({ m: eye, v: [sd * (1.5 + Math.random()), 7 + Math.random() * 2, 1.5], w: [Math.random() * 6, Math.random() * 6], life: 10, down: false, bounce: 1 });
    }
    H.sound?.flap({ size: 0.7, up: false, key: 'death:' + id }); H.sfx?.play('death');
    weather.death = { at: [p.x, p.z], t: 0 };
  }
  function revive(id) {
    const p = people[id], d = deaths.get(id); deaths.delete(id);
    for (const [par, o] of d.parts) par.remove(o);
    p.dying = null; p.busy = false; p.h.held = false; p.h.group.rotation.z = 0; p.h.set(1, 0);
  }
  // ---- the Grand Menhir engraved: the duel's five decisions cut into its face, one after the other, each a sunken
  // plaque with a pale edge and dark grooves: a hand over the flame (5.1), the policy tablet (5.2), the three roles
  // (5.3), the ring of the tribe (5.4), the eye that checks the facts (5.1 à 5.4). Chips of stone fly as each is cut.
  const stoneMats = ['#8f8aa0', '#a9a2bc', '#6a6480'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
  const PICTO = [
    (g) => { g.beginPath(); g.moveTo(0, 0.18); g.quadraticCurveTo(-0.28, 0.42, 0, 0.72); g.quadraticCurveTo(0.28, 0.42, 0, 0.18); g.stroke(); g.beginPath(); g.moveTo(-0.45, 0.78); g.lineTo(-0.45, 0.95); g.moveTo(-0.3, 0.8); g.lineTo(-0.3, 1.0); g.moveTo(-0.15, 0.8); g.lineTo(-0.15, 0.98); g.moveTo(-0.5, 0.78); g.quadraticCurveTo(-0.3, 0.68, -0.05, 0.8); g.stroke(); },
    (g) => { g.strokeRect(-0.3, 0.14, 0.6, 0.78); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-0.2, 0.3 + k * 0.15); g.lineTo(0.2 - (k % 2) * 0.1, 0.3 + k * 0.15); g.stroke(); } g.beginPath(); g.arc(0.5, 0.8, 0.1, 0, 7); g.stroke(); },
    (g) => { for (const [x, hat] of [[-0.4, 0], [0, 1], [0.4, 2]]) { g.beginPath(); g.arc(x, 0.72, 0.08, 0, 7); g.moveTo(x, 0.64); g.lineTo(x, 0.38); g.lineTo(x - 0.1, 0.16); g.moveTo(x, 0.38); g.lineTo(x + 0.1, 0.16); g.moveTo(x - 0.12, 0.55); g.lineTo(x + 0.12, 0.55); if (hat === 1) { g.moveTo(x - 0.1, 0.82); g.lineTo(x, 0.94); g.lineTo(x + 0.1, 0.82); } if (hat === 2) { g.moveTo(x + 0.16, 0.2); g.lineTo(x + 0.16, 0.7); } g.stroke(); } },
    (g) => { g.beginPath(); g.arc(0, 0.55, 0.08, 0, 7); g.stroke(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; g.beginPath(); g.arc(Math.cos(a) * 0.38, 0.55 + Math.sin(a) * 0.32, 0.06, 0, 7); g.stroke(); g.beginPath(); g.moveTo(Math.cos(a) * 0.28, 0.55 + Math.sin(a) * 0.24); g.lineTo(Math.cos(a) * 0.12, 0.55 + Math.sin(a) * 0.1); g.stroke(); } },
    (g) => { g.beginPath(); g.moveTo(-0.5, 0.55); g.quadraticCurveTo(0, 0.95, 0.5, 0.55); g.quadraticCurveTo(0, 0.15, -0.5, 0.55); g.stroke(); g.beginPath(); g.arc(0, 0.55, 0.13, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0.25, 0.15); g.lineTo(0.36, 0.05); g.lineTo(0.58, 0.3); g.stroke(); },
  ];
  // the grooves are cut in the stone itself (no plaque laid on it): each pictogram is a sheet of the menhir's own face
  // where the strokes are printed as they are cut, a dark groove with a pale lower lip and fresh white dust round it.
  // Cut by hand: Ouways, the village's engraver, up a notched-log ladder, sets a flint burin on the line and strikes it
  // with a hammerstone; every blow deepens the cut a notch and throws chips and dust.
  const GW = 1.6, GH = 1.15, PX = 220;
  const engraving = { cine: false, shown: [], cards: [], u: [], tip: [], job: null };
  const groove = (k) => { const c = document.createElement('canvas'); c.width = Math.round(GW * PX); c.height = Math.round(GH * PX); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.position.set(0.05 + Math.sin(k * 2.1) * 0.08, 1.4 + k * 1.32 + GH / 2, 0.05); m.receiveShadow = true; m.userData = { c, tex }; MEN[0].pivot.add(m); return m; };
  // each pictogram traced once into polylines (a recording 2D context), so the cut can run stroke after stroke
  const trace = (draw) => {
    const strokes = []; let path = [], sub = null, cur = null;
    const pt = (x, y) => { if (!sub) { sub = []; path.push(sub); } sub.push([x, y]); cur = [x, y]; };
    const rec = { beginPath() { path = []; sub = null; cur = null; }, moveTo(x, y) { sub = [[x, y]]; path.push(sub); cur = [x, y]; }, lineTo: pt,
      quadraticCurveTo(cx, cy, x, y) { const [x0, y0] = cur || [cx, cy]; for (let i = 1; i <= 12; i++) { const t = i / 12, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; pt(a * x0 + b * cx + c * x, a * y0 + b * cy + c * y); } },
      arc(x, y, r, a0, a1, ccw = false) { let span = ccw ? a0 - a1 : a1 - a0; if (span < 0) span += 6.283; span = Math.min(span, 6.283); const n = Math.max(6, Math.round(span * 8)); for (let i = 0; i <= n; i++) { const a = a0 + (ccw ? -1 : 1) * span * i / n; pt(x + Math.cos(a) * r, y + Math.sin(a) * r); } },
      closePath() { if (sub && sub.length) pt(sub[0][0], sub[0][1]); },
      strokeRect(x, y, w, h) { strokes.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]); },
      stroke() { for (const q of path) if (q.length > 1) strokes.push(q.map((v) => v.slice())); path = []; sub = null; } };
    draw(rec); const len = strokes.reduce((m, q) => m + q.slice(1).reduce((a, v, i) => a + Math.hypot(v[0] - q[i][0], v[1] - q[i][1]), 0), 0);
    return { strokes, len };
  };
  const TRACES = PICTO.map(trace);
  const cutPath = (g, k, u) => {   // the strokes cut so far (a length u of the whole); returns the burin's point
    const T = TRACES[k]; let left = u * T.len, tip = T.strokes[0][0];
    g.beginPath();
    for (const q of T.strokes) { if (left <= 0) break; g.moveTo(q[0][0], q[0][1]); tip = q[0];
      for (let i = 1; i < q.length; i++) { const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); if (left >= d) { g.lineTo(q[i][0], q[i][1]); left -= d; tip = q[i]; } else { const f = left / d; tip = [q[i - 1][0] + (q[i][0] - q[i - 1][0]) * f, q[i - 1][1] + (q[i][1] - q[i - 1][1]) * f]; g.lineTo(tip[0], tip[1]); left = 0; break; } } }
    return tip;
  };
  const paintGroove = (k, u) => {   // u: 0 nothing cut, 1 the pictogram cut in full, stroke after stroke
    const { c, tex } = engraving.cards[k].userData, g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    if (u > 0) {
      g.setTransform(PX, 0, 0, -PX, c.width / 2, GH * PX - 0.05 * PX); g.lineCap = g.lineJoin = 'round';
      const pass = (col, w, dx = 0, dy = 0) => { g.save(); g.translate(dx, dy); g.strokeStyle = col; g.lineWidth = w; engraving.tip[k] = cutPath(g, k, u); g.stroke(); g.restore(); };
      pass('rgba(236,232,244,0.42)', 0.17);           // fresh stone dust round the cut
      pass('#d4cde4', 0.08, 0.022, -0.026);           // the lit lower lip
      pass('#2e2a3c', 0.075);                          // the groove
      pass('rgba(14,10,22,0.6)', 0.03);                // its bottom
    }
    tex.needsUpdate = true; engraving.u[k] = u;
  };
  PICTO.forEach((_, k) => { engraving.cards.push(groove(k)); engraving.shown.push(false); paintGroove(k, 0); });
  // the engraver's tools and ladder (cards in the world, seen only while he carves)
  const [chp, chpaint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#5a3a22'); D.rect(g, -0.06, 0, 0.12, 0.55, 0.04); g.fillStyle = ink('#c8c0dc'); D.poly(g, [[-0.08, 0.5], [0.08, 0.5], [0.05, 0.85], [0, 0.95], [-0.05, 0.85]]); g.fillStyle = ink('#c8a870', 'print'); D.rect(g, -0.08, 0.35, 0.16, 0.06); }, { w: 0.4, h: 1.0, name: 'burin' });
  const [hmp, hmpaint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#6a4024'); D.rect(g, -0.05, 0, 0.1, 0.8, 0.03); g.fillStyle = ink('#7a7488'); D.ell(g, 0, 0.92, 0.26, 0.2); g.fillStyle = ink('#a39cb0', 'print'); D.ell(g, -0.06, 0.97, 0.1, 0.07); g.fillStyle = ink('#c8a870', 'print'); D.rect(g, -0.08, 0.7, 0.16, 0.06); }, { w: 0.6, h: 1.2, name: 'hammerstone' });
  const [ldp, ldpaint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#7a4a2a'); D.poly(g, [[-0.28, 0], [0.28, 0], [0.22, 7.0], [-0.22, 7.0]]); g.fillStyle = ink('#3a2418'); for (let k = 0; k < 11; k++) D.poly(g, [[-0.22, 0.4 + k * 0.6], [0.24, 0.4 + k * 0.6], [0.24, 0.55 + k * 0.6]]); g.fillStyle = ink('#c8a870', 'print'); D.rect(g, -0.24, 6.6, 0.48, 0.08); }, { w: 0.8, h: 7.2, name: 'log ladder' });
  const chisel = flatCard(chp, chpaint, 951), hammer = flatCard(hmp, hmpaint, 953), ladder = flatCard(ldp, ldpaint, 955);
  for (const m of [chisel, hammer, ladder]) { m.visible = false; H.scene.add(m); }
  const dustMats = ['#ece8f4', '#c8c0dc', '#a9a2bc'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
  const chips = (w, n) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(bitGeo, i % 4 ? stoneMats[i % 3] : dustMats[i % 3]); m.scale.set(0.06 + Math.random() * 0.08, 0.05 + Math.random() * 0.07, 1); m.position.copy(w); H.scene.add(m); bits.push({ m, v: [(Math.random() - 0.5) * 3.5, 1 + Math.random() * 3, 1.5 + Math.random() * 2.5], w: [Math.random() * 14, Math.random() * 14], life: 2.5 + Math.random() * 1.5, down: false }); } };
  const HITS = 14;
  engraving.show = (k, animate = true, dur = 0.9) => {   // dur: how long the cutting takes (the cinematic lets him take his time)
    if (engraving.shown[k] && !engraving.job) return; engraving.shown[k] = true;
    if (!animate) { paintGroove(k, 1); return; }
    engraving.job = { k, t0: clock, dur, hit: 0, carver: engraving.cine && people.nork && !people.nork.dying };
  };
  engraving.showAll = (animate = false) => PICTO.forEach((_, k) => { if (!engraving.shown[k] || (!animate && engraving.u[k] < 1)) { engraving.shown[k] = false; engraving.show(k, false); } });
  engraving.hideAll = () => { engraving.job = null; PICTO.forEach((_, k) => { engraving.shown[k] = false; paintGroove(k, 0); }); };
  engraving.release = () => {   // the engraver climbs down and goes back to his wall
    for (const m of [chisel, hammer, ladder]) m.visible = false; const p = people.nork; if (p && p.carving) { p.carving = false; p.perch = 0; p.busy = false; if (p.propG) p.propG.visible = true; p.target = p.home.slice(); }
  };
  const _w = new THREE.Vector3(), _n = new THREE.Vector3();
  H.onStep(() => {
    const j = engraving.job; if (!j) return;
    const u = Math.min(1, (clock - j.t0) / j.dur), hitN = Math.min(HITS, Math.floor(u * HITS + 0.15)), card = engraving.cards[j.k];
    card.getWorldPosition(_w); _n.set(0, 0, 1).applyQuaternion(card.getWorldQuaternion(new THREE.Quaternion()));
    // where the burin bites now: along the line already cut, toward its growing end
    const tp = engraving.tip[j.k] || [0, 0.5], bx = _w.x + tp[0], by = _w.y + tp[1] - GH / 2 + 0.05;
    if (j.carver) {
      const p = people.nork; if (!p.carving) { p.carving = true; p.busy = true; p.target = null; if (p.propG) p.propG.visible = false; }
      p.x = _w.x - 1.6; p.z = _w.z + _n.z * 0.3; p.perch = Math.max(0, by - 1.75); p.face = 1; p.h.group.position.x = p.x; p.h.group.position.z = p.z;
      ladder.visible = true; ladder.position.set(_w.x - 1.6, 0, _w.z + _n.z * 0.2); ladder.rotation.set(-0.06, 0, 0.05);
      // the burin held against the stone, the hammerstone drawn back and brought down on it at each blow
      const ph = (u * HITS) % 1, swing = ph < 0.7 ? Math.sin(ph / 0.7 * Math.PI * 0.5) : 1 - (ph - 0.7) / 0.3;
      chisel.visible = hammer.visible = true;
      // the burin's point on the line (it lies along the stone, its butt toward him); the hammerstone pivots in his fist
      // and comes down on the butt
      const S = 1.6, rz = -0.8, bx0 = bx - Math.sin(-rz) * 0.95 * S, by0 = by - Math.cos(rz) * 0.95 * S, fz = _w.z + _n.z * 0.14;
      chisel.scale.setScalar(S); chisel.position.set(bx0, by0, fz); chisel.rotation.set(0, 0, rz);
      // the hammer in his right fist: it points at the burin's butt at the blow, raised back between blows
      const hx = p.x + 0.62, hy = p.y0 + p.perch + 1.35, vx = bx0 - hx, vy = by0 + 0.1 - hy, L = Math.max(0.6, Math.hypot(vx, vy));
      hammer.scale.setScalar(L / 0.92); hammer.position.set(hx, hy, _w.z + _n.z * 0.42); hammer.rotation.set(0, 0, Math.atan2(-vx, vy) + swing * 1.1);
      p.h.group.rotation.z = -0.08 + swing * 0.14;
    }
    while (j.hit < hitN) {   // a blow lands: the cut deepens a notch, chips and dust fly, the stone rings
      j.hit++; paintGroove(j.k, j.hit / HITS); _w.set(bx, by, _w.z + _n.z * 0.15); chips(_w, 7);
      H.sfx?.play('bone', { f: 2300 + Math.random() * 700, v: 0.3 }); if (j.hit % 3 === 0) H.sfx?.play('hit', { v: 0.18 });
    }
    if (u >= 1) { paintGroove(j.k, 1); engraving.job = null; if (j.carver) { chisel.visible = hammer.visible = false; } }
  });

  H.onStep((t, dt) => {
    for (const [id, d] of deaths) {
      if (d.t > 8) continue; d.t += dt; const p = people[id], h = p.h;
      if (d.t < 0.5) h.group.rotation.z = 0.35 * Math.sin(d.t * 45) * (1 - d.t * 1.4);
      else if (!d.fallen) { d.fallen = true; h.group.rotation.z = 0; h.set(0, 0); }
      if (d.t > 0.45) d.splat.scale.setScalar(Math.min(1, (d.t - 0.45) / 0.25) * (1 + 0.07 * Math.sin(Math.min(1, (d.t - 0.45) / 0.25) * Math.PI)));
      if (d.ghost) { const u = Math.max(0, d.t - 0.7), k = Math.min(1, u * 2) * (u > 4.5 ? Math.max(0, 1 - (u - 4.5) / 0.6) : 1); d.ghost.scale.setScalar(Math.max(0.001, k)); d.ghost.position.set(p.x + Math.sin(u * 2.4) * 0.5, 0.5 + u * 1.5, p.z); d.ghost.rotation.z = Math.sin(u * 3.1) * 0.2; }
    }
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i]; b.life -= dt;
      if (!b.down) { b.v[1] -= 22 * dt; b.m.position.x += b.v[0] * dt; b.m.position.y += b.v[1] * dt; b.m.position.z += b.v[2] * dt; b.m.rotation.x += b.w[0] * dt; b.m.rotation.y += b.w[1] * dt; if (b.m.position.y < 0.04 && b.bounce) { b.bounce = 0; b.m.position.y = 0.05; b.v[1] = -b.v[1] * 0.45; b.v[0] *= 0.6; b.v[2] *= 0.6; H.sfx?.play('bone', { f: 900, v: 0.2 }); } else if (b.m.position.y < 0.04) { b.down = true; b.m.position.y = 0.04; b.m.rotation.set(-Math.PI / 2, 0, Math.random() * 6); } }
      if (b.life < 1) b.m.scale.multiplyScalar(Math.max(0, 1 - dt * 3)); if (b.life <= 0) { H.scene.remove(b.m); bits.splice(i, 1); }
    }
  });
  campaign.on(sync);
  sync(); booted = true;
  // a piece not built yet (or taken down) is not lying about: once folded flat it is put away
  const stagedHinges = STAGES.flatMap((st) => st.hs);
  H.onStep((t, dt) => {
    clock += dt; for (let i = timers.length - 1; i >= 0; i--) if (timers[i][0] <= clock) { const fn = timers[i][1]; timers.splice(i, 1); fn(); }
    for (const h of stagedHinges) if (!h.flame) h.group.visible = !h.held || h.p > 0.02;
    for (const p of Object.values(people)) {
      // a paper puppet with its own bearing (characters.js): at rest it breathes and, now and then, makes the gesture of
      // its trade (the chief's pose, the rites' staff, Milena scanning and unrolling her map...); walking, its gait is set
      // from the distance covered (never from time): its own speed, stride, hop, rock and lean, flipping to face the way
      // it goes (never seen edge-on); the mascot scampers about its home
      if (p.dying) continue;
      const pr = p.pr, h = p.h;
      if (!p.target) {
        p.ph = 0;
        if (pr.wander && !p.busy && t > (p.nextWander ?? 0)) { p.nextWander = t + 2 + Math.random() * 3; const a = Math.random() * 6.283, r = 1 + Math.random() * pr.wander; p.target = [p.home[0] + Math.cos(a) * r, p.home[1] + Math.sin(a) * r]; }
        if (!p.g && pr.gesture && !p.busy && !p.beat) { p.nextG ??= t + Math.random() * pr.every; if (t > p.nextG) p.g = { k: GESTURE[pr.gesture], t0: t, knocked: 0 }; }
        let o = {};
        if (p.g) {
          const u = (t - p.g.t0) / p.g.k.dur;
          if (u >= 1) { p.g = null; p.nextG = t + pr.every * (0.7 + Math.random() * 0.6); }
          else { o = p.g.k.at(u); const kn = o.knock || []; if (p.g.knocked < kn.length && u >= kn[p.g.knocked]) { p.g.knocked++; if (Math.hypot(p.x - H.hero.group.position.x, p.z - H.hero.group.position.z) < 14) H.sfx?.play('bone', { f: 700 + Math.random() * 500, v: 0.14 }); } }
        }
        h.group.position.y = p.y0 + (o.y || 0) + (p.perch || 0);
        if (p.carving) continue;
        h.group.rotation.z = p.beat ? 0.38 * Math.sin(t * 8 + p.seed) : 0.016 * Math.sin(t * 2.0 + p.seed) + 0.008 * Math.sin(t * 1.27 + p.seed * 2) - (o.rz || 0) * p.face;
        h.group.rotation.x = (o.rx || 0) + (pr.bow || 0);   // a bearing at rest: the sage stooped, the chief's chest out
        h.pivot.scale.x = o.flip ? -p.face : p.face;
        if (p.propG) { p.propG.rotation.z = (o.prop || 0); p.propG.position.y = p.propY + (o.lift || 0); }
        if (p.map) p.map.scale.x = 0.25 + 0.75 * (o.open || 0);
        if (p.smoke) p.smoke.rotation.x = o.lift > 0.3 ? 0 : Math.PI / 2;
        continue;
      }
      if (p.g) { p.g = null; if (p.propG) { p.propG.rotation.z = 0; p.propG.position.y = p.propY; } if (p.map) p.map.scale.x = 0.25; if (p.smoke) p.smoke.rotation.x = Math.PI / 2; }
      const dx = p.target[0] - p.x, dz = p.target[1] - p.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { p.target = null; continue; }
      const step = Math.min(d, pr.speed * (p.hurry ? 1.7 : 1) * dt); p.x += dx / d * step; p.z += dz / d * step; p.ph += step / pr.step * Math.PI;
      h.group.position.x = p.x; h.group.position.z = p.z;
      if (Math.abs(dx) > 0.2) { const want = Math.sign(dx); if (want !== p.face) p.face = want; }
      h.pivot.scale.x = p.face;
      h.group.position.y = p.y0 + pr.hop * Math.abs(Math.sin(p.ph)); h.group.rotation.z = pr.rock * Math.sin(p.ph) - pr.lean * p.face; h.group.rotation.x = 0;
      if (p.propG) p.propG.rotation.z = 0.12 * Math.sin(p.ph) * (pr.prop === 'beam' ? 0.3 : 1);
    }
  });

  // ---- Au feu !: during the evacuation the fire takes in the house that once had its hearth inside, then jumps from
  // dwelling to dwelling (the nearest next, every few seconds): towering paper flames (three prints in turn), embers
  // rising, black smoke, a loud crackle; when the chapter is closed the flames fold down
  const BIG = [0, 1, 2].map((k) => { const [pts, paint] = tongues(131 + k * 9, 0, 1.7); return [pts, H.printed(pts, (P) => { paint(P); P.glow((g) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 1.4, 0.55, 1.5, 0, 0, 7); g.fill(); }); }, { cross: true })]; });   // only the heart glows: the tongues keep their reds
  const origin = HUTS[3], burnSlots = HUTS.map(([x, z], i) => ({ i, x, z, d: Math.hypot(x - origin[0], z - origin[1]) })).sort((a, b) => a.d - b.d).slice(0, 6);
  for (const b of burnSlots) {
    b.flames = []; b.smoke = new THREE.Object3D(); b.smoke.position.set(b.x, 4.2, b.z - 0.5); b.smoke.rotation.x = Math.PI / 2; H.scene.add(b.smoke);
    for (const [dx, dz, sc] of [[-1.4, 1.1, 1.0], [0.3, 1.5, 1.25], [1.6, 0.9, 0.95], [-0.3, -0.4, 1.35]]) { const set = BIG.map(([pts, mat]) => { const f = popup(pts, null, { materials: mat, x: b.x + dx, z: b.z + dz, cross: true, sway: 0.7, scale: sc }); f.held = true; H.glowing(f.group); return f; }); FIRES.push(set); b.flames.push(...set); }
  }
  life.puffs({ at: burnSlots.map((b) => ({ object: b.smoke, offset: [0, 0, 0] })), perEmitter: 5, life: 5, rise: 0.8, size: [0.5, 0.9], colors: ['#3a2a30', '#4a3a3a', '#2a2026'] });
  // steam: white clouds that rise off a fire as the water hits it (an emitter laid flat when not steaming)
  for (const b of burnSlots) { b.steam = new THREE.Object3D(); b.steam.position.set(b.x, 1.6, b.z + 0.8); b.steam.rotation.x = Math.PI / 2; H.scene.add(b.steam); b.level = 0; }
  life.puffs({ at: burnSlots.map((b) => ({ object: b.steam, offset: [0, 0, 0] })), perEmitter: 5, life: 2.0, rise: 1.0, size: [0.22, 0.45], colors: ['#f4f0ec', '#e4e0e8', '#d8d4dc'] });
  // soot: the walls blackened, a heap of black ash with dying embers, left until the debrief (then cleaned up)
  const soot = () => P2.drawnPiece((g, ink) => { const r = P2.rng(17); g.fillStyle = ink('#2a2024'); for (let k = 0; k < 9; k++) D.ell(g, -1.6 + k * 0.4, 0.25 + r() * 0.2, 0.45 + r() * 0.3, 0.3 + r() * 0.2); g.fillStyle = ink('#4a3a3a'); for (let k = 0; k < 5; k++) P2.fillLeaf(g, -1.4 + k * 0.7, 0.4, 1.2 + r() * 0.9, Math.PI / 2 + (r() - 0.5) * 0.5, 0.35); g.fillStyle = ink('#5a4a4a', 'print'); for (let k = 0; k < 6; k++) D.rect(g, -1.5 + k * 0.6, 0.1, 0.5, 0.08, 0.04); g.fillStyle = ink('#f08a3a', 'print'); for (let k = 0; k < 7; k++) D.ell(g, -1.4 + r() * 2.8, 0.2 + r() * 0.35, 0.07, 0.05); }, { w: 3.8, h: 2.6, name: 'soot' });
  for (const b of burnSlots) { b.soot = popup(...soot(), { x: b.x + 0.2, z: b.z + 1.9, yaw: 0 }); b.soot.held = true; b.soot.set(0, 0); }
  // a hide bucket that goes from hand to hand along the chain
  const [bkp, bkpaint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#8a5a3a'); D.poly(g, [[-0.32, 0], [0.32, 0], [0.4, 0.55], [-0.4, 0.55]]); g.fillStyle = ink('#6f7fb0'); D.ell(g, 0, 0.55, 0.4, 0.08); g.strokeStyle = ink('#5a3a22', 'print'); g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.38, 0.55); g.quadraticCurveTo(0, 1.0, 0.38, 0.55); g.stroke(); }, { w: 1.0, h: 1.1, name: 'bucket' });
  const buckets = [0, 1, 2].map((k) => { const m = flatCard(bkp, bkpaint, 931 + k); m.visible = false; H.scene.add(m); return m; });
  const waterMats = ['#6f7fb0', '#9aa8d8', '#e8eef8', '#4a5a90'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
  const splash = (x0, z0, x1, z1, n = 14) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(bitGeo, waterMats[i % 4]); m.scale.set(0.12 + Math.random() * 0.14, 0.12 + Math.random() * 0.1, 1); m.position.set(x0, 1.6, z0); H.scene.add(m); const T = 0.55 + Math.random() * 0.25; bits.push({ m, v: [(x1 - x0) / T + (Math.random() - 0.5) * 1.5, 5 + Math.random() * 2.5, (z1 - z0) / T + (Math.random() - 0.5) * 0.8], w: [Math.random() * 9, Math.random() * 9], life: 1.4 + Math.random() * 0.6, down: false }); } };
  const emberMat = new THREE.MeshBasicMaterial({ color: '#ffb050', toneMapped: false, side: THREE.DoubleSide }), embers = [];
  const burn = { on: false, lit: [], douse: null }; ctl.burn = burn;
  const setLevel = (b, L) => { b.level = L; const k = Math.max(0.001, L); b.flames.forEach((f) => f.group.scale.setScalar(k)); b.smoke.rotation.x = L > 0.25 ? 0 : Math.PI / 2; };
  burn.start = () => {
    if (burn.on) return; burn.on = true; burn.lit = []; burn.douse = null;
    for (const b of burnSlots) { b.soot.held = true; b.soot.set(0, 0); }
    burnSlots.forEach((b, k) => later(0.6 + k * 3.2, () => { if (!burn.on || burn.douse) return; burn.lit.push(b); setLevel(b, 1); b.flames.forEach((f, i) => { f.held = false; f.set(1, i * 0.05); }); H.sfx?.play('whoosh', { v: 0.4, from: 200, to: 900, dur: 0.6 }); H.sfx?.play('crumple', { v: 0.3 }); }));
  };
  // the fire is put out as it would be: the strongest villagers run a bucket chain from the water point to the burning
  // dwelling, the last ones throw the water and beat the flames with wet hides; each throw knocks the fire down a notch
  // in a burst of steam and a hiss; the dwellings are fought one by one, the last caught first so the fire stops spreading;
  // what is out stays black with soot; then the team walks home
  const CREW = ['brok', 'tarek', 'varg', 'kora', 'georges', 'eliott', 'sila', 'uma', 'orok', 'neila'];
  const quench = (b) => { b.flames.forEach((f) => { f.held = true; f.set(0, 0); }); setLevel(b, 0); b.steam.rotation.x = 0; later(3.5, () => { b.steam.rotation.x = Math.PI / 2; }); b.soot.held = false; b.soot.set(1, 0.3); H.sfx?.play('hiss', { v: 0.4, dur: 2.2 }); };
  burn.stop = (now = false) => {
    if (!burn.on) return;
    if (now || !burn.lit.length) { burn.on = false; for (const b of burnSlots) { b.flames.forEach((f) => { f.held = true; f.set(0, 0); }); setLevel(b, 0); if (burn.lit.includes(b)) { b.soot.held = false; b.soot.set(1, 0); } } burn.lit = []; burn.douse = null; endCrew(); return; }
    if (burn.douse) return;
    const crew = CREW.filter((id) => people[id] && !people[id].h.held && !people[id].dying).slice(0, 7);
    burn.douse = { crew, queue: [...burn.lit].reverse(), cur: null, t: 0, throwAt: 0, beat: 0 };
    for (const id of crew) { people[id].busy = true; people[id].hurry = true; }
  };
  const endCrew = () => { for (const id of CREW) { const p = people[id]; if (!p || p.dying) continue; if (p.busy && p.crew) { p.busy = false; p.hurry = false; p.beat = false; p.crew = false; p.target = p.home.slice(); } } buckets.forEach((m) => { m.visible = false; }); };
  H.onStep((t, dt) => {
    for (const b of burnSlots) b.soot.group.visible = !b.soot.held || b.soot.p > 0.02;
    const dz = burn.douse;
    if (dz) {
      if (!dz.cur) {
        dz.cur = dz.queue.shift(); dz.t = 0; dz.throwAt = 1.2;
        if (!dz.cur) { burn.on = false; burn.lit = []; burn.douse = null; endCrew(); }
        else {   // the chain: from the water point to the front of the dwelling, the throwers by the flames
          const b = dz.cur, fx = b.x + 0.4, fz = b.z + 3.2, n = dz.crew.length;
          dz.line = dz.crew.map((id, k) => { const u = n > 1 ? k / (n - 1) : 1, x = WATER[0] + (fx - WATER[0]) * u + (k === n - 1 ? 1.2 : k === n - 2 ? -1.2 : 0), z = WATER[1] + 0.9 + (fz - WATER[1] - 0.9) * u; const p = people[id]; p.crew = true; p.target = [x, z]; return [x, z]; });
        }
      }
      if (dz.cur) {
        const b = dz.cur, n = dz.crew.length; dz.t += dt;
        const there = dz.crew.every((id, k) => Math.hypot(people[id].x - dz.line[k][0], people[id].z - dz.line[k][1]) < 0.6) || dz.t > 12;
        // the buckets travel the line, hand to hand, a little hop at each pass
        buckets.forEach((m, k) => { m.visible = there; if (!there) return; const u = ((dz.t * 0.55 + k / 3) % 1) * (n - 1), i = Math.min(n - 2, Math.floor(u)), f = u - i, A = dz.line[i], B2 = dz.line[i + 1]; m.position.set(A[0] + (B2[0] - A[0]) * f, 1.5 + 0.35 * Math.sin(f * Math.PI), A[1] + (B2[1] - A[1]) * f + 0.2); });
        for (const [k, id] of dz.crew.entries()) people[id].beat = there && k >= n - 2;
        if (there && (dz.throwAt -= dt) <= 0) {
          dz.throwAt = 0.75 + Math.random() * 0.3; const th = dz.line[n - 1 - (Math.random() < 0.5 ? 0 : 1)];
          splash(th[0], th[1], b.x + (Math.random() - 0.5) * 2, b.z + 1); H.sfx?.play('hiss', { v: 0.22, dur: 1.0 }); b.steam.rotation.x = 0;
          setLevel(b, b.level - 0.2); if (b.level <= 0.05) { quench(b); dz.cur = null; }
        }
      }
    }
    for (const b of burn.lit) if (b.level > 0.05 && Math.random() < dt * 14 * b.level) { const m = new THREE.Mesh(bitGeo, emberMat); m.scale.setScalar(0.08 + Math.random() * 0.08); m.position.set(b.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 3 * b.level, b.z + 0.5); H.scene.add(m); embers.push({ m, v: [(Math.random() - 0.3) * 1.2, 1.5 + Math.random() * 2], life: 1.6 + Math.random() * 1.4 }); }
    for (let i = embers.length - 1; i >= 0; i--) { const e = embers[i]; e.life -= dt; e.m.position.x += e.v[0] * dt + Math.sin(t * 7 + i) * 0.01; e.m.position.y += e.v[1] * dt; e.m.rotation.z += dt * 5; if (e.life < 0.4) e.m.scale.multiplyScalar(0.9); if (e.life <= 0) { H.scene.remove(e.m); embers.splice(i, 1); } }
  });
  // the soot is cleaned up once the debrief is done
  campaign.on(() => { if (campaign.state.flags['done:V17_DEBRIEF_FIRE'] && !burn.on) for (const b of burnSlots) if (!b.soot.held) { b.soot.held = true; b.soot.set(0, 0); } });

  // ---- the Duel des menhirs, played in the village: Dylan and Aurélien face off before the Grand Menhir ------------
  // Dylan turns to profile; each blow is a lunge, the jump a hop, the guard a wicker shield that pops up; the chief
  // charges (Dylan recoils unless he guards), staggers when struck, bows when the duel is won; beaten, Dylan falls.
  const ARENA = { x: 1.8, z: -14.8, d: 2.5 };
  const shield = popup(...wicker(), { x: ARENA.x - ARENA.d + 1.0, z: ARENA.z + 0.45, yaw: 0, scale: 0.45 }); shield.held = true;
  const dz = { on: false, back: null, guard: false, crowd: [], shake: 0 };
  // the duel's effects, all cut paper: a spiky impact star where a blow lands (red, gold for a decision that strikes
  // home, grey on the wicker guard), a swoosh arc on each swing, wood chips off the shield, dust under the charge,
  // confetti at the victory, and the camera shaken by the big blows
  const starCard = (cols, seed, spikes = 12) => { const [pts, paint] = P2.drawnPiece((g, ink) => { cols.forEach((c, k) => { const R = 1.1 - k * 0.3, r = R * 0.45; g.fillStyle = ink(c); g.beginPath(); for (let i = 0; i < spikes * 2; i++) { const a = i / (spikes * 2) * 6.283 + k * 0.2, rr = i % 2 ? r : R * (0.8 + 0.2 * Math.sin(i * 7.1 + seed)); g.lineTo(Math.cos(a) * rr, 1.2 + Math.sin(a) * rr); } g.closePath(); g.fill(); }); }, { w: 2.6, h: 2.6, name: 'impact' }); const m = flatCard(pts, paint, seed); m.scale.setScalar(0.001); H.scene.add(m); return { m, t: 9, dur: 0.45 }; };
  const FX = { red: starCard(['#c8282a', '#e0a24a', '#fbf1de'], 901), red2: starCard(['#c8282a', '#f0c050', '#fbf1de'], 903, 10), gold: starCard(['#e0a24a', '#f8e08a', '#fbf1de'], 905, 16), grey: starCard(['#8f8aa0', '#d8d0e0', '#fbf6ea'], 907, 9) };
  const [swp, swpaint] = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#fbf1de'); g.beginPath(); g.arc(0, 0.2, 1.6, -0.2, 1.9); g.arc(0.25, 0.35, 1.25, 1.9, -0.2, true); g.closePath(); g.fill(); g.strokeStyle = ink('#2a1a1e', 'print'); g.lineWidth = 0.05; for (let k = 0; k < 4; k++) { const a = 0.1 + k * 0.4; g.beginPath(); g.arc(0.1, 0.25, 1.45 - k * 0.04, a, a + 0.25); g.stroke(); } }, { w: 3.6, h: 3.6, name: 'swoosh' });
  FX.swoosh = { m: flatCard(swp, swpaint, 911), t: 9, dur: 0.32 }; FX.swoosh.m.scale.setScalar(0.001); H.scene.add(FX.swoosh.m);
  const fx = (k, x, y, z, s = 1) => { const f = FX[k]; Object.assign(f, { t: 0, x, y, z, s, a0: Math.random() * 6.283 }); };
  const chipMats = ['#8a5a32', '#a8885a', '#c8b090', '#e0a24a', '#c84a2a', '#f4e6c6'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
  const burst = (x, y, z, n, mats, up = 6, spread = 4) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(bitGeo, chipMats[mats[i % mats.length]]); m.scale.set(0.12 + Math.random() * 0.12, 0.08 + Math.random() * 0.1, 1); m.position.set(x, y, z); H.scene.add(m); bits.push({ m, v: [(Math.random() - 0.5) * spread, up * (0.4 + Math.random() * 0.8), (Math.random() - 0.2) * 2], w: [Math.random() * 12, Math.random() * 12], life: 3 + Math.random() * 2, down: false }); } };
  H.onStep((t, dt) => { for (const f of Object.values(FX)) { if (f.t > f.dur) { if (f.m.scale.x > 0.001) f.m.scale.setScalar(0.001); continue; } f.t += dt; const u = Math.min(1, f.t / f.dur), k = u < 0.3 ? u / 0.3 * 1.15 : 1.15 - (u - 0.3) / 0.7 * 1.15; f.m.scale.setScalar(Math.max(0.001, k * f.s)); f.m.position.set(f.x, f.y, f.z); f.m.rotation.set(0, 0, f.a0 + u * (f === FX.swoosh ? -1.6 : 0.6)); } });
  function duelStep(dt, s, active) {
    const A = people.aurelien;
    shield.group.visible = !shield.held || shield.p > 0.02;
    if (active && s && !dz.on) {
      dz.on = true; dz.back = H.heroAt(); A.busy = true; A.target = null;
      H.placeHero(ARENA.x - ARENA.d, ARENA.z);
      A.x = ARENA.x + ARENA.d; A.z = ARENA.z; A.h.group.position.x = A.x; A.h.group.position.z = A.z;
      H.look(ARENA.x - 1.6, ARENA.z - 0.6, 17);
      // the tribe comes to watch: a half-ring of spectators behind the fighters
      dz.crowd = ['mathieu', 'lorette', 'georges', 'neila', 'orok', 'sila', 'petit_os', 'mathilde', 'grumb'].filter((id) => people[id] && !people[id].h.held);
      dz.crowd.forEach((id, k) => { const p = people[id], a = -1.25 + k * 2.5 / (dz.crowd.length - 1); p.busy = true; p.target = [ARENA.x + Math.sin(a) * 6.2, ARENA.z - 2.2 - Math.cos(a) * 2.6]; });
    }
    if (!dz.on) return;
    if (!active || !s) {
      dz.on = false; dz.chief = null; A.busy = false; doll.position.set(0, 0, 0); doll.rotation.set(0, 0, 0); A.h.group.rotation.z = 0;
      shield.held = true; shield.set(0, 0); dz.guard = false;
      if (dz.back) H.placeHero(dz.back[0], dz.back[1]); A.target = A.home.slice(); H.unlook();
      for (const id of dz.crowd || []) { people[id].busy = false; people[id].target = people[id].home.slice(); } return;
    }
    const t = s.t || 0, bump = (since, len) => { const u = since / len; return u >= 0 && u < 1 ? Math.sin(u * Math.PI) : 0; };
    const hit = bump(t - (s.lastHit ?? -9), 0.3), boss = bump(t - (s.lastBoss ?? -9), 0.45), jumping = t < (s.jumpUntil ?? 0), guarding = t < (s.guardUntil ?? 0);
    const down = s.phase === 'defeat', won = s.phase === 'victory';
    doll.rotation.y = Math.PI / 2 - hero.group.rotation.y;
    doll.position.x = hit * 1.1 - (guarding ? 0 : boss * 0.7);
    doll.position.y = jumping ? Math.sin(Math.min(1, (s.jumpUntil - t) / 0.6) * Math.PI) * 1.6 : 0;
    doll.rotation.z = down ? -1.35 : hit * 0.12 - (guarding ? 0 : boss * 0.4);
    A.h.group.position.x = A.x - boss * 1.5 + hit * 0.35;
    A.h.group.rotation.z = won ? 0.55 : boss * 0.25 - hit * 0.32;
    if (guarding !== dz.guard) { dz.guard = guarding; shield.held = !guarding; shield.set(guarding ? 1 : 0, 0); if (guarding) H.sfx?.play('rustle'); }
    // effects: where the blows land (read from the lives that drop), the swing, the charge, the guard, the victory
    const hp = hero.group.position, dx0 = hp.x + doll.position.x, dyz = ARENA.z + 0.6;
    if (dz.chief == null) { dz.chief = s.chief; dz.dylan = s.dylan; }
    if (s.chief < dz.chief - 0.01) { const big = dz.chief - s.chief >= 10; fx(big ? 'gold' : 'red', A.h.group.position.x - 0.5, 2.0, dyz, big ? 1.6 : 1); burst(A.h.group.position.x - 0.4, 2.0, dyz, big ? 18 : 8, big ? [3, 5, 4] : [4, 3, 5]); dz.shake = Math.max(dz.shake, big ? 0.45 : 0.18); }
    if (s.dylan < dz.dylan - 0.01) { fx('red2', dx0 + 0.3, 2.0, dyz, 1.1); burst(dx0 + 0.2, 2.0, dyz, 8, [4, 5]); dz.shake = Math.max(dz.shake, 0.3); }
    dz.chief = s.chief; dz.dylan = s.dylan;
    if ((s.lastHit ?? -9) !== dz.fxHit && s.lastHit != null) { dz.fxHit = s.lastHit; fx('swoosh', dx0 + 0.9, 1.9, dyz + 0.1, 0.8); }
    if ((s.lastBoss ?? -9) !== dz.fxBoss && s.lastBoss != null) { dz.fxBoss = s.lastBoss; burst(A.x, 0.2, A.z + 0.4, 10, [1, 2], 2.5, 5); if (guarding) { fx('grey', ARENA.x - ARENA.d + 1.2, 1.4, dyz + 0.2, 0.9); burst(ARENA.x - ARENA.d + 1.1, 1.3, dyz, 12, [0, 1]); } }
    if (won && !dz.won) { dz.won = true; burst(A.h.group.position.x, 3.2, dyz, 40, [3, 4, 5, 2], 9, 7); fx('gold', A.h.group.position.x, 2.6, dyz, 1.8); dz.shake = 0.3; }
    if (!won) dz.won = false;
    dz.shake = Math.max(0, dz.shake - dt * 1.4); const sk = dz.shake * dz.shake * 2.2;
    H.look(ARENA.x - 1.6 + (Math.random() - 0.5) * sk, ARENA.z - 0.6 + (Math.random() - 0.5) * sk, 17);
    // the duel's sounds: skin drums while they fight, a bone crack on each blow, the chief's horn as he charges
    const sx = H.sfx; if (!sx) return;
    if ((s.lastHit ?? -9) !== dz.hitAt && s.lastHit != null) { dz.hitAt = s.lastHit; sx.play('hit'); }
    if ((s.lastBoss ?? -9) !== dz.bossAt && s.lastBoss != null) { dz.bossAt = s.lastBoss; sx.play('horn', { f: 82, dur: 0.6, v: 0.2 }); sx.play(guarding ? 'bone' : 'hit', guarding ? { f: 1200, v: 0.4 } : {}); }
    if (jumping && !dz.jumping) sx.play('whoosh'); dz.jumping = jumping;
    if (s.phase !== dz.phase) { if (s.phase === 'question') sx.play('evidence'); if (s.phase === 'victory') sx.play('chant', { dur: 2 }); if (s.phase === 'defeat') { sx.play('slide'); sx.play('log'); } dz.phase = s.phase; }
    if (s.phase === 'combat') { dz.beat = (dz.beat ?? 0) - dt; if (dz.beat <= 0) { dz.beat = 0.3; dz.n = (dz.n ?? 0) + 1; sx.play('drum', { f: dz.n % 4 === 0 ? 62 : dz.n % 2 ? 96 : 80, v: dz.n % 4 === 0 ? 0.32 : 0.16, slap: 0.4 }); } }
  }

  const firePlaces = [[SITES.foyer.x, SITES.foyer.z, 1], [-11, -3.9, 0.8], ...[[-4.6, 7.2], [4.6, 7.2], [-7.6, -8.8], [7.6, -8.4], [-3.4, -17.8], [7, -17.6], [-10.6, -1.4], [10.8, -9.8]].map(([x, z]) => [x, z, 0.35])];
  const fireNear = (x, z) => [...firePlaces, ...burn.lit.map((b) => [b.x, b.z, 1.6 * b.level])].reduce((m, [fx, fz, k]) => Math.max(m, Math.min(1.6, k * Math.max(0, 1 - Math.hypot(x - fx, z - fz) / 16))), 0);
  const onPath = (x, z) => Math.hypot((x - SITES.foyer.x) / 8.5, (z - SITES.foyer.z) / 5.8) < 1 || PATHS.some((pl) => P2.pathLine(pl, { step: 1 }).dist(x, z) < 1.2);
  return { H, SITES, RIVER, people, hero, herds: HERD, burn, duelStep, weather, fireNear, riverNear, quest, deaths, bits, engraving, takeSwaps: () => swaps.splice(0), onPath, sendToAssembly, sendHome, everyoneAtAssembly, lead, arrivedAt, moving: (id) => !!people[id]?.target, sync, near: (site, r = 3.4) => { const s = SITES[site], p = H.hero.group.position; return !!s && Math.hypot(p.x - s.x, p.z - s.z) < r; }, hearth };
}
