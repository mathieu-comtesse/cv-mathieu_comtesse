// Projets de l'accueil : projets pro (image, gain chiffré, fiche synthétique tirée de data.js) et projets perso (aperçus pixélisés).
import { CV, PERSO, PRO } from './data.js?v=cv-scene-v18';

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
      "Chaque montant est comparé au seuil de sa catégorie.",
      "check"
    ],
    [
      "Alerte",
      "Le dépassement est orienté vers une alerte à traiter.",
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
      "Sources",
      "PDF, Excel et SharePoint alimentent le modèle.",
      "excel"
    ],
    [
      "Power Query",
      "Les données sont préparées et contrôlées.",
      "extract"
    ],
    [
      "Modèle",
      "Les tables et relations organisent le suivi.",
      "powerbi"
    ],
    [
      "DAX",
      "Les mesures calculent les indicateurs.",
      "script"
    ],
    [
      "HTML",
      "Les pages sont générées dans les mesures.",
      "html"
    ],
    [
      "Portail",
      "Plans, PDF et échéances deviennent consultables.",
      "powerbi"
    ],
    [
      "Recherche",
      "Le document utile est retrouvé en environ dix secondes.",
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
  "charte": [
    [
      "Charte",
      "Les règles visuelles communes sont définies.",
      "design"
    ],
    [
      "Composants",
      "Boutons, tableaux et indicateurs partagent les mêmes conventions.",
      "html"
    ],
    [
      "Outils",
      "CERFA, VRE, Studio et PP adoptent la même interface.",
      "script"
    ],
    [
      "Usage",
      "Les écrans facilitent lecture, contrôle et export.",
      "export"
    ],
    [
      "Local",
      "Aucune donnée n’est envoyée hors du poste.",
      "vm"
    ]
  ]
};

// Chaque carte : un gain de TEMPS et un gain d'ARGENT (taux horaire de 104,74 € utilisé dans le CV), par process et par projet. 'ctx' = ce que le chiffre mesure.
const G = (id, title, sub, time, timeCtx, money, moneyCtx, img, pro) => ({ id, title, sub, time, timeCtx, money, moneyCtx, img, pro: byId[pro] || null, diag: DIAG[id] || [] });

export const PRO_CARDS = [
  G('finance', 'Point financier · Power Automate', 'CS, Locatif, MEC et PPTM', '4 flux', 'pour filtrer les lignes et détecter les dépassements', 'Seuils Excel', 'paramétrage centralisé dans le classeur financier', 'assets/dioramas/finance.png?v=cv-scene-v18', 'projet-financier'),
  G('vmvre', 'VRE / VLE · traitement par VM', 'Rapports, OT, liens Excel et récapitulatif', '2 min', 'entre deux relevés des demandes par la VM Windows', '17 h', 'récapitulatif des intégrations confirmées, sans doublon', 'assets/dioramas/vmvre.png?v=cv-scene-v18', 'projet-vm-vre'),
  G('pa', 'Power Automate · chaîne des PP', 'Dépôt, classement, alerte, relance', '40 min', 'de contrôles et de saisie rendues chaque jour', '15 700 €', 'par an, soit ≈ 17 € et 10 min par plan de prévention', 'assets/projets/pp.jpg?v=bf01a16', 'projet-3'),
  G('cerfa', 'CERFA v3', 'Fiches et attestations devenues données du parc', '20 h → minutes', 'pour un lot de 300 fiches (≈ 5 min par fiche à la main)', '50 000 €', 'de pénalités de retard identifiées et applicables', 'assets/projets/cerfa.jpg?v=bf01a16', 'projet-1'),
  G('vre', 'Extracteur VRE', 'Rapports de vérification électrique', '25 min', 'gagnées par rapport, sur 7 000 à 10 000 rapports par an', '44 €', 'par rapport traité, saisie directe dans le classeur de suivi', 'assets/projets/vre.jpg?v=bf01a16', 'projet-vre'),
  G('studio', 'Studio d’extracteurs PDF', 'Un extracteur sans coder', '5–10 jours → 4 h', 'pour disposer d’un extracteur opérationnel', '3 200–6 900 €', 'évités par famille de documents', 'assets/projets/studio.jpg?v=bf01a16', 'projet-studio'),
  G('powerbi', 'Power BI · PP & MOSO', 'Tableaux de bord et portail', '3–5 min → 10 s', 'pour retrouver un plan, son PDF et son échéance : ≈ 2 h par semaine', '9 400 €', 'par an réaffectés au suivi des échéances (≈ 9 € de saisie évitée par plan)', 'assets/projets/powerbi.jpg?v=bf01a16', 'projet-4'),
  G('suivi', 'Retrouver tout le suivi', 'OT, équipement, bâtiment', '10–15 min', 'gagnées par recherche (≈ 1 h quand elle passe par d’autres outils)', '118–589 k€', 'par an, estimation à confirmer (14 utilisateurs, ≈ 26 € la recherche)', 'assets/projets/suivi.jpg?v=bf01a16', 'projet-2'),
  G('gares', 'Gares prioritaires', 'Vigilance et criticité des gares', '10–15 min', 'gagnées par équipement consulté, probablement davantage', '7 900–11 800 €', 'par an (≈ 1 000 équipements, 2 consultations par jour)', 'assets/projets/gares.jpg?v=bf01a16', 'projet-gares'),
  G('terrain', 'Dialogue terrain', 'Processus EPM / EPTx', '16', 'arbitrages obtenus en réunion d’agence', 'EPM light', 'processus simplifié proposé à l’arbitrage', 'assets/projets/terrain.jpg?v=bf01a16', 'projet-5'),
  G('charte', 'Interface commune', 'Une UI/UX pour tous les outils', '1 charte', 'commune à tous les outils construits', '0 donnée', 'envoyée hors du poste : traitement 100 % local', 'assets/projets/charte.jpg?v=bf01a16', 'projet-charte'),
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
