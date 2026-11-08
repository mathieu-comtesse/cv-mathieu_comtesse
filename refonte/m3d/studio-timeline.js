// Studio d'extracteurs PDF : chronologie pure (fonction du temps partagé). Données fictives.
// Scénario A : essai réussi. Scénario B : l'essai échoue, la cartouche est rejetée, le cadre fautif est corrigé sur l'établi.
// Un exemple de PDF est posé sur la table lumineuse, un portique place trois cadres de détection, une tête de découpe taille le gabarit,
// la presse forme la cartouche de configuration (jamais des poids de modèle), le lecteur la reçoit et compare un nouveau document aux valeurs attendues.
import { clamp, seg, ease, easeOut } from './nisaru-geometry.js';

export const SC_T = 66, LOOP_T = SC_T * 3;
/* C : « Mon cadrage ». Les trois cadres sont à déplacer par le visiteur ; la cartouche est livrée si chaque cadre couvre assez son champ du PDF, rejetée sinon. */
export const EDIT_T = 16.2;                          // instant où les trois cadres sont posés, avant la découpe du gabarit
export const SCEN = [
  { id: 'A', ok: true, nudge: false, short: 'Essai réussi', label: 'Essai réussi : la cartouche est livrée' },
  { id: 'B', ok: false, nudge: true, short: 'Avec correction', label: 'Essai en écart : correction du cadre sur l\'établi' },
  { id: 'C', custom: true, nudge: false, edit: true, editT: EDIT_T, short: 'Mon cadrage', label: 'Mon cadrage : je place les trois cadres, la cartouche est livrée ou rejetée selon leur couverture', get ok() { return coverage().ok; } }
];
export const SHEET = { x: -165, y: 0, z: 33.4, w: 64, d: 84 };
export const CARD0 = { x: -75, y: 0, z: 33.6 }, PRESS_X = 45, CARD_Z_PRESS = 34.6;
export const FRAMES = [
  { dx: -12, dy: -26, w: 30, d: 9, name: 'OT' }, { dx: 8, dy: -4, w: 34, d: 12, name: 'DATE' }, { dx: -6, dy: 22, w: 26, d: 14, name: 'MONTANT' }
];
/* champs du PDF = positions d'origine (BASE) ; LIVE = cadres du visiteur (scénario C) */
export const BASE = FRAMES.map((f) => ({ dx: f.dx, dy: f.dy })), LIVE = FRAMES.map((f) => ({ dx: f.dx, dy: f.dy }));
export const pos = (i, sc) => (sc && sc.custom ? LIVE[i] : FRAMES[i]);
export const TARGET = (i, nudge = 0, sc = null) => { const p = pos(i, sc); return [SHEET.x + p.dx + (i === 1 ? 2.6 * nudge : 0), SHEET.y + p.dy + (i === 1 ? -2.2 * nudge : 0)]; };
/** part du champ couverte par chaque cadre (recouvrement de deux rectangles de même taille) ; conforme si chacun couvre au moins 80 % */
export function coverage() {
  const per = FRAMES.map((f, i) => Math.max(0, f.w - Math.abs(LIVE[i].dx - BASE[i].dx)) * Math.max(0, f.d - Math.abs(LIVE[i].dy - BASE[i].dy)) / (f.w * f.d));
  return { per, mean: per.reduce((a, b) => a + b, 0) / per.length, ok: per.every((v) => v >= .8) };
}
/** déplace le cadre i (centre, relatif à l'exemple) en le gardant sur la feuille ; reconstruit la trajectoire du portique */
export function setFrame(i, dx, dy) {
  const f = FRAMES[i], mx = SHEET.w / 2 - f.w / 2, my = SHEET.d / 2 - f.d / 2;
  LIVE[i].dx = clamp(dx, -mx, mx); LIVE[i].dy = clamp(dy, -my, my); HK[2] = buildHead(SCEN[2]);
}
export function resetFrames() { FRAMES.forEach((f, i) => { LIVE[i].dx = BASE[i].dx; LIVE[i].dy = BASE[i].dy; }); HK[2] = buildHead(SCEN[2]); }
export const DOCK = (i) => [-200 + i * 35, 60];
export const PARK = [-205, 0];
export const CARD_DX = CARD0.x - SHEET.x;                 // décalage du gabarit par rapport à l'exemple

