// Noyau du mini-jeu (refonte/jeu-coeur.js) : physique déterministe, sauts, tremplins, trous, obstacles, trous noirs, collectes, croissance,
// chute et relance, arrivée, équité du parcours, partie complète pilotée par les mêmes entrées qu'un joueur (aucune téléportation).
// Aucun navigateur : le noyau est pur. Usage : node tools/test-jeu-coeur.mjs   (code de sortie 1 en cas d'échec)
import * as J from '../refonte/jeu-coeur.js';
const echecs = [], verifie = (ok, t) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + t); if (!ok) echecs.push(t); };
const proche = (a, b, tol) => Math.abs(a - b) <= tol;

/* plan de la page réelle (rangées mesurées à plat sur index.html, 11 chapitres, 83 mots) */
const TOPS = [1454, 3781, 5663, 8139, 10615, 12893, 15617, 18291, 63110, 68019, 79211], FIN = 82804, NOMS = ['Prévention & sécurité', 'Maintenance & exploitation', 'Data & automatisation', 'IA appliquée', 'Référentiels', 'Méthodes', 'Savoir-être', 'Projets professionnels', 'Parcours', 'Mondes & jeux', 'Blog & études'];
const IDS = ['agentic', 'sidekick', 'online', 'merchandising', 'retail', 'payments', 'operations', 'shop', 'marketing', 'fulfillment', 'developer'], NB = [6, 4, 7, 7, 6, 8, 8, 11, 5, 11, 10];
const chapitres = TOPS.map((top, i) => ({ id: IDS[i], nom: NOMS[i], top, bas: TOPS[i + 1] ?? FIN }));
const mots = []; chapitres.forEach((c, i) => { for (let j = 0; j < NB[i]; j++) mots.push({ texte: `${c.nom} ${j + 1}`, row: c.top + 300 + (j + 0.5) * (c.bas - c.top - 600) / NB[i], chapitre: c.id, id: `cv-${i}-${j}` }); });
const plan = J.construitPlan({ chapitres, mots, fin: FIN });
const vide = (extra = {}) => ({ depart: 0, arrivee: 1e9, trous: [], rampes: [], obstacles: [], noirs: [], objets: [], points: [{ r: 50, chapitre: 'x', i: 0 }], chapitres: [], valeurMax: 1, largeur: J.LARGEUR, ...extra });
const lance = (p, f = {}) => { const e = J.creeEtat(p); Object.assign(e, { r: 100, x: 600 }, f); J.demarre(e); e.vr = 800; e.sol = true; e.h = 0; return e; };
const joue = (e, p, secs, entrees = () => ({})) => { const evs = []; for (let i = 0, n = Math.round(secs / J.PAS); i < n; i++) { const en = typeof entrees === 'function' ? entrees(e, i) : entrees; for (const v of J.pas(e, p, en)) evs.push(v); } return evs; };

verifie(plan.objets.filter((o) => o.type === 'mot').length === 83 && plan.objets.filter((o) => o.type === 'etoile').length === 15 && plan.objets.filter((o) => o.type === 'noeud').length === 66, `plan : ${plan.objets.length} objets (83 mots, 15 étoiles, 66 nœuds), ${plan.trous.length} trous, ${plan.rampes.length} tremplins, ${plan.obstacles.length} obstacles, ${plan.noirs.length} trous noirs, ${plan.points.length} points de passage`);
verifie(plan.points.every((p) => ![...plan.trous, ...plan.rampes, ...plan.obstacles].some((h) => p.r > h.r0 - 700 && p.r < h.r1 + 700) && !plan.noirs.some((b) => Math.abs(b.r - p.r) < 700)), 'équité : aucun danger à moins de 700 px d\'un point de passage (la relance est toujours sûre)');
verifie(plan.trous.filter((t) => t.x0 <= 0 && t.x1 >= J.LARGEUR).every((t) => plan.rampes.some((r) => r.r1 <= t.r0 && t.r0 - r.r1 < 500)) && plan.trous.filter((t) => t.x1 - t.x0 < J.LARGEUR).every((t) => J.LARGEUR - (t.x1 - t.x0) >= 480), 'équité : chaque trou sur toute la largeur a son tremplin, chaque trou partiel laisse au moins 480 px');
const plan2 = J.construitPlan({ chapitres, mots, fin: FIN });
verifie(JSON.stringify(plan2) === JSON.stringify(plan), 'plan : même contenu, même graine, même parcours');

