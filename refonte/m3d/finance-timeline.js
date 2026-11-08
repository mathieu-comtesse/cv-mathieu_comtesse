// Point financier : chronologie pure (fonction du temps partagé). Montants, seuils et périmètres sont fictifs.
// Le réservoir est une métaphore de la surveillance : un flotteur lit un niveau (consommation rapportée aux fonds disponibles), il ne bloque aucune dépense.
// Deux déclencheurs : le seuil préventif (réglable) et le dépassement des fonds disponibles (100 %). Chaque alerte émise est mémorisée pour ne pas être répétée.
import { clamp, seg, ease } from './nisaru-geometry.js';

export const SC_T = 64, LOOP_T = SC_T * 2;   // la boucle automatique n'enchaîne que A et B ; C (« Mon réservoir ») est piloté par le visiteur
export const PERIM = ['CS', 'LOCATIF', 'MEC', 'PPTM'];
export const SEL = [{ id: 'PRG', open: [1, 0, 1, 0], angle: -.9 }, { id: 'PSE', open: [0, 1, 0, 1], angle: 0 }, { id: 'GLOBAL', open: [1, 1, 1, 1], angle: .9 }];
export const SCEN = [
  { id: 'A', short: 'Seuil puis dépassement', label: 'Consommation à 80 % puis dépassement des fonds', sel: 2 },
  { id: 'B', short: 'Seuil abaissé', label: 'Périmètre PRG : le seuil est abaissé à 60 %', sel: 0 },
  { id: 'C', short: 'Mon réservoir', label: 'Mon réservoir : je règle le périmètre, la consommation, le seuil et les lignes KO', sel: 2, custom: true, edit: true, hold: false, editT: 0 }
];
/* ---- scénario C : état construit par le visiteur. Les grandeurs (consommation, part de lignes KO exclues, seuil) sont des pistes à changements :
   chaque changement fait glisser la valeur en quelques secondes ; les alertes sont déduites en rejouant la piste (pas de 0,05 s) et sont mémorisées jusqu'au réarmement. ---- */
export const W = [.3, .25, .25, .2], KO = [.18, 0, .1, 0];   // poids des quatre lignes (fonds) et part de chacune en KO (valeurs fictives)
export const share = (sel, excl) => { if (!excl) return 0; const o = SEL[sel].open; let a = 0, b = 0; o.forEach((v, i) => { a += v * W[i] * KO[i]; b += v * W[i]; }); return b ? a / b : 0; };
export const CUSTOM = { base: 0, started: false, cons: [], thr: [], shr: [], selv: [], rearm: [], now: { cons: .3, thr: .8, sel: 2, excl: true }, sim: null };
export function startCustom(time) { Object.assign(CUSTOM, { base: time, started: true, cons: [], thr: [], shr: [], selv: [], rearm: [], now: { cons: .3, thr: .8, sel: 2, excl: true }, sim: null }); CUSTOM.shr0 = share(2, true); }
const track = (list, u, init, dur) => { let v = init; for (const c of list) { if (u < c.t0) break; v = c.from + (c.to - c.from) * sm(seg(u, c.t0, c.t0 + dur)); } return v; };
const consAt = (u) => track(CUSTOM.cons, u, .3, 3), thrAt = (u) => track(CUSTOM.thr, u, .8, .8), shrAt = (u) => track(CUSTOM.shr, u, share(2, true), 2);
export const levelAt = (u) => consAt(u) * (1 - shrAt(u));
const push = (list, now, to, u, dur) => { const last = list[list.length - 1]; const from = last ? track(list, u, 0, dur) : now; list.push({ t0: u, from: last ? from : now, to }); };
export function setCons(v, u) { v = clamp(v, .1, 1.4); push(CUSTOM.cons, consAt(u), v, u, 3); CUSTOM.now.cons = v; CUSTOM.sim = null; }
export function setThr(v, u) { v = clamp(v, .5, .95); push(CUSTOM.thr, thrAt(u), v, u, .8); CUSTOM.now.thr = v; CUSTOM.sim = null; }
export function setScope(sel, excl, u) {
  const sh = share(sel, excl); push(CUSTOM.shr, shrAt(u), sh, u, 2);
  if (sel !== CUSTOM.now.sel) CUSTOM.selv.push({ t0: u, from: CUSTOM.now.sel, to: sel }); CUSTOM.now.sel = sel; CUSTOM.now.excl = excl; CUSTOM.sim = null;
}
export function rearm(u) { CUSTOM.rearm.push(u); CUSTOM.sim = null; }
/** rejeu de la piste : instants des alertes émises (avec leur niveau) depuis le dernier réarmement */
export function simulate(u) {
  let S = CUSTOM.sim; if (!S || u < S.u) S = CUSTOM.sim = { u: 0, p: null, o: null, hist: [], ri: 0 };
  for (let t = S.u; t <= u; t += .05) {
    while (S.ri < CUSTOM.rearm.length && CUSTOM.rearm[S.ri] <= t) { S.p = null; S.o = null; S.ri++; }
    const L = levelAt(t); if (S.p === null && L >= thrAt(t)) { S.p = t; S.hist.push({ t, kind: 0, level: L }); } if (S.o === null && L >= 1) { S.o = t; S.hist.push({ t, kind: 1, level: L }); }
    S.u = t + .05;
  }
  return S;
}
const alertC = (which, u) => {
  const S = simulate(u), t = which ? S.o : S.p; if (t === null) return { fired: false, bell: 0, latch: 0, slip: 0, ledger: 0 };
  let tr = Infinity; for (const r of CUSTOM.rearm) if (r > t) { tr = r; break; } const reset = tr === Infinity ? 0 : sm(seg(u, tr, tr + 1.4));
  return { fired: u >= t, bell: u >= t && u < t + 1.6 ? Math.sin((u - t) * 26) * Math.exp(-(u - t) * 1.6) : 0, latch: sm(seg(u, t + .3, t + .8)) * (1 - reset), slip: sm(seg(u, t + 1.2, t + 3)) * (1 - reset), ledger: sm(seg(u, t + 2.4, t + 3)) * (1 - reset) };
};
export const STEPS_A = ['Flux entrants', 'Filtre', 'Niveau', 'Seuil préventif', 'Dépassement', 'Mémoire'], STEPS_B = ['Périmètre PRG', 'Filtre', 'Niveau', 'Seuil abaissé', 'Alerte préventive', 'Mémoire'];
const sm = (x) => ease(clamp(x));

