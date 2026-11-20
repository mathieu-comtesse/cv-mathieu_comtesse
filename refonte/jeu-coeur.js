/* Mini-jeu de la sphère : noyau pur et déterministe (aucun accès au DOM, à l'heure ni au hasard global).
 *
 * Le parcours est le site lui-même vu dans la scène Expo : la piste suit l'axe vertical de la page (la « rangée » r, en pixels de page),
 * la largeur de piste est virtuelle (0 à LARGEUR, indépendante de la fenêtre) et la hauteur h part du sol. Les mots, les étoiles et les nœuds
 * sont posés aux rangées des vrais contenus ; les trous, tremplins, obstacles et trous noirs sont générés par une graine : même plan, même partie.
 *
 * Pas de temps fixe PAS (1/120 s). `pas(etat, plan, entrees)` ne dépend que de l'état, du plan et des entrées : rejouable à l'identique.
 * Entrées : { dir: -1..1, dgaz: -1..1 (vitesse de variation de l'accélérateur), saut: booléen (appui pendant ce pas) }.
 * Événements rendus (pour le son et les particules, jamais lus par la physique) : saut, atterrit, tremplin, rebond, choc, collecte, aspire,
 * chute, relance, arrivee.
 *
 * Règles originales (la référence ne documente que l'interface : touches a, d, z, q, e, commande à glisser, bouton de départ) :
 * mots, étoiles et nœuds se récupèrent au contact ou par attraction ; chaque objet fait grossir la sphère ; une chute ou un trou noir
 * ramène au dernier point de passage (début de chapitre), avec une pénalité de score et une sphère un peu réduite. */

export const PAS = 1 / 120;
export const LARGEUR = 1200;
export const G = 2600, VMIN = 480, VMAX = 1500, ACC_SOL = 1400, ACC_AIR = 520, AX = 3000, AMORT_SOL = 3.2, AMORT_AIR = 0.9, VXMAX = 1000, REST = 0.35;
export const SAUT = 980, TREMPLIN = 1500, COYOTE = 0.09, TAMPON = 0.12, RAYON_MIN = 28, RAYON_MAX = 56, CHUTE_H = -520, DUREE_CHUTE = 1.1, DUREE_ASPIRE = 0.9;
export const V_TREMPLIN_MIN = 800;
export const BN_INFLUENCE = 300, BN_CAPTURE = 62, BN_FORCE = 2300;
export const VALEUR = { mot: 10, noeud: 5, etoile: 50 }, CROISSANCE = { mot: 1, noeud: 0.5, etoile: 5 };
export const PENALITE_CHUTE = 30;

