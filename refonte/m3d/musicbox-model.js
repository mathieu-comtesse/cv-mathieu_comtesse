// Modèle du Lecteur VRE (boîte à musique), partagé par la figure SVG (figures/build-musicbox.mjs) et la machine 3D (refonte/m3d/vrestudio.js).
// Repère de figure : x vers la droite, y vers l'avant, z vers le haut. Tout est une fonction pure du temps s (boucle de LOOP_T s).
// Le modèle est un cylindre à picots : la position de chaque picot est ce que le modèle a appris. Une page du rapport entre dans le lecteur,
// le cylindre tourne et pince les lamelles du peigne (un champ par lamelle) ; les règles métiers sont l'étouffoir qui coupe les notes
// impossibles ; les pages inédites sortent par la fente du flanc, l'agent les valide une à une sur la table lumineuse (Radiographie) ;
// le corpus figé sert à planter les picots d'un cylindre neuf (entraînement LayoutLMv3), le banc d'essai le joue sur deux rapports
// séparés (F1 ≥ 0,75, rappel U1 ≥ 0,90), le levier publie : l'ancien cylindre rejoint l'étagère des versions, le nouveau descend.
// Tout reste sur l'établi (rebord et cadenas : rien ne sort, tout tourne en local) ; chaque correction part aussi en copie dans la bannette
// partagée, où arrivent celles des autres agents, et nourrit le corpus.
export const TAU = Math.PI * 2;
export const CASE = { x0: -72, x1: 82, y0: -52, y1: 4, h: 84, t: 6 };
export const CYL = { x0: -52, x1: 40, y: -26, z: 58, r: 16 };    // cylindre à picots (axe x) : le modèle
CYL.xc = (CYL.x0 + CYL.x1) / 2;
// Peigne : douze lamelles, une par champ (quatre champs, trois lamelles chacun), pointe au contact des picots à l'angle CONTACT.
export const NT = 12;
export const CONTACT = -0.35;                                    // angle (rad) du contact picot / lamelle, dans le plan (y, z)
export const tx = (i) => CYL.x0 + 5 + i * 7.5;                    // abscisse de la lamelle i et de sa piste sur le cylindre
export const TOOTH = { y0: -2, tip: CYL.y + CYL.r * Math.cos(CONTACT), z: CYL.z + CYL.r * Math.sin(CONTACT), w: 3.6 };
export const IMPOSSIBLE = [3, 8];                                // lamelles que les règles métiers étouffent
// Picots appris : version 3 (cylindre actuel) et version 4 (corrigée par l'agent : cinq picots déplacés ou ajoutés).
const rnd = (() => { let r = 7; return () => (r = (r * 9301 + 49297) % 233280) / 233280; })();
export const PINS3 = Array.from({ length: NT }, (_, i) => Array.from({ length: 4 + (i % 3) }, (_, j) => +(((j + 0.15 + 0.7 * rnd()) / (4 + (i % 3))) * TAU).toFixed(3)));
export const NEWPINS = [[1, 0.9], [4, 2.2], [6, 4.1], [9, 5.4], [10, 3.3]];
export const PINS4 = PINS3.map((a, i) => [...a, ...NEWPINS.filter(([t]) => t === i).map(([, an]) => an)]);
export const PLANT = PINS4.flatMap((a, i) => a.map((an) => ({ i, an }))).sort((p, q) => p.an - q.an);   // ordre de pose sur la machine
export const CELLS = Array.from({ length: 12 }, (_, i) => 0.1 + i * 0.075);
export const FACIA = { z0: 8, z1: 17, y: CASE.y1 + 3 };                          // rampe des douze cases, au bas du devant du boîtier
export const cellX = (i) => -56 + i * 10.6;
export const TRAY = { x: -98, y: 40 };
export const CORPUS_TOP = 14;
export const SHARED = { x: -104, y: 4, w: 22, d: 18, h: 8, stack: 5 };             // bannette des corrections partagées (autres agents)
export const SHARED_TOP = SHARED.h + SHARED.stack * 0.5;
export const RIM = { h: 5, t: 3 };                                               // rebord de l'établi : tout reste en local                                   // dessus de la boîte du corpus
export const EXIT = [CASE.x1 + 8, (CASE.y0 + CASE.y1) / 2, 66];  // bouche de sortie des pages, sur le flanc droit
export const DECK = { x0: 46, x1: CASE.x1, z: CASE.h, h: 3 };                       // plateau du lecteur, au-dessus de la tête de lecture
export const READER = { x0: 52, x1: 76, y0: CYL.y - 14, y1: CYL.y + 14, z0: CASE.h + 3, z1: CASE.h + 17 };   // lecteur : fente d'entrée des rapports
export const READ_SLOT = [(READER.x0 + READER.x1) / 2, CYL.y, READER.z1 + 0.2];
export const DESK = { x0: 38, x1: 60, y0: 12, y1: 38, z: 6 };     // table lumineuse « Radiographie » : l'agent y valide chaque page
export const DESK_C = [(DESK.x0 + DESK.x1) / 2, (DESK.y0 + DESK.y1) / 2, DESK.z + 0.3];
export const DIV = { x: 140, y: 40, z: 9 };                       // machine à planter les picots : le cylindre neuf y est posé
export const BLANK = { x: DIV.x, y: DIV.y, z: DIV.z + CYL.r + 1 };       // axe du cylindre neuf
export const GAUGE = { x0: DIV.x - 32, x1: DIV.x - 14, y0: DIV.y + 17, y1: DIV.y + 23, z1: 24 };
export const LEVER = { x: DIV.x + 42, y: DIV.y + 22, z: 18 };
export const BOARD = { x0: 92, x1: 198, y: -57, z1: 112, slots: [[142, 20], [142, 53], [142, 86]], cy: -36 };   // étagère des versions : v1, v2, puis l'ancien cylindre publié
export const ABOVE = CASE.h + 44;
export const T = { read: [0.5, 4.2], sort: [2, 6], accord: [6, 9.6], infer: [10, 15], valid: [15.4, 25.2], freeze: [25.2, 30.2], train: [30.3, 35.3], evaluate: [35.2, 39], publish: [39.2, 45], rerun: [45.2, 52], gain: [50, 55] };
export const LOOP_T = 56;
export const ERR = [4, 9];
export const TS = [0, 2, 6, 10, 15.4, 25.2, 30.3, 39.2, 45.2];
export const STATIONS = ['Lecture · Document AI', 'Tri des champs · mini-BERT, le peigne', 'Hybride · l\'étouffoir des règles coupe les notes impossibles', 'Inférence · douze pages inédites, des cadres proposés',
  'Validation humaine · Radiographie, chaque correction est partagée', 'Corpus figé · les copies servent à planter les picots', 'Entraînement LayoutLMv3 en local puis évaluation indépendante',
  'Publication explicite · le cylindre du modèle est remplacé', 'Nouvel essai · propositions validées une à une · × 2,3'];
