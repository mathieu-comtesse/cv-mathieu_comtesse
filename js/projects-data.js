// Projets de l'accueil : projets pro (image, gain chiffré, fiche synthétique tirée de data.js) et projets perso (aperçus pixélisés).
import { CV, PERSO, PRO } from './data.js?v=cv-projects-v7';

const byId = Object.fromEntries(PRO.map((p) => [p.id, p]));
const P = (id, title, sub, gain, unit, img, pro) => ({ id, title, sub, gain, unit, img, pro: byId[pro] || null });


// Comment ça marche : 4 ou 5 étapes par projet (affichées en schéma au survol). Faits tirés du CV.
const DIAG = {
  "finance": [
    [
      "Excel",
      "Lecture du suivi financier et des seuils configurés dans le classeur.",
      "excel"
    ],
    [
      "Déclenchement",
      "Les quatre flux CS, Locatif, MEC et PPTM lancent le traitement.",
      "automate"
    ],
    [
      "Lecture structurée",
      "Les données Excel deviennent une table exploitable par les règles.",
      "excel-script"
    ],
    [
      "Filtrage",
      "PRG, PSE et GLOBAL sont appliqués ; les lignes KO sont exclues.",
      "extract"
    ],
    [
      "Comparaison",
      "La consommation du compte est comparée au seuil modulable lu dans Excel, actuellement 80 % du montant disponible.",
      "check"
    ],
    [
      "Alerte",
      "Une alerte préventive signale le seuil atteint ; une alerte de dépassement signale des dépenses supérieures aux fonds du compte (TND négatif).",
      "outlook"
    ],
    [
      "Suivi",
      "Le résultat reste identifiable pour éviter une notification en double.",
      "excel"
    ]
  ],
  "vmvre": [
    [
      "SharePoint",
      "Dépôt du rapport PDF.",
      "sharepoint"
    ],
    [
      "Power Automate",
      "Une demande de traitement est créée.",
      "automate"
    ],
    [
      "File d’attente",
      "Les demandes attendent leur relevé par la VM.",
      "queue"
    ],
    [
      "VM Windows",
      "La VM relève les demandes toutes les deux minutes.",
      "vm"
    ],
    [
      "Extraction",
      "Le code final R004 et le numéro OT à sept chiffres sont contrôlés.",
      "extract"
    ],
    [
      "Excel",
      "Le classeur de suivi et l’OT sont retrouvés.",
      "excel"
    ],
    [
      "Injection",
      "Le lien du rapport est écrit, puis le classeur est enregistré et vérifié.",
      "inject"
    ],
    [
      "Historique",
      "Le résultat confirmé est enregistré pour éviter les doublons.",
      "export"
    ],
    [
      "Outlook",
      "À 17 h, seules les nouvelles intégrations confirmées sont regroupées dans le récapitulatif.",
      "outlook"
    ]
  ],
  "pa": [
    [
      "Dépôt",
      "Le plan de prévention arrive dans la bibliothèque.",
      "sharepoint"
    ],
    [
      "Flux",
      "Power Automate prend en charge le document.",
      "automate"
    ],
    [
      "Extraction",
      "Les champs du plan sont lus.",
      "extract"
    ],
    [
      "Contrôle",
      "Les données et l’échéance sont vérifiées.",
      "check"
    ],
    [
      "Listing Excel",
      "Les données alimentent le suivi.",
      "excel"
    ],
    [
      "Classement",
      "Le plan est rangé et son lien reste associé au suivi.",
      "inject"
    ],
    [
      "Relance",
      "Les échéances déclenchent les alertes et relances.",
      "outlook"
    ]
  ],
  "cerfa": [
    [
      "Lot PDF",
      "Les fiches CERFA et attestations sont déposées.",
      "pdf"
    ],
    [
      "Lecture",
      "Les pages 1 et 2 sont rendues et les cases sont lues.",
      "extract"
    ],
    [
      "Contrôles",
      "Doublons, non-conformités et retards sont repérés.",
      "check"
    ],
    [
      "HTML",
      "Une interface permet de consulter le lot.",
      "html"
    ],
    [
      "Indicateurs",
      "Les KPI et filtres permettent de retrouver les anomalies.",
      "chart"
    ],
    [
      "Excel",
      "Le tableau filtré est préparé avec ses surlignages.",
      "excel"
    ],
    [
      "Export",
      "Le lot sélectionné est exporté pour exploitation.",
      "export"
    ]
  ],
  "vre": [
    [
      "Rapport PDF",
      "Réception du rapport de vérification électrique.",
      "pdf"
    ],
    [
      "Extraction",
      "Les équipements, départs et écarts sont repérés.",
      "extract"
    ],
    [
      "Comptage",
      "Les totaux sont calculés.",
      "script"
    ],
    [
      "Vérification",
      "Chaque total reste sous contrôle.",
      "check"
    ],
    [
      "Excel",
      "Les résultats rejoignent la structure du suivi.",
      "excel"
    ],
    [
      "Injection",
      "Le classeur de suivi SharePoint reçoit les données.",
      "inject"
    ]
  ],
  "studio": [
    [
      "Modèle PDF",
      "Un exemple du document sert de modèle.",
      "pdf"
    ],
    [
      "Zones",
      "Les zones à lire sont tracées.",
      "extract"
    ],
    [
      "Règles",
      "La configuration décrit les champs à extraire.",
      "script"
    ],
    [
      "Test",
      "Les règles sont essayées sur des documents réels.",
      "check"
    ],
    [
      "HTML",
      "Une page autonome porte l’extracteur.",
      "html"
    ],
    [
      "Export",
      "Le fichier ou l’exécutable est produit.",
      "export"
    ],
    [
      "Utilisation",
      "Le traitement reste intégralement local.",
      "vm"
    ]
  ],
  "powerbi": [
  [
    "Dépôt du PP",
    "Le PDF du plan de prévention arrive dans le dossier de dépôt.",
    "pdf"
  ],
  [
    "Extraction par VM",
    "La VM extrait automatiquement les champs du plan de prévention.",
    "vm"
  ],
  [
    "Rangement SharePoint",
    "Le plan de prévention est rangé automatiquement dans le bon dossier SharePoint.",
    "sharepoint"
  ],
  [
    "Archivage automatique",
    "L’archivage du plan de prévention est assuré automatiquement.",
    "sharepoint"
  ],
  [
    "Suivi des données",
    "Les champs extraits alimentent le suivi ; Power Query prépare les données du portail.",
    "excel"
  ],
  [
    "Portail PP + MOSO",
    "Power BI, DAX et les pages HTML présentent les plans, leurs échéances et les marchés MOSO.",
    "powerbi"
  ],
  [
    "Consultation",
    "Le plan, son PDF et son échéance se retrouvent en quelques secondes.",
    "check"
  ]
],
  "suivi": [
    [
      "GMAO",
      "Les ordres de travail constituent le point de départ.",
      "queue"
    ],
    [
      "Exports",
      "Les autres logiciels et sites fournissent leurs données.",
      "export"
    ],
    [
      "Extraction",
      "Les informations utiles sont isolées.",
      "extract"
    ],
    [
      "Rattachement",
      "Chaque ligne retrouve son équipement et son bâtiment.",
      "inject"
    ],
    [
      "Interface",
      "Le suivi est regroupé dans une interface unique.",
      "html"
    ],
    [
      "Recherche",
      "Les liens et informations deviennent accessibles en quelques secondes.",
      "check"
    ]
  ],
  "gares": [
    [
      "Sources",
      "GMAO, référentiel et SharePoint sont réunis.",
      "sharepoint"
    ],
    [
      "Préparation",
      "Les données sont rapprochées et contrôlées.",
      "extract"
    ],
    [
      "Power BI",
      "Le modèle comporte 19 tables et 159 mesures.",
      "powerbi"
    ],
    [
      "Calculs",
      "La criticité et la conformité sont calculées.",
      "script"
    ],
    [
      "Fiche gare",
      "Gare, équipement et maintenance deviennent consultables.",
      "chart"
    ],
    [
      "Priorités",
      "Les équipements à surveiller sont identifiés.",
      "check"
    ]
  ],
  "terrain": [
    [
      "Gemba",
      "Observer les activités sur le terrain.",
      "field"
    ],
    [
      "Faits",
      "Entretiens et preuves documentent la situation.",
      "extract"
    ],
    [
      "Processus",
      "Les processus EPM et EPTx sont représentés.",
      "queue"
    ],
    [
      "EPM light",
      "Le processus simplifié est proposé.",
      "chart"
    ],
    [
      "Arbitrage",
      "Les décisions sont prises en réunion d’agence.",
      "check"
    ]
  ],
  "moteur44": [
  [
    "SharePoint",
    "Le rapport est pris en charge depuis SharePoint.",
    "sharepoint"
  ],
  [
    "Moteur V4.4",
    "Le moteur rapproche les données du rapport de la bonne ligne du suivi Excel.",
    "script"
  ],
  [
    "Report dans Excel",
    "Le report dans la bonne ligne remplace le copier-coller manuel depuis SharePoint : 5 minutes économisées par rapport.",
    "excel"
  ],
  [
    "Q18 visibles",
    "Une colonne Excel rend les Q18 visibles. Ce classeur alimente Power BI : cette nouvelle visibilité répond aux besoins des COSI (Correspondants en Sécurité incendie) et des clients de l’ABE SUD IdF.",
    "q18"
  ],
  [
    "Suivi mis à jour",
    "Les données du rapport et les Q18 sont visibles dans le suivi Excel.",
    "excel"
  ]
]};