export const hache = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; };
export const alea = (g) => () => { g |= 0; g = g + 0x6D2B79F5 | 0; let t = Math.imul(g ^ g >>> 15, 1 | g); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const borne = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- plan : le parcours dérivé de la page ---------- */
/* chapitres : [{ id, nom, top, bas }] ; mots : [{ texte, row, chapitre, id }] ; fin : dernière rangée de la page */
export function construitPlan({ chapitres, mots, fin, graine = 'comtesse.me' }) {
  const depart = Math.max(0, chapitres[0].top - 500), arrivee = fin - 420, rd = alea(hache(graine));
  const trous = [], rampes = [], obstacles = [], noirs = [], objets = [], points = [];
  /* points de passage : début de chaque chapitre ; chaque zone dangereuse en reste à plus de 700 px */
  chapitres.forEach((c, i) => points.push({ r: Math.max(depart + 120, c.top - 100), chapitre: c.id, i }));
  /* zones de danger, chapitre par chapitre : la première commence 800 px après le point de passage, la dernière finit 700 px avant le suivant ;
     un chapitre trop court pour contenir une zone n'en reçoit pas ; l'écart de 700 px autour des points de passage est ainsi toujours respecté */
  const TYPES = ['obstacles', 'trou-partiel', 'trou-noir', 'trou-total', 'obstacles-trou', 'libre', 'trou-noir', 'trou-partiel'], ETENDUE = { 'obstacles': 760, 'trou-partiel': 430, 'trou-noir': 920, 'trou-total': 810, 'obstacles-trou': 1500, 'libre': 0 };
  points.forEach((pt, ci) => {
    const limite = (points[ci + 1] ? points[ci + 1].r : arrivee) - 700; let k = 0;
    for (let r0 = pt.r + 800; r0 < limite; r0 += 2300, k++) {
      const g = alea(hache(graine + '|zone|' + ci + '|' + k)); let type = TYPES[Math.floor(g() * TYPES.length)];
      while (r0 + ETENDUE[type] > limite && type !== 'libre') type = ['obstacles', 'trou-partiel', 'trou-noir', 'trou-total', 'libre'][Math.floor(g() * 5)];
      if (type === 'libre' || r0 + ETENDUE[type] > limite) continue;
      const gaucheTrou = g() < 0.5;                                                  // zone mixte : le trou est du côté opposé au couloir des obstacles (sinon le seul passage mènerait dans le trou)
      if (type === 'obstacles' || type === 'obstacles-trou') {
        const libre = type === 'obstacles' ? 140 + g() * 700 : gaucheTrou ? 580 + g() * 100 : 90 + g() * 30;   // couloir libre de 520 px au moins
        for (let j = 0; j < 4; j++) { const w = 150 + g() * 40, x0 = (libre + 520 + g() * 60 + j * 90) % (LARGEUR - w); const dx = Math.abs(x0 + w / 2 - (libre + 260)); if (dx > 330) obstacles.push({ x0, x1: x0 + w, r0: r0 + j * 230, r1: r0 + j * 230 + 60, hh: 60 + Math.floor(g() * 3) * 15 }); }
      }
      if (type === 'trou-partiel') trous.push({ x0: gaucheTrou ? 0 : 480, x1: gaucheTrou ? 720 : LARGEUR, r0, r1: r0 + 420 });
      if (type === 'obstacles-trou') trous.push({ x0: gaucheTrou ? 0 : 700, x1: gaucheTrou ? 500 : LARGEUR, r0: r0 + 1050, r1: r0 + 1470 });
      if (type === 'trou-total') { const cx = 350 + g() * 500; rampes.push({ x0: cx - 260, x1: cx + 260, r0, r1: r0 + 140 }); trous.push({ x0: 0, x1: LARGEUR, r0: r0 + 420, r1: r0 + 780 }); }
      if (type === 'trou-noir') noirs.push({ x: 300 + g() * 600, r: r0 + 600 });
    }
  });
  /* points de passage intermédiaires : tous les 4 000 px environ, à la rangée libre de tout danger (700 px de marge) la plus proche, pour qu'une chute
     dans un long chapitre ne renvoie jamais loin en arrière */
  const dangers = () => [...trous.map((h) => [h.r0, h.r1]), ...rampes.map((h) => [h.r0, h.r1]), ...obstacles.map((h) => [h.r0, h.r1]), ...noirs.map((b) => [b.r - BN_INFLUENCE, b.r + BN_INFLUENCE])];
  const libre = (r, d) => d.every(([a, b]) => r + 700 < a || r - 700 > b);
  { const d = dangers(); let dernier = depart;
    for (let cible = depart + 4000; cible < arrivee - 1500; cible = dernier + 4000) {
      let ok = null; for (let ecart = 0; ecart <= 2200 && ok === null; ecart += 50) for (const s of [1, -1]) { const r = cible + s * ecart; if (r > dernier + 1500 && r < arrivee - 1200 && libre(r, d) && points.every((q) => Math.abs(q.r - r) > 800)) { ok = r; break; } }
      if (ok === null) { dernier = cible; continue; }
      const c = chapitres.filter((q) => q.top <= ok).at(-1) || chapitres[0]; points.push({ r: ok, chapitre: c.id, i: -1 }); dernier = ok;
    }
    points.sort((u, v) => u.r - v.r); points.forEach((q, k) => { q.i = k; }); }
  const tri = (a) => a.sort((u, v) => u.r0 - v.r0);
  tri(trous); tri(rampes); tri(obstacles); noirs.sort((u, v) => u.r - v.r);
  /* objets : mots aux rangées des contenus, étoiles de chapitre et de thème, nœuds en arc devant chaque étoile */
  mots.forEach((m, i) => { const g = alea(hache(graine + '|mot|' + i + m.texte)); objets.push({ type: 'mot', r: m.row, x: 150 + g() * 900, h: 0, ray: 30, texte: m.texte, chapitre: m.chapitre, id: m.id }); });
  chapitres.forEach((c, i) => {
    const g = alea(hache(graine + '|etoile|' + c.id)), r = Math.min(c.bas - 400, c.top + 520);
    objets.push({ type: 'etoile', r, x: 300 + g() * 600, h: 60, ray: 44, texte: c.nom, chapitre: c.id, id: 'etoile:' + c.id });
    for (let j = 0; j < 6; j++) objets.push({ type: 'noeud', r: r + 140 + j * 120, x: borne(objets.at(-1 - j).x + Math.sin(j * 1.4 + i) * 220, 80, LARGEUR - 80), h: j % 2 ? 120 : 20, ray: 20, texte: '', chapitre: c.id, id: 'noeud:' + c.id + ':' + j });
  });
  const long = chapitres.reduce((m, c) => (c.bas - c.top > m.l ? { l: c.bas - c.top, c } : m), { l: 0 }).c;
  for (let j = 0; j < 4; j++) { const g = alea(hache(graine + '|theme|' + j)), r = long.top + (j + 1) * (long.bas - long.top) / 5; objets.push({ type: 'etoile', r, x: 250 + g() * 700, h: 60, ray: 44, texte: 'thème ' + (j + 1), chapitre: long.id, id: 'theme:' + j }); }
  objets.sort((u, v) => u.r - v.r);
  const valeurMax = objets.reduce((s, o) => s + CROISSANCE[o.type], 0);
  return { depart, arrivee, trous, rampes, obstacles, noirs, objets, points, chapitres, valeurMax, graine, largeur: LARGEUR };
}

/* ---------- état ---------- */
export function creeEtat(plan) {
  const p0 = plan.points[0];
  return { t: 0, n: 0, r: plan.depart, x: LARGEUR / 2, h: 0, vr: 0, vx: 0, vh: 0, gaz: 0.45, sol: true, rayon: RAYON_MIN, croiss: 0, rayonCible: RAYON_MIN, score: 0,
    mots: 0, etoiles: 0, noeuds: 0, chutes: 0, chocs: 0, sauts: 0, tremplins: 0, pris: new Float64Array(plan.objets.length).fill(-1), etat: 'attente', tEtat: 0, cp: { r: plan.depart + 20, x: LARGEUR / 2, i: -1 },
    coyote: 0, tampon: 0, rampe: -1, engage: false, cible: null, combo: 0, tCombo: -9, ev: [], vitMax: 0 };
}

const dans = (a, x, r) => x >= a.x0 && x <= a.x1 && r >= a.r0 && r <= a.r1;
/* premier indice dont le début de rangée est >= v - marge (tableaux triés par r0 ou r) */
function debut(arr, v, cle) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m][cle] < v) lo = m + 1; else hi = m; } return lo; }
const SPAN = 1000;
export const dansTrou = (plan, x, r) => { for (let i = debut(plan.trous, r - SPAN, 'r0'); i < plan.trous.length && plan.trous[i].r0 <= r; i++) if (dans(plan.trous[i], x, r)) return true; return false; };
export const rampeEn = (plan, x, r) => { for (let i = debut(plan.rampes, r - SPAN, 'r0'); i < plan.rampes.length && plan.rampes[i].r0 <= r; i++) if (dans(plan.rampes[i], x, r)) return i; return -1; };

