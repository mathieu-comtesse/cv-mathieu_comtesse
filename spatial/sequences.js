// Storyboard en données : les séquences de caméra, dans l'ordre du voyage. Chaque `at(durée, position, regard, champ, roulis, étiquette)` ajoute une clé.
// La durée est une distance de défilement en pixels : elle fixe le rythme (longue = approche lente, courte = survol). Voir docs/STORYBOARD.md.
import { inspectPose } from './camera-path.js';

const DEG = Math.PI / 180;

/** Pose par défaut de la pièce d'accueil (azimut 36°, élévation 26°, distance 40 autour de la cible de la pièce) : remplacée en direct par la caméra réelle de la pièce. */
export const ROOM_POSE = { pos: [21.2, 18.3, 28.9], look: [.1, .8, -.2], fov: 24 };

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

  /* ---- A. Ouverture : la vraie pièce, puis recul le long de l'axe de vue, grue, plongée. La clé 0 est la caméra de la pièce (mise à jour en direct). ---- */
  at(0, ROOM_POSE.pos, ROOM_POSE.look, ROOM_POSE.fov, 0, 'accueil');
  at(700, [43, 37, 58], [-2, 0, -28], 36, 0);                                  // recul sur l'axe de vue : la pièce rapetisse, l'espace apparaît autour
  at(900, [46, 84, 52], [-8, 0, -170], 52, -2);                                // grue : le plan s'ouvre vers la profondeur
  at(900, [26, 50, -22], [-14, 2, -140], 50, 2);                               // plongée vers la première zone
  /* ---- B. Maintenance : VM, Reporteur Q18, VRE (moment majeur) ---- */
  at(1000, [-38, 28, -78], [-34, 2, -150], 50, 4);                             // truck latéral
  at(1250, [-30, 30, -104], aim('vm', 3, -4), 52, 3);                          // grue : VM apparaît à gauche, plus bas
  at(1100, around('vm', -34, 30, 12), aim('vm', 3), 42, 0, 'vm');              // survol de VM (pas d'arrêt)
  at(800, [6, 26, -136], aim('moteur44', 3, 4), 47, -3);                       // truck à droite à travers la composition
  restDur('moteur44', 1000, 38);                                               // approche de Q18
  at(1500, [68, 32, -208], aim('vre', 6, 6), 46, 2);                           // pull-back par la droite puis virage : VRE entre dans le champ
  at(1500, around('vre', 40, 42, 15), aim('vre', 7), 40, 1);                   // dolly avant lent
  restDur('vre', 1800, 36);                                                    // pose d'inspection
  at(950, around('vre', 100, 36, 16), aim('vre', 8), 38, 3);                   // orbite partielle : le volume se dévoile
  at(600, [30, 34, -284], aim('gares', 6, 8), 46, 0);                          // départ par la droite de VRE
  /* ---- C. Maintenance, suite : pilotage par la donnée (Gares prioritaires, Suivi) ---- */
  at(1300, [-6, 46, -318], aim('gares', 2, 8), 54, 3);                         // pull-back très ample avant Gares
  restDur('gares', 1100, 36);
  at(1000, [-34, 38, -392], aim('suivi', 6), 46, -3);                          // survol vers Suivi, suspendu plus haut
  restDur('suivi', 800, 36);
  /* ---- D. Qualité, sécurité, environnement : plans de prévention, Power BI, CERFA ---- */
  at(1300, [48, 46, -468], aim('pa', 8, -6), 50, -3);                          // grue : PA surgit à droite
  restDur('pa', 1700, 36);
  at(800, around('pa', 80, 32, 14), aim('pa', 8), 38, 2);                      // orbite partielle de PA
  at(800, [24, 40, -576], aim('powerbi', 4, 4), 48, 4);                        // truck gauche et montée vers Power BI suspendu
  restDur('powerbi', 1800, 36);
  at(800, around('powerbi', 78, 34, 6), aim('powerbi', 4), 38, -3);            // contournement par la droite
  at(1200, [14, 26, -640], aim('cerfa', 4, -2), 44, 2);                        // traversée du portique vers CERFA
  restDur('cerfa', 800, 36);
  /* ---- F. Automatisation : espace confiné, traversée de colonnes ---- */
  at(1300, [30, 26, -722], aim('finance', 3, 4), 48, 3);                      // fly-through entre les structures
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