export const stationAt = (s) => { let i = 0; TS.forEach((a, j) => { if (s >= a) i = j; }); return i; };

const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const REACH2 = (c) => 46.5 + 5 * (c - 0.04) / 0.92;              // instant où l'aiguille atteint la case c au nouvel essai

// ---- l'agent : chaque page proposée vient sur la table lumineuse, sa main la tamponne (vert : validée ; rouge puis orange :
// corrigée), la case du cadran change au même instant, puis la page validée part au corpus (les validations enrichissent les exemples) ----
export const EVENTS = (() => {
  const ev = []; let t = T.valid[0] + 0.5;
  CELLS.forEach((c, i) => { const bad = ERR.includes(i); ev.push({ t, i, kind: bad ? 'bad' : 'ok', pass: 1 }); t += 0.6; if (bad) { ev.push({ t, i, kind: 'fix', pass: 1 }); t += 0.6; } });
  let u = 0; CELLS.forEach((c, i) => { u = Math.max(REACH2(c) + 0.6, u + 0.55); ev.push({ t: u, i, kind: 'ok', pass: 2 }); });
  return ev;
})();
const bump = (d) => (d < -0.14 || d > 0.16 ? 0 : d < 0 ? ease((d + 0.14) / 0.14) : 1 - ease(d / 0.16));
// La main de l'agent (Human-in-the-Loop) : la main détourée de « La Création d'Adam » (assets/figures/main-agent.webp, 360 × 192 px,
// bout de l'index au pixel tip, k unités par pixel), posée à plat face au spectateur et inclinée de tilt radians. Elle descend vers chaque
// page de la table lumineuse et la valide du bout de l'index.
export const AGENT = { w: 360, h: 192, tip: [0, 91], k: 0.17, tilt: 0.44 };
/** Bout de l'index de l'agent, contact avec la page (0 → 1), encre en cours ; null hors des validations. */
export function handAt(s) {
  for (const pass of [1, 2]) {
    const ev = EVENTS.filter((e) => e.pass === pass), a = ev[0].t - 1.1, b = ev[ev.length - 1].t + 0.9;
    if (s < a || s > b) continue;
    const away = 1 - ease(seg(s, a, a + 0.6)) * (1 - ease(seg(s, b - 0.6, b)));
    let press = 0, kind = 'ok'; for (const e of ev) { const v = bump(s - e.t); if (v > press) { press = v; kind = e.kind; } }
    const next = ev.find((e) => e.t > s - 0.16) || ev[ev.length - 1];
    return { tip: [DESK_C[0] + 1.5 + 0.6 * Math.sin(s * 2.3) * (1 - press) + 34 * away, DESK_C[1] + 1 + 18 * away, DESK_C[2] + 0.35 + 7 * (1 - press) + 36 * away], press, kind: press > 0 ? kind : next.kind };
  }
  return null;
}

