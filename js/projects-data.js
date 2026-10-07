// Projets de l'accueil : projets pro (image, gain chiffré, fiche synthétique tirée de data.js) et projets perso (aperçus pixélisés).
import { CV, PERSO, PRO } from './data.js?v=0801b99';

const byId = Object.fromEntries(PRO.map((p) => [p.id, p]));
const P = (id, title, sub, gain, unit, img, pro) => ({ id, title, sub, gain, unit, img, pro: byId[pro] || null });


// Comment ça marche : 4 ou 5 étapes par projet (affichées en schéma au survol). Faits tirés du CV.
const DIAG = {
  pa: [['Dépôt', 'Le plan de prévention arrive'], ['Lecture', 'Champs extraits automatiquement'], ['Classement', 'Rangé et saisi au listing'], ['Alerte', 'Relances avant l’échéance']],
  cerfa: [['Dépôt du lot', 'Fiches CERFA et attestations (PDF)'], ['Lecture', 'Pages 1 et 2, cases lues sur le rendu'], ['Contrôles', 'Doublons, non-conformités, retards'], ['Indicateurs', 'KPI cliquables et filtres'], ['Export', 'Excel filtré et surligné']],
  vre: [['Rapports PDF', 'Vérifications électriques'], ['Comptage', 'Équipements, départs, écarts'], ['Vérification', 'Chaque total reste sous contrôle'], ['Injection', 'Classeur de suivi SharePoint']],
  studio: [['Modèle', 'Un exemple du document'], ['Tracé', 'Repérer les zones à lire'], ['Test', 'Essai sur des documents réels'], ['Extracteur', 'Page HTML autonome'], ['Diffusion', 'Fichier ou exécutable, 100 % local']],
  powerbi: [['Sources', 'PDF, Excel, SharePoint'], ['Power Query', 'Préparation et contrôle'], ['Modèle et DAX', 'Mesures et indicateurs'], ['Pages HTML', 'Générées dans les mesures'], ['Portail', 'Plan, PDF et échéance en 10 s']],
  suivi: [['GMAO', 'Ordres de travail'], ['Exports', 'Autres logiciels et sites'], ['Rattachement', 'Équipement et bâtiment'], ['Interface unique', 'Recherche en quelques secondes']],
  gares: [['Sources', 'GMAO, référentiel, SharePoint'], ['Modèle', '19 tables, 159 mesures'], ['Règles', 'Criticité et conformité calculées'], ['Fiche', 'Gare, équipement, maintenance']],
  terrain: [['Gemba', 'Observer sur le terrain'], ['Faits', 'Entretiens et preuves'], ['État des lieux', 'Processus EPM / EPTx'], ['EPM light', 'Processus simplifié'], ['Arbitrage', 'Décision en réunion d’agence']],
  charte: [['Charte UI', 'Règles visuelles communes'], ['Composants', 'Boutons, tableaux, indicateurs'], ['Outils', 'CERFA, VRE, Studio, PP'], ['Local', 'Aucune donnée hors du poste']],
};

// Chaque carte : un gain de TEMPS et un gain d'ARGENT (taux horaire de 104,74 € utilisé dans le CV), par process et par projet. 'ctx' = ce que le chiffre mesure.
const G = (id, title, sub, time, timeCtx, money, moneyCtx, img, pro) => ({ id, title, sub, time, timeCtx, money, moneyCtx, img, pro: byId[pro] || null, diag: DIAG[id] || [] });

export const PRO_CARDS = [
  G('pa', 'Power Automate · chaîne des PP', 'Dépôt, classement, alerte, relance', '40 min', 'de contrôles et de saisie rendues chaque jour', '15 700 €', 'par an, soit ≈ 17 € et 10 min par plan de prévention', 'assets/projets/pp.jpg?v=0801b99', 'projet-3'),
  G('cerfa', 'CERFA v3', 'Fiches et attestations devenues données du parc', '20 h → minutes', 'pour un lot de 300 fiches (≈ 5 min par fiche à la main)', '50 000 €', 'de pénalités de retard identifiées et applicables', 'assets/projets/cerfa.jpg?v=0801b99', 'projet-1'),
  G('vre', 'Extracteur VRE', 'Rapports de vérification électrique', '25 min', 'gagnées par rapport, sur 7 000 à 10 000 rapports par an', '44 €', 'par rapport traité, saisie directe dans le classeur de suivi', 'assets/projets/vre.jpg?v=0801b99', 'projet-vre'),
  G('studio', 'Studio d’extracteurs PDF', 'Un extracteur sans coder', '5–10 jours → 4 h', 'pour disposer d’un extracteur opérationnel', '3 200–6 900 €', 'évités par famille de documents', 'assets/projets/studio.jpg?v=0801b99', 'projet-studio'),
  G('powerbi', 'Power BI · PP & MOSO', 'Tableaux de bord et portail', '3–5 min → 10 s', 'pour retrouver un plan, son PDF et son échéance : ≈ 2 h par semaine', '9 400 €', 'par an réaffectés au suivi des échéances (≈ 9 € de saisie évitée par plan)', 'assets/projets/powerbi.jpg?v=0801b99', 'projet-4'),
  G('suivi', 'Retrouver tout le suivi', 'OT, équipement, bâtiment', '10–15 min', 'gagnées par recherche (≈ 1 h quand elle passe par d’autres outils)', '118–589 k€', 'par an, estimation à confirmer (14 utilisateurs, ≈ 26 € la recherche)', 'assets/projets/suivi.jpg?v=0801b99', 'projet-2'),
  G('gares', 'Gares prioritaires', 'Vigilance et criticité des gares', '10–15 min', 'gagnées par équipement consulté, probablement davantage', '7 900–11 800 €', 'par an (≈ 1 000 équipements, 2 consultations par jour)', 'assets/projets/gares.jpg?v=0801b99', 'projet-gares'),
  G('terrain', 'Dialogue terrain', 'Processus EPM / EPTx', '16', 'arbitrages obtenus en réunion d’agence', 'EPM light', 'processus simplifié proposé à l’arbitrage', 'assets/projets/terrain.jpg?v=0801b99', 'projet-5'),
  G('charte', 'Interface commune', 'Une UI/UX pour tous les outils', '1 charte', 'commune à tous les outils construits', '0 donnée', 'envoyée hors du poste : traitement 100 % local', 'assets/projets/charte.jpg?v=0801b99', 'projet-charte'),
];