Object.assign(DIAG,{"cerfa":[["Lot de PDF","Les fiches CERFA et attestations arrivent en lot. La trémie représente cette entrée documentaire.","pdf"],["Fiches et attestations","Les catégories documentaires sont identifiées avant la lecture.","queue"],["Lecture des pages","Les pages 1 et 2 sont rendues pour être lues. Le tambour représente le traitement du lot.","extract"],["Lecture des cases","Les cases utiles sont repérées et leurs valeurs deviennent des données structurées.","script"],["Contrôles","Doublons, non-conformités et retards ressortent. Tous restent consultables.","check"],["Consultation HTML","L’interface permet de consulter les documents et leurs résultats.","html"],["KPI et filtres","Les indicateurs et filtres permettent de retrouver les anomalies du lot.","chart"],["Excel préparé","Le tableau filtré est préparé avec les surlignages utiles.","excel"],["Export sélectionné","Le lot choisi est exporté pour être exploité. Le cycle suivant reprend à l’entrée.","export"]],"vre":[["Rapport électrique","Le rapport PDF fournit les équipements, les départs et les écarts à examiner.","pdf"],["Bâtiment et local","Les résultats sont rattachés au bâtiment et au local concernés.","field"],["BT31 · disjoncteurs","Les disjoncteurs sont repérés dans le rapport et comptés par famille.","extract"],["BT33 · fusibles","Les fusibles sont identifiés et leurs totaux restent distincts.","script"],["BT21 · éclairage de sécurité","Les équipements d’éclairage de sécurité font également partie du comptage.","check"],["BT11 · candélabres","Les candélabres constituent une autre famille, sans être confondus avec les coffrets.","field"],["Totaux contrôlés","Les quantités sont vérifiées avant de rejoindre le suivi.","check"],["Structure Excel","Chaque total retrouve sa place dans le classeur de suivi.","excel"],["Suivi et PAM SSI","Les résultats alimentent le suivi, avec des repères bâtiment et local pour leur exploitation.","inject"]],"vmvre":[["Dépôt SharePoint","Le PDF est déposé dans SharePoint. Une unité représente un rapport et sa demande.","sharepoint"],["Demande de traitement","Power Automate crée la demande de traitement.","automate"],["File d’attente","Les demandes attendent leur prise en charge. Le portique se positionne sur l’unité.","queue"],["Relevé par la VM","La VM Windows relève les demandes toutes les deux minutes.","vm"],["Contrôle R004 et OT","Le code final R004 et le numéro OT à sept chiffres sont contrôlés.","extract"],["Recherche dans Excel","Le classeur de suivi et l’OT correspondant sont retrouvés.","excel"],["Inscription vérifiée","Le lien du rapport est écrit ; le classeur est enregistré puis vérifié.","inject"],["Historique confirmé","Seuls les résultats confirmés rejoignent l’historique pour éviter les doublons.","export"],["Récapitulatif de 17 h","Le récapitulatif rassemble les nouvelles intégrations confirmées. La reprise entre deux VM reste un chantier à concevoir.","outlook"]],"finance":[["Suivi Excel","Les fonds, dépenses et seuils configurés sont lus dans le classeur.","excel"],["Déclenchement","Les flux CS, Locatif, MEC et PPTM déclenchent le contrôle financier.","automate"],["Lecture structurée","Les données Excel deviennent une table exploitable par les règles.","excel-script"],["PRG · PSE · GLOBAL","Les périmètres sont appliqués et les lignes KO sont exclues.","extract"],["Seuil modulable","Le repère rouge de la jauge règle le seuil, ici calé à 80 % des fonds du compte. Le volant de la vanne attend qu’il soit atteint.","script"],["Consommation du compte","La jauge montre le ratio entre dépenses et fonds. Les valeurs de cette démonstration sont illustratives.","chart"],["Alerte préventive","Le seuil atteint, le volant fait tourner la vis : l’opercule monte à mi-course et le mail d’alerte préventive sort vers son panneau.","outlook"],["Dépassement des fonds","La vis ouvre complètement la vanne et un second mail signale des dépenses supérieures aux fonds disponibles : le TND devient négatif.","outlook"],["Historique des alertes","Les mails envoyés restent affichés dans l’historique pour éviter les doublons ; la vis referme la vanne. Elle ne signifie pas que les dépenses sont bloquées.","check"]],"suivi":[["Ordres de travail","Les OT de la GMAO constituent le point de départ.","queue"],["Exports des sources","Les autres logiciels et sites fournissent les informations utiles.","export"],["Informations utiles","Les éléments utiles sont isolés pour être retrouvés dans l’interface.","extract"],["Équipement","Chaque ligne est rattachée à son équipement.","inject"],["Bâtiment","Le bâtiment fournit un autre accès au même suivi.","field"],["Interface commune","Les différents accès se rassemblent dans un point d’entrée commun.","html"],["Recherche OT","Une recherche par OT retrouve le contexte et l’accès pertinent.","extract"],["Lien direct","Le bon écran s’active et conduit vers la source concernée.","check"],["Suivi retrouvé","Les outils restent distincts ; l’interface facilite leur navigation sans répliquer toutes leurs données.","chart"]],"gares":[["Sources du suivi","Les sources GMAO, référentiel et SharePoint sont réunies.","sharepoint"],["Préparation","Les données sont préparées et contrôlées.","extract"],["Rapprochement","Les données retrouvent les gares et équipements concernés.","inject"],["Modèle Power BI","Le modèle comporte 19 tables et 159 mesures.","powerbi"],["Criticité","Les mesures permettent de hiérarchiser les situations à surveiller.","script"],["Conformité source normale","La conformité et les équipements demandant de la vigilance deviennent visibles.","check"],["Gares prioritaires","Les priorités ressortent selon les mesures, sans dépendre de leur distance au centre du radar.","chart"],["Détail maintenance","La vue gare ouvre le détail des équipements et de leur maintenance préventive.","field"],["Suivi consolidé","L’ensemble devient consultable pour orienter les actions. Le radar symbolise la vigilance, sans surveillance en temps réel.","powerbi"]],"studio":[["Exemple PDF","Un exemple du document sert de modèle pour créer l’extracteur.","pdf"],["Page de référence","La page rendue sert de support à la configuration.","design"],["Tracé des zones","Les zones à lire sont tracées directement sur le document.","extract"],["Champs à extraire","Les champs sont définis sans écrire le code de l’extracteur.","script"],["Règles de lecture","Les règles précisent comment lire et structurer chaque champ.","script"],["Essai réel","La configuration est testée sur des documents réels avant la livraison.","check"],["Page autonome","Une page HTML autonome porte l’extracteur et sa configuration.","html"],["Export de l’outil","Le fichier ou l’exécutable est livré. Le casier de la famille choisie s’ouvre.","export"],["Utilisation locale","L’outil traite les documents sur l’appareil. Aucun PDF ne quitte l’appareil pour être traité.","vm"]]});