const PICK = (i) => 3.5 + 4.2 * i, CUT = (j) => 16.6 + 3.0 * j;
export const K = {
  sheetIn: [.6, 3.2], lamp: [2.4, 60], cardGo: [27.2, 32.8], press: [33.2, 37.2], stamp: 35.2, cardBack: [37.8, 43.2], rise: [37.6, 38.6], push: [38.8, 40.6], slide: [40.6, 44.4],
  pageIn: [44.8, 47.2], scan: [47.2, 50.2], extract: [49, 51.6], compare: [51.8, 54.2], decide: [54.4, 57.2], nudge: [57.4, 61], retract: [61, 65], fade: [60.6, 65.2]
};
export const STEPS = ['Exemple PDF', 'Cadres', 'Gabarit', 'Presse', 'Cartouche', 'Essai', 'Résultat'];
export const STEP_T = [.8, 3.5, 16.6, 33.2, 40, 44.8, 52];

export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 3 : forced; return { k, u: w % SC_T, sc: SCEN[k] }; };
export const stepAt = (u) => { let s = 0; for (let i = 0; i < STEP_T.length; i++) if (u >= STEP_T[i]) s = i; return s; };

const io = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const lerp = (a, b, f) => a + (b - a) * f;

/* ---------- tête du portique : trajectoire par points clés (temps, x, y) ---------- */
function buildHead(sc) {
  const k = [[0, PARK[0], PARK[1]]]; let cx = PARK[0], cy = PARK[1];
  const go = (a, b, x, y) => { k.push([a, cx, cy]); k.push([b, x, y]); cx = x; cy = y; };
  for (let i = 0; i < 3; i++) { const t0 = PICK(i), d = DOCK(i), tg = TARGET(i, 0, sc); go(t0, t0 + 1.1, d[0], d[1] - 0); go(t0 + 2.1, t0 + 3.3, tg[0], tg[1]); }
  for (let j = 0; j < 3; j++) {
    const c0 = CUT(j), tg = TARGET(j, 0, sc), w = FRAMES[j].w - 4;
    go(c0, c0 + 1.0, tg[0] + CARD_DX - w / 2, tg[1] + 9); go(c0 + 1.4, c0 + 2.4, tg[0] + CARD_DX + w / 2, tg[1] + 9);
  }
  go(25.4, 27, PARK[0], PARK[1]);
  if (sc.nudge) { const t1 = TARGET(1), t2 = TARGET(1, 1); go(K.nudge[0] - .2, K.nudge[0] + 1.2, t1[0], t1[1]); go(K.nudge[0] + 2.2, K.nudge[0] + 3.2, t2[0], t2[1]); go(K.nudge[1] - .1, K.nudge[1] + 1.4, PARK[0], PARK[1]); }
  k.sort((a, b) => a[0] - b[0]); return k;
}
const HK = [buildHead(SCEN[0]), buildHead(SCEN[1]), buildHead(SCEN[2])];
function headXY(u, sc) {
  const k = HK[SCEN.indexOf(sc)];
  for (let i = 0; i + 1 < k.length; i++) if (u >= k[i][0] && u < k[i + 1][0]) { const f = io(seg(u, k[i][0], k[i + 1][0])); return [lerp(k[i][1], k[i + 1][1], f), lerp(k[i][2], k[i + 1][2], f)]; }
  const l = k[k.length - 1]; return [l[1], l[2]];
}
const trap = (u, a1, a2, b1, b2) => seg(u, a1, a2) * (1 - seg(u, b1, b2));

