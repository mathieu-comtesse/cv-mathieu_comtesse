// La Manufacture de Nisaru : chronologie déterministe. Tout est une fonction pure du temps s (boucle de LOOP_T secondes) :
// chaque pièce lit le même temps, rien ne s'anime de son côté. Repère de figure : x droite, y avant, z haut.
// Démonstration pédagogique : aucune donnée réelle, aucune validation réelle, aucune mesure de performance.
import { clamp, seg, ease, easeOut, easeIn, lerp } from './nisaru-geometry.js';

export const LOOP_T = 130;
export const STEPS = ['Importation', 'Lecture multimodale', 'Interprétation', 'Classification', 'Contrôle des résultats', 'Intervention humaine', 'Mémoire partagée', 'Réentraînement et évaluation', 'Activation et restitution'];
export const TS = [0, 6, 14, 24, 30, 36, 80, 92, 112];
export const stationAt = (s) => { let k = 0; TS.forEach((a, j) => { if (s >= a) k = j; }); return k; };
export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;

/* ---------- cotes communes (repère de figure) ---------- */
export const Z_PAGE = 58, Z_BELT = 50.2, V_BELT = 14;
export const PAGE = { l: 24, w: 17 }, FICHE = { l: 11, w: 15 };
export const BIN_X = [-50, -37, -24, -11, 2];
export const BIN_NAMES = ['OT APPARIES', 'OT INCOMPLETS', 'OBSERVATIONS', 'PAGES Q18 REPETEES', 'NON RECONNUS'];
export const STATION_X = { layout: -166, distil: -136, mini: -106 };
export const CHAMBER = { load: 38, loupe: 64, out: 98, zc: 30.4, tray: [110, 0, 27.6] };
export const DESK_C = [CHAMBER.loupe, 0, CHAMBER.zc];
export const B = [33, 49, 66];                       // début de chaque cycle humain
export const TC = B.map((b) => b + 8.2);             // instant exact du contact de l'index
export const OUTCOME = ['valid', 'fix', 'reject'];

/* ---------- pistes : positions clés [t, x, y, z, tangage, lacet, courbure, mode] ---------- */
const lin = (u) => u;
function modeFn(m) { return m === 'l' ? lin : m === 'o' ? easeOut : m === 'i' ? easeIn : ease; }
export function makeTrack(rows, hold = false) {
  const pose = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, bend: 0, vis: false };
  return (s) => {
    const n = rows.length, a = rows[0], z = rows[n - 1];
    if (s < a[0] || (!hold && s > z[0])) { pose.vis = false; return pose; }
    pose.vis = true;
    if (s >= z[0]) { for (const [k, i] of [['x', 1], ['y', 2], ['z', 3], ['pitch', 4], ['yaw', 5], ['bend', 6]]) pose[k] = z[i] ?? 0; return pose; }
    let i = 0; while (i < n - 2 && s > rows[i + 1][0]) i++;
    const p = rows[i], q = rows[i + 1], u = modeFn(q[7])(seg(s, p[0], q[0]));
    pose.x = lerp(p[1], q[1], u); pose.y = lerp(p[2] ?? 0, q[2] ?? 0, u); pose.z = lerp(p[3], q[3], u);
    pose.pitch = lerp(p[4] ?? 0, q[4] ?? 0, u); pose.yaw = lerp(p[5] ?? 0, q[5] ?? 0, u); pose.bend = lerp(p[6] ?? 0, q[6] ?? 0, u);
    return pose;
  };
}

/* ---------- les pages PDF : six pages, une toutes les 3,4 s ---------- */
export const NP = 6;
export const t0 = (i) => 0.8 + 3.4 * i;
export const pageRows = (i) => { const t = t0(i), P = Z_PAGE; return [
  [t, -218, 0, 55, 0, 0, 0], [t + .5, -213, 0, P + .8, .06, 0, .45, 'o'], [t + 1.8, -190, 0, P + .2, 0, 0, .1, 'l'], [t + 2.9, STATION_X.layout, 0, P, 0, 0, 0, 'o'],
  [t + 5.1, STATION_X.layout, 0, P, 0, 0, 0], [t + 6.3, STATION_X.distil, 0, P, 0, 0, 0], [t + 7.8, STATION_X.distil, 0, P, 0, 0, 0],
  [t + 8.9, STATION_X.mini, 0, P, 0, 0, 0], [t + 10.3, STATION_X.mini, 0, P, 0, 0, 0], [t + 12.0, -79, 0, P, 0, 0, 0, 'o'] ]; };
export const pageTracks = Array.from({ length: NP }, (_, i) => makeTrack(pageRows(i)));
export const pageX = (i, s) => { const r = pageRows(i); return s <= r[0][0] ? r[0][1] : s >= r[r.length - 1][0] ? r[r.length - 1][1] : pageTracks[i](s).x; };

