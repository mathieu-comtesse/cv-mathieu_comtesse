// Modèle du Lecteur VRE, partagé par la figure SVG (figures/build-anticythere.mjs) et la machine 3D (refonte/m3d/vrestudio.js).
// Repère de figure : x vers la droite, y vers l'avant, z vers le haut. Tout est une fonction pure du temps s (boucle de LOOP_T s).
// Le parcours suit VRE Studio V4.1 : lecture, tri mini-BERT, accord modèle et règles, propositions sur des pages inédites,
// validation humaine dans Radiographie, corpus figé (image, texte, positions), entraînement LayoutLMv3, évaluation indépendante
// (F1 ≥ 0,75, rappel U1 ≥ 0,90), publication explicite du candidat accepté, nouvel essai dont les cadres restent des propositions.
export const TAU = Math.PI * 2;
export const CASE = { x0: -72, x1: 82, y0: -42, y1: 0, h: 132, t: 6 };
export const MECH_Y = -16, FY = MECH_Y + 4;                  // platine, puis plan avant des roues

// Engrenages : deux pas de denture (module M pour le train principal, MF pour le train du gain), centres posés à la somme exacte
// des rayons primitifs, pour que chaque roue touche celle qui l'entraîne. p3 (12 dents) est solidaire de d46 sur le même axe.
const M = 3.79, MF = 2.39, DM = 2.4, DF = 1.5;
const spec = (n, m, d) => ({ n, d, rp: +(n * m / TAU).toFixed(3), r: +(n * m / TAU + d / 2).toFixed(3) });
export const GEARS = { b1: { u: -24, z: 62, ...spec(64, M, DM) } };
const meshTo = (key, from, deg, s) => { const f = GEARS[from], dd = f.rp + s.rp, a = deg * Math.PI / 180; GEARS[key] = { ...s, u: +(f.u + dd * Math.cos(a)).toFixed(2), z: +(f.z + dd * Math.sin(a)).toFixed(2) }; };
meshTo('crank', 'b1', 235, spec(16, M, DM));
meshTo('idle', 'b1', 35.3, spec(14, M, DM));
meshTo('pin', 'idle', 29.6, spec(24, M, DM));
GEARS.slot = { ...GEARS.pin, u: +(GEARS.pin.u + 4).toFixed(2) };
meshTo('p2', 'b1', -2.5, spec(12, M, DM));
meshTo('corpus', 'p2', 0, spec(26, M, DM));
meshTo('p3', 'b1', -40, spec(12, M, DM));
GEARS.d46 = { ...spec(46, MF, DF), u: GEARS.p3.u, z: GEARS.p3.z };
meshTo('o20', 'd46', 0, spec(20, MF, DF));
// Phases : chaque dent tombe dans un creux de la roue qu'elle touche (centre de dent à 0,46 pas, centre de creux à 0,96).
// flip : vrai quand l'axe vertical du dessin monte (scène 3D), faux quand il descend (face SVG).
export const MESH = [['b1', 'crank'], ['b1', 'idle'], ['idle', 'pin'], ['b1', 'p2'], ['p2', 'corpus'], ['b1', 'p3'], ['d46', 'o20']];
export function phases(flip) {
  const ph = { b1: 0, d46: 0, slot: 0 };
  for (const [a, b] of MESH) {
    const A = GEARS[a], B = GEARS[b], pA = TAU / A.n, pB = TAU / B.n;
    const th = Math.atan2(flip ? B.z - A.z : A.z - B.z, B.u - A.u), fA = ((((th - ph[a]) / pA - 0.46) % 1) + 1) % 1;
    ph[b] = th + Math.PI - pB * (0.96 - fA);
  }
  return ph;
}

export const DIAL = { u: 21, z: 64, r0: 5, r1: 17, turns: 3 };
export const CELLS = Array.from({ length: 12 }, (_, i) => 0.1 + i * 0.075);
export const TRAY = { x: -98, y: 40 };
export const CORPUS_TOP = 14;                                   // dessus de la boîte du corpus
export const DIV = { x: 128, y: 40, z: 9 };                       // la roue candidate se forme sur le plateau diviseur (z = 9)
export const GAUGE = { x0: DIV.x - 32, x1: DIV.x - 14, y0: DIV.y + 17, y1: DIV.y + 23, z1: 24 };
export const LEVER = { x: DIV.x + 26, y: DIV.y + 22, z: 18 };
export const HATCH = { x0: GEARS.pin.u - 17.5, x1: GEARS.pin.u + 17.5, y0: FY - 4, y1: FY + 4 };
export const BOARD = { x0: 98, x1: 170, y: -46, z1: 86, slots: [[116, 64], [152, 64], [116, 24], [152, 24]] };
export const LID_Z = CASE.h + 7, ABOVE = LID_Z + GEARS.pin.r + 18;

