// CERFA v3 : chronologie pure (fonction du temps partagé). Documents, anomalies et compteurs sont fictifs.
// Un lot de dix feuilles est séparé une à une, lu dans la chambre optique, contrôlé par le module F-Gas, puis poussé par le poussoir du bac correspondant.
import { clamp, seg, ease, easeOut } from './nisaru-geometry.js';

export const SC_T = 64, LOOP_T = SC_T * 2, N = 10;
export const DESTS = ['EXPLOITABLE', 'INCOMPLET', 'DOUBLON', 'ANOMALIE', 'NON RECONNU'];
export const SCEN = [
  { id: 'A', short: 'Lot courant', label: 'Lot courant : cinq feuilles exploitables, un doublon, un document non reconnu', dests: [0, 0, 1, 0, 2, 0, 3, 4, 0, 1], dial: 0 },
  { id: 'B', short: 'Contrôle F-Gas', label: 'Contrôle F-Gas : attestations à échéance dépassée', dests: [0, 3, 0, 3, 1, 0, 3, 0, 0, 4], dial: 1 }
];
export const BIN_X = [22, 50, 78, 106, 134], BELT = { x0: -120, x1: 150, z: 42 }, CH_X = -25, HOP_X = -146, STEP = 5, S0 = 4;
export const STEPS = ['Lot déposé', 'Séparation', 'Lecture', 'Contrôle F-Gas', 'Aiguillage', 'Registre'], STEP_T = [.5, 5, 7, 7.6, 10, 14];
const R = 4, L = 2 * Math.PI * R;          // rayon des rouleaux et poulies, circonférence

export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 2 : forced; return { k, u: w % SC_T, sc: SCEN[k] }; };
export const stepAt = (u) => { let s = 0; STEP_T.forEach((t, i) => { if (u >= t) s = i; }); return s; };
const sm = (x) => ease(clamp(x));
const io = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const lerp = (a, b, f) => a + (b - a) * f;

/** calendrier d'une feuille : jalons en secondes depuis le début du scénario */
export function times(i, sc) {
  const s = S0 + STEP * i, d = sc.dests[i], xk = BIN_X[d], dur4 = 1.6 + .015 * (xk - CH_X);
  const push = s + 4.0 + dur4;
  return { s, d, xk, sep: [s, s + 1.2], go: [s + 1.2, s + 2.8], scan: [s + 2.9, s + 3.7], leave: [s + 4.0, s + 4.0 + dur4], push: [push, push + 1.0], fall: [push + .5, push + 1.4], done: push + 1.4 };
}
export const SCAN_END = 3.7;

/** position d'une feuille : { vis, x, y, z } ; au-dessus de la pile, sur la bande, dans la chambre, devant son bac puis dans le bac */
export function sheet(i, u, sc) {
  const t = times(i, sc), z0 = 40 + .4 * (N - i) - .2, zb = BELT.z + .3;
  if (u < t.s - .01) return { vis: false };
  let x, y = 0, z = zb;
  if (u < t.go[0]) { const f = io(seg(u, t.sep[0], t.sep[1])); x = lerp(HOP_X, -118, f); z = lerp(z0, zb, f); }
  else if (u < t.leave[0]) { x = lerp(-118, CH_X, io(seg(u, t.go[0], t.go[1]))); }
  else if (u < t.leave[1]) { x = lerp(CH_X, t.xk, io(seg(u, t.leave[0], t.leave[1]))); }
  else {
    x = t.xk; const p = sm(seg(u, t.push[0], t.push[0] + .55)); y = 36 * p;
    const stackTop = 8 + .9 * countBefore(i, t.d, sc);
    if (u >= t.fall[0]) z = lerp(zb, stackTop, ease(seg(u, t.fall[0], t.fall[1])) ** 1.2);
    if (u >= t.done) return { vis: false };
  }
  return { vis: true, x, y, z, hidden: y > 8 && u < t.fall[0] };
}
const countBefore = (i, d, sc) => sc.dests.slice(0, i).filter((x) => x === d).length;

