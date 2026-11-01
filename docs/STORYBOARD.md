# Storyboard de la vue spatiale V2

Références : la vidéo Shopify Editions Fall 2026 fournie, et la page https://www.shopify.com/editions/fall2026. La page n'a pu être lue que sous forme de texte (structure en onze sections numérotées, sommaire, ancres). Les mouvements et les transitions ont donc été relevés sur la vidéo, image par image. Rien n'est supposé des mécanismes internes de Shopify.

## 1. Ce que la vidéo montre (principes observables)

| Moment | Observation | Principe retenu pour comtesse.me |
|---|---|---|
| Ouverture | Un mot géant en volume au premier plan, le plan s'enfonce derrière lui, un nuage de points relié flotte au loin | Titres géants au premier plan, lettres en contour de plan, nuage de points relié comme repère lointain |
| Perspective | Caméra très inclinée vers le sol, plan immense qui fuit vers l'horizon, bande étroite en haut | Caméra aérienne à forte inclinaison dans les séquences d'ouverture et de traversée, plan sans bord |
| Parallaxe | Rangées de tours filaires de chaque côté, de tailles très différentes, qui défilent à vitesses apparentes différentes | Tours filaires proches (26 à 42 u) et lointaines (84 à 174 u), générées le long de la trajectoire |
| Échelle | Les objets passent du minuscule (points au loin) au géant (titre au premier plan) | Silhouettes filaires lointaines, machines à l'échelle réelle à l'approche, titres de 90 à 150 u |
| Transitions | Une section en rejoint une autre, un repère de destination est visible loin devant avant d'être atteint | Constellation de domaine visible à plus de 500 u avec son étiquette |
| Dalles | Les contenus sont posés sur des dalles épaisses, ombrées, surélevées | Dalles d'exposition quadrillées avec tranche et pieds |
| Annotations | Textes reliés par des traits fins, cotes en mètres, index à gauche | Annotations reliées, cotes et coordonnées du plan, index et rail |
| Rythme | Séquences de durées différentes, certaines survolées | Distances de défilement différentes par séquence, certaines machines simplement survolées |
| Couleur | Bandes de couleur vive par section | Non reprise. Le blueprint reste bleu, très faiblement teinté par domaine |

## 2. Diagnostic de la V1 et réponse

| Défaut | Réponse V2 |
|---|---|
| Composition linéaire, écarts constants | Monde de 1 400 u de profondeur, écarts de 30 à 110 u, décalages latéraux de plus de 140 u, hauteurs de 0 à 28 u |
| Cadrages homogènes | Chaque séquence a ses distances (14 à 60 u), ses hauteurs et ses azimuts. Orbites partielles pour les moments majeurs |
| Champ de vision fixe de 30° | 42° à 58° en voyage, 34° à 36° en inspection, transition continue (Hermite) |
| Pas de premier plan | Poutres à 8 à 14 u de la trajectoire, portiques et anneaux traversés, tours proches |
| Révélation par extrusion | Supprimée. Le modèle réel apparaît à l'approche de la caméra à son échelle, sa silhouette filaire le précède |
| Rythme monotone | Durées de séquence de 400 à 1 000 px, vitesse apparente de 0,03 à 0,3 u par pixel |

## 3. Séquences

La caméra est une fonction de la distance de défilement `u` (pixels). Parcours complet : 23 225 px. Les durées ci-dessous sont celles de `spatial/sequences.js` (déjà réduites de moitié dans le code).

### A. Ouverture et première immersion (u de 0 à 1 650)
- Sujet : accueil, stèle, première vue de l'immensité.
- Composition : vue aérienne depuis (44, 132, 78) vers (-8, 0, -230), champ 58°. Silhouettes filaires des premières machines et constellation au loin.
- Mouvement : grue vers le bas et dolly avant, roulis léger, arrivée à (6, 17, 26) avec la stèle au premier plan.
- Au loin : constellation Maintenance, dalles et volumes filaires.
- Texte : accroche, poste, accès directs. Disparaît après 380 px.
- Retour arrière : la caméra remonte exactement sur le même chemin, le texte réapparaît.

### B. Traversée spatiale entre plusieurs machines (u de 1 650 à 5 500)
- Sujet : VM, Reporteur Q18, premiers titres de domaine.
- Composition : truck latéral qui contourne la stèle, grue qui révèle VM sur la gauche et plus bas, survol sans arrêt, truck à droite vers Q18.
- Éléments traversés : portiques à u 1 850 et 4 200, poutres de premier plan.
- Éléments lointains : dalle de VRE, silhouette de VRE, mur de plan.
- Texte : titre MAINTENANCE couché sur le plan, annotations de VM puis de Q18 à bonne distance.
- Retour arrière : les mêmes volumes repassent dans l'ordre inverse.

### C. Approche, inspection, rotation et départ (VRE, u de 5 500 à 7 900)
- Sujet : Extracteur VRE, moment majeur.
- Composition : pull-back par la droite, virage, dolly avant lent vers la dalle surélevée, pose d'inspection, orbite partielle de 75 degrés, départ par l'arrière en prenant de la hauteur.
- Inspection : la pose d'inspection se superpose à la trajectoire (mélange continu). Les deux règles orientent la machine. Fermer l'inspection ou tourner la molette ramène la caméra sur la trajectoire au même `u`, sans saut.
- Texte : niveau 1 (titre, indicateur), niveau 2 (carte), niveau 3 (panneau de lecture).
- Retour arrière : exact.

### D à I. Extension
D. Qualité, sécurité, environnement : grue vers PA à droite sur dalle inclinée, orbite, truck gauche vers Power BI suspendu à 28 u, contournement par la droite, portique vers CERFA.
E. Pilotage : pull-back très ample, Gares puis survol de Suivi suspendu.
F. Automatisation : traversée de structures filaires, grue au-dessus de Finance vers Studio.
G. Données et IA : plongée haute de 950 px vers un objet isolé dans un grand vide, six anneaux traversés.
H. Explorations : THALEOLITHIC sur un grand mur, puis orbite verticale de 12 plaques.
I. Parcours : élévation, arrivée, pull-back vers l'horizon.

## 4. Caméra et défilement
- Interpolation de Hermite à tangentes de Catmull-Rom non uniformes, continue en position, regard, champ et roulis. Vérifiée par test (continuité de la vitesse).
- Molette : unités normalisées, cible immédiate, suivi exponentiel à 11 par seconde, vitesse bornée à 5 200 px/s, impulsion bornée à 320 px. Navigation directe : vol de 0,9 à 3,8 s à profil adouci.
- Mouvement réduit : cadrage direct, pas de trajectoire animée.

## 5. Limites de ce storyboard
Le voyage a été composé et réglé à la main dans le navigateur avec rendu logiciel. Les valeurs de caméra sont des points de départ calibrés sur captures, pas sur la sensation à 60 images par seconde.
