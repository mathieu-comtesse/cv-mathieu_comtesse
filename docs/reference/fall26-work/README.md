# Shopify Fall ’26 et comtesse.me

Audit initial et corrections du 16 novembre 2026.

[Comparaison visuelle des accueils à plat](accueil-1470x802.jpg) · [Comparaison Shopify et branche à 1 470 × 746](branche-shopify-1470x746.jpg)

## Périmètre

- Production du portfolio examinée à partir de `main` (`41ad3c6`). La branche de travail reprend `refonte/fall26-original-contenus-20261115` (`f9f6646`), qui apporte la calibration, les contenus du portfolio et les tests des deux modes. Les branches `claude/integration-fall26`, `codex/fall26-parite` et `feat/fall26-video-hud-20261115` ont aussi été repérées dans le dépôt.
- La référence visuelle est la page publique Shopify et les deux vidéos qui montrent effectivement cette page. La vidéo nommée `SHOPIFY_FALL26_ANIMATIONS_V5(1).webm` montre principalement une interface de conversation dans les images échantillonnées toutes les cinq secondes. Elle ne fournit pas de repère exploité ici.
- Le HTML autonome V17 sert à contrôler les données intégrées et à comprendre le prototype. L’archive V13 a fourni des relevés Expo par chapitre et le moteur de projection de cette version. L’archive de calibration du 15 novembre a fourni une étude isolée du décor et des repères Expo en trois résolutions. L’archive source a fourni 43 captures, dont 33 en Expo, 13 modules et le JSON du graphe. Son JSON est exactement égal à celui embarqué dans la V17. Les archives V15 et V17, l’extracteur, le journal et la vidéo originale du jeu ont également été récupérés.
- Le navigateur a affiché Shopify à plat et les deux modes de comtesse.me. Chez Shopify, la commande Expo était masquée dans ce navigateur. Le code de détection exige les API HTML-in-Canvas ainsi que la copie de l’élément HTML dans une texture WebGPU. Les séquences Expo de la référence proviennent donc des vidéos fournies. Le redimensionnement demandé à 390 px a gardé une largeur effective de 1 470 px. Il ne constitue pas une capture mobile.

## Matrice de conformité

