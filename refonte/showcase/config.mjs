/* Configuration des vitrines « outil réel » des cadres du parcours (une entrée par fiche projet). Lue par tools/build-parcours-projets.mjs.
   Statut de chaque fenêtre (jamais une simulation présentée comme une capture) :
     authentic : capture de l'interface d'un fichier HTML local fourni (ouvert hors connexion aux systèmes métier). Ne prouve pas un traitement.
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
  /* 1. Point financier : trois animations pédagogiques (interface reconstituée, données financières fictives), jamais présentées comme des écrans de production */
  'projet-finance': {
    label: 'Du classeur Excel à la notification (animation pédagogique)', layout: 'cascade', steps: ['Le classeur Excel', 'Le flux Power Automate', 'La notification'],
    note: 'Les trois fenêtres sont des images tirées d’animations pédagogiques : données financières fictives, interface reconstituée d’après l’export du flux. Ce ne sont pas des captures de production.',
    windows: [
      { id: 'xl', kind: 'excel', title: 'Excel · seuil d’alerte', step: 1, a: '16/9', status: 'demo', ...IMG('finance', 'excel-seuil'), alt: 'Classeur Excel de configuration des alertes : la ligne 02.10 PSE passe de 70 à 75 %.', caption: 'Animation pédagogique : modification du seuil dans le classeur de paramètres (données fictives, interface reconstituée).' },
      { id: 'pa', kind: 'app', title: 'Power Automate · flux 02.10', step: 2, a: '16/9', status: 'demo', ...IMG('finance', 'flux'), alt: 'Exécution simulée du flux Power Automate 02.10 : étapes et résultat de la dernière action.', caption: 'Animation pédagogique : exécution simulée du flux à partir de son export (données fictives).' },
      { id: 'ol', kind: 'app', title: 'Outlook · courriel préventif', step: 3, a: '16/9', status: 'demo', ...IMG('finance', 'mail'), alt: 'Courriel HTML préventif : référence d’exemple, contrat, restant et niveau de vigilance.', caption: 'Animation pédagogique : rendu du courriel HTML préventif (référence d’exemple, données fictives).' }
    ]
  },
  /* 2. VRE par VM : aucune capture propre à cet outil dans le dépôt ni dans le dossier */
  'projet-vmvre': {
    label: 'Le traitement VRE par VM en situation', layout: 'q18', steps: ['La réception', 'La file et les contrôles', 'Le suivi', 'Le résultat'],
    windows: [
      { id: 'sp', kind: 'sharepoint', title: 'SharePoint · dossiers VRE', step: 1, box: { x: 2, y: 5, w: 42 }, a: '16/10', status: 'missing', need: 'Dossier où le rapport VRE est détecté.', anonymize: 'noms de dossiers, identifiants OT, noms de personnes' },
      { id: 'pdf', kind: 'pdf', title: 'Rapport VRE', step: 1, box: { x: 31, y: 30, w: 24 }, a: '3/4', status: 'missing', need: 'Première page d’un rapport VRE.', anonymize: 'client, site, numéro d’OT, signatures' },
      { id: 'xl', kind: 'excel', title: 'Excel · suivi', step: 3, box: { x: 3, y: 46, w: 47 }, a: '16/10', status: 'missing', need: 'Ligne d’OT inscrite dans le suivi.', anonymize: 'références, noms de sites' }
    ],
    console: { title: 'Traitement VRE par VM', step: 2, box: { x: 56, y: 4, w: 41 }, a: '16/11' }
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
  /* 4. Chaîne des PP : les médias PP du dépôt appartiennent au rapport PP + MOSO (Power BI), pas à la chaîne Power Automate : emplacements */
  'projet-pa': {
    label: 'La chaîne des plans de prévention en situation', layout: 'q18', steps: ['Le dépôt', 'Le traitement', 'La relance', 'Le résultat'],
    windows: [
      { id: 'sp', kind: 'sharepoint', title: 'SharePoint · dépôt des plans', step: 1, box: { x: 2, y: 5, w: 42 }, a: '16/10', status: 'missing', need: 'Bibliothèque SharePoint de dépôt et de classement des plans de prévention.', anonymize: 'entreprises, noms de personnes, références de plans' },
      { id: 'pa', kind: 'app', title: 'Power Automate · flux de relance', step: 2, box: { x: 31, y: 30, w: 30 }, a: '16/10', status: 'missing', need: 'Vue du flux de contrôle d’échéance et de relance.', anonymize: 'adresses, noms de listes' },
      { id: 'ol', kind: 'app', title: 'Outlook · relance', step: 3, box: { x: 3, y: 46, w: 47 }, a: '16/10', status: 'missing', need: 'Courriel de relance généré (destinataires masqués).', anonymize: 'destinataires, entreprises, dates réelles' }
    ],
    console: { title: 'Chaîne des PP', step: 2, box: { x: 56, y: 4, w: 41 }, a: '16/11' }
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
