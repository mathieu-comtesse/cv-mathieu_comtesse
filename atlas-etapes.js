/* ATLAS · LES ÉTAPES DU PARCOURS : un bâtiment par étape. `glb` : nom du bâtiment dans assets/atlas/batiments.glb ; `vers` : le point (x, z) vers lequel
 * regarde la façade ; `lien` : page du site ouverte par la fiche. Les positions viennent de la carte (tools/atlas-ile/ile_carte.py). */
export const ETAPES = [
  { id: 'avignon', glb: 'avignon', vers: [0.3, 3.9], nom: 'Avignon Université', tag: 'Master d’histoire · 2017 – 2022', role: 'Master d’histoire · 2017 – 2022',
    texte: 'Campus Hannah Arendt, dans l’ancien Hôtel-Dieu. Cinq ans d’histoire : recherche documentaire, critique des sources et rédaction, la rigueur de méthode reprise ensuite dans l’enquête terrain MQSE.', lien: 'parcours.html', icone: 'AU' },
  { id: 'usp', glb: 'usp', vers: [0.3, 3.9], nom: 'Université Sorbonne Paris Nord', tag: 'M2 MQSE · M1 validé juin 2026', role: 'Master MQSE (M1 validé le 22 juin 2026, M2 en cours)',
    texte: 'Maintenance, Qualité, Sécurité, Environnement. Mémoire et soutenance sur l’amélioration du suivi des plans de prévention et de la coactivité (Power BI V0 → V4).', lien: 'parcours.html', icone: 'PN' },
  { id: 'sncf', glb: 'sncf', vers: [7.5, -3], nom: 'SNCF Gares & Connexions', tag: 'Assistant Sécurité & Production', role: 'Alternance · Assistant Sécurité & Production, ABE Sud Île-de-France',
    texte: 'Prévention terrain, plans de prévention et coactivité, maintenance réglementaire, accès et habilitations ; outils d’extraction, Power Automate et Power BI construits pour l’équipe.', lien: 'profil.html', icone: 'SN' },
  { id: 'reseau', glb: 'reseau', vers: [3.5, 3.2], nom: 'État des lieux EPM / EPTx', tag: 'Enquête terrain · rentrée 2026', role: 'Démarche MQSE · passage des travaux à la maintenance',
    texte: 'Entretiens (QQOQCP), gemba et groupe de travail transverse ; proposition d’un processus simplifié « EPM light » en cinq étapes, 16 arbitrages obtenus en réunion d’agence.', lien: 'projet-5.html', icone: 'EP' },
  { id: 'studio', glb: 'studio', vers: [0.3, 5], nom: 'Studio d’extracteurs PDF', tag: 'CERFA v3 · VRE · PP', role: 'Projet · extraction CERFA, attestations, VRE et plans de prévention',
    texte: 'Les PDF sont lus, structurés et contrôlés : les écarts apparaissent sans relire page par page. 300 fiches en quelques minutes au lieu de ≈ 20 h ; ≈ 50 000 € de pénalités de retard identifiées.', lien: 'projet-studio.html', icone: 'PDF' },
  { id: 'bi', glb: 'bi', vers: [2, 6], nom: 'Portail Power BI', tag: 'Déployé mai – juin 2026', role: 'Projet · plans de prévention et coactivité',
    texte: 'Premiers tableaux de bord au printemps 2026, portail déployé pour l’équipe en mai – juin 2026 puis alimenté par Power Automate : un plan retrouvé en 10 s au lieu de 3 à 5 min.', lien: 'projet-4.html', icone: 'BI' },
  { id: 'lean', glb: 'lean', vers: [0.5, 1.0], nom: 'Dojo Lean Six Sigma', tag: 'Yellow Belt validé · ISO', role: 'Yellow Belt validé · ISO 9001 / 45001 / 14001 / 27001',
    texte: 'DMAIC, PDCA, analyse des causes et amélioration continue ; référentiels qualité, sécurité, environnement et sécurité de l’information.', lien: 'methode.html', icone: '6σ' },
  { id: 'perso', glb: 'perso', vers: [0.5, 9], nom: 'Stade des projets perso', tag: '10 démos jouables en ligne', role: 'Arène des arcanes, Abysses & babioles, Route & vigilance, Timber !, Labyrinthe, Rubik, Sandboard, Pixels',
    texte: 'Le terrain de jeu Three.js et Canvas du site : combat en pixel art, plongée modélisée dans Blender, conduite, bûcheronnage, labyrinthe, casse-tête et bacs à sable.', lien: 'projets-perso.html', icone: '▶' },
];