| Composant | Référence contrôlée | État de la reconstruction | Statut |
|---|---|---|---|
| Navigation et structure | En-tête de 50 px et panneau graphe de x=423 à 1460, y=60 à 792 dans la capture desktop | En-tête de 50 px. Le portfolio conserve ses pages, rubriques et contenus. Onze foyers sont présents dans le graphe. La page actuelle est organisée en quatre sections principales | Structure proche sur la capture. Navigation complète à vérifier sur la branche |
| Foyers à plat | Onze carrés de chapitre et une jonction centrale creuse | Les onze centres et la jonction sont recalés sur la capture Shopify à 1 470 × 802. Le test de projection retrouve les onze centres dans une tolérance de 1 px | Projection validée. Écart entre rendus de la branche à mesurer |
| Graphe, branches et terminaisons | Le JSON V17 contient 353 nœuds typés et 1 944 relations uniques. Le module Shopify distingue les données sémantiques, la vue de graphe et les sous-graphes de chapitre | Le moteur de la branche dessine des rayons paramétrés, des bifurcations et des liens relevés. La topologie sémantique complète reste à brancher | Partiel |
| Luminosité du graphe | Luminance moyenne 9,94 sur 255. Pixels de luminance supérieure à 70 sur 255, 1,68 % | Production au moment de la capture, moyenne 18,44 et 6,75 %. La valeur inclut les vignettes des deux sites | Écart mesuré sur la production. Branche à recapturer |
| Formation, survol, curseur | Les vidéos et le module du graphe montrent des rayons, des terminaisons et variations d’état distinctes par chapitre et interaction | La branche reprend la mise en mouvement et le picking de `Ciel`. Les séquences de formation et de retour au relâchement demandent un suivi image par image | Partiel |
| Titres et typographie | La navigation Shopify déclare PP Neue Montreal. La taille calculée de son premier h1 est 14 px. Le grand titre du héros et les titres des chapitres doivent être mesurés séparément | Premier h1 de la production à 14 px en Inter. Les tailles des chapitres de la branche ont des tests de régression | Police différente. Titres des chapitres à comparer |
| Transition des étoiles et couleurs | Les vidéos montrent les changements de foyer et de teinte en défilement. Le module `journey` utilise une phase de progression et des fenêtres distinctes pour le dévoilement, le panoramique, l’isolation et la couleur | La branche utilise une horloge commune et des paramètres estimés. Les tests valident sa réversibilité | Partiel. Synchronisation avec Shopify à mesurer |
| Caméra, sol et cadres Expo | Vidéos avec galerie continue et déplacement du point de vue. Moteur Expo WebGPU et shader de maillage récupérés | Base de travail avec géométrie WebGL pour les volumes et couches Canvas pour grille et annotations. V17 utilise deux surfaces Canvas 2D et une perspective calculée à la main | Profil et caméra recalés avec dix projections numériques. Matériaux et scènes complètes à comparer |
| Jeu et objets de galerie | Module `index-BYa19V1d.js` identifié. Il demande notamment les blocs et effets de parcours au module Expo. Les commandes et écrans de résultat sont recensés ci-dessous | Le mini-jeu V17 possède une simulation et un monde de données partagés avec son Expo 2D. Le moteur du portfolio n’intègre encore aucun jeu | À implémenter dans la scène du portfolio |
| Mobile et accélération | Capture desktop réelle. Vidéos fournies pour l’Expo | Tests géométriques desktop et mobile exécutés. Chromium local ne démarre pas, avec refus de création du socket de processus. Rendu mobile, GPU matériel et coût par frame restent à mesurer | Non validé |

Les mesures de luminance utilisent la même zone de 1 037 × 732 px dans les deux captures. L’échantillon est un état d’animation de chaque site. La luminance est calculée sur les canaux RVB 8 bits avec les coefficients 0,2126, 0,7152 et 0,0722.

## Contrôle de la branche dans le navigateur

À 1 470 × 746, l’aperçu du commit `e927ddd` a ouvert le mode à plat, l’Expo et le retour à plat. La comparaison des onze centres relevés dans cette nouvelle paire donne environ 13,5 px d’écart moyen et 51 px au maximum. Le maximum concerne le foyer associé à Payments dans Shopify. La position varie avec le pointeur et le temps d’animation. Ce relevé est propre aux deux images capturées.

Dans le rectangle commun de 1 047 × 676 px, la luminance moyenne est de 10,04 chez Shopify et de 8,44 sur la branche. Au-dessus de 70 sur 255, les proportions sont respectivement 1,77 % et 1,18 %. Le contraste des branches, des terminaisons et des vignettes reste à affiner.

La capture montre aussi un libellé tronqué près du bord droit. Le rendu bascule désormais le libellé de l’autre côté du foyer lorsque sa largeur dépasse l’espace disponible. Le test canvas vérifie les deux orientations.

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

## Projection Expo

La branche remplace l’ancien profil exponentiel ajusté à la main avec le calcul du ruban observé dans le module Expo. Le terrain comporte 64 segments sur 5 hauteurs de fenêtre. La caméra a un champ qui évolue de 50° à 45°, une inclinaison finale de 30,2° et un plan de coupe proche à 4 px. Le relief démarre à 35 % de la bascule avec sa propre courbe de montée. Les projections Canvas et WebGL utilisent le même champ et le même plan proche.