export const T = { read: [0.5, 4.2], sort: [2, 6], accord: [6, 9.6], infer: [10, 15], valid: [15.4, 23.4], freeze: [23.8, 29.9], train: [30, 35], evaluate: [35.2, 39], publish: [39.2, 45], rerun: [45.2, 52], gain: [50, 55] };
export const LOOP_T = 56;
export const ERR = [4, 9];
export const TS = [0, 2, 6, 10, 15.4, 23.8, 30, 39.2, 45.2];
export const STATIONS = ['Lecture · Document AI', 'Tri des champs · mini-BERT', 'Hybride · la cheville du modèle dans la coulisse des règles', 'Inférence · douze pages inédites, des cadres proposés',
  'Validation humaine · Radiographie, chaque page validée part au corpus', 'Corpus figé · les feuilles forment le flan de la roue', 'Entraînement LayoutLMv3 puis évaluation indépendante',
  'Publication explicite · la roue du modèle est remplacée', 'Nouvel essai · propositions validées une à une · 46 / 20 = × 2,3'];
export const stationAt = (s) => { let i = 0; TS.forEach((a, j) => { if (s >= a) i = j; }); return i; };

const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const VAL = (i) => T.valid[0] + 0.2 + i * 0.45;                    // instant où l'agent valide la page i dans Radiographie
const REACH2 = (c) => 46.5 + 5 * (c - 0.04) / 0.92;              // instant où l'aiguille atteint la case c au nouvel essai

// ---- les feuilles : pages validées vers le corpus, copies du corpus figé vers le flan, rapports de test vers le banc ----
const V3 = (x, y, z) => [x, y, z];
export const SHEETS = [];
for (let j = 0; j < 6; j++) SHEETS.push({ kind: 'valid', mark: j === 1 || j === 3, t0: 16 + j * 1.0, dur: 2.6, L: 16, W: 12, ph: j * 1.7, stay: LOOP_T,
  from: { c: V3(CASE.x1 + 0.6, -21, 27), d: V3(0, 0, -1), w: V3(0, 1, 0) }, to: { c: V3(TRAY.x + 12.5, TRAY.y, CORPUS_TOP + 0.3 + j * 0.45), d: V3(1, 0, 0), w: V3(0, 1, 0) },
  c1: V3(CASE.x1 + 14, 28, 78), c2: V3(TRAY.x + 52, 64, 80) });
for (let k = 0; k < 5; k++) { const a = k * 0.62; SHEETS.push({ kind: 'freeze', t0: 24.4 + k * 0.75, dur: 2.4, L: 16, W: 12, ph: 2 + k * 1.3, stay: 29.9,
  from: { c: V3(TRAY.x + 12.5, TRAY.y, CORPUS_TOP + 3.2), d: V3(1, 0, 0), w: V3(0, 1, 0) }, to: { c: V3(DIV.x, DIV.y, DIV.z + 0.3 + k * 0.5), d: V3(Math.cos(a), Math.sin(a), 0), w: V3(-Math.sin(a), Math.cos(a), 0) },
  c1: V3(TRAY.x + 46, 66, 62), c2: V3(DIV.x - 44, 66, 62) }); }