Object.assign(DIAG,{"powerbi":[["Dépôt du PDF","Le plan de prévention arrive dans le dossier de dépôt. C’est le document source du parcours.","pdf"],["Extraction par VM","La machine virtuelle extrait automatiquement les champs utiles du plan de prévention.","vm"],["Rangement SharePoint","Le PDF est rangé automatiquement dans le bon dossier SharePoint. Son emplacement devient fiable.","sharepoint"],["Archivage automatique","Le plan de prévention est archivé automatiquement. Le document reste conservé et accessible.","archive"],["Alimentation Excel","Les champs extraits alimentent le suivi Excel. Les données utiles remplacent la ressaisie du document.","excel"],["Préparation Power Query","Power Query prépare les données du suivi pour le portail. Cette vue détaille la préparation déjà incluse dans le projet.","query"],["Modèle Power BI","Power BI et les mesures DAX rendent les plans, leurs échéances et les marchés MOSO exploitables.","powerbi"],["Portail HTML","Les pages HTML présentent les informations du portail PP + MOSO. La chaîne devient une interface consultable.","html"],["Consultation des équipes","Le plan, son PDF et son échéance se retrouvent en quelques secondes. Les informations arrivent jusqu’aux agents.","check"]],"moteur44":[["Rapports SharePoint","Les rapports sont pris en charge depuis SharePoint. C’est la source du suivi.","sharepoint"],["Prise en charge","Le rapport entre dans le parcours du Moteur V4.4. Les vues suivantes détaillent son rapprochement avec le suivi.","pdf"],["Moteur V4.4","Le moteur rapproche les données du rapport de la bonne ligne Excel. La transformation reste liée à ce document.","script"],["La bonne ligne","L’information doit rejoindre la ligne correspondante du classeur. Le report remplace le copier-coller manuel depuis SharePoint.","inject"],["Report dans Excel","Les données du rapport sont reportées dans le suivi Excel. Elles restent organisées au bon emplacement.","excel"],["Q18 visibles","Une colonne Excel rend les Q18 visibles. Cette information devient consultable dans le suivi. Le classeur nourrit Power BI et cette visibilité répond aux COSI ainsi qu’aux clients de l’ABE SUD IdF.","q18"],["Suivi consolidé","Le classeur regroupe les données du rapport et les Q18. Ce suivi nourrit le rapport Power BI.","excel"],["Visibilité Power BI","Power BI exploite le classeur Excel et apporte une nouvelle visibilité aux équipes.","powerbi"],["COSI et équipes","Cette visibilité répond aux besoins des COSI, Correspondants en Sécurité incendie, et des clients de l’ABE SUD IdF.","check"]]});