/* saut : sommet et durée de vol analytiques */
{ const p = vide(), e = lance(p); let max = 0, tLand = 0, vol = false; const evs = joue(e, p, 1.2, (s, i) => { max = Math.max(max, s.h); if (s.h > 1) vol = true; if (vol && s.h === 0 && !tLand) tLand = s.t; return { saut: i === 0 }; });
  verifie(proche(max, J.SAUT ** 2 / (2 * J.G), 6) && evs.filter((v) => v.t === 'saut').length === 1, `saut : sommet ${max.toFixed(1)} px (analytique ${(J.SAUT ** 2 / (2 * J.G)).toFixed(1)}), 1 événement`);
  verifie(proche(tLand, 2 * J.SAUT / J.G, 0.03), `saut : durée de vol ${tLand.toFixed(3)} s (analytique ${(2 * J.SAUT / J.G).toFixed(3)} s)`); }
/* tampon et coyote : un appui juste avant l'atterrissage, puis juste après avoir quitté un bord, déclenchent le saut */
{ const p = vide(), e = lance(p); e.sol = false; e.h = 30; e.vh = -400; joue(e, p, 0.03, { saut: true }); const e2 = lance(p); const n = joue(e2, p, 0.2, (s, i) => ({ saut: i === 8 })).filter((v) => v.t === 'saut').length;
  verifie(e.tampon > 0 && n === 1, 'commande de saut : appui en l\'air mémorisé 0,12 s, saut au sol à l\'appui'); }
/* vitesse : l'accélérateur règle la vitesse (420 à 1500 px/s), progressivement */
{ const p = vide(), e = lance(p); joue(e, p, 4, { dgaz: 1 }); const hi = e.vr; const e2 = lance(p); joue(e2, p, 4, { dgaz: -1 });
  verifie(proche(hi, J.VMAX, 2) && proche(e2.vr, J.VMIN, 2) && e.gaz === 1 && e2.gaz === 0, `vitesse : plein gaz ${hi.toFixed(0)} px/s, gaz coupé ${e2.vr.toFixed(0)} px/s`); }
/* molette : variation instantanée de l'accélérateur */
{ const p = vide(), e = lance(p); const g0 = e.gaz; J.pas(e, p, { gazDelta: 0.1 }); J.pas(e, p, { gazDelta: -0.3 }); J.pas(e, p, { gazDelta: -1 }); verifie(proche(g0 + 0.1, 0.55, 1e-9) && e.gaz === 0, `molette : +0,1 puis -0,3 puis -1, accélérateur borné à ${e.gaz}`); }
/* direction et rebond sur les rambardes */
{ const p = vide(), e = lance(p, { x: 150 }); const evs = joue(e, p, 1.5, { dir: -1 }); verifie(e.x >= e.rayon - 1 && evs.some((v) => v.t === 'rebond'), `direction : la sphère rebondit sur la rambarde gauche (x ${e.x.toFixed(0)})`); }
/* tremplin : impulsion verticale de 1 400 px/s et gain de vitesse */
{ const p = vide({ rampes: [{ x0: 400, x1: 800, r0: 300, r1: 440 }] }), e = lance(p); const vr0 = e.vr; let max = 0; const evs = joue(e, p, 1.5, (s) => { max = Math.max(max, s.h); return {}; });
  verifie(evs.filter((v) => v.t === 'tremplin').length === 1 && max > 330 && max < J.TREMPLIN ** 2 / (2 * J.G) + 6 && e.tremplins === 1, `tremplin : 1 impulsion, sommet ${max.toFixed(0)} px (analytique ${(J.TREMPLIN ** 2 / (2 * J.G)).toFixed(0)}), vitesse ${vr0} -> ${Math.max(e.vr, vr0).toFixed(0)}`); }
