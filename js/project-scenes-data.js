export const reconstructedProjects=[
  {
    "id": "cerfa",
    "title": "CERFA v3",
    "subtitle": "Du lot documentaire aux anomalies visibles",
    "color": "#986b30",
    "reference": "https://sketchfab.com/3d-models/mobile-sieve-drum-system-3dc68e901a7a47c593d4895bf47031f0",
    "model": "Tamis mobile",
    "size": 8.5,
    "target": [
      0.4,
      1,
      0
    ],
    "steps": [
      {
        "title": "Lot de PDF",
        "kind": "pdf",
        "description": "Les fiches CERFA et attestations arrivent en lot. La trémie représente cette entrée documentaire.",
        "point": [
          -2,
          2.05,
          0
        ]
      },
      {
        "title": "Fiches et attestations",
        "kind": "queue",
        "description": "Les catégories documentaires sont identifiées avant la lecture.",
        "point": [
          -1.9,
          1.6,
          0.4
        ]
      },
      {
        "title": "Lecture des pages",
        "kind": "extract",
        "description": "Les pages 1 et 2 sont rendues pour être lues. Le tambour représente le traitement du lot.",
        "point": [
          -0.5,
          1.7,
          0
        ]
      },
      {
        "title": "Lecture des cases",
        "kind": "script",
        "description": "Les cases utiles sont repérées et leurs valeurs deviennent des données structurées.",
        "point": [
          0.4,
          1.7,
          0
        ]
      },
      {
        "title": "Contrôles",
        "kind": "check",
        "description": "Doublons, non-conformités et retards ressortent. Tous restent consultables.",
        "point": [
          1.4,
          1.6,
          0.3
        ]
      },
      {
        "title": "Consultation HTML",
        "kind": "html",
        "description": "L’interface permet de consulter les documents et leurs résultats.",
        "point": [
          2.4,
          1.1,
          0.2
        ]
      },
      {
        "title": "KPI et filtres",
        "kind": "chart",
        "description": "Les indicateurs et filtres permettent de retrouver les anomalies du lot.",
        "point": [
          2.8,
          1.2,
          0.3
        ]
      },
      {
        "title": "Excel préparé",
        "kind": "excel",
        "description": "Le tableau filtré est préparé avec les surlignages utiles.",
        "point": [
          3.9,
          0.95,
          0.25
        ]
      },
      {
        "title": "Export sélectionné",
        "kind": "export",
        "description": "Le lot choisi est exporté pour être exploité. Le cycle suivant reprend à l’entrée.",
        "point": [
          4.5,
          0.95,
          0.25
        ]
      }
    ]
  },
  {
    "id": "vre",
    "title": "Extracteur VRE",
    "subtitle": "Compter les équipements, garder le lien au terrain",
    "color": "#597578",
    "reference": "https://sketchfab.com/3d-models/distribution-cabinet-set-texture-update-70508d67807e49828a64d5e988e0160f",
    "model": "Coffrets électriques",
    "size": 7,
    "target": [
      0,
      1.1,
      0
    ],
    "steps": [
      {
        "title": "Rapport électrique",
        "kind": "pdf",
        "description": "Le rapport PDF fournit les équipements, les départs et les écarts à examiner.",
        "point": [
          -1.5,
          1.5,
          0.2
        ]
      },
      {
        "title": "Bâtiment et local",
        "kind": "field",
        "description": "Les résultats sont rattachés au bâtiment et au local concernés.",
        "point": [
          -1.5,
          0.8,
          0.2
        ]
      },
      {
        "title": "BT31 · disjoncteurs",
        "kind": "extract",
        "description": "Les disjoncteurs sont repérés dans le rapport et comptés par famille.",
        "point": [
          -1.5,
          1.1,
          0.05
        ]
      },
      {
        "title": "BT33 · fusibles",
        "kind": "script",
        "description": "Les fusibles sont identifiés et leurs totaux restent distincts.",
        "point": [
          0,
          1.1,
          0.05
        ]
      },
      {
        "title": "BT21 · éclairage de sécurité",
        "kind": "check",
        "description": "Les équipements d’éclairage de sécurité font également partie du comptage.",
        "point": [
          2.85,
          1.2,
          0
        ]
      },
      {
        "title": "BT11 · candélabres",
        "kind": "field",
        "description": "Les candélabres constituent une autre famille, sans être confondus avec les coffrets.",
        "point": [
          -2.6,
          1.8,
          0
        ]
      },
      {
        "title": "Totaux contrôlés",
        "kind": "check",
        "description": "Les quantités sont vérifiées avant de rejoindre le suivi.",
        "point": [
          1.5,
          1.1,
          0.05
        ]
      },
      {
        "title": "Structure Excel",
        "kind": "excel",
        "description": "Chaque total retrouve sa place dans le classeur de suivi.",
        "point": [
          0,
          0.7,
          0.2
        ]
      },
      {
        "title": "Suivi et PAM SSI",
        "kind": "inject",
        "description": "Les résultats alimentent le suivi, avec des repères bâtiment et local pour leur exploitation.",
        "point": [
          0.8,
          1,
          0.2
        ]
      }
    ]
  },
  {
    "id": "vmvre",
    "title": "VRE / VLE · traitement par VM",
    "subtitle": "De la file d’attente à l’intégration confirmée",
    "color": "#a3791f",
    "reference": "https://sketchfab.com/3d-models/gantry-crane-for-harbor-rtg-2054115710104ef48d3ef39d3ed6626c",
    "model": "Portique RTG",
    "size": 8,
    "target": [
      -0.5,
      1.7,
      0
    ],
    "steps": [
      {
        "title": "Dépôt SharePoint",
        "kind": "sharepoint",
        "description": "Le PDF est déposé dans SharePoint. Une unité représente un rapport et sa demande.",
        "point": [
          -3.2,
          0.6,
          -0.2
        ]
      },
      {
        "title": "Demande de traitement",
        "kind": "automate",
        "description": "Power Automate crée la demande de traitement.",
        "point": [
          -2.7,
          0.6,
          -0.2
        ]
      },
      {
        "title": "File d’attente",
        "kind": "queue",
        "description": "Les demandes attendent leur prise en charge. Le portique se positionne sur l’unité.",
        "point": [
          -0.84,
          0.7,
          0
        ]
      },
      {
        "title": "Relevé par la VM",
        "kind": "vm",
        "description": "La VM Windows relève les demandes toutes les deux minutes.",
        "point": [
          -0.84,
          2.5,
          0
        ]
      },
      {
        "title": "Contrôle R004 et OT",
        "kind": "extract",
        "description": "Le code final R004 et le numéro OT à sept chiffres sont contrôlés.",
        "point": [
          -0.7,
          2.5,
          0
        ]
      },
      {
        "title": "Recherche dans Excel",
        "kind": "excel",
        "description": "Le classeur de suivi et l’OT correspondant sont retrouvés.",
        "point": [
          0.6,
          2.1,
          0
        ]
      },
      {
        "title": "Inscription vérifiée",
        "kind": "inject",
        "description": "Le lien du rapport est écrit ; le classeur est enregistré puis vérifié.",
        "point": [
          0.8,
          0.8,
          0
        ]
      },
      {
        "title": "Historique confirmé",
        "kind": "export",
        "description": "Seuls les résultats confirmés rejoignent l’historique pour éviter les doublons.",
        "point": [
          0.8,
          1.1,
          0
        ]
      },
      {
        "title": "Récapitulatif de 17 h",
        "kind": "outlook",
        "description": "Le récapitulatif rassemble les nouvelles intégrations confirmées. La reprise entre deux VM reste un chantier à concevoir.",
        "point": [
          0.1,
          2.9,
          0
        ]
      }
    ]
  },
  {
    "id": "finance",
    "title": "Point financier",
    "subtitle": "Anticiper un seuil, distinguer un dépassement",
    "color": "#8b672b",
    "reference": "https://sketchfab.com/3d-models/spindle-gate-valve-basic-version-02a88bb0f2b440e3a226a1bb2c74ac0d",
    "reference2": "https://sketchfab.com/3d-models/cnrl-mft-buffer-tank-ce23e2378c15412e8b4dc3baa95d6b38",
    "model": "Vanne et réservoir",
    "size": 6,
    "target": [
      0,
      1.3,
      0
    ],
    "steps": [
      {
        "title": "Suivi Excel",
        "kind": "excel",
        "description": "Les fonds, dépenses et seuils configurés sont lus dans le classeur.",
        "point": [
          -1.3,
          1.1,
          0
        ]
      },
      {
        "title": "Déclenchement",
        "kind": "automate",
        "description": "Les flux CS, Locatif, MEC et PPTM déclenchent le contrôle financier.",
        "point": [
          -1.2,
          2.2,
          0
        ]
      },
      {
        "title": "Lecture structurée",
        "kind": "excel-script",
        "description": "Les données Excel deviennent une table exploitable par les règles.",
        "point": [
          -1.3,
          1.2,
          1.08
        ]
      },
      {
        "title": "PRG · PSE · GLOBAL",
        "kind": "extract",
        "description": "Les périmètres sont appliqués et les lignes KO sont exclues.",
        "point": [
          1.3,
          0.7,
          0
        ]
      },
      {
        "title": "Seuil modulable",
        "kind": "script",
        "description": "Le repère rouge de la jauge règle le seuil, ici calé à 80 % des fonds du compte. Le volant de la vanne attend qu’il soit atteint.",
        "point": [
          -1.43,
          1.6,
          1.07
        ]
      },
      {
        "title": "Consommation du compte",
        "kind": "chart",
        "description": "La jauge montre le ratio entre dépenses et fonds. Les valeurs de cette démonstration sont illustratives.",
        "point": [
          -1.3,
          1.2,
          1.08
        ]
      },
      {
        "title": "Alerte préventive",
        "kind": "outlook",
        "description": "Le seuil atteint, le volant fait tourner la vis : l’opercule monte à mi-course et le mail d’alerte préventive sort vers son panneau.",
        "point": [
          1.95,
          0.9,
          0.2
        ]
      },
      {
        "title": "Dépassement des fonds",
        "kind": "outlook",
        "description": "La vis ouvre complètement la vanne et un second mail signale des dépenses supérieures aux fonds disponibles : le TND devient négatif.",
        "point": [
          1.95,
          1.3,
          0.2
        ]
      },
      {
        "title": "Historique des alertes",
        "kind": "check",
        "description": "Les mails envoyés restent affichés dans l’historique pour éviter les doublons ; la vis referme la vanne. Elle ne signifie pas que les dépenses sont bloquées.",
        "point": [
          1.3,
          1.3,
          0
        ]
      }
    ]
  },
  {
    "id": "suivi",
    "title": "Retrouver tout le suivi",
    "subtitle": "Un point d’entrée, les bons liens",
    "color": "#476b82",
    "reference": "https://sketchfab.com/3d-models/smart-bridge-nxt-multi-display-e4e71ccfd67b4cf3a039910b205052c4",
    "model": "Passerelle de supervision",
    "size": 7,
    "target": [
      0,
      0.9,
      0.5
    ],
    "steps": [
      {
        "title": "Ordres de travail",
        "kind": "queue",
        "description": "Les OT de la GMAO constituent le point de départ.",
        "point": [
          -1.95,
          1.3,
          0.2
        ]
      },
      {
        "title": "Exports des sources",
        "kind": "export",
        "description": "Les autres logiciels et sites fournissent les informations utiles.",
        "point": [
          1.95,
          1.3,
          0.2
        ]
      },
      {
        "title": "Informations utiles",
        "kind": "extract",
        "description": "Les éléments utiles sont isolés pour être retrouvés dans l’interface.",
        "point": [
          -0.84,
          1.5,
          -0.1
        ]
      },
      {
        "title": "Équipement",
        "kind": "inject",
        "description": "Chaque ligne est rattachée à son équipement.",
        "point": [
          0,
          1.5,
          -0.1
        ]
      },
      {
        "title": "Bâtiment",
        "kind": "field",
        "description": "Le bâtiment fournit un autre accès au même suivi.",
        "point": [
          0.84,
          1.5,
          -0.1
        ]
      },
      {
        "title": "Interface commune",
        "kind": "html",
        "description": "Les différents accès se rassemblent dans un point d’entrée commun.",
        "point": [
          0,
          1.15,
          0.2
        ]
      },
      {
        "title": "Recherche OT",
        "kind": "extract",
        "description": "Une recherche par OT retrouve le contexte et l’accès pertinent.",
        "point": [
          1.9,
          1.06,
          1.98
        ]
      },
      {
        "title": "Lien direct",
        "kind": "check",
        "description": "Le bon écran s’active et conduit vers la source concernée.",
        "point": [
          0.84,
          1.5,
          -0.1
        ]
      },
      {
        "title": "Suivi retrouvé",
        "kind": "chart",
        "description": "Les outils restent distincts ; l’interface facilite leur navigation sans répliquer toutes leurs données.",
        "point": [
          0,
          1.3,
          0
        ]
      }
    ]
  },
  {
    "id": "gares",
    "title": "Gares prioritaires",
    "subtitle": "Rendre la criticité et la vigilance lisibles",
    "color": "#297577",
    "reference": "https://sketchfab.com/3d-models/naval-radar-console-da9857a62ba048beb1214f488f532f99",
    "model": "Console radar",
    "size": 3.4,
    "target": [
      0,
      1.03,
      0
    ],
    "steps": [
      {
        "title": "Sources du suivi",
        "kind": "sharepoint",
        "description": "Les sources GMAO, référentiel et SharePoint sont réunies.",
        "point": [
          -1,
          1.82,
          -0.61
        ]
      },
      {
        "title": "Préparation",
        "kind": "extract",
        "description": "Les données sont préparées et contrôlées.",
        "point": [
          -0.51,
          1.82,
          -0.61
        ]
      },
      {
        "title": "Rapprochement",
        "kind": "inject",
        "description": "Les données retrouvent les gares et équipements concernés.",
        "point": [
          0,
          1.82,
          -0.61
        ]
      },
      {
        "title": "Modèle Power BI",
        "kind": "powerbi",
        "description": "Le modèle comporte 19 tables et 159 mesures.",
        "point": [
          0.51,
          1.82,
          -0.61
        ]
      },
      {
        "title": "Criticité",
        "kind": "script",
        "description": "Les mesures permettent de hiérarchiser les situations à surveiller.",
        "point": [
          0.44,
          1.52,
          -0.39
        ]
      },
      {
        "title": "Conformité source normale",
        "kind": "check",
        "description": "La conformité et les équipements demandant de la vigilance deviennent visibles.",
        "point": [
          0.44,
          1.43,
          -0.11
        ]
      },
      {
        "title": "Gares prioritaires",
        "kind": "chart",
        "description": "Les priorités ressortent selon les mesures, sans dépendre de leur distance au centre du radar.",
        "point": [
          -0.56,
          1.38,
          0
        ]
      },
      {
        "title": "Détail maintenance",
        "kind": "field",
        "description": "La vue gare ouvre le détail des équipements et de leur maintenance préventive.",
        "point": [
          0.44,
          1.34,
          0.16
        ]
      },
      {
        "title": "Suivi consolidé",
        "kind": "powerbi",
        "description": "L’ensemble devient consultable pour orienter les actions. Le radar symbolise la vigilance, sans surveillance en temps réel.",
        "point": [
          1.02,
          1.82,
          -0.61
        ]
      }
    ]
  },
  {
    "id": "studio",
    "title": "Studio d’extracteurs PDF",
    "subtitle": "Configurer, essayer, livrer un outil autonome",
    "color": "#967616",
    "reference": "https://sketchfab.com/3d-models/animated-packstation-high-poly-version-ff6a6dabac1d4de39592e4ea98cc3a8d",
    "model": "Borne à casiers animés",
    "size": 6,
    "target": [
      0,
      1.05,
      0
    ],
    "steps": [
      {
        "title": "Exemple PDF",
        "kind": "pdf",
        "description": "Un exemple du document sert de modèle pour créer l’extracteur.",
        "point": [
          0,
          1.45,
          0.42
        ]
      },
      {
        "title": "Page de référence",
        "kind": "design",
        "description": "La page rendue sert de support à la configuration.",
        "point": [
          0,
          1.45,
          0.42
        ]
      },
      {
        "title": "Tracé des zones",
        "kind": "extract",
        "description": "Les zones à lire sont tracées directement sur le document.",
        "point": [
          0,
          1.45,
          0.42
        ]
      },
      {
        "title": "Champs à extraire",
        "kind": "script",
        "description": "Les champs sont définis sans écrire le code de l’extracteur.",
        "point": [
          0,
          1.2,
          0.43
        ]
      },
      {
        "title": "Règles de lecture",
        "kind": "script",
        "description": "Les règles précisent comment lire et structurer chaque champ.",
        "point": [
          0,
          1.2,
          0.43
        ]
      },
      {
        "title": "Essai réel",
        "kind": "check",
        "description": "La configuration est testée sur des documents réels avant la livraison.",
        "point": [
          0,
          1.45,
          0.42
        ]
      },
      {
        "title": "Page autonome",
        "kind": "html",
        "description": "Une page HTML autonome porte l’extracteur et sa configuration.",
        "point": [
          1.29,
          1.84,
          0.2
        ]
      },
      {
        "title": "Export de l’outil",
        "kind": "export",
        "description": "Le fichier ou l’exécutable est livré. Le casier de la famille choisie s’ouvre.",
        "point": [
          1.29,
          1.84,
          0.3
        ]
      },
      {
        "title": "Utilisation locale",
        "kind": "vm",
        "description": "L’outil traite les documents sur l’appareil. Aucun PDF ne quitte l’appareil pour être traité.",
        "point": [
          1.29,
          1.84,
          0.65
        ]
      }
    ]
  },
  {
    "id": "powerbi",
    "title": "Power BI · PP & MOSO",
    "steps": [
      {
        "title": "Dépôt du PDF",
        "kind": "pdf",
        "description": "Le plan de prévention arrive dans le dossier de dépôt. C’est le document source du parcours.",
        "operation": "Le bloc élévateur sort de la trappe latérale, devant le convoyeur, et présente le document au premier bras.",
        "point": [
          -2.1,
          1.6,
          1.22
        ],
        "eye": [
          -5.8,
          4.8,
          6.5
        ]
      },
      {
        "title": "Extraction par VM",
        "kind": "vm",
        "description": "La machine virtuelle extrait automatiquement les champs utiles du plan de prévention.",
        "operation": "Le premier bras saisit le document, ouvre ses patins au-dessus du carton et le laisse descendre à l’intérieur.",
        "point": [
          -4.2,
          1.6,
          -0.5
        ],
        "eye": [
          -2.3,
          3.5,
          2.8
        ]
      },
      {
        "title": "Rangement SharePoint",
        "kind": "sharepoint",
        "description": "Le PDF est rangé automatiquement dans le bon dossier SharePoint. Son emplacement devient fiable.",
        "operation": "La barrière libère le carton chargé ; les rouleaux le conduisent vers le poste de préparation.",
        "point": [
          2.95,
          1.3,
          2.55
        ],
        "eye": [
          6.2,
          5,
          6.8
        ]
      },
      {
        "title": "Archivage automatique",
        "kind": "archive",
        "description": "Le plan de prévention est archivé automatiquement. Le document reste conservé et accessible.",
        "operation": "Les patins parallèles serrent les faces extérieures du carton ; le second bras le pose sur la table.",
        "point": [
          2.85,
          1.6,
          0
        ],
        "eye": [
          7.5,
          3.8,
          -4.7
        ]
      },
      {
        "title": "Alimentation Excel",
        "kind": "excel",
        "description": "Les champs extraits alimentent le suivi Excel. Les données utiles remplacent la ressaisie du document.",
        "operation": "Sur la table, les petits rabats se replient avant les grands ; la structure du colis est stabilisée.",
        "point": [
          2.95,
          1.6,
          2.55
        ],
        "eye": [
          5.3,
          4.2,
          5.4
        ]
      },
      {
        "title": "Préparation Power Query",
        "kind": "query",
        "description": "Power Query prépare les données du suivi pour le portail. Cette vue détaille la préparation déjà incluse dans le projet.",
        "operation": "Le second bras reprend le carton fermé par ses côtés, dégage le couvercle et le remet sur le convoyeur.",
        "point": [
          3.1,
          1.3,
          1.5
        ],
        "eye": [
          6.4,
          4.3,
          -4.6
        ]
      },
      {
        "title": "Modèle Power BI",
        "kind": "powerbi",
        "description": "Power BI et les mesures DAX rendent les plans, leurs échéances et les marchés MOSO exploitables.",
        "operation": "Le carton consolidé attend le contrôle final, face à la seconde barrière.",
        "point": [
          3.72,
          1.3,
          0
        ],
        "eye": [
          7,
          5.8,
          7.2
        ]
      },
      {
        "title": "Portail HTML",
        "kind": "html",
        "description": "Les pages HTML présentent les informations du portail PP + MOSO. La chaîne devient une interface consultable.",
        "operation": "Le second capteur représente le contrôle de l’information avant sa mise à disposition.",
        "point": [
          3.35,
          1.7,
          -0.65
        ],
        "eye": [
          5.8,
          3.7,
          -4.2
        ]
      },
      {
        "title": "Consultation des équipes",
        "kind": "check",
        "description": "Le plan, son PDF et son échéance se retrouvent en quelques secondes. Les informations arrivent jusqu’aux agents.",
        "operation": "La seconde barrière pivote et libère le carton en sortie ; le cycle suivant commence.",
        "point": [
          4.2,
          1.65,
          0.75
        ],
        "eye": [
          2.2,
          3.7,
          -2.5
        ]
      }
    ],
    "size": 12,
    "target": [
      0,
      1.1,
      0
    ]
  },
  {
    "id": "moteur44",
    "title": "Moteur V4.4",
    "steps": [
      {
        "title": "Rapports SharePoint",
        "kind": "sharepoint",
        "description": "Les rapports sont pris en charge depuis SharePoint. C’est la source du suivi.",
        "operation": "La trémie ouverte reçoit les symboles des rapports ; le convoyeur part de ce point d’entrée.",
        "point": [
          1,
          1.9,
          0.4
        ],
        "eye": [
          9.5,
          6.5,
          12
        ]
      },
      {
        "title": "Prise en charge",
        "kind": "pdf",
        "description": "Le rapport entre dans le parcours du Moteur V4.4. Les vues suivantes détaillent son rapprochement avec le suivi.",
        "operation": "Les tasseaux du tapis entraînent les rapports vers le sommet de la passerelle.",
        "point": [
          3.6,
          2.8,
          1.1
        ],
        "eye": [
          9,
          7,
          8
        ]
      },
      {
        "title": "Moteur V4.4",
        "kind": "script",
        "description": "Le moteur rapproche les données du rapport de la bonne ligne Excel. La transformation reste liée à ce document.",
        "operation": "Le convoyeur déverse au centre de la structure. Les coffrets et leurs commandes représentent le moteur de traitement.",
        "point": [
          -1.3,
          3.1,
          0.1
        ],
        "eye": [
          2,
          5.9,
          6.9
        ]
      },
      {
        "title": "La bonne ligne",
        "kind": "inject",
        "description": "L’information doit rejoindre la ligne correspondante du classeur. Le report remplace le copier-coller manuel depuis SharePoint.",
        "operation": "La lame Schiebehammer effectue un mouvement latéral, comme dans la référence, pour répartir et niveler.",
        "point": [
          0,
          1.35,
          1.5
        ],
        "eye": [
          5,
          3.5,
          8
        ]
      },
      {
        "title": "Report dans Excel",
        "kind": "excel",
        "description": "Les données du rapport sont reportées dans le suivi Excel. Elles restent organisées au bon emplacement.",
        "operation": "La largeur de la lame et ses supports maintiennent une surface régulière ; les lignes du suivi apparaissent en sortie.",
        "point": [
          -1.4,
          1.55,
          1.3
        ],
        "eye": [
          -5.8,
          3.8,
          7
        ]
      },
      {
        "title": "Q18 visibles",
        "kind": "q18",
        "description": "Une colonne Excel rend les Q18 visibles. Cette information devient consultable dans le suivi. Le classeur nourrit Power BI et cette visibilité répond aux COSI ainsi qu’aux clients de l’ABE SUD IdF.",
        "operation": "La face arrière et ses vérins sont mis en détail. La colonne Q18 se distingue sur la surface du suivi.",
        "point": [
          -0.5,
          1.5,
          -1.5
        ],
        "eye": [
          -4.5,
          3.7,
          -7.3
        ]
      },
      {
        "title": "Suivi consolidé",
        "kind": "excel",
        "description": "Le classeur regroupe les données du rapport et les Q18. Ce suivi nourrit le rapport Power BI.",
        "operation": "La vue recule : alimentation, répartition et surface structurée forment un même parcours.",
        "point": [
          0.6,
          1.6,
          -0.4
        ],
        "eye": [
          10,
          8.5,
          -14
        ]
      },
      {
        "title": "Visibilité Power BI",
        "kind": "powerbi",
        "description": "Power BI exploite le classeur Excel et apporte une nouvelle visibilité aux équipes.",
        "operation": "La sortie structurée passe au premier plan. Les indicateurs représentent la lecture du suivi dans Power BI.",
        "point": [
          -0.2,
          0.8,
          -3
        ],
        "eye": [
          5.5,
          5.8,
          -9
        ]
      },
      {
        "title": "COSI et équipes",
        "kind": "check",
        "description": "Cette visibilité répond aux besoins des COSI, Correspondants en Sécurité incendie, et des clients de l’ABE SUD IdF.",
        "operation": "La vue d’ensemble relie la source aux informations rendues visibles. Le cycle peut recommencer.",
        "point": [
          1,
          1.9,
          0
        ],
        "eye": [
          9.5,
          6.5,
          12
        ]
      }
    ],
    "size": 12,
    "target": [
      1,
      1.8,
      0
    ]
  },
  {
    "id": "pa",
    "title": "Power Automate · chaîne des PP",
    "subtitle": "Dépôt, classement, alerte, relance",
    "color": "#328b81",
    "reference": "https://sketchfab.com/3d-models/vaporizer-94fcf1d31ce84aa4806863e87677a96c",
    "model": "Vaporizer · reconstruction visuelle originale",
    "size": 4.8,
    "target": [
      0,
      1.65,
      0
    ],
    "steps": [
      {
        "title": "Dépôt SharePoint",
        "kind": "sharepoint",
        "description": "Le plan de prévention arrive dans la bibliothèque. Le bac d’entrée représente ce dépôt.",
        "point": [
          -1.08,
          0.4,
          0.38
        ]
      },
      {
        "title": "Prise en charge",
        "kind": "automate",
        "description": "Power Automate déclenche le flux : le plan quitte le bac, la première vanne tourne et le circuit rouge se met à circuler.",
        "point": [
          -0.95,
          1.05,
          0.44
        ]
      },
      {
        "title": "Lecture des champs",
        "kind": "extract",
        "description": "Les champs utiles du plan sont lus : le circuit jaune alimente le corps central, l’anneau de lecture le parcourt et la soupape lâche sa vapeur, sans intervention manuelle.",
        "point": [
          0,
          1.5,
          -0.33
        ]
      },
      {
        "title": "Contrôle et échéance",
        "kind": "check",
        "description": "Les données et l’échéance sont vérifiées. Les manomètres représentent ces contrôles, avec des valeurs illustratives.",
        "point": [
          -0.48,
          1.42,
          0.61
        ]
      },
      {
        "title": "Listing Excel",
        "kind": "excel",
        "description": "Les données contrôlées alimentent le listing Excel : la vanne verte tourne et le circuit vert, le suivi structuré, se met à circuler.",
        "point": [
          0.35,
          0.66,
          0.6
        ]
      },
      {
        "title": "Classement SharePoint",
        "kind": "inject",
        "description": "Le plan est rangé dans la bibliothèque et son lien reste associé au suivi : les deux régulateurs de la branche rouge tournent et son flux s’accélère.",
        "point": [
          1.4,
          1.97,
          -0.43
        ]
      },
      {
        "title": "Archivage",
        "kind": "export",
        "description": "Le document traité sort du circuit et rejoint son rangement final : le bac de sortie représente le plan classé.",
        "point": [
          1,
          0.4,
          0.38
        ]
      },
      {
        "title": "Surveillance des échéances",
        "kind": "check",
        "description": "Les échéances sont surveillées pour repérer les plans nécessitant une alerte : l’aiguille du cadran de contrôle balaie les échéances.",
        "point": [
          0.96,
          1.42,
          0.61
        ]
      },
      {
        "title": "Alertes et relances",
        "kind": "outlook",
        "description": "Les échéances déclenchent les alertes et relances : la dernière vanne tourne, l’évent souffle et les mails de relance s’envolent, sans bloquer le processus métier.",
        "point": [
          0.68,
          1.05,
          0.44
        ]
      }
    ]
  }
];