// Chaque carte : un gain de TEMPS et un gain d'ARGENT (taux horaire de 104,74 € utilisé dans le CV), par process et par projet. 'ctx' = ce que le chiffre mesure.
DIAG.pa=[["Dépôt SharePoint","Le plan de prévention arrive dans la bibliothèque. Le bac d’entrée représente ce dépôt.","sharepoint"],["Prise en charge","Power Automate déclenche le flux : le plan quitte le bac, la première vanne tourne et le circuit rouge se met à circuler.","automate"],["Lecture des champs","Les champs utiles du plan sont lus : le circuit jaune alimente le corps central, l’anneau de lecture le parcourt et la soupape lâche sa vapeur, sans intervention manuelle.","extract"],["Contrôle et échéance","Les données et l’échéance sont vérifiées. Les manomètres représentent ces contrôles, avec des valeurs illustratives.","check"],["Listing Excel","Les données contrôlées alimentent le listing Excel : la vanne verte tourne et le circuit vert, le suivi structuré, se met à circuler.","excel"],["Classement SharePoint","Le plan est rangé dans la bibliothèque et son lien reste associé au suivi : les deux régulateurs de la branche rouge tournent et son flux s’accélère.","inject"],["Archivage","Le document traité sort du circuit et rejoint son rangement final : le bac de sortie représente le plan classé.","export"],["Surveillance des échéances","Les échéances sont surveillées pour repérer les plans nécessitant une alerte : l’aiguille du cadran de contrôle balaie les échéances.","check"],["Alertes et relances","Les échéances déclenchent les alertes et relances : la dernière vanne tourne, l’évent souffle et les mails de relance s’envolent, sans bloquer le processus métier.","outlook"]];
const G = (id, title, sub, time, timeCtx, money, moneyCtx, img, pro) => ({ id, title, sub, time, timeCtx, money, moneyCtx, img, pro: byId[pro] || null, diag: DIAG[id] || [] });

