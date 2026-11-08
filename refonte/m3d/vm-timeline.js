// VRE, traitement par VM : chronologie pure (fonction du temps partagé). Rapports, OT et heures sont fictifs.
// Une enveloppe (le PDF) entre sur le convoyeur, une demande est créée dans la file, la relève de la VM la prend, le lecteur vérifie le code R004 et l'OT,
// puis : rangement dans le casier Excel (réussite), voie des doublons (déjà intégré) ou module de rejet (non apparié). À 17 h le distributeur imprime le récapitulatif.
import { clamp, seg, ease } from './nisaru-geometry.js';

export const SC_T = 48, LOOP_T = SC_T * 3;
export const SCEN = [
  { id: 'A', short: 'Traitement réussi', label: 'Rapport apparié : lien inséré dans le bon casier', ot: '4417', out: 'ok' },
  { id: 'B', short: 'Déjà intégré', label: 'Rapport déjà intégré : voie des doublons, aucune seconde insertion', ot: '4417', out: 'dup' },
  { id: 'C', short: 'Non apparié', label: 'Rapport non apparié : module de rejet', ot: '7710', out: 'rej' }
];
export const ENV_Y = 20, ENV_Z = 37.4, PICK_X = -35, DUP_X = 10, REJ_X = 40, PARK = [PICK_X, 20];
export const CAS = { c: 5, r: 1, x: 22 + 17 * 5, z: 22 + 22 * 1 }, CX = (c) => 22 + 17 * c, CZ = (r) => 22 + 22 * r;
export const STEPS = [['PDF déposé', 'Demande en file', 'Relève', 'Lecture', 'Rangement', 'Récapitulatif'], ['PDF déposé', 'Demande en file', 'Relève', 'Lecture', 'Voie des doublons', 'Fin de cycle'], ['PDF déposé', 'Demande en file', 'Relève', 'Lecture', 'Rejet', 'Fin de cycle']];
export const STEP_T = [[.8, 3, 5.5, 9.5, 19.6, 38], [.8, 3, 5.5, 9.5, 14.5, 38], [.8, 3, 5.5, 9.5, 17, 38]];

export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 3 : forced; return { k, u: w % SC_T, sc: SCEN[k] }; };
export const stepAt = (u, k) => { let s = 0; STEP_T[k].forEach((t, i) => { if (u >= t - .01) s = i; }); return s; };
const sm = (x) => ease(clamp(x));
const io = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const lerp = (a, b, f) => a + (b - a) * f;