/* fenêtres d'activité des trois organes de lecture, pour chaque page */
export const WIN = {
  layout: (i) => [t0(i) + 2.9, t0(i) + 5.1], distil: (i) => [t0(i) + 6.3, t0(i) + 7.8], mini: (i) => [t0(i) + 8.9, t0(i) + 10.3], store: (i) => [t0(i) + 10.6, t0(i) + 12.0]
};
export const act = (w, s, r = .45) => ease(seg(s, w[0], w[0] + r)) * (1 - ease(seg(s, w[1] - r, w[1])));
export const actAny = (kind, s) => { let v = 0; for (let i = 0; i < NP; i++) v = Math.max(v, act(WIN[kind](i), s)); return v; };
/** page et avancement local dans la fenêtre courante d'un organe (ou -1) */
export function winNow(kind, s) { for (let i = 0; i < NP; i++) { const w = WIN[kind](i); if (s >= w[0] && s <= w[1]) return { i, u: seg(s, w[0], w[1]) }; } return { i: -1, u: 0 }; }

/* ---------- les fiches : l'imprimerie inversée en émet six ---------- */
export const tf = (i) => 11.4 + 3.4 * i;
export const FDEST = [0, 2, 3];                                   // fiches 0 à 2 : bacs OT appariés, observations, pages Q18 répétées
export const trapdoorWindow = (i) => { const xb = BIN_X[FDEST[i]], ta = tf(i) + 1.2 + (xb + 60) / V_BELT; return [ta - 1.1, ta + 1.7, ta]; };
const queueX = [12, -1, -14];
export const binSlot = (i) => { const k = FDEST[i]; let n = 0; for (let j = 0; j < i; j++) if (FDEST[j] === k) n++; return n; };
export const REJECT = { x: 52, y: 52, z: 14.4 };
export function ficheRows(i) {
  const t = tf(i), r = [[t - .5, -84, 0, Z_BELT, 0, 0, 0], [t + 1.2, -60, 0, Z_BELT, 0, 0, 0, 'l']];
  if (i < 3) {
    const k = FDEST[i], xb = BIN_X[k], ta = t + 1.2 + (xb + 60) / V_BELT, zs = 15 + .55 * binSlot(i);
    r.push([ta, xb, 0, Z_BELT, 0, 0, 0, 'l'], [ta + .5, xb, 0, 45, -.5, 0, 0, 'i'], [ta + 1.2, xb, 0, zs, 0, 0, 0, 'o']);
    r.push([LOOP_T - 10, xb, 0, zs], [LOOP_T - 4, xb, 0, zs - 13]);
    return r;
  }
  const j = i - 3, b = B[j], xq = queueX[j], tq = t + 1.2 + (xq + 60) / V_BELT;
  r.push([tq, xq, 0, Z_BELT, 0, 0, 0, 'l']);
  // la file avance quand la fiche précédente quitte la bande
  if (j >= 1) { const adv = B[j - 1] - 1.9; r.push([adv, xq, 0, Z_BELT], [adv + 1.0, queueX[j - 1], 0, Z_BELT, 0, 0, 0, 'l']); }
  if (j >= 2) { const adv = B[j - 1] - 1.9 + 16; r.push([adv - 16 + 16.1 > B[j] - 3 ? B[j] - 3.4 : adv, queueX[j - 1], 0, Z_BELT]); }
  const q = j === 0 ? queueX[0] : queueX[0];
  r.push([b - 3.2, q, 0, Z_BELT], [b - 2.0, 17, 0, Z_BELT, 0, 0, 0, 'l'], [b - 1.6, 19, 0, 49, -.79, 0, 0, 'i'], [b - .1, 36, 0, 31.4, -.79, 0, 0, 'l'], [b + .3, CHAMBER.load, 0, CHAMBER.zc, 0, 0, 0, 'o']);
  r.push([b + 2.2, CHAMBER.loupe, 0, CHAMBER.zc], [b + 10.0, CHAMBER.loupe, 0, CHAMBER.zc]);
  if (j === 0) r.push([b + 12.4, CHAMBER.out, 0, CHAMBER.zc], [b + 14.2, CHAMBER.tray[0], 0, CHAMBER.tray[2] + .1, 0, 0, 0, 'o']);
  else if (j === 1) r.push([b + 12.0, CHAMBER.loupe, 0, CHAMBER.zc], [b + 14.4, CHAMBER.out, 0, CHAMBER.zc], [b + 16.2, CHAMBER.tray[0], 0, CHAMBER.tray[2] + .65, 0, 0, 0, 'o']);
  else r.push([b + 9.2, CHAMBER.loupe, 0, CHAMBER.zc], [b + 10.4, CHAMBER.loupe, 7, CHAMBER.zc - 1.6, 0, 0, 0, 'i'], [b + 11.6, REJECT.x, REJECT.y, REJECT.z, 0, 0, 0, 'i'], [LOOP_T - 8, REJECT.x, REJECT.y, REJECT.z], [LOOP_T - 3, REJECT.x, REJECT.y, 8.6, 0, 0, 0, 'i']);
  if (j < 2) for (const q of registerRows(j)) r.push(q);                 /* la fiche validée ou corrigée part au registre (séquence 7) */
  return r;
}
/* trajet des fiches validées de la corbeille vers le registre (séquence 7), puis de nouveau vers la presse (séquence 9) */
export const REG = { x: 150, y: 0, z: 58, r: 30 };
export const registerRows = (n) => { const a = 80 + 6 * n; return [
  [a, CHAMBER.tray[0], 0, CHAMBER.tray[2] + .1 + .55 * n, 0], [a + 1.2, 114, 0, 42, .9, 0, 0, 'o'], [a + 2.3, 132, 0, 70, 1.3], [a + 3.0, 148.5, 0, 90.5, .2, 0, 0, 'o'], [a + 3.8, 150, 0, 83, 0, 0, 0, 'i'] ]; };