/** poussoir du bac k : avance (0 à 1) */
export function pusher(k, u, sc) {
  let a = 0;
  for (let i = 0; i < N; i++) { const t = times(i, sc); if (t.d === k) a = Math.max(a, sm(seg(u, t.push[0], t.push[0] + .55)) * (1 - sm(seg(u, t.push[0] + .55, t.push[1])))); }
  return a;
}
/** compteurs (valeur de tambour, 10 équivaut à 0), hauteur de pile, bac en train de recevoir */
export function bins(u, sc) {
  const reset = sm(seg(u, 59, 61.5)), out = [];
  for (let k = 0; k < 5; k++) {
    let c = 0, h = 0, lit = 0;
    for (let i = 0; i < N; i++) { const t = times(i, sc); if (t.d === k) { c += sm(seg(u, t.fall[1] - .2, t.fall[1] + .4)); h += sm(seg(u, t.fall[1] - .1, t.fall[1] + .1)); lit = Math.max(lit, u > t.leave[1] - .4 && u < t.done ? 1 : 0); } }
    out.push({ count: c + (c ? (10 - c) * reset : 0), stack: h * (1 - reset), lit });
  }
  return out;
}
/** nombre de feuilles lues et rangées dans le registre structuré (rang, destination) ; effacement en fin de lot */
export function register(u, sc) {
  const rows = []; for (let i = 0; i < N; i++) { const t = times(i, sc); if (u >= t.push[0]) rows.push({ i, d: t.d }); }
  return { rows, fade: 1 - seg(u, 59.5, 62) };
}
/** lecture : balayage (0 à 1), champs reconnus, famille, F-Gas (drapeau, voyants) ; une seule feuille à la fois dans la chambre */
export function reading(u, sc) {
  for (let i = 0; i < N; i++) {
    const t = times(i, sc), a = t.go[1], b = t.leave[0] + .3;
    if (u >= a && u < b) {
      const bar = seg(u, t.scan[0], t.scan[1]), f = [0, 1, 2].map((j) => sm(seg(u, t.scan[0] + .1 + .25 * j, t.scan[0] + .3 + .25 * j)) * (u < t.leave[0] ? 1 : 0));
      const anomaly = t.d === 3, fg = seg(u, t.scan[1] - .5, t.scan[1] + .3);
      return { on: true, i, bar: bar < 1 ? bar : 1, scanning: u >= t.scan[0] && u < t.scan[1], fields: f, family: u >= t.scan[1], flag: anomaly ? sm(fg) : 0, fgOk: !anomaly ? sm(fg) : 0, fgLamps: [fg > .1 ? 1 : 0, fg > .4 ? 1 : 0, fg > .7 ? 1 : 0] };
    }
  }
  return { on: false, i: -1, bar: 0, scanning: false, fields: [0, 0, 0], family: false, flag: 0, fgOk: 0, fgLamps: [0, 0, 0] };
}
/** pile de la trémie (0 à 1) : se vide à chaque séparation, se reforme par le plateau élévateur en fin de scénario */
export function hopper(u, sc) {
  if (u < 59.5) { let taken = 0; for (let i = 0; i < N; i++) if (u >= times(i, sc).s) taken++; return (N - taken) / N; }
  if (u < 61) return 0;
  return sm(seg(u, 61, 63.5));
}
/** angle total parcouru par la bande (continu d'une boucle à l'autre : compensé à la fin du lot pour revenir à un multiple de la période) */
export function belt(u, sc) {
  let sum = 0;
  for (let i = 0; i < N; i++) { const t = times(i, sc); if (u >= t.s) sum += travelled(i, u, sc); }
  return sum + comp(sc) * sm(seg(u, 59, 62));
}
function travelled(i, u, sc) { const t = times(i, sc); let d = 0; d += 28 * io(seg(u, t.sep[0], t.sep[1])); d += 93 * io(seg(u, t.go[0], t.go[1])); d += (t.xk - CH_X) * io(seg(u, t.leave[0], t.leave[1])); return d; }
const total = (sc) => sc.dests.reduce((a, d) => a + 28 + 93 + (BIN_X[d] - CH_X), 0);
const comp = (sc) => Math.ceil(total(sc) / L) * L - total(sc);
export const ROLL_R = R, ROLL_L = L;
/** tracé du dessus de bande : décalage de texture (unités de longueur) */
export const dialAngle = (u, k, forced) => { const a = [0, 1.05], prev = forced == null ? a[(k + 1) % 2] : a[k]; return lerp(prev, a[k], sm(seg(u, 0, 2))); };