/** état du portique : position de la tête, profondeur des deux outils (pince, fraise), cadre porté, rotation de la molette */
export function head(u, sc) {
  const [x, y] = headXY(u, sc);
  let g = 0, carried = -1;
  for (let i = 0; i < 3; i++) { const t = PICK(i); g = Math.max(g, trap(u, t + 1.1, t + 1.6, t + 1.6, t + 2.1), trap(u, t + 3.3, t + 3.7, t + 3.7, t + 4.2)); if (u >= t + 1.6 && u < t + 3.7) carried = i; }
  let c = 0; for (let j = 0; j < 3; j++) { const t = CUT(j); c = Math.max(c, trap(u, t + 1.0, t + 1.4, t + 2.4, t + 2.8)); }
  if (sc.nudge) { const t = K.nudge[0]; g = Math.max(g, trap(u, t + 1.2, t + 1.7, t + 3.2, t + 3.7)); if (u >= t + 1.7 && u < t + 3.2) carried = 1; }
  return { x, y, grip: g, cut: c, carried, mol: (x + y * .7) / 4 };
}
/** cadre i : { x, y, z } ; au repos sur l'étagère, porté par la pince, posé sur l'exemple, puis rentré */
export function frame(i, u, sc) {
  const h = head(u, sc), t = PICK(i), d = DOCK(i), tg = TARGET(i, 0, sc), nud = sc.nudge ? io(seg(u, K.nudge[0] + 2.2, K.nudge[0] + 3.2)) : 0, tg2 = TARGET(i, nud, sc);
  let p, z = 33.8;
  if (u < t + 1.6) p = d;
  else if (u < t + 3.7) { p = [h.x, h.y]; z = 33.8 + 9.6 * (1 - h.grip); }
  else p = tg2;
  if (i === 1 && sc.nudge && h.carried === 1 && u >= K.nudge[0] + 1.7) { p = [h.x, h.y]; z = 33.8 + 9.6 * (1 - h.grip); }
  const r = seg(u, K.retract[0] + i * .35, K.retract[1] - (2 - i) * .35);
  if (r > 0) { const e = io(r), from = p; p = [lerp(from[0], d[0], e), lerp(from[1], d[1], e)]; }
  return { x: p[0], y: p[1], z };
}
/** fenêtres déjà découpées dans le gabarit : avancement de chaque découpe (0 à 1) puis effacement de la démonstration */
export const cutProgress = (j, u) => seg(u, CUT(j) + 1.4, CUT(j) + 2.4);
export const cutFade = (u) => 1 - seg(u, K.fade[0], K.fade[1]);

/** exemple PDF et gabarit (feuilles) */
export function sheet(u) {
  const a = seg(u, K.sheetIn[0], K.sheetIn[1]), out = seg(u, K.fade[0] + .2, K.fade[1]);
  return { x: lerp(-228, SHEET.x, ease(a)), vis: u >= K.sheetIn[0] && out < 1, alpha: 1 - out, z: SHEET.z - 6 * out };
}
export function card(u) {
  const f = io(seg(u, K.cardGo[0], K.cardGo[1])), b = io(seg(u, K.cardBack[0], K.cardBack[1]));
  const x = lerp(CARD0.x, PRESS_X, f) + (PRESS_X - CARD0.x) * 0 - (PRESS_X - CARD0.x) * b;
  const zUp = ease(seg(u, K.cardGo[0] + .4, K.cardGo[0] + 1.2)) * (1 - ease(seg(u, K.cardBack[1] - 1.2, K.cardBack[1] - .4)));
  return { x, z: CARD0.z + (CARD_Z_PRESS - CARD0.z) * zUp, alpha: cutFade(u) < 1 ? .25 + .75 * cutFade(u) : 1 };
}
export const lampTable = (u) => ease(seg(u, K.lamp[0], K.lamp[0] + 1.2)) * (1 - seg(u, K.fade[1] - .6, K.fade[1]));