for (let m = 0; m < 2; m++) { const gx = (GAUGE.x0 + GAUGE.x1) / 2, gy = (GAUGE.y0 + GAUGE.y1) / 2; SHEETS.push({ kind: 'test', t0: 35.4 + m * 0.9, dur: 2.2, L: 16, W: 11, ph: 5 + m, clipZ: GAUGE.z1,
  from: { c: V3(TRAY.x - 10, TRAY.y, 11), d: V3(1, 0, 0), w: V3(0, 1, 0) }, to: { c: V3(gx, gy, GAUGE.z1 + 1), d: V3(0, 0, -1), w: V3(-1, 0, 0) },
  c1: V3(TRAY.x + 20, 74, 66), c2: V3(gx, gy + 2, 70) }); }

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [0, 1, 2].map((i) => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i]); };
const glide = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/** Position d'une feuille à l'instant s : centre, longueur d, largeur w, normale n, courbure (null si elle n'est pas visible). */
export function sheetPose(sh, s) {
  const u = (s - sh.t0) / sh.dur;
  if (u < 0) return null;
  if (u >= 1) return s < (sh.stay ?? 0) ? { c: sh.to.c, d: sh.to.d, w: sh.to.w, n: cross(sh.to.d, sh.to.w), kappa: 0, u: 1, sh } : null;
  const e = glide(u), env = Math.sin(Math.PI * e), tt = s - sh.t0;
  const c = bez(sh.from.c, sh.c1, sh.c2, sh.to.c, e);
  let d = norm(mix(sh.from.d, sh.to.d, e)), w = norm(mix(sh.from.w, sh.to.w, e));
  w = norm(add(w, d, -dot(w, d))); let n = cross(d, w);
  // la feuille ondule : tangage autour de sa largeur, roulis autour de sa longueur
  const b = env * 0.5 * Math.sin(TAU * 1.05 * tt + sh.ph), g = env * 0.28 * Math.sin(TAU * 0.8 * tt + sh.ph * 1.7);
  [d, n] = [norm(add(d.map((x) => x * Math.cos(b)), n, Math.sin(b))), norm(add(n.map((x) => x * Math.cos(b)), d, -Math.sin(b)))];
  [w, n] = [norm(add(w.map((x) => x * Math.cos(g)), n, Math.sin(g))), norm(add(n.map((x) => x * Math.cos(g)), w, -Math.sin(g)))];
  const kappa = env * (1.5 + 0.7 * Math.sin(TAU * 1.35 * tt + sh.ph)) / sh.L;
  return { c, d, w, n, kappa, u, sh };
}
/** Bords gauche et droit de la feuille cintrée (la queue reste plate, la tête s'enroule), coupés sous clipZ si besoin. */
export function sheetRows(p, NT = 10) {
  const { c, d, w, n, kappa } = p, L = p.sh.L, W = p.sh.W, rows = [];
  const arc = (t) => (Math.abs(kappa) < 1e-5 ? [t, 0] : [Math.sin(kappa * t) / kappa, (1 - Math.cos(kappa * t)) / kappa]);
  const [mx, my] = arc(L / 2);
  for (let i = 0; i <= NT; i++) {
    const [ax, ay] = arc((L * i) / NT), P = add(add(c, d, ax - mx), n, ay - my);
    rows.push([add(P, w, -W / 2), add(P, w, W / 2)]);
  }
  const z = p.sh.clipZ;
  if (z === undefined) return rows;
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r[0][2] >= z && r[1][2] >= z) { out.push(r); continue; }
    if (i > 0) { const q = rows[i - 1], k = (q[0][2] - z) / Math.max(1e-6, q[0][2] - r[0][2]); out.push([mix(q[0], r[0], k), mix(q[1], r[1], k)]); }
    break;
  }
  return out;
}
/** Sillage : quelques positions passées du centre de la feuille (le dessin y ajoute une ondulation). */
export function sheetTrail(sh, s, n = 9) {
  const u = (s - sh.t0) / sh.dur;
  if (u <= 0.06 || u >= 0.97) return null;
  const pts = [];
  for (let i = n; i >= 0; i--) { const uu = Math.max(0, u - 0.03 - i * 0.0075); pts.push(bez(sh.from.c, sh.c1, sh.c2, sh.to.c, glide(uu))); }
  return { pts, fade: Math.sin(Math.PI * u) };
}

