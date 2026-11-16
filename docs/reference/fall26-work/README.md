# Shopify Fall ’26 et comtesse.me

Audit initial et première correction du 16 novembre 2026.

[Comparaison visuelle des accueils à plat](accueil-1470x802.jpg)

## Périmètre

- Production du portfolio examinée à partir de `main` (`41ad3c6`). La branche de travail reprend `refonte/fall26-original-contenus-20261115` (`f9f6646`), qui apporte la calibration, les contenus du portfolio et les tests des deux modes. Les branches `claude/integration-fall26`, `codex/fall26-parite` et `feat/fall26-video-hud-20261115` ont aussi été repérées dans le dépôt.
- La référence visuelle est la page publique Shopify et les deux vidéos qui montrent effectivement cette page. La vidéo nommée `SHOPIFY_FALL26_ANIMATIONS_V5(1).webm` montre principalement une interface de conversation dans les images échantillonnées toutes les cinq secondes. Elle ne fournit pas de repère exploité ici.
- Le HTML autonome V17 sert à contrôler les données intégrées et à comprendre le prototype. L’archive V13 a fourni des relevés Expo par chapitre et le moteur de projection de cette version. L’archive de calibration du 15 novembre a fourni une étude isolée du décor et des repères Expo en trois résolutions. Les ZIP V15 et V17 ainsi que l’extracteur V15 ont été localisés, avec un échec d’authentification lors de leur récupération.
- Le navigateur a affiché Shopify à plat et les deux modes de comtesse.me. Chez Shopify, la commande Expo était masquée dans ce navigateur. Le code de détection exige les API HTML-in-Canvas ainsi que la copie de l’élément HTML dans une texture WebGPU. Les séquences Expo de la référence proviennent donc des vidéos fournies. Le redimensionnement demandé à 390 px a gardé une largeur effective de 1 470 px. Il ne constitue pas une capture mobile.

## Matrice de conformité

| Composant | Référence contrôlée | État de la reconstruction | Statut |
|---|---|---|---|
| Navigation et structure | En-tête de 50 px et panneau graphe de x=423 à 1460, y=60 à 792 dans la capture desktop | En-tête de 50 px. Le portfolio conserve ses pages, rubriques et contenus. Les onze chapitres sont présents dans la base de travail | Structure proche sur la capture. Navigation complète à vérifier sur la branche |
| Foyers à plat | Onze carrés de chapitre et une jonction centrale creuse | Les onze centres et la jonction sont recalés sur la capture Shopify à 1 470 × 802. Le test de projection retrouve les onze centres dans une tolérance de 1 px | Projection validée. Écart entre rendus de la branche à mesurer |
| Graphe, branches et terminaisons | Le JSON V17 contient 353 nœuds typés et 1 944 relations uniques. Le module Shopify distingue les données sémantiques, la vue de graphe et les sous-graphes de chapitre | Le moteur de la branche dessine des rayons paramétrés, des bifurcations et des liens relevés. La topologie sémantique complète reste à brancher | Partiel |
| Luminosité du graphe | Luminance moyenne 9,94 sur 255. Pixels de luminance supérieure à 70 sur 255, 1,68 % | Production au moment de la capture, moyenne 18,44 et 6,75 %. La valeur inclut les vignettes des deux sites | Écart mesuré sur la production. Branche à recapturer |
| Formation, survol, curseur | Les vidéos et le module du graphe montrent des rayons, des terminaisons et variations d’état distinctes par chapitre et interaction | La branche reprend la mise en mouvement et le picking de `Ciel`. Les séquences de formation et de retour au relâchement demandent un suivi image par image | Partiel |
| Titres et typographie | La navigation Shopify déclare PP Neue Montreal. La taille calculée de son premier h1 est 14 px. Le grand titre du héros et les titres des chapitres doivent être mesurés séparément | Premier h1 de la production à 14 px en Inter. Les tailles des chapitres de la branche ont des tests de régression | Police différente. Titres des chapitres à comparer |
| Transition des étoiles et couleurs | Les vidéos montrent les changements de foyer et de teinte en défilement. Le module `journey` utilise une phase de progression et des fenêtres distinctes pour le dévoilement, le panoramique, l’isolation et la couleur | La branche utilise une horloge commune et des paramètres estimés. Les tests valident sa réversibilité | Partiel. Synchronisation avec Shopify à mesurer |
| Caméra, sol et cadres Expo | Vidéos avec galerie continue et déplacement du point de vue. Moteur Expo WebGPU et shader de maillage récupérés | Base de travail avec géométrie WebGL pour les volumes et couches Canvas pour grille et annotations. V17 utilise deux surfaces Canvas 2D et une perspective calculée à la main | Garder la géométrie du dépôt. Profil du sol, matériaux et perspective à recaler |
| Jeu et objets de galerie | Module `index-BYa19V1d.js` identifié. Il demande notamment les blocs et effets de parcours au module Expo. Les commandes et écrans de résultat sont recensés ci-dessous | Le mini-jeu V17 possède une simulation et un monde de données partagés avec son Expo 2D. Le moteur du portfolio n’intègre encore aucun jeu | À implémenter dans la scène du portfolio |
| Mobile et accélération | Capture desktop réelle. Vidéos fournies pour l’Expo | Tests géométriques desktop et mobile exécutés. Chromium local ne démarre pas, avec refus de création du socket de processus. Rendu mobile, GPU matériel et coût par frame restent à mesurer | Non validé |