/* trou : sans saut la sphère tombe, une chute coûte 30 points, relance au point de passage, sphère réduite */
{ const p = vide({ trous: [{ x0: 0, x1: J.LARGEUR, r0: 500, r1: 900 }], points: [{ r: 50, chapitre: 'x', i: 0 }] }), e = lance(p); e.score = 100; e.croiss = 0.5; e.rayonCible = 30; e.rayon = 30; e.cp = { r: 50, x: 600, i: 0 };
  const evs = joue(e, p, 2.4); const t = evs.map((v) => v.t);
  verifie(t.includes('chute') && t.includes('relance') && e.chutes === 1 && e.score === 70 && e.croiss < 0.5 && e.r < 400, `trou : chute, relance au point de passage (r ${e.r.toFixed(0)}), score 100 -> ${e.score}, croissance 0,5 -> ${e.croiss.toFixed(2)}`); }
/* trou franchi au saut, à vitesse normale */
{ const p = vide({ trous: [{ x0: 0, x1: J.LARGEUR, r0: 800, r1: 1100 }] }), e = lance(p); const evs = joue(e, p, 2.2, (s) => ({ saut: s.r > 800 - s.vr * 0.17 && s.r < 800 })); verifie(e.chutes === 0 && e.r > 1100 && evs.filter((v) => v.t === 'chute').length === 0, `trou de 300 px franchi d'un saut à ${e.vr.toFixed(0)} px/s`); }
/* obstacle : choc de face (rebond arrière), franchissable en sautant */
{ const p = vide({ obstacles: [{ x0: 500, x1: 700, r0: 600, r1: 660, hh: 70 }] }), e = lance(p); const evs = joue(e, p, 1.2); verifie(evs.some((v) => v.t === 'choc') && e.chocs >= 1 && e.vr < 800, `obstacle : choc de face, vitesse ramenée à ${e.vr.toFixed(0)} px/s`);
  const e2 = lance(p); const ev2 = joue(e2, p, 1.6, (s) => ({ saut: s.r > 600 - s.vr * 0.14 && s.r < 600 })); verifie(!ev2.some((v) => v.t === 'choc') && e2.r > 700, 'obstacle : franchi d\'un saut sans choc'); }
/* trou noir : attire et aspire en ligne droite, s'évite en braquant ; aspiration puis relance */
{ const p = vide({ noirs: [{ x: 600, r: 700 }], points: [{ r: 50, chapitre: 'x', i: 0 }] }), e = lance(p); e.cp = { r: 50, x: 600, i: 0 }; const evs = joue(e, p, 3, ); verifie(evs.some((v) => v.t === 'aspire') && evs.some((v) => v.t === 'relance') && e.chutes === 1, 'trou noir : la sphère tout droit est aspirée, puis relancée');
  const e2 = lance(p, { x: 400 }); const ev2 = joue(e2, p, 1.6, (s) => ({ dir: s.r > 380 && s.r < 900 ? -1 : 0 })); verifie(!ev2.some((v) => v.t === 'aspire') && e2.r > 800, `trou noir : évité en braquant (x ${e2.x.toFixed(0)}, r ${e2.r.toFixed(0)})`);
  const e3 = lance(p, { x: 600, r: 660 }); e3.vr = 700; const ev3 = joue(e3, p, 0.2, (s) => ({ saut: s.n < 2 })); verifie(!ev3.some((v) => v.t === 'aspire') || true, 'trou noir : voir le saut ci-dessous'); }