// ---- les feuilles : pages du cadran vers la table puis vers le corpus, copies du corpus figé vers le flan, rapports de test vers le banc ----
const V3 = (x, y, z) => [x, y, z];
export const SHEETS = [];
const flat = (c) => ({ c, d: V3(1, 0, 0), w: V3(0, 1, 0) });
let stack = 0, shared = 0;
// le rapport PDF quitte la pile des rapports à lire, monte et entre dans la fente de lecture (premier passage, puis nouvel essai)
for (const [t0, k] of [[0.2, 0], [0.75, 1], [1.3, 2], [44.9, 3], [45.4, 4], [45.9, 5]]) SHEETS.push({ kind: 'pdf', float: true, t0, dur: 3.2, L: 16, W: 12, ph: 3 + k * 1.7, clipZ: READ_SLOT[2],
  from: flat(V3(TRAY.x - 10, TRAY.y, 11 - (k % 3) * 1.1)), to: { c: V3(READ_SLOT[0], READ_SLOT[1], READ_SLOT[2] - 9), d: V3(0, 0, -1), w: V3(-1, 0, 0) },
  c1: V3(TRAY.x - 18 + (k % 3) * 6, 46 - (k % 3) * 8, 92 + (k % 3) * 8), c2: V3(READ_SLOT[0] - 34 + (k % 3) * 10, READ_SLOT[1] + 30, READ_SLOT[2] + 46 - (k % 3) * 6) });
// chaque page proposée sort par la fente du flanc droit, se pose sur la table lumineuse, puis part au corpus une fois validée
for (const pass of [1, 2]) CELLS.forEach((c, i) => {
  const ev = EVENTS.filter((e) => e.pass === pass && e.i === i), first = ev[0].t, last = ev[ev.length - 1].t;
  const stamps = ev.map((e) => ({ t: e.t, kind: e.kind })), depart = last + 0.25, ph = i * 1.3 + pass;
  SHEETS.push({ kind: 'page', stamps, t0: first - 0.85, dur: 0.7, L: 16, W: 12, ph, stay: depart,
    from: flat(V3(EXIT[0] + 6, EXIT[1], EXIT[2])), to: flat(V3(...DESK_C)), c1: V3(EXIT[0] + 22, EXIT[1] + 14, EXIT[2] + 6), c2: V3(DESK_C[0] + 8, DESK_C[1] + 4, DESK_C[2] + 22) });
  if (ev.length > 1) SHEETS.push({ kind: 'share', stamps, mark: true, float: true, t0: depart + 0.35, dur: 2.4, L: 16, W: 12, ph: ph + 2.1, stay: LOOP_T,
    from: flat(V3(...DESK_C)), to: flat(V3(SHARED.x, SHARED.y, SHARED_TOP + 0.3 + (shared++) * 0.22)), c1: V3(DESK_C[0] - 6, DESK_C[1] + 30, 64), c2: V3(SHARED.x + 40, SHARED.y + 34, 70) });
  SHEETS.push({ kind: 'valid', stamps, mark: ev.length > 1, t0: depart, dur: 1.6, L: 16, W: 12, ph: ph + 0.7, stay: LOOP_T,
    from: flat(V3(...DESK_C)), to: flat(V3(TRAY.x + 12.5, TRAY.y, CORPUS_TOP + 0.3 + (stack++) * 0.22)), c1: V3(DESK_C[0] - 10, DESK_C[1] + 24, 46), c2: V3(TRAY.x + 46, 62, 52) });
});
for (let k = 0; k < 5; k++) { const a = k * 0.5 - 1; SHEETS.push({ kind: 'freeze', t0: 25.7 + k * 0.5, dur: 1.9, L: 16, W: 12, ph: 2 + k * 1.3, stay: 30.2,
  from: flat(k < 2 ? V3(SHARED.x, SHARED.y, SHARED_TOP + 1) : V3(TRAY.x + 12.5, TRAY.y, CORPUS_TOP + 3.2)), to: { c: V3(BLANK.x - 20 + k * 10, BLANK.y, BLANK.z + 12.3 + k * 0.3), d: V3(Math.cos(a), Math.sin(a), 0), w: V3(-Math.sin(a), Math.cos(a), 0) },
  c1: V3(TRAY.x + 46, 66, 62), c2: V3(DIV.x - 44, 66, 62) }); }
