// THALEOLITHIC · papier : le village des Crânes Fendus en pop-up de carton (skill papercraft). Seul le rendu change :
// la campagne, les quêtes, les mini-jeux et les contenus ISO 45001 sont ceux du jeu Unity (campaign.js + ses données).
//
// PAPER SPEC ---------------------------------------------------------------------------------------------------------
// BRIEF    le village préhistorique de l'écran d'accueil du jeu : crépuscule pourpre et orangé, pins rouge sang, huttes de
//          peaux sur arceaux d'os de mammouth, feu de camp, grand menhir veillé par un ancien, rivière, mammouths.
// PALETTE  sol herbe sèche #b9a06a / terre battue #c79a6a ; pins #b8402e #8e2f2a ; peaux #8a5a3a ; os #ead9b8 ;
//          menhir #8f8aa0 ; rivière #6f7fb0 ; accent feu #f0a040 ; encre #2a1a1e ; ombre prune #6a3048.
// LIGHT    soleil bas et orangé (golden hour) venant de la gauche, remplissage mauve, ombres prune, feux qui éclairent.
// TYPES    dômes en tranches (huttes), croix (pins, totems, mammouths), cartes (habitants, rochers, accessoires),
//          cluster de cartes taillées (menhir), eau imprimée (rivière), voiles (crêtes du fond).
import * as THREE from 'three';
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, clusterLayout } from 'papercraft/lib/paperkit-3d.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { createHarness } from './harness.js';

export const C = {
  ground: '#a6a274', dirt: '#c8a47c', grassA: '#9a9a66', grassB: '#aca676', pine: '#b8402e', pineDeep: '#8e2f2a', trunk: '#4a2c24',
  hide: '#8a5a3a', hideB: '#a0683e', bone: '#ead9b8', stone: '#8f8aa0', stoneB: '#a39cb0', water: '#6f7fb0', fire: '#f0a040',
  ink: '#2a1a1e', skin: '#d9a07a', skinB: '#b97a54', hair: '#3a2418', ochre: '#c98a3a', red: '#a83a2a', moss: '#7a8a4a',
};
const sh = P2.shade, rgba = P2.rgba, D = P2.draw2;
const CREPUSCULE = { key: '#ffbe8a', ki: 2.7, dir: [-0.85, 0.48, 0.5], fill: '#8a7ab8', fi: 1.0, sky: '#c8a0c8', skyG: '#6a4a5a', si: 0.55, leak: '#6a3048', wrap: 0.35, glow: 1.0, lamp: 5,
  post: { exposure: 0.9, tint: [1.0, 0.98, 1.02], saturation: 0.95, haze: '#c89aa8', hazeStart: 30, hazeEnd: 90, hazeAmount: 0.3, vignette: 0.08, vignetteColor: '#2a1830', shadowTint: '#3a2040' } };