export function demarre(etat) { etat.etat = 'course'; etat.tEtat = 0; etat.vr = VMIN; etat.sol = false; etat.h = 0; }

/* un pas de PAS secondes */
export function pas(etat, plan, e = {}) {
  const dt = PAS; etat.ev.length = 0; etat.n++;
  etat.rayon += (etat.rayonCible - etat.rayon) * (1 - Math.exp(-6 * dt));
  if (etat.etat === 'attente') return etat.ev;
  etat.tEtat += dt;
  if (etat.etat === 'arrive') { etat.vr = Math.max(0, etat.vr - 700 * dt); etat.r += etat.vr * dt; etat.vx *= 1 - 3 * dt; etat.x = borne(etat.x + etat.vx * dt, etat.rayon, LARGEUR - etat.rayon); return etat.ev; }
  etat.t += dt;
  if (etat.etat === 'aspire') {                                       /* spirale vers le centre du trou noir, la sphère rétrécit */
    const c = etat.cible, q = Math.min(1, etat.tEtat / DUREE_ASPIRE), a = q * q * 9, rr = (1 - q) * etat.rAsp;
    etat.x = c.x + Math.cos(a + etat.aAsp) * rr; etat.r = c.r + Math.sin(a + etat.aAsp) * rr; etat.h = etat.hAsp * (1 - q) - q * 140; etat.rayon = Math.max(4, etat.rayon * (1 - 0.8 * dt / DUREE_ASPIRE * 3));
    if (etat.tEtat >= DUREE_ASPIRE) tombe(etat, plan);
    return etat.ev;
  }
  if (etat.etat === 'chute') { etat.vh -= G * dt; etat.h += etat.vh * dt; etat.r += etat.vr * dt * 0.6; if (etat.tEtat >= DUREE_CHUTE) relance(etat, plan); return etat.ev; }

  /* course */
  etat.gaz = borne(etat.gaz + (e.dgaz || 0) * 0.9 * dt + (e.gazDelta || 0), 0, 1);   /* gazDelta : variation instantanée (molette) */
  const vCible = VMIN + (VMAX - VMIN) * etat.gaz, acc = etat.sol ? ACC_SOL : ACC_AIR;
  etat.vr += borne(vCible - etat.vr, -acc * (etat.sol ? 1 : 0.15) * dt, acc * dt);   /* en l'air, la vitesse acquise ne retombe presque pas : la poussée d'un tremplin porte jusqu'au bout du saut */
  etat.vx += (e.dir || 0) * AX * dt; etat.vx -= etat.vx * (etat.sol ? AMORT_SOL : AMORT_AIR) * dt; etat.vx = borne(etat.vx, -VXMAX, VXMAX);
  etat.coyote = etat.sol ? COYOTE : Math.max(0, etat.coyote - dt); etat.tampon = e.saut ? TAMPON : Math.max(0, etat.tampon - dt);
  if (etat.tampon > 0 && etat.coyote > 0) { etat.vh = SAUT; etat.sol = false; etat.coyote = 0; etat.tampon = 0; etat.sauts++; etat.ev.push({ t: 'saut' }); }
  etat.r += etat.vr * dt; etat.x += etat.vx * dt;
  const R = etat.rayon;
  if (etat.x < R) { if (etat.vx < -250) etat.ev.push({ t: 'rebond', v: -etat.vx }); etat.x = R; etat.vx = -etat.vx * REST; }
  else if (etat.x > LARGEUR - R) { if (etat.vx > 250) etat.ev.push({ t: 'rebond', v: etat.vx }); etat.x = LARGEUR - R; etat.vx = -etat.vx * REST; }
  /* vertical : sol plein sauf dans un trou */
  const trou = dansTrou(plan, etat.x, etat.r);
  if (!etat.sol || etat.vh > 0 || etat.h > 0) { etat.vh -= G * dt; etat.h += etat.vh * dt; }
  if (trou && etat.h < -etat.rayon * 0.6) etat.engage = true;        /* sous le niveau du sol dans un trou : la chute est engagée, le bord opposé ne rattrape plus la sphère */
  if (etat.h <= 0 && !trou && !etat.engage) { if (etat.vh < -450 && !etat.sol) { etat.ev.push({ t: 'atterrit', v: -etat.vh }); } etat.h = 0; etat.vh = etat.vh < -750 ? -etat.vh * 0.22 : 0; etat.sol = etat.vh === 0; }
  else if ((trou || etat.engage) && etat.h <= 0) etat.sol = false;
  else if (etat.h > 0) etat.sol = false;
  if (etat.h < CHUTE_H) { etat.etat = 'chute'; etat.tEtat = 0; etat.ev.push({ t: 'chute', cause: 'trou' }); return etat.ev; }
  /* tremplin */
  const ri = rampeEn(plan, etat.x, etat.r);
  if (ri >= 0 && etat.h < 12 && ri !== etat.rampe) { etat.rampe = ri; etat.vh = TREMPLIN; etat.sol = false; etat.vr = Math.min(VMAX * 1.15, Math.max(V_TREMPLIN_MIN, etat.vr * 1.12 + 60));   /* même à vitesse minimale, la poussée du tremplin permet de franchir le trou qui suit (voir tools/equilibrage-jeu.mjs) */ etat.tremplins++; etat.ev.push({ t: 'tremplin', i: ri }); }
  else if (ri < 0) etat.rampe = -1;
  /* obstacles : cercle contre rectangle dans le plan de la piste, franchissable si la sphère passe au-dessus */
  for (let i = debut(plan.obstacles, etat.r - SPAN, 'r0'); i < plan.obstacles.length && plan.obstacles[i].r0 <= etat.r + R; i++) {
    const o = plan.obstacles[i]; if (etat.h > o.hh + R * 0.5) continue;
    const cx = borne(etat.x, o.x0, o.x1), cr = borne(etat.r, o.r0, o.r1), dx = etat.x - cx, dr = etat.r - cr, d = Math.hypot(dx, dr);
    if (d < R) {
      const v = Math.abs(etat.vr); const nx = d > 1e-6 ? dx / d : 0, nr = d > 1e-6 ? dr / d : -1;
      etat.x += nx * (R - d); etat.r += nr * (R - d);
      if (Math.abs(nr) > 0.4) { etat.vr = -Math.abs(etat.vr) * 0.3; } else { etat.vx = nx * 380; }
      etat.chocs++; etat.ev.push({ t: 'choc', v });
    }
  }
  /* trous noirs : attraction dans le plan de la piste, capture au centre si la sphère n'est pas passée très haut */
  for (let i = debut(plan.noirs, etat.r - BN_INFLUENCE, 'r'); i < plan.noirs.length && plan.noirs[i].r <= etat.r + BN_INFLUENCE; i++) {
    const b = plan.noirs[i], dx = b.x - etat.x, dr = b.r - etat.r, d = Math.hypot(dx, dr);
    if (d < BN_INFLUENCE && d > 1e-6) { const q = 1 - d / BN_INFLUENCE, f = BN_FORCE * q * Math.sqrt(q); etat.vx += (dx / d) * f * dt; etat.vr += (dr / d) * f * dt * 0.7; }
    if (d < BN_CAPTURE && etat.h < 150) { etat.etat = 'aspire'; etat.tEtat = 0; etat.cible = b; etat.rAsp = d; etat.aAsp = Math.atan2(etat.r - b.r, etat.x - b.x); etat.hAsp = etat.h; etat.ev.push({ t: 'aspire' }); return etat.ev; }
  }
  /* objets : récupérés dans un rayon qui dépend de la sphère ; `pris[i]` garde l'instant de la capture (l'attraction visuelle part de là) */
  for (let i = debut(plan.objets, etat.r - 140 - R * 3, 'r'); i < plan.objets.length && plan.objets[i].r <= etat.r + 140 + R * 3; i++) {
    if (etat.pris[i] >= 0) continue; const o = plan.objets[i], d = Math.hypot(etat.x - o.x, etat.r - o.r, etat.h + R - (o.h + o.ray));
    if (d < R * 2.6 + o.ray * 1.2) {
      etat.pris[i] = etat.t; etat.combo = etat.t - etat.tCombo < 1.6 ? etat.combo + 1 : 1; etat.tCombo = etat.t;
      etat.score += VALEUR[o.type] * (1 + Math.min(4, etat.combo - 1) * 0.1); etat.croiss += CROISSANCE[o.type] / plan.valeurMax;
      etat.rayonCible = RAYON_MIN + (RAYON_MAX - RAYON_MIN) * Math.pow(Math.min(1, etat.croiss), 0.8);
      etat[o.type === 'mot' ? 'mots' : o.type === 'etoile' ? 'etoiles' : 'noeuds']++; etat.ev.push({ t: 'collecte', type: o.type, i, combo: etat.combo });
    }
  }
  /* points de passage et arrivée */
  for (const p of plan.points) if (p.i > etat.cp.i && etat.r >= p.r) etat.cp = { r: p.r, x: LARGEUR / 2, i: p.i };
  etat.vitMax = Math.max(etat.vitMax, etat.vr);
  if (etat.r >= plan.arrivee) { etat.etat = 'arrive'; etat.tEtat = 0; etat.score += Math.max(0, Math.round(600 - etat.t * 2)); etat.ev.push({ t: 'arrivee' }); }
  return etat.ev;
}