/** horloge de l'atelier (minutes après 16 h), accélérée ; retour rapide en fin de cycle pour reboucler */
export function clock(u) {
  const rewind = sm(seg(u, 46.2, 47.9)), m = 46 + 14 * clamp(u / 38, 0, 1) + 4 * sm(seg(u, 38, 46));
  return { min: m - (m - 46) * rewind, tick: [48, 50, 52, 54, 56, 58, 60].some((t) => { const uu = (t - 46) / 14 * 38; return u >= uu && u < uu + .7; }), five: u >= 38 && u < 46.2 };
}
/** enveloppe : position, visibilité ; suit la pince quand elle la porte */
export function envelope(u, sc, grip) {
  if (u < .5) return { vis: false };
  let x = lerp(-190, -150, io(seg(u, .5, 2.5))), y = ENV_Y, z = ENV_Z;
  if (u >= 5.5) x = lerp(-150, -75, io(seg(u, 5.5, 8.5)));
  if (u >= 12.5) {
    if (sc.out === 'ok') x = lerp(-75, PICK_X, io(seg(u, 12.5, 15.5)));
    else { const xt = sc.out === 'dup' ? DUP_X : REJ_X, d = sc.out === 'dup' ? 17 : 19; x = lerp(-75, xt, io(seg(u, 12.5, d - 1)));
      const p = sm(seg(u, d, d + 1.5)); y = ENV_Y + 34 * p; if (p > .6) z = lerp(ENV_Z, 8.6, sm(seg(u, d + 1, d + 2.2))); return { vis: u < d + 2.4, x, y, z }; }
  }
  if (sc.out === 'ok' && grip.carried) return { vis: true, x: grip.x, y: grip.y, z: grip.z - 2.4 };
  if (sc.out === 'ok' && u >= 29) { const o = sm(seg(u, 27, 28.5)) * (1 - sm(seg(u, 30.8, 32.2))); return { vis: u < 32.3, x: CAS.x, y: -30 + 14 * o, z: 47.6 - 7.8 * sm(seg(u, 29.2, 30)) }; }
  return { vis: true, x, y, z };
}
/** pince : chariot, bras, descente, mâchoires ; porte l'enveloppe de la prise à la dépose (réussite seulement) */
export function gripper(u, sc) {
  let x = PICK_X, y = 20, z = 62, jaw = 0, carried = false;
  if (sc.out !== 'ok') return { x, y, z, jaw: 0, carried: false, rod: 0 };
  z = 62 - 22 * trap(u, 17, 18.2, 18.6, 19.6) - 12 * trap(u, 25, 27, 30, 31);
  x = lerp(PICK_X, CAS.x, io(seg(u, 19.6, 25))) + (CAS.x - PICK_X) * 0;
  if (u >= 33) x = lerp(CAS.x, PICK_X, io(seg(u, 33, 38.5)));
  y = lerp(20, -14, io(seg(u, 21.5, 25))); if (u >= 30) y = lerp(-14, 20, io(seg(u, 30.8, 38.5)));
  jaw = trap(u, 18.2, 18.6, 29, 30);
  carried = u >= 18.6 && u < 29;
  return { x, y, z, jaw, carried, rod: 62 - z };
}
const trap = (u, a1, a2, b1, b2) => sm(seg(u, a1, a2)) * (1 - sm(seg(u, b1, b2)));
/** casier cible : tiroir (0 à 1), tampon (0 à 1), marque et voyant, ligne du journal, récapitulatif */
export function casier(u, sc) {
  if (sc.out !== 'ok') return { drawer: 0, stamp: 0, mark: 0, lamp: 0, journal: 0, recap: 0 };
  const fade = 1 - sm(seg(u, 45, 47));
  return { drawer: sm(seg(u, 27, 28.5)) * (1 - sm(seg(u, 30.8, 32.2))), stamp: Math.sin(Math.PI * clamp(seg(u, 32.4, 33.8))), mark: (u >= 33.1 ? 1 : 0) * fade, lamp: (u >= 33.4 ? 1 : 0) * fade, journal: sm(seg(u, 33.8, 35.2)) * fade, recap: sm(seg(u, 38, 41)) * (1 - sm(seg(u, 44.5, 47))) };
}
/** poussoirs de voie : doublons (x 10) et rejet (x 40) */
export function pusher(which, u, sc) { const want = which === 0 ? 'dup' : 'rej', d = which === 0 ? 17 : 19; return sc.out === want ? sm(seg(u, d, d + .6)) * (1 - sm(seg(u, d + .8, d + 1.5))) : 0; }
/** demande (carte) : imprimée, tombe dans la file, accompagne l'enveloppe après la relève */
export function request(u) { return { vis: u >= 2.5, drop: sm(seg(u, 2.6, 4.2)), taken: sm(seg(u, 5.5, 6.5)) }; }
/** lecteur : balayage, voyants R004 / OT / déjà intégré / rejet */
export function reading(u, sc) {
  const bar = seg(u, 9, 12), on = u >= 9 && u < 12;
  return { on, f: bar < .5 ? bar * 2 : 2 - bar * 2, r004: u >= 9.6 && u < 15 ? 1 : 0, ot: sc.out === 'rej' ? 0 : (u >= 10.6 && u < 15 ? 1 : 0), bad: sc.out === 'rej' && u >= 10.6 && u < 20 ? 1 : 0, dup: sc.out === 'dup' && u >= 11.4 && u < 19 ? 1 : 0 };
}
export const reveal = (u) => sm(seg(u, 46, 47.5));
