// Données des deux interfaces : projets perso (console) et projets pro (poste Windows XP). Textes repris du CV (cv-mathieu_comtesse).
export const TALAS_URL = "village-talas-scene.html";
export const CV = "jeux/";
export const PERSO = [
 {
  "id": "atlas",
  "img": "assets/games/atlas.png?v=0801b99",
  "n": "Atlas du parcours",
  "genre": "Exploration",
  "color": "#3b7fd8",
  "url": "atlas.html",
  "desc": "Chaque étape du parcours (Sorbonne Paris Nord, SNCF Gares & Connexions, projets) devient un bâtiment modélisé dans Blender, sur une île flottante Three.js au-dessus des nuages et de l’océan, avec un lagon où naviguer et pêcher, et vingt et un easter eggs à trouver."
 },
 {
  "id": "labyrinthe",
  "img": "assets/games/labyrinthe.png?v=0801b99",
  "n": "Labyrinthe",
  "genre": "Exploration",
  "color": "#8a6d3b",
  "url": "labyrinthe-scene.html",
  "desc": "Explorer un labyrinthe révélé au fil des lignes de visée, choisir dans un menu d’options ou laisser l’exploration automatique."
 },
 {
  "id": "route",
  "img": "assets/games/route.png?v=0801b99",
  "n": "Route & vigilance",
  "genre": "Prévention",
  "color": "#c9402e",
  "url": "route-scene.html",
  "desc": "Conduire en 3D dans la circulation : voitures, camions, cycliste, piétons et animaux, pour comprendre ce que l’alcool change et comparer un même trajet à jeun et sous influence."
 },
 {
  "id": "arene",
  "img": "assets/games/arene.png?v=0801b99",
  "n": "Arène des arcanes",
  "genre": "Combat",
  "color": "#7a3fb0",
  "url": "arene-scene.html",
  "desc": "Un jeu de combat en arène en pixel art : six personnages, douze compétences, six ultimes et six arènes animées, contre l’IA, à deux ou en entraînement."
 },
 {
  "id": "abysses",
  "img": "assets/games/abysses.png?v=0801b99",
  "n": "Abysses & babioles",
  "genre": "Exploration 3D",
  "color": "#1c7f95",
  "url": "abysses-scene.html",
  "desc": "Un scaphandrier, 2 047 poissons et 25 000 brins d’herbier : dégager au pinceau huit objets archéologiques… et absurdes."
 },
 {
  "id": "timber",
  "img": "assets/games/timber.png?v=0801b99",
  "n": "Timber !",
  "genre": "Jeu 3D",
  "color": "#5a8a3c",
  "url": "timber-scene.html",
  "desc": "Une clairière en forêt : fendre des bûches, les empiler, projeter des copeaux et entendre le choc du bois."
 },
 {
  "id": "rubik",
  "img": "assets/games/rubik.png?v=0801b99",
  "n": "Rubik’s Cube",
  "genre": "Casse-tête",
  "color": "#d9a21b",
  "url": "rubik-scene.html",
  "desc": "Les mathématiques peuvent être amusantes : manipuler le cube, observer ses permutations et découvrir la théorie des graphes."
 },
 {
  "id": "sandboard",
  "img": "assets/games/sandboard.png?v=0801b99",
  "n": "Sandboard",
  "genre": "Sable 3D",
  "color": "#c9955a",
  "url": "sandboard-scene.html",
  "desc": "Une expérience Three.js tactile : relief 3D, projection de grains, ombre de palmier et son du dessin dans le sable."
 },
 {
  "id": "pixels",
  "img": "assets/games/pixels.png?v=0801b99",
  "n": "Pixels",
  "genre": "Canvas",
  "color": "#e0527a",
  "url": "pixels-scene.html",
  "desc": "La chaleur naît sous le curseur, diffuse de case en case et s’éteint lentement, en trois palettes."
 },
 {
  "id": "gouache",
  "img": "assets/games/gouache.png?v=0801b99",
  "n": "Fond d’écran Gouache",
  "genre": "Fond d’écran",
  "color": "#4aa58a",
  "url": "gouache-scene.html",
  "desc": "Un aquarium animé pour Windows : poissons, herbes, bulles, nourrissage et installation dans Lively Wallpaper."
 }
];
export const PRO = [
 {
  "id": "projet-studio",
  "title": "Studio d’extracteurs PDF",
  "sub": "Un extracteur sans coder",
  "lead": "Chaque famille de documents (CERFA, plans de prévention, rapports de contrôle) mérite son extracteur, mais personne ne peut en développer un à la main à chaque fois. Le Studio d’extracteurs PDF est l’application que j’ai conçue pour ça : une page unique, livrée aussi en exécutable autonome, qui tourne entièrement en local, aucun document ne quitte le poste.",
  "gain": "Un extracteur opérationnel en quelques heures, contre plusieurs jours de développement et de recette pour un lecteur codé à la main. Valorisé au taux horaire de 104,74 € : 5 à 10 jours de 7 h moins ≈ 4 h de Studio, soit ≈ 3 200 à 6 900 € de temps évité par famille de documents (l’estimation ci-dessous, 2 500 à 6 500 € HT, part…",
  "team": "Un besoin d’extraction nouveau ne dépend plus d’un développement : on ouvre le Studio, on trace, on teste, on distribue.",
  "url": "projet-studio.html"
 },
 {
  "id": "projet-charte",
  "title": "Interface commune",
  "sub": "Une UI/UX pour tous les outils",
  "lead": "Studio, extracteurs générés, injecteur, outils de plans de prévention : tous les outils livrés dernièrement partagent la même interface, rapports Power BI et mails automatiques compris. Fond papier, encre noire, filets et ombres franches, titres à empattements, commandes et étiquettes en police monospace, accent bleu clair pour les zones actives. Une personne qui a utilisé un outil sait déjà se servir du suivant.",
  "gain": "",
  "team": "",
  "url": "projet-charte.html"
 },
 {
  "id": "projet-1",
  "title": "CERFA v3",
  "sub": "Fiches et attestations → données du parc",
  "lead": "Les fiches d’intervention sur les équipements contenant des fluides frigorigènes (formulaire CERFA) arrivent par centaines, en PDF. La première version de l’extracteur lisait une fiche à la fois ; la v2 lit, extrait et analyse un large panel de fiches en lot, sur une masse de documents que personne ne pouvait dépouiller page par page. La v3, dernière version, traite aussi plusieurs autres types d’attestations dans le même lot : chaque document est reconnu, lu et contrôlé avec ses propres règles.",
  "gain": "Environ 5 minutes de dépouillement par fiche à la main ; un lot de 300 fiches lu en quelques minutes au lieu d’une vingtaine d’heures. Gain financier : environ 50 000 € de pénalités de retard (50 € par document déposé en retard, fiches CERFA et attestations) identifiées et applicables sans recomptage.",
  "team": "Ne plus dépouiller : superviser un lot entier, concentrer l’analyse sur les doublons, non-conformités et retards, et repartir avec un Excel déjà filtré et surligné.",
  "url": "projet-1.html"
 },
 {
  "id": "projet-vre",
  "title": "Extracteur VRE",
  "sub": "Rapports de vérification électrique",
  "lead": "Les rapports de vérification des installations électriques, produits par les organismes de contrôle, servent à tenir le plan annuel de maintenance (PAM SSI) : il faut compter, bâtiment par bâtiment et local par local, les disjoncteurs (BT31), les fusibles (BT33), les blocs autonomes d’éclairage de sécurité (BT21) et les candélabres (BT11).",
  "gain": "Environ 30 minutes de comptage par rapport ramenées à quelques minutes de vérification ; les lignes partent dans le classeur de suivi sans ressaisie. Valorisé au taux horaire de 104,74 € : ≈ 44 € par rapport (≈ 25 min gagnées, « quelques minutes » comptées pour 5). Volume : 7 000 à 10 000 rapports par an.",
  "team": "Mettre à jour le plan annuel de maintenance à partir des rapports de contrôle sans les relire ligne à ligne, et garder la main sur chaque total.",
  "url": "projet-vre.html"
 },
 {
  "id": "projet-2",
  "title": "Retrouver tout le suivi",
  "sub": "OT, équipement, bâtiment",
  "lead": "Pour un ordre de travail (OT), un équipement ou un bâtiment, une interface rassemble les accès aux informations et au suivi répartis entre plusieurs outils internes SNCF. Les liens directs, extraits depuis la console du navigateur, permettent de rediriger automatiquement vers les pages concernées.",
  "gain": "",
  "team": "Accéder au bon dossier depuis une seule interface, sans rechercher manuellement dans chaque outil.",
  "url": "projet-2.html"
 },
 {
  "id": "projet-3",
  "title": "PP & MOSO",
  "sub": "Du dépôt à la consultation",
  "lead": "Des indicateurs cliquables et interactifs permettent d’explorer les résultats. L’export Excel reprend les données filtrées avec les informations importantes en surbrillance.",
  "gain": "Chaque plan, son PDF et son échéance retrouvés en quelques secondes au lieu de fouiller plusieurs classeurs et dossiers partagés.",
  "team": "",
  "url": "projet-3.html"
 },
 {
  "id": "projet-4",
  "title": "Power BI",
  "sub": "Tableaux de bord et portail",
  "lead": "Concevoir des interfaces Power BI sur mesure en intégrant du HTML et du CSS dans les mesures DAX : tableaux de consultation, indicateurs et navigation adaptés aux besoins des équipes.",
  "gain": "Retrouver un plan, son PDF et son échéance prend une dizaine de secondes au lieu de 3 à 5 minutes de recherche dans les classeurs et les dossiers partagés : sur une trentaine de consultations par semaine, environ 2 heures rendues à l’équipe.",
  "team": "Consulter les PP valides ou archivés, les échéances et les données marché dans une interface lisible et personnalisée.",
  "url": "projet-4.html"
 },
 {
  "id": "projet-gares",
  "title": "Gares prioritaires",
  "sub": "Vigilance et criticité des gares",
  "lead": "Un nouveau rapport Power BI pour suivre les gares à surveiller : classement de criticité, conformité de la source normale, équipements sous vigilance, maintenance préventive et mises en conformité, dans une interface HTML/CSS générée par des mesures DAX.",
  "gain": "",
  "team": "Repérer en quelques secondes les gares à traiter en priorité, ouvrir la fiche d’un équipement et vérifier d’un coup d’œil sa maintenance préventive et ses mises en conformité.",
  "url": "projet-gares.html"
 },
 {
  "id": "projet-5",
  "title": "Dialogue terrain",
  "sub": "Processus EPM / EPTx",
  "lead": "J’ai mené des interviews et entretiens avec les acteurs métier et animé un groupe de travail pour comprendre où l’information se perd entre travaux et maintenance. Cette démarche MQSE a permis de formaliser un état des lieux, une proposition de processus simplifié et un document de travail pour maintenir à jour le plan annuel de maintenance des équipements de sécurité incendie (PAM SSI).",
  "gain": "",
  "team": "Un cadre partagé pour éviter les équipements oubliés après travaux, rendre les responsabilités lisibles et préparer un suivi durable.",
  "url": "projet-5.html"
 },
 {
  "id": "projet-universitaire",
  "title": "Projet universitaire · Village Talas",
  "sub": "Jeu sérieux ISO 45001",
  "lead": "Réalisé dans le cadre de la formation : le Village Talas transforme sept chapitres de l’ISO 45001 en ateliers et mini-jeux interactifs, afin de faire apprendre la norme par l’expérience plutôt que par une lecture linéaire.",
  "gain": "Sept ateliers, sept chapitres de la norme et une dizaine de mini-jeux réunis dans une expérience 3D jouable.",
  "team": "Un support de formation qui met en scène les exigences de l’ISO 45001 et rend leur appropriation plus concrète.",
  "url": "village-talas-scene.html",
  "play": true
 }
];