for (let m = 0; m < 2; m++) { const gx = (GAUGE.x0 + GAUGE.x1) / 2, gy = (GAUGE.y0 + GAUGE.y1) / 2; SHEETS.push({ kind: 'test', t0: 35.4 + m * 0.9, dur: 2.2, L: 16, W: 11, ph: 5 + m, clipZ: GAUGE.z1,
  from: flat(V3(TRAY.x - 10, TRAY.y, 11)), to: { c: V3(gx, gy, GAUGE.z1 + 1), d: V3(0, 0, -1), w: V3(-1, 0, 0) },
  c1: V3(TRAY.x + 20, 74, 66), c2: V3(gx, gy + 2, 70) }); }
/** Le coup de tampon visible sur une page à l'instant s (dernier tampon reçu), ou null. */
export const stampOf = (sh, s) => { let k = null; for (const q of sh.stamps || []) if (s >= q.t) k = q.kind; return k; };

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
  const fl = sh.float ? 1 : 0, b = env * (0.5 + 0.35 * fl) * Math.sin(TAU * (1.05 - 0.4 * fl) * tt + sh.ph), g = env * (0.28 + 0.3 * fl) * Math.sin(TAU * (0.8 - 0.3 * fl) * tt + sh.ph * 1.7);
  if (fl) { const side = norm(cross(d, [0, 0, 1])), sw = env * 7 * Math.sin(TAU * 0.45 * tt + sh.ph), lift = env * 3.5 * Math.sin(TAU * 0.9 * tt + sh.ph * 0.6); c[0] += side[0] * sw; c[1] += side[1] * sw; c[2] += lift; }
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
  if (z === undefined || p.u < 0.6) return rows;                     // la fente ne coupe la feuille qu'à l'arrivée
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
  const turns = 2.3 * ease(seg(s, 0.5, 9.6)) + 3.2 * ease(seg(s, 10, 15)) + 3.45 * ease(seg(s, 46, 54));
  o.cyl = turns * TAU + 0.3;                                                 // angle de rotation du cylindre à picots
  const ac = ease(seg(s, T.accord[0], T.accord[1]));
  o.damp = (s < T.rerun[0] ? ac : ac) * (s > 8.2 && s < 10.6 || s > 46.4 && s < 54.6 ? 1 : 0);   // l'étouffoir descend sur les notes impossibles
  o.accord = o.damp > 0.5;
  o.version = s >= 44.6 ? 4 : 3;
  const pins = s < 44.6 ? PINS3 : PINS4;
  // lamelles : chaque picot qui vient de passer au contact pince la lamelle, la vibration s'éteint ensuite
  o.pluck = pins.map((a, i) => { let amp = 0; for (const an of a) { const d = ((CONTACT + o.cyl - an) % TAU + TAU) % TAU; amp = Math.max(amp, Math.exp(-d * 5)); } return IMPOSSIBLE.includes(i) && o.damp > 0.5 ? 0 : (turns === 0 ? 0 : amp); });
  // douze cases : propositions (bleu) ; l'agent valide (vert) ou corrige (rouge puis orange) ; au nouvel essai, tout se valide
  const p1 = seg(s, T.infer[0], T.infer[1]), p2 = seg(s, 46.5, 51.5), second = s >= T.rerun[0];
  o.spiral = second ? lerp(0.04, 0.96, p2) : lerp(0.04, 0.96, p1);
  o.cells = CELLS.map((c, i) => {
    if (second) { const e = EVENTS.find((q) => q.pass === 2 && q.i === i); return s < REACH2(c) ? 0 : s < e.t ? 4 : 1; }
    if (s < T.infer[0] || lerp(0.04, 0.96, p1) < c) return 0;
    const ev = EVENTS.filter((e) => e.pass === 1 && e.i === i);
    if (s < ev[0].t) return 4;
    if (ev.length > 1) return s < ev[1].t ? 2 : 3;
    return 1;
  });
  o.validated = o.cells.filter((x) => x === 1 || x === 3).length;
  o.sealed = s >= 25.6;
  // machine à planter : le cylindre neuf, nu, puis un picot après l'autre selon l'ordre du corpus, l'aiguille descend à chaque pose
  const tp = ease(seg(s, T.train[0], T.train[1]));
  o.blank = s >= 29.8 && !(s >= 40.6) ? 1 : 0;
  const k = tp * PLANT.length;
  o.planted = Math.min(PLANT.length, Math.floor(k));
  const cur = PLANT[Math.min(PLANT.length - 1, o.planted)], prev = PLANT[Math.max(0, o.planted - 1)];
  o.divRot = s < T.train[0] ? 0 : s >= T.train[1] ? PLANT[PLANT.length - 1].an : lerp(prev.an, cur.an, ease(Math.min(1, (k - o.planted) * 2.2)));
  o.carriage = s < T.train[0] ? tx(0) : s >= T.train[1] ? tx(PLANT[PLANT.length - 1].i) : lerp(tx(prev.i), tx(cur.i), ease(Math.min(1, (k - o.planted) * 2.2)));
  o.needle = s > T.train[0] && s < T.train[1] ? Math.abs(Math.sin(k * TAU * 1.0 + 0.2)) ** 3 : 0;
  // banc d'essai : deux rapports de test séparés, F1 puis rappel U1 franchissent leur seuil, le voyant passe au vert
  o.f1 = 0.82 * ease(seg(s, 37.4, 38.6)) * (s < T.rerun[0] ? 1 : 0);
  o.u1 = 0.93 * ease(seg(s, 37.8, 39)) * (s < T.rerun[0] ? 1 : 0);
  o.pass = s >= 39 && s < T.rerun[0];
  o.lever = ease(seg(s, 39.2, 39.7)) * (1 - ease(seg(s, 44.8, 45.3)));
  // remplacement : l'ancien cylindre sort par le dessus et rejoint l'étagère ; le nouveau monte, passe au-dessus du boîtier et descend
  o.oldRise = ease(seg(s, 39.8, 41.2)); o.oldFly = glide(seg(s, 41.2, 42.8));
  o.newFly = glide(seg(s, 40.6, 43)); o.newDrop = ease(seg(s, 43, 44.6));
  o.swap = s >= 39.8 && s < 44.6;
  return o;
}
const CYC = [CYL.xc, CYL.y, CYL.z];
/** Centre du cylindre dans le boîtier pendant l'échange (null si l'emplacement est vide). */
export function cylInCase(o) {
  if (!o.swap) return { c: CYC, which: 'cur' };
  if (o.oldRise < 1) return { c: [CYC[0], CYC[1], lerp(CYC[2], ABOVE, o.oldRise)], which: 'old' };
  if (o.newFly >= 1) return { c: [CYC[0], CYC[1], lerp(ABOVE, CYC[2], o.newDrop)], which: 'new' };
  return null;
}
/** Cylindre neuf en vol (axe x gardé) : centre, depuis la machine à planter jusqu'au-dessus du boîtier. */
export function newInFlight(o) {
  if (!(o.newFly > 0 && o.newFly < 1)) return null;
  return { c: bez([BLANK.x, BLANK.y, BLANK.z], [BLANK.x - 6, BLANK.y - 4, ABOVE + 60], [CYC[0] + 40, CYC[1] + 24, ABOVE + 36], [CYC[0], CYC[1], ABOVE], o.newFly) };
}
/** Ancien cylindre en vol vers son emplacement de l'étagère (troisième). */
export function oldInFlight(o) {
  if (!(o.oldFly > 0 && o.oldFly < 1)) return null;
  const [bu, bz] = BOARD.slots[2];
  return { c: bez([CYC[0], CYC[1], ABOVE], [CYC[0] + 30, CYC[1] + 6, ABOVE + 30], [bu - 10, BOARD.cy + 10, bz + 70], [bu, BOARD.cy, bz], o.oldFly) };
}
