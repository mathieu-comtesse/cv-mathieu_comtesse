// La forteresse assiégée : VRE Studio raconté par un château local que des « golems de papier » (rapports inédits) attaquent.
// Tour de guet (lecture, Document AI) → baliste (tri des quatre champs, mini-BERT) → porte à double herse (modèle + règles)
// → ingénieur (Human-in-the-Loop) → forge (entraînement), râtelier des anciens carreaux (versions) → drapeau du gain.
// Tout est une fonction pure de t (boucle de 46 s) ; ?t= fige une image.
import * as THREE from 'three';
import { run, materials, toRGB } from '../core/runtime.js';
import { chamferBoxGeometry } from '../core/geometry.js';
import { P, HEX } from './palette.js';
import { island } from '../core/island.js';
import { B, C, S, T, bar, G, shadow, pool, flame, person, put, walkAlong, seg01, STAND, walkPose, mixPose, smooth, clamp, lerp } from '../core/kit.js';

const LOOP = 46, PI = Math.PI;
const mk = materials(HEX);
const M = {
  stone: [mk(P.stone1), mk(P.stone2), mk(P.stone0), mk(P.stone3)], wall: mk(P.stone2), wallL: mk(P.stone1), wallD: mk(P.stone4), cap: mk(P.stone0), deep: mk(P.stone6),
  wood: mk(P.wood1), woodL: mk(P.wood0), woodD: mk(P.wood3), woodK: mk(P.wood4),
  grass: [mk(P.grass1), mk(P.grass2), mk(P.grass0), mk(P.grass3)], dirt: [mk(P.dirt0), mk(P.dirt1), mk(P.dirt2)], water: mk(P.water1, { rough: 0.25 }), waterL: mk(P.water0, { rough: 0.25 }),
  iron: mk(P.iron1, { rough: 0.55, metal: 0.35 }), ironL: mk(P.iron0, { rough: 0.55, metal: 0.35 }), ironD: mk(P.iron2, { rough: 0.6, metal: 0.3 }), ink: mk(P.ink),
  page: mk(P.page), page2: mk(P.page2), page3: mk(P.page3), teal: mk(P.teal0), tealD: mk(P.teal1), tealK: mk(P.teal2),
  lapis: mk(P.lapis0), lapisD: mk(P.lapis1), rubric: mk(P.rubric0), rubricD: mk(P.rubric1), gold: mk(P.gold0, { rough: 0.45, metal: 0.4 }), goldD: mk(P.gold1),
  fire: mk(P.fire1, { glow: 1.8 }), fireCore: mk(P.fire0, { glow: 2.4 }), ember: mk(P.ember, { glow: 1.2 }), smoke: mk(P.smoke0, { opacity: 0.55 }), smokeD: mk(P.smoke1, { opacity: 0.5 }),
  ok: mk(P.ok, { glow: 1.0 }), bad: mk(P.rubric0, { glow: 1.0 }), off: mk(P.stone4), leaf: [mk(P.leaf0), mk(P.leaf1), mk(P.moss)], bark: mk(P.bark), rope: mk(P.rope), glass: mk(P.glass, { rough: 0.2 }), leather: mk(P.leather),
  flame: mk(P.fire1, { glow: 1.6 }), flameCore: mk(P.fire0, { glow: 2.2 }), brass: mk(P.gold1, { rough: 0.5, metal: 0.4 }), wax: mk(P.page2),
  beam: new THREE.MeshBasicMaterial({ color: new THREE.Color(P.gold0), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
};
const people = {
  cloth: { charcoal: mk(P.iron2), navy: mk(P.lapis1), coral: mk(P.rubric0), rose: mk(P.rubric1), rust: mk(P.wood2), tealDeep: mk(P.teal1) },
  skin: mk(P.skin1), skinTones: [mk(P.skin0), mk(P.skin1), mk(P.skin2), mk(P.skin3)], hair: [mk(P.hair0), mk(P.hair1), mk(P.hair2)],
  leather: mk(P.leather), eye: mk(P.ink), ink: mk(P.ink), mouth: mk(P.rubric1), glass: mk(P.glass), bone: mk(P.page2), paper: mk(P.page), chrome: mk(P.iron0), steelDark: mk(P.iron2), roseDeep: mk(P.rubric1), rust: mk(P.wood2), rustLight: mk(P.wood0),
};

// ---------------------------------------------------------------- plan (x vers la droite de l'écran-bas, z vers le spectateur)
const W = 18, D = 12;
const EW = -1.2;                                   // mur est, face aux assaillants
const GZ = -1.6, SZ = 4.0;                        // axe de la porte ; mur sud (bas, en coupe)                                   // axe de la porte et de la route
const HERSE = [EW + 0.05, EW - 0.95];              // herse « modèle » (extérieure), herse « règles » (intérieure)
const TRAP = EW - 0.45;                            // où le golem est pris
const WATCH = { x: -1.7, z: -5.0, top: 4.2 }, BAL = { x: -1.7, z: 3.3, top: 3.0 };
const KEEP = { x: -6.4, z: -3.3 }, FORGE = { x: -4.7, z: 1.6 }, ANVIL = { x: -4.4, z: 2.7 }, RACK = { x: -7.5, z: 2.4 }, ARCH = { x: -3.6, z: -4.6 };
const HOIST = { x: -2.75, z: 3.3 };
const WINCH = [{ x: -2.75, z: GZ - 1.05 }, { x: -2.75, z: GZ + 1.05 }];

// golems : départ, arrivée au pont, inédit ou connu, moments clés
const WAVES = [
  { id: 0, unk: false, t0: 0.0, walk: 5.2, scan: [2.0, 3.4], shots: [3.6, 3.95, 4.3, 4.65], hit: [1, 1, 1, 1], gate: 6.4, drop: [6.4, 6.4], fold: 7.2 },
  { id: 1, unk: true, t0: 10.0, walk: 5.2, scan: [12.0, 13.4], shots: [13.6, 13.95, 14.3, 14.65], hit: [0, 0, 0, 0], gate: 16.4, drop: [16.4, 24.8], fold: 25.2, hand: [20.8, 21.7, 22.6, 23.5] },
  { id: 2, unk: true, t0: 38.6, walk: 4.6, scan: [40.2, 41.0], shots: [41.2, 41.5, 41.8, 42.1], hit: [1, 1, 1, 1], gate: 43.6, drop: [43.6, 43.6], fold: 44.4 },
];

function build(scene) {
  const root = G(scene);
  // ---- dalle : prairie en touffes, route de terre, douves
  // île flottante : prairie bosselée, route de terre qui serpente jusqu'au bord, cour pavée, lit des douves
  const MX0 = EW + 0.15, MX1 = EW + 1.65;
  const inCourt = (x, z) => x < EW + 0.1 && z < SZ + 0.3 && x > -W / 2 - 0.2 && z > -D / 2 - 0.2;
  const roadZ = (x) => GZ + 0.35 * Math.sin(x * 0.6) + (x > 6 ? (x - 6) * 0.35 : 0);
  const inMoat = (x, z) => x > MX0 && x < MX1 && z < SZ + 0.3 && z > -D / 2 - 0.6;
  const hn = (x, z) => 0.35 * Math.sin(x * 0.55 + 0.7) * Math.sin(z * 0.7 + 0.3) + 0.2 * Math.sin(x * 1.3 - z * 0.9);
  island(root, M, {
    cx: 0.2, cz: -0.6, hx: W / 2 + 2.4, hz: D / 2 + 2.6, ne: 2.7, seed: 11, K: 8,
    hAt: (x, z) => { if (inCourt(x, z)) return -0.04; if (inMoat(x, z)) return -0.35; const road = Math.abs(z - roadZ(x)); const d = Math.min(Math.abs(x - MX1), 3) / 3; return Math.max(-0.02, hn(x, z) * clamp(road - 0.6, 0, 1.2) / 1.2 * d); },
    paint: (x, z, n) => {
      if (inCourt(x, z)) { const j = (Math.floor(x * 2) + Math.floor(z * 2 + (Math.floor(x * 2) % 2) * 0.5)) % 7; return (x * 2 % 1 < 0.08 || (z * 2 + 0.3 * Math.floor(x * 2)) % 1 < 0.08) ? P.stone3 : j === 0 ? P.stone2 : n < 0.2 ? P.stone1 : P.stone0; }
      if (inMoat(x, z)) return P.dirt2;
      if (Math.abs(z - roadZ(x)) < 0.7 && x > MX1 - 0.1) return n < 0.5 ? P.dirt0 : n < 0.85 ? P.dirt1 : P.dirt2;
      const blot = Math.sin(x * 1.1 + z * 0.5) + Math.sin(z * 1.6 - x * 0.7);
      if (n < 0.01) return [P.gold0, P.paper, P.rubric0][(n * 1000 | 0) % 3];
      return blot > 1.0 ? (n < 0.5 ? P.grass0 : P.grass1) : blot < -1.1 ? (n < 0.5 ? P.grass2 : P.grass3) : n < 0.6 ? P.grass1 : P.grass2;
    },
    turf: P.grass2, earth: P.wood4, rock: [P.stone4, P.stone3, P.stone5, P.stone4, P.stone5], root: P.wood3,
  });
  // douves : eau, berges de pierre
  const ML = SZ + 0.3 + D / 2, MZ = (SZ + 0.3 - D / 2) / 2;
  const water = B(root, MX1 - MX0 + 0.1, 0.04, ML + 0.4, M.water, (MX0 + MX1) / 2, -0.12, MZ - 0.2, { cast: false });
  B(root, 0.12, 0.16, ML, M.wallD, MX1, 0.08, MZ); B(root, MX1 - MX0 + 0.1, 0.16, 0.12, M.wallD, (MX0 + MX1) / 2, 0.08, SZ + 0.3);
  const ripples = [0, 1, 2, 3].map((k) => { const m = T(root, 0.2, 0.012, M.waterL, (MX0 + MX1) / 2, 0.05, -4.5 + k * 2.4, { rot: [PI / 2, 0, 0], cast: false }); return m; });

  // ---- remparts : mur nord et ouest hauts, mur est avec chemin de ronde, mur sud bas (coupe)
  const crenel = (x0, z0, x1, z1, y, n) => { for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; B(root, Math.abs(x1 - x0) > 0.01 ? Math.abs(x1 - x0) / n * 0.55 : 0.5, 0.36, Math.abs(z1 - z0) > 0.01 ? Math.abs(z1 - z0) / n * 0.55 : 0.5, M.cap, lerp(x0, x1, u), y + 0.18, lerp(z0, z1, u)); } };
  B(root, EW + W / 2, 3.0, 0.6, M.wall, (EW - W / 2) / 2, 1.5, -D / 2 + 0.3); crenel(-W / 2 + 0.3, -D / 2 + 0.3, EW, -D / 2 + 0.3, 3.0, 10);
  B(root, 0.6, 3.0, SZ + D / 2, M.wall, -W / 2 + 0.3, 1.5, (SZ - D / 2) / 2); crenel(-W / 2 + 0.3, -D / 2 + 0.6, -W / 2 + 0.3, SZ, 3.0, 11);
  B(root, EW + W / 2, 0.9, 0.5, M.wall, (EW - W / 2) / 2, 0.45, SZ); crenel(-W / 2 + 0.6, SZ, EW - 0.6, SZ, 0.9, 8);
  for (const [z0, z1] of [[-D / 2, GZ - 0.8], [GZ + 0.8, SZ]]) { B(root, 0.6, 1.1, z1 - z0, M.wall, EW - 0.3, 0.55, (z0 + z1) / 2); crenel(EW - 0.3, z0 + 0.3, EW - 0.3, z1 - 0.3, 1.1, Math.round((z1 - z0) / 0.8)); }
  for (let y = 0.6; y < 3; y += 0.55) { B(root, EW + W / 2 - 0.1, 0.03, 0.02, M.wallD, (EW - W / 2) / 2, y, -D / 2 + 0.61, { cast: false }); }
  // porterie : deux tours carrées, arc, deux herses dans leurs rainures, treuils, pont-levis
  for (const s of [-1, 1]) { const z = GZ + s * 1.25, h = s < 0 ? 3.6 : 1.3; B(root, 1.5, h, 0.9, M.wallL, EW - 0.45, h / 2, z); crenel(EW - 1.15, z, EW + 0.25, z, h, 3); if (s < 0) B(root, 0.1, 0.5, 0.25, M.deep, EW + 0.31, 2.6, z); }
  B(root, 1.5, 0.5, 1.7, M.wallL, EW - 0.45, 3.35, GZ - 0.4); for (const s of [-1, 1]) B(root, 0.22, 0.22, 0.22, M.cap, EW + 0.3, 3.0, GZ + s * 0.5);
  const herses = HERSE.map((hx, i) => {
    const g = G(root, hx, 0, GZ);
    for (let k = 0; k < 6; k++) B(g, 0.07, 2.2, 0.07, i ? M.ironD : M.iron, 0, 1.1, -0.6 + k * 0.24, { ch: 0.01 });
    for (let k = 0; k < 5; k++) B(g, 0.08, 0.07, 1.36, i ? M.ironD : M.iron, 0, 0.2 + k * 0.48, 0, { ch: 0.01 });
    for (let k = 0; k < 6; k++) C(g, 0.0, 0.05, 0.14, M.ironL, 0, -0.04, -0.6 + k * 0.24, { seg: 4, rot: [PI, 0, 0] });
    B(root, 0.12, 2.6, 0.08, M.deep, hx, 1.3, GZ - 0.74); B(root, 0.12, 2.6, 0.08, M.deep, hx, 1.3, GZ + 0.74);
    B(g, 0.1, 0.1, 0.5, i ? M.lapis : M.gold, 0.02, 2.25, 0, { cast: false });                                      // couleur de la herse : or = modèle, bleu = règles
    return g;
  });
  const winches = WINCH.map((w, i) => {
    const g = G(root, w.x, 0, w.z);
    for (const sz of [-0.35, 0.35]) B(g, 0.12, 0.9, 0.12, M.woodD, 0, 0.45, sz);
    const drum = G(g, 0, 0.75, 0); C(drum, 0.18, 0.18, 0.62, M.wood, 0, 0, 0, { rot: [PI / 2, 0, 0] }); for (let k = 0; k < 4; k++) T(drum, 0.185, 0.015, M.rope, 0, 0, -0.2 + k * 0.13, { seg: 12 });
    const crank = G(drum, 0, 0, 0.36); bar(crank, [0, 0, 0], [0, 0.42, 0], 0.03, M.iron); bar(crank, [0, 0.42, 0], [0, 0.42, 0.22], 0.03, M.woodK);
    bar(root, [w.x, 0.95, w.z], [HERSE[i] , 2.45, GZ + (i ? 0.3 : -0.3)], 0.014, M.rope);
    const lamp = S(g, 0.07, M.off, 0, 1.0, 0.0);
    B(g, 0.12, 0.12, 0.12, i ? M.lapis : M.gold, 0.0, 0.94, -0.36, { cast: false });
    shadow(root, w.x, w.z, 1.0, 0.45);
    return { g, drum, lamp };
  });
  const lampGate = S(root, 0.12, M.off, EW + 0.33, 3.3, GZ);
  // pont-levis
  const bridge = G(root, EW + 0.2, 0.07, GZ); B(bridge, 1.55, 0.1, 1.3, M.wood, 0.78, 0, 0); for (let k = 0; k < 6; k++) B(bridge, 0.04, 0.02, 1.3, M.woodD, 0.1 + k * 0.27, 0.06, 0, { cast: false }); for (const s of [-1, 1]) bar(root, [EW + 1.7, 0.08, GZ + s * 0.6], [EW + 0.32, 2.4, GZ + s * 0.6], 0.02, M.ironD);

  // ---- tour de guet : fût rond, mâchicoulis, plate-forme, longue-vue sur pivot, toit conique, faisceau de lecture
  const wt = G(root, WATCH.x, 0, WATCH.z);
  C(wt, 1.0, 1.15, WATCH.top, M.wallL, 0, WATCH.top / 2, 0, { seg: 20 }); for (let y = 0.7; y < WATCH.top; y += 0.6) T(wt, 1.02 + (WATCH.top - y) * 0.03, 0.02, M.wallD, 0, y, 0, { rot: [PI / 2, 0, 0], seg: 22 });
  C(wt, 1.25, 1.05, 0.35, M.cap, 0, WATCH.top + 0.1, 0, { seg: 20 }); for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2; B(wt, 0.35, 0.4, 0.3, M.cap, 1.1 * Math.cos(a), WATCH.top + 0.45, 1.1 * Math.sin(a), { rot: [0, -a, 0] }); }
  for (let k = 0; k < 4; k++) { const a = PI / 4 + k * PI / 2; B(wt, 0.12, 1.6, 0.12, M.woodD, 0.9 * Math.cos(a), WATCH.top + 1.0, 0.9 * Math.sin(a)); }
  C(wt, 0.0, 1.45, 1.1, M.rubricD, 0, WATCH.top + 2.3, 0, { seg: 8 }); bar(wt, [0, WATCH.top + 2.8, 0], [0, WATCH.top + 3.3, 0], 0.025, M.ironD); const pennant = G(wt, 0, WATCH.top + 3.2, 0); B(pennant, 0.5, 0.18, 0.02, M.gold, 0.25, 0, 0, { cast: false });
  for (let k = 0; k < 3; k++) B(wt, 0.12, 0.45, 0.06, M.deep, Math.cos(0.5 + k * 1.2) * 1.06, 1.4 + k * 1.1, Math.sin(0.5 + k * 1.2) * 1.06, { rot: [0, -(0.5 + k * 1.2), 0], cast: false });
  const scope = G(wt, 0.35, WATCH.top + 0.75, 0.2); C(scope, 0.06, 0.08, 0.1, M.ironD, 0, -0.2, 0); const tube = G(scope, 0, 0, 0); C(tube, 0.07, 0.1, 0.9, M.brass, 0, 0, 0.0, { rot: [PI / 2, 0, 0] }); T(tube, 0.1, 0.02, M.gold, 0, 0, 0.45, { seg: 12 }); C(tube, 0.085, 0.085, 0.02, M.glass, 0, 0, 0.46, { rot: [PI / 2, 0, 0] });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true), M.beam); beam.renderOrder = 5; root.add(beam); beam.visible = false;

  // ---- tour de la baliste : fût, plate-forme, baliste à deux bras, arc, carreaux ; palan qui monte les carreaux neufs
  const bt = G(root, BAL.x, 0, BAL.z);
  C(bt, 1.0, 1.1, BAL.top, M.wallL, 0, BAL.top / 2, 0, { seg: 20 }); C(bt, 1.15, 1.05, 0.3, M.cap, 0, BAL.top + 0.05, 0, { seg: 20 }); for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2; if (Math.cos(a) > 0.3 && Math.abs(Math.sin(a)) < 0.6) continue; B(bt, 0.32, 0.36, 0.28, M.cap, 1.02 * Math.cos(a), BAL.top + 0.38, 1.02 * Math.sin(a), { rot: [0, -a, 0] }); }
  for (let y = 0.6; y < BAL.top; y += 0.6) T(bt, 1.04 + (BAL.top - y) * 0.03, 0.02, M.wallD, 0, y, 0, { rot: [PI / 2, 0, 0], seg: 22 });
  const bal = G(bt, 0.15, BAL.top + 0.2, 0);
  C(bal, 0.25, 0.32, 0.3, M.woodD, 0, 0.15, 0, { seg: 10 });
  const balHead = G(bal, 0, 0.42, 0);
  B(balHead, 1.3, 0.12, 0.22, M.wood, 0.25, 0, 0); for (const s of [-1, 1]) { const arm = G(balHead, 0.55, 0.05, s * 0.12); bar(arm, [0, 0, 0], [0.05, 0, s * 0.62], 0.04, M.woodD); B(arm, 0.2, 0.22, 0.14, M.iron, 0, 0, 0); }
  const string = bar(balHead, [0.62, 0.06, -0.72], [0.62, 0.06, 0.72], 0.01, M.rope);
  const loaded = G(balHead, 0.1, 0.12, 0); bar(loaded, [0, 0, 0], [0.75, 0, 0], 0.025, M.woodD); C(loaded, 0.0, 0.05, 0.14, M.ironL, 0.82, 0, 0, { rot: [0, 0, -PI / 2], seg: 4 });
  const magazine = G(bt, -0.55, BAL.top + 0.2, 0.55); B(magazine, 0.5, 0.25, 0.35, M.woodD, 0, 0.12, 0); for (let k = 0; k < 4; k++) bar(magazine, [-0.22, 0.28, -0.12 + k * 0.08], [0.22, 0.28, -0.12 + k * 0.08], 0.018, M.wood);
  const newBolts = G(magazine, 0, 0.32, 0); for (let k = 0; k < 3; k++) bar(newBolts, [-0.22, 0, -0.1 + k * 0.08], [0.22, 0, -0.1 + k * 0.08], 0.02, M.teal); newBolts.visible = false;
  // palan
  bar(root, [HOIST.x + 0.35, BAL.top + 0.6, HOIST.z], [HOIST.x - 0.2, BAL.top + 0.6, HOIST.z], 0.04, M.woodD); C(root, 0.08, 0.08, 0.06, M.ironD, HOIST.x - 0.15, BAL.top + 0.55, HOIST.z, { rot: [PI / 2, 0, 0] });
  const rope = bar(root, [0, 0, 0], [0, 1, 0], 0.012, M.rope); const bucket = G(root, HOIST.x - 0.15, 0.4, HOIST.z); C(bucket, 0.18, 0.14, 0.24, M.wood, 0, 0.12, 0, { seg: 10 }); T(bucket, 0.175, 0.015, M.iron, 0, 0.2, 0, { rot: [PI / 2, 0, 0] });
  const bucketBolt = G(bucket, 0, 0.25, 0); bar(bucketBolt, [0, -0.1, 0], [0, 0.4, 0], 0.02, M.teal); bucketBolt.visible = false;

  // ---- donjon : tour carrée, archères, mâchicoulis, mât et drapeau du gain (de ×1 à ×2,3)
  const kp = G(root, KEEP.x, 0, KEEP.z);
  B(kp, 2.4, 4.6, 2.4, M.wallL, 0, 2.3, 0); B(kp, 2.7, 0.3, 2.7, M.cap, 0, 4.7, 0); for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { B(kp, 0.4, 0.4, 0.3, M.cap, -0.9 + k * 0.6, 5.05, s * 1.2); B(kp, 0.3, 0.4, 0.4, M.cap, s * 1.2, 5.05, -0.9 + k * 0.6); }
  for (const y of [1.5, 3.0]) { B(kp, 0.1, 0.5, 0.06, M.deep, 0.3, y, 1.22, { cast: false }); B(kp, 0.06, 0.5, 0.1, M.deep, 1.22, y, 0.3, { cast: false }); }
  B(kp, 0.9, 1.5, 0.1, M.woodD, -0.3, 0.75, 1.22); for (const y of [0.3, 1.2]) B(kp, 0.95, 0.06, 0.04, M.iron, -0.3, y, 1.28);
  for (let y = 0.6; y < 4.5; y += 0.6) { B(kp, 2.42, 0.03, 0.02, M.wallD, 0, y, 1.21, { cast: false }); B(kp, 0.02, 0.03, 2.42, M.wallD, 1.21, y, 0, { cast: false }); }
  C(kp, 0.04, 0.05, 3.2, M.iron, 0.6, 6.4, 0.6); S(kp, 0.07, M.gold, 0.6, 8.02, 0.6);
  for (let k = 0; k <= 13; k++) B(kp, 0.12, 0.012, 0.012, k === 10 ? M.rubric : M.ink, 0.66, 5.2 + k * 0.2, 0.6, { cast: false });
  const flag = G(kp, 0.64, 5.4, 0.6); const flagCloth = B(flag, 0.04, 0.5, 0.9, M.rubric, 0, 0, 0.45, { ch: 0.01 }); B(flag, 0.045, 0.12, 0.6, M.gold, 0.0, 0.0, 0.35, { cast: false });

  // ---- forge : foyer, hotte, cheminée qui fume, soufflet, enclume, baquet de trempe, râtelier des anciens carreaux
  const fg = G(root, FORGE.x, 0, FORGE.z);
  B(fg, 1.5, 0.8, 1.0, M.wallD, 0, 0.4, 0); B(fg, 1.2, 0.1, 0.7, M.deep, 0, 0.82, 0.05);
  const coals = [0, 1, 2, 3, 4].map((k) => S(fg, 0.1, M.ember, -0.35 + k * 0.18, 0.88, 0.05 + (k % 2) * 0.12, [1, 0.5, 1]));
  const forgeFlame = flame(fg, M, 0, 0.88, 0.05, 3.2);
  B(fg, 1.6, 0.9, 1.1, M.wall, 0, 2.2, -0.15); C(fg, 0.3, 0.38, 1.4, M.wallL, 0, 3.3, -0.3, { seg: 10 }); B(fg, 0.9, 0.1, 0.9, M.cap, 0, 4.05, -0.3);
  for (const sx of [-0.7, 0.7]) B(fg, 0.15, 1.0, 0.15, M.wallD, sx, 1.3, 0.35);
  const bellows = G(fg, 1.1, 0.5, 0.0); B(bellows, 0.6, 0.08, 0.4, M.woodD, 0, 0.2, 0); const bTop = B(bellows, 0.6, 0.08, 0.4, M.woodD, 0, 0.42, 0); B(bellows, 0.55, 0.2, 0.36, M.leather, 0, 0.31, 0);
  const anv = G(root, ANVIL.x, 0, ANVIL.z); B(anv, 0.4, 0.45, 0.4, M.woodD, 0, 0.22, 0); B(anv, 0.28, 0.14, 0.2, M.ironD, 0, 0.5, 0); B(anv, 0.6, 0.12, 0.24, M.ironD, 0.05, 0.62, 0); C(anv, 0.0, 0.1, 0.25, M.ironD, 0.42, 0.62, 0, { rot: [0, 0, -PI / 2], seg: 6 });
  const hotBolt = G(anv, 0.0, 0.7, 0); bar(hotBolt, [-0.25, 0, 0], [0.25, 0, 0], 0.025, M.ember); hotBolt.visible = false;
  const barrel = G(root, ANVIL.x + 1.0, 0, ANVIL.z + 0.2); C(barrel, 0.3, 0.27, 0.6, M.wood, 0, 0.3, 0, { seg: 12 }); for (const y of [0.12, 0.48]) T(barrel, 0.295, 0.02, M.iron, 0, y, 0, { rot: [PI / 2, 0, 0] }); C(barrel, 0.26, 0.26, 0.02, M.water, 0, 0.58, 0, { seg: 12 });
  shadow(root, FORGE.x, FORGE.z, 2.0, 0.5); shadow(root, ANVIL.x, ANVIL.z, 0.9, 0.45);
  const steam = [0, 1, 2, 3].map(() => S(root, 0.12, M.smoke, 0, -2, 0));
  const smoke = [0, 1, 2, 3, 4, 5].map(() => S(root, 0.22, M.smokeD, 0, -2, 0));
  const sparks = [0, 1, 2, 3, 4, 5, 6, 7].map(() => S(root, 0.025, M.fireCore, 0, -2, 0, [1, 1, 1], { cast: false }));
  const rack = G(root, RACK.x, 0, RACK.z); for (const sz of [-0.55, 0.55]) B(rack, 0.1, 1.5, 0.1, M.woodD, 0, 0.75, sz); for (let r = 0; r < 3; r++) B(rack, 0.14, 0.06, 1.2, M.wood, 0.05, 0.4 + r * 0.45, 0);
  for (let k = 0; k < 6; k++) bar(rack, [0.1, 0.45 + (k % 3) * 0.45, -0.45 + (k >> 1) * 0.3], [0.1, 0.85 + (k % 3) * 0.45, -0.4 + (k >> 1) * 0.3], 0.02, [M.woodD, M.lapisD, M.rubricD][k % 3]);
  const oldBolt = G(rack, 0.1, 1.3, 0.45); bar(oldBolt, [0, 0, 0], [0, 0.42, 0.04], 0.022, M.woodD); oldBolt.visible = false;
  const fl2 = flame(root, M, RACK.x + 0.5, 1.7, RACK.z - 0.8, 1.4);
  C(root, 0.04, 0.05, 1.7, M.ironD, RACK.x + 0.5, 0.85, RACK.z - 0.8);

  // ---- archives : piles de pages pliées (golems capturés), une par capture
  const arch = G(root, ARCH.x, 0, ARCH.z); B(arch, 1.6, 0.12, 1.0, M.woodD, 0, 0.06, 0);
  for (let k = 0; k < 5; k++) B(arch, 0.5, 0.06, 0.38, k % 2 ? M.page2 : M.page, -0.45 + (k % 2) * 0.05, 0.15 + k * 0.065, -0.2, { ch: 0.01 });
  const piles = [0, 1, 2].map((k) => { const g = G(arch, 0.15 + k * 0.4, 0.12, 0.15); for (let j = 0; j < 4; j++) B(g, 0.36, 0.06, 0.3, k === 0 ? M.page : M.teal, 0, 0.03 + j * 0.065, 0, { ch: 0.01 }); g.visible = false; return g; });

  // ---- dehors : sapins, rochers, chevaux de frise, poteau indicateur, feu de camp
  const pine = (x, z, s) => { C(root, 0.08 * s, 0.12 * s, 0.6 * s, M.bark, x, 0.3 * s, z); for (let k = 0; k < 3; k++) C(root, 0.0, (0.7 - k * 0.17) * s, 0.8 * s, M.leaf[k % 2], x, (0.8 + k * 0.45) * s, z, { seg: 9 }); shadow(root, x, z, 1.4 * s, 0.4); };
  [[5.2, -5.0, 1.3], [7.6, -4.3, 1.0], [8.2, 1.4, 1.2], [6.0, 4.6, 1.4], [3.0, 4.9, 1.0], [8.4, 5.2, 0.9], [3.6, -5.4, 0.9]].forEach(([x, z, s]) => pine(x, z, s));
  [[4.0, 0.6, 0.35], [6.6, -1.0, 0.25], [2.4, 3.3, 0.3], [7.2, 3.2, 0.4]].forEach(([x, z, r]) => { S(root, r, M.stone[3], x, r * 0.5, z, [1.3, 0.75, 1]); S(root, r * 0.6, M.stone[1], x + r * 0.7, r * 0.3, z + 0.2, [1.2, 0.7, 1]); });
  for (let k = 0; k < 4; k++) { const x = 2.6 + k * 1.1, z = GZ - 1.4; bar(root, [x - 0.4, 0.05, z - 0.25], [x + 0.4, 0.75, z + 0.25], 0.04, M.woodD); bar(root, [x + 0.4, 0.05, z - 0.25], [x - 0.4, 0.75, z + 0.25], 0.04, M.woodD); bar(root, [x, 0.4, z - 0.45], [x, 0.4, z + 0.45], 0.05, M.wood); }
  for (let k = 0; k < 3; k++) { const x = 3.2 + k * 1.3, z = GZ + 1.5; bar(root, [x - 0.4, 0.05, z + 0.25], [x + 0.4, 0.75, z - 0.25], 0.04, M.woodD); bar(root, [x + 0.4, 0.05, z + 0.25], [x - 0.4, 0.75, z - 0.25], 0.04, M.woodD); bar(root, [x, 0.4, z - 0.45], [x, 0.4, z + 0.45], 0.05, M.wood); }
  const sign = G(root, 7.2, 0, GZ + 1.0); B(sign, 0.1, 1.4, 0.1, M.woodD, 0, 0.7, 0); B(sign, 0.9, 0.28, 0.06, M.wood, -0.3, 1.2, 0); C(sign, 0.0, 0.2, 0.2, M.wood, -0.82, 1.2, 0, { rot: [0, 0, PI / 2], seg: 4 });
  for (let k = 0; k < 3; k++) B(sign, 0.5 - k * 0.12, 0.02, 0.07, M.ink, -0.28, 1.27 - k * 0.06, 0.0, { cast: false });
  // projectiles et cadres plantés
  const bolts = [0, 1, 2, 3].map(() => { const g = G(root); bar(g, [-0.42, 0, 0], [0.42, 0, 0], 0.022, M.woodD); C(g, 0.0, 0.045, 0.12, M.ironL, -0.48, 0, 0, { rot: [0, 0, PI / 2], seg: 4 }); for (const s of [-1, 1]) B(g, 0.14, 0.01, 0.07, M.page, 0.36, 0, s * 0.04, { cast: false }); g.visible = false; return g; });
  const stuck = [0, 1, 2, 3].map((k) => { const g = G(root, 2.4 + k * 0.5, 0.1, GZ + (k % 2 ? 0.8 : -0.9), 0.4 * k); bar(g, [0, 0, 0], [0.35, 0.3, 0.05], 0.022, M.woodD); g.visible = false; return g; });

  // ---- golems de papier : un feuillet-corps aux quatre champs, une tête pliée, des bras-rouleaux, des jambes-bandes
  const golems = WAVES.map((w) => {
    const g = G(root); const body = G(g, 0, 0.95, 0);
    const pg = w.unk ? M.teal : M.page, pg2 = w.unk ? M.tealD : M.page2;
    B(body, 0.24, 0.95, 0.75, pg, 0, 0.45, 0, { ch: 0.03 }); B(body, 0.26, 0.12, 0.79, pg2, 0, 0.92, 0, { ch: 0.02 });
    for (let k = 0; k < 4; k++) B(body, 0.25, 0.012, 0.5, M.ink, 0, 0.18 + k * 0.17, 0.0, { cast: false });
    const frames = [[0.75, -0.17], [0.75, 0.17], [0.3, -0.17], [0.3, 0.17]].map(([y, z], k) => { const f = G(body, 0, y, z); for (const s of [-1, 1]) { B(f, 0.27, 0.025, 0.28, M.off, 0, s * 0.11, 0, { cast: false }); B(f, 0.27, 0.22, 0.025, M.off, 0, 0, s * 0.13, { cast: false }); } return f; });
    const head = G(body, 0, 1.18, 0);
    if (w.unk) { S(head, 0.22, pg, 0, 0.0, 0, [1, 0.9, 1]); for (let k = 0; k < 5; k++) B(head, 0.1, 0.02, 0.2, pg2, Math.cos(k) * 0.12, Math.sin(k * 2) * 0.1, Math.sin(k) * 0.12, { rot: [k, k * 2, 0], cast: false }); }
    else { B(head, 0.3, 0.3, 0.3, pg, 0, 0, 0, { rot: [PI / 4, 0, PI / 4], ch: 0.02 }); }
    for (const s of [-1, 1]) S(head, 0.035, M.ink, -0.15, 0.03, s * 0.08);
    const arms = [-1, 1].map((s) => { const a = G(body, 0, 0.85, s * 0.42); C(a, 0.07, 0.07, 0.7, pg2, 0, -0.35, 0, { seg: 8 }); T(a, 0.07, 0.012, M.ink, 0, -0.5, 0, { rot: [PI / 2, 0, 0], seg: 8 }); return a; });
    const legs = [-1, 1].map((s) => { const l = G(g, 0, 0.95, s * 0.17); B(l, 0.16, 0.9, 0.12, pg2, 0, -0.45, 0, { ch: 0.02 }); B(l, 0.28, 0.06, 0.16, pg, -0.06, -0.92, 0); return l; });
    const sh = shadow(root, 0, 0, 1.3, 0.5);
    g.visible = false;
    return { w, g, body, frames, arms, legs, head, sh };
  });

  // ---- distribution
  const helmet = { hat: 'helmet', hatMat: M.ironL };
  const cast = {
    watch: person(scene, people, { top: mk(P.cloth1), bottom: mk(P.cloth0), shoe: M.leather, skin: people.skinTones[1], hairMat: people.hair[1], ...helmet }),
    gun: person(scene, people, { top: mk(P.cloth2), bottom: mk(P.cloth0), shoe: M.leather, skin: people.skinTones[2], hairMat: people.hair[0], topStyle: 'jacket', ...helmet }),
    gA: person(scene, people, { top: mk(P.gold1), bottom: mk(P.iron2), shoe: M.leather, skin: people.skinTones[0], hairMat: people.hair[2], ...helmet }),
    gB: person(scene, people, { top: mk(P.lapis1), bottom: mk(P.iron2), shoe: M.leather, skin: people.skinTones[3], hairMat: people.hair[0], ...helmet }),
    eng: person(scene, people, { top: mk(P.cloth1), bottom: mk(P.cloth0), shoe: M.leather, skin: people.skinTones[2], hairMat: people.hair[1], apron: M.leather, glove: M.leather, hairStyle: 'bun' }),
  };
  const hammer = G(root); bar(hammer, [0, 0, 0], [0, 0.42, 0], 0.02, M.woodD); B(hammer, 0.16, 0.08, 0.08, M.ironD, 0, 0.45, 0);

  // ---------------------------------------------------------------- poses
  const POSE = {
    look: { ...STAND, torso: [0.12, 0, 0], head: [0.15, 0, 0], shoulderR: [-1.5, 0, 0.1], elbowR: [-1.3, 0, 0], shoulderL: [-1.2, 0, -0.2], elbowL: [-1.4, 0, 0] },
    point: { ...STAND, shoulderR: [-1.6, 0, 0.0], elbowR: [-0.1, 0, 0] },
    crank: (ph) => ({ ...STAND, torso: [0.2, 0, 0], shoulderR: [-1.0 + 0.5 * Math.sin(ph), 0, 0.15], elbowR: [-0.6 - 0.4 * Math.cos(ph), 0, 0], shoulderL: [-0.9 + 0.5 * Math.sin(ph + PI), 0, -0.15], elbowL: [-0.6, 0, 0], hipL: [-0.3, 0, 0.02], kneeL: [0.3, 0, 0] }),
    aim: { ...STAND, torso: [0.15, 0, 0], shoulderR: [-1.4, 0, 0.1], elbowR: [-0.3, 0, 0], shoulderL: [-1.3, 0, -0.1], elbowL: [-0.4, 0, 0] },
    strike: (ph) => ({ ...STAND, torso: [0.25 + 0.1 * Math.sin(ph), 0, 0], shoulderR: [-2.2 + 1.3 * Math.max(0, Math.sin(ph)), 0, 0.15], elbowR: [-0.6, 0, 0], shoulderL: [-0.9, 0, -0.2], elbowL: [-0.8, 0, 0], hipL: [-0.3, 0, 0.02], kneeL: [0.25, 0, 0] }),
    carry: { ...STAND, shoulderL: [-0.6, 0, -0.18], shoulderR: [-0.6, 0, 0.18], elbowL: [-1.1, 0, 0], elbowR: [-1.1, 0, 0] },
    lift: { ...STAND, torso: [0.4, 0, 0], shoulderL: [-1.0, 0, -0.1], shoulderR: [-1.0, 0, 0.1], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0], hipL: [-0.5, 0, 0], hipR: [-0.5, 0, 0], kneeL: [0.7, 0, 0], kneeR: [0.7, 0, 0] },
  };
  const walkTo = (a, pts, t, t0, t1, pose = {}, y = 0) => { const u = smooth(seg01(t, t0, t1)), w = walkAlong(pts, u); put(a, w.x, y, w.z, w.yaw, { ...walkPose(w.dist * 4.2), ...pose }, { ground: y }); return w; };
  const face = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

  // position d'un golem à l'instant t
  const golemAt = (gm, t) => {
    const w = gm.w;
    if (t < w.t0 || t > w.fold + 1.4) return null;
    const xs = 11.2, xb = EW + 1.75;
    let x, walking = false;
    if (t < w.t0 + w.walk) { const u = seg01(t, w.t0, w.t0 + w.walk); x = lerp(xs, xb, u); walking = true; }
    else if (t < w.gate) { const u = smooth(seg01(t, w.t0 + w.walk, w.gate)); x = lerp(xb, TRAP, u); walking = true; }
    else x = TRAP;
    const z = x > MX1 ? roadZ(x) : GZ, y = -1.6 * (1 - smooth(seg01(t, w.t0, w.t0 + 0.9)));
    return { x, z, y, walking };
  };
  const fieldWorld = (gm, k) => { const v = new THREE.Vector3(); gm.frames[k].getWorldPosition(v); return v; };

  // ---------------------------------------------------------------- la boucle
  return function update(t) {
    // ambiance : flammes, eau, fumée, fanion
    forgeFlame.flicker(t, 0); fl2.flicker(t, 2);
    coals.forEach((c, k) => { c.material = (Math.sin(t * 3 + k * 1.7) > 0.2) ? M.ember : M.fire; });
    ripples.forEach((r, k) => { const u = (t * 0.25 + k * 0.25) % 1; r.scale.set(0.4 + u * 1.6, 0.4 + u * 1.6, 1); r.visible = u < 0.9; });
    smoke.forEach((s, k) => { const u = (t * 0.18 + k / 6) % 1; s.position.set(FORGE.x + 0.3 * Math.sin(u * 5 + k), 4.1 + u * 2.6, FORGE.z - 0.3 + u * 1.2); s.scale.setScalar(0.6 + u * 1.8); s.visible = u < 0.95; });
    pennant.rotation.y = 0.4 * Math.sin(t * 1.3); flagCloth.rotation.y = 0.15 * Math.sin(t * 2.1);
    const blow = 0.5 + 0.5 * Math.sin(t * 2.4); bTop.position.y = 0.36 + 0.06 * blow;
    water.position.y = -0.12 + 0.005 * Math.sin(t * 1.5);

    // drapeau du gain : ×1 en bas, ×2,3 en haut ; il redescend dans la couture de la boucle
    const gain = t < 1.6 ? lerp(2.3, 1, smooth(seg01(t, 0.2, 1.6))) : 1 + 1.3 * smooth(seg01(t, 44.6, 45.8));
    flag.position.y = 5.4 + (gain - 1) / 1.3 * 2.0;

    // ---- golems
    let alarm = false, scanTarget = null;
    golems.forEach((gm) => {
      const w = gm.w, p = golemAt(gm, t);
      gm.g.visible = !!p; gm.sh.visible = !!p;
      if (!p) return;
      gm.g.position.set(p.x, p.y, p.z); gm.g.rotation.y = Math.atan2(-(roadZ(p.x + 0.3) - roadZ(p.x - 0.3)), 0.6) * (p.x > MX1 ? 1 : 0);
      gm.sh.position.set(p.x, 0.02, p.z);
      const ph = (9.8 - p.x) * 3.2;
      gm.legs.forEach((l, i) => { l.rotation.z = p.walking ? 0.45 * Math.sin(ph + i * PI) : 0; });
      gm.arms.forEach((a, i) => { a.rotation.z = p.walking ? 0.4 * Math.sin(ph + i * PI + PI) : 0.15; });
      gm.body.rotation.z = p.walking ? 0.05 * Math.sin(ph * 2) : 0; gm.body.position.y = 0.95 + (p.walking ? 0.03 * Math.abs(Math.sin(ph)) : 0);
      // champs : lus (blanc), épinglés (couleur), manqués, posés à la main
      const cols = [M.rubric, M.lapis, M.gold, M.teal];
      gm.frames.forEach((f, k) => {
        const read = t > w.scan[0] + 0.25 * k;
        const pinned = (w.hit[k] && t > w.shots[k] + 0.35) || (w.hand && t > w.hand[k] + 0.2);
        const mat = pinned ? cols[k] : read ? (w.unk && t < w.scan[1] + 0.3 ? (Math.sin(t * 16 + k) > 0 ? M.page2 : M.off) : M.page2) : M.off;
        f.children.forEach((m) => { m.material = mat; });
      });
      // recul quand un carreau frappe ; épaules qui tombent quand un carreau manque
      let rec = 0; w.shots.forEach((s, k) => { const d = t - s - 0.35; if (d > 0 && d < 0.35) rec = Math.max(rec, (w.hit[k] ? 1 : 0.3) * Math.sin(d / 0.35 * PI)); });
      gm.body.rotation.z += -0.18 * rec;
      if (w.hand) w.hand.forEach((h) => { const d = t - h; if (d > 0 && d < 0.3) gm.body.rotation.z += 0.12 * Math.sin(d / 0.3 * PI); });
      // repli : le golem capturé se plie en pile de pages
      const fu = smooth(seg01(t, w.fold, w.fold + 1.0));
      gm.g.scale.set(1 - 0.3 * fu, 1 - 0.92 * fu, 1 - 0.3 * fu);
      if (t > w.scan[0] - 0.4 && t < w.scan[1]) scanTarget = gm;
      if (w.unk && !w.hit[0] && t > w.gate && t < w.drop[1]) alarm = true;
    });
    piles.forEach((pl, k) => { pl.visible = t > WAVES[k].fold + 1.2; });

    // ---- tour de guet : la longue-vue suit le golem, le faisceau balaie ses champs
    const watcher = cast.watch, wpos = { x: WATCH.x - 0.15, z: WATCH.z + 0.6 };
    if (scanTarget) {
      const gp = golemAt(scanTarget, t), dx = gp.x - WATCH.x, dz = gp.z - WATCH.z;
      scope.rotation.y = Math.atan2(dx, dz); tube.rotation.x = Math.atan2(WATCH.top + 0.75 - 1.5, Math.hypot(dx, dz));
      const from = new THREE.Vector3(WATCH.x + 0.35, WATCH.top + 0.75, WATCH.z + 0.2), to = new THREE.Vector3(gp.x, 1.5, gp.z), len = from.distanceTo(to);
      beam.visible = true; beam.position.copy(from).lerp(to, 0.5); beam.scale.set(0.55, len, 0.55); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
      beam.material.opacity = 0.2 * Math.sin(seg01(t, scanTarget.w.scan[0] - 0.4, scanTarget.w.scan[1]) * PI);
      put(watcher, wpos.x, WATCH.top + 0.2, wpos.z, Math.atan2(dx, dz), POSE.look, { ground: WATCH.top + 0.2 });
    } else { beam.visible = false; scope.rotation.y = 0.8 + 0.3 * Math.sin(t * 0.3); tube.rotation.x = 0.1; put(watcher, wpos.x, WATCH.top + 0.2, wpos.z, 0.8 + 0.3 * Math.sin(t * 0.3), { ...STAND, head: [0.05, 0.3 * Math.sin(t * 0.5), 0] }, { ground: WATCH.top + 0.2 }); }

    // ---- baliste : vise, tire, recharge à la manivelle ; carreaux neufs sarcelle après la forge
    const gun = cast.gun;
    let aimGolem = null; golems.forEach((gm) => { if (t > gm.w.shots[0] - 1.0 && t < gm.w.shots[3] + 0.6) aimGolem = gm; });
    let yaw = 0.4, recoil = 0, reload = 0;
    if (aimGolem) { const gp = golemAt(aimGolem, t + 0.35); yaw = Math.atan2(-(gp.z - BAL.z), gp.x - BAL.x); aimGolem.w.shots.forEach((s) => { const d = t - s; if (d > 0 && d < 0.3) recoil = Math.max(recoil, 1 - d / 0.3); if (d > 0.05 && d < 0.35) reload = Math.max(reload, Math.sin((d - 0.05) / 0.3 * PI)); }); }
    else yaw = 0.4 + 0.15 * Math.sin(t * 0.4);
    balHead.rotation.y = yaw; balHead.position.x = -0.08 * recoil; loaded.visible = recoil < 0.2;
    const gunAt = { x: BAL.x - 0.55 * Math.cos(yaw), z: BAL.z + 0.55 * Math.sin(yaw) };
    put(gun, gunAt.x, BAL.top + 0.2, gunAt.z, Math.atan2(BAL.x - gunAt.x, BAL.z - gunAt.z), aimGolem ? (reload > 0 ? POSE.crank(t * 18) : POSE.aim) : { ...STAND, head: [0, 0.3 * Math.sin(t * 0.7), 0] }, { ground: BAL.top + 0.2 });
    // carreaux en vol : de la baliste au champ (touché) ou au-delà, plantés dans le sol (manqué)
    bolts.forEach((b) => (b.visible = false)); stuck.forEach((s, k) => { s.visible = t > WAVES[1].shots[k] + 0.4 && t < 32; });
    golems.forEach((gm) => gm.w.shots.forEach((s, k) => {
      const u = seg01(t, s, s + 0.35); if (u <= 0 || u >= 1) return;
      const from = new THREE.Vector3(BAL.x + 0.6, BAL.top + 0.65, BAL.z), gp = golemAt(gm, s + 0.35), target = gm.w.hit[k] ? new THREE.Vector3(gp.x + 0.2, 0.95 + [0.75, 0.75, 0.3, 0.3][k] + 0.95 * 0, gp.z + [-0.17, 0.17, -0.17, 0.17][k]) : stuck[k].position.clone().add(new THREE.Vector3(0, 0.1, 0));
      const pos = from.clone().lerp(target, u); pos.y += Math.sin(u * PI) * 0.6;
      const b = bolts[k]; b.visible = true; b.position.copy(pos); const dir = target.clone().sub(from); b.rotation.set(0, Math.atan2(dir.z, -dir.x), -0.3 + 0.6 * u);
    }));
    newBolts.visible = t > 39.4;

    // ---- porte : herses (or = modèle, bleu = règles), treuils, voyants, alarme
    const herseY = WAVES.map((w) => [0, 1].map((i) => { const a = w.drop[i]; return t > a && t < w.fold + 1.6 ? smooth(seg01(t, a, a + 0.5)) * (1 - smooth(seg01(t, w.fold + 1.0, w.fold + 1.6))) : 0; }));
    herses.forEach((h, i) => { const d = Math.max(...herseY.map((v) => v[i])); h.position.y = 2.2 * (1 - d) - 0.0; winches[i].drum.rotation.z = -d * 6; winches[i].lamp.material = d > 0.95 ? M.ok : M.off; });
    lampGate.material = alarm ? (Math.sin(t * 12) > 0 ? M.bad : M.off) : (herseY.some((v) => v[0] > 0.95 && v[1] > 0.95) ? M.ok : M.off);
    [cast.gA, cast.gB].forEach((g, i) => { const w = WINCH[i], pull = WAVES.some((wv) => t > wv.drop[i] - 0.4 && t < wv.drop[i] + 0.6); put(g, w.x - 0.55, 0, w.z, PI / 2, pull ? POSE.crank(t * 10) : alarm && i === 1 ? { ...POSE.point, head: [0, -0.4, 0] } : { ...STAND, head: [0, 0.3 * Math.sin(t * 0.6 + i), 0] }); });

    // ---- ingénieur : forge au repos ; accourt à la porte, épingle les champs à la main, rapporte le gabarit, forge, envoie les carreaux neufs
    const eng = cast.eng, home = { x: ANVIL.x - 0.6, z: ANVIL.z }, gate = { x: TRAP - 0.55, z: GZ + 0.62 };
    const R1 = [[home.x, home.z], [-3.3, 0.3], [gate.x, gate.z]];
    hammer.visible = true;
    let hand = null;
    if (t >= 18.6 && t < 20.6) { walkTo(eng, R1, t, 18.6, 20.6); }
    else if (t >= 20.6 && t < 24.4) { put(eng, gate.x, 0, gate.z, PI / 2 - 0.4, POSE.strike((t - 20.6) / 0.9 * PI * 2)); hand = true; }
    else if (t >= 24.4 && t < 25.4) put(eng, gate.x, 0, gate.z, PI / 2 - 0.4, { ...STAND, head: [0, 0.4, 0] });
    else if (t >= 25.4 && t < 28.0) walkTo(eng, [...R1].reverse(), t, 25.4, 28.0, POSE.carry);
    else if (t >= 28.0 && t < 33.6) { put(eng, home.x, 0, home.z, PI / 2, POSE.strike((t - 28.0) / 0.55 * PI * 2)); }
    else if (t >= 33.6 && t < 34.6) put(eng, ANVIL.x + 0.5, 0, ANVIL.z - 0.4, PI / 2 + 0.6, POSE.lift);
    else if (t >= 34.6 && t < 36.0) walkTo(eng, [[ANVIL.x + 0.5, ANVIL.z - 0.4], [RACK.x + 0.7, RACK.z + 0.3]], t, 34.6, 36.0, POSE.carry);
    else if (t >= 36.0 && t < 36.6) put(eng, RACK.x + 0.7, 0, RACK.z + 0.3, -PI / 2, { ...STAND, shoulderR: [-1.9, 0, 0.1], elbowR: [-0.2, 0, 0] });
    else if (t >= 36.6 && t < 38.0) walkTo(eng, [[RACK.x + 0.7, RACK.z + 0.3], [HOIST.x - 0.7, HOIST.z]], t, 36.6, 38.0, POSE.carry);
    else if (t >= 38.0 && t < 39.2) put(eng, HOIST.x - 0.7, 0, HOIST.z, PI / 2, POSE.crank(t * 9));
    else if (t >= 39.2 && t < 41.2) walkTo(eng, [[HOIST.x - 0.7, HOIST.z], [home.x, home.z]], t, 39.2, 41.2);
    else put(eng, home.x, 0, home.z, PI / 2, { ...STAND, head: [0.2, 0.4 * Math.sin(t * 0.4), 0], shoulderR: [-0.4, 0, 0.1] });
    // le marteau suit la main droite
    { const v = new THREE.Vector3(), q = new THREE.Quaternion(); eng.joints.wristR.getWorldPosition(v); eng.joints.wristR.getWorldQuaternion(q); hammer.position.copy(v); hammer.quaternion.copy(q); hammer.rotateX(PI); }
    // forge : métal chauffé, étincelles à chaque coup, trempe et vapeur
    hotBolt.visible = t > 28.0 && t < 33.6;
    sparks.forEach((s, k) => { const ph = (t - 28.0) / 0.55, d = ph % 1; if (t > 28.0 && t < 33.6 && d < 0.35) { const a = k * 0.8 + Math.floor(ph) * 1.3; s.position.set(ANVIL.x + Math.cos(a) * d * 1.4, 0.72 + Math.sin(d * PI) * 0.5 * (0.5 + (k % 3) * 0.3), ANVIL.z + Math.sin(a) * d * 1.4); } else s.position.y = -2; });
    steam.forEach((s, k) => { const u = seg01(t, 33.6 + k * 0.15, 35.0 + k * 0.15); if (u > 0 && u < 1) { s.position.set(ANVIL.x + 1.0 + 0.1 * Math.sin(k * 2), 0.65 + u * 1.4, ANVIL.z + 0.2); s.scale.setScalar(0.6 + u * 1.6); } else s.position.y = -2; });
    oldBolt.visible = t > 36.2 && t < 46;
    // palan : le seau monte les carreaux neufs
    const hu = smooth(seg01(t, 38.0, 39.2)); bucket.position.y = 0.4 + hu * (BAL.top + 0.05 - 0.4); bucketBolt.visible = t > 37.6 && t < 39.4;
    rope.position.set(HOIST.x - 0.15, (bucket.position.y + 0.5 + BAL.top + 0.55) / 2, HOIST.z); rope.scale.y = BAL.top + 0.55 - bucket.position.y - 0.5;
  };
}

run({
  light(L) { L.sun.position.set(13, 20, 9); },
  palette: toRGB(HEX), slab: [W, D], loop: LOOP, stillT: 22,
  px: 2, fit: [[-W / 2 - 2.2, 0, -0.6], [W / 2 + 2.6, 0, -0.6], [0.2, 0, -D / 2 - 3.2], [0.2, 0, D / 2 + 2.0], [0.2, -11.5, -0.6], [-1.7, 6.6, -5.0], [-6.4, 7.6, -3.3]].map((p) => new THREE.Vector3(...p)),
  build,
});
