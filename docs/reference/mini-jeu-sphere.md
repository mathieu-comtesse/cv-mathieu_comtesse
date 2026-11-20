# Mini-jeu de la sphère

Décision de l'auteur (20 novembre 2026) : annulation du retrait du mini-jeu décidé en PR 209 ; le mini-jeu est réintégré au parcours final de comtesse.me, dans la scène Expo.

## Ce que la référence documente, et ce qui ne l'est pas

Source : journal brut `shopify-fall26-effets-2026-11-13T15-17-39-071Z.json` (52 événements touchant l'interface du jeu).

| Observé | Valeur |
|---|---|
| Session d'interaction avec l'interface du jeu | de 267,4 s à 303,8 s, soit environ 36 s |
| Appuis de touche | de 274,4 s à 299,6 s, soit 25 s : `d` 28, `a` 22, `z` 14, `q` 2, `e` 1 |
| Molette pendant le jeu | aucune |
| Éléments | un bouton de départ (`button.game-start`, transformation `matrix3d`), une commande saisissable (`div.game-grab`, curseurs `grab` et `grabbing`) |
| Règles, mécanique, durée d'une partie, rendu, son | **non documentés** : ni dans le journal, ni dans les captures |

Reprises : les touches `a`, `d`, `z`, `q` (clavier français), la commande à saisir et glisser (zone de glisser tactile). Tout le reste est une mécanique **originale** de ce dépôt ; la durée visée (1 à 3 minutes) vient de la consigne de l'auteur, non d'une mesure de la référence (la session observée n'est qu'une partie, ou un essai, de 25 s de touches).

## Règles

- **Piste** : l'axe vertical de la page. Départ juste avant le premier chapitre, arrivée 420 px avant la fin de la page. Largeur de piste virtuelle de 1 200 unités, rambardes latérales qui renvoient la sphère.
- **Sphère** : rayon de 28 à 56 px selon ce qu'elle a collecté. Vitesse de 420 à 1 500 px/s réglée par l'accélérateur (départ à 0,45, soit environ 900 px/s). Gravité 2 600 px/s², saut de 980 px/s (sommet 184 px), tremplin de 1 400 px/s (sommet 377 px).
- **Objets** : 83 mots (les titres des cartes, aux rangées des vrais contenus), 15 étoiles (une par chapitre et 4 de thème), 66 nœuds (6 par chapitre, certains en hauteur : il faut sauter). Récupérés au contact ou par attraction ; chacun fait grossir la sphère et rapporte 10 (mot), 5 (nœud) ou 50 (étoile) points, avec un bonus de combo jusqu'à +40 %.
- **Dangers** (74 sur le parcours, générés par une graine, un à deux par chapitre court, jamais à moins de 700 px d'un point de passage ; une zone mixte obstacles et trou place toujours le trou du côté opposé au couloir) : trous partiels (480 px de passage libre), trous sur toute la largeur précédés d'un tremplin (franchissables aussi d'un saut jusqu'à 300 px), obstacles en rangées avec un couloir libre de 520 px (franchissables d'un saut), trous noirs (attraction dans un rayon de 300 px, capture à 62 px sauf si la sphère passe à plus de 150 px de haut).
- **Points de passage** : 26 (un au début de chaque chapitre, plus un environ tous les 4 000 px dans les longs chapitres, toujours à plus de 700 px de tout danger) : une chute dans le chapitre de 44 800 px ne renvoie jamais loin en arrière.
- **Chute** : une fois sous le niveau du sol dans un trou, la chute est engagée (le bord opposé ne rattrape pas la sphère). Relance au dernier point de passage, score moins 30, sphère réduite de 10 % de sa croissance.
- **Arrivée** : bonus de temps, écran de résultats (score, temps, mots, étoiles, nœuds, chutes, taille de la sphère, note S, A, B ou C, record local), rejouer ou revenir au site.

## Commandes

| Action | Clavier | Tactile |
|---|---|---|
| Diriger | flèches gauche et droite, A et D, Q (clavier français) | glisser la commande en bas à gauche |
| Vitesse | flèches haut et bas, W et S, Z (clavier français), molette | boutons Vite et Frein |
| Sauter | Espace | bouton Saut |
| Quitter | Échap | bouton Quitter |
| Son | bouton Son | idem |

## Intégration à la scène Expo

Le jeu n'a pas de scène à lui : il dessine dans le canevas d'annotations de l'Expo avec la projection du moteur (`N.p(vue, colonne, rangée, hauteur)`), par-dessus le même décor, les mêmes blocs de contenu, les mêmes étoiles et ramifications. La caméra de l'Expo suit la sphère en pilotant la position de lecture (asservissement sur la hauteur d'écran de la sphère, avance selon l'accélérateur, ressort sur les sauts et atterrissages, léger tremblement sur les chocs). L'entrée glisse la caméra de la position de lecture au départ en 1,8 s (la sphère tombe du ciel), puis compte à rebours de 2,4 s ; la sortie ramène la caméra à la position de lecture en 0,9 s et rend la main à l'Expo, qui est restée active.

Entrées : bouton « Jouer » en mode Expo, et invitation « Jouer : traverser le site en sphère » à la fin du dernier chapitre (qui bascule en Expo si besoin).

Animations : sauts avec étirement, rebonds, impulsions de tremplin (particules, secousse, bond de caméra), trou noir en entonnoir à huit anneaux sous le sol et spirales, objets attirés puis absorbés en 0,34 s, croissance lissée de la sphère, particules et traînée, lignes de vitesse au-delà de 70 % de la vitesse maximale, animations de chute, de trou noir (spirale de 0,9 s), de relance et d'arrivée, et son synthétisé (Web Audio, aucun fichier audio).

## Fichiers et tests

| Fichier | Rôle |
|---|---|
| `refonte/jeu-coeur.js` | noyau pur et déterministe : plan, état, pas de 1/120 s, pilote automatique |
| `refonte/jeu.js` | intégration : commandes, caméra, rendu, particules, son, interface, entrée et sortie |
| `refonte/comtesse-motion.css` | styles du bouton, de l'interface, du tactile et des résultats |
| `tools/test-jeu-coeur.mjs` | physique et partie complète, sans navigateur (0,3 s) |
| `tools/test-jeu.mjs` | navigateur : entrée, commandes, chute et relance, partie complète au clavier, résultats, sortie, tactile |

Mesures du noyau (`node tools/test-jeu-coeur.mjs`) : sommet du saut 180,6 px (analytique 184,7, écart d'intégration numérique) ; durée de vol 0,750 s (0,754) ; tremplin 371 px (377) ; deux parties pilotées identiques à chaque empreinte ; partie complète pilotée en 99,0 s de jeu, 74 objets sur 164, 2 chutes (à 9 378 et 60 969 px, jamais deux fois au même endroit), 1 choc, 3 tremplins, 18 sauts, score 1 766.

Mesure du navigateur (`node tools/test-jeu.mjs`, rendu logiciel, fenêtre de 960 × 600) : partie complète au clavier seul en 92,0 s de jeu, 36 mots, 11 étoiles, 20 nœuds, 1 chute suivie d'une relance, score 1 603, note B, vitesse moyenne maximale entre deux décisions de 1 021 px par seconde de jeu (limite physique 1 725), écran de résultats cohérent avec l'état, rejouer, sortie à la position de lecture, commandes tactiles. Durée de l'exécution : environ 25 minutes de temps réel. Le pas de temps maximal par image est réduit à 0,2 s pour ce test : la simulation est identique, elle va seulement plus lentement que le temps réel (la scène Expo ne tient que 0,8 image/s en rendu logiciel avec le jeu).

## Défauts trouvés par les tests et corrigés

- Une sphère déjà tombée dans un trou était « rattrapée » par le bord opposé : chute désormais engagée.
- Étoiles en l'air hors de portée de la sphère au rayon minimal : portée de collecte et hauteurs recalées.
- Parcours sans danger sur 15 300 px au départ : zones regénérées chapitre par chapitre.
- Combinaison injouable d'une rangée d'obstacles et d'un trou (le pilote retombait 29 fois dans le même trou) : trou du côté opposé au couloir, contrôle « jamais deux chutes au même endroit ».
- Chute dans un long chapitre renvoyant à 40 000 px en arrière : points de passage intermédiaires.
- Appel de la projection de l'Expo avec la vue en premier argument (la fonction transmise a la vue déjà liée) : valeurs non finies et caméra qui s'emballait.

## Limites

- **GPU réel** : la section « Validation sur GPU matériel » ci-dessous a été ajoutée par une autre session de travail sur cette branche (commit `b275c1f`), qui déclare avoir exécuté la suite sur un GPU ; ces résultats n'ont pas été reproduits sur le banc logiciel de la session qui a écrit le reste de ce document. Restent ouverts : autres GPU, son sur casque et haut-parleurs, tactile sur téléphone réel (`docs/reference/verifications-gpu-expo.md`). Sur le banc logiciel la sphère mesure environ 11 px de rayon au départ à 1 440 × 900.
- Le pilote automatique ne joue pas comme un humain : il évite les obstacles au lieu de les sauter, et récupère environ 45 % des objets.
- Les paramètres d'équilibrage (gravité, tailles, pénalités, répartition des dangers) sont des choix, non mesurés sur la référence.

## Validation sur GPU matériel (21 novembre 2026)

Même suite que sous rendu logiciel, exécutée sur un GPU réel (Chromium, ANGLE d3d11) : `GPU=1 VUE=1440x900 node tools/test-jeu.mjs`. Les variables `GPU` et `VUE` sont des options du test ; sans elles il reste sous rendu logiciel, à 960 × 600.

| Mesure | Résultat |
|---|---|
| Suite complète (entrée, commandes, molette, saut, chute, relance, partie complète, résultats, rejouer, sortie, tactile) | 24 vérifications réussies, 0 erreur de page, 0 requête Shopify |
| Partie complète au clavier seul | arrivée à r 82 680 sur 82 656, 93,8 s de jeu, 33 mots, 13 étoiles, 24 nœuds, 0 chute, score 1 725, note A, sphère de 28 à 46 px |
| Absence de téléportation | vitesse moyenne maximale entre deux décisions : 1 025 px/s (limite physique 1 725) |
| Durée réelle de la partie complète | environ 91 s pour 88 s de jeu : la simulation tient le temps réel sur ce GPU, ce que le rendu logiciel ne permet pas (622 s réelles pour 77 s de jeu) |
| Taille de la sphère | environ 25 à 75 px de rayon à 1 440 × 900 selon la rangée : lisible (la valeur de 11 px notée plus haut était celle du banc logiciel à 960 × 600) |

Vidéo d'une partie en temps réel (entrée depuis le graphe à plat, bascule en Expo, compte à rebours, jeu au clavier, chute dans un trou noir, relance, retour au site) : `docs/fall26-evidence/jeu-partie-gpu.webm`, enregistrée par `tools/enregistre-jeu.mjs`. Les captures du test (`SHOTS=dossier`) montrent le départ, la course, la chute, l'arrivée et les résultats.

Encore ouvert : ressenti de la physique et fluidité sur un autre GPU, son sur casque et haut-parleurs, et tactile sur un téléphone réel (voir `docs/reference/verifications-gpu-expo.md`).
