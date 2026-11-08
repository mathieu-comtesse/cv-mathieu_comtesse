// Power Automate, chaîne des plans de prévention : chronologie pure (fonction du temps partagé). Dossiers, dates et échéances sont fictifs.
// Scénario A : un plan arrive, ses informations sont lues, la pince le range dans le tiroir de sa catégorie ; le calendrier avance, un témoin s'allume puis une relance part.
// Scénario B : un dossier déjà classé arrive à échéance, une relance part, la pince le sort de son tiroir et le dépose dans le compartiment d'archives.
import { clamp, seg, ease } from './nisaru-geometry.js';

export const SC_T = 60, LOOP_T = SC_T * 2;
export const SCEN = [
  { id: 'A', short: 'Dépôt et classement', label: 'Un plan arrive : lecture, tiroir, puis échéance et relance', due: 25, warn: 22 },
  { id: 'B', short: 'Échéance et archivage', label: 'Échéance atteinte : relance puis archivage du dossier', due: 20, warn: 17 }
];
export const PICK = [6, 20], HOUSE_X = -30, DRAW = [{ x: 80, z: 73 }, { x: 40, z: 47 }], ARCH_X = -131, RAIL_Z = 124, TIP_REST = 100;
export const STEPS = [['Plan déposé', 'Lecture', 'Tiroir', 'Calendrier', 'Témoin', 'Relance'], ['Dossier classé', 'Calendrier', 'Témoin', 'Relance', 'Archivage', 'Fin']];
export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 2 : forced; return { k, u: w % SC_T, sc: SCEN[k] }; };
const sm = (x) => ease(clamp(x));
const io = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const lerp = (a, b, f) => a + (b - a) * f;

/** jour simulé du mois (10 = date de dépôt) ; retour rapide en fin de scénario pour reboucler */
export function day(u, k) { return k === 0 ? 10 + 20 * sm(seg(u, 28, 46)) - 20 * sm(seg(u, 52, 58)) : 10 + 12 * sm(seg(u, 4, 20)) - 12 * sm(seg(u, 52, 58)); }
const cross = (k, d) => { for (let u = 0; u < 52; u += .02) if (day(u, k) >= d) return u; return Infinity; };
export const TW = [0, 1].map((k) => cross(k, SCEN[k].warn)), TR = [0, 1].map((k) => cross(k, SCEN[k].due));
export const STEP_T = [[.8, 3.5, 7, 28, TW[0], TR[0]], [.8, 4, TW[1], TR[1], 24, 50]];
export const stepAt = (u, k) => { let s = 0; STEP_T[k].forEach((t, i) => { if (u >= t - .01) s = i; }); return s; };

/** témoin d'approche, relance (cloche, languette) */
export function alerts(u, k) {
  const tw = TW[k], tr = TR[k], reset = sm(seg(u, 52, 55));
  return { warn: u >= tw && u < 55 ? 1 : 0, due: u >= tr && u < 55 ? 1 : 0, bell: u >= tr && u < tr + 1.6 ? Math.sin((u - tr) * 24) * Math.exp(-(u - tr) * 1.5) : 0, tab: sm(seg(u, tr + .5, tr + 1.8)) * (1 - reset) };
}
/** pince : chariot, hauteur de la prise, mâchoires, dossier porté, tiroir ouvert (par cible) */
export function gripper(u, k) {
  let x = PICK[0], tip = TIP_REST, jaw = 0, carried = false, draw = [0, 0];
  if (k === 0) {
    const d = DRAW[0]; tip = TIP_REST - 69 * tr(u, 6.5, 7.7, 8, 9) - (TIP_REST - (d.z - 5)) * tr(u, 14, 15.5, 16.5, 17.5);
    x = lerp(PICK[0], d.x, io(seg(u, 9, 14))); if (u >= 19) x = lerp(d.x, PICK[0], io(seg(u, 19, 24)));
    jaw = tr(u, 7.2, 7.7, 15.4, 16.2); carried = u >= 7.7 && u < 16; draw[0] = sm(seg(u, 11, 13)) * (1 - sm(seg(u, 17.2, 19)));
  } else {
    const d = DRAW[1], pz = d.z - 5;
    x = lerp(PICK[0], d.x, io(seg(u, 22, 26))); if (u >= 29) x = lerp(d.x, ARCH_X, io(seg(u, 29, 37))); if (u >= 41) x = lerp(ARCH_X, PICK[0], io(seg(u, 41, 46)));
    tip = TIP_REST - (TIP_REST - pz) * tr(u, 26, 27.5, 28, 29) - (TIP_REST - 62) * tr(u, 37, 38.5, 40, 41);
    jaw = tr(u, 27.2, 27.7, 38.8, 39.4); carried = u >= 27.7 && u < 39; draw[1] = sm(seg(u, 24, 26)) * (1 - sm(seg(u, 28.5, 30)));
  }
  return { x, tip, jaw, carried, draw };
}
const tr = (u, a1, a2, b1, b2) => sm(seg(u, a1, a2)) * (1 - sm(seg(u, b1, b2)));
/** dossier : { vis, x, y, z } */
export function folder(u, k, g) {
  if (k === 0) {
    if (u < .5) return { vis: false };
    if (u < 7.7) { const f = io(seg(u, .5, 3)); return { vis: true, x: lerp(HOUSE_X, PICK[0], f), y: 24, z: 28 }; }
    if (g.carried) return { vis: true, x: g.x, y: 24, z: g.tip - 3 };
    const d = DRAW[0]; if (u < 32) { const o = g.draw[0]; return { vis: o > 0 || u < 18, x: d.x, y: -14 + 38 * o, z: d.z - 7.4 + (u < 16.6 ? 3 * (1 - sm(seg(u, 15.5, 16.6))) : 0) }; }
    return { vis: false };
  }
  const d = DRAW[1];
  if (u < 27.7) { const o = g.draw[1]; return { vis: o > .02, x: d.x, y: -14 + 38 * o, z: d.z - 7.4 }; }
  if (g.carried) return { vis: true, x: g.x, y: 24, z: g.tip - 3 };
  if (u < 40) return { vis: true, x: ARCH_X, y: 24, z: g.tip - 3 - 25 * sm(seg(u, 39, 40)) };
  return { vis: false };
}
export const readLamps = (u, k) => (k === 0 ? [0, 1, 2].map((j) => (u >= 4 + j && u < 9 ? 1 : 0)) : [0, 0, 0]);
export const scanBar = (u, k) => ({ on: k === 0 && u >= 3.4 && u < 6.2, f: k === 0 ? Math.abs(Math.sin(Math.PI * seg(u, 3.4, 6.2))) : 0 });
