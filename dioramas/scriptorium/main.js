// Le scriptorium clos : VRE Studio raconté par un monastère sans porte vers l'extérieur.
// Lutrin (lecture, Document AI) → casiers du rubricateur (tri, mini-BERT) → pupitre à deux clés (modèle + règles)
// → correcteur (Human-in-the-Loop) → bibliothèque (corpus) → presse (entraînement, versions) → cadran du gain.
// Tout est une fonction pure de t (boucle de 46 s) ; ?t= fige une image.
import * as THREE from 'three';
import { run, materials, toRGB } from '../core/runtime.js';
import { P, HEX } from './palette.js';
import { chamferBoxGeometry } from '../core/geometry.js';
import { island } from '../core/island.js';
import { B, C, S, T, bar, G, shadow, pool, candle, book, openBook, monk, put, walkAlong, seg01, STAND, walkPose, mixPose, smooth, clamp, lerp } from '../core/kit.js';

const LOOP = 46, PI = Math.PI;
const mk = materials(HEX);
const M = {
  stone: [mk(P.stone1), mk(P.stone2), mk(P.stone0), mk(P.stone3)], wall: mk(P.stone1), wallDark: mk(P.stone3), sill: mk(P.stone0), joint: mk(P.stone4), deep: mk(P.stone6),
  wood: mk(P.wood1), woodL: mk(P.wood0), woodD: mk(P.wood3), woodX: mk(P.wood4), woodK: mk(P.wood5),
  page: mk(P.page), vellum: mk(P.vellum2), inkLine: mk(P.inkLine), ink: mk(P.ink), soot: mk(P.soot),
  brass: mk(P.brass, { rough: 0.5, metal: 0.4 }), gold: mk(P.gold0, { rough: 0.45, metal: 0.4 }), iron: mk(P.iron1, { rough: 0.6, metal: 0.3 }), ironL: mk(P.iron0, { rough: 0.6, metal: 0.3 }),
  wax: mk(P.vellum), flame: mk(P.flame1, { glow: 1.6 }), flameCore: mk(P.flame0, { glow: 2.2 }), leather: mk(P.wood4), rope: mk(P.rope),
  tile: mk(P.tile0), tileD: mk(P.tile1), tileL: mk(P.tile2), glassR: mk(P.rubric0, { glow: 0.35 }), glassB: mk(P.lapis0, { glow: 0.35 }), glassG: mk(P.gold0, { glow: 0.35 }),
  rubric: mk(P.rubric0), rubricD: mk(P.rubric1), lapis: mk(P.lapis0), lapisD: mk(P.lapis1), teal: mk(P.teal0), tealD: mk(P.teal1),
  ok: mk(P.ok, { glow: 0.9 }), bad: mk(P.rubric0, { glow: 0.9 }), off: mk(P.stone4), leaf: [mk(P.leaf0), mk(P.leaf1), mk(P.leaf2)], soil: mk(P.soil), water: mk(P.water, { rough: 0.2 }), glass: mk(P.glass, { rough: 0.2 }),
};
const people = {
  cloth: { charcoal: mk(P.robeBlack0), navy: mk(P.lapis1), coral: mk(P.rubric0), rose: mk(P.rubric1), rust: mk(P.wood2), tealDeep: mk(P.teal1) },
  skin: mk(P.skin1), skinTones: [mk(P.skin0), mk(P.skin1), mk(P.skin2), mk(P.skin3)], hair: [mk(P.hair0), mk(P.hair1), mk(P.hair2)],
  leather: mk(P.wood4), eye: mk(P.ink), ink: mk(P.ink), mouth: mk(P.rubric1), glass: mk(P.glass), bone: mk(P.vellum), paper: mk(P.page), chrome: mk(P.iron0), steelDark: mk(P.iron1), roseDeep: mk(P.rubric1), rust: mk(P.wood2), rustLight: mk(P.wood0),
};

// ---------------------------------------------------------------- plan
const W = 16, D = 11, XW = -W / 2 + 0.25, ZW = -D / 2 + 0.25;
const DOOR = { x: -4.6, z: ZW };
const LECT = { x: -5.0, z: -2.5 }, READ = { x: -5.0, z: -1.75 };
const RUB = { x: -1.3, z: -3.75 }, RUBSEAT = { x: -1.3, z: -2.97 };
const PA = { x: -0.25, z: -4.0 }, PB = { x: 1.55, z: -3.45 };
const KEY = { x: 2.6, z: -3.25 }, PRIOR = { x: 2.15, z: -2.45 }, LIBR = { x: 3.1, z: -2.45 };
const SHELF = { x: 4.4, z: -4.85 };
const PRESS = { x: 4.6, z: 1.4 }, RACK = { x: 6.4, z: 1.4 };
const CORR = { x: -1.7, z: 0.9 }, CORRSEAT = { x: -0.95, z: 0.9 };

