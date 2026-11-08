// Extracteur VRE : chronologie pure (fonction du temps partagé). Bâtiments, locaux et comptages sont fictifs.
// Une feuille de rapport est lue ligne à ligne ; chaque équipement reconnu fait pivoter l'aiguillage vers sa famille, le tambour libère une bille qui roule dans une gouttière puis tombe dans
// la colonne correspondante ; un compteur mécanique avance d'une unité. Un contrôle compare les totaux ; un volet de rejet éjecte une bille mal classée (scénario C).
import { clamp, seg, ease } from './nisaru-geometry.js';

export const SC_T = 64, LOOP_T = SC_T * 3, N = 10;
export const FAM = [{ id: 'BT31', name: 'DISJONCTEURS', col: '#c8372d' }, { id: 'BT33', name: 'FUSIBLES', col: '#d79a2b' }, { id: 'BT21', name: 'BAES', col: '#2d7a4f' }, { id: 'BT11', name: 'CANDELABRES', col: '#2f6fb3' }];
export const SCEN = [
  { id: 'A', short: 'Bâtiment 1, local 2', label: 'Rapport du bâtiment fictif 1, local 2', seq: [0, 0, 1, 2, 0, 3, 0, 2, 1, 0], bat: 0, loc: 1 },
  { id: 'B', short: 'Bâtiment 3, local 7', label: 'Rapport du bâtiment fictif 3, local 7', seq: [1, 1, 0, 3, 3, 0, 2, 0, 1, 3], bat: 2, loc: 6 },
  { id: 'C', short: 'Erreur de classement', label: 'Une bille mal classée est détectée par le contrôle', seq: [0, 1, 0, 2, 0, 3, 1, 0, 2, 0], bat: 1, loc: 3, wrong: 9, wrongTo: 1 }
];
export const COLX = [40, 75, 110, 145], GY = [-10.5, -3.5, 3.5, 10.5], G0 = { x: -8, z: 110 }, COL_TOP = 96, BASE_Z = 14, BR = 3.6, MAG = { x: -30, z: 142, r: 14 };
export const STEPS = ['Feuille', 'Lecture', 'Aiguillage', 'Bille', 'Colonne', 'Contrôle'], STEP_T = [.5, 6, 8, 10.5, 14, 49];
export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 3 : forced; return { k, u: w % SC_T, sc: SCEN[k] }; };
export const stepAt = (u) => { let s = 0; STEP_T.forEach((t, i) => { if (u >= t) s = i; }); return s; };
const sm = (x) => ease(clamp(x));
const lerp = (a, b, f) => a + (b - a) * f;
export const tI = (i) => 6 + 4 * i;
export const actual = (i, sc) => (sc.wrong === i ? sc.wrongTo : sc.seq[i]);
const L = (c) => Math.hypot(COLX[c] - G0.x, COL_TOP - G0.z), alpha = (c) => Math.atan2(G0.z - COL_TOP, COLX[c] - G0.x), acc = (c) => 300 * Math.sin(alpha(c));
const Tg = (c) => Math.sqrt(2 * L(c) / acc(c));
const stackTop = (i, sc) => BASE_Z + BR + 2 * BR * sc.seq.slice(0, i).filter((_, j) => actual(j, sc) === actual(i, sc)).length * 1.0;
const fallT = (h) => Math.sqrt(2 * Math.max(h, .1) / 300);
export const times = (i, sc) => { const c = actual(i, sc), t0 = tI(i), g0 = t0 + 1.3, d0 = g0 + Tg(c), top = stackTop(i, sc), d1 = d0 + fallT(COL_TOP + BR + .4 - top); return { c, t0, g0, d0, d1, top }; };