/** État de toute la machine à l'instant s. */
export function stateAt(s) {
  const o = {};
  const crankTurns = 2.0 * ease(seg(s, 0.5, 9.6)) + 3.0 * ease(seg(s, 10, 15)) + 3.0 * ease(seg(s, 46, 54));
  o.crank = crankTurns * TAU; o.b1 = -o.crank * GEARS.crank.n / GEARS.b1.n;
  o.idle = -o.b1 * GEARS.b1.n / GEARS.idle.n; o.pin = -o.idle * GEARS.idle.n / GEARS.pin.n;
  const ac = ease(seg(s, T.accord[0], T.accord[1]));
  o.slot = o.pin + (1 - ac) * 0.5 * Math.sin(s * 3);
  o.accord = (s > 8.4 && s < 10.4) || (s > 46.8 && s < 54.5);
  o.p2 = -o.b1 * GEARS.b1.n / GEARS.p2.n;
  // anneaux du corpus : l'extérieur suit son pignon ; texte et position avancent à chaque page validée et pendant l'entraînement
  const landed = SHEETS.filter((q) => q.kind === 'valid' && s >= q.t0 + q.dur).length;
  o.corpus = [0, -0.9, 1.3].map((k2, i) => k2 * (0.35 * landed + 2.2 * ease(seg(s, T.train[0], T.train[1]))) + i * 0.4);
  o.corpus[0] = -o.p2 * GEARS.p2.n / GEARS.corpus.n;
  o.p3 = -o.b1 * GEARS.b1.n / GEARS.p3.n; o.d46 = o.p3; o.o20 = -o.d46 * GEARS.d46.n / GEARS.o20.n;
  o.lamps = [0, 1, 2, 3].map((i) => { const a = ((o.b1 + i * TAU / 4) % TAU + TAU) % TAU, d = Math.abs(((a + Math.PI / 2) % TAU + TAU) % TAU - Math.PI); return (s > 2 && s < 9.6) || (s > 46 && s < 54) ? (d > Math.PI - 0.5 || s % 56 > 6 ? 1 : 0) : 0; });
  // cadran à spirale : propositions (bleu) ; l'agent valide (vert) ou corrige (rouge puis orange) ; au nouvel essai, tout se valide
  const p1 = seg(s, T.infer[0], T.infer[1]), p2 = seg(s, 46.5, 51.5), second = s >= T.rerun[0];
  o.spiral = second ? lerp(0.04, 0.96, p2) : lerp(0.04, 0.96, p1);
  o.cells = CELLS.map((c, i) => {
    if (second) { const r = REACH2(c); return s < r ? 0 : s < r + 0.6 ? 4 : 1; }
    if (s < T.infer[0] || lerp(0.04, 0.96, p1) < c) return 0;
    const v = VAL(i);
    if (s < v) return 4;
    if (ERR.includes(i)) return s < v + 1.0 ? 2 : 3;
    return 1;
  });
  o.validated = o.cells.filter((x) => x === 1 || x === 3).length;
  o.sealed = s >= T.freeze[0] + 0.2;
  // flan : les copies du corpus figé s'empilent sur l'axe, la presse en fait un disque ; l'entraînement taille 24 dents
  o.blank = ease(seg(s, 29.4, 29.9));
  o.cut = Math.floor(24 * ease(seg(s, T.train[0], T.train[1])));
  o.index = (o.cut / 24) * TAU;
  o.cutter = s > T.train[0] && s < T.train[1] ? Math.abs(Math.sin((s - T.train[0]) * 9)) : 0;
  o.peg = s >= T.train[1];
  // banc d'essai : deux rapports de test séparés, F1 puis rappel U1 franchissent leur seuil, le voyant passe au vert
  o.f1 = 0.82 * ease(seg(s, 37.4, 38.6)) * (s < T.rerun[0] ? 1 : 0);
  o.u1 = 0.93 * ease(seg(s, 37.8, 39)) * (s < T.rerun[0] ? 1 : 0);
  o.pass = s >= 39 && s < T.rerun[0];
  o.lever = ease(seg(s, 39.2, 39.7)) * (1 - ease(seg(s, 44.8, 45.3)));
  // remplacement : l'ancienne roue du modèle sort par la trappe et rejoint le tableau ; la candidate monte, pivote et descend
  o.oldRise = ease(seg(s, 39.8, 41.2)); o.oldFly = glide(seg(s, 41.2, 42.8));
  o.newFly = glide(seg(s, 40.6, 43)); o.newDrop = ease(seg(s, 43, 44.6));
  o.swap = s >= 39.8 && s < 44.6;
  o.version = s >= 44.6 ? 4 : 3;
  o.card = [ease(seg(s, 0.5, 2.6)), ease(seg(s, 45.2, 47))];
  return o;
}
/** Position (centre, z) de la roue du modèle dans le boîtier pendant l'échange, ou null si l'emplacement est vide. */
export function pinInCase(o) {
  const g = GEARS.pin;
  if (!o.swap) return { z: g.z, which: 'cur' };
  if (o.oldRise < 1) return { z: lerp(g.z, ABOVE, o.oldRise), which: 'old' };
  if (o.newFly >= 1) return { z: lerp(ABOVE, g.z, o.newDrop), which: 'new' };
  return null;
}
/** Roue candidate en vol : centre de sa face arrière, angle de bascule (0 couchée, -90° dressée face à l'avant). */
export function newInFlight(o) {
  if (!(o.newFly > 0 && o.newFly < 1)) return null;
  const e = o.newFly, g = GEARS.pin;
  const c = bez([DIV.x, DIV.y, DIV.z], [DIV.x - 10, DIV.y - 4, ABOVE + 60], [g.u + 30, FY + 20, ABOVE + 40], [g.u, FY, ABOVE], e);
  return { c, alpha: -Math.PI / 2 * ease(seg(e, 0.15, 0.8)) };
}
/** Ancienne roue en vol vers son crochet du tableau (troisième emplacement). */
export function oldInFlight(o) {
  if (!(o.oldFly > 0 && o.oldFly < 1)) return null;
  const e = o.oldFly, g = GEARS.pin, [bu, bz] = BOARD.slots[2];
  return { c: bez([g.u, FY, ABOVE], [g.u + 30, FY + 4, ABOVE + 30], [bu - 10, BOARD.y + 6, bz + 70], [bu, BOARD.y, bz], e) };
}
