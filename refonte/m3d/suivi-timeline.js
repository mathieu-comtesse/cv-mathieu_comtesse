// Retrouver tout le suivi : chronologie pure (fonction du temps partagé). OT, équipements, bâtiments et systèmes sont fictifs.
// L'outil permet de retrouver des informations et des accès dans les applications existantes ; il ne centralise pas les bases et n'accorde aucun droit : une source peut être indisponible
// ou refuser l'accès selon les permissions applicatives (scénario C).
import { clamp, seg, ease } from './nisaru-geometry.js';

export const SC_T = 56, LOOP_T = SC_T * 3;   // la boucle automatique n'enchaîne que A, B et C ; D (« Ma demande ») est piloté par le visiteur
export const SYS = ['GMAO', 'SHAREPOINT', 'EXCEL SUIVI', 'POWER BI', 'PORTAIL'];
export const SCEN = [
  { id: 'A', short: 'Retrouver un OT', label: 'OT 4417 : deux systèmes concernés', row: 0, col: 0, req: 'OT 4417', sys: [0, 1] },
  { id: 'B', short: 'Retrouver un équipement', label: 'Équipement fictif : suivi Excel et Power BI', row: 1, col: 1, req: 'EQUIPEMENT 0205', sys: [2, 3] },
  { id: 'C', short: 'Source indisponible', label: 'Bâtiment fictif : le portail est indisponible', row: 2, col: 2, req: 'BATIMENT B12', sys: [0, 4], down: 4 },
  { id: 'D', short: 'Ma demande', label: 'Ma demande : je choisis un OT, un équipement ou un bâtiment fictif, les fiches se branchent, les systèmes concernés s\'affichent', custom: true, edit: true, hold: false, editT: 0,
    get row() { return REQS[CUSTOM.i].row; }, get col() { return REQS[CUSTOM.i].col; }, get req() { return REQS[CUSTOM.i].req; }, get sys() { return REQS[CUSTOM.i].sys; }, get down() { return CUSTOM.down ? REQS[CUSTOM.i].sys[1] : undefined; } }
];
/* catalogue fictif : neuf demandes (trois OT, trois équipements, trois bâtiments), une par paire de prises ; les systèmes concernés en sont déduits (valeurs inventées) */
const pairFor = (i) => { const a = i % 5; let b = (i * 2 + 1) % 5; if (b === a) b = (a + 2) % 5; return [a, b]; };
export const REQS = []; [['OT', ['4417', '5102', '6630']], ['EQUIPEMENT', ['0205', '0311', '0478']], ['BATIMENT', ['B12', 'B07', 'B31']]].forEach(([type, ids], row) => ids.forEach((id, col) => REQS.push({ row, col, type, id, req: type + ' ' + id, sys: pairFor(row * 3 + col) })));
export const CUSTOM = { base: 0, started: false, i: 0, down: false };
export function startCustom(time) { Object.assign(CUSTOM, { base: time, started: true, i: 0, down: false }); }
export function setRequest(patch, time) { Object.assign(CUSTOM, patch, { base: time, started: true }); }
export const STEPS = ['Demande', 'Identification', 'Première liaison', 'Seconde liaison', 'Accès retrouvés', 'Débranchement'], STEP_T = [.8, 2.6, 5, 14, 24, 44];
export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 3 : forced; return k === 3 ? { k, u: Math.max(0, t - CUSTOM.base) % SC_T, sc: SCEN[3] } : { k, u: w % SC_T, sc: SCEN[k] }; };
export const stepAt = (u) => { let s = 0; STEP_T.forEach((t, i) => { if (u >= t) s = i; }); return s; };
const sm = (x) => ease(clamp(x));
const lerp = (a, b, f) => a + (b - a) * f;

/* géométrie de la face : lignes des demandes, colonnes, système */
export const REQ_Z = [160, 144, 128], REQ_X = [-82, -58, -34], SYS_X = [20, 42, 64, 86, 108], SYS_Z = 150, SHELF_Z = 52;
export const reqJack = (row, col, side) => [REQ_X[col] + (side ? 5 : -5), REQ_Z[row]];
export const sysJack = (s) => [SYS_X[s], SYS_Z];
export const REST = [[-100, 28], [100, 28], [-116, 28], [116, 28]];                 // alvéoles des quatre fiches (A1, B1, A2, B2)
/** fiches : 0 A1 (demande, gauche), 1 B1 (système 1), 2 A2 (demande, droite), 3 B2 (système 2) ; fenêtres [début, branchée, retrait début] */
export const WIN = [[5, 8.6, 44], [9, 13, 45], [14, 17.6, 46], [18, 22, 47]];
/** position et inclinaison d'une fiche (0 debout dans son alvéole, 1 à l'horizontale dans la prise) */
export function plug(p, u, sc) {
  const [a, b, r] = WIN[p], rest = REST[p];
  const target = p % 2 === 0 ? reqJack(sc.row, sc.col, p === 0 ? 0 : 1) : sysJack(sc.sys[p === 1 ? 0 : 1]);
  const fail = sc.down != null && p === 3;
  let f = sm(seg(u, a, b));                                // 0 repos -> 1 branchée
  if (u >= r) f = 1 - sm(seg(u, r, r + 3.6));
  if (fail && u >= 24.5) f = 1 - sm(seg(u, 24.5, 28));
  const lift = sm(seg(f, 0, .3)), glide = sm(seg(f, .3, .8)), ins = sm(seg(f, .8, 1));
  const x = lerp(rest[0], target[0], glide), z = lerp(SHELF_Z + 6 + 22 * 0, 0, 0) + 0;
  const px = x, py = lerp(rest[1], 18, glide) - 6 * ins, hz = lerp(SHELF_Z + 6, SHELF_Z + 22, lift);
  const zz = lerp(hz, target[1], glide);
  return { x: px, y: py, z: zz, tilt: glide, f };
}
/** voyants : demande, systèmes (vert), système indisponible (rouge) ; relais ; touches ; écran des accès */
export function lamps(u, sc) {
  const req = u >= 1 && u < 48 ? 1 : 0, sys = SYS.map((_, i) => { let g = 0, rd = 0; const idx = sc.sys.indexOf(i); if (idx >= 0) { const pl = idx === 0 ? 1 : 3, on = u >= WIN[pl][1] + .2 && u < WIN[pl][2] + 1.5; if (sc.down === i) { rd = u >= 22.4 && u < 28 ? 1 : 0; } else g = on ? 1 : 0; } const ident = u >= 2.6 && u < 5 && idx >= 0 ? .5 + .5 * Math.sin(u * 14) : 0; return { g: Math.max(g, ident), r: rd }; });
  return { req, sys };
}
export const relays = (u) => [0, 1, 2, 3, 4, 5].map((i) => (u >= 2.6 && u < 4.6 ? ((Math.sin(u * 20 + i * 1.7) > 0) ? 1 : 0) : 0) + (u >= 13 && u < 13.4 ? 1 : 0) * (i < 3 ? 1 : 0) + (u >= 22 && u < 22.4 ? 1 : 0) * (i > 2 ? 1 : 0));
export const key = (u) => sm(seg(u, .6, .9)) * (1 - sm(seg(u, 1.2, 1.5)));
export const dialAt = (u, k, forced) => { const a = SCEN.map((s) => s.col * .9), prev = forced == null ? a[(k + 2) % 3] : a[k]; return lerp(prev, a[k], sm(seg(u, 1, 2.4))); };
export const display = (u, sc) => ({ show: u >= 14 && u < 50, l1: u >= 14.5, l2: u >= 22.6, fade: 1 - sm(seg(u, 50, 53)) });
