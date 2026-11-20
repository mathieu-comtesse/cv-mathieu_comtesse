// Étude d'équilibrage du mini-jeu (noyau pur, sans navigateur) : le pilote automatique joue des parties complètes à plusieurs vitesses
// (accélérateur fixe de 0 à 1) ; on relève durée, chutes, chocs, objets pris et score, pour vérifier qu'à toute vitesse la partie est finie,
// qu'elle tient dans la fenêtre visée de 1 à 3 minutes pour une vitesse courante, et que la note n'est pas donnée à l'une ou l'autre extrémité.
// Usage : node tools/equilibrage-jeu.mjs   (code de sortie 1 si une exigence n'est pas tenue)
import * as J from '../refonte/jeu-coeur.js';
const TOPS = [1454, 3781, 5663, 8139, 10615, 12893, 15617, 18291, 63110, 68019, 79211], FIN = 82804, NOMS = ['Prévention', 'Maintenance', 'Data', 'IA', 'Référentiels', 'Méthodes', 'Savoir-être', 'Projets pro', 'Parcours', 'Mondes', 'Blog'], NB = [6, 4, 7, 7, 6, 8, 8, 11, 5, 11, 10];
const chapitres = TOPS.map((top, i) => ({ id: 'c' + i, nom: NOMS[i], top, bas: TOPS[i + 1] ?? FIN })), mots = [];
chapitres.forEach((c, i) => { for (let j = 0; j < NB[i]; j++) mots.push({ texte: `${c.nom} ${j + 1}`, row: c.top + 300 + (j + 0.5) * (c.bas - c.top - 600) / NB[i], chapitre: c.id, id: `m${i}-${j}` }); });
const plan = J.construitPlan({ chapitres, mots, fin: FIN }), echecs = [], verifie = (ok, t) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + t); if (!ok) echecs.push(t); };
const note = (s) => (s >= 2300 ? 'S' : s >= 1700 ? 'A' : s >= 1100 ? 'B' : 'C');
const partie = (gaz) => { const e = J.creeEtat(plan); J.demarre(e); e.gaz = gaz; let chutesRelance = 0; for (let i = 0; i < 400 / J.PAS && e.etat !== 'arrive'; i++) { const en = J.pilote(e, plan, { gaz }); J.pas(e, plan, en); }
  return { gaz, fini: e.etat === 'arrive', t: e.t, chutes: e.chutes, chocs: e.chocs, objets: e.mots + e.etoiles + e.noeuds, score: Math.round(e.score), rayon: e.rayon, vit: e.vitMax, relances: chutesRelance }; };
console.log('accélérateur | durée   | chutes | chocs | objets | score | note | vitesse max');
const R = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1].map(partie);
for (const r of R) console.log(`${r.gaz.toFixed(2).padStart(12)} | ${r.t.toFixed(0).padStart(4)} s  | ${String(r.chutes).padStart(6)} | ${String(r.chocs).padStart(5)} | ${String(r.objets).padStart(6)} | ${String(r.score).padStart(5)} | ${note(r.score).padStart(4)} | ${r.vit.toFixed(0)} px/s`);
verifie(R.every((r) => r.fini), 'partie finie à toutes les vitesses (aucun blocage)');
verifie(R.every((r) => r.t <= 180), `durée au plus ${Math.max(...R.map((r) => r.t)).toFixed(0)} s à la vitesse minimale (fenêtre visée : 60 à 180 s)`);
verifie(R.filter((r) => r.gaz >= 0.3 && r.gaz <= 0.8).every((r) => r.t >= 60), `durée d'au moins ${Math.min(...R.filter((r) => r.gaz >= 0.3 && r.gaz <= 0.8).map((r) => r.t)).toFixed(0)} s aux vitesses courantes (0,3 à 0,8)`);
verifie(R.every((r) => r.chutes <= 4), `au plus ${Math.max(...R.map((r) => r.chutes))} chute(s) pour le pilote, à toute vitesse`);
const sc = R.map((r) => r.score); verifie(Math.max(...sc) < 2300, `la note S (2 300 points) reste à gagner : meilleur score du pilote ${Math.max(...sc)}`);
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : équilibrage du mini-jeu'); process.exit(echecs.length ? 1 : 0);
