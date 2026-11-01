// ProjectRegistry : unique référentiel de la vue spatiale. Positions, orientations et cadrages sont fixés ici (aucun hasard :
// la composition est identique à chaque visite). Les titres, sous-titres, chiffres et technologies viennent de js/projects-data.js,
// les chiffres détaillés de js/indicators.js : rien n'est ressaisi.
import { PRO_CARDS } from '../js/projects-data.js';
import { PERSO } from '../js/data.js';

export const DOMAINS = {
  accueil: 'Accueil',
  maintenance: 'Maintenance et exploitation',
  qse: 'Qualité, sécurité et environnement',
  automatisation: 'Automatisation',
  donnees: 'Données et intelligence artificielle',
  experimentation: 'Expérimentations',
  parcours: 'Parcours et contact'
};

/* Chaque entrée = un point d'intérêt. kind : machine (modèle 3D d'origine de refonte/m3d), model (GLB), plate (capture d'écran encadrée), hub (zone sans objet).
   cam : az = azimut de la caméra autour de l'objet (0 = devant, vers +z), dist = distance, h = hauteur de la caméra, shift = décalage latéral du regard
   (positif : l'objet se place à gauche de l'écran, la place libre est à droite pour le panneau et les annotations). */
const S = (o) => o;
export const STOPS = [
  S({ id: 'accueil', kind: 'hub', domain: 'accueil', title: 'Accueil', sub: 'Mathieu Comtesse, ingénieur maintenance et qualité', pos: [-4, 0, 0], cam: { pos: [14, 17, 46], look: [-2, 3, -8] } }),
  S({ id: 'vre', kind: 'machine', machine: 'vre', card: 'vre', slug: 'projet-vre', study: 'article-vre', domain: 'maintenance', priority: 1, pos: [14, 0, -38], yaw: -35, scale: 1.25, cam: { az: 24, dist: 31, h: 13, shift: 4 }, layout: 'A' }),
  S({ id: 'vm', kind: 'machine', machine: 'vm', card: 'vmvre', slug: 'projet-vmvre', study: 'article-vmvre', domain: 'maintenance', pos: [-24, 5, -80], yaw: 40, scale: 1, cam: { az: -22, dist: 31, h: 14, shift: -4 }, layout: 'B' }),
  S({ id: 'moteur44', kind: 'machine', machine: 'moteur', card: 'moteur44', slug: 'projet-moteur44', study: 'article-moteur44', domain: 'maintenance', pos: [18, 0, -120], yaw: 150, scale: 1, cam: { az: 34, dist: 31, h: 15, shift: 5 }, layout: 'C' }),
  S({ id: 'pa', kind: 'machine', machine: 'pp', card: 'pa', slug: 'projet-pa', study: 'article-pa', domain: 'qse', priority: 2, pos: [-18, 0, -162], yaw: -60, scale: 1.2, cam: { az: -30, dist: 32, h: 14, shift: -5 }, layout: 'A' }),
  S({ id: 'powerbi', kind: 'machine', machine: 'powerbi', card: 'powerbi', slug: 'projet-powerbi', study: 'article-powerbi', domain: 'qse', pos: [22, 7, -204], yaw: 20, scale: 1, cam: { az: 16, dist: 30, h: 15, shift: 4 }, layout: 'B' }),
  S({ id: 'cerfa', kind: 'machine', machine: 'cerfa', card: 'cerfa', slug: 'projet-cerfa', study: 'article-cerfa', domain: 'qse', pos: [-26, 0, -246], yaw: 100, scale: .95, cam: { az: -36, dist: 30, h: 15, shift: -5 }, layout: 'C' }),
  S({ id: 'gares', kind: 'machine', machine: 'gares', card: 'gares', slug: 'projet-gares', study: 'article-gares', domain: 'maintenance', priority: 3, pos: [10, 0, -288], yaw: -20, scale: 1.2, cam: { az: 12, dist: 32, h: 14, shift: 3 }, layout: 'A' }),
  S({ id: 'suivi', kind: 'machine', machine: 'suivi', card: 'suivi', slug: 'projet-suivi', study: 'article-suivi', domain: 'maintenance', pos: [-22, 3, -330], yaw: 65, scale: .95, cam: { az: -16, dist: 30, h: 12, shift: -4 }, layout: 'B' }),
  S({ id: 'finance', kind: 'machine', machine: 'finance', card: 'finance', slug: 'projet-finance', study: 'article-finance', domain: 'automatisation', pos: [20, 0, -372], yaw: -75, scale: 1, cam: { az: 30, dist: 30, h: 13, shift: 5 }, layout: 'C' }),
  S({ id: 'studio', kind: 'machine', machine: 'studio', card: 'studio', slug: 'projet-studio', study: 'article-studio', domain: 'automatisation', pos: [-16, 6, -414], yaw: 30, scale: 1, cam: { az: -26, dist: 31, h: 14, shift: -4 }, layout: 'A' }),
  S({ id: 'lecteur-vre', kind: 'machine', machine: 'vrestudio-musicbox', slug: 'projet-lecteur-vre', study: null, domain: 'donnees', title: 'Lecteur VRE', sub: 'Modèle documentaire contrôlé', pos: [18, 0, -456], yaw: -15, scale: 1, cam: { az: 20, dist: 31, h: 13, shift: 4 }, layout: 'B' }),
  S({ id: 'thaleolithic', kind: 'plate', slug: 'projet-talas', study: null, domain: 'experimentation', priority: 4, title: 'THALEOLITHIC', sub: 'Jeu pédagogique ISO 45001', image: 'thaleolithic/thaleolithic-accueil.webp?v=13', ratio: 1672 / 941, pos: [-14, 0, -498], yaw: 25, scale: 1.6, cam: { az: -14, dist: 34, h: 12, shift: -5 }, layout: 'C' }),
  S({ id: 'experiences', kind: 'hub', domain: 'experimentation', title: 'Explorations', sub: 'Jeux, simulations et interfaces expérimentales', pos: [16, 0, -540], cam: { az: 12, dist: 40, h: 17, shift: 0 } }),
  S({ id: 'parcours', kind: 'hub', domain: 'parcours', title: 'Parcours et contact', sub: 'CV, expériences, compétences, contact', pos: [-6, 0, -590], cam: { az: 0, dist: 34, h: 13, shift: 0 } })
];