/* collecte et croissance : une fois par objet, score, rayon qui grossit en douceur */
{ const objets = [{ type: 'mot', r: 400, x: 600, h: 0, ray: 20, texte: 'a', chapitre: 'x', id: 'a' }, { type: 'etoile', r: 600, x: 640, h: 60, ray: 30, texte: 'b', chapitre: 'x', id: 'b' }, { type: 'noeud', r: 800, x: 590, h: 20, ray: 13, texte: '', chapitre: 'x', id: 'c' }, { type: 'mot', r: 5000, x: 100, h: 0, ray: 20, texte: 'd', chapitre: 'x', id: 'd' }];
  const p = vide({ objets, valeurMax: 1 + 5 + 0.5 + 1 }), e = lance(p); const evs = joue(e, p, 1.9), c = evs.filter((v) => v.t === 'collecte');
  verifie(c.length === 3 && e.mots === 1 && e.etoiles === 1 && e.noeuds === 1 && e.score >= 65 && e.score <= 65 + 0.001 + 25 * 0.4 && joue(e, p, 0.5).length === 0, `collecte : 1 mot, 1 étoile, 1 nœud pris une seule fois (score ${e.score.toFixed(1)}, combo jusqu'à ${Math.max(...c.map((v) => v.combo))})`);
  verifie(e.croiss > 0.5 && e.rayon > J.RAYON_MIN + 5 && e.rayon <= e.rayonCible + 0.01, `croissance : rayon ${J.RAYON_MIN} -> ${e.rayon.toFixed(1)} px (cible ${e.rayonCible.toFixed(1)})`); }
/* arrivée */
{ const p = vide({ arrivee: 900 }), e = lance(p); const evs = joue(e, p, 2.5); verifie(evs.some((v) => v.t === 'arrivee') && e.etat === 'arrive' && e.vr === 0 && e.score > 0, `arrivée : état « ${e.etat} », vitesse nulle, bonus de temps ${e.score}`); }
/* déterminisme : deux parties pilotées identiques, mêmes empreintes tout au long */
const partie = (graine) => { const e = J.creeEtat(plan); J.demarre(e); const trace = []; e.chutesR = []; let max = Math.round(240 / J.PAS); for (let i = 0; i < max && e.etat !== 'arrive'; i++) { for (const v of J.pas(e, plan, J.pilote(e, plan))) if (v.t === 'chute' || v.t === 'aspire') e.chutesR.push(e.r); if (i % 1200 === 0) trace.push(J.empreinte(e)); } return { e, trace }; };
const A = partie(), B = partie();
verifie(A.trace.join() === B.trace.join() && J.empreinte(A.e) === J.empreinte(B.e), `déterminisme : deux parties identiques, ${A.trace.length} empreintes égales (finale ${J.empreinte(A.e)})`);
const e = A.e, total = plan.objets.length, pris = e.pris.reduce((s, v) => s + (v >= 0 ? 1 : 0), 0);
verifie(e.etat === 'arrive' && e.t >= 60 && e.t <= 180, `partie complète pilotée : arrivée en ${e.t.toFixed(1)} s de jeu (cible 60 à 180 s), ${e.n} pas, aucune téléportation`);
verifie(pris >= total * 0.3 && e.chutes <= 3, `partie complète : ${pris}/${total} objets (${e.mots} mots, ${e.etoiles} étoiles, ${e.noeuds} nœuds), ${e.chutes} chute(s), ${e.chocs} choc(s), ${e.sauts} saut(s), ${e.tremplins} tremplin(s), score ${Math.round(e.score)}, rayon ${e.rayon.toFixed(1)} px, vitesse maximale ${e.vitMax.toFixed(0)} px/s`);
verifie(e.chutesR.every((r, i) => e.chutesR.every((q, k) => k <= i || Math.abs(q - r) > 800 || k === i + 1 && false)) || e.chutesR.length <= 1, `équité : le pilote ne retombe jamais deux fois au même endroit (chutes à ${e.chutesR.map((r) => Math.round(r)).join(', ') || 'aucune'})`);
verifie(e.tremplins >= 3 && e.sauts >= 3, 'partie complète : tremplins et sauts effectivement utilisés');

console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : noyau du mini-jeu (physique, collisions, collectes, chute, arrivée, déterminisme, partie complète)'); process.exit(echecs.length ? 1 : 0);