// « Construit avec » : langages, outils et méthodes réellement utilisés (relevés dans le code de chaque jeu). Talas : équipe et coproduction en plus.
const T = (lang, outils, methode, dernier) => [['Langages', lang], ['Outils', outils], ['Méthode', methode], dernier];
const TECH = {
  talas: [['Langages', 'HTML, CSS et JavaScript, sans framework'], ['Outils', 'Three.js r128 (shaders de rendu peint), Canvas 2D, Web Audio'], ['Méthode', 'Un atelier par chapitre ISO 45001, choix qui se répercutent en effets domino'], ['Équipe', 'Scénario coproduit avec Eliott, Dylan, Mathilde, Georges, Neila et Lorette']],
  atlas: T('HTML, CSS, JavaScript', 'Three.js, modèles Blender, Canvas 2D', 'Un bâtiment par étape du parcours, sur une île 3D', ['Livraison', 'Navigateur, progression gardée en local']),
  labyrinthe: T('HTML, CSS, JavaScript', 'Canvas 2D', 'Lignes de visée : seul ce qui est vu se révèle', ['Modes', 'Exploration manuelle ou automatique']),
  route: T('HTML, JavaScript, GLSL', 'Three.js, modèles GLB (Blender), Web Audio', 'Trafic simulé avec collisions, même trajet comparé', ['Livraison', '3D temps réel dans le navigateur']),
  arene: T('HTML, CSS, JavaScript', 'Canvas 2D en pixel art, Web Audio', 'Adversaire piloté par IA, 6 personnages, 12 compétences', ['Modes', 'Contre l’IA, à deux ou en entraînement']),
  abysses: T('JavaScript, GLSL', 'Three.js, modèles Blender, Web Audio', 'Instanciation GPU : 2 047 poissons, 25 000 brins d’herbier', ['Jeu', 'Dégager au pinceau huit objets']),
  timber: T('HTML, JavaScript', 'Three.js, Blender, Web Audio', 'Fente, empilement, copeaux instanciés, son du choc', ['Livraison', 'Navigateur, souris et tactile']),
  rubik: T('HTML, JavaScript', 'Three.js, Web Worker', 'Permutations déduites des coordonnées des autocollants', ['Notions', 'Théorie des graphes']),
  sandboard: T('HTML, JavaScript', 'Three.js, Canvas 2D, Web Audio', 'Relief 3D, grains projetés par lancer de rayon', ['Rendu', 'Ombre de palmier, son du tracé']),
  pixels: T('HTML, JavaScript', 'Canvas 2D', 'Chaleur diffusée de case en case sur une grille', ['Rendu', 'Trois palettes']),
  gouache: T('JavaScript, GLSL', 'Three.js, shaders, instanciation, Lively Wallpaper', 'Poissons, herbes et bulles animés, nourrissage au clic', ['Livraison', 'Fond d’écran animé pour Windows']),
};

export const UNIV = { id: 'talas', title: 'Village Talas', sub: 'Jeu sérieux ISO 45001', img: 'assets/projets/talas.jpg?v=0801b99', url: 'village-talas-scene.html', desc: 'Sept ateliers, un par chapitre de l’ISO 45001, et une dizaine de mini-jeux dans un village en 3D : on apprend la norme en agissant plutôt qu’en lisant.', diag: TECH.talas };

export const PERSO_CARDS = PERSO.map((p) => ({ id: p.id, title: p.n, sub: p.genre, desc: p.desc, img: p.img, url: p.url, pixel: true, diag: TECH[p.id] || [] }));
export { CV };
