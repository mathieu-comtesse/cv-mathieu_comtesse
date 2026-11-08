// Gares prioritaires : chronologie pure (fonction du temps partagé). Toutes les gares et valeurs sont fictives.
// Chaque rangée du tableau est un tambour octogonal à huit faces (une face par gare) entraîné pas à pas ; le critère choisi à la couronne détermine
// l'ordre de présentation, donc de combien de pas chaque tambour avance. Trois petits cadrans par rangée suivent la gare affichée.
import { clamp, seg, ease } from './nisaru-geometry.js';

export const SC_T = 60, LOOP_T = SC_T * 2, ROWS = 8;   // la boucle automatique n'enchaîne que A et B ; C (« Mon choix ») est piloté par le visiteur
export const STATIONS = [
  { name: 'VALMONT', crit: .82, conf: .58, maint: .40, equip: 14, ech: '12/12', ops: 3 }, { name: 'SAINTE-ORNE', crit: .35, conf: .91, maint: .72, equip: 9, ech: '03/01', ops: 5 },
  { name: 'PORT-ELMER', crit: .64, conf: .44, maint: .88, equip: 21, ech: '28/11', ops: 7 }, { name: 'HAUT-REVIN', crit: .91, conf: .67, maint: .31, equip: 17, ech: '19/12', ops: 2 },
  { name: 'LAC-MOREL', crit: .48, conf: .86, maint: .66, equip: 8, ech: '15/01', ops: 4 }, { name: 'BRISANGES', crit: .22, conf: .95, maint: .54, equip: 6, ech: '22/02', ops: 3 },
  { name: 'COURNELLE', crit: .73, conf: .52, maint: .93, equip: 19, ech: '30/11', ops: 8 }, { name: 'VAUVRAY', crit: .57, conf: .78, maint: .47, equip: 11, ech: '09/01', ops: 4 }
];
export const CRITERIA = [
  { id: 'crit', label: 'Criticité', sort: (a, b) => b.crit - a.crit }, { id: 'conf', label: 'Conformité', sort: (a, b) => a.conf - b.conf }, { id: 'maint', label: 'Maintenance préventive', sort: (a, b) => b.maint - a.maint }
];
/** ordre des gares (indices) pour chaque critère : rang 1 en premier */
export const ORDER = CRITERIA.map((c) => STATIONS.map((s, i) => [s, i]).sort((a, b) => c.sort(a[0], b[0])).map((x) => x[1]));
export const SCEN = [
  { id: 'A', short: 'Trois critères', label: 'Changer de critère : le classement tourne', events: [{ t0: 6, from: 0, to: 1 }, { t0: 22, from: 1, to: 2 }, { t0: 40, from: 2, to: 0 }], picks: [] },
  { id: 'B', short: 'Ouvrir une fiche', label: 'Sélectionner une gare : le tiroir s\'ouvre', events: [], picks: [{ t0: 2, row: 0 }, { t0: 17, row: 4 }, { t0: 34, row: 2 }] },
  { id: 'C', short: 'Mon choix', label: 'Mon choix : je choisis le critère et la gare à consulter', custom: true, edit: true, editT: 0, hold: false, get events() { return CUSTOM.events; }, get picks() { return CUSTOM.picks; } }
];
/* scénario C : état construit par le visiteur. Les événements sont espacés pour que chaque mécanisme termine avant le suivant. */
export const CUSTOM = { base: 0, started: false, events: [], picks: [], cur: 0 };
export function resetCustom() { Object.assign(CUSTOM, { base: 0, started: false, events: [], picks: [], cur: 0 }); }
export function chooseCriterion(id, u) {
  if (id === CUSTOM.cur) return false;
  const last = CUSTOM.events[CUSTOM.events.length - 1]; CUSTOM.events.push({ t0: Math.max(u, last ? last.t0 + EV_LEN + 1 : u), from: CUSTOM.cur, to: id }); CUSTOM.cur = id; return true;
}
export function choosePick(row, u) {
  const last = CUSTOM.picks[CUSTOM.picks.length - 1]; CUSTOM.picks.push({ t0: Math.max(u, last ? last.t0 + 16 : u), row }); return true;
}
export const EV_LEN = 6, ROW_LAG = .22, STEP_S = .3;
export const SEL_PARK = 16, ROW_Z = (k) => 146 - 14.5 * k;
export const STEPS_A = ['Criticité', 'Conformité', 'Maintenance', 'Retour criticité'], STEPS_B = ['Première gare', 'Cinquième gare', 'Troisième gare', 'Retour'], STEPS_C = ['Mon choix', 'Mon choix', 'Mon choix', 'Mon choix'];
export const STEP_T = [[.5, 6, 22, 40], [2, 17, 34, 50], [0, 0, 0, 0]];

