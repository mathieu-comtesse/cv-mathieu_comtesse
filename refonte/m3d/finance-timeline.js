// Point financier : chronologie pure (fonction du temps partagé). Montants, seuils et périmètres sont fictifs.
// Le réservoir est une métaphore de la surveillance : un flotteur lit un niveau (consommation rapportée aux fonds disponibles), il ne bloque aucune dépense.
// Deux déclencheurs : le seuil préventif (réglable) et le dépassement des fonds disponibles (100 %). Chaque alerte émise est mémorisée pour ne pas être répétée.
import { clamp, seg, ease } from './nisaru-geometry.js';

export const SC_T = 64, LOOP_T = SC_T * 2;
export const PERIM = ['CS', 'LOCATIF', 'MEC', 'PPTM'];
export const SEL = [{ id: 'PRG', open: [1, 0, 1, 0], angle: -.9 }, { id: 'PSE', open: [0, 1, 0, 1], angle: 0 }, { id: 'GLOBAL', open: [1, 1, 1, 1], angle: .9 }];
export const SCEN = [
  { id: 'A', short: 'Seuil puis dépassement', label: 'Consommation à 80 % puis dépassement des fonds', sel: 2 },
  { id: 'B', short: 'Seuil abaissé', label: 'Périmètre PRG : le seuil est abaissé à 60 %', sel: 0 }
];
export const STEPS_A = ['Flux entrants', 'Filtre', 'Niveau', 'Seuil préventif', 'Dépassement', 'Mémoire'], STEPS_B = ['Périmètre PRG', 'Filtre', 'Niveau', 'Seuil abaissé', 'Alerte préventive', 'Mémoire'];
const sm = (x) => ease(clamp(x));

/** consommation rapportée aux fonds disponibles (1 = 100 %) */
export function ratio(u, k) {
  if (k === 0) return .3 + .55 * sm(seg(u, 6, 30)) + .21 * sm(seg(u, 36, 50)) - .76 * sm(seg(u, 56, 62));
  return .3 + .35 * sm(seg(u, 6, 40)) - .35 * sm(seg(u, 56, 62));
}
/** seuil préventif (réglé au curseur) */
export const thr = (u, k) => (k === 0 ? .8 : .8 - .2 * sm(seg(u, 20, 24)));
/** instants de déclenchement (premier franchissement du seuil, puis des 100 %) */
function firstCross(k, f) { for (let u = 0; u < 56; u += .02) if (ratio(u, k) >= f(u)) return u; return Infinity; }
export const FIRE = [0, 1].map((k) => ({ p: firstCross(k, (u) => thr(u, k)), o: firstCross(k, () => 1) }));
export const STEP_T = [[1, 4.5, 10, FIRE[0].p, FIRE[0].o, 52], [1, 4.5, 10, 22, FIRE[1].p, 52]];

export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 2 : forced; return { k, u: w % SC_T }; };
export const stepAt = (u, k) => { let s = 0; STEP_T[k].forEach((t, i) => { if (u >= t - .01) s = i; }); return s; };

/** alerte (0 préventive, 1 dépassement) : cloche, loquet de mémoire, courrier sorti, ligne du registre */
export function alert(which, u, k) {
  const t = which ? FIRE[k].o : FIRE[k].p; if (!isFinite(t)) return { fired: false, bell: 0, latch: 0, slip: 0, ledger: 0 };
  const reset = sm(seg(u, 57, 60.5));
  return { fired: u >= t && u < 59, bell: u >= t && u < t + 1.6 ? Math.sin((u - t) * 26) * Math.exp(-(u - t) * 1.6) : 0, latch: sm(seg(u, t + .3, t + .8)) * (1 - reset), slip: sm(seg(u, t + 1.2, t + 3)) * (1 - reset), ledger: sm(seg(u, t + 2.4, t + 3)) * (1 - reset) };
}
/** lignes ouvertes selon le sélecteur de périmètre ; transition depuis l'état du scénario précédent */
export function valves(u, k, forced) {
  const cur = SEL[SCEN[k].sel], prev = SEL[SCEN[forced == null ? (k + 1) % 2 : k].sel], f = sm(seg(u, 1, 4));
  return { open: cur.open.map((o, i) => prev.open[i] + (o - prev.open[i]) * f), angle: prev.angle + (cur.angle - prev.angle) * f };
}
/** débit entrant (les perles avancent quand la consommation monte) */
export const inflow = (u, k) => { const d = ratio(u + .2, k) - ratio(u - .2, k); return clamp(d * 8, 0, 1); };
