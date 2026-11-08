// Power BI, plans de prévention et MOSO : chronologie pure (fonction du temps partagé). Dossiers, marchés et valeurs sont fictifs.
// Un paternoster d'archives (chaîne en boucle, casiers qui restent horizontaux) amène le casier demandé devant la fenêtre ; un bras extracteur sort le dossier sur le comptoir ;
// le lecteur de référence allume le portail de visualisation (moteur distinct). Chaque scénario enchaîne deux consultations.
import { clamp, seg, ease } from './nisaru-geometry.js';

export const SC_T = 60, LOOP_T = SC_T * 3, N = 8;
export const H = 100, RAD = 18, L = 2 * H + 2 * Math.PI * RAD, SP = L / N, Z_TOP = 160, S_ST = 96;
export const SCEN = [
  { id: 'A', short: 'Plan de prévention', label: 'Consulter deux plans de prévention', kind: 'PP', c: [1, 4], docs: ['PP 2025-014', 'PP 2025-031'] },
  { id: 'B', short: 'Marché', label: 'Consulter deux marchés MOSO', kind: 'MOSO', c: [3, 6], docs: ['MARCHE 118', 'MARCHE 204'] },
  { id: 'C', short: 'Comparer deux états', label: 'Comparer deux états de suivi du même plan', kind: 'PP', c: [1, 6], docs: ['PP 2025-014 : T1', 'PP 2025-014 : T2'], compare: true }
];
export const VISIT = [2, 26], VLEN = 23;
export const STEPS = ['Demande', 'Rotation', 'Fenêtre', 'Extraction', 'Lecture', 'Retour'], STEP_T = [2, 3.5, 11, 13, 15.5, 20];
const mod = (a, m) => ((a % m) + m) % m;
export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 3 : forced; return { k, u: w % SC_T, sc: SCEN[k] }; };
const sm = (x) => ease(clamp(x));
const io = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };

/** parcours de la chaîne : s depuis le haut de la branche droite (descente), arc bas, branche gauche (montée), arc haut ; renvoie x, z et l'angle de la tangente */
export function path(s) {
  s = mod(s, L); const zb = Z_TOP - H;
  if (s < H) return { x: RAD, z: Z_TOP - s, a: -Math.PI / 2 };
  if (s < H + Math.PI * RAD) { const f = (s - H) / RAD; return { x: RAD * Math.cos(f), z: zb - RAD * Math.sin(f), a: -Math.PI / 2 - f }; }
  if (s < 2 * H + Math.PI * RAD) return { x: -RAD, z: zb + (s - H - Math.PI * RAD), a: Math.PI / 2 };
  const f = (s - 2 * H - Math.PI * RAD) / RAD; return { x: -RAD * Math.cos(f), z: Z_TOP + RAD * Math.sin(f), a: Math.PI / 2 - f };
}
/** déplacements de la boucle pour chaque scénario : vers le premier casier, vers le second, retour à la disposition d'origine (tour complet) */
export const DRIVES = SCEN.map((sc) => { const D1 = mod(S_ST - sc.c[0] * SP, L), D2 = D1 + mod(S_ST - sc.c[1] * SP - D1, L); return { D1, D2, De: Math.ceil(D2 / L - 1e-6) * L }; });
export function drive(u, k) { const { D1, D2, De } = DRIVES[k]; if (u < 26) return D1 * io(seg(u, 2, 9)); if (u < 48) return D1 + (D2 - D1) * io(seg(u, 26, 33)); return D2 + (De - D2) * io(seg(u, 48, 57)); }
/** consultation en cours : indice (0 ou 1) et temps relatif ; -1 hors consultation */
export function visit(u) { for (let i = 0; i < 2; i++) { const tv = u - VISIT[i]; if (tv >= 0 && tv < VLEN) return { i, tv }; } return { i: -1, tv: 0 }; }
/** état de la consultation : verrou, fenêtre, bras (y de la pointe), dossier sorti, lecture, indicateurs */
export function state(u, k) {
  const v = visit(u), tv = v.tv, on = v.i >= 0;
  const lock = on ? sm(seg(tv, 7.2, 7.8)) * (1 - sm(seg(tv, 21, 21.6))) : 0, door = on ? sm(seg(tv, 8, 9)) * (1 - sm(seg(tv, 21.2, 22.2))) : 0;
  let tip = 52;
  if (on) { if (tv < 9) tip = 52; else if (tv < 11) tip = 52 - 42 * io(seg(tv, 9, 11)); else if (tv < 17) tip = 10 + 42 * io(seg(tv, 11, 13.5)); else if (tv < 19.5) tip = 52 - 42 * io(seg(tv, 17, 19.5)); else tip = 10 + 42 * io(seg(tv, 19.5, 21)); }
  const out = on && tv >= 11 && tv < 19.5 ? 1 : 0, ind = on ? sm(seg(tv, 15, 16.5)) * (1 - sm(seg(tv, 20, 21))) : 0, scan = on && tv >= 13.6 && tv < 16 ? 1 : 0;
  const req = on ? sm(seg(tv, 0, 1.5)) : 0;
  return { on, i: v.i, tv, lock, door, tip, out, ind, scan, req };
}
export const stepAt = (u) => { const v = visit(u); if (v.i < 0) return u < 2 ? 0 : 5; const tv = v.tv; return tv < 1.5 ? 0 : tv < 8 ? 1 : tv < 9.5 ? 2 : tv < 13.6 ? 3 : tv < 19 ? 4 : 5; };
export const seekT = (v, k, u) => VISIT[0] + [0, 3, 8.5, 10, 15, 19.5][v - 1];