export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 2 : forced; return k === 2 ? { k, u: Math.max(0, t - CUSTOM.base), sc: SCEN[2] } : { k, u: w % SC_T, sc: SCEN[k] }; };
export const stepAt = (u, k) => { let s = 0; STEP_T[k].forEach((t, i) => { if (u >= t - .01) s = i; }); return s; };

const smooth = (x) => ease(clamp(x));
const stair = (s) => { const f = Math.floor(s), r = s - f; return f + smooth((r - .35) / .65); };

/** critère affiché et état des changements en cours */
export function criterion(u, sc) {
  let cur = 0, ev = null;
  for (const e of sc.events) { if (u >= e.t0) { cur = e.to; ev = e; } }
  return { cur, ev };
}
/** état d'une rangée : face courante (continue), valeurs des trois indicateurs, impulsion du cliquet */
export function row(k, u, sc) {
  let faceFrom = ORDER[0][k], face = faceFrom, vals = vv(faceFrom), pulse = 0, moving = false;
  for (const e of sc.events) {
    const a = ORDER[e.from][k], b = ORDER[e.to][k], n = (b - a + 8) % 8;
    if (u < e.t0) break;
    const start = e.t0 + 2.4 + ROW_LAG * k, dur = n ? STEP_S * n + .3 : 0;
    const p = dur ? clamp((u - start) / dur) : 1;
    const s = n * p;
    face = a + (u >= start ? stair(s) : 0) + (p >= 1 ? 0 : 0);
    if (p >= 1) face = a + n;
    vals = mixVals(vv(a), vv(b), p >= 1 ? 1 : smooth(p));
    if (dur && p > 0 && p < 1) { moving = true; const r = s - Math.floor(s); pulse = Math.sin(Math.PI * clamp((r - .35) / .65)); }
    faceFrom = b;
  }
  return { face, vals, pulse, moving, station: Math.round(face) % 8 };
}
const vv = (i) => [STATIONS[i].crit, STATIONS[i].conf, STATIONS[i].maint];
const mixVals = (a, b, f) => a.map((x, i) => x + (b[i] - x) * f);

/** calculateur à cames : angle cumulé (tours entiers, donc continu d'une boucle à l'autre) et couronne de critère */
export function calc(u, sc) {
  let a = 0, crown = 0, lamp = 0, cur = 0;
  for (const e of sc.events) {
    if (u >= e.t0 + 1.2) a += 2 * Math.PI * 2 * smooth(seg(u, e.t0 + 1.2, e.t0 + 3.2));
    if (u >= e.t0) cur = e.to;
  }
  const ca = [0, 1.05, 2.1];
  crown = ca[0];
  for (const e of sc.events) { if (u >= e.t0) crown = ca[e.from] + (ca[e.to] - ca[e.from]) * smooth(seg(u, e.t0, e.t0 + 1.6)); }
  const crit = sc.events.reduce((c, e) => (u >= e.t0 + 1.2 ? e.to : c), 0);
  return { spin: a, crown, crit, busy: sc.events.some((e) => u >= e.t0 + 1.2 && u < e.t0 + 3.4) };
}
/** sélecteur (cadre ambre), tiroir de fiche et gare consultée */
export function selector(u, sc) {
  let z = SEL_PARK, drawer = 0, row = -1, prev = SEL_PARK;
  for (const p of sc.picks) {
    const zr = ROW_Z(p.row);
    if (u >= p.t0) { z = prev + (zr - prev) * smooth(seg(u, p.t0, p.t0 + 2.4)); }
    const open = smooth(seg(u, p.t0 + 3, p.t0 + 5)) * (1 - smooth(seg(u, p.t0 + 12.5, p.t0 + 14.3)));
    if (open > 0) { drawer = open; row = p.row; }
    if (u >= p.t0 + 14.3) prev = zr;
  }
  const last = sc.picks[sc.picks.length - 1];
  if (last && u >= last.t0 + 16) z = ROW_Z(last.row) + (SEL_PARK - ROW_Z(last.row)) * smooth(seg(u, last.t0 + 16, last.t0 + 20));
  return { z, drawer, row };
}
