// Reporteur Q18 : chronologie pure (fonction du temps partagé). Aucune donnée réelle : OT, zones et statuts sont fictifs.
// Trois scénarios de 36 s : A (rapport apparié, avec Q18), B (rapport apparié, sans Q18), C (rapport non apparié : balayage complet, aucune écriture).
import { clamp, seg, ease, easeOut } from './nisaru-geometry.js';

export const SC_T = 36, LOOP_T = SC_T * 3;
export const CARDS = [
  { ot: '1052', zone: 'B03' }, { ot: '2093', zone: 'B12' }, { ot: '3318', zone: 'A07' }, { ot: '3871', zone: 'A21' },
  { ot: '4102', zone: 'C05' }, { ot: '4290', zone: 'C14' }, { ot: '4417', zone: 'B08' }, { ot: '5560', zone: 'A02' }
];
export const PITCH = 26, CARD_X = (i) => (i - 3.5) * PITCH;
export const SCEN = [
  { id: 'A', ot: '4417', card: 6, q18: true, found: true, label: 'Rapport apparié, avec Q18', short: 'Avec Q18' },
  { id: 'B', ot: '2093', card: 1, q18: false, found: true, label: 'Rapport apparié, sans Q18', short: 'Sans Q18' },
  { id: 'C', ot: '7710', card: -1, q18: false, found: false, label: 'Rapport non apparié', short: 'Non apparié' }
];
export const ST = { verif: -30, strike: 0, punch: 30 };                 // x des trois postes, dans le repère de la machine
export const FIELD_Z = { ot: 110, rap: 100, stat: 90, date: 80, q18: 70 };   // hauteurs des champs d'une fiche (OT imprimé ; rapport, statut et date frappés ; Q18 poinçonné)
export const HEAD_REST = 126;

/* jalons (secondes dans le scénario) */
export const K = {
  pageIn: [.6, 3], scan: [3.2, 5.8], otLamp: [5.8, 11], keys: [6.6, 7.5, 8.4, 9.3], search: [10.6, 11.2],
  travel: [11.2, 19.4], head: [19.4, 25.4], strikes: [20.9, 22.4, 23.9], toPunch: [25.6, 27.0], punch: [27.2, 28.2], toVerif: [28.4, 30.0],
  verif: [30.2, 31.8], lampVerif: [30.4, 33.6], back: [31.6, 35.0], pbi: [32, 34], pageOut: [6.4, 9.6], drumZero: [33.2, 35.4], erase: [34.4, 35.9]
};
export const STEPS = ['Rapport', 'Lecture OT', 'Recherche de la ligne', 'Écriture', 'Q18 visible', 'Vérification'];
export const STEP_T = [0.6, 3.2, 11.2, 19.4, 25.6, 30.2];

export const wrap = (t) => ((t % LOOP_T) + LOOP_T) % LOOP_T;
export const locate = (t, forced = null) => { const w = wrap(t); const k = forced == null ? Math.floor(w / SC_T) % 3 : forced; return { k, u: w % SC_T, sc: SCEN[k] }; };
export const stepAt = (u) => { let s = 0; for (let i = 0; i < STEP_T.length; i++) if (u >= STEP_T[i]) s = i; return s; };

const smooth = (x) => ease(clamp(x));
const inout = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };       // départ doux, arrivée très lente
const pulse = (u, a, d) => Math.sin(Math.PI * clamp((u - a) / d)) ** 2;                                  // 0 -> 1 -> 0 sur d secondes

/** décalage du chariot (x) : les fiches se déplacent, les postes sont fixes */
export function carriageX(u, sc) {
  const rowX = sc.found ? CARD_X(sc.card) : 0;
  if (!sc.found) {
    // balayage complet : fin de course gauche, fin de course droite, retour (aucune fiche trouvée)
    if (u < K.travel[0]) return 0;
    if (u < 14.6) return -112 * inout(seg(u, K.travel[0], 14.6));
    if (u < 19.2) return -112 + 224 * inout(seg(u, 14.6, 19.2));
    if (u < 24) return 112 - 112 * inout(seg(u, 19.2, 24));
    return 0;
  }
  const cT = -rowX;                                                         // la fiche cible passe sous le poste de frappe
  if (u < K.travel[0]) return 0;
  if (u < K.toPunch[0]) return cT * inout(seg(u, K.travel[0], K.travel[1]));
  if (u < K.toVerif[0]) return cT + ST.punch * inout(seg(u, K.toPunch[0], K.toPunch[1]));
  if (u < K.back[0]) return cT + ST.punch - (ST.punch - ST.verif) * inout(seg(u, K.toVerif[0], K.toVerif[1]));
  return (cT + ST.verif) * (1 - inout(seg(u, K.back[0], K.back[1])));
}