Les mesures de luminance utilisent la même zone de 1 037 × 732 px dans les deux captures. L’échantillon est un état d’animation de chaque site. La luminance est calculée sur les canaux RVB 8 bits avec les coefficients 0,2126, 0,7152 et 0,0722.

## Relevé des centres

| Chapitre Shopify | X | Y |
|---|---:|---:|
| Agentic | 885 | 115 |
| Sidekick | 1 052 | 576 |
| Merchandising | 1 400 | 413 |
| Retail | 564 | 584 |
| Payments | 1 104 | 199 |
| Operations | 958 | 731 |
| Online | 561 | 287 |
| Marketing | 1 290 | 572 |
| Fulfillment | 694 | 433 |
| Developer | 1 168 | 364 |
| Shop | 816 | 281 |

La projection des anciennes coordonnées de la branche vers cette capture s’écartait en moyenne d’environ 80 px. Le test actualisé applique le calcul à partir du rectangle du graphe et des points relevés. Il reste à mesurer les positions du rendu navigateur, y compris les déplacements causés par le pointeur et les changements de format.

## Données, shaders et jeu

- Le JSON V17 contient 11 sections, 222 mises à jour, 62 produits, 33 thèmes, 18 résultats et 7 profils. Les relations se répartissent en 222 `contains` et 1 722 `assigned_to`. Les enregistrements du JSON n’ont pas de coordonnées. `getExponentialGraphPayload` lie les mises à jour aux sections et choisit aussi certaines paires à relier visuellement selon leurs correspondances et leur poids. Les 1 944 relations doivent donc nourrir les données du moteur, avec une sélection d’arêtes adaptée à l’état d’affichage.
- La livraison CDN examinée porte l’identifiant `5090151`. `HeroGraph-DVZqmklL.js`, `ExponentialGraph-CKUYT0rc.js`, `GraphLabels-CZgf7i6U.js` et `journey-B8CyvxC_.js` couvrent le graphe et ses états. `htmlInCanvasWebGpu.client-BcWOMKca.js` assemble la scène, avec `mesh.wgsl-CahI0rXV.js` pour le shader de maillage. Le petit module `shader-7sCtY4bJ.js` fournit des utilitaires de shader.
- `index-BYa19V1d.js` pilote le jeu et ses états de départ, de course, de chute et d’arrivée. Constantes visibles dans le moteur original, dont l’application effective reste à tracer selon le terrain et les entrées.

| Paramètre original | Valeur |
|---|---:|
| Pas de simulation | 1/120 s |
| Vitesse nominale, minimale et maximale | 700, 350 et 1 500 px/s |
| Accélération et freinage | 1 200 et 2 400 px/s² |
| Gravité | 6 500 px/s² |
| Rayon configuré | 40 px |
| Croissance nœud et mot | 0,05 et 0,035 |

- Commandes de référence relevées dans les libellés originaux. Direction avec flèches gauche et droite ou A et D, vitesse avec flèches haut et bas ou W et S ou molette, saut avec espace. Le module contient également une cible tactile à déplacer.
- Le résultat distingue la chute et l’arrivée. Il affiche distance, taille et détail des points séparant nœuds, mots et sauts. L’arrivée calcule une note. Le module référence aussi des tremplins, des zones de poussée, des trous, une animation de particules et un moteur sonore. Leur trajectoire, leur disposition et leurs déclenchements restent à valider en jeu.
- Pour l’implémentation du jeu, les identifiants, positions et collisions des objets doivent être pris dans le registre Expo. Le pas fixe peut ensuite être testé indépendamment du moteur de rendu en rejouant les mêmes entrées. Les ressources Shopify téléchargées restent des éléments d’audit.

## Vérifications de la branche

Lancer sous Node 24 depuis la racine. Les tests de géométrie, de transition, de typographie, de verre, de couleurs du sol, des miniatures et des chemins de prévisualisation ont réussi. Le workflow `Fall26 visual and interaction parity` prévoit les captures de la branche à 1 440 × 900 et 390 × 844 sous SwiftShader. Il complète les deux captures publiques présentées ci-dessus.

```sh
node tools/test-fall26-reference-graph.mjs
node tools/test-fall26-expo-foci.mjs
node tools/test-fall26-chapter-transition.mjs
node tools/test-fall26-title-scale.mjs
node tools/test-fall26-floor-colours.mjs
node tools/test-fall26-frame-glass.mjs
node tools/test-fall26-thumbnail-assets.mjs
node tools/test-fall26-preview-paths.mjs
node tools/test-ciel-fade.mjs
```

Le rapport couvre le premier recalage des foyers. L’intégration du graphe complet, la galerie et le mini-jeu restent ouverts, ainsi que les comparaisons des transitions, des interactions et des performances.