export const PRESS = { x: 196, y: 66, z: 20 };
export const outRows = (n) => { const a = 119 + 1.8 * n; return [
  [a, 164, 8, 25, 0], [a + 1.4, 172, 36, 26, -.1, 0, 0, 'o'], [a + 2.7, PRESS.x - 14, PRESS.y, PRESS.z + 8, 0, 0, 0, 'o'], [a + 3.6, PRESS.x - 2, PRESS.y, PRESS.z + 2.4, 0, 0, 0, 'i'],
  [a + 6.2, PRESS.x - 2, PRESS.y, PRESS.z + 2.4], [a + 7.6, PRESS.x + 28, PRESS.y, PRESS.z + 2.4, 0, 0, 0, 'o'] ]; };
export const pagesOut = { t: 122.6 };                 // la presse fait sortir le registre structuré

export const fichePoses = Array.from({ length: 6 }, (_, i) => {
  const rows = ficheRows(i); rows.sort((a, b) => a[0] - b[0]);
  // pour les fiches humaines : on retire les lignes de file redondantes et on garde l'ordre chronologique
  const clean = []; for (const r of rows) if (!clean.length || r[0] > clean[clean.length - 1][0] + 1e-3) clean.push(r);
  return makeTrack(clean, !(i === 3 || i === 4));
});
export const outTrack = [0, 1].map((n) => makeTrack(outRows(n)));

/* ---------- la chambre : chariot, loupe, tête de correction, plateau basculant ---------- */
export function chamber(s) {
  let x = CHAMBER.load, tilt = 0, head = 0, lens = 0, deskLight = 0;
  for (let j = 0; j < 3; j++) {
    const b = B[j];
    if (s >= b + .3) { // le chariot suit sa fiche
      if (s < b + 2.2) x = lerp(CHAMBER.load, CHAMBER.loupe, ease(seg(s, b, b + 2.2)));
      else if (j === 0 && s >= b + 10) x = s < b + 12.4 ? lerp(CHAMBER.loupe, CHAMBER.out, ease(seg(s, b + 10, b + 12.4))) : lerp(CHAMBER.out, CHAMBER.load, ease(seg(s, b + 12.6, b + 15)));
      else if (j === 1 && s >= b + 12) x = s < b + 14.4 ? lerp(CHAMBER.loupe, CHAMBER.out, ease(seg(s, b + 12, b + 14.4))) : lerp(CHAMBER.out, CHAMBER.load, ease(seg(s, b + 14.6, b + 17)));
      else if (j === 2 && s >= b + 12.6) x = lerp(CHAMBER.loupe, CHAMBER.load, ease(seg(s, b + 12.6, b + 15)));
      else x = CHAMBER.loupe;
      const eb = j === 2 ? b : 0;
      if (j === 2) tilt = Math.max(tilt, ease(seg(s, b + 9.2, b + 10.4)) * (1 - ease(seg(s, b + 11.8, b + 12.8))));
      lens = Math.max(lens, ease(seg(s, b + 2.2, b + 3.4)) * (1 - ease(seg(s, b + (j === 1 ? 14 : j === 0 ? 12 : 11.6), b + (j === 1 ? 15 : j === 0 ? 13 : 12.6)))));
      deskLight = Math.max(deskLight, ease(seg(s, b + 2.0, b + 3.2)) * (1 - ease(seg(s, b + 12.2, b + 13.2))));
      if (j === 1) head = Math.max(head, ease(seg(s, b + 8.6, b + 9.4)) * (1 - ease(seg(s, b + 11.0, b + 11.8))));
    }
  }
  return { x, tilt, head, lens, deskLight };
}
/** balayage de la tête de correction (position y en unités) pendant le cycle de correction */
export const headSweep = (s) => { const b = B[1] + 8.6; return Math.sin(clamp(s - b, 0, 3) * 5.2) * 6; };

