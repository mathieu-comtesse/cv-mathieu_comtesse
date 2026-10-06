// Projets de l'accueil : projets pro (image, gain chiffré, fiche synthétique tirée de data.js) et projets perso (aperçus pixélisés).
import { CV, PERSO, PRO } from './data.js?v=8bc1499';

const byId = Object.fromEntries(PRO.map((p) => [p.id, p]));
const P = (id, title, sub, gain, unit, img, pro) => ({ id, title, sub, gain, unit, img, pro: byId[pro] || null });

// Chaque carte : un gain de TEMPS et un gain d'ARGENT (taux horaire de 104,74 € utilisé dans le CV), par process et par projet. 'ctx' = ce que le chiffre mesure.
const G = (id, title, sub, time, timeCtx, money, moneyCtx, img, pro, extra = '') => ({ id, title, sub, time, timeCtx, money, moneyCtx, extra, img, pro: byId[pro] || null });

export const PRO_CARDS = [
  G('pa', 'Power Automate · chaîne des PP', 'Dépôt, classement, alerte, relance', '40 min', 'de contrôles et de saisie rendues chaque jour', '15 700 €', 'par an, soit ≈ 17 € et 10 min par plan de prévention', 'assets/projets/pp.jpg?v=8bc1499', 'projet-3'),
  G('cerfa', 'CERFA v3', 'Fiches et attestations devenues données du parc', '20 h → minutes', 'pour un lot de 300 fiches (≈ 5 min par fiche à la main)', '50 000 €', 'de pénalités de retard identifiées et applicables', 'assets/projets/cerfa.jpg?v=8bc1499', 'projet-1'),
  G('vre', 'Extracteur VRE', 'Rapports de vérification électrique', '25 min', 'gagnées par rapport, sur 7 000 à 10 000 rapports par an', '44 €', 'par rapport traité, saisie directe dans le classeur de suivi', 'assets/projets/vre.jpg?v=8bc1499', 'projet-vre'),
  G('studio', 'Studio d’extracteurs PDF', 'Un extracteur sans coder', '5–10 jours → 4 h', 'pour disposer d’un extracteur opérationnel', '3 200–6 900 €', 'évités par famille de documents', 'assets/projets/studio.jpg?v=8bc1499', 'projet-studio'),
  G('powerbi', 'Power BI · PP & MOSO', 'Tableaux de bord et portail', '3–5 min → 10 s', 'pour retrouver un plan, son PDF et son échéance : ≈ 2 h par semaine', '9 400 €', 'par an réaffectés au suivi des échéances (≈ 9 € de saisie évitée par plan)', 'assets/projets/powerbi.jpg?v=8bc1499', 'projet-4'),
  G('suivi', 'Retrouver tout le suivi', 'OT, équipement, bâtiment', '10–15 min', 'gagnées par recherche (≈ 1 h quand elle passe par d’autres outils)', '118–589 k€', 'par an, estimation à confirmer (14 utilisateurs, ≈ 26 € la recherche)', 'assets/projets/suivi.jpg?v=8bc1499', 'projet-2'),
  G('gares', 'Gares prioritaires', 'Vigilance et criticité des gares', '10–15 min', 'gagnées par équipement consulté, probablement davantage', '7 900–11 800 €', 'par an (≈ 1 000 équipements, 2 consultations par jour)', 'assets/projets/gares.jpg?v=8bc1499', 'projet-gares'),
  G('terrain', 'Dialogue terrain', 'Processus EPM / EPTx', '16', 'arbitrages obtenus en réunion d’agence', 'EPM light', 'processus simplifié proposé à l’arbitrage', 'assets/projets/terrain.jpg?v=8bc1499', 'projet-5'),
  G('charte', 'Interface commune', 'Une UI/UX pour tous les outils', '1 charte', 'commune à tous les outils construits', '0 donnée', 'envoyée hors du poste : traitement 100 % local', 'assets/projets/charte.jpg?v=8bc1499', 'projet-charte'),
];

export const UNIV = { id: 'talas', title: 'Village Talas', sub: 'Jeu sérieux ISO 45001', img: 'assets/projets/talas.jpg?v=8bc1499', url: 'village-talas-scene.html', desc: 'Sept ateliers, un par chapitre de l’ISO 45001, et une dizaine de mini-jeux dans un village en 3D : on apprend la norme en agissant plutôt qu’en lisant.' };

export const PERSO_CARDS = PERSO.map((p) => ({ id: p.id, title: p.n, sub: p.genre, desc: p.desc, img: p.img, url: p.url, pixel: true }));
export { CV };