/** tête de frappe : hauteur z du chariot de tête, et enfoncement du marteau (0 à 1) */
export function head(u, sc) {
  if (!sc.found || u < K.head[0] - 1) return { z: HEAD_REST, hit: 0, active: false };
  const f = [FIELD_Z.rap, FIELD_Z.stat, FIELD_Z.date], t = K.strikes;
  let z = HEAD_REST;
  const legs = [[K.head[0], t[0] - .5, HEAD_REST, f[0]], [t[0] + .35, t[1] - .5, f[0], f[1]], [t[1] + .35, t[2] - .5, f[1], f[2]], [t[2] + .35, K.head[1], f[2], HEAD_REST]];
  for (const [a, b, z0, z1] of legs) if (u >= a) z = z0 + (z1 - z0) * smooth(seg(u, a, b));
  const hit = Math.max(pulse(u, t[0] - .15, .3), pulse(u, t[1] - .15, .3), pulse(u, t[2] - .15, .3));
  return { z, hit, active: u > K.head[0] && u < K.head[1] };
}
export const strikeCount = (u, sc) => (sc.found ? K.strikes.filter((t) => u >= t).length : 0);
export const punchLever = (u, sc) => (sc.q18 ? pulse(u, K.punch[0], K.punch[1] - K.punch[0]) : 0);
export const punchDone = (u, sc) => sc.q18 && u >= K.punch[0] + (K.punch[1] - K.punch[0]) * .5;
export const verifPush = (u, sc) => (sc.found ? pulse(u, K.verif[0], K.verif[1] - K.verif[0]) : 0);
export const verified = (u, sc) => sc.found && u >= K.lampVerif[0];

/** voyants : lecture OT, recherche, vérification, non apparié */
export function lamps(u, sc) {
  const on = (a, b) => (u >= a && u < b ? 1 : 0);
  return {
    read: on(K.otLamp[0], K.otLamp[1]) * (.75 + .25 * Math.sin(u * 9)),
    search: on(K.search[0], sc.found ? K.travel[1] + .4 : 24) * (.7 + .3 * Math.sin(u * 7)),
    verif: sc.found ? on(K.lampVerif[0], K.lampVerif[1]) : 0,
    miss: sc.found ? 0 : on(24, K.drumZero[1])
  };
}

/** lecteur : feuille du rapport (position x, y, z et visibilité) et barre de balayage */
export function page(u) {
  const mag = -232, scanX = -190, rowY = 24, exitY = 64, z = 41;
  if (u < K.pageIn[0]) return { x: mag, y: rowY, z, vis: false };
  if (u < K.pageIn[1]) return { x: mag + (scanX - mag) * easeOut(seg(u, K.pageIn[0], K.pageIn[1])), y: rowY, z, vis: true };
  if (u < K.pageOut[0]) return { x: scanX, y: rowY, z, vis: true };
  const f = smooth(seg(u, K.pageOut[0], K.pageOut[1]));
  return { x: scanX, y: rowY + (exitY - rowY) * f, z, vis: f < 1 };
}
export const scanBar = (u) => { const v = seg(u, K.scan[0], K.scan[1]); return { x: -198 + 16 * (v < .5 ? v * 2 : 2 - v * 2), on: u >= K.scan[0] && u < K.scan[1] }; };

/** tambours de code OT : angle en dixièmes de tour pour chaque chiffre, depuis 0000 */
export function drums(u, sc) {
  return [0, 1, 2, 3].map((i) => {
    const d = Number(sc.ot[i]);
    const t = K.keys[i];
    if (u < t) return 0;
    if (u < K.drumZero[0]) return d * smooth(seg(u, t + .12, t + .7));
    return d + (10 - d) * smooth(seg(u, K.drumZero[0] + i * .25, K.drumZero[1] - (3 - i) * .15));
  });
}
/** enfoncement des touches : chiffre -> 0..1 */
export function keyPress(u, sc) {
  const out = new Array(10).fill(0);
  for (let i = 0; i < 4; i++) out[Number(sc.ot[i])] = Math.max(out[Number(sc.ot[i])], pulse(u, K.keys[i] - .05, .5));
  return out;
}

/** bande Power BI : crans accomplis (un cran par rapport apparié ; la bande est périodique, le retour de boucle est invisible) */
export const pbiNotches = (k, u) => SCEN.slice(0, k).filter((c) => c.found).length + (SCEN[k].found ? smooth(seg(u, K.pbi[0], K.pbi[1])) : 0);

/** contenu de la fiche cible à l'instant u : champs écrits, marque Q18, validation, effacement de la démonstration */
export function cardState(u, sc) {
  const s = strikeCount(u, sc);
  return { rap: s >= 1, stat: s >= 2, date: s >= 3, q18: punchDone(u, sc), ok: verified(u, sc), fade: 1 - seg(u, K.erase[0], K.erase[1]) };
}