/** consommation rapportée aux fonds disponibles (1 = 100 %) */
export function ratio(u, k) {
  if (k === 2) return levelAt(u);
  if (k === 0) return .3 + .55 * sm(seg(u, 6, 30)) + .21 * sm(seg(u, 36, 50)) - .76 * sm(seg(u, 56, 62));
  return .3 + .35 * sm(seg(u, 6, 40)) - .35 * sm(seg(u, 56, 62));
}
/** seuil préventif (réglé au curseur) */
export const thr = (u, k) => (k === 2 ? thrAt(u) : k === 0 ? .8 : .8 - .2 * sm(seg(u, 20, 24)));
/** instants de déclenchement (premier franchissement du seuil, puis des 100 %) */
function firstCross(k, f) { for (let u = 0; u < 56; u += .02) if (ratio(u, k) >= f(u)) return u; return Infinity; }
export const FIRE = [0, 1].map((k) => ({ p: firstCross(k, (u) => thr(u, k)), o: firstCross(k, () => 1) }));
export const STEP_T = [[1, 4.5, 10, FIRE[0].p, FIRE[0].o, 52], [1, 4.5, 10, 22, FIRE[1].p, 52], [0, 0, 0, 0, 0, 0]];
export const STEPS_C = ['Libre', 'Libre', 'Libre', 'Libre', 'Libre', 'Libre'];

export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 2 : forced; return k === 2 ? { k, u: Math.max(0, t - CUSTOM.base) } : { k, u: w % SC_T }; };
export const stepAt = (u, k) => { let s = 0; STEP_T[k].forEach((t, i) => { if (u >= t - .01) s = i; }); return s; };

/** alerte (0 préventive, 1 dépassement) : cloche, loquet de mémoire, courrier sorti, ligne du registre */
export function alert(which, u, k) {
  if (k === 2) return alertC(which, u);
  const t = which ? FIRE[k].o : FIRE[k].p; if (!isFinite(t)) return { fired: false, bell: 0, latch: 0, slip: 0, ledger: 0 };
  const reset = sm(seg(u, 57, 60.5));
  return { fired: u >= t && u < 59, bell: u >= t && u < t + 1.6 ? Math.sin((u - t) * 26) * Math.exp(-(u - t) * 1.6) : 0, latch: sm(seg(u, t + .3, t + .8)) * (1 - reset), slip: sm(seg(u, t + 1.2, t + 3)) * (1 - reset), ledger: sm(seg(u, t + 2.4, t + 3)) * (1 - reset) };
}
/** lignes ouvertes selon le sélecteur de périmètre ; transition depuis l'état du scénario précédent */
export function valves(u, k, forced) {
  if (k === 2) { let from = 2, to = 2, t0 = -1e9; for (const c of CUSTOM.selv) { if (u < c.t0) break; from = c.from; to = c.to; t0 = c.t0; } const f = sm(seg(u, t0, t0 + 3)), a = SEL[from], b = SEL[to]; return { open: b.open.map((o, i) => a.open[i] + (o - a.open[i]) * f), angle: a.angle + (b.angle - a.angle) * f }; }
  const cur = SEL[SCEN[k].sel], prev = SEL[SCEN[forced == null ? (k + 1) % 2 : k].sel], f = sm(seg(u, 1, 4));
  return { open: cur.open.map((o, i) => prev.open[i] + (o - prev.open[i]) * f), angle: prev.angle + (cur.angle - prev.angle) * f };
}
/** débit entrant (les perles avancent quand la consommation monte) */
export const inflow = (u, k) => { const d = ratio(u + .2, k) - ratio(u - .2, k); return clamp(Math.max(d * 8, k === 2 ? .3 : 0), 0, 1); };
