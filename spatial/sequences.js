// Storyboard en données : les séquences de caméra, dans l'ordre du voyage. Chaque `at(durée, position, regard, champ, roulis, étiquette)` ajoute une clé.
// La durée est une distance de défilement en pixels : elle fixe le rythme (longue = approche lente, courte = survol). Voir docs/STORYBOARD.md.
import { inspectPose } from './camera-path.js';

const DEG = Math.PI / 180;

export function buildKeys(reg) {
  const keys = []; let u = 0;
  const RHYTHM = .5;                                                          // pixels de molette par unité de durée du storyboard : parcours complet d'environ 23 000 px
  const at = (dur, pos, look, fov = 46, roll = 0, tag) => { u += dur * RHYTHM; keys.push({ u, pos, look, fov, roll, tag }); };
  const P = (id) => reg.byId[id].pos;
  const aim = (id, dy = 4, dx = 0) => { const p = P(id); return [p[0] + dx, p[1] + dy, p[2]]; };
  /** Point autour d'un projet : azimut (degrés, 0 = devant), distance, hauteur au-dessus de l'objet. */
  const around = (id, az, dist, h) => { const p = P(id), a = az * DEG; return [p[0] + Math.sin(a) * dist, p[1] + h, p[2] + Math.cos(a) * dist]; };
  const rest = (id, fov = 36, extra = 0) => { const e = reg.byId[id], ip = inspectPose(e); at(extra, ip.pos.toArray(), ip.look.toArray(), fov, 0, id); };
  const restDur = (id, dur, fov = 36) => { const e = reg.byId[id], ip = inspectPose(e); at(dur, ip.pos.toArray(), ip.look.toArray(), fov, 0, id); };

  /* ---- A. Ouverture : vue immense, descente en grue, arrivée à la stèle ---- */
  at(0, [44, 132, 78], [-8, 0, -230], 58, 0);                                // l'espace entier, les premiers volumes au loin
  at(1100, [26, 46, 70], [-14, 2, -140], 52, -2);                              // dolly avant + crane vers le bas
  at(1200, [6, 17, 26], [-20, 6, -40], 44, 0, 'accueil');                      // arrivée : stèle au premier plan
  /* ---- B. Traversée : survol de la stèle, truck, grue, révélation de VM ---- */
  at(1000, [-38, 26, -64], [-30, 2, -150], 50, 4);                             // truck latéral, la stèle passe sur le côté
  at(1250, [-30, 30, -100], aim('vm', 3, -4), 52, 3);                          // grue : VM apparaît à gauche, plus bas
  at(1100, around('vm', -34, 30, 12), aim('vm', 3), 42, 0, 'vm');              // survol de VM (pas d'arrêt)
  at(800, [6, 26, -136], aim('moteur44', 3, 4), 47, -3);                      // truck à droite à travers la composition
  restDur('moteur44', 1000, 38);                                               // approche de Q18
  /* ---- C. VRE : moment majeur. Pull-back, approche lente, orbite partielle, départ ---- */
  at(1500, [68, 32, -208], aim('vre', 6, 6), 46, 2);                           // pull-back par la droite puis virage : VRE entre dans le champ
  at(1500, around('vre', 40, 42, 15), aim('vre', 7), 40, 1);                   // dolly avant lent
  restDur('vre', 1800, 36);                                                    // pose d'inspection
  at(950, around('vre', 100, 36, 16), aim('vre', 8), 38, 3);                   // orbite partielle : le volume se dévoile
  at(600, [30, 34, -284], aim('pa', 8, -6), 44, 0);                          // départ : la caméra passe derrière VRE en regardant déjà vers la suite
  /* ---- D. Qualité, sécurité, environnement : plans de prévention, Power BI, CERFA ---- */
  at(1300, [40, 34, -312], aim('pa', 8, -6), 50, -3);                          // grue : PA surgit à droite
  restDur('pa', 1700, 36);
  at(800, around('pa', 80, 32, 14), aim('pa', 8), 38, 2);                      // orbite partielle de PA
  at(800, [24, 40, -392], aim('powerbi', 4, 4), 48, 4);                       // truck gauche et montée vers Power BI suspendu
  restDur('powerbi', 1800, 36);
  at(800, around('powerbi', 78, 34, 6), aim('powerbi', 4), 38, -3);            // contournement par la droite
  at(1200, [14, 26, -456], aim('cerfa', 4, -2), 44, 2);                        // traversée du portique vers CERFA
  restDur('cerfa', 800, 36);
  /* ---- E. Pilotage : très grand écart, vue ouverte puis approche ---- */
  at(1200, [-8, 44, -552], aim('gares', 2, 10), 54, 3);                        // pull-back : on voit l'ensemble avant Gares
  restDur('gares', 1100, 36);
  at(700, [-56, 30, -628], aim('suivi', 6), 46, -3);                         // survol vers Suivi, suspendu plus haut
  restDur('suivi', 800, 36);
  /* ---- F. Automatisation : espace confiné, traversée de colonnes ---- */
  at(900, [30, 26, -722], aim('finance', 3, 4), 48, 3);                      // fly-through entre les structures
  restDur('finance', 800, 36);
  at(1300, [30, 38, -792], aim('studio', 5, 6), 46, -3);                       // grue : on passe au-dessus de Finance
  restDur('studio', 800, 36);
  /* ---- G. Données et IA : un objet isolé dans un grand vide, approche très lente ---- */
  at(1900, [30, 52, -910], aim('lecteur-vre', 2), 52, 2);                      // vue haute, longue plongée
  restDur('lecteur-vre', 2000, 36);
  at(900, [52, 34, -1018], aim('thaleolithic', 8, 8), 46, 2);                  // la caméra quitte le grand vide par la droite
  /* ---- H. Explorations : mur, puis orbite de plaques ---- */
  at(1500, [-4, 34, -1066], aim('thaleolithic', 10, 4), 48, 3);
  restDur('thaleolithic', 1700, 40);
  at(700, [-18, 42, -1088], [4, 6, -1160], 50, 2);                              // la caméra s'élève au-dessus de la plaque
  at(1300, [14, 40, -1166], [36, 8, -1190], 52, -3);                           // le mur recule, l'orbite des plaques apparaît
  at(1300, [100, 44, -1118], [36, 9, -1190], 48, 0, 'experiences');            // vue d'ensemble de l'orbite
  /* ---- I. Parcours : élévation et départ vers l'horizon ---- */
  at(1700, [44, 74, -1248], [-4, 0, -1330], 52, 2);
  at(1500, [14, 34, -1294], [-4, 2, -1330], 46, 0, 'parcours');
  at(900, [2, 112, -1248], [-4, 0, -1520], 58, 0);                              // pull-back : l'horizon se prolonge
  return keys;
}
