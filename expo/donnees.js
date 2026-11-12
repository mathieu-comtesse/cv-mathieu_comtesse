/* Contenu de l'exposition : tout vient des données du site (js/projects-data.js, js/data.js) ; le parcours et les compétences reprennent le texte de l'accueil. */
import { PRO_CARDS, PERSO_CARDS, UNIV } from '../js/projects-data.js?v=cv-projects-v21';

const phrase = (t, max = 190) => { if (!t) return ''; const m = t.match(/^.*?[.!?](?=\s|$)/); let s = m ? m[0] : t; if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…'; return s; };

const PARCOURS = [
  ['Ingénieur Maintenance & Qualité', '2025 à aujourd’hui', 'SNCF Gares & Connexions', 'Prévention et sécurité, coactivité, maintenance réglementaire et exploitation des données. Des outils construits pour retirer les tâches répétitives.'],
  ['Master 2 MQSE', '2026 à 2027', 'Université Sorbonne Paris Nord', 'Maintenance, qualité, sécurité et environnement. Master classé n°1 national de sa catégorie au classement Eduniversal 2026.'],
  ['Technicien supérieur de la circulation ferroviaire', '2022 à 2025', 'SNCF Réseau', 'Formations ACDV et TTMV obtenues en 2022 à 2023.'],
  ['Master d’histoire', '2017 à 2022', 'Avignon Université', 'Cinq années d’études d’histoire.'],
  ['CPGE ECE, puis Baccalauréat ES', '2016 à 2017', 'Lycée Jean Calvin, Noyon', 'Classe préparatoire économique et commerciale, après le baccalauréat ES obtenu en 2016.'],
];
const COMPETENCES = [
  ['Prévention & sécurité', ['Analyse de risques', 'Coactivité', 'Plans de prévention', 'Suivi des écarts', 'Actions correctives', 'Certification NEBOSH']],
  ['Maintenance & exploitation', ['Suivi réglementaire', 'Vigilance équipements', 'Pilotage des échéances', 'Fiabilisation des données']],
  ['Data & automatisation', ['Power BI', 'Power Automate', 'Excel', 'HTML / JavaScript', 'Extraction PDF', 'OCR', 'JSON']],
  ['IA appliquée', ['Agents LLM', 'Compétences en Markdown', 'Connecteurs & MCP', 'Mémoire sous Obsidian', 'Modèles à score de confiance', 'Serveur interne & LLM open source', 'Orchestration multi-modèles']],
  ['Référentiels', ['ISO 9001', 'ISO 45001', 'ISO 14001', 'ISO 22301', 'ISO 27001 / 27002', 'ISO 19443']],
  ['Méthodes', ['Lean Six Sigma Yellow Belt', 'Green Belt', 'DMAIC', 'SIPOC', 'PDCA', 'Audit terrain', 'Analyse des écarts', 'Amélioration continue']],
  ['Savoir-être', ['Curiosité', 'Rigueur', 'Autonomie', 'Esprit critique', 'Goût du détail', 'Détermination', 'Apprendre en autonomie', 'Transmission']],
];
const ETUDES = [['finance', 'Point financier · Power Automate'], ['vmvre', 'VRE · traitement par VM'], ['moteur44', 'Reporteur Q18'], ['pa', 'Power Automate · chaîne des PP'], ['cerfa', 'CERFA v3'], ['vre', 'Extracteur VRE'], ['studio', 'Studio d’extracteurs PDF'], ['powerbi', 'Power BI · PP & MOSO'], ['suivi', 'Retrouver tout le suivi'], ['gares', 'Gares prioritaires']];
const jeu = (u) => (u.startsWith('../') ? u.slice(3) : 'jeux/' + u);

export const CHAPITRES = [
  { id: 'ouverture', titre: 'Mathieu Comtesse', court: 'Ouverture', sous: 'ingénieur maintenance et qualité', cadres: [
    { type: 'texte', kicker: 'Salut !', titre: 'Je retire les tâches répétitives', texte: 'Ingénieur maintenance et qualité en alternance chez SNCF Gares & Connexions. Je travaille avec les équipes de terrain pour rendre leurs processus plus fiables, plus rapides et plus lisibles.', puce: 'M2 MQSE · Sorbonne Paris Nord' },
    { type: 'texte', kicker: 'Mode d’emploi', titre: 'Une exposition à parcourir', texte: 'Avancez à la molette ou au doigt. Chaque cadre s’ouvre d’un clic. Les branches relient les chapitres ; au bout du chemin, un jeu vous attend.', puce: 'Expo ou à plat : bouton en haut à droite' },
  ] },
  { id: 'projets', titre: 'Projets professionnels', court: 'Projets', sous: 'des processus à explorer et à faire fonctionner', cadres: PRO_CARDS.map((p, i) => ({
    type: 'projet', kicker: `Projet ${String(i + 1).padStart(2, '0')}`, titre: p.title, sous: p.sub, texte: phrase(p.pro?.lead || p.timeCtx), puce: p.time, puce2: p.money, img: p.img, lien: `projet-${p.id}.html`, lienTexte: 'Ouvrir la fiche' })) },
  { id: 'parcours', titre: 'Parcours', court: 'Parcours', sous: 'quatre ans sur le rail, de la circulation à la sécurité en gare', cadres: PARCOURS.map(([titre, dates, lieu, texte]) => ({ type: 'texte', kicker: dates, titre, sous: lieu, texte })) },
  { id: 'competences', titre: 'Compétences', court: 'Compétences', sous: 'en cours d’acquisition', cadres: COMPETENCES.map(([titre, liste], i) => ({ type: 'liste', kicker: `Famille ${i + 1}`, titre, liste })) },
  { id: 'jeux', titre: 'Mondes & jeux', court: 'Mondes & jeux', sous: 'machines manipulables, jeux et mondes en 3D', cadres: [
    { type: 'projet', kicker: 'Jeu sérieux', titre: UNIV.title, sous: UNIV.sub, texte: phrase(UNIV.desc), img: UNIV.img, lien: UNIV.url, lienTexte: 'Jouer' },
    ...PERSO_CARDS.map((p) => ({ type: 'projet', kicker: p.sub, titre: p.title, texte: phrase(p.desc, 170), img: p.img, lien: jeu(p.url), lienTexte: 'Ouvrir' })),
  ] },
  { id: 'etudes', titre: 'Blog & études', court: 'Études', sous: 'expériences et essais sur la qualité et le numérique', cadres: ETUDES.map(([id, titre], i) => ({ type: 'texte', kicker: `Étude ${String(i + 1).padStart(2, '0')}`, titre, texte: 'Le problème de départ, la méthode, les mesures et ce que l’outil a changé pour l’équipe.', lien: `article-${id}.html`, lienTexte: 'Lire l’étude' })) },
  { id: 'contact', titre: 'Contact', court: 'Contact', sous: 'envie de dire bonjour ?', cadres: [
    { type: 'texte', kicker: 'Écrire', titre: 'mathieu@comtesse.me', texte: 'Dites le mot magique pour que je sache que vous n’êtes pas un robot : MATHIEUPORTFOLIO2026.', lien: 'mailto:mathieu@comtesse.me', lienTexte: 'Écrire un courriel' },
    { type: 'texte', kicker: 'Se retrouver', titre: 'LinkedIn et CV', texte: 'Et si vous passez par Paris, prenons un café.', lien: 'https://www.linkedin.com/in/mathieu-comtesse-a226a1433/', lienTexte: 'LinkedIn', lien2: 'assets/cv-ats-mathieu-comtesse.pdf', lien2Texte: 'CV en PDF' },
  ] },
  { id: 'jeu', titre: 'La pièce flottante', court: 'Le jeu', sous: 'au bout du chemin, ma pièce a quitté le sol', cadres: [
    { type: 'projet', kicker: 'Jeu final', titre: 'Entrer dans la pièce flottante', texte: 'Ma pièce, ma platine, mon jardin et mon atelier, changés en archipel. Vingt cristaux à réunir, trois portes au sommet.', img: 'monde3d/social/share-1200x630.png', jeu: true, lienTexte: 'Jouer' },
  ] },
];