function tombe(etat, plan) { etat.etat = 'chute'; etat.tEtat = DUREE_CHUTE; relance(etat, plan); }
function relance(etat) {
  etat.chutes++; etat.score = Math.max(0, etat.score - PENALITE_CHUTE); etat.croiss *= 0.9; etat.rayonCible = RAYON_MIN + (RAYON_MAX - RAYON_MIN) * Math.pow(Math.min(1, etat.croiss), 0.8); etat.rayon = Math.max(RAYON_MIN, etat.rayon);
  etat.r = etat.cp.r; etat.x = etat.cp.x; etat.h = 420; etat.vh = 0; etat.vr = VMIN; etat.vx = 0; etat.sol = false; etat.etat = 'course'; etat.tEtat = 0; etat.rampe = -1; etat.combo = 0; etat.engage = false; etat.ev.push({ t: 'relance' });
}

export const empreinte = (e) => { let h = 5381; const s = [e.n, e.r, e.x, e.h, e.vr, e.vx, e.vh, e.gaz, e.rayon, e.score, e.mots, e.etoiles, e.noeuds, e.chutes, e.chocs, e.sauts, e.tremplins, e.etat].map((v) => typeof v === 'number' ? v.toFixed(3) : v).join('|'); for (let i = 0; i < s.length; i++) h = Math.imul(h, 33) ^ s.charCodeAt(i); return h >>> 0; };