/** presse : manette (0 à 1), course du coulisseau (0 à 1), éjecteur de cartouche, poussoir */
export function press(u) {
  const lever = Math.sin(Math.PI * clamp(seg(u, K.press[0], K.press[1])));
  const ram = lever < .02 ? 0 : Math.min(1, lever * 1.25);
  return { lever, ram, stamped: u >= K.stamp };
}
export const rise = (u) => ease(seg(u, K.rise[0], K.rise[1]));

/** hauteur du centre de la cartouche le long de la rampe (descend de la presse au lecteur) */
export const rampZ = (x) => (x < 70 ? 38 : x < 128 ? 38 - 6 * (x - 70) / 58 : 32);
/** poussoir : course libre, poussée, retour (x du plateau) */
export const pusherX = (u) => 20 + 11 * io(seg(u, K.push[0] - 1.1, K.push[0])) + 25 * io(seg(u, K.push[0], K.push[1])) - 36 * io(seg(u, K.push[1] + .2, K.push[1] + 1.6));
/** cartouche : sort de la presse, glisse sur la rampe, se range dans le lecteur puis part en livraison (A) ou au rebut (B) */
export function cartridge(u, sc) {
  if (u < K.rise[0] || u >= K.fade[0] + 2) return { vis: false };
  const up = rise(u), push = io(seg(u, K.push[0], K.push[1])), sl = seg(u, K.slide[0], K.slide[1]), dec = io(seg(u, K.decide[0], K.decide[1]));
  let x = PRESS_X, y = 0, z = 26 + 12 * up;
  if (u >= K.push[0]) x = PRESS_X + 25 * push;
  if (u >= K.slide[0]) { x = lerp(70, 160, sl * sl); y = lerp(0, 20, seg(x, 70, 110)); z = rampZ(x); }
  if (u >= K.decide[0]) { if (sc.ok) { x = 160 + 70 * dec; y = 20; z = 32; } else { x = 160; y = 20 + 52 * dec; z = 32; } }
  return { vis: true, x, y, z };
}
/** nouveau document dans le lecteur */
export function page(u) {
  const a = io(seg(u, K.pageIn[0], K.pageIn[1])), b = io(seg(u, K.decide[0] + .6, K.decide[1] + .2));
  return { x: lerp(228, 172, a) - 40 * b, vis: u >= K.pageIn[0] && b < 1 };
}
export const scanBar = (u) => { const v = seg(u, K.scan[0], K.scan[1]); return { on: u >= K.scan[0] && u < K.scan[1], f: v < .5 ? v * 2 : 2 - v * 2 }; };
/** mesures de démonstration : valeurs attendues et obtenues, aiguilles et voyants */
export function gauges(u, sc) {
  const e = io(seg(u, K.extract[0], K.extract[1])), c = io(seg(u, K.compare[0], K.compare[1])), clear = seg(u, K.fade[0], K.fade[1]);
  const expect = 1, got = sc.custom ? coverage().mean : sc.ok ? 1 : .62;
  return { expect: expect * e * (1 - clear), got: got * c * (1 - clear), ok: sc.ok && u >= K.compare[1] && u < K.fade[0] + 2 ? 1 : 0, bad: !sc.ok && u >= K.compare[1] && u < K.fade[0] + 2 ? 1 : 0, busy: u >= K.pageIn[0] && u < K.compare[1] ? .6 + .4 * Math.sin(u * 8) : 0 };
}
export const slip = (u, sc) => (sc.ok ? io(seg(u, K.decide[0] + 1, K.decide[0] + 2.8)) * (1 - io(seg(u, K.fade[0] + 1, K.fade[1]))) : 0);
export const values = (u, sc) => ({ read: seg(u, K.extract[0], K.extract[1]) > .02, fade: 1 - seg(u, K.fade[0], K.fade[1]) });