/* Plaques des projets personnels : captures d'écran existantes, regroupées dans la zone « Explorations ». */
const PERSO_PLATES = ['lettres', 'ligne', 'limen', 'atlas', 'labyrinthe', 'route', 'arene', 'timber', 'rubik', 'sandboard', 'pixels', 'gouache'];
export const PLATES = PERSO_PLATES.map((id, i) => {
  const p = PERSO.find((x) => x.id === id);
  const col = i % 4, row = Math.floor(i / 4);
  return { id: 'perso-' + id, persoId: id, slug: 'projet-' + (id === 'atlas' ? 'atlas' : id), title: p.n, sub: p.genre, image: p.img, desc: p.desc,
    pos: [16 - 15 + col * 11 - row * 3, 1.2 + (row % 2) * 1.6, -540 - row * 9 - col * 2.5], yaw: -28 + col * 9, scale: 1 };
});

/* Liens entre projets : flux d'information ou même périmètre. Servent au tracé des liaisons du blueprint. */
export const LINKS = [
  { from: 'vre', to: 'vm', label: 'mêmes rapports VRE' },
  { from: 'vm', to: 'moteur44', label: 'mêmes rapports VRE' },
  { from: 'pa', to: 'powerbi', label: 'plans de prévention' },
  { from: 'powerbi', to: 'cerfa', label: 'conformité' },
  { from: 'studio', to: 'lecteur-vre', label: 'extraction de PDF' },
  { from: 'studio', to: 'cerfa', label: 'extracteur CERFA' }
];

const cardById = Object.fromEntries(PRO_CARDS.map((c) => [c.id, c]));
// technologies : noms courts relevés dans les schémas d'étapes existants (les intitulés longs ne sont pas des technologies)
const techOf = (c) => [...new Set((c?.diag || []).map((d) => d[0]).filter((t) => t.length <= 22))].slice(0, 7);

/** Entrées complètes : données de l'objet + contenu des cartes existantes. */
export function buildRegistry() {
  const items = STOPS.map((s, i) => {
    const c = s.card ? cardById[s.card] : null;
    return {
      ...s, index: i, u: i / (STOPS.length - 1),
      title: s.title || c?.title, sub: s.sub || c?.sub,
      stat: c ? { value: c.time, context: c.timeCtx } : null,
      money: c ? { value: c.money, context: c.moneyCtx } : null,
      tech: techOf(c)
    };
  });
  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  return { items, byId, plates: PLATES, links: LINKS, count: items.length };
}