function build(scene) {
  const root = G(scene);
  // ---- dalle : dallage de pierre, joints, usure devant les postes
  // île flottante : prairie, sentier vers la porte, massifs ; le monastère est posé dessus
  const inB = (x, z, m = 0) => Math.abs(x) < W / 2 + m && Math.abs(z) < D / 2 + m;
  const hn = (x, z) => 0.22 * Math.sin(x * 0.7 + 1.3) * Math.sin(z * 0.9) + 0.15 * Math.sin(x * 1.7 - z * 1.1);
  const isl = island(root, M, {
    cx: 0.4, cz: 0.2, hx: W / 2 + 4.2, hz: D / 2 + 4.1, ne: 3.2, seed: 5, K: 8,
    hAt: (x, z) => { if (inB(x, z, 0.15)) return -0.08; const d = Math.min(Math.abs(Math.abs(x) - W / 2), Math.abs(Math.abs(z) - D / 2)); return Math.max(0, hn(x, z) * clamp(d / 1.2, 0, 1)) + 0.02; },
    paint: (x, z, n) => {
      const path = Math.abs(x - DOOR.x - 0.3 * Math.sin(z * 1.4)) < 0.55 && z < ZW;
      if (path) return n < 0.5 ? P.stone2 : n < 0.85 ? P.stone3 : P.stone1;
      const blot = Math.sin(x * 1.3 + z * 0.4) + Math.sin(z * 1.9 - x * 0.6);
      if (n < 0.012) return [P.rubric0, P.gold0, P.paper][(n * 1000 | 0) % 3];
      return blot > 1.0 ? (n < 0.5 ? P.leaf0 : P.leaf1) : blot < -1.2 ? (n < 0.5 ? P.leaf1 : P.leaf2) : n < 0.7 ? P.leaf1 : P.leaf0;
    },
    turf: P.leaf1, earth: P.wood4, rock: [P.stone5, P.stone4, P.stone6, P.stone5, P.stone6], root: P.wood3,
  });
  // soubassement du monastère : une assise de pierre sous le dallage
  B(root, W + 0.3, 0.3, D + 0.3, M.wallDark, 0, -0.17, 0, { ch: 0.04 });
  {
    const tiles = [[], [], [], []], geo = chamferBoxGeometry(1, 0.06, 1, { top: 0.02 }), m4 = new THREE.Matrix4();
    for (let j = 0; j < D / 0.62; j++) { const z = -D / 2 + 0.31 + j * 0.62, off = (j % 2) * 0.35; let x = -W / 2 + 0.02 - off;
      for (let n = 0; x < W / 2; n++) { const h = Math.abs(Math.sin(n * 12.9898 + j * 78.233) * 43758.5453) % 1, w = 0.62 + 0.42 * ((h * 7) % 1); const x0 = Math.max(x, -W / 2 + 0.02), x1 = Math.min(x + w - 0.04, W / 2 - 0.02); if (x1 > x0) tiles[h < 0.7 ? 0 : h < 0.92 ? 1 : h < 0.985 ? 2 : 3].push([(x0 + x1) / 2, z, x1 - x0]); x += w; } }
    tiles.forEach((list, k) => { const im = new THREE.InstancedMesh(geo, [M.stone[0], M.stone[2], M.stone[1], M.stone[3]][k], list.length); list.forEach(([x, z, w], i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, -0.02, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, 0.58)))); im.receiveShadow = true; im.castShadow = false; root.add(im); });
  }
  // ---- murs du fond : nord (z) avec porte et passe-plat, ouest (x) avec deux fenêtres
  const wallH = 3.6;
  const zw = (x0, x1, y0, y1) => B(root, x1 - x0, y1 - y0, 0.5, M.wall, (x0 + x1) / 2, (y0 + y1) / 2, ZW, { ch: 0.03 });
  zw(-W / 2, DOOR.x - 0.8, 0, wallH); zw(DOOR.x + 0.8, KEY.x - 0.5, 0, wallH); zw(KEY.x + 0.5, W / 2, 0, wallH); zw(DOOR.x - 0.8, DOOR.x + 0.8, 2.5, wallH); zw(KEY.x - 0.5, KEY.x + 0.5, 0, 0.62); zw(KEY.x - 0.5, KEY.x + 0.5, 1.28, wallH);
  for (let k = 0; k < 5; k++) B(root, 1.6 - k * 0.3, 0.12, 0.56, M.sill, DOOR.x, 2.3 + k * 0.1, ZW, { ch: 0.02 });       // linteau en escalier
  B(root, 1.0, 0.05, 0.52, M.deep, KEY.x, 0.65, ZW); B(root, 1.0, 0.04, 0.6, M.sill, KEY.x, 0.62, ZW + 0.13);                   // passe-plat
  const xw = (z0, z1, y0, y1) => B(root, 0.5, y1 - y0, z1 - z0, M.wall, XW, (y0 + y1) / 2, (z0 + z1) / 2, { ch: 0.03 });
  const WIN = [-3.0, 2.6]; xw(-D / 2, WIN[0] - 0.7, 0, wallH); xw(WIN[0] + 0.7, WIN[1] - 0.7, 0, wallH); xw(WIN[1] + 0.7, D / 2, 0, wallH); for (const zc of WIN) { xw(zc - 0.7, zc + 0.7, 0, 1.1); xw(zc - 0.7, zc + 0.7, 2.9, wallH); B(root, 0.62, 0.08, 1.5, M.sill, XW + 0.05, 1.12, zc); for (let k = 0; k < 4; k++) B(root, 0.56, 0.1, 1.2 - k * 0.3, M.sill, XW, 2.5 + k * 0.1, zc, { ch: 0.02 }); B(root, 0.06, 1.35, 0.06, M.iron, XW + 0.15, 1.8, zc); B(root, 0.06, 0.06, 1.3, M.iron, XW + 0.15, 1.9, zc); }
  // corniche, contreforts, assises
  B(root, W, 0.16, 0.66, M.sill, 0, wallH + 0.08, ZW); B(root, 0.66, 0.16, D, M.sill, XW, wallH + 0.08, 0);
  for (const y of [0.9, 1.8, 2.7]) { B(root, W - 0.1, 0.03, 0.02, M.joint, 0, y, ZW + 0.26, { cast: false }); B(root, 0.02, 0.03, D - 0.1, M.joint, XW + 0.26, y, 0, { cast: false }); }
  for (const x of [-6.6, 0.4, 7.5]) B(root, 0.4, 3.3, 0.3, M.wallDark, x, 1.65, ZW + 0.4);
  // lumière des fenêtres au sol
  for (const zc of WIN) pool(root, '255,236,190', 3.0, 1.7, XW + 1.9, 0, zc, 0.42);
  // porte : vantail ouvert vers l'intérieur, pentures
  const leaf = G(root, DOOR.x - 0.78, 0, ZW + 0.2, -1.15);
  B(leaf, 1.5, 2.3, 0.08, M.woodD, 0.75, 1.15, 0); for (const y of [0.5, 1.8]) B(leaf, 1.2, 0.08, 0.04, M.iron, 0.65, y, 0.06);
  for (let k = 0; k < 5; k++) B(leaf, 0.02, 2.2, 0.01, M.woodK, 0.25 + k * 0.25, 1.15, 0.045, { cast: false });
  B(root, 1.6, 0.05, 0.8, M.sill, DOOR.x, 0.025, ZW + 0.1);                                                                     // seuil usé

  // ---- le monastère : église derrière le mur nord (toit de tuiles, pignon, rosace), aile des moines derrière le mur ouest,
  //      clocher à l'angle (baies, cloche, toit en pyramide, croix), vitraux, cloître à arcades devant le jardin
  const roofSlope = (x0, x1, zEave, zRidge, yEave, yRidge, alongX) => {
    const g = G(root), dz = zRidge - zEave, dy = yRidge - yEave, L = Math.hypot(dz, dy), a = Math.atan2(dy, dz), len = Math.abs(x1 - x0), mid = (x0 + x1) / 2;
    const slab = G(g, 0, 0, 0); if (alongX) { slab.position.set(mid, (yEave + yRidge) / 2, (zEave + zRidge) / 2); slab.rotation.x = -a; } else { slab.position.set((zEave + zRidge) / 2, (yEave + yRidge) / 2, mid); slab.rotation.z = a; }
    const sx = alongX ? len : L, sz = alongX ? L : len;
    B(slab, sx, 0.16, sz, M.tileD, 0, 0, 0, { ch: 0.02 });
    const n = Math.round(len / 0.32);
    for (let k = 0; k < n; k++) { const u = -len / 2 + (k + 0.5) * len / n; const c = C(slab, 0.11, 0.11, L, k % 3 ? M.tile : M.tileL, alongX ? u : 0, 0.1, alongX ? 0 : u, { seg: 6, rot: alongX ? [PI / 2, 0, 0] : [0, 0, PI / 2], cast: false }); c.scale.x = 1; }
    for (let k = 1; k < 5; k++) B(slab, alongX ? len : 0.04, 0.05, alongX ? 0.04 : len, M.tileD, alongX ? 0 : -L / 2 + k * L / 5, 0.2, alongX ? -L / 2 + k * L / 5 : 0, { cast: false });
    return g;
  };
  const NAVE = { zr: ZW - 2.3, yr: wallH + 2.0 }, WING = { xr: XW - 2.3, yr: wallH + 1.6 };
  roofSlope(-W / 2 - 0.3, W / 2 + 0.3, ZW + 0.3, NAVE.zr, wallH - 0.05, NAVE.yr, true);
  roofSlope(-W / 2 - 0.3, W / 2 + 0.3, NAVE.zr - 1.0, NAVE.zr, NAVE.yr - 0.9, NAVE.yr, true);
  C(root, 0.12, 0.12, W + 0.6, M.tileD, 0, NAVE.yr + 0.08, NAVE.zr, { rot: [0, 0, PI / 2], seg: 8 });
  roofSlope(-D / 2 + 0.2, D / 2 + 0.3, XW + 0.3, WING.xr, wallH - 0.05, WING.yr, false);
  C(root, 0.12, 0.12, D, M.tileD, WING.xr, WING.yr + 0.08, 0.2, { rot: [PI / 2, 0, 0], seg: 8 });
  // pignon est de l'église : triangle de pierre, rosace, croix
  { const tri = new THREE.Shape([new THREE.Vector2(ZW + 0.3, 0), new THREE.Vector2(NAVE.zr - 1.0, 0), new THREE.Vector2(NAVE.zr, NAVE.yr - wallH + 0.1)].map((v) => new THREE.Vector2(-v.x, v.y)));
    const geo = new THREE.ExtrudeGeometry(tri, { depth: 0.4, bevelEnabled: false }); geo.rotateY(PI / 2); const m = new THREE.Mesh(geo, M.wall); m.position.set(W / 2 - 0.1, wallH, 0); m.castShadow = true; root.add(m);
    B(root, 0.45, wallH, 2.6, M.wall, W / 2 + 0.1, wallH / 2, ZW - 1.0);
    const rose = G(root, W / 2 + 0.33, wallH + 0.75, NAVE.zr + 0.6); T(rose, 0.42, 0.07, M.sill, 0, 0, 0, { rot: [0, PI / 2, 0], seg: 18 }); C(rose, 0.38, 0.38, 0.05, M.glassB, 0, 0, 0, { rot: [0, 0, PI / 2], seg: 16 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; B(rose, 0.06, 0.06, 0.06, [M.glassR, M.glassG][k % 2], 0.03, 0.22 * Math.cos(a), 0.22 * Math.sin(a), { cast: false }); bar(rose, [0.03, 0, 0], [0.03, 0.38 * Math.cos(a), 0.38 * Math.sin(a)], 0.018, M.sill); }
    const cr = G(root, W / 2 + 0.1, NAVE.yr + 0.15, NAVE.zr); B(cr, 0.12, 0.9, 0.12, M.sill, 0, 0.45, 0); B(cr, 0.12, 0.12, 0.55, M.sill, 0, 0.62, 0); }
  // contreforts du mur de l'église, côté extérieur visible au pignon
  for (const x of [-4.2, 0.6, 5.0]) B(root, 0.5, 2.6, 0.7, M.wallDark, x, 1.3, ZW - 0.55);
  // clocher : fût carré à chaînages, baies géminées, cloche, abat-sons, toit en pyramide, croix
  const CT = { x: XW - 1.4, z: ZW - 1.4, h: 7.6 };
  { const t = G(root, CT.x, 0, CT.z);
    B(t, 2.3, CT.h, 2.3, M.wall, 0, CT.h / 2, 0, { ch: 0.04 }); for (let y = 1; y < CT.h; y += 1.1) { B(t, 2.36, 0.08, 2.36, M.wallDark, 0, y, 0, { cast: false }); }
    for (const [sx, sz] of [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]]) B(t, 0.3, CT.h, 0.3, M.sill, sx, CT.h / 2, sz, { ch: 0.03 });
    for (const [nx, nz] of [[1, 0], [0, 1]]) for (const k of [-0.45, 0.45]) { const x = nx ? 1.16 : k, z = nz ? 1.16 : k; B(t, nx ? 0.06 : 0.55, 1.5, nz ? 0.06 : 0.55, M.deep, x, CT.h - 1.2, z, { cast: false }); B(t, nx ? 0.07 : 0.62, 0.18, nz ? 0.07 : 0.62, M.sill, x, CT.h - 0.4, z, { cast: false }); for (let j = 0; j < 4; j++) B(t, nx ? 0.08 : 0.5, 0.05, nz ? 0.08 : 0.5, M.woodD, x, CT.h - 1.75 + j * 0.3, z, { cast: false }); }
    for (const [nx, nz] of [[1, 0], [0, 1]]) B(t, nx ? 0.08 : 0.5, 1.0, nz ? 0.08 : 0.5, M.deep, nx ? 1.16 : 0, 3.2, nz ? 1.16 : 0, { cast: false });
    B(t, 2.7, 0.2, 2.7, M.sill, 0, CT.h + 0.1, 0); const roofP = C(t, 0.0, 1.95, 2.4, M.tile, 0, CT.h + 1.4, 0, { seg: 4 }); roofP.rotation.y = PI / 4;
    const cr = G(t, 0, CT.h + 2.6, 0); B(cr, 0.12, 1.0, 0.12, M.iron, 0, 0.5, 0); B(cr, 0.55, 0.12, 0.12, M.iron, 0, 0.7, 0); S(cr, 0.08, M.gold, 0, 1.05, 0);
  }
  const bellPivot = G(root, CT.x + 0.0, CT.h - 0.65, CT.z); const bell = G(bellPivot, 0, 0, 0);
  bell.add(new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0.0], [0.18, -0.02], [0.24, -0.25], [0.32, -0.62], [0.42, -0.74], [0.0, -0.74]].map(([r, h]) => new THREE.Vector2(r, h)), 16), M.brass)); B(bellPivot, 1.6, 0.14, 0.14, M.woodD, 0, 0.08, 0);
  // vitraux en ogive dans les fenêtres du mur ouest
  for (const zc of WIN) { for (let k = 0; k < 6; k++) B(root, 0.04, 0.42, 0.36, [M.glassB, M.glassR, M.glassG, M.glassR, M.glassB, M.glassG][k], XW + 0.02, 1.38 + (k >> 1) * 0.44, zc - 0.2 + (k % 2) * 0.4, { cast: false }); }
  // cloître : arcades en plein cintre sur colonnettes, toit en appentis, devant le jardin des simples
  { const z0 = D / 2 + 0.75, xs = []; for (let x = -4.4; x <= 7.7; x += 1.35) xs.push(x);
    for (const x of xs) { C(root, 0.16, 0.2, 0.18, M.sill, x, 0.09, z0); C(root, 0.1, 0.11, 1.9, M.wall, x, 1.13, z0, { seg: 10 }); B(root, 0.32, 0.16, 0.32, M.sill, x, 2.14, z0); }
    for (let k = 0; k < xs.length - 1; k++) { const a = T(root, 0.6, 0.1, M.wall, (xs[k] + xs[k + 1]) / 2, 2.2, z0, { arc: PI, seg: 12 }); a.scale.x = 0.98; }
    B(root, xs[xs.length - 1] - xs[0] + 0.4, 0.5, 0.28, M.wall, (xs[0] + xs[xs.length - 1]) / 2, 3.05, z0);
    const r = G(root, (xs[0] + xs[xs.length - 1]) / 2, 3.45, z0 - 0.55); r.rotation.x = 0.42; B(r, xs[xs.length - 1] - xs[0] + 0.9, 0.12, 1.6, M.tileD, 0, 0, 0); for (let k = 0; k < 38; k++) C(r, 0.09, 0.09, 1.6, k % 3 ? M.tile : M.tileL, -((xs[xs.length - 1] - xs[0]) / 2) - 0.3 + k * 0.33, 0.08, 0, { seg: 6, rot: [PI / 2, 0, 0], cast: false });
  }

  // ---- lutrin : colonne tournée, pupitre incliné, livre ouvert, bougie
  const lect = G(root, LECT.x, 0, LECT.z);
  C(lect, 0.32, 0.38, 0.08, M.woodD, 0, 0.04, 0); C(lect, 0.07, 0.1, 1.0, M.wood, 0, 0.55, 0); for (const y of [0.3, 0.75]) T(lect, 0.085, 0.022, M.woodD, 0, y, 0, { rot: [PI / 2, 0, 0] });
  const desk = G(lect, 0, 1.12, 0); desk.rotation.x = 0.42;
  B(desk, 0.72, 0.05, 0.52, M.wood, 0, 0, 0); B(desk, 0.72, 0.06, 0.04, M.woodD, 0, 0.03, 0.26);
  const lectBooks = [openBook(desk, M, M.rubric, M.rubric), openBook(desk, M, M.teal, M.rubric), openBook(desk, M, M.lapis, M.rubric)];
  lectBooks.forEach((b) => { b.g.position.y = 0.04; b.g.visible = false; });
  const loupe = G(desk, 0.18, 0.12, 0); T(loupe, 0.06, 0.012, M.brass, 0, 0, 0, { rot: [PI / 2, 0, 0] }); C(loupe, 0.055, 0.055, 0.008, M.glass, 0, 0, 0); bar(loupe, [0.06, 0, 0], [0.16, 0, 0.03], 0.012, M.woodD);
  const fl1 = candle(root, M, LECT.x + 0.48, 0, LECT.z + 0.05, 0.3);
  C(root, 0.05, 0.06, 1.0, M.iron, LECT.x + 0.48, 0.5, LECT.z + 0.05); C(root, 0.18, 0.22, 0.04, M.iron, LECT.x + 0.48, 0.02, LECT.z + 0.05);
  fl1.g.position.y = 1.36; shadow(root, LECT.x, LECT.z, 1.1, 0.5);

  // ---- casiers du rubricateur : 4 colonnes × 3 rangées, voyant par colonne
  const cab = G(root, RUB.x, 0, ZW + 0.5);
  B(cab, 1.9, 2.2, 0.5, M.woodD, 0, 1.1, 0); B(cab, 2.0, 0.08, 0.56, M.woodX, 0, 2.24, 0); B(cab, 2.0, 0.12, 0.56, M.woodX, 0, 0.06, 0);
  const holes = [];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) { const hx = -0.69 + c * 0.46, hy = 0.85 + r * 0.42; B(cab, 0.4, 0.34, 0.1, M.woodK, hx, hy, 0.21, { cast: false }); holes.push({ c, r, x: RUB.x + hx, y: hy, z: ZW + 0.75 }); }
  for (let c = 0; c < 4; c++) for (let r = 0; r < 2; r++) B(cab, 0.32, 0.04, 0.22, M.vellum, -0.69 + c * 0.46, 0.75 + r * 0.42, 0.14, { cast: false });   // fiches déjà rangées
  const lampsCab = [0, 1, 2, 3].map((c) => { const m = S(cab, 0.05, M.off, -0.69 + c * 0.46, 2.06, 0.27); return m; });
  const catColors = [M.rubric, M.lapis, M.gold, M.teal];
  [0, 1, 2, 3].forEach((c) => B(cab, 0.3, 0.08, 0.02, catColors[c], -0.69 + c * 0.46, 1.95, 0.26, { cast: false }));
  // table, encrier, tabouret
  const tab = G(root, RUB.x, 0, RUB.z);
  B(tab, 1.5, 0.08, 0.72, M.wood, 0, 0.82, 0); for (const [sx, sz] of [[-0.66, -0.3], [0.66, -0.3], [-0.66, 0.3], [0.66, 0.3]]) B(tab, 0.08, 0.78, 0.08, M.woodD, sx, 0.39, sz); B(tab, 1.3, 0.05, 0.05, M.woodD, 0, 0.22, 0);
  C(tab, 0.05, 0.06, 0.08, M.ink, 0.45, 0.9, -0.15); bar(tab, [0.45, 0.9, -0.15], [0.52, 1.12, -0.2], 0.008, M.vellum);
  for (let k = 0; k < 4; k++) B(tab, 0.18, 0.012, 0.1, M.vellum, -0.1 + k * 0.03, 0.87 + k * 0.012, 0.18, { cast: false });   // pile de fiches
  C(root, 0.2, 0.22, 0.06, M.wood, RUBSEAT.x, 0.48, RUBSEAT.z); for (let k = 0; k < 3; k++) { const a = k * 2.1; bar(root, [RUBSEAT.x + 0.14 * Math.cos(a), 0, RUBSEAT.z + 0.14 * Math.sin(a)], [RUBSEAT.x + 0.08 * Math.cos(a), 0.46, RUBSEAT.z + 0.08 * Math.sin(a)], 0.025, M.woodD); }
  shadow(root, RUB.x, RUB.z, 1.9, 0.45);
  const slips = [0, 1, 2, 3].map(() => B(root, 0.16, 0.01, 0.1, M.vellum, 0, -1, 0, { cast: false }));

  // ---- poulie : deux potences, corde, panier qui porte le livre du rubricateur au pupitre à clés
  for (const p of [PA, PB]) { B(root, 0.14, 2.5, 0.14, M.woodD, p.x, 1.25, p.z); B(root, 0.5, 0.1, 0.12, M.woodD, p.x, 2.45, p.z); C(root, 0.07, 0.07, 0.05, M.iron, p.x, 2.4, p.z + 0.1, { rot: [PI / 2, 0, 0] }); B(root, 0.36, 0.06, 0.36, M.woodD, p.x, 0.03, p.z); }
  bar(root, [PA.x, 2.38, PA.z + 0.1], [PB.x, 2.38, PB.z + 0.1], 0.012, M.rope);
  const basket = G(root, PA.x, 0, PA.z);
  B(basket, 0.42, 0.14, 0.34, M.woodL, 0, 0.0, 0); for (const sx of [-0.18, 0.18]) bar(basket, [sx, 0.06, 0], [0, 0.55, 0], 0.008, M.rope);

  // ---- pupitre à deux clés : bureau, coffret ferré, deux serrures, presse à sceau, chute vers le passe-plat
  const kd = G(root, KEY.x, 0, KEY.z);
  B(kd, 2.1, 0.1, 0.85, M.woodD, 0, 0.86, 0); B(kd, 2.0, 0.75, 0.75, M.wood, 0, 0.42, 0); for (const sx of [-0.5, 0.5]) B(kd, 0.9, 0.6, 0.02, M.woodD, sx, 0.45, 0.385, { cast: false });
  B(kd, 0.9, 0.42, 0.34, M.woodK, 0, 1.12, -0.24); for (const y of [0.98, 1.26]) B(kd, 0.94, 0.04, 0.38, M.iron, 0, y, -0.24); for (const sx of [-0.43, 0.43]) B(kd, 0.04, 0.44, 0.38, M.iron, sx, 1.12, -0.24);
  const keys = [-0.22, 0.22].map((sx, i) => {
    C(kd, 0.06, 0.06, 0.02, M.brass, sx, 1.12, -0.06, { rot: [PI / 2, 0, 0] });
    const k = G(kd, sx, 1.12, -0.04);
    bar(k, [0, 0, 0], [0, 0, 0.16], 0.012, M.ironL); T(k, 0.04, 0.012, M.ironL, 0, 0, 0.2, { rot: [0, PI / 2, 0] }); B(k, 0.02, 0.05, 0.02, M.ironL, 0, -0.03, 0.03);
    return k;
  });
  const lampKey = S(kd, 0.05, M.off, 0, 1.4, -0.06);
  // presse à sceau : deux montants, vis, sceau de laiton
  for (const sx of [-0.28, 0.28]) B(kd, 0.07, 0.9, 0.07, M.woodD, sx, 1.36, 0.12);
  B(kd, 0.66, 0.09, 0.12, M.woodD, 0, 1.82, 0.12);
  const seal = G(kd, 0, 1.55, 0.12); C(seal, 0.025, 0.025, 0.5, M.iron, 0, 0.12, 0); C(seal, 0.11, 0.12, 0.08, M.brass, 0, -0.15, 0); C(seal, 0.13, 0.13, 0.02, M.rubric, 0, -0.2, 0);
  { const L = KEY.z - ZW - 0.35, ch = G(kd, 0, 0.9, -0.4 - L / 2); B(ch, 0.5, 0.04, L, M.woodX, 0, -0.02, 0); for (const sx of [-0.25, 0.25]) B(ch, 0.04, 0.1, L, M.woodD, sx, 0.03, 0); for (const zz of [-L / 2 + 0.1, L / 2 - 0.1]) bar(ch, [0, -0.04, zz], [0, -0.88, zz], 0.035, M.woodD); }                                                       // goulotte vers le passe-plat
  const tray = G(kd, 0.75, 0.92, 0.12); B(tray, 0.5, 0.05, 0.4, M.wood, 0, 0, 0); for (const sx of [-0.24, 0.24]) B(tray, 0.03, 0.1, 0.4, M.woodD, sx, 0.05, 0);
  const fl2 = candle(root, M, KEY.x - 0.85, 0.91, KEY.z - 0.2, 0.2);
  shadow(root, KEY.x, KEY.z, 2.6, 0.45);

  // ---- bibliothèque : trois corps de rayonnages, livres serrés, échelle, un emplacement libre
  const lib = G(root, 0, 0, SHELF.z);
  const bookMat = [M.rubric, M.lapis, M.teal, M.woodD, M.rubricD, M.lapisD, M.tealD, M.wood];
  for (let c = 0; c < 2; c++) {
    const cx = SHELF.x + c * 1.8;
    B(lib, 1.75, 2.9, 0.06, M.woodX, cx, 1.45, -0.2); for (const sx of [-0.85, 0.85]) B(lib, 0.06, 2.9, 0.46, M.woodD, cx + sx, 1.45, 0); B(lib, 1.85, 0.1, 0.52, M.woodX, cx, 2.95, 0);
    for (let r = 0; r < 5; r++) {
      const y = 0.18 + r * 0.55; B(lib, 1.6, 0.05, 0.4, M.wood, cx, y, 0.03);
      let x = cx - 0.74, n = 0;
      while (x < cx + 0.72) { const h = (Math.sin(c * 7 + r * 13 + n * 3.7) * 0.5 + 0.5), w = 0.06 + 0.04 * h; if (!(c === 0 && r === 2 && x > cx - 0.1 && x < cx + 0.1)) B(lib, w, 0.36 + 0.1 * h, 0.28, bookMat[(c * 5 + r * 3 + n) % 8], x + w / 2, y + 0.025 + (0.36 + 0.1 * h) / 2, 0.06, { ch: 0.01, cast: false }); x += w + 0.008; n++; }
    }
  }
  const newBook = B(lib, 0.11, 0.42, 0.3, M.teal, SHELF.x, 0.18 + 2 * 0.55 + 0.235, 0.06, { ch: 0.01 }); newBook.visible = false;
  const LX = SHELF.x + 3.0, LZ = SHELF.z + 0.7; bar(root, [LX, 0, LZ], [LX + 0.3, 2.9, LZ - 0.45], 0.03, M.wood); bar(root, [LX + 0.6, 0, LZ], [LX + 0.9, 2.9, LZ - 0.45], 0.03, M.wood);
  for (let k = 1; k < 9; k++) bar(root, [LX + k * 0.034, k * 0.32, LZ - k * 0.05], [LX + 0.6 + k * 0.034, k * 0.32, LZ - k * 0.05], 0.018, M.wood);

  // ---- presse à bras : montants, chapeau, vis, platine, barreau, marbre ; ratelier des bois gravés (versions)
  const pr = G(root, PRESS.x, 0, PRESS.z);
  for (const sz of [-0.55, 0.55]) { B(pr, 0.22, 2.1, 0.22, M.woodD, 0, 1.05, sz); B(pr, 0.6, 0.12, 0.3, M.woodX, 0, 0.06, sz); }
  B(pr, 0.36, 0.26, 1.4, M.woodD, 0, 2.05, 0); B(pr, 0.34, 0.12, 1.3, M.woodD, 0, 1.55, 0);
  B(pr, 1.5, 0.12, 0.9, M.wood, 0.25, 0.78, 0); for (const sx of [-0.4, 0.9]) B(pr, 0.1, 0.72, 0.8, M.woodD, sx, 0.38, 0);
  const screw = G(pr, 0, 1.25, 0); C(screw, 0.07, 0.07, 0.62, M.iron, 0, 0.3, 0); for (let k = 0; k < 6; k++) T(screw, 0.08, 0.012, M.ironL, 0, 0.08 + k * 0.08, 0, { rot: [PI / 2, 0, 0], seg: 10 });
  const handle = G(screw, 0, 0.12, 0); bar(handle, [0, 0, 0], [-0.7, 0, 0.25], 0.03, M.iron); S(handle, 0.05, M.woodK, -0.72, 0, 0.26);
  const platen = G(pr, 0, 1.12, 0); B(platen, 0.5, 0.08, 0.6, M.woodK, 0, 0, 0);
  const blockNew = B(pr, 0.36, 0.06, 0.44, M.woodL, 0, 0.87, 0, { ch: 0.01 }); blockNew.visible = false;
  const rack = G(root, RACK.x, 0, RACK.z);
  for (const sz of [-0.5, 0.5]) B(rack, 0.08, 1.6, 0.08, M.woodD, 0, 0.8, sz); for (let r = 0; r < 3; r++) B(rack, 0.36, 0.04, 1.08, M.wood, 0, 0.45 + r * 0.45, 0);
  for (let k = 0; k < 4; k++) B(rack, 0.3, 0.05, 0.22, M.wood, 0, 0.5 + (k % 3) * 0.45, -0.36 + (k >> 1) * 0.3 + (k % 2) * 0.05, { ch: 0.01 });
  const blockRack = B(rack, 0.3, 0.05, 0.22, M.woodL, 0, 1.4, 0.34, { ch: 0.01 }); blockRack.visible = false;
  for (let k = 0; k < 3; k++) B(rack, 0.03, 0.04, 0.06, M.gold, 0.16, 0.5 + k * 0.45, -0.36, { cast: false });     // étiquettes de version
  shadow(root, PRESS.x, PRESS.z, 2.2, 0.45); shadow(root, RACK.x, RACK.z, 1.4, 0.4);

  // ---- correcteur : pupitre incliné, tabouret, encre rouge, plume, livre ouvert, bougie
  const cd = G(root, CORR.x, 0, CORR.z, -PI / 2);
  B(cd, 1.2, 0.08, 0.8, M.wood, 0, 0.84, 0); for (const [sx, sz] of [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]]) B(cd, 0.08, 0.8, 0.08, M.woodD, sx, 0.4, sz);
  const slope = G(cd, 0, 0.98, -0.05); slope.rotation.x = 0.28; B(slope, 1.0, 0.04, 0.6, M.woodD, 0, 0, 0);
  const corrBook = openBook(slope, M, M.teal, M.rubric); corrBook.g.position.y = 0.03; corrBook.g.visible = false;
  C(cd, 0.045, 0.05, 0.07, M.rubric, 0.42, 0.92, 0.22); C(cd, 0.045, 0.05, 0.07, M.ink, 0.32, 0.92, 0.26);
  const quill = G(cd, 0.3, 1.0, 0.1); bar(quill, [0, 0, 0], [0.06, 0.28, 0.02], 0.006, M.vellum); for (let k = 0; k < 6; k++) B(quill, 0.05 - k * 0.006, 0.02, 0.006, M.paper, 0.03 + k * 0.008, 0.12 + k * 0.03, 0.01, { cast: false });
  const fl3 = candle(root, M, CORR.x - 0.2, 0.88, CORR.z - 0.5, 0.22);
  C(root, 0.2, 0.22, 0.06, M.wood, CORRSEAT.x, 0.48, CORRSEAT.z); for (let k = 0; k < 3; k++) { const a = k * 2.1; bar(root, [CORRSEAT.x + 0.14 * Math.cos(a), 0, CORRSEAT.z + 0.14 * Math.sin(a)], [CORRSEAT.x + 0.08 * Math.cos(a), 0.46, CORRSEAT.z + 0.08 * Math.sin(a)], 0.025, M.woodD); }
  shadow(root, CORR.x, CORR.z, 1.6, 0.45);
  // chat sur un coussin : la queue bat
  const cat = G(root, 0.1, 0, 2.2, 0.6);
  B(cat, 0.6, 0.06, 0.5, M.rubricD, 0, 0.03, 0, { ch: 0.03 }); S(cat, 0.17, M.robeGrey ?? M.woodK, 0, 0.17, 0, [1.3, 0.75, 1]); S(cat, 0.1, M.woodK, 0.2, 0.22, 0.05, [1, 0.95, 1]);
  for (const s of [-1, 1]) C(cat, 0.0, 0.03, 0.06, M.woodK, 0.24, 0.32, 0.05 + s * 0.05, { seg: 4 });
  const tail = G(cat, -0.2, 0.12, 0); bar(tail, [0, 0, 0], [-0.22, 0.02, 0.12], 0.025, M.woodK);
  shadow(root, 0.1, 2.2, 0.8, 0.4);

  // ---- cadran du gain : disque de bois, graduations, aiguille de laiton (×1 → ×2,3)
  const dial = G(root, XW + 0.27, 2.35, -0.3);
  C(dial, 0.62, 0.62, 0.06, M.woodD, 0, 0, 0, { rot: [0, 0, PI / 2], seg: 28 }); C(dial, 0.55, 0.55, 0.07, M.vellum, 0, 0, 0, { rot: [0, 0, PI / 2], seg: 28 });
  for (let k = 0; k <= 12; k++) { const a = -2.3 + k * (4.6 / 12); B(dial, 0.02, k % 4 === 0 ? 0.1 : 0.06, 0.02, k > 9 ? M.rubric : M.ink, 0.045, 0.45 * Math.cos(a), 0.45 * Math.sin(a), { rot: [-a + PI / 2, 0, 0], cast: false }); }
  B(dial, 0.02, 0.08, 0.22, M.ok, 0.045, 0.2, 0.0, { cast: false });
  const needle = G(dial, 0.05, 0, 0); B(needle, 0.02, 0.42, 0.04, M.brass, 0, 0.18, 0, { cast: false }); C(needle, 0.05, 0.05, 0.03, M.brass, 0, 0, 0, { rot: [0, 0, PI / 2] });

  // ---- cloître : plates-bandes, simples, puits (fond de décor vivant)
  const gar = G(root, 0, 0, 0);
  const GZ0 = D / 2 + 1.4; for (const [x0, z0] of [[1.2, GZ0], [4.4, GZ0]]) { B(gar, 2.9, 0.22, 1.9, M.woodD, x0 + 1.45, 0.11, z0 + 0.95); B(gar, 2.7, 0.06, 1.7, M.soil, x0 + 1.45, 0.24, z0 + 0.95, { cast: false }); }
  for (let i = 0; i < 28; i++) { const x = 1.5 + (i % 7) * 0.4 + (i % 14 >= 7 ? 3.2 : 0), z = GZ0 + 0.45 + Math.floor(i / 14) * 0.9, h = 0.2 + 0.15 * Math.abs(Math.sin(i * 2.3)); S(gar, 0.17, M.leaf[i % 3], x, 0.3 + h / 2, z, [1, h / 0.17 * 0.6, 1]); }
  const well = G(gar, -2.2, 0, D / 2 + 2.3); C(well, 0.55, 0.6, 0.7, M.stone[2], 0, 0.35, 0, { seg: 18 }); C(well, 0.42, 0.42, 0.02, M.water, 0, 0.66, 0, { seg: 18 });
  for (const sz of [-0.5, 0.5]) B(well, 0.08, 1.4, 0.08, M.woodD, 0, 1.05, sz); B(well, 0.12, 0.12, 1.2, M.woodD, 0, 1.75, 0); C(well, 0.12, 0.12, 0.3, M.wood, 0, 1.5, 0, { rot: [PI / 2, 0, 0] });
  // dehors : vergers, ruches, charrette, meule ; tout est posé sur la prairie de l'île
  const tree = (x, z, s, k) => { C(root, 0.1 * s, 0.16 * s, 1.2 * s, M.woodD, x, 0.6 * s, z, { seg: 7 }); S(root, 0.75 * s, M.leaf[k % 3], x, 1.55 * s, z, [1, 0.85, 1], { seg: 9 }); S(root, 0.5 * s, M.leaf[(k + 1) % 3], x + 0.35 * s, 1.85 * s, z + 0.2 * s, [1, 0.85, 1], { seg: 8 }); for (let f = 0; f < 4; f++) S(root, 0.06, M.rubric, x + Math.cos(f * 1.7) * 0.6 * s, 1.35 * s + (f % 2) * 0.3, z + Math.sin(f * 1.7) * 0.6 * s); shadow(root, x, z, 1.6 * s, 0.4); };
  [[-W / 2 - 1.8, 2.5, 1.0, 0], [-W / 2 - 1.6, -2.4, 1.2, 1], [W / 2 + 1.9, -3.4, 1.1, 2], [W / 2 + 2.0, 1.8, 0.9, 0], [-5.6, D / 2 + 2.2, 1.0, 1], [W / 2 - 0.4, D / 2 + 2.6, 1.15, 2], [-1.0, -D / 2 - 2.2, 0.9, 0], [3.8, -D / 2 - 2.0, 1.0, 1]].forEach(([x, z, s, k]) => tree(x, z, s, k));
  for (let k = 0; k < 3; k++) { const x = -W / 2 - 1.3, z = -0.6 + k * 0.9; B(root, 0.6, 0.12, 0.6, M.woodD, x, 0.3, z); for (let r = 0; r < 4; r++) C(root, 0.26 - r * 0.05, 0.28 - r * 0.05, 0.16, M.rope, x, 0.44 + r * 0.14, z, { seg: 10 }); bar(root, [x - 0.2, 0, z - 0.2], [x - 0.2, 0.3, z - 0.2], 0.03, M.woodD); bar(root, [x + 0.2, 0, z + 0.2], [x + 0.2, 0.3, z + 0.2], 0.03, M.woodD); }
  const cart = G(root, W / 2 + 1.7, 0, D / 2 + 0.6, 0.5); B(cart, 1.6, 0.12, 0.9, M.wood, 0, 0.6, 0); for (const sz of [-0.48, 0.48]) { B(cart, 1.6, 0.3, 0.06, M.woodD, 0, 0.78, sz); T(cart, 0.38, 0.05, M.woodD, -0.1, 0.4, sz * 1.1, { seg: 12 }); } bar(cart, [0.8, 0.6, -0.3], [2.0, 0.3, -0.25], 0.04, M.woodD); bar(cart, [0.8, 0.6, 0.3], [2.0, 0.3, 0.25], 0.04, M.woodD); for (let k = 0; k < 3; k++) { const bk = book(cart, M, [M.lapis, M.rubric, M.teal][k]); bk.position.set(-0.4 + k * 0.35, 0.66, 0); }
  S(root, 0.9, M.wood ? mk(P.gold1) : M.wood, -W / 2 - 1.2, 0.4, -4.6, [1, 0.75, 1]);
  // grand chandelier sur pied près du lutrin et du pupitre à clés
  const fl4 = [[-6.5, -1.0], [1.1, -1.8], [-3.0, 1.8]].map(([x, z], i) => { C(root, 0.22, 0.26, 0.05, M.iron, x, 0.025, z); C(root, 0.035, 0.05, 1.6, M.iron, x, 0.8, z); C(root, 0.15, 0.1, 0.05, M.iron, x, 1.6, z); return candle(root, M, x, 1.58, z, 0.18); });
  const flames = [fl1, fl2, fl3, ...fl4];

  // ---- mobilier qui raconte : tapis, coffres, file de manuscrits à l'entrée, paniers de rouleaux, banc, colonnade du cloître
  B(root, 2.6, 0.02, 1.8, M.rubricD, CORR.x + 0.6, 0.01, CORR.z + 0.2, { cast: false }); B(root, 2.4, 0.022, 1.6, M.rubric, CORR.x + 0.6, 0.012, CORR.z + 0.2, { cast: false });
  for (let k = 0; k < 5; k++) B(root, 2.2, 0.024, 0.06, M.gold, CORR.x + 0.6, 0.013, CORR.z - 0.5 + k * 0.35, { cast: false });
  const chest = (x, z, ry) => { const c = G(root, x, 0, z, ry); B(c, 0.9, 0.5, 0.55, M.woodD, 0, 0.25, 0); B(c, 0.94, 0.12, 0.6, M.wood, 0, 0.56, 0); for (const sx of [-0.3, 0.3]) B(c, 0.05, 0.62, 0.62, M.iron, sx, 0.31, 0); B(c, 0.1, 0.12, 0.04, M.brass, 0, 0.42, 0.3); shadow(root, x, z, 1.1, 0.4); };
  chest(-6.8, -4.4, 0.2); chest(6.9, -2.6, -PI / 2);
  for (let k = 0; k < 4; k++) { const bk = book(root, M, [M.lapis, M.teal, M.rubric, M.woodD][k]); bk.position.set(DOOR.x + 1.2, 0.07 * k, ZW + 0.85); bk.rotation.y = 0.3 * Math.sin(k * 2.1); }
  const basketR = (x, z) => { C(root, 0.26, 0.2, 0.36, M.woodL, x, 0.18, z, { seg: 12 }); for (let k = 0; k < 3; k++) T(root, 0.235 - k * 0.02, 0.012, M.wood, x, 0.08 + k * 0.12, z, { rot: [PI / 2, 0, 0] }); for (let k = 0; k < 5; k++) C(root, 0.035, 0.035, 0.6, M.vellum, x - 0.1 + (k % 3) * 0.09, 0.45, z - 0.06 + (k >> 1) * 0.08, { rot: [0.15 * (k - 2), 0, 0.1 * (k - 2)] }); };
  basketR(RUB.x - 1.1, ZW + 0.6); basketR(RUB.x + 1.15, ZW + 0.65);
  const bench = G(root, XW + 0.6, 0, 0.6, PI / 2); B(bench, 2.2, 0.08, 0.4, M.wood, 0, 0.46, 0); for (const sx of [-0.9, 0.9]) B(bench, 0.08, 0.44, 0.34, M.woodD, sx, 0.22, 0);
  // ---- livres qui circulent : connu (rouge), inédit (sarcelle), inédit (lapis)
  const books = [book(root, M, M.rubric), book(root, M, M.teal), book(root, M, M.lapis)];

  // ---- distribution
  const cast = {
    mess: monk(scene, people, M, { robe: mk(P.cloak0), skin: people.skinTones[2], hairMat: people.hair[1], hairStyle: 'short', hood: false, hat: 'beanie', hatMat: mk(P.cloak1), pack: M.leather, cord: M.leather }),
    lect: monk(scene, people, M, { robe: mk(P.robeBrown0), skin: people.skinTones[1], hairMat: people.hair[1] }),
    rub: monk(scene, people, M, { robe: mk(P.robeGrey1), skin: people.skinTones[0], hairMat: people.hair[2] }),
    prior: monk(scene, people, M, { robe: mk(P.robeWhite0), skin: people.skinTones[1], hairMat: people.hair[2], trim: mk(P.robeBlack0), cord: M.ink }),
    libr: monk(scene, people, M, { robe: mk(P.robeBlack0), skin: people.skinTones[3], hairMat: people.hair[0], glasses: true }),
    corr: monk(scene, people, M, { robe: mk(P.robeBrown2), skin: people.skinTones[2], hairMat: people.hair[0] }),
  };

  // ---------------------------------------------------------------- poses de travail
  const POSE = {
    read: { ...STAND, torso: [0.18, 0, 0], head: [0.32, 0, 0], shoulderR: [-1.0, 0, 0.2], elbowR: [-1.1, 0, 0], shoulderL: [-0.5, 0, -0.2], elbowL: [-0.6, 0, 0] },
    carry: { ...STAND, shoulderL: [-0.55, 0, -0.18], shoulderR: [-0.55, 0, 0.18], elbowL: [-1.1, 0, 0], elbowR: [-1.1, 0, 0] },
    give: { ...STAND, torso: [0.15, 0, 0], shoulderL: [-1.15, 0, -0.1], shoulderR: [-1.15, 0, 0.1], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0] },
    key: { ...STAND, torso: [0.1, 0, 0], head: [0.2, 0, 0], shoulderR: [-1.05, 0, 0.12], elbowR: [-0.5, 0, 0] },
    reachUp: { ...STAND, head: [-0.2, 0, 0], shoulderR: [-2.3, 0, 0.1], elbowR: [-0.3, 0, 0] },
    pull: { ...STAND, torso: [0.25, 0, 0], shoulderL: [-1.3, 0, -0.1], shoulderR: [-1.3, 0, 0.1], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0], hipL: [-0.35, 0, 0.02], kneeL: [0.35, 0, 0], hipR: [0.25, 0, -0.02], kneeR: [0.1, 0, 0] },
    write: { torso: [0.32, 0, 0], head: [0.35, 0, 0], shoulderL: [-0.9, 0, -0.15], shoulderR: [-1.05, 0, 0.15], elbowL: [-0.9, 0, 0], elbowR: [-0.75, 0, 0], wristL: [0, 0, 0], wristR: [0.2, 0, 0], hipL: [-1.5, 0, 0.05], hipR: [-1.5, 0, -0.05], kneeL: [1.45, 0, 0], kneeR: [1.45, 0, 0], ankleL: [0.1, 0, 0], ankleR: [0.1, 0, 0] },
    think: { ...STAND, torso: [0.05, 0, 0], head: [-0.05, 0.4, 0.1], shoulderR: [-1.6, 0, 0.3], elbowR: [-2.2, 0, 0] },
  };
  const seatedPose = (o) => ({ ...POSE.write, ...o });
  const walkTo = (a, pts, t, t0, t1, pose = {}) => { const u = smooth(seg01(t, t0, t1)), w = walkAlong(pts, u); put(a, w.x, 0, w.z, w.yaw, { ...walkPose(w.dist * 4.2), ...pose }); return w; };
  const carryWalk = (a, pts, t, t0, t1) => walkTo(a, pts, t, t0, t1, { shoulderL: [-0.55, 0, -0.18], shoulderR: [-0.55, 0, 0.18], elbowL: [-1.1, 0, 0], elbowR: [-1.1, 0, 0] });
  const hands = (a, fwd = 0.34, y = 1.06) => { const yaw = a.group.rotation.y; return new THREE.Vector3(a.group.position.x + Math.sin(yaw) * fwd, y, a.group.position.z + Math.cos(yaw) * fwd); };
  const face = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

  // trajets (x, z)
  const HAND = { x: LECT.x + 0.85, z: LECT.z - 0.6 }; const R_DOOR = [[DOOR.x, ZW - 1.3], [DOOR.x, ZW + 0.9], [HAND.x, HAND.z]];
  const DROP = { x: RUB.x - 1.25, z: RUB.z + 0.35 }; const R_LECT_RUB = [[READ.x, READ.z], [READ.x + 1.4, READ.z - 0.4], [DROP.x, DROP.z]];
  const R_RUB_CORR = [[RUBSEAT.x - 0.6, RUBSEAT.z + 0.4], [RUBSEAT.x - 0.4, -1.0], [CORRSEAT.x - 0.1, CORRSEAT.z - 0.9]];
  const R_CORR_KEY = [[CORRSEAT.x + 0.4, CORRSEAT.z - 0.4], [1.2, -0.9], [KEY.x, KEY.z + 1.0]];
  const R_LIBR_SHELF = [[LIBR.x, LIBR.z], [SHELF.x - 0.3, LIBR.z - 0.6], [SHELF.x, SHELF.z + 0.75]];
  const R_PRIOR_PRESS = [[PRIOR.x, PRIOR.z], [2.9, -0.6], [PRESS.x - 1.1, PRESS.z + 0.2]];

  // ---------------------------------------------------------------- la boucle
  return function update(t) {
    // flammes, chat, aiguille
    flames.forEach((f, i) => f.flicker(t, i));
    tail.rotation.y = 0.5 * Math.sin(t * 1.3) + 0.25 * Math.sin(t * 2.9);
    { let sw = 0; for (const a of [11.6, 32.0, 45.6]) { const d = t - a + (t < 1 ? 46 : 0); if (d > 0 && d < 3) sw = Math.max(sw, Math.sin(d * 5) * Math.exp(-d * 0.9)); } bell.rotation.z = 0.6 * sw; }
    const gain = t < 1.6 ? lerp(2.3, 1, smooth(seg01(t, 0.2, 1.6))) : 1 + 1.3 * smooth(seg01(t, 44.0, 45.6));
    needle.rotation.x = -2.3 + (gain - 0.5) / 2.5 * 4.6;

    // ---- messager : trois passages, livre posé sur le lutrin, sortie par la porte
    const mess = cast.mess, visits = [[0.3, 2.5, 3.0, 5.4, 0], [11.6, 13.8, 14.3, 16.6, 1], [38.6, 40.8, 41.3, 43.6, 2]];
    let mv = false;
    for (const [a, b, c, d, bi] of visits) {
      if (t >= a && t < b) { carryWalk(mess, R_DOOR, t, a, b); mv = true; }
      else if (t >= b && t < c) { put(mess, HAND.x, 0, HAND.z, face(HAND, LECT), mixPose(POSE.carry, POSE.give, smooth(seg01(t, b, c)))); mv = true; }
      else if (t >= c && t < d) { walkTo(mess, [...R_DOOR].reverse(), t, c, d); mv = true; }
    }
    if (!mv) put(mess, 0, 0, ZW - 3, 0, STAND, { visible: false });

    // ---- lecteur : lit au lutrin, porte le livre au rubricateur, revient
    const lect = cast.lect, ltrips = [[5.4, 7.2, 7.5, 9.3], [15.4, 17.0, 17.3, 19.1], [42.0, 43.3, 43.5, 45.2]];
    let lb = false;
    for (const [a, b, c, d] of ltrips) {
      if (t >= a && t < b) { carryWalk(lect, R_LECT_RUB, t, a, b); lb = true; }
      else if (t >= b && t < c) { put(lect, DROP.x, 0, DROP.z, PI / 2 - 0.3, POSE.give); lb = true; }
      else if (t >= c && t < d) { walkTo(lect, [...R_LECT_RUB].reverse(), t, c, d); lb = true; }
    }
    if (!lb) { const reading = (t > 3.0 && t < 5.4) || (t > 14.3 && t < 15.4) || (t > 41.3 && t < 42.0); put(lect, READ.x, 0, READ.z, PI, reading ? { ...POSE.read, head: [0.32, 0.15 * Math.sin(t * 2.2), 0] } : { ...STAND, head: [0.05, 0.2 * Math.sin(t * 0.4), 0] }); }
    loupe.position.x = 0.18 * Math.cos(t * 1.7) * 0.6; loupe.position.z = 0.12 * Math.sin(t * 1.1);

    // ---- rubricateur : assis, trie les fiches ; hésite sur le livre inédit ; l'apporte au correcteur
    const rub = cast.rub;
    if (t >= 19.8 && t < 23.0) carryWalk(rub, R_RUB_CORR, t, 19.8, 23.0);
    else if (t >= 23.0 && t < 23.4) put(rub, R_RUB_CORR[2][0], 0, R_RUB_CORR[2][1], PI / 2, POSE.give);
    else if (t >= 23.4 && t < 26.6) walkTo(rub, [...R_RUB_CORR].reverse(), t, 23.4, 26.6);
    else {
      const sorting = (t > 7.6 && t < 9.2) || (t > 17.3 && t < 18.2) || (t > 43.5 && t < 44.2);
      const doubt = t > 18.2 && t < 19.8;
      const arm = sorting ? Math.sin(t * 9) * 0.35 : 0;
      put(rub, RUBSEAT.x, 0, RUBSEAT.z, PI, doubt ? seatedPose({ torso: [0.05, 0, 0], head: [0, 0.6 * Math.sin(t * 3), 0.1], shoulderR: [-1.6, 0, 0.3], elbowR: [-2.1, 0, 0] }) : seatedPose({ shoulderR: [-1.25 + arm, 0, 0.25], head: [sorting ? -0.15 : 0.3, 0, 0] }), { seated: true });
    }
    // fiches qui volent vers les casiers ; voyants verts, voyant rouge clignotant sur le livre inédit
    const flights = [[7.6, [0, 1, 2, 3]], [17.3, [0, 1]], [43.6, [0, 1, 2, 3]]];
    slips.forEach((s) => { s.position.y = -1; });
    const lampState = [0, 0, 0, 0];
    for (const [t0, cols] of flights) cols.forEach((c, i) => {
      const a = t0 + i * 0.38, u = seg01(t, a, a + 0.5), h = holes[c * 3 + 1];
      if (u > 0 && u < 1) { const s = slips[i]; s.position.set(lerp(RUB.x - 0.1, h.x, u), lerp(0.9, h.y, u) + Math.sin(u * PI) * 0.5, lerp(RUB.z + 0.1, h.z, u)); s.rotation.y = u * 3; }
      if (t > a + 0.5 && t < t0 + 3.0) lampState[c] = 1;
    });
    if (t > 18.0 && t < 20.2) { lampState[2] = Math.sin(t * 14) > 0 ? 2 : 0; const s = slips[2]; s.position.set(RUB.x + 0.3, 1.35 + 0.05 * Math.sin(t * 6), RUB.z - 0.5); s.rotation.y = t * 2; }
    lampsCab.forEach((m, c) => { m.material = lampState[c] === 1 ? M.ok : lampState[c] === 2 ? M.bad : M.off; });

    // ---- correcteur : assis ; le livre inédit arrive, il trace les cadres à l'encre rouge, puis le porte aux clés
    const corr = cast.corr;
    if (t >= 27.2 && t < 30.0) carryWalk(corr, R_CORR_KEY, t, 27.2, 30.0);
    else if (t >= 30.0 && t < 30.9) put(corr, KEY.x, 0, KEY.z + 1.0, PI, POSE.give);
    else if (t >= 30.9 && t < 33.6) walkTo(corr, [...R_CORR_KEY].reverse(), t, 30.9, 33.6);
    else { const writing = t > 23.4 && t < 27.2; put(corr, CORRSEAT.x, 0, CORRSEAT.z, -PI / 2, seatedPose({ shoulderR: [writing ? -1.1 + 0.08 * Math.sin(t * 11) : -0.8, 0, 0.15], head: [writing ? 0.45 : 0.25, 0, 0] }), { seated: true }); }
    corrBook.g.visible = t > 23.2 && t < 27.2;
    corrBook.frames.forEach((f, i) => { f.visible = t > 23.8 + i * 0.8; });
    quill.position.set(0.3 + (t > 23.4 && t < 27.2 ? 0.05 * Math.sin(t * 9) : 0), 1.0, 0.1);

    // ---- prieur et bibliothécaire : les deux clés ; le bibliothécaire range le livre corrigé ; le prieur grave un bois à la presse
    const prior = cast.prior, libr = cast.libr;
    const turns = [[10.4, 11.2], [31.0, 31.8], [45.0, 45.5]];
    let kTurn = 0; for (const [a, b] of turns) kTurn = Math.max(kTurn, smooth(seg01(t, a, b)) * (1 - smooth(seg01(t, b + 0.7, b + 1.1))));
    keys.forEach((k, i) => { k.rotation.z = kTurn * PI / 2 * (i ? -1 : 1); });
    lampKey.material = kTurn > 0.95 ? M.ok : M.off;
    let sealY = 0; for (const [a, b] of turns) { const d = t - b; sealY = Math.max(sealY, d > 0 && d < 0.3 ? smooth(d / 0.15) * (1 - smooth((d - 0.15) / 0.15)) : 0); }
    seal.position.y = 1.55 - 0.28 * sealY;
    // prieur
    if (t >= 32.6 && t < 35.6) walkTo(prior, R_PRIOR_PRESS, t, 32.6, 35.6);
    else if (t >= 35.6 && t < 38.6) { const p = R_PRIOR_PRESS[2]; put(prior, p[0], 0, p[1], PI / 2, { ...POSE.pull, torso: [0.25 + 0.1 * Math.sin(seg01(t, 35.6, 38.0) * PI * 2), 0, 0] }); }
    else if (t >= 38.6 && t < 39.6) carryWalk(prior, [[PRESS.x - 1.1, PRESS.z + 0.2], [RACK.x - 0.6, RACK.z + 0.7]], t, 38.6, 39.6);
    else if (t >= 39.6 && t < 40.2) put(prior, RACK.x - 0.6, 0, RACK.z + 0.7, face({ x: RACK.x - 0.6, z: RACK.z + 0.7 }, RACK), POSE.give);
    else if (t >= 40.2 && t < 44.2) walkTo(prior, [[RACK.x - 0.6, RACK.z + 0.7], [2.9, -0.6], [PRIOR.x, PRIOR.z]], t, 40.2, 44.2);
    else put(prior, PRIOR.x, 0, PRIOR.z, PI, turns.some(([a, b]) => t > a - 0.3 && t < b + 0.8) ? POSE.key : { ...STAND, head: [0, 0.25 * Math.sin(t * 0.5), 0] });
    // bibliothécaire
    if (t >= 32.0 && t < 34.2) carryWalk(libr, R_LIBR_SHELF, t, 32.0, 34.2);
    else if (t >= 34.2 && t < 35.4) put(libr, SHELF.x, 0, SHELF.z + 0.75, PI, POSE.reachUp);
    else if (t >= 35.4 && t < 37.6) walkTo(libr, [...R_LIBR_SHELF].reverse(), t, 35.4, 37.6);
    else put(libr, LIBR.x, 0, LIBR.z, PI, turns.some(([a, b]) => t > a - 0.3 && t < b + 0.8) ? POSE.key : { ...STAND, head: [0.1, -0.2 * Math.sin(t * 0.6), 0] });
    newBook.visible = t > 35.0;

    // ---- presse : la vis tourne, la platine descend, un bois neuf rejoint le râtelier des versions
    const pu = seg01(t, 35.8, 38.0), press = Math.sin(pu * PI);
    screw.rotation.y = -press * 1.6; handle.rotation.y = 0; platen.position.y = 1.12 - 0.2 * press;
    blockNew.visible = t > 35.6 && t < 38.6; blockRack.visible = t > 39.9;

    // ---- les livres : où est chacun, à l'instant t
    const at = (bk, v, x, y, z, ry = 0) => { bk.visible = v; bk.position.set(x, y, z); bk.rotation.set(0, ry, 0); };
    lectBooks.forEach((b) => { b.g.visible = false; b.frames.forEach((f) => (f.visible = false)); });
    const keyTop = (bk, tIn, tOut) => {                                                                          // au pupitre, puis dans la goulotte
      if (t < tOut) at(bk, true, KEY.x, 0.92, KEY.z + 0.12, 0);
      else { const u = seg01(t, tOut, tOut + 0.6); at(bk, u < 1, KEY.x, 0.92 + 0.05 * u, lerp(KEY.z + 0.12, ZW, u), 0); }
    };
    const pulley = (bk, t0) => { const u = smooth(seg01(t, t0, t0 + 1.0)); basket.position.set(lerp(PA.x, PB.x, u), 1.75 - 0.4 * Math.sin(u * PI) * 0, lerp(PA.z, PB.z, u)); at(bk, true, basket.position.x, basket.position.y + 0.05, basket.position.z, 0); };
    basket.position.set(PA.x, 1.75, PA.z);
    // livre 1, connu
    const b1 = books[0];
    if (t < 0.3) at(b1, false, 0, 0, 0);
    else if (t < 2.5) at(b1, true, ...hands(mess).toArray(), mess.group.rotation.y);
    else if (t < 5.4) { b1.visible = false; lectBooks[0].g.visible = true; lectBooks[0].frames.forEach((f, i) => (f.visible = t > 3.4 + i * 0.4)); }
    else if (t < 7.2) at(b1, true, ...hands(lect).toArray(), lect.group.rotation.y);
    else if (t < 9.4) at(b1, true, RUB.x - 0.2, 0.86, RUB.z + 0.05, 0.3);
    else if (t < 10.4) pulley(b1, 9.4);
    else keyTop(b1, 10.4, 12.0);
    if (t >= 10.4 && t < 12.6) basket.position.set(PB.x, 1.75, PB.z); else if (t >= 12.6 && t < 13.6) basket.position.set(lerp(PB.x, PA.x, smooth(seg01(t, 12.6, 13.6))), 1.75, lerp(PB.z, PA.z, smooth(seg01(t, 12.6, 13.6))));
    // livre 2, inédit : hésitation, correction, clés, rayonnage
    const b2 = books[1];
    if (t < 11.6) at(b2, false, 0, 0, 0);
    else if (t < 13.8) at(b2, true, ...hands(mess).toArray(), mess.group.rotation.y);
    else if (t < 15.4) { b2.visible = false; lectBooks[1].g.visible = true; lectBooks[1].frames.forEach((f, i) => (f.visible = i < 2 && t > 14.6 + i * 0.4)); }
    else if (t < 17.0) at(b2, true, ...hands(lect).toArray(), lect.group.rotation.y);
    else if (t < 19.8) at(b2, true, RUB.x - 0.2, 0.86, RUB.z + 0.05, 0.3);
    else if (t < 23.2) at(b2, true, ...hands(rub).toArray(), rub.group.rotation.y);
    else if (t < 27.2) b2.visible = false;
    else if (t < 30.0) at(b2, true, ...hands(corr).toArray(), corr.group.rotation.y);
    else if (t < 32.0) at(b2, true, KEY.x, 0.92, KEY.z + 0.12, 0);
    else if (t < 34.6) at(b2, true, ...hands(libr).toArray(), libr.group.rotation.y);
    else at(b2, false, 0, 0, 0);
    // livre 3, inédit : passe du premier coup
    const b3 = books[2];
    if (t < 0.6) keyTop(b3, -1, -0.1 + 0);
    else if (t < 38.6) at(b3, false, 0, 0, 0);
    else if (t < 40.8) at(b3, true, ...hands(mess).toArray(), mess.group.rotation.y);
    else if (t < 42.0) { b3.visible = false; lectBooks[2].g.visible = true; lectBooks[2].frames.forEach((f) => (f.visible = t > 41.5)); }
    else if (t < 43.3) at(b3, true, ...hands(lect).toArray(), lect.group.rotation.y);
    else if (t < 44.0) at(b3, true, RUB.x - 0.2, 0.86, RUB.z + 0.05, 0.3);
    else if (t < 45.0) pulley(b3, 44.0);
    else keyTop(b3, 45.0, 45.8);
    if (t >= 44.0 && t < 45.0) {} // panier déjà placé par pulley()
  };
}

run({
  light(L) { L.sun.position.set(13, 20, 9); },
  palette: toRGB(HEX), slab: [W, D], loop: LOOP, stillT: 26,
  px: 2, fit: [[-W / 2 - 4.0, 0, 0.4], [W / 2 + 4.6, 0, 0.4], [0.4, 0, -D / 2 - 3.8], [0.4, 0, D / 2 + 4.2], [0.4, -11.5, 0.4], [XW - 1.4, 11.4, ZW - 1.4]].map((p) => new THREE.Vector3(...p)),
  build,
});