/** tambour : nombre de pas accomplis (10 = tour complet) et ravitaillement en fin de scénario */
export const magazine = (u, sc) => { let k = 0; for (let i = 0; i < N; i++) k += sm(seg(u, tI(i) - .8, tI(i))); return { k, refill: sm(seg(u, 61, 63.6)) }; };
/** bille i : position, visibilité, échelle ; dans son alvéole, en chute, dans l'aiguillage, dans la gouttière, en chute libre, empilée, puis vidange */
export function ball(i, u, sc) {
  const t = times(i, sc), mg = magazine(u, sc), a = -Math.PI / 2 + (i - mg.k) * Math.PI / 5;
  const reset = u >= 57, pocket = { vis: true, x: MAG.x + MAG.r * Math.cos(a), y: 0, z: MAG.z + MAG.r * Math.sin(a), s: u >= 61 ? sm(seg(u, 61 + .15 * i, 62 + .15 * i)) : 1 };
  if (u < t.t0 || u >= 61) return pocket;
  if (reset) { const f = sm(seg(u, 57, 58.6)); if (f >= 1 || sc.wrong === i) return { vis: false }; return { vis: true, x: COLX[t.c], y: GY[t.c], z: lerp(t.top, 2, f * f), s: 1 }; }
  const c = t.c;
  if (u < t.t0 + .7) return { vis: true, x: MAG.x + 0, y: 0, z: lerp(MAG.z - MAG.r, 112, (u - t.t0) / .7 * (u - t.t0) / .7), s: 1 };
  if (u < t.g0) { const f = seg(u, t.t0 + .7, t.g0); return { vis: true, x: lerp(-28, G0.x, f), y: lerp(0, GY[c], sm(f)), z: lerp(112, G0.z + .6, f), s: 1 }; }
  if (u < t.d0) { const s = clamp(.5 * acc(c) * (u - t.g0) ** 2, 0, L(c)), f = s / L(c); return { vis: true, x: lerp(G0.x, COLX[c], f), y: GY[c], z: lerp(G0.z, COL_TOP, f) + BR + .4, s: 1 }; }
  if (u < t.d1) { const h = (u - t.d0); return { vis: true, x: COLX[c], y: GY[c], z: COL_TOP + BR + .4 - 150 * h * h, s: 1 }; }
  // rejet : la bille mal classée sort par le volet puis disparaît
  if (sc.wrong === i && u >= 53.2) { const f = seg(u, 53.2, 54.4); return f >= 1 ? { vis: false } : { vis: true, x: COLX[c], y: GY[c] - 14 * f, z: t.top - 40 * Math.max(0, f - .5) ** 2, s: 1 }; }
  return { vis: true, x: COLX[c], y: GY[c], z: t.top, s: 1 };
}
/** aiguillage (angle du chenal) et tête de lecture (ligne) */
export function switchAngle(u, sc) {
  let idx = -1; for (let i = 0; i < N; i++) if (u >= tI(i) - 1.6) idx = i;
  const th = (i) => (i < 0 ? 0 : Math.asin(GY[actual(i, sc)] / 20)); if (idx < 0) return 0;
  return lerp(th(idx - 1), th(idx), sm(seg(u, tI(idx) - 1.6, tI(idx) - .6))) * (1 - sm(seg(u, 57, 60)));
}
export function head(u, sc) { let line = 0, rec = 0; for (let i = 0; i < N; i++) { if (u >= tI(i) - 3.4) { line = i; rec = u < tI(i) - 1.4 && u >= tI(i) - 2.2 ? 1 : 0; } } return { y: 14 - 3.1 * Math.min(line, N - 1), rec, line: u >= tI(0) - 3.4 ? line : -1, fam: u >= tI(line) - 2.2 && u < tI(line) ? actual(line, sc) : -1 }; }
export function sheet(u) { return { x: u < 2.5 ? lerp(-175, -85, sm(seg(u, .5, 2.5))) : u < 51 ? -85 : lerp(-85, -55, sm(seg(u, 51, 54))), vis: u >= .5 && u < 54 }; }
/** compteurs (10 équivaut à 0), contrôle, volet de rejet, bordereau d'export */
export function counters(u, sc) {
  const reset = sm(seg(u, 58, 60.6));
  return FAM.map((_, c) => { let n = 0; for (let i = 0; i < N; i++) if (actual(i, sc) === c) n += sm(seg(u, times(i, sc).d1 - .1, times(i, sc).d1 + .4)); if (sc.wrong != null && c === sc.wrongTo) n -= sm(seg(u, 53.8, 54.6)); return n > .01 ? n + (10 - n) * reset : n; });
}
export const expected = (sc) => FAM.map((_, c) => sc.seq.filter((x) => x === c).length);
export function verify(u, sc) { const on = u >= 49 && u < 59; const bad = sc.wrong != null; return { rows: FAM.map((_, c) => on ? sm(seg(u, 49 + .5 * c, 50 + .5 * c)) : 0), ok: on && !bad ? sm(seg(u, 51.5, 52.5)) : 0, ko: on && bad ? sm(seg(u, 51.5, 52.5)) * (u < 57 ? 1 : 0) : 0, door: sc.wrong != null ? sm(seg(u, 52.6, 53.2)) * (1 - sm(seg(u, 54.4, 55.4))) : 0, slip: sm(seg(u, 54, 56.5)) * (1 - sm(seg(u, 58, 60))), trap: sm(seg(u, 57, 58)) * (1 - sm(seg(u, 60, 61))) }; }
export const WRONG_Z = BASE_Z + BR + 2 * BR * SCEN[2].seq.slice(0, 9).filter((_, j) => actual(j, SCEN[2]) === SCEN[2].wrongTo).length;
export const dialAngle = (u, k, forced) => { const a = SCEN.map((s) => s.bat * .5), prev = forced == null ? a[(k + 2) % 3] : a[k]; return lerp(prev, a[k], sm(seg(u, 0, 2))); };