export const PRO_CARDS = [
  G('finance', 'Point financier · Power Automate', 'CS, Locatif, MEC et PPTM', '25 min / jour', '5 minutes de vérification par périmètre et par jour évitées, sur cinq périmètres de suivi', '≈ 9 800 € / an', '93,75 heures de contrôle libérées sur 225 jours ; valorisées à 104,74 €/h', 'assets/dioramas/finance.png?v=cv-scene-v18', 'projet-financier'),
  G('vmvre', 'VRE / VLE · traitement par VM', 'Rapports, OT, liens Excel et récapitulatif', '30 min / rapport', '2 000–2 500 h par an pour 4 000–5 000 rapports VRE/VLE : rapprochement de l’OT, inscription du lien et vérification dans Excel', '209 480–261 850 € / an', 'temps de traitement libéré, valorisé à 104,74 €/h ; soit 52,37 € par rapport', 'assets/dioramas/vmvre.png?v=cv-scene-v18', 'projet-vm-vre'),
  G("moteur44", "Moteur V4.4", "SharePoint → bonne ligne Excel · Q18 visibles", "15 min / rapport", "4 000–5 000 rapports/an : 1 000–1 250 h libérées sur le report SharePoint vers la bonne ligne Excel ; Q18 désormais visibles", "104 740–130 925 € / an", "15 min × 4 000–5 000 rapports à 104,74 €/h ; soit 26,19 € par rapport", "assets/dioramas/moteur44.png?v=cv-scene-v29", "projet-moteur44"),
  G('pa', 'Power Automate · chaîne des PP', 'Dépôt, classement, alerte, relance', '40 min', 'de contrôles et de saisie rendues chaque jour', '15 700 €', 'par an, soit ≈ 17 € et 10 min par plan de prévention', 'assets/projets/pp.jpg?v=bf01a16', 'projet-3'),
  G("cerfa", "CERFA v3", "Fiches et attestations devenues données du parc", "20–25 h → 1 min 20 s", "pour traiter un lot de 300 fiches CERFA et attestations", "Audit national", "sur les CERFA fluides frigorigènes ; pénalités applicables et non-conformités remontées", "assets/projets/cerfa.jpg?v=bf01a16", "projet-1"),
  G("vre", "Extracteur VRE", "Rapports de vérification électrique", "1 667–2 083 h / an", "25 min de comptage évitées par rapport × 4 000–5 000 rapports/an ; capacité théorique rendue disponible", "174 566,67–218 208,33 € / an", "25 min × 4 000–5 000 rapports à 104,74 €/h ; ≈ 43,64 € par rapport", "assets/projets/vre.jpg?v=bf01a16", "projet-vre"),
  G('studio', 'Studio d’extracteurs PDF', 'Un extracteur sans coder', '5–10 jours → 4 h', 'pour disposer d’un extracteur opérationnel', '3 200–6 900 €', 'évités par famille de documents', 'assets/projets/studio.jpg?v=bf01a16', 'projet-studio'),
  G("powerbi", "Power BI · PP & MOSO", "VM · extraction, rangement SharePoint et archivage auto", "100–167 h / an", "15–20 min × 400–500 PP/an : extraction VM, rangement SharePoint et archivage automatique", "10 474–17 456,67 € / an", "400–500 plans par an, valorisés à 104,74 €/h ; 26,19–34,91 € par PP", "assets/projets/powerbi.jpg?v=bf01a16", "projet-4"),
  G('suivi', 'Retrouver tout le suivi', 'OT, équipement, bâtiment', '10–15 min', 'gagnées par recherche (≈ 1 h quand elle passe par d’autres outils)', '118–589 k€', 'par an, estimation à confirmer (14 utilisateurs, ≈ 26 € la recherche)', 'assets/projets/suivi.jpg?v=bf01a16', 'projet-2'),
  G("gares", "Gares prioritaires", "Vigilance et criticité des gares", "750–1 687,5 h / an", "10–15 min × 20–30 consultations/jour × hypothèse de 225 jours/an", "78 555–176 748,75 € / an", "4 500–6 750 consultations/an à 104,74 €/h ; valorisation estimative du temps", "assets/projets/gares.jpg?v=bf01a16", "projet-gares"),
];