Dix projections testées aux phases 0, 25, 50, 75 et 100 %, à 1 470 × 802 et 390 × 844. L’écart entre le calcul de la branche et les valeurs de référence arrondies est inférieur à 0,01 px. Ces points valident la projection de coordonnées. Les captures navigateur restent nécessaires pour valider le placement des objets, les textures et la fluidité d’ensemble.

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
- Le journal original contient 1 756 relevés d’état et 3 308 événements sur 213,7 s. La vidéo 3 656 × 2 238 contient une piste Opus. Le départ est affiché à 42 010 px de l’arrivée sur cette session. Cette longueur dépend de la page et du point de départ.
- Les résultats filmés permettent de vérifier le futur bilan. Le prototype V17 saute directement près des obstacles ou de l’arrivée dans ses tests automatiques. Une victoire effectuée en jouant tout le parcours reste à vérifier.

| Résultat filmé | Temps | Distance | Taille | Nœuds | Mots | Sauts | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Première chute | 26,1 s | 16 824 px | 156 px | 85 | 546 | 30 | 661 |
| Deuxième chute | 53,9 s | 34 727 px | 209 px | 172 | 1 511 | 60 | 1 743 |

[Première chute filmée dans Shopify](jeu-chute-shopify.jpg)

- Pour l’implémentation du jeu, les identifiants, positions et collisions des objets doivent être pris dans le registre Expo. Le pas fixe peut ensuite être testé indépendamment du moteur de rendu en rejouant les mêmes entrées. Les ressources Shopify téléchargées restent des éléments d’audit.

## Vérifications de la branche

