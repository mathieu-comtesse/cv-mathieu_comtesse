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
/* Monde V2 : l'espace s'étend sur environ 1 400 unités de profondeur, avec de grands écarts latéraux et verticaux. Les machines mesurent
   environ 12,6 unités × échelle. `cam` n'est plus un cadrage de couloir : c'est la pose d'inspection (azimut, distance, hauteur, décalage). */
export const STOPS = [
  S({ id: 'accueil', kind: 'hub', domain: 'accueil', title: 'Accueil', sub: 'Mathieu Comtesse, ingénieur maintenance et qualité', pos: [-18, 0, -24] }),
  S({ id: 'vm', kind: 'machine', machine: 'vm', card: 'vmvre', slug: 'projet-vmvre', study: 'article-vmvre', domain: 'maintenance', pos: [-64, 1, -146], yaw: 58, scale: 1.05, cam: { az: -34, dist: 36, h: 17, shift: -5 }, layout: 'B' }),
  S({ id: 'moteur44', kind: 'machine', machine: 'moteur', card: 'moteur44', slug: 'projet-moteur44', study: 'article-moteur44', domain: 'maintenance', pos: [46, 3, -176], yaw: 150, scale: 1, cam: { az: 38, dist: 34, h: 15, shift: 5 }, layout: 'C' }),
  S({ id: 'vre', kind: 'machine', machine: 'vre', card: 'vre', slug: 'projet-vre', study: 'article-vre', domain: 'maintenance', priority: 1, pos: [-6, 8, -236], yaw: -38, scale: 1.45, cam: { az: 26, dist: 42, h: 17, shift: 5 }, layout: 'A' }),
  S({ id: 'pa', kind: 'machine', machine: 'pp', card: 'pa', slug: 'projet-pa', study: 'article-pa', domain: 'qse', priority: 2, pos: [74, 13, -372], yaw: -62, scale: 1.35, cam: { az: 30, dist: 40, h: 16, shift: 5 }, layout: 'A' }),
  S({ id: 'powerbi', kind: 'machine', machine: 'powerbi', card: 'powerbi', slug: 'projet-powerbi', study: 'article-powerbi', domain: 'qse', priority: 3, pos: [-34, 28, -434], yaw: 24, scale: 1.25, cam: { az: -22, dist: 38, h: 12, shift: -5 }, layout: 'B' }),
  S({ id: 'cerfa', kind: 'machine', machine: 'cerfa', card: 'cerfa', slug: 'projet-cerfa', study: 'article-cerfa', domain: 'qse', pos: [34, 0, -494], yaw: 100, scale: .95, cam: { az: 36, dist: 32, h: 14, shift: 5 }, layout: 'C' }),
  S({ id: 'gares', kind: 'machine', machine: 'gares', card: 'gares', slug: 'projet-gares', study: 'article-gares', domain: 'maintenance', priority: 3, pos: [-78, 0, -596], yaw: -22, scale: 1.25, cam: { az: -16, dist: 40, h: 16, shift: -4 }, layout: 'A' }),
  S({ id: 'suivi', kind: 'machine', machine: 'suivi', card: 'suivi', slug: 'projet-suivi', study: 'article-suivi', domain: 'maintenance', pos: [-6, 20, -648], yaw: 66, scale: .95, cam: { az: 20, dist: 32, h: 12, shift: 5 }, layout: 'B' }),
  S({ id: 'finance', kind: 'machine', machine: 'finance', card: 'finance', slug: 'projet-finance', study: 'article-finance', domain: 'automatisation', pos: [44, 0, -776], yaw: -78, scale: 1, cam: { az: 30, dist: 30, h: 13, shift: 5 }, layout: 'C' }),
  S({ id: 'studio', kind: 'machine', machine: 'studio', card: 'studio', slug: 'projet-studio', study: 'article-studio', domain: 'automatisation', pos: [-42, 10, -832], yaw: 30, scale: 1, cam: { az: -26, dist: 32, h: 14, shift: -4 }, layout: 'A' }),
  S({ id: 'lecteur-vre', kind: 'machine', machine: 'vrestudio-musicbox', slug: 'projet-lecteur-vre', study: null, domain: 'donnees', title: 'Lecteur VRE', sub: 'Modèle documentaire contrôlé', pos: [4, 0, -1000], yaw: -15, scale: 1.1, cam: { az: 22, dist: 36, h: 14, shift: 5 }, layout: 'B' }),
  S({ id: 'thaleolithic', kind: 'plate', slug: 'projet-talas', study: null, domain: 'experimentation', priority: 4, title: 'THALEOLITHIC', sub: 'Jeu pédagogique ISO 45001', image: 'thaleolithic/thaleolithic-accueil.webp?v=13', ratio: 1672 / 941, pos: [-40, 0, -1110], yaw: 18, scale: 2.5, cam: { az: -12, dist: 50, h: 14, shift: -6 }, layout: 'C' }),
  S({ id: 'experiences', kind: 'hub', domain: 'experimentation', title: 'Explorations', sub: 'Jeux, simulations et interfaces expérimentales', pos: [36, 0, -1190] }),
  S({ id: 'parcours', kind: 'hub', domain: 'parcours', title: 'Parcours et contact', sub: 'CV, expériences, compétences, contact', pos: [-4, 0, -1330] })
];

/* Plaques des projets personnels : captures d'écran existantes, regroupées dans la zone « Explorations ». */
const PERSO_PLATES = ['lettres', 'ligne', 'limen', 'atlas', 'labyrinthe', 'route', 'arene', 'timber', 'rubik', 'sandboard', 'pixels', 'gouache'];
// orbite verticale : les 12 plaques tournent autour du centre de la zone, à des hauteurs et des rayons différents, face au centre
const PLATE_POS = (i) => { const a = i / 12 * Math.PI * 2 + .4, r = 34 + (i % 3) * 9; return [36 + Math.cos(a) * r, 5 + (i % 4) * 4.2, -1190 + Math.sin(a) * r]; };
export const PLATES = PERSO_PLATES.map((id, i) => {
  const p = PERSO.find((x) => x.id === id);
    return { id: 'perso-' + id, persoId: id, slug: 'projet-' + (id === 'atlas' ? 'atlas' : id), title: p.n, sub: p.genre, image: p.img, desc: p.desc,
    pos: PLATE_POS(i), yaw: Math.atan2(36 - PLATE_POS(i)[0], -1190 - PLATE_POS(i)[2]) * 180 / Math.PI, scale: 1 };
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
      ...s, index: i,
      title: s.title || c?.title, sub: s.sub || c?.sub,
      stat: c ? { value: c.time, context: c.timeCtx } : null,
      money: c ? { value: c.money, context: c.moneyCtx } : null,
      tech: techOf(c)
    };
  });
  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  return { items, byId, plates: PLATES, links: LINKS, count: items.length };
}