// Base de valorisation : coût horaire du CV, pas un encaissement financier.
export const HOURLY_RATE = 104.74;
const bases = {
 moteur44: '15/60 h × 4 000–5 000 rapports/an = 1 000–1 250 h/an ; × 104,74 €/h = 104 740–130 925 €/an. Report SharePoint vers la bonne ligne Excel et Q18 visibles. VM, report Moteur et extraction VRE portent sur les mêmes rapports : 70 min libérées par rapport au total (30 + 15 + 25).',
 vmvre: '0,5 h × 4 000–5 000 rapports/an × 104,74 €/h. Volume et durée fournis par Mathieu. VM, report Moteur et extraction VRE portent sur les mêmes rapports : 70 min libérées par rapport au total (30 + 15 + 25).',
 pa: '40 min/jour × environ 225 jours/an × 104,74 €/h ≈ 15 700 €/an. Temps de contrôle et saisie des plans de prévention.',
 vre: '25/60 h × 4 000–5 000 rapports/an = 1 666,67–2 083,33 h/an ; × 104,74 €/h = 174 566,67–218 208,33 €/an. Capacité théorique : le comptage manuel complet était auparavant trop long pour être réalisé. VM, report Moteur et extraction VRE portent sur les mêmes rapports : 70 min libérées par rapport au total (30 + 15 + 25).',
 studio: 'Environ 31–66 h de développement évitées par famille de PDF (journées de 7 h, contre 4 h avec le studio) × 104,74 €/h.',
 powerbi: '15–20/60 h × 400–500 PP/an = 100–166,67 h/an ; × 104,74 €/h = 10 474–17 456,67 €/an. Extraction VM, rangement SharePoint et archivage auto. Consultation distincte : 10 min × 40 consultations/jour = 6 h 40 et 698,27 €/jour. Ces deux gains portent sur des actions différentes.',
 suivi: 'Valorisation estimative du temps de recherche : 14 utilisateurs, environ 26 €/recherche. Fréquence réelle et montant annuel à confirmer.',
 gares: '10–15/60 h × 20–30 consultations/jour × 225 jours/an (hypothèse) = 750–1 687,5 h/an ; × 104,74 €/h = 78 555–176 748,75 €/an. Fourchette estimative, non multipliée à nouveau par le parc des équipements.',
 finance: 'Base déjà chiffrée dans le CV : 5 périmètres × 5 min/jour = 25 min/jour ; 225 jours/an, soit 93,75 h × 104,74 €/h = 9 819,38 €/an (≈ 9 800 €). Ce gain valorise le pointage manuel évité ; les quatre flux CS, Locatif, MEC et PPTM et la vue globale signalent les dépassements le matin même.'
};
for (const p of PRO_CARDS) { p.gainBasis=bases[p.id]||''; p.gainStatus=['suivi','vre','gares'].includes(p.id)?'estimated':p.id==='cerfa'?'result':p.time===null?'none':'time-value'; }
PRO_CARDS.find(p=>p.id==='powerbi').extraGains=[
 {time:'6 h 40 / jour',timeCtx:'10 minutes économisées par consultation × environ 40 consultations par jour',money:'698,27 € / jour',moneyCtx:'consultation des PP à 104,74 €/h ; aucun volume annuel de jours supposé'}
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

export const UNIV = { id: 'talas', title: 'Village Talas', sub: 'Jeu sérieux ISO 45001', img: 'assets/projets/talas.jpg?v=bf01a16', url: 'village-talas-scene.html', desc: 'Sept ateliers, un par chapitre de l’ISO 45001, et une dizaine de mini-jeux dans un village en 3D : on apprend la norme en agissant plutôt qu’en lisant.', diag: TECH.talas };

export const PERSO_CARDS = PERSO.map((p) => ({ id: p.id, title: p.n, sub: p.genre, desc: p.desc, img: p.img, url: p.url, pixel: true, diag: TECH[p.id] || [] }));
export { CV };
