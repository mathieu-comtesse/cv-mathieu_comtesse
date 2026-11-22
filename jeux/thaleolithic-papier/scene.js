// THALEOLITHIC · papier : le village des Crânes Fendus en pop-up de carton (skill papercraft). Seul le rendu change :
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
import { makeCard, clusterLayout } from 'papercraft/lib/paperkit-3d.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { createHarness } from './harness.js';
import { MENHIR_QUEST } from './campaign.js';

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
  neila: [16.5, -3.5], orok: [-2.5, -1.5], brok: [-17, 0.5], tarek: [-21, -8.5], uma: [10.5, -20], kora: [-24, -26], sila: [-3.5, 0], varg: [7, 8], grumb: [-6.5, -17.5], petit_os: [1.5, 0] };

const LOOK = {   // tunic, trim, hair, a prop: each villager in their own colours
  aurelien: ['#7a3a2a', '#e0b04a', '#5a3a28', 'transat'], mathieu: ['#4a6a6a', '#ead9b8', '#2a1a12', 'tablette'], lorette: ['#8a5a8a', '#ead9b8', '#6a2a1a', null],
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
    water(bandOf(RIVER.pts, 3.2), { colors: [C.water, sh(C.water, -0.2)], rim: '#e8d8b4', flow: 1.3, marks: 'ripples', foam: rgba('#f4ead4', 0.7) });
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
  // the hearth: a ring of stones, a teepee of sticks, the flame, a spit on forked sticks, log seats round it
  const hearthAt = (x, z, { big = false, lamp = true } = {}) => {
    const hs = [];
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, front = Math.cos(a) > 0.3; const s = (front ? 0.45 : 0.65) * (big ? 1.2 : 1); hs.push(popup(...rock(1.1), { x: x + Math.sin(a) * 1.5 * (big ? 1.25 : 1), z: z + Math.cos(a) * 1.05 * (big ? 1.25 : 1), scale: s, yaw: 0 })); }
    hs.push(popup(...P2.drawnPiece((g, ink) => { g.strokeStyle = ink('#5a3a22'); g.lineWidth = 0.16; g.lineCap = 'round'; for (const [a, b] of [[-0.9, 0.3], [0.9, -0.3], [-0.5, 0.6], [0.6, -0.5]]) { g.beginPath(); g.moveTo(a, 0); g.lineTo(b, 1.6); g.stroke(); } }, { w: 2.2, h: 1.8, name: 'teepee' }), { x, z: z - 0.25, yaw: 0 }));
    const flame = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#c84a2a'); P2.fillLeaf(g, 0, 0, 2.2, Math.PI / 2, 0.45); g.fillStyle = ink(C.fire); P2.fillLeaf(g, -0.15, 0.1, 1.6, Math.PI / 2 + 0.15, 0.42); g.fillStyle = ink('#f8e08a'); P2.fillLeaf(g, 0.1, 0.15, 0.9, Math.PI / 2 - 0.1, 0.4); }, { w: 1.6, h: 2.4, name: 'flame' });
    const f = popup(flame[0], (P) => { flame[1](P); P.glow((g) => { g.fillStyle = '#fff'; g.fillRect(-1, 0, 2, 2.4); }); }, { x, z, cross: true, sway: 0.6, scale: big ? 1.25 : 0.9 });
    H.glowing(f.group); if (lamp) H.lamp(x, 1.6, z, big ? 1.4 : 0.9, big ? 13 : 8); hs.push(f);
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
  const hideHeap = () => P2.drawnPiece((g, ink) => { for (const [x, y, c] of [[-0.6, 0, '#a0683e'], [0.4, 0.15, '#8a5a3a'], [-0.1, 0.45, '#b8885a']]) { g.fillStyle = ink(c); D.poly(g, [[x - 0.9, y], [x + 0.9, y], [x + 0.7, y + 0.45], [x - 0.5, y + 0.5]]); } }, { w: 2.8, h: 1.1, name: 'heap' });
  const rollers = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink(C.stone); D.poly(g, [[-1.6, 0.6], [1.6, 0.6], [1.3, 3.0], [-1.2, 2.8]]); g.fillStyle = ink('#7a4a2a'); for (const x of [-1.1, 0, 1.1]) { D.ell(g, x, 0.3, 0.3, 0.3); } g.strokeStyle = ink('#5a3a22'); g.lineWidth = 0.14; g.beginPath(); g.moveTo(1.4, 1.2); g.lineTo(2.8, 2.6); g.stroke(); g.strokeStyle = ink('#c8a870'); g.lineWidth = 0.07; g.beginPath(); g.moveTo(-1.4, 2.0); g.lineTo(-2.8, 1.0); g.stroke(); }, { w: 6.0, h: 3.2, name: 'rollers' });
  const clutter = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#7a4a2a'); D.rect(g, -1.4, 0, 2.6, 0.32, 0.12); D.poly(g, [[-0.6, 0.3], [1.6, 0.9], [1.5, 1.15], [-0.7, 0.55]]); g.fillStyle = ink(C.stone); D.ell(g, 1.2, 0.3, 0.4, 0.3); D.ell(g, -1.5, 0.25, 0.3, 0.25); }, { w: 3.6, h: 1.4, name: 'clutter' });
  const smoke = () => P2.drawnPiece((g, ink) => { g.fillStyle = ink('#8a7a7a'); for (const [x, y, rr] of [[0, 0.6, 0.5], [0.3, 1.3, 0.6], [-0.2, 2.1, 0.75], [0.4, 2.9, 0.85]]) D.ell(g, x, y, rr, rr * 0.8); }, { w: 2.2, h: 3.8, name: 'smoke' });
  const rubble = () => P2.drawnPiece((g, ink) => { g.strokeStyle = ink(C.bone); g.lineWidth = 0.28; g.lineCap = 'round'; for (const [a, b, c, d] of [[-2.6, 0.1, -0.4, 1.6], [2.4, 0.1, 0.1, 1.3], [-1.2, 0.2, 1.6, 0.9]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); } g.fillStyle = ink('#7a4a32'); D.poly(g, [[-2.8, 0], [2.8, 0], [2.0, 0.7], [0.2, 1.1], [-1.8, 0.8]]); g.fillStyle = ink('#c84a2a'); D.poly(g, [[-0.2, 1.0], [0.4, 1.0], [0.1, 2.4]]); }, { w: 6.0, h: 2.6, name: 'rubble' });
  const props = () => P2.drawnPiece((g, ink) => { g.strokeStyle = ink('#5a3a22'); g.lineWidth = 0.18; g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 3.3, 0); g.lineTo(s * 1.6, 2.6); g.stroke(); } g.fillStyle = ink('#c8b090'); D.rect(g, -0.9, 1.6, 1.0, 0.7, 0.05); g.fillStyle = ink('#c84a2a', 'print'); D.poly(g, [[-0.6, 1.75], [-0.2, 2.15], [0.0, 1.75]]); }, { w: 7.0, h: 2.8, name: 'props' });
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
      P.layer((g) => { g.fillStyle = sh(C.bone, -0.05); for (let k = 0; k < 4; k++) D.rect(g, -0.65 + (k % 2) * 0.75, box.y0 + box.h * (0.18 + Math.floor(k / 2) * 0.16), 0.6, box.h * 0.12, 0.08); }, C.bone);
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
    return P2.drawnPiece((g, ink) => {
      if (prop === 'lance' || prop === 'baton') { g.fillStyle = ink('#6a4a2a'); D.rect(g, 0.62, 0, 0.1, 3.1 * tall); if (prop === 'lance') { g.fillStyle = ink(C.stone); D.poly(g, [[0.52, 3.05 * tall], [0.82, 3.05 * tall], [0.67, 3.5 * tall]]); } }
      g.fillStyle = ink(C.skinB); D.rect(g, -0.26, 0, 0.2, 0.9 * tall, 0.06); D.rect(g, 0.06, 0, 0.2, 0.9 * tall, 0.06);
      g.fillStyle = ink(tunic); D.poly(g, [[-0.55, 0.65 * tall], [0.55, 0.65 * tall], [0.42, 2.0 * tall], [-0.42, 2.0 * tall]]);
      g.fillStyle = ink(trim, 'print'); for (let k = 0; k < 5; k++) D.poly(g, [[-0.55 + k * 0.22, 0.65 * tall], [-0.44 + k * 0.22, 0.85 * tall], [-0.33 + k * 0.22, 0.65 * tall]]); D.rect(g, -0.45, 1.6 * tall, 0.9, 0.08);
      g.fillStyle = ink(C.skin); D.rect(g, -0.68, 1.15 * tall, 0.18, 0.75 * tall, 0.08); D.rect(g, 0.5, 1.15 * tall, 0.18, 0.75 * tall, 0.08);
      g.fillStyle = ink(hair); D.ell(g, 0, 2.42 * tall, 0.4, 0.42); g.fillStyle = ink(C.skin); D.ell(g, 0, 2.32 * tall, 0.32, 0.34);
      g.fillStyle = ink(hair); D.ell(g, 0, 2.6 * tall, 0.36, 0.16);
      if (id === 'alban' || id === 'grumb' || id === 'aurelien') { g.fillStyle = ink(hair); D.poly(g, [[-0.25, 2.18 * tall], [0.25, 2.18 * tall], [0, 1.75 * tall]]); }
      g.fillStyle = ink(C.ink, 'print'); D.ell(g, -0.12, 2.36 * tall, 0.045, 0.055); D.ell(g, 0.12, 2.36 * tall, 0.045, 0.055); D.rect(g, -0.08, 2.17 * tall, 0.16, 0.03);
      if (prop === 'tablette') { g.fillStyle = ink(C.stoneB); D.rect(g, -0.85, 1.1 * tall, 0.55, 0.7, 0.06); g.fillStyle = ink(C.ink, 'print'); for (let k = 0; k < 3; k++) D.rect(g, -0.78, 1.25 * tall + k * 0.18, 0.4, 0.04); }
      if (prop === 'masse' || prop === 'hache') { g.fillStyle = ink('#6a4a2a'); D.rect(g, 0.55, 0.9, 0.09, 1.2); g.fillStyle = ink(C.stone); D.ell(g, 0.6, 2.1, 0.28, 0.2); }
      if (prop === 'pinceau') { g.fillStyle = ink('#6a4a2a'); D.rect(g, 0.55, 1.2, 0.07, 1.0); g.fillStyle = ink(C.red); D.ell(g, 0.58, 2.2, 0.09, 0.14); }
      if (prop === 'transat') { g.fillStyle = ink('#a0683e'); D.poly(g, [[-1.2, 0], [-1.05, 0], [-0.62, 1.3], [-0.8, 1.4]]); D.rect(g, -0.85, 1.15, 0.4, 0.14); }
    }, { w: 2.8, h: 3.7 * tall, name: 'villager ' + id });
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
  const staged = (when, make, { undo = false } = {}) => { const n0 = H.hinges.length; make(); const hs = H.hinges.slice(n0); if (!undo) for (const h of hs) h.held = true; STAGES.push({ when, hs, undo, on: undo }); return hs; };
  const quest = (id) => { const q = campaign.data.quests.find((x) => x.id === id); return () => !!q && campaign.questDone(q); };
  const flag = (k) => () => !!campaign.state.flags[k];
  const any = (...fs) => () => fs.some((f) => f());

  // ---- the square: the great hearth, Aurélien's chair, the notice post (support), the alarm horn (emergency) -----
  const hearth = hearthAt(SITES.foyer.x, SITES.foyer.z, { big: true }); mark(SITES.foyer.x, SITES.foyer.z, 4.5);
  // ---- the huts round the square, doors to the camera; the chief's is the biggest, under a skull -------------------
  const HUTS = [[-7, -14.5, 3.4, '#7a4a32', 'skull'], [7.5, -12.5, 2.8, '#8a5a3a', 'hands'], [10, 0.5, 2.6, '#9a6a42', 'zigzag'], [-11, -7.5, 2.7, '#8a5a3a', 'zigzag'],
    [-8, 1, 2.5, '#a07a52', 'hands'], [-15.5, -16, 2.5, '#7a5236', 'hands'], [8, -23.5, 2.4, '#8a6044', 'zigzag'], [-16.5, 5.5, 2.3, '#946446', 'hands'], [18.5, -13, 2.3, '#7f5a3e', 'zigzag']];
  for (const [x, z, r, hide, m] of HUTS) { hut(x, z, r, { hide, mark: m }); mark(x, z, r + 1.4); }
  // ---- the sanctuary: the Grand Menhir at the far end; the policy tablet appears once the duel is won ---------------
  menhir(0, -22.5); mark(0, -22.5, 7);
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
  // I · context: the scope is staked out, ochre-tipped markers round the village
  staged(quest('V17_CONTEXT'), () => { for (const [x, z] of [[-27, -6], [27, -6], [-6, -29.5], [17, 10.5], [-14, 9.5]]) popup(...marker(), { x, z }); });
  // II · the duel won: the policy carved on a tablet at the menhir's foot
  staged(quest(MENHIR_QUEST), () => popup(...tablet(), { x: 0, z: -19.3 }));
  // III · the hunt for risks: the flint workshop, cut too close to the path (difference 11), gets a wicker screen and a roped-off zone
  staged(quest('V17_RISKS'), () => { popup(...wicker(), { x: A.x + 1.2, z: A.z + 0.6, yaw: -0.1 }); popup(...rope(5.5), { x: A.x - 0.5, z: A.z - 5.2, yaw: 0 }); });
  // IV · the means: three chests at the stores, the notice post with the tablets on the square
  staged(quest('V17_SUPPORT'), () => { popup(...chests(), { x: S.x - 2.4, z: S.z - 0.2 }); popup(...noticePost(), { x: 4.6, z: -10.2 }); });
  // V · the shelter: bare arches until the roof is chosen; C (checked) a sound hut; B (makeshift) the hut on props;
  //     A maintained against the alert: the collapse, and a cairn for the builder
  const Hb = SITES.habitations;
  staged(any(flag('choice:D_ABRI_A'), flag('choice:D_ABRI_B'), flag('choice:D_ABRI_C')), () => popup(...P2.drawnPiece((g, ink) => { g.strokeStyle = ink(C.bone); g.lineWidth = 0.3; for (const s of [-1.6, 0, 1.6]) { g.beginPath(); g.ellipse(s, 0, 1.3, 2.9, 0, Math.PI, 0, true); g.stroke(); } g.fillStyle = ink(C.bone); D.rect(g, -3, 0, 6, 0.3); g.fillStyle = ink('#7a4a2a'); D.rect(g, 2.2, 0, 1.4, 0.4, 0.1); }, { w: 6.6, h: 3.2, name: 'frame' }), { x: Hb.x, z: Hb.z - 0.6, yaw: 0 }), { undo: true });
  staged(any(flag('effective:M_V_ABRI'), flag('choice:D_ABRI_B')), () => hut(Hb.x, Hb.z - 1, 2.9, { hide: '#9a6a42', mark: 'hands', solid: false }));
  staged(flag('choice:D_ABRI_B'), () => popup(...props(), { x: Hb.x, z: Hb.z + 1.4 }));
  staged(flag('catastrophe'), () => { popup(...rubble(), { x: Hb.x, z: Hb.z - 0.6 }); popup(...rock(1.6), { x: Hb.x + 3.4, z: Hb.z + 1.2, scale: 0.8 }); });
  // VI · the 15 differences: what the tribe changed
  //   1 · the fire inside the tent: smoke out of the doorway, then the hearth moved outside in its stone ring
  staged(quest('V17_OPERATIONS'), () => popup(...smoke(), { x: -11, z: -5.2, cross: true, sway: 0.4 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => hearthAt(-11, -3.9, { lamp: false }));
  //   9 · the building site in the walkways: clutter on the path, then a roped-off zone
  staged(quest('V17_OPERATIONS'), () => popup(...clutter(), { x: 11.5, z: -13.2, yaw: 0.4 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => popup(...rope(6.5, '#c84a2a'), { x: Hb.x, z: Hb.z + 3.1 }));
  //  12 · Neila's stores stacked unsteadily, then a braced rack and clear passages
  staged(quest('V17_OPERATIONS'), () => popup(...wobblyPile(), { x: S.x - 2.6, z: S.z - 2.4 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => popup(...rack(), { x: S.x - 2.2, z: S.z - 2.8 }));
  //  14 · the river ford grown dangerous, then a footbridge; 5 · the megalith on rollers with levers; 3 · the pigments
  //  under a ventilated hood; 15 · the hides heaped on the square, then racks checked outside the wall
  staged(quest('V17_OPERATIONS'), () => popup(...stepping(), { x: 32, z: -10, yaw: 0 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => popup(...bridge(), { x: 31.5, z: -10, yaw: 0 }));
  staged(quest('V17_OPERATIONS'), () => popup(...rollers(), { x: SITES.pierre_carriere.x - 4.4, z: SITES.pierre_carriere.z + 1.6 }));
  staged(quest('V17_OPERATIONS'), () => popup(...pigmentHood(), { x: SITES.nork.x + 2.6, z: SITES.nork.z - 1.6 }));
  staged(quest('V17_OPERATIONS'), () => popup(...hideHeap(), { x: -3.6, z: -1.8 }), { undo: true });
  staged(quest('V17_OPERATIONS'), () => { for (const [x, z] of [[-28, -17], [-25.5, -21]]) popup(...hidesRack(), { x, z }); });
  // VII · fire!: the alarm horn on the square and water jars by the huts
  staged(quest('V17_EMERGENCY'), () => { popup(...hornPost(), { x: -4.4, z: -9.5 }); for (const [x, z] of [[-5, 1.5], [12.6, 1.6], [-8.6, -6], [10, -11.5]]) popup(...pots(), { x, z, scale: 0.6 }); });
  // VIII · the elders' audit: a ring of seats by the sanctuary
  staged(quest('V17_EVALUATION'), () => popup(...seats(), { x: -7.5, z: -21.2, yaw: 0.25 }));
  // IX · the next cycle: bunting over the square, a watchtower by the wall
  staged(quest('V17_IMPROVEMENT'), () => { popup(...bunting(10), { x: 0, z: -9.6 }); popup(...tower(), { x: 16, z: -22 }); });
  // the uprooted fire of the tent stays out (difference 1), kept clear of the walk
  walk.solid(-11, -3.9, 1.2);

  // ---- outside the wall: the far ridge with mammoths, crimson pines in the woods, rocks; inside, tufts only ------------
  for (const [x, z, s] of [[-30, -44, 1.4], [-10, -48, 1.2], [18, -46, 1.5]]) H.stack(x, z, [0, 1, 2].map((k) => ({ pts: P2.roughen(P2.shape.hill(rnd, { w: 26 - k * 4, h: 7 - k * 1.6, bumps: 2 }), rnd), paint: (P) => { base2(P, sh('#8a6a8a', -0.12 + k * 0.1), 0.08); shadeIn(P, '#8a6a8a', 0.25); }, d: k * 1.6 })), { scale: s });
  const herd = [];
  for (const [x, z, s] of [[-20, -37, 1.0], [-14, -38, 0.8], [24, -37, 1.1]]) herd.push(popup(...mammoth(), { x, z, scale: s }));
  const PV = Array.from({ length: 4 }, () => { const [pts, paint] = pine(); return [pts, H.printed(pts, paint, { cross: true })]; });
  for (let gz = -42; gz <= 16; gz += 3.4) for (let gx = -42; gx <= 42; gx += 3.4) {
    const x = gx + (rnd() - 0.5) * 2.4, z = gz + (rnd() - 0.5) * 2.4, e = ovalE(x, z);
    if (!H.inReach(x, z, 0.05, 4) || !free(x, z, 0.5)) continue;
    if (e > 1.12 && (z < -24 || Math.abs(x) > 27 || z > 12) && rnd() < 0.8 && Math.hypot(x - SITES.rassemblement.x, z - SITES.rassemblement.z) > 5) { const [pts, mat] = PV[Math.floor(rnd() * PV.length)]; popup(pts, null, { materials: mat, x, z, cross: true, scale: 0.85 + rnd() * 0.3, sway: 0.3 }); mark(x, z, 2.6); }
    else if (rnd() < (e < 1 ? 0.18 : 0.35)) { popup(...(e < 1 || rnd() < 0.5 ? tuft() : rock(between(1.6, 2.6))), { x, z, scale: 0.8 + rnd() * 0.4, sway: 0.4 }); mark(x, z, 1.6); }
  }


  // ---- the villagers -------------------------------------------------------------------------------------------------
  const people = {};
  for (const id of Object.keys(LOOK)) {
    const home = HOME[id], [x, z] = typeof home === 'string' ? [SITES[home].x, SITES[home].z] : home;
    const h = popup(...villager(id), { x, z, yaw: 0 });
    people[id] = { h, home: [x, z], x, z, target: null };
    walk.solid(x, z, 0.5);
  }
  if (campaign.state.dead.includes('uma')) people.uma.h.held = true;

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
  life.puffs({ at: [[SITES.foyer.x, 2.6, SITES.foyer.z]], perEmitter: 4, life: 5, rise: 0.5, size: [0.3, 0.55], colors: ['#d8c8c0', '#c8b8b8'] });
  life.motes({ count: 18, colors: ['#ffb060', '#ffd080'], size: [0.05, 0.09], rise: 0.6, glow: 1, height: [0.5, 3] });
  life.flock({ size: 5, height: 4, colors: ['#3a2a3a', '#f0e0d0'] });
  life.flyers({ count: 8, colors: ['#f4ecd8', '#e9c64a', '#d88aa0'], anchors: [[-6, -3], [8, 3], [-6, -20], [18, -10], [-20, 2]], roam: 1.6 });
  for (const m of herd) life.critter(m.group, { behaviour: 'graze', roam: 1.0 });
  life.reset(H.target);
  H.onStep((t, dt) => life.update(dt, H.target));
  H.onRestart(() => life.reset(H.target));

  // ---- what the campaign changes in the world -------------------------------------------------------------------------
  // the evacuation: the villagers walk to the gathering point
  const assembly = SITES.rassemblement;
  function sendToAssembly() { let k = 0; for (const p of Object.values(people)) { if (p.h.held) continue; const a = (k++ / 18) * 6.283; p.target = [assembly.x + Math.cos(a) * 1.8, assembly.z + Math.sin(a) * 1.4]; } }
  function sendHome() { for (const p of Object.values(people)) p.target = p.home.slice(); }
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
  function sync() {
    for (const st of STAGES) {
      const want = st.undo ? !st.when() : st.when();
      if (want && !st.on) { st.on = true; st.hs.forEach((h, i) => { h.held = false; h.set(1, 0.2 + i * 0.07); }); }
      else if (!want && st.on) { st.on = false; st.hs.forEach((h, i) => { h.held = true; h.set(0, i * 0.03); }); }
    }
    const umaGone = campaign.state.dead.includes('uma');
    if (umaGone !== !!people.uma.h.held) { people.uma.h.held = umaGone; people.uma.h.set(umaGone ? 0 : 1, 0); }
  }
  campaign.on(sync);
  sync();
  // a piece not built yet (or taken down) is not lying about: once folded flat it is put away
  const stagedHinges = STAGES.flatMap((st) => st.hs);
  H.onStep((t, dt) => {
    for (const h of stagedHinges) h.group.visible = !h.held || h.p > 0.02;
    for (const p of Object.values(people)) {
      if (!p.target) continue;
      const dx = p.target[0] - p.x, dz = p.target[1] - p.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { p.target = null; continue; }
      const step = Math.min(d, 5 * dt); p.x += dx / d * step; p.z += dz / d * step;
      p.h.group.position.x = p.x; p.h.group.position.z = p.z;
    }
  });

  // ---- the Duel des menhirs, played in the village: Dylan and Aurélien face off before the Grand Menhir ------------
  // Dylan turns to profile; each blow is a lunge, the jump a hop, the guard a wicker shield that pops up; the chief
  // charges (Dylan recoils unless he guards), staggers when struck, bows when the duel is won; beaten, Dylan falls.
  const ARENA = { x: 1.8, z: -14.8, d: 2.5 };
  const shield = popup(...wicker(), { x: ARENA.x - ARENA.d + 1.0, z: ARENA.z + 0.45, yaw: 0, scale: 0.45 }); shield.held = true;
  const dz = { on: false, back: null, guard: false, crowd: [] };
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
      dz.on = false; A.busy = false; doll.position.set(0, 0, 0); doll.rotation.set(0, 0, 0); A.h.group.rotation.z = 0;
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
    if (guarding !== dz.guard) { dz.guard = guarding; shield.held = !guarding; shield.set(guarding ? 1 : 0, 0); }
  }

  return { H, SITES, RIVER, people, hero, duelStep, sendToAssembly, sendHome, everyoneAtAssembly, lead, arrivedAt, moving: (id) => !!people[id]?.target, sync, near: (site, r = 3.4) => { const s = SITES[site], p = H.hero.group.position; return !!s && Math.hypot(p.x - s.x, p.z - s.z) < r; }, hearth };
}
