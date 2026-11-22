/* Configuration des vitrines « outil réel » des cadres du parcours (une entrée par fiche projet). Lue par tools/build-parcours-projets.mjs.
   Statut de chaque fenêtre (jamais une simulation présentée comme une capture) :
     authentic : capture de l'interface d'un fichier HTML local fourni (ouvert hors connexion aux systèmes métier). Ne prouve pas un traitement.
     editor    : capture du concepteur Power Automate. Elle montre la configuration du flux.
     demo      : capture ou animation de démonstration, données fictives ou interface reconstituée (pédagogique).
     mockup    : maquette ou référence graphique.
     missing   : aucun visuel disponible : emplacement documenté (need, anonymize).
   Fenêtre : id, kind, title, step, a (largeur/hauteur de l'image), src + big (WebP affiché / haute définition), alt, caption (légende + provenance),
   box { x, y, w } en % de la scène (sinon cascade automatique), fit ('contain' par défaut), badge (texte de l'étiquette, sinon par statut). */
const IMG = (slug, n) => ({ src: `assets/showcase/${slug}/${n}.webp`, big: `assets/showcase/${slug}/${n}-hd.webp` });
const NIS = 'Nisaru (R27), capture d’un fichier HTML ouvert hors connexion : écran sans rapport chargé, elle ne prouve pas un traitement. ';
const V11 = 'Metadata Studio V11 (outil distinct de l’extracteur CERFA v3 décrit dans la fiche), capture d’un fichier HTML ouvert hors connexion, sans document chargé : elle ne prouve pas un traitement. ';
const FIC = 'Capture de la page de démonstration publiée du projet, données fictives. ';
export const SHOWCASE = {
  /* 1. Point financier : un seul export de référence, le CS V8. */
  'projet-finance': {
    label: 'Point financier 02.01 CS V8', layout: 'finance', auto: true,
    steps: ['Démarrage', 'Contrôles', 'Entrée Power BI', 'Branches', 'Alerte PRG', 'État final'],
    windows: [],
    camera: {
      src: 'assets/showcase/finance/cs-v8-canevas.webp', width: 1260, height: 1910,
      actions: [
        [["Autorisation_Production","Exécutée"]],
        [["Verifier_Activation","Exécutée"],["Arreter_Avant_Production","Ignorée"],["Verifier_Table_Modele_2026","Exécutée"],["Arreter_Modele_2026","Ignorée"],["Lister_Bibliotheques_SharePoint","Exécutée"],["Trouver_Bibliotheque_GAP","Exécutée"],["Verifier_Bibliotheque_GAP","Exécutée"],["Arreter_Bibliotheque_Absente","Ignorée"],["Lire_Seuils_Excel","Exécutée"]],
        [["RequeteDAX","Exécutée"],["Lire_Configuration_Financiere","Exécutée"],["DepassementsReels","Exécutée"],["Config_PRG","Exécutée"],["Config_PSE","Exécutée"],["Config_GLOBAL","Exécutée"],["Verifier_Lignes_Configuration","Exécutée"],["Arreter_Configuration_Manquante","Ignorée"],["Verifier_Seuils_Valides","Exécutée"],["Arreter_Seuils_Invalides","Ignorée"]],
        [["LignesNegatives","Exécutée"],["Initialiser_Destinataire_PRG","Exécutée"],["Initialiser_Destinataire_PSE","Exécutée"],["Initialiser_Destinataire_GLOBAL","Exécutée"],["FichierEtat","Exécutée"],["LignesKO","Exécutée"],["KO_Historique_Annee_Courante","Exécutée"],["ClesKOActuelles","Exécutée"],["LignesEligiblesHorsKO","Exécutée"],["Metadata_JSON_SharePoint","Exécutée"],["LignesEligiblesPrevention","Exécutée"],["Filtre_Prevention_PRG","Exécutée"],["Nouvelles_Prevention_PRG","Exécutée"],["Cles_Prevention_PRG","Exécutée"],["Nouveaux_Critiques_PRG","Exécutée"],["Acquitter_Vigilance_Critiques_PRG","Exécutée"],["Table_Prevention_PRG","Exécutée"],["Filtre_Prevention_PSE","Exécutée"],["Nouvelles_Prevention_PSE","Exécutée"],["Cles_Prevention_PSE","Exécutée"],["Nouveaux_Critiques_PSE","Exécutée"],["Acquitter_Vigilance_Critiques_PSE","Exécutée"],["Table_Prevention_PSE","Exécutée"],["Filtre_Prevention_GLOBAL","Exécutée"],["Nouvelles_Prevention_GLOBAL","Exécutée"],["Cles_Prevention_GLOBAL","Exécutée"],["Nouveaux_Critiques_GLOBAL","Exécutée"],["Acquitter_Vigilance_Critiques_GLOBAL","Exécutée"],["Table_Prevention_GLOBAL","Exécutée"]],
        [["Alerte_Preventive_PRG","Exécutée"],["Envoyer_Prevention_PRG","Exécutée"],["Alerte_Preventive_PSE","Exécutée"],["Envoyer_Prevention_PSE","Ignorée"],["Alerte_Preventive_GLOBAL","Exécutée"],["Envoyer_Prevention_GLOBAL","Ignorée"],["Historique_Prevention","Exécutée"],["Nouvelles_Cles_Prevention","Exécutée"],["LignesPRG","Exécutée"],["LignesPSE","Exécutée"],["LignesGlobales","Exécutée"],["ClesActuelles","Exécutée"],["EtatFinalAvecKO","Exécutée"],["NouvellesLignes","Exécutée"],["NouvellesPRG","Exécutée"],["NouvellesPSE","Exécutée"],["TableHTML_PRG","Exécutée"],["TableHTML_PSE","Exécutée"],["TableHTML_GLOBAL","Exécutée"],["Condition_PRG","Exécutée"],["Envoyer_mail_PRG","Ignorée"],["Condition_PSE","Exécutée"],["Envoyer_mail_PSE","Ignorée"],["Condition_GLOBAL","Exécutée"],["Envoyer_mail_GLOBAL","Ignorée"]],
        [["Etat_Avec_Prevention","Exécutée"],["Mettre_à_jour_le_fichier","Exécutée"]]
      ],
      waypoints: [
        [526,90,520,'Récurrence · début de l’exécution'],
        [420,295,820,'Vérification de l’activation et préparation des données'],
        [855,420,625,'Une ligne Power BI · contrat fictif DEMO-CS-001'],
        [730,790,1160,'Branches PRG, PSE et globale'],
        [430,955,740,'PRG · 93 % consommés pour un seuil critique de 90 %'],
        [245,1595,720,'Une alerte simulée · état mis à jour']
      ]
    },
    note: 'Concepteur Power Automate, 76 actions dépliées. Le parcours suit un test simulé à partir de l’export CS V8.'
  },
  /* 2. VRE par VM : accès au portail pendant la collecte des captures. */
  'projet-vmvre': {
    label: 'Power Automate',
    portal: 'https://make.powerautomate.com/',
    note: 'Captures à venir pour le récapitulatif Power Automate, le dépôt SharePoint et le suivi Excel.'
  },
  /* 3. Reporteur Q18 : trois emplacements, console pédagogique */
  'projet-moteur44': {
    label: 'Le Reporteur Q18 en situation', layout: 'q18', steps: ['Le rapport', 'Le traitement', 'Le suivi', 'Le résultat'],
    windows: [
      { id: 'sp', kind: 'sharepoint', title: 'SharePoint · rapports de vérification', step: 1, box: { x: 2, y: 5, w: 42 }, a: '16/10', status: 'missing', need: 'Capture de la bibliothèque SharePoint où arrivent les rapports (vue liste).', anonymize: 'noms de clients, références de rapports, identifiants, noms de personnes' },
      { id: 'pdf', kind: 'pdf', title: 'Rapport de vérification', step: 1, box: { x: 31, y: 30, w: 24 }, a: '3/4', status: 'missing', need: 'Première page d’un rapport de vérification réel.', anonymize: 'client, site, numéro d’OT, signatures' },
      { id: 'xl', kind: 'excel', title: 'Excel · suivi', step: 3, box: { x: 3, y: 46, w: 47 }, a: '16/10', status: 'missing', need: 'Classeur de suivi avec la ligne retrouvée et la cellule renseignée.', anonymize: 'références d’équipement, noms de sites, données personnelles' }
    ],
    console: { title: 'Reporteur Q18', step: 2, box: { x: 56, y: 4, w: 41 }, a: '16/11' }
  },
  /* 4. Chaîne des PP : la vitrine utilise les captures du concepteur fournies le 27 octobre. */
  'projet-pa': {
    auto: true,
    label: 'La chaîne des plans de prévention dans Power Automate', layout: 'pp-editor', steps: ['Le dépôt', 'Le traitement Excel', 'Les notifications', 'Le résultat'],
    note: 'Captures du concepteur Power Automate du 27 octobre 2026. Elles documentent la configuration du flux.',
    windows: [
      { id: 'sp', kind: 'sharepoint', title: 'SharePoint · dépôt des plans', step: 1, box: { x: 2, y: 5, w: 30 }, a: '16/10', status: 'missing', need: 'Bibliothèque SharePoint de dépôt et de classement des plans de prévention.', anonymize: 'entreprises, noms de personnes, références de plans' },
      { id: 'pa', kind: 'app', title: 'Power Automate · traitement Excel', step: 2, box: { x: 32, y: 5, w: 35 }, a: '682/796', status: 'editor', browser: 'make.powerautomate.com', src: 'assets/showcase/pp/power-automate-traitement.png', alt: 'Le concepteur Power Automate montre le contrôle des lignes exploitables, leur injection dans Excel et la mise à jour des versions.', caption: 'Capture du concepteur Power Automate du 27 octobre 2026. Le flux injecte les lignes exploitables et analyse le résultat Excel.' },
      { id: 'pa-notifications', kind: 'app', title: 'Power Automate · notifications', step: 3, box: { x: 62, y: 13, w: 34 }, a: '592/747', status: 'editor', browser: 'make.powerautomate.com', src: 'assets/showcase/pp/power-automate-notifications.png', alt: 'Le concepteur Power Automate montre les conditions Lignes ajoutées et Données incomplètes et leurs actions Outlook.', caption: 'Capture du concepteur Power Automate du 27 octobre 2026. Les branches pilotent les confirmations au déposant et les alertes au responsable.' },
      { id: 'ol', kind: 'app', title: 'Outlook · notification', step: 3, box: { x: 3, y: 46, w: 28 }, a: '16/10', status: 'missing', need: 'Courriel de confirmation ou d’alerte généré.', anonymize: 'destinataires, entreprises, dates réelles' }
    ]
  },
  /* 5. CERFA : Metadata Studio V11, cinq captures locales (outil distinct de CERFA v3) */
  'projet-cerfa': {
    label: 'Metadata Studio V11 : du PDF aux livrables', layout: 'cascade', steps: ['Import PDF', 'Vue d’ensemble', 'Conformité des fluides', 'Contrôle qualité', 'Livrables'],
    note: 'Interface Metadata Studio V11, version distincte de l’extracteur CERFA v3 décrit dans la fiche. Captures de l’interface locale sans document chargé : elles ne montrent pas une exécution.',
    windows: [
      { id: 'imp', kind: 'app', title: 'Metadata Studio V11 · import PDF', step: 1, a: '1440/900', status: 'authentic', ...IMG('cerfa', 'import'), alt: 'Metadata Studio V11 : zone de dépôt des PDF et sources d’entrée.', caption: V11 + 'Écran d’acquisition documentaire.' },
      { id: 'vue', kind: 'app', title: 'Metadata Studio V11 · vue d’ensemble', step: 2, a: '1440/900', status: 'authentic', ...IMG('cerfa', 'vue-ensemble'), alt: 'Metadata Studio V11 : vue d’ensemble, onglets et moteurs.', caption: V11 + 'Vue d’ensemble et lecture des champs.' },
      { id: 'flu', kind: 'app', title: 'Metadata Studio V11 · conformité des fluides', step: 3, a: '1440/900', status: 'authentic', ...IMG('cerfa', 'fluides'), alt: 'Metadata Studio V11 : parc fluides frigorigènes et conformité réglementaire.', caption: V11 + 'Conformité réglementaire des fluides.' },
      { id: 'qc', kind: 'app', title: 'Metadata Studio V11 · contrôle qualité', step: 4, a: '1440/900', status: 'authentic', ...IMG('cerfa', 'controle-qualite'), alt: 'Metadata Studio V11 : dossiers nécessitant un examen.', caption: V11 + 'Contrôle qualité des dossiers à examiner.' },
      { id: 'liv', kind: 'app', title: 'Metadata Studio V11 · livrables', step: 5, a: '1440/900', status: 'authentic', ...IMG('cerfa', 'livrables'), alt: 'Metadata Studio V11 : registre des livrables, filtres et exports.', caption: V11 + 'Registre des livrables et exports.' }
    ]
  },
  /* 6. Extracteur VRE : capture de la page de démonstration publiée (données fictives) */
  'projet-vre': {
    label: 'L’Extracteur VRE en situation', layout: 'cascade', steps: ['Le dépôt des rapports', 'La vérification', 'Le résultat'],
    note: 'Les anciennes captures « VRE Studio » du dossier de travail ne sont pas utilisées ici : version et provenance non établies pour l’outil actuel.',
    windows: [
      { id: 'a', kind: 'app', title: 'Extracteur VRE · dépôt et vérification', step: 1, a: '1280/900', status: 'demo', ...IMG('vre', 'poster'), alt: 'Extracteur VRE unifié : indicateurs, dépôt des rapports PDF et tableau à vérifier.', caption: FIC + 'Étape de dépôt et de vérification des rapports.' },
      { id: 'b', kind: 'excel', title: 'Excel · export', step: 3, a: '16/10', status: 'missing', need: 'Export Excel ou GMAO produit par l’extracteur.', anonymize: 'équipements, sites, références' }
    ]
  },
  /* 7. Nisaru : six étapes, cinq captures locales et l'export manquant */
  'projet-lecteur-vre': {
    label: 'Nisaru : de l’import PDF à l’export, avec contrôle humain', layout: 'cascade', steps: ['Import PDF', 'Analyse documentaire', 'Assistance', 'Contrôle humain', 'Mémoire partagée', 'Export'],
    note: 'La validation humaine est une étape de la séquence : les corrections validées par l’utilisateur alimentent l’apprentissage supervisé, jamais un réentraînement automatique des poids. Captures de l’interface locale sans rapport chargé : elles ne prouvent pas un traitement.',
    windows: [
      { id: 'acc', kind: 'app', title: 'Nisaru · import des PDF', step: 1, a: '1440/900', status: 'authentic', ...IMG('lecteur-vre', 'accueil'), alt: 'Nisaru : synthèse et zone « Déposez vos rapports PDF ».', caption: NIS + 'Écran d’accueil et d’import.' },
      { id: 'rap', kind: 'app', title: 'Nisaru · importer et analyser', step: 2, a: '1440/900', status: 'authentic', ...IMG('lecteur-vre', 'import'), alt: 'Nisaru : menu Documents (importer et analyser, rapports, vérifier, radiographie, contrôle qualité).', caption: NIS + 'Menu d’analyse documentaire.' },
      { id: 'ass', kind: 'app', title: 'Nisaru · assistant', step: 3, a: '1440/900', status: 'authentic', ...IMG('lecteur-vre', 'assistant'), alt: 'Assistant Nisaru : aide locale, questions suggérées et commandes d’apprentissage.', caption: NIS + 'Assistant local (aide fondée sur les procédures de la version).' },
      { id: 'app', kind: 'app', title: 'Nisaru · contrôle humain et apprentissage', step: 4, a: '1440/900', status: 'authentic', ...IMG('lecteur-vre', 'apprentissage'), alt: 'Nisaru : apprentissage et réglages, vérifier un premier rapport, partager les exemples vérifiés.', caption: NIS + 'Contrôle humain : l’apprentissage part des corrections validées par l’utilisateur.' },
      { id: 'mem', kind: 'app', title: 'Nisaru · mémoire partagée', step: 5, a: '1440/900', status: 'authentic', ...IMG('lecteur-vre', 'memoire'), alt: 'Nisaru : mémoire partagée, choix du dossier et synchronisation des corrections.', caption: NIS + 'Mémoire partagée (la sélection de dossier n’était pas proposée par le navigateur de la capture).' },
      { id: 'exp', kind: 'excel', title: 'Nisaru · export', step: 6, a: '1440/900', status: 'missing', need: 'Écran d’export (Excel, JSON ou GMAO) avec un lot de démonstration.', anonymize: 'noms de rapports, références, chemins de dossiers' }
    ]
  },
  /* 8. Power BI PP / MOSO : médias du rapport PP + MOSO ; la maquette EPM/EPTx est un autre outil, présenté à part et seulement après anonymisation */
  'projet-powerbi': {
    label: 'Le rapport PP + MOSO en situation', layout: 'cascade', steps: ['Le pilotage', 'Les plans valides', 'Suivi EPM / EPTx'],
    note: 'Deux applications distinctes : le rapport PP + MOSO (captures de démonstration, données fictives) et la maquette « Suivi EPM / EPTx », présentée séparément. Ses captures du dossier contiennent des données internes (opérations, sites, comptes) : elles ne sont pas publiées tant qu’elles ne sont pas anonymisées.',
    windows: [
      { id: 'a', kind: 'app', title: 'Rapport PP + MOSO · pilotage', step: 1, a: '1280/790', status: 'demo', ...IMG('powerbi', 'pp-moso'), alt: 'Rapport PP + MOSO : pilotage des plans de prévention et marchés.', caption: FIC + 'Accueil du rapport PP + MOSO.' },
      { id: 'b', kind: 'app', title: 'Rapport PP + MOSO · plans valides', step: 2, a: '720/444', status: 'demo', ...IMG('powerbi', 'pp-valides'), alt: 'Rapport PP + MOSO : liste des plans de prévention valides.', caption: FIC + 'Liste des plans de prévention valides.' },
      { id: 'c', kind: 'app', title: 'Suivi EPM / EPTx (maquette, autre outil)', step: 3, a: '1440/900', status: 'missing', need: 'Captures anonymisées de la maquette EPM / EPTx (vue d’ensemble et contrôles).', anonymize: 'identifiants d’opérations, noms de sites et de secteurs, comptages internes, liens SharePoint' }
    ]
  },
  /* 9. Studio d'extracteurs PDF : captures de la page de démonstration publiée */
  'projet-studio': {
    label: 'Le Studio d’extracteurs PDF en situation', layout: 'cascade', steps: ['Le gabarit', 'Le placement des cadres', 'Le résultat'],
    note: 'Ce studio n’est ni Nisaru (lecteur multimodal supervisé) ni Metadata Studio V11 : ce sont trois outils distincts.',
    windows: [
      { id: 'a', kind: 'app', title: 'Studio d’extracteurs · gabarit', step: 1, a: '1280/860', status: 'demo', ...IMG('studio', 'poster'), alt: 'Studio d’extracteurs PDF : étapes gabarit, tableau, mise en page, test et génération.', caption: FIC + 'Écran de départ : dépôt du PDF modèle.' },
      { id: 'b', kind: 'app', title: 'Studio d’extracteurs · cadres', step: 2, a: '720/483', status: 'demo', ...IMG('studio', 'apercu'), alt: 'Studio d’extracteurs PDF : formulaire de démonstration, zones de données et champs.', caption: FIC + 'Placement et validation des cadres sur un formulaire de démonstration.' }
    ]
  },
  /* 10. Retrouver tout le suivi : l'unique capture du dossier est un écran de connexion, non utilisée ; page de démonstration publiée + emplacement */
  'projet-suivi': {
    label: 'Retrouver tout le suivi en situation', layout: 'cascade', steps: ['La recherche', 'Le résultat'],
    note: 'La capture « suivi-emt » du dossier est un écran de connexion protégé : elle n’est pas utilisée. Une vraie capture fonctionnelle reste à fournir.',
    windows: [
      { id: 'a', kind: 'app', title: 'Retrouver tout le suivi · recherche', step: 1, a: '720/450', status: 'demo', ...IMG('suivi', 'recherche'), alt: 'Page de démonstration : recherche d’un OT, ouverture directe dans GMAO, équipement, bâtiment ou tableau de suivi.', caption: 'Page de démonstration publiée du projet, données fictives (OT d’exemple). Elle illustre la recherche, pas le suivi réel.' },
      { id: 'b', kind: 'app', title: 'Suivi · résultat', step: 2, a: '16/10', status: 'missing', need: 'Capture fonctionnelle du suivi d’un OT, hors écran de connexion.', anonymize: 'OT, équipements, bâtiments, noms de personnes' }
    ]
  },
  /* 11. Gares prioritaires : capture de démonstration publiée (« données fictives · démonstration ») */
  'projet-gares': {
    label: 'Gares prioritaires en situation', layout: 'cascade', steps: ['Le critère et le classement', 'La fiche d’une gare'],
    note: 'Le classement affiché provient de la démonstration publiée (gares fictives) : il n’est pas un classement réel.',
    windows: [
      { id: 'a', kind: 'app', title: 'Gares prioritaires · classement par criticité', step: 1, a: '1280/790', status: 'demo', ...IMG('gares', 'classement'), alt: 'Classement par criticité : indicateurs, filtres et tableau des gares de démonstration.', caption: FIC + 'Classement par criticité (gares fictives).' },
      { id: 'b', kind: 'app', title: 'Gares prioritaires · fiche', step: 2, a: '16/10', status: 'missing', need: 'Ouverture de la fiche d’une gare de démonstration.', anonymize: 'noms de gares réels, indicateurs réels' }
    ]
  }
};