Lancer sous Node 24 depuis la racine. Les tests de géométrie, de transition, de typographie, de verre, de couleurs du sol, des miniatures et des chemins de prévisualisation ont réussi. Le [premier contrôle Chromium](https://github.com/mathieu-comtesse/cv-mathieu_comtesse/actions/runs/43941284500) a validé la navigation, les bascules, le déplacement des nœuds, le clavier et le rendu du portfolio à 390 × 844 sous SwiftShader. Il a aussi capturé 16 états. Le contrôle visuel a échoué sur le milieu de la transition Expo, sans les deux foyers attendus. La mesure lisait les sections après déplacement des éléments, alors que le moteur Expo projette les positions d’avant bascule. La branche aligne la couleur de page et l’échantillonnage des captures sur ces positions, avec un contrôle explicite du décalage entre horloges. La nouvelle exécution doit confirmer les deux foyers.

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

Le rapport couvre le recalage des foyers et de la projection Expo. L’intégration du graphe complet, les onze sections du parcours, la galerie et le mini-jeu restent ouverts, ainsi que les comparaisons des transitions, des interactions et des performances.

## Animations des chapitres et du graphe

Le module `journey` du build Shopify 5090151 distingue le repli du réseau sortant, le dévoilement du suivant, le déplacement du foyer, l’ouverture de ses branches et la couleur. La branche utilise les fenêtres normalisées ci-dessous en mode à plat et en Expo.

| Phase | Intervalle du défilement de transition |
|---|---|
| Repli du réseau sortant | 0 à 30 % |
| Dévoilement du réseau entrant | 2 à 8 % |
| Déplacement des foyers | 0 à 100 %, courbe cubique |
| Ouverture du réseau entrant | 50 à 100 % |
| Interpolation chromatique | 11 à 63 % |

Les positions de départ et d’arrivée dans la page restent celles du portfolio. La géométrie et l’opacité des fils sont adaptées à son moteur Canvas. Un balayage transversal détecte maintenant le croisement d’une branche éditoriale, courbe le fil entre ses extrémités et déclenche un retour amorti. Les paramètres de retour de Shopify sont de 3,1 Hz, avec un amortissement de 0,15 et une intégration par pas de 1/240 s. Le test rejoue le geste, vérifie le passage de part et d’autre du tracé de repos et contrôle le mode de mouvement réduit. Les superpositions image par image des phases et du balayage restent à mesurer.

## Entrée du graphe, itération du 16 novembre

Le graphe à plat emploie désormais les courbes d'entrée de `controller-Bky8k22R.js` (classe `Ys`, build Shopify 5090151). Départ des foyers depuis le centre, rotation amortie de −180° pour les foyers et −67° pour les feuilles, trajet quintique, décalage des foyers de 0,07 s, feuilles après 0,45 s puis 0,025 s par feuille, gonflement et retour de taille. L'horloge avance à 1,18 fois le temps affiché, comme le contrôleur original. Les libellés attendent la fin du déploiement. Le mouvement réduit affiche directement les positions finales.

Contrôle numérique exécuté sur la classe originale extraite, avec un foyer et 57 feuilles, 400 pas temporels : 69 600 comparaisons de progression, visibilité et taille. Écart absolu maximal : 0,000000465509, dû notamment aux tableaux Float32 de l'original. Les tests locaux couvrent aussi la permutation des départs, les bornes, la progression monotone, les positions finales et le mouvement réduit.

Limites : les trajectoires partent des positions calibrées du portfolio. La simulation dynamique et la topologie complète de Shopify ne sont pas encore reprises. Les bifurcations restent attachées aux branches du moteur existant. La jonction centrale est affichée une fois la formation achevée, son amorçage reste à reproduire. L'entrée s'applique au graphe à plat, pas encore à une arrivée directe en Expo. Les vignettes restent aux extrémités des branches, leur vol vers les cartes au défilement reste à réaliser. Aucune équivalence visuelle de cette entrée n'est déclarée sans capture synchronisée des deux sites.

## Vol de la vignette vers la première carte, 17 novembre

En mode à plat sur desktop, la vignette Point financier quitte le graphe et rejoint le repère du même projet. L'image suit le défilement dans les deux sens, se réduit à la taille du repère, puis disparaît. Le retour à l'accueil restaure sa cible interactive. Le mode Expo et le mouvement réduit désactivent ce vol.

Les courbes de déplacement, de réduction et de fondu proviennent de `build-section-frame-D13SNIDg.js` et `heroMediaFlight-Ns5y62fO.js` (build Shopify 5090151). Le départ suit le défilement de comtesse.me. Le premier essai envoyait la vignette hors de l’écran avant que la carte n’y entre. La destination est désormais bornée au bord inférieur de la fenêtre, puis suit le repère dès qu’il devient visible. Shopify calcule la trajectoire à partir d'une pose intermédiaire de son graphe. Cette reconstruction utilise la dernière pose visible de la vignette avant le vol. L'écart de trajectoire doit donc être mesuré avec des captures synchronisées. Les autres changements de chapitre et l'Expo ne sont pas couverts par cette modification.

Le test numérique contrôle les deux extrémités, la réduction et le fondu. Le scénario Chromium contrôle le départ, le déplacement, le retour par défilement inverse et le nettoyage à l'arrivée. Il produit une capture de la vignette en vol dans l'artefact `fall26-real-site-parity`.

## Bornes des transitions entre chapitres, 17 novembre

Sur ordinateur, le moteur mesure la fin du chapitre sortant et le début du suivant. La transition s'ouvre lorsque la fin du chapitre sortant atteint 55 % de la hauteur de la fenêtre. Elle se ferme lorsque le début du suivant atteint 40 %, avec un intervalle minimal de 1 px de défilement. La fin inclut les cartes qui dépassent leur section. La vue Expo conserve ces mesures avant de déplacer les éléments vers la scène. Ses étoiles et son sol, ainsi que les étoiles et le dégradé de la vue à plat, utilisent cette géométrie commune.

Le changement reprend les bornes du module `journey-B8CyvxC_.js` et la mesure de `HeroGraph-DVZqmklL.js` du build 5090151. Comparaison numérique directe avec le module Shopify sur cinq hauteurs de fenêtre, six espacements entre chapitres et 101 positions par fenêtre. Les 60 bornes et les 15 150 valeurs des courbes ont donné un écart numérique nul. Les captures automatisées à 25 %, 50 % et 75 % attendent que la scène ait dessiné la position demandée. Le test de retour de la vignette Point financier applique le même principe.

Le tracé des branches et les points d'ancrage reposent toujours sur la reconstruction du graphe. Le dégradé spatial et les couleurs conservent l'étalonnage propre au portfolio. Le mode mobile garde son intervalle lié au titre entrant, car cette partie du module Shopify active le parcours selon les conditions desktop.

La vérification à plat a montré des fils qui traversaient tout l'écran lorsque leur titre ou leur carte cible était hors champ. Le dessin des fils s'arrête désormais lorsque leur cible quitte la fenêtre, avec un fondu sur les derniers 72 px.

## Branches et relations de l'accueil, 17 novembre

Le graphe public de Shopify, build 5090151, contient 11 sections, 222 entrées et 120 concepts. Les 1 944 relations se répartissent entre 222 rattachements à une section et 1 722 associations aux concepts. Le module de présentation dérive aussi 42 liaisons de repos entre les entrées à partir des catégories produit. Les liaisons au survol exploitent ces associations produit et retiennent au maximum six voisins selon le nombre de catégories communes, puis leur distance à l'écran.

Les 222 extrémités ont été extraites en exécutant la simulation Shopify à 1 037 × 732, après sa phase de stabilisation et sans déplacement du pointeur. Chaque vecteur est exprimé depuis son foyer et arrondi au centième de pixel. Le portfolio réutilise ces vecteurs autour de ses onze foyers relevés, dans les deux modes. Les ramifications inventées et les anciennes liaisons de foyer à foyer ont été retirées. Les 51 emplacements d'images de la source servent de repères pour les vignettes du portfolio. Les emplacements sans contenu correspondant restent des points. Les guides relient les onze foyers à la jonction centrale.

Le script `tools/extract-fall26-topology.mjs` régénère le module de coordonnées et d'indices à partir des fichiers de référence. Une régénération a produit le même fichier octet pour octet. Les tests vérifient les comptes, les extrémités, les 42 liaisons, le plafond de six relations au survol et leur fondu. Les guides et les relations utilisent les coordonnées réellement dessinées, y compris pendant la saisie d'une vignette.

La simulation complète de Shopify se poursuit à chaque image après son état de repos. La reconstruction utilise le moteur de déformation du portfolio autour de l'état extrait. Les foyers absolus, la saturation des traits, le placement mobile et le contenu des vignettes diffèrent encore. Les concepts servent aux relations et restent hors du graphe d'accueil, comme dans la présentation d'origine. Le panneau de détail des concepts et le mini-jeu restent à intégrer.

## Mouvement continu des constellations, 17 novembre

Les branches d'accueil tournent lentement dans des sens alternés selon le rang Shopify. La rotation ralentit au survol d'une extrémité. En survolant un foyer, ses branches se raccourcissent progressivement de 25 %, dans l'ordre angulaire, puis reprennent leur longueur de repos. Un balayage du pointeur produit un écartement et entraîne des points dans le sens du déplacement. L'effet dépend de la vitesse du geste, ce qui laisse le graphe se stabiliser lorsque le pointeur s'arrête. Les guides, les vignettes, les liaisons et leurs zones de clic suivent les positions dessinées. Le réglage de mouvement réduit désactive ces déplacements.

Le nouveau module utilise un pas fixe de 1/120 s, une vitesse d'orbite de 0,02 rad/s et les paramètres de survol et de répulsion du build Shopify 5090151. La composante de répulsion a été comparée directement à la fonction de Shopify sur 9 800 valeurs. L'écart maximal est inférieur à 2 × 10⁻¹². Les tests couvrent également le sens de rotation, les longueurs, le ralentissement et le même résultat à 30 et 120 images/s. Le profil prend les foyers relevés et les branches déjà extraites comme positions de repos.

Cette version ne reprend pas les collisions entre toutes les paires de nœuds, l'attraction à très courte distance, ni la totalité des ressorts de la référence. Le passage en Expo conserve sa propre simulation dans le plan projeté. L'équivalence de la scène complète pendant un geste et les mesures sur GPU réel restent à établir.