/* ---------- la main de La Création : contacts et résultats ---------- */
export const HAND_EVENTS = TC.map((t, j) => ({ t, kind: OUTCOME[j] }));

/* ---------- registre rotatif, mémoire partagée ---------- */
export function register(s) {
  const steps = [seg(s, 83.8, 85.4), seg(s, 89.8, 91.4)];
  const ang = (ease(steps[0]) + ease(steps[1])) * (Math.PI / 4);
  const back = 1 - ease(seg(s, LOOP_T - 4, LOOP_T - .4));           // remise à zéro de l'archive en fin de boucle
  const open = Math.max(ease(seg(s, 83.0, 83.8)) * (1 - ease(seg(s, 84.2, 85.0))), ease(seg(s, 89.0, 89.8)) * (1 - ease(seg(s, 90.2, 91.0))));
  const count = (s >= 84.2 ? 1 : 0) + (s >= 90.2 ? 1 : 0);
  return { ang: ang * back, open, count: s > LOOP_T - 4 ? count * back : count };
}

/* ---------- forge des modèles : séquence 8 ; activation et restauration : séquence 9 ---------- */
export const FORGE = { x: 232, yCand: -22, yServ: -48, yMag: -74, zLow: 38, zHigh: 130, zRail: 150 };
export function forge(s) {
  const prep = seg(s, 92, 95), load = seg(s, 95, 98.2), head = seg(s, 98.4, 100.4), train = seg(s, 100.6, 106.8), save = seg(s, 107, 108.2), evalu = seg(s, 108.4, 111.6);
  const accept = ease(seg(s, 112, 113.2)), lockOpen = ease(seg(s, 113.2, 114)) * (1 - ease(seg(s, 118.5, 119)));
  // transfert : A actif -> magasin (haut), candidat -> service ; puis restauration en sens inverse
  const out = (a, b) => ease(seg(s, a, b));
  const swapA = out(114, 119) * (1 - out(125.6, 129.8)), swapB = out(116, 120.4) * (1 - out(124.6, 129.0));
  const lamps = [ease(seg(s, 92.4, 93)) * (1 - ease(seg(s, LOOP_T - 3, LOOP_T - .5))), ease(seg(s, 95.6, 96.2)) * (1 - ease(seg(s, LOOP_T - 3, LOOP_T - .5))), ease(seg(s, 106.6, 107)) * (1 - ease(seg(s, LOOP_T - 3, LOOP_T - .5))), ease(seg(s, 108, 108.4)) * (1 - ease(seg(s, LOOP_T - 3, LOOP_T - .5))), ease(seg(s, 111.4, 111.8)) * (1 - ease(seg(s, LOOP_T - 3, LOOP_T - .5))), ease(seg(s, 119.2, 119.7)) * (1 - ease(seg(s, 125, 125.6)))];
  return { prep, load, head, train, save, evalu, accept, lockOpen, swapA, swapB, lamps, restore: out(124.6, 125.8) * (1 - out(129.6, 129.9)), hoist: ease(seg(s, 113.4, 114)) };
}
/** motif de la matrice du candidat : pas d'écart avant l'entraînement profond, motif appris après, retour au motif d'origine à la restauration */
export const patternMix = (s) => { const t = forge(s); return clamp(t.train) * (1 - ease(seg(s, 127.2, 129.6))); };
export const cassettePattern = (k) => { const h = Math.imul(k + 7, 2654435761) >>> 0; return ((h >>> 12) % 5 - 2) / 2; };      // -1 à 1
/** banc d'essai : les deux cadrans et le voyant */
export function bench(s) {
  const e = seg(s, 108.4, 111.6), pass = ease(seg(s, 111.2, 111.8)) * (1 - ease(seg(s, 125, 125.6)));
  return { f1: .12 + .72 * ease(seg(e, .05, .7)) * (1 - ease(seg(s, 127, 129.6))), u1: .12 + .8 * ease(seg(e, .25, .95)) * (1 - ease(seg(s, 127, 129.6))), pass, fiches: e };
}
/** presse : S9 */
export function press(s) {
  const cyc = (a) => ease(seg(s, a, a + .8)) * (1 - ease(seg(s, a + 1.2, a + 2)));
  return { platen: Math.max(cyc(122.6), cyc(124.2)), roll: seg(s, 119, 126) };
}