// ---- the village plan: every place a quest can send Dylan --------------------------------------------------------
export const SITES = {
  foyer: { x: -1, z: 1, label: 'Le foyer' }, grand_menhir: { x: 1, z: -15, label: 'Le Grand Menhir' }, rassemblement: { x: 13, z: 7, label: 'Point de rassemblement' },
  atelier_silex: { x: -19, z: 3, label: 'L’atelier de silex' }, pierre_carriere: { x: 21, z: -16, label: 'La carrière' }, stockage: { x: 16, z: -4, label: 'Le stockage' },
  chasse_clairiere: { x: -21, z: -23, label: 'La clairière de chasse' }, habitations: { x: 8, z: -25, label: 'Les habitations' },
  aurelien: { x: -7, z: -5, label: 'Aurélien' }, mathieu: { x: 6, z: -1, label: 'Mathieu' }, lorette: { x: -13, z: -10, label: 'Lorette' },
  nork: { x: -9, z: -24, label: 'Ouways' }, alban: { x: 5.5, z: -12.5, label: 'Alban' },
};
// where each villager stands (the givers stand on their own site)
const HOME = { aurelien: 'aurelien', mathieu: 'mathieu', lorette: 'lorette', nork: 'nork', alban: 'alban', georges: [-16, 6], eliott: [-18, -20], mathilde: [2.5, 4.5],
  neila: [18.5, -2], orok: [-3.5, 3.5], brok: [-21.5, 5], tarek: [-24, -6], uma: [11, -27], kora: [-24, -25], sila: [-5, 5.5], varg: [26, 4], grumb: [-2, -13], petit_os: [1, 6] };
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
    view: innerWidth < innerHeight ? { pitch: 47, dist: 76, target: [2, 1.5, -6], follow: [-1.5, -8] } : { pitch: 47, dist: 60, target: [0, 1.5, -6] },
    walkArea: { x0: -28, x1: 28, z0: -32, z1: 10 } });
  const { walk } = H;
  let rnd = P2.rng(301);
  const between = (a, b) => a + rnd() * (b - a);
  const base2 = (P, c, k = 0.1, felt = 0.5) => { P.gradient(sh(c, k), sh(c, -k), 0.5); P.felt(felt); };
  const shadeIn = (P, c, a = 0.35) => P.innerShade(sh(c, -0.6), { alpha: a, blurPx: 8 });
  const RIVER = P2.pathLine([[36, -40], [31, -28], [33, -16], [29, -4], [33, 8], [30, 20]], { step: 0.6 });

  // ---- the printed ground: dry grass, beaten earth round the hearth, paths between the places, the river -----------
  H.printGround(({ g, ppu, X, Z, rnd: r, washes, torn, bandOf, drifts, water }) => {
    washes([C.grassA, C.grassA, C.grassB, '#b8a77a']);
    torn(Array.from({ length: 30 }, (_, i) => { const a = i / 30 * 6.283; return [Math.cos(a) * 12 * (1 + 0.08 * Math.sin(a * 3)), -5 + Math.sin(a) * 9]; }), rgba(C.dirt, 0.85));
    const paths = [[[-1, 1], [-8, 2], [-19, 3]], [[-1, 1], [6, 3], [13, 7]], [[-1, 1], [0, -7], [1, -15]], [[1, -15], [-4, -20], [-9, -24]], [[1, -15], [6, -20], [8, -25]], [[6, -1], [12, -3], [16, -4], [21, -16]], [[-9, -24], [-16, -24], [-21, -23]]];
    for (const pl of paths) torn(bandOf(P2.pathLine(pl, { step: 0.5 }).pts, 1.1), rgba('#d8b483', 0.85));
    water(bandOf(RIVER.pts, 3.2), { colors: [C.water, sh(C.water, -0.2)], rim: '#e8d8b4', flow: 1.3, marks: 'ripples', foam: rgba('#f4ead4', 0.7) });
    drifts((x, y) => { g.strokeStyle = rgba(r() < 0.5 ? '#8a8a4a' : '#a09a5a', 0.75); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 5 - r() * 5); g.stroke(); if (r() < 0.12) { g.fillStyle = r() < 0.5 ? '#c86a8a' : '#e0c050'; g.beginPath(); g.arc(x, y - 6, 1.7, 0, 7); g.fill(); } }, { n: 12000 });
    // the gathering point: a ring of white stones
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, x = SITES.rassemblement.x + Math.cos(a) * 2.8, z = SITES.rassemblement.z + Math.sin(a) * 2.2; g.fillStyle = '#efe4cc'; g.beginPath(); g.ellipse(X(x), Z(z), 0.32 * ppu, 0.22 * ppu, 0, 0, 7); g.fill(); }
  }, { seed: 12 });
  walk.block((x, z) => RIVER.dist(x, z) < 2.6);

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
  // a dome hut: slices of hide with cream bone arches and a dark doorway on the front slice
  const hut = (x, z, r = 2.8, open = true, held = false) => {
    const slice = (k, n) => (P) => {
      const { box } = P; base2(P, sh(C.hide, -0.08 + k * 0.05), 0.1);
      P.marks('hatch', { color: sh(C.hide, -0.35), alpha: 0.35, size: 0.06, angle: 0.4 });
      P.layer((g) => { g.strokeStyle = C.bone; g.lineWidth = 0.28; for (const s of [-0.62, 0, 0.62]) { g.beginPath(); g.ellipse(s * box.w * 0.5, box.y0, box.w * 0.24, box.h * 0.95, 0, Math.PI, 0, true); g.stroke(); } }, C.bone);
      if (k === n - 1 && open) P.layer((g) => { g.fillStyle = '#2a1a1e'; g.beginPath(); g.ellipse(0, box.y0, box.w * 0.18, box.h * 0.55, 0, Math.PI, 0, true); g.fill(); }, '#2a1a1e', { lip: 0 });
      shadeIn(P, C.hide, 0.3);
    };
    const hs = H.dome(x, z, { r, h: r * 1.05, n: 4, paint: [0, 1, 2, 3].map((k) => slice(k, 4)), yaw: 0, flat: held ? FACE_DOWN : null });
    if (!held) walk.solid(x, z, r * 0.95); return hs;
  };
  // the Grand Menhir: a cluster of tall cut stone cards, the tallest carved with the four tablets
  const menhir = (x, z) => {
    const slab = (h, w, tilt) => { const pts = [[-w / 2, 0], [w / 2, 0], [w * 0.38 + tilt, h * 0.9], [tilt * 0.4, h], [-w * 0.42 + tilt, h * 0.85]]; return P2.roughen(pts, rnd, { amp: w * 0.02 }); };
    const carve = (P) => { const { box } = P; base2(P, C.stone, 0.14, 0.6); P.layer((g) => { g.fillStyle = sh(C.stone, -0.22); D.poly(g, [[box.x0 + box.w * 0.55, box.y0 - 1], [box.x1 + 1, box.y0 - 1], [box.x0 + box.w * 0.75, box.y1 + 1]]); }, sh(C.stone, -0.22)); P.layer((g) => { g.fillStyle = sh(C.bone, -0.05); for (let k = 0; k < 4; k++) D.rect(g, -0.65 + (k % 2) * 0.75, box.y0 + box.h * (0.42 + Math.floor(k / 2) * 0.2), 0.6, box.h * 0.15, 0.08); }, C.bone); P.marks('tick', { color: sh(C.stone, -0.45), alpha: 0.4, size: 0.05, angle: 1.2 }); shadeIn(P, C.stone, 0.35); };
    popup(slab(9, 3.2, 0.3), carve, { x, z, yaw: -0.1, solid: 1.6 });
    popup(slab(5.5, 2.2, -0.4), (P) => { base2(P, C.stoneB, 0.12); shadeIn(P, C.stone, 0.35); }, { x: x - 2.4, z: z + 0.8, yaw: 0.2 });
    popup(slab(4.2, 1.8, 0.3), (P) => { base2(P, sh(C.stone, -0.06), 0.12); shadeIn(P, C.stone, 0.35); }, { x: x + 2.3, z: z + 1.1, yaw: -0.3 });
  };
  const fire = (x, z) => {
    popup(...logs(), { x, z: z + 0.2, yaw: 0 });
    const flame = P2.drawnPiece((g, ink) => { g.fillStyle = ink('#c84a2a'); P2.fillLeaf(g, 0, 0, 2.2, Math.PI / 2, 0.45); g.fillStyle = ink(C.fire); P2.fillLeaf(g, -0.15, 0.1, 1.6, Math.PI / 2 + 0.15, 0.42); g.fillStyle = ink('#f8e08a'); P2.fillLeaf(g, 0.1, 0.15, 0.9, Math.PI / 2 - 0.1, 0.4); }, { w: 1.6, h: 2.4, name: 'flame' });
    const h = popup(flame[0], (P) => { flame[1](P); P.glow((g) => { g.fillStyle = '#fff'; g.fillRect(-1, 0, 2, 2.4); }); }, { x, z, cross: true, sway: 0.6 });
    H.glowing(h.group); H.lamp(x, 1.6, z, 1.2, 12); walk.solid(x, z, 1.2);
    return h;
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
  const free = (x, z, m = 0) => RIVER.dist(x, z) > 4.2 + m && keep.every(([a, b, r]) => Math.hypot(x - a, z - b) > r + m) && Object.values(SITES).every((s) => Math.hypot(x - s.x, z - s.z) > 3.2 + m);

  // ---- landmarks ---------------------------------------------------------------------------------------------------
  menhir(SITES.grand_menhir.x, SITES.grand_menhir.z); mark(SITES.grand_menhir.x, SITES.grand_menhir.z, 5);
  const hearth = fire(SITES.foyer.x, SITES.foyer.z); mark(SITES.foyer.x, SITES.foyer.z, 3);
  for (const [x, z, r] of [[-9, 5, 2.8], [5, 7, 2.5], [-13, -1, 3], [12, -10, 2.6], [-4, -26, 2.7], [14, -26, 2.4]]) { hut(x, z, r); mark(x, z, r + 1.6); }
  // the hut under construction at the habitations: bare bone arches; the finished hut unfolds when the shelter is verified
  const frame = popup(...P2.drawnPiece((g, ink) => { g.strokeStyle = ink(C.bone); g.lineWidth = 0.3; for (const s of [-1.6, 0, 1.6]) { g.beginPath(); g.ellipse(s, 0, 1.3, 2.9, 0, Math.PI, 0, true); g.stroke(); } g.fillStyle = ink(C.bone); D.rect(g, -3, 0, 6, 0.3); }, { w: 6.6, h: 3.2, name: 'frame' }), { x: SITES.habitations.x, z: SITES.habitations.z, yaw: 0 });
  const shelter = hut(SITES.habitations.x, SITES.habitations.z - 0.4, 2.9, true, true); mark(SITES.habitations.x, SITES.habitations.z, 4);
  for (const h of shelter) h.held = true;
  totem(SITES.rassemblement.x + 3.2, SITES.rassemblement.z - 1); mark(SITES.rassemblement.x, SITES.rassemblement.z, 3.6);
  // the trades at their places
  popup(...rock(3), { x: SITES.atelier_silex.x + 2, z: SITES.atelier_silex.z - 1.5 }); popup(...logs(), { x: SITES.atelier_silex.x - 2.2, z: SITES.atelier_silex.z - 0.8 });
  for (const [dx, dz, w] of [[0, -2, 4.2], [3, 0, 3.4], [-2.5, 0.6, 3]]) popup(...rock(w), { x: SITES.pierre_carriere.x + dx, z: SITES.pierre_carriere.z + dz });
  popup(...pots(), { x: SITES.stockage.x, z: SITES.stockage.z - 1.4 }); popup(...logs(), { x: SITES.stockage.x + 2.5, z: SITES.stockage.z - 0.4 });
  popup(...P2.drawnPiece((g, ink) => { g.fillStyle = ink('#c8b090'); D.rect(g, -2, 0, 4, 2.6, 0.1); g.fillStyle = ink(C.red, 'print'); D.ell(g, -0.9, 1.4, 0.45, 0.3); D.poly(g, [[0.2, 0.6], [1.6, 1.0], [0.6, 2.0]]); g.fillStyle = ink(C.ink, 'print'); for (let k = 0; k < 4; k++) D.rect(g, -1.6 + k * 0.9, 0.4, 0.08, 0.5); }, { w: 4.4, h: 2.8, name: 'painted wall' }), { x: SITES.nork.x - 0.5, z: SITES.nork.z - 1.6, yaw: 0.1 });
  mark(SITES.chasse_clairiere.x, SITES.chasse_clairiere.z, 4);
  // the far ridge with mammoths, crimson pines all round, rocks and tufts
  for (const [x, z, s] of [[-30, -42, 1.4], [-10, -46, 1.2], [18, -44, 1.5]]) H.stack(x, z, [0, 1, 2].map((k) => ({ pts: P2.roughen(P2.shape.hill(rnd, { w: 26 - k * 4, h: 7 - k * 1.6, bumps: 2 }), rnd), paint: (P) => { base2(P, sh('#8a6a8a', -0.12 + k * 0.1), 0.08); shadeIn(P, '#8a6a8a', 0.25); }, d: k * 1.6 })), { scale: s });
  const herd = [];
  for (const [x, z, s] of [[-20, -36, 1.0], [-15, -37, 0.8], [24, -36, 1.1]]) herd.push(popup(...mammoth(), { x, z, scale: s }));
  const PV = Array.from({ length: 4 }, () => { const [pts, paint] = pine(); return [pts, H.printed(pts, paint, { cross: true })]; });
  for (let gz = -40; gz <= 14; gz += 3.4) for (let gx = -40; gx <= 42; gx += 3.4) {
    const x = gx + (rnd() - 0.5) * 2.4, z = gz + (rnd() - 0.5) * 2.4, edge = Math.max(Math.abs(x) / 30, (z < -28 ? 1 : 0), z > 9 ? 1 : 0);
    if (!H.inReach(x, z, 0.05, 4) || !free(x, z, 0.5)) continue;
    if ((edge > 0.85 && rnd() < 0.75) || rnd() < 0.06) { const [pts, mat] = PV[Math.floor(rnd() * PV.length)]; popup(pts, null, { materials: mat, x, z, cross: true, scale: 0.85 + rnd() * 0.3, sway: 0.3 }); mark(x, z, 2.6); }
    else if (rnd() < 0.35) { popup(...(rnd() < 0.5 ? rock(between(1.6, 2.6)) : tuft()), { x, z, scale: 0.8 + rnd() * 0.4, sway: 0.4 }); mark(x, z, 1.6); }
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
  const hero = popup(null, null, { node: doll, height: 3.1, x: 2, z: 4.5, sway: 0.1, scale: 1.3 });
  H.setHero(hero, { stride: doll.userData.stride });

  // ---- life: embers over the fire, swallows, butterflies in the grass, smoke, the mammoths grazing -------------------
  const life = createLife({ scene: H.scene, camera: H.camera, heroHeight: H.heroHeight, seed: 41, wind: [0.9, 0.4] });
  life.puffs({ at: [[SITES.foyer.x, 2.6, SITES.foyer.z]], perEmitter: 4, life: 5, rise: 0.5, size: [0.3, 0.55], colors: ['#d8c8c0', '#c8b8b8'] });
  life.motes({ count: 18, colors: ['#ffb060', '#ffd080'], size: [0.05, 0.09], rise: 0.6, glow: 1, height: [0.5, 3] });
  life.flock({ size: 5, height: 4, colors: ['#3a2a3a', '#f0e0d0'] });
  life.flyers({ count: 8, colors: ['#f4ecd8', '#e9c64a', '#d88aa0'], anchors: [[-10, -8], [8, 3], [-6, -20], [18, -12]], roam: 1.6 });
  for (const m of herd) life.critter(m.group, { behaviour: 'graze', roam: 1.0 });
  life.reset(H.target);
  H.onStep((t, dt) => life.update(dt, H.target));
  H.onRestart(() => life.reset(H.target));

  // ---- what the campaign changes in the world -------------------------------------------------------------------------
  // the evacuation: the villagers walk to the gathering point; the shelter unfolds once verified and effective
  const assembly = SITES.rassemblement;
  function sendToAssembly() { let k = 0; for (const p of Object.values(people)) { if (p.h.held) continue; const a = (k++ / 18) * 6.283; p.target = [assembly.x + Math.cos(a) * 1.8, assembly.z + Math.sin(a) * 1.4]; } }
  function sendHome() { for (const p of Object.values(people)) p.target = p.home.slice(); }
  const everyoneAtAssembly = () => Object.values(people).every((p) => p.h.held || Math.hypot(p.x - assembly.x, p.z - assembly.z) < 3);
  let shelterUp = false;
  function sync() {
    const s = campaign.state;
    if (!shelterUp && s.flags['verified:M_V_ABRI'] && s.flags['effective:M_V_ABRI']) { shelterUp = true; shelter.forEach((h, i) => { h.held = false; h.set(1, 0.1 + i * 0.12); }); frame.set(0, 0); }
    if (s.dead.includes('uma') && !people.uma.h.held) { people.uma.h.held = true; people.uma.h.set(0, 0); }
  }
  campaign.on(sync);
  H.onStep((t, dt) => {
    for (const p of Object.values(people)) {
      if (!p.target) continue;
      const dx = p.target[0] - p.x, dz = p.target[1] - p.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { p.target = null; continue; }
      const step = Math.min(d, 5 * dt); p.x += dx / d * step; p.z += dz / d * step;
      p.h.group.position.x = p.x; p.h.group.position.z = p.z;
    }
  });

  return { H, SITES, RIVER, people, hero, sendToAssembly, sendHome, everyoneAtAssembly, sync, near: (site, r = 3.4) => { const s = SITES[site], p = H.hero.group.position; return !!s && Math.hypot(p.x - s.x, p.z - s.z) < r; }, hearth };
}