/* ---------- pilote automatique (tests) : mêmes entrées qu'un joueur, aucune téléportation ---------- */
export function pilote(etat, plan, opts = {}) {
  const gazVoulu = opts.gaz ?? 0.45, R = etat.rayon, avance = 260 + etat.vr * 1.1, fin = etat.r + avance, bloc = [];
  let gap = null;
  for (const t of plan.trous) { if (t.r1 < etat.r - 60 || t.r0 > fin) continue; if (t.x0 <= 0 && t.x1 >= LARGEUR) gap = gap && gap.r0 < t.r0 ? gap : t; else bloc.push([t.x0 - R * 0.5 - 30, t.x1 + R * 0.5 + 30, t.r0, t.r1]); }
  for (const b of plan.noirs) if (b.r > etat.r - 120 && b.r < fin + 120) { const m = 190 + 90000 / Math.max(300, etat.vr); bloc.push([b.x - m, b.x + m, b.r - m, b.r + m]); }   /* plus lent, la sphère reste plus longtemps sous l'attraction : marge plus large */
  for (const o of plan.obstacles) if (o.r1 > etat.r - 60 && o.r0 < fin) bloc.push([o.x0 - R - 30, o.x1 + R + 30, o.r0, o.r1]);
  let cible = LARGEUR / 2, meilleur = -1e9;
  const ramp = gap ? plan.rampes.find((q) => q.r1 <= gap.r0 && q.r1 > etat.r - 40 && gap.r0 - q.r1 < 500) : null;
  for (let x = R + 20; x <= LARGEUR - R - 20; x += 30) {
    let s = -Math.abs(x - etat.x) * 0.05;
    for (const b of bloc) if (x >= b[0] && x <= b[1]) s -= 100000;
    if (ramp) { if (x >= ramp.x0 + 40 && x <= ramp.x1 - 40) s += 5000 - Math.abs(x - (ramp.x0 + ramp.x1) / 2); else if (etat.r < ramp.r1) s -= 3000; }
    for (let i = debut(plan.objets, etat.r, 'r'); i < plan.objets.length && plan.objets[i].r <= fin; i++) { if (etat.pris[i] >= 0) continue; const o = plan.objets[i]; s += (VALEUR[o.type] * 8) / (1 + Math.abs(x - o.x) / 50) / (1 + (o.r - etat.r) / 400); }
    if (s > meilleur) { meilleur = s; cible = x; }
  }
  const dir = borne((cible - etat.x - etat.vx * 0.32) / (200 - 110 * Math.min(1, etat.vr / 1500)), -1, 1);   /* plus vite, il faut braquer plus franchement */
  let saut = false;
  if (gap && !ramp && gap.r0 - etat.r < etat.vr * 0.16 && gap.r0 - etat.r > 0 && etat.sol) saut = true;
  for (const o of plan.obstacles) { if (o.r0 - etat.r > 0 && o.r0 - etat.r < etat.vr * 0.14 && etat.x > o.x0 - R && etat.x < o.x1 + R && etat.sol) saut = true; }
  for (let i = debut(plan.objets, etat.r, 'r'); i < plan.objets.length && plan.objets[i].r <= etat.r + etat.vr * 0.22; i++) { const o = plan.objets[i]; if (etat.pris[i] < 0 && o.h > 40 && o.r - etat.r > etat.vr * 0.06 && Math.abs(etat.x - o.x) < R * 2.2 && etat.sol) saut = true; }
  return { dir, dgaz: borne((gazVoulu - etat.gaz) * 4, -1, 1), saut };
}
