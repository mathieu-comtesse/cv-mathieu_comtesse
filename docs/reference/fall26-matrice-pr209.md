# Matrice différentielle : Shopify Editions Fall 2026, PR 209, branche `claude/fall26-motion-complete-pr209`

Base : PR 209, commit `10a50154b136573a8fcd0b2502f319533122111e`.

Sources de la référence :

- relevés de la page publique faits pendant la PR 209 (`docs/reference/shopify-fall26-audit.md`) ;
- vidéo du mode à plat fournie par Mathieu (24 s, format portrait) et capture de l'accueil en mode expo ;
- archive `SHOPIFY_FALL26_ANALYSE_ET_COMPLEMENTS_V2.zip` : inventaire des ressources, des chapitres, des keyframes CSS et des événements d'une session de 305 s. L'archive précise elle-même qu'elle ne contient ni image ni vidéo et que les courbes de caméra, le mouvement des branches, le mode expo et le rendu du pointeur n'y sont **pas observés**.

Les fichiers `SHOPIFY_FALL26_EXTRACTION_COMPLETE_V1.zip` et `shopify-fall26-effets-2026-11-13T15-17-39-071Z.json` n'ont pas été fournis à cette session : seul leur résumé (dans l'archive V2) a été exploité.

États : **conforme** (comparé à une observation), **incomplet**, **différent**, **absent**, **non vérifiable** (aucune observation de la référence disponible).

| Effet | Référence observée | PR 209 | Cette branche | État |
|---|---|---|---|---|
| Graphe de l'accueil, à plat | panneau sombre, foyers, vignettes, fond qui passe au bleu en quittant l'accueil, le graphe s'ouvre (vidéo) | 12 foyers, 83 nœuds éditoriaux, ouverture et effacement au défilement | idem, plus saisie des nœuds et mode compact sur mobile | incomplet : la disposition exacte des foyers et les teintes vertes de certains foyers ne sont pas reprises |
| Graphe de l'accueil, expo | foyers posés sur le sol avec cercle et libellé (ancienne capture du moteur) | fait, dans le repère de la scène | idem, plus saisie des nœuds | différent dans le détail (positions), non comparé image par image |
| Glisser un nœud | curseurs `grab` et `grabbing` relevés dans l'archive | absent | fait : main ouverte, main fermée, retour élastique, clic sans déplacement = navigation | conforme pour les curseurs ; le mouvement du nœud lui-même est non vérifiable |
| Branches des chapitres, à plat | foyer fixe à l'écran, longues branches vers les bords, vignettes, faisceau vers le titre, branche claire vers le premier contenu (vidéo) | fait | idem, vignettes saisissables au pointeur sans fuite | incomplet : longueurs, nombre et teintes calés à l'œil sur la vidéo |
| Remplissage du titre | titre en contour, rempli de la droite vers la gauche pendant sa montée (vidéo) | fait (vérifié sur capture) | idem | conforme sur ordinateur ; non confirmé sur mobile |
| Transition de couleur entre chapitres | dégradé vertical bleu vers violet (vidéo) | déjà en place (animations CSS liées au défilement) | idem | conforme pour l'ordre des couleurs ; durée non mesurée |
| Liste fixe des chapitres, à gauche | présente pendant les transitions (vidéo) | fait (quatre chapitres réels) | idem | conforme dans le principe |
| Bascule à plat vers expo | bouton « Mode Expo » ; aucun état intermédiaire observé | bascule instantanée | animée : la caméra passe de la verticale à 30,2° en 0,9 s, réversible en cours de route, position de lecture conservée | non vérifiable (aucune observation de la référence) ; choix documenté |
| Caméra expo | sol incliné, redressé au loin, visée à 30,2°, champ 45° (relevés de l'ancien moteur) | fait | idem | conforme aux relevés |
| Cadres à 55° | relevé de l'ancien moteur : 55°, charnière sur le bord bas | fait (mesuré 55°) | idem, plus reflet de verre et rehaut au survol | conforme pour l'angle ; reflet non vérifiable |
| Cartes de l'accueil en expo | blocs pleins de hauteur décroissante, carte des chapitres dressée, titre très extrudé, objet 3D posé sur un bloc, sol bleu vif, quadrillage clair sur fond noir (capture) | blocs, carte dressée, titre épais | idem | différent : couleur du sol, quadrillage, objet 3D sur le bloc, proportions exactes |
| Titres en volume | lettres extrudées, ombre portée | fait (contour relevé sur la police de la page) | idem | incomplet : police différente (Inter au lieu de la police commerciale, volontairement) |
| Étoiles et petits libellés, expo | foyer, libellé contre le foyer, branches (capture « Agentic ») | fait | idem | incomplet : composition non superposée à la capture |
| Verre et matériaux | modules de shaders listés dans l'archive, rendu non observé | absent | reflet simulé sur les cadres relevés | non vérifiable |
| Curseur | valeurs CSS `auto`, `pointer`, `crosshair`, `grab`, `grabbing` (archive) ; forme d'un éventuel curseur dessiné non observée | `pointer` sur les vignettes | `crosshair` sur le graphe, `grab` et `grabbing` sur les nœuds, `pointer` sur les vignettes des chapitres, rehaut du cadre survolé | conforme pour les valeurs CSS ; inertie et effets magnétiques non vérifiables |
| Défilement inertiel | module de défilement lissé listé dans l'archive | défilement natif du navigateur | idem | absent ; non repris faute d'observation des paramètres |
| Navigation directe et retour arrière | ancres `#chapitre` | fait | idem, couvert par un test | conforme |
| Clavier | non observé | Échap et touche ` pour basculer | idem, couvert par un test | non vérifiable |
| Mouvement réduit | non observé | animations coupées | bascule immédiate, couvert par un test | non vérifiable |
| Hublot, tirelire | propres à comtesse.me | testés dans le temps | idem | conforme à leur comportement d'origine |
| Mini-jeu final | événements `game-ui` relevés dans l'archive, règles non observées | retiré avec le CDN | non réintroduit (décision de la PR 209) | absent, volontairement |
| Fluidité | non mesurée sur la référence | non mesurée sur carte graphique | mesurée en rendu logiciel seulement (`docs/perf/fall26-moteur-swiftshader.json`) | non vérifiable sur matériel |

## Ce que `cursor.css` contient

`cursor.css` définit des curseurs natifs (`auto`, `pointer`, `grab`, `grabbing`) par variables, pour les autres pages du site. L'accueil ne le charge pas ; il utilise les mêmes valeurs natives, qui sont aussi celles relevées sur la référence. Le fichier n'a pas été modifié.

---

# Mise à jour : observation du mode Expo dans Chrome 157 (branche de calibration, base PR 210)

La limite « le mode Expo ne s'établit pas sans vraie carte graphique » était un mauvais diagnostic. Le mode Expo de la référence exige l'API expérimentale html-in-canvas ; le navigateur intégré à l'application ne l'a pas, le Chrome réel (extension Claude in Chrome) l'a.

## Matrice de compatibilité (relevée le 2026-11-14, page https://www.shopify.com/editions/fall2026)

Test de disponibilité lu dans le code de la référence : `requestPaint` sur le canvas, `texElementImage2D`, `navigator.gpu`, puis `GPUQueue.drawElementImageToTexture` ou `copyElementImageToTexture`.

| Navigateur | Moteur | requestPaint | drawElementImageToTexture | copyElementImageToTexture | navigator.gpu | Mode Expo |
|---|---|---|---|---|---|---|
| Navigateur intégré de l'application | Chrome 156 | absent | absent | absent | présent, adaptateur obtenu (AMD Radeon RX 9070 XT) | impossible |
| Chrome réel, extension Claude in Chrome | Chrome 157 | présent | présent | absent | présent | fonctionne (Maj + ~) |
| Playwright 1.61 (Chromium 1228, tests) | rendu logiciel | non relevé | non relevé | non relevé | non relevé | non utilisé : le moteur de comtesse.me ne dépend pas de cette API |

`texElementImage2D` : longueur de la fonction relevée seulement dans le Chrome 157 via le test de la page (le test exige une longueur différente de 6). WebGPU disponible n'est **pas** une preuve de compatibilité Expo : le navigateur intégré en est la démonstration.

## Paramètres de la scène de la référence (configuration du bundle)

| Paramètre | Valeur | Rôle | Reprise dans comtesse.me |
|---|---:|---|---|
| `duration` | 800 ms | durée configurée de la bascule | `index.html` : 900 → 800 ms |
| `riseAt` | 0,35 | **confirmé** par l'usage : hauteurs = lissage de la progression remappée de [riseAt, 1] vers [0, 1] ; la montée des blocs ne démarre qu'à 35 % | `cvView.rise` dans `moteur.js` (courbe de lissage déduite, non lue) |
| `pitch` | -30,2° | visée finale de la caméra | identique (30,2°, vérifié par test) |
| `tilt.angle` | 55° | inclinaison des cadres | identique (55°, vérifié par test) |
| `phone.tilt` | 35° | inclinaison du téléphone dans la scène | non repris : aucun téléphone dans la scène de comtesse.me |

La courbe d’accélération était encore inconnue lors de ce relevé. Elle a depuis été retrouvée et vérifiée dans [le comparatif de trajectoire](fall26-camera.md).

## Observations visuelles (Chrome 157)

Captures : `docs/fall26-evidence/expo-ref-chrome157-a-plat.jpg`, `…-expo-instant.jpg`, `…-expo-stabilise.jpg`.

- À plat : titre vertical « Exponential » à gauche, colonne de vignettes, graphe sur fond bleu nuit.
- Expo : dalle bleue saturée, uniforme, qui se redresse au loin ; fond noir quadrillé avec arcs et graduations ; cube filaire en haut à gauche ; titre extrudé blanc ; objet 3D (appareil photo) posé sur le premier bloc ; blocs en gradins de hauteurs décroissantes ; foyers au sol avec cercle et libellé.
- Chronologie : la capture prise juste après la touche montre déjà un état quasi stabilisé. **Aucun état intermédiaire n'a pu être capturé** ; la durée de 800 ms vient de la configuration, pas d'une mesure à l'écran. La lecture du canvas WebGPU par `drawImage` tombe à environ 3 images par seconde et n'est pas utilisable pour mesurer.
- Non observés : survol des branches et des panneaux, interaction avec les éléments 3D, navigation entre chapitres dans le mode Expo, inversion pendant la transition sur la référence, vidéo.

## Lignes de la matrice mises à jour

| Effet | État précédent | État maintenant |
|---|---|---|
| Bascule à plat vers expo | non vérifiable (durée 0,9 s : choix) | durée alignée sur la configuration (800 ms) ; départ des hauteurs à 35 % repris ; courbe de caméra non établie |
| Caméra expo | conforme aux relevés | conforme : 30,2° et 55° retrouvés dans la configuration de la référence |
| Cartes de l'accueil en expo | différent : sol, quadrillage, objet 3D, proportions | **inchangé, non traité dans cette branche** : couleur de sol, quadrillage, objet 3D, positions des foyers, proportions, volume des titres, continuité des branches |
| Défilement inertiel, curseur, reflets | absent / non vérifiable | inchangé |

## Tests relancés (rendu logiciel, boucle locale remplacée par un service sans socket)

- `node tools/test-no-shopify.mjs --strict` : PASS.
- `node tools/test-objets-3d.mjs` : PASS.
- `node tools/test-machines.mjs` : ok (onze machines).
- `node tools/test-modes.mjs` : 1 échec, **identique sur la base de la PR 210** (retour élastique d'un nœud : distances 10 à 15 px et croissantes au lieu de revenir à l'origine). Le reste passe, dont l'entrée progressive (états intermédiaires de 90° à 30,2°), la réversibilité en cours de bascule, la conservation de la position de lecture et le mouvement réduit.
- Non relancés : test UX complet, suite longue de 14 tests, tests de navigation, de cohérence et de géométrie. Mesures de fluidité sur GPU matériel : non faites.

## Sol et quadrillage (mesurés sur la référence Chrome 157 et sur notre rendu, mêmes conditions de lecture de pixels)

| Élément | Référence | Avant | Maintenant | État |
|---|---|---|---|---|
| Couleur du sol | `#061CA6` environ (échantillons `#041EA9`, `#061CA6`, `#081EA5` sur la capture JPEG) | `#051DAA` | inchangée | **conforme** (écart de 1 à 2 niveaux, dans le bruit de compression) |
| Fond | `#050505` à `#121212` | `#000000` | inchangé | proche ; non modifié |
| Quadrillage, lignes horizontales | présentes, fines | présentes, presque invisibles (opacité 0,045) | opacité 0,10 (0,26 toutes les 10) | amélioré |
| Quadrillage, lignes qui suivent la courbure du sol | présentes, convergentes | **absentes** (les extrémités projetées étaient rejetées dès qu'une des deux sortait de l'écran) | tracées en polyligne sur 120 rangées, en sautant les points non projetables | **corrigé** |
| Arcs larges et arc clair accentué du fond | présents | absents | absents | **écart résiduel** |
| Cube filaire en haut à gauche | présent | absent | absent | écart résiduel |
| Courbure du sol au loin | le sol se redresse nettement | sol plat vu depuis le haut de la page | inchangé | écart résiduel (non touché : géométrie du chemin) |

Opacités du quadrillage choisies à l'œil par comparaison des deux captures agrandies, pas mesurées. Captures : `docs/fall26-evidence/expo-comtesse-avant-grille.png` et `…-apres-grille.png`. Tests relancés après la modification : `test-no-shopify --strict` PASS ; `test-modes` inchangé (même unique échec antérieur).

## Courbure du sol au loin

Cause de l'écart : le sol n'était tracé que sur la hauteur de la page (`drawPaperFloor` bornait chaque bande à `view.doc`), alors que le chemin continue jusqu'à son extrémité lointaine, là où `cvView` le redresse (angle jusqu'à 1,44 rad). Vu du haut de la page, le sol s'arrêtait en un bord net au lieu de se redresser.

Correction : la première bande démarre à la rangée 0 et la dernière va jusqu'à la rangée `T`, quel que soit le défilement. Capture : `docs/fall26-evidence/expo-comtesse-apres-courbure.png`.

| Élément | Avant | Maintenant | État |
|---|---|---|---|
| Courbure du sol au loin | sol plat, bord net | sol qui se redresse en bande étroite, grille qui suit | **corrigé** dans l'allure ; comparaison image par image non faite (profil exact et largeur de la bande non mesurés) |

Tests relancés : `test-no-shopify --strict` PASS, `test-objets-3d` PASS, `test-modes` avec son seul échec antérieur ; à la progression 0 la projection coïncide toujours avec la page.

# Passes 1 et 2 de la reconstruction de l'accueil (comparaison à dimensions identiques)

## Conditions de comparaison

Le viewport réel du Chrome de référence est **2498 × 1319** (écran large gamut P3, ratio 1), et la fenêtre n'a pas pu être redimensionnée à 1440 × 900 par l'extension. Notre rendu est donc capturé au même viewport (Playwright, rendu logiciel) puis ramené à la taille de la capture de référence (1512 × 798). Les comparaisons précédentes à 1440 × 900 contre des captures de formats différents donnaient une fausse impression de scène « trop dézoomée et trop étroite ».

## Passe 1 : géométrie et caméra

Bords gauche et droit du sol, mesurés ligne par ligne sur les deux captures (pixels sur 1512) :

| Ligne | Référence | comtesse.me | Écart |
|---|---|---|---|
| 100 | 458 – 1045 | 460 – 1051 | 2 / 6 px |
| 200 | 419 – 1084 | 420 – 1091 | 1 / 7 px |
| 300 | 360 – 1142 | 362 – 1152 | 2 / 10 px |
| 600 | 136 – 1365 | 134 – 1378 | 2 / 13 px |
| 700 | 57 – 1444 | 54 – 1457 | 3 / 13 px |
| 780 | 0 – 1502 | 0 – 1511 | 0 / 9 px |

Conclusion : la caméra, la largeur du sol à son extrémité lointaine et la perspective **coïncident déjà à moins de 1 %** (écart de 13 px au plus sur 1512). Aucune modification de caméra n'a été faite : une recalibration sur ce constat aurait dégradé un accord mesuré. La superposition 50/50 montre aussi les blocs, le titre et les foyers aux mêmes endroits. La ligne 500 n'est pas comparable (le titre extrudé masque le bord gauche sur la référence).

## Passe 2 : couleur du sol

- La page de référence **déclare** `#051DAA` pour la section bleue (attribut `data-html-in-canvas-colour`), identique à la nôtre ; la capture de l'extension dans le même Chrome en donne `#061CA6`.
- La capture de l'auteur montre le sol à `#1442FF`. Elle n'est pas reproductible depuis cet environnement : l'extension rend le sol sombre. L'écart vient très probablement de la gestion des couleurs (écran P3, canvas large gamut) ou de l'éclairage ; la cause n'est pas établie.
- Les trois canaux de `#051DAA` → `#1442FF` s'accordent avec **un seul gain d'exposition d'environ 4,5 en lumière linéaire**, écrêté. `cvLit` (moteur) applique ce gain à la couleur de chaque bande du sol, de 1 (à plat, couleur de la page inchangée, donc continuité) à 4,5 (expo), selon `view.rise`. Vérifié par calcul : `cvLit('#051DAA', 1)` = `rgb(20,66,255)` = `#1442FF`.
- Risque assumé : le modèle repose sur **une seule observation** et vaut pour l'écran de l'auteur ; sur un écran sRGB standard le sol de la référence peut apparaître plus sombre que le nôtre. À revalider avec une seconde capture de l'auteur.

## Éléments ajoutés au moteur (`dessineDecor`, même repère que le sol, suivent la caméra)

| Élément | Référence | Maintenant | État |
|---|---|---|---|
| Courbe exponentielle au premier plan et ligne de base (rangée de la page 1500) | présente | présente, numérotée 01 à 11 d'après les 11 chapitres réels | ajoutée ; hauteur de la courbe calée à l'œil, comparaison fine non faite |
| Repères numérotés sur la courbe | 01 à 11 | 01 à 11 | ajouté ; positions réparties régulièrement, pas relevées une à une |
| Cube filaire (cube dans le cube relié aux sommets) | haut gauche, rotation | haut gauche, rotation lente, immobile en mouvement réduit | ajouté ; taille et position calées sur la capture (échelle réglée à 140) ; pas de vidéo pour comparer la rotation |
| Arcs concentriques du fond | faibles, de part et d'autre | 6 anneaux sur le plan du sol, opacité 0,085 | ajouté ; centre et rayons choisis, **non mesurés** |
| Arc clair accentué | haut droit | tronçon qui parcourt un anneau lentement | ajouté ; trajet et vitesse inventés, à vérifier |
| Formule « e^(-x) cos(ωx + φ) » à gauche | présente | absente | non fait |

## Non traité dans cette livraison

Passes 3 à 6 de la mission : densité et composition du graphe central, taille et contenu des nœuds, reprise des trois présentoirs et de leurs objets (dont l'objet 3D), volume de la typographie, animations et optimisation. L'audit de la superposition montre en outre que la composition générale est déjà proche : le principal écart restant est la densité du graphe (la référence a plus de branches et de nœuds, de tailles variées).

Tests après ces modifications : `test-no-shopify --strict` PASS, `test-objets-3d` PASS, `test-machines` ok, `test-modes` avec son unique échec antérieur (retour élastique d'un nœud). Pas de mesure de fluidité sur GPU matériel. Captures : `expo-reference-contre-comtesse-cote-a-cote.png`, `expo-comtesse-2498x1319-decor.png`, `expo-ref-chrome157-2498x1319-reduit-1512.jpg`.

# Passe 3 : graphe central, foyers, connexions, nœuds

Générateur : `Ciel` dans `refonte/moteur.js`. Les nœuds éditoriaux (les 83 vignettes, liées à leurs vrais chapitres et projets) ne sont pas touchés ; seules les branches **décoratives** (points sans contenu) et le rendu changent. Aucun contenu inventé.

| Élément | Avant | Maintenant | Référence (capture) | État |
|---|---|---|---|---|
| Branches décoratives par foyer de chapitre | 7 à 11 | 20 à 29 (38 à 51 pour les foyers libres, 120 pour la racine ; moitié sur écran de moins de 520 px) | foyers avec beaucoup de rayons fins | densifié ; **le nombre exact de la référence n'est pas relevé** |
| Distribution des longueurs | uniforme (0,25 à 1,05) | beaucoup de courtes, quelques longues (0,3 + 0,9·u^1,3) | longueurs et angles variés | amélioré |
| Rayonnement des foyers | aucun | halo radial additif (clair au centre, bleu au bord) et branches en mélange additif : le centre s'éclaire par recouvrement | cœur lumineux visible | ajouté |
| Contraste des branches décoratives | blanc à 0,42 (invisible sur le sol éclairé) | blanc à 0,72 ; ramifications 0,5 ; racine 0,3 | rayons nets | corrigé |
| Taille des vignettes | uniforme | échelle 0,72 à 1,52 selon une phase propre à chaque nœud (ne décale pas la suite aléatoire) | tailles variées | ajouté |
| Taille des points au bout des branches | 1,1 à 2,6 | 1,0 à 3,6 (carré de l'aléa) | variée | ajouté |
| Miniatures dans les nœuds | images du projet quand elles existent | inchangé | éléments visuels dans les nœuds | **écart résiduel** : aucune nouvelle miniature ajoutée |
| Grandes ellipses autour des foyers | présentes (étoiles posées) | inchangées | présentes | déjà conforme dans le principe |
| Survol, saisie, retour élastique | présents | inchangés | non observés sur la référence | non modifié |

Écarts résiduels : le nombre, la teinte et la distribution exacts des rayons de la référence ; la forme de ses nœuds (carrés sombres à contour clair, plus gros près de la caméra) ; la disposition exacte des foyers (non repositionnés : la comparaison superposée montre des positions proches). Comparaison faite à dimensions identiques (2498 × 1319 ramené à 1512 × 798) : `expo-graphe-reference-contre-comtesse.png`.

Tests : `test-no-shopify --strict` PASS (83 vignettes projetées), `test-objets-3d` PASS, `test-machines` ok, `test-modes` avec son unique échec antérieur ; mobile 390 × 844 toujours 12 foyers, 0 erreur.

**Performance non établie** : en rendu logiciel à 2498 × 1319, 19 images en 5 s avant comme après (263 ms par image), le rendu 3D logiciel masque entièrement le coût du dessin 2D. Aucune mesure sur GPU matériel ; le surcoût attendu est de l'ordre de 3 à 4 fois plus de lignes 2D et un dégradé radial par foyer, à mesurer.

# Passe 4 : présentoirs de gauche et titre extrudé

**Correction de méthode.** Le rendu logiciel est lent (environ 260 ms par image) et la bascule avance par pas plafonnés à 70 ms : après 3,5 s, la scène n'est pas encore stabilisée. Les captures précédentes de cette série étaient donc, pour l'expo, proches de l'état final mais pas garanties stabilisées. Les captures de cette passe attendent `progress > 0,999` avant la prise (`window.__cvStandardPath`).

| Élément | Avant | Maintenant | Référence | État |
|---|---|---|---|---|
| Hauteur des trois blocs (gradins) | 118 / 74 / 20 | **62 / 40 / 12** (`HOME_HERO_TOPO.blocs`) | gradins bas, décroissants | rapprochée ; valeurs réglées **à l'œil** sur la comparaison, non mesurées |
| Panneau de données dressé (liste des chapitres) | dressé à 74° | inchangé | dressé | conforme dans le principe |
| Flancs et tranche des blocs | pleins, couleur du sol assombrie | inchangés (déjà pleins) | pleins | conforme |
| Dessus des blocs | contenu réel de la page (machine 3D, scène illustrée, visualisation) | inchangé | surface claire portant un objet 3D | **écart résiduel** : le dessus n'est pas éclairé comme sur la référence |
| Objet 3D sur le bloc supérieur | machine 3D existante du projet, petite, dans la moitié basse du dessus | inchangée | objet posé au centre du bloc | **écart résiduel** : non déplacé ni agrandi |
| Titre extrudé (« Mathieu Comtesse ») | vraie géométrie extrudée (maillage Three, pas de text-shadow) | inchangé | titre en volume, plus massif | **écart résiduel** : épaisseur d'extrusion, teinte (gris clair chez nous) et ombre non recalibrées |

Aucun asset de la référence n'a été repris : l'appareil photo posé sur son bloc supérieur est un objet propriétaire, il n'est pas reproduit ; l'objet du site reste la machine 3D existante.

Tests : `test-no-shopify --strict` PASS (73 cadres, 9 titres en volume, cadre relevé à 55°), `test-objets-3d` PASS, `test-machines` ok, `test-modes` avec son unique échec antérieur ; mobile 390 × 844 toujours 12 foyers. Comparaison : `expo-presentoirs-reference-contre-comtesse.png`.

# Passe 4 (suite) : panneau des chapitres en 3D courbée

Remarque de l'auteur : la liste des chapitres (Agentic, Sidekick, En ligne… dans la référence) est en **3D courbée, de type exponentiel**, comme le sol bleu, les titres et la courbe du premier plan. Notre panneau était un plan dressé droit (74°).

| Élément | Avant | Maintenant | État |
|---|---|---|---|
| Panneau de la liste des chapitres | quadrilatère droit (homographie du calque HTML) | surface courbe tracée point par point dans le repère du chemin (`dessinePanneauCourbe`) : bord, remplissage, texte orienté ligne par ligne ; l'angle d'élévation décroît en exp(2,2 t) depuis 74° jusqu'à environ 14° en haut | ajouté ; la courbure est lisible sur le bord droit |
| Transition | sans objet | le calque HTML s'estompe pendant que la surface courbe apparaît (rampe sur les 20 premiers pour cent de la progression), mouvement réduit : bascule immédiate | non vérifié image par image |
| Contenu | liste du DOM | liste lue dans le DOM (`nav li a` : nom et numéro), donc les vrais chapitres de comtesse.me | conforme |

Limites : l'orientation du texte est une approximation affine par ligne (la perspective n'est pas exacte à l'intérieur d'un mot) ; la loi de courbure et le coefficient de redressement (1,05 rad, hauteur du panneau multipliée par 1,55) sont réglés à l'œil, pas mesurés sur la référence ; le panneau n'a pas d'ombre portée ni d'épaisseur ; l'extraction du texte est faite une fois et ne suit pas un changement de langue en cours d'affichage.

Non traité dans cette livraison : éclairage des dessus de blocs, épaisseur/teinte/ombre du titre extrudé (le titre est déjà une vraie géométrie ; les faces visibles sont à 0,63 de luminosité et non à 1,0 comme sur la référence, cause identifiée dans `cvTextExtrude`/`shade`, non corrigée), objet 3D plus visible sur le bloc supérieur.

Tests : `test-no-shopify --strict` PASS, `test-objets-3d` PASS, `test-machines` ok, `test-modes` avec son unique échec antérieur (la position de lecture et la coïncidence à la progression 0 passent ; mobile 12 foyers). Comparaison : `expo-panneau-courbe-reference-contre-comtesse.png`.

# Passe 4 (fin) : titre extrudé et dessus des blocs

| Élément | Avant | Maintenant | État |
|---|---|---|---|
| Teinte des faces du titre | gris clair (≈ 204) : le blanc 1,0 était écrêté par le *tone mapping* du rendu (histogramme des pixels du titre : pic à 200–208) | **blanc pur** : `toneMapped:false` sur la matière du titre | corrigé |
| Teinte des flancs du titre | luminosité 0,63 | 0,42 (gris plus marqué, comme sur la référence) | réglé à l'œil |
| Épaisseur d'extrusion du titre | 140 | 190 | réglée à l'œil ; la référence n'a pas été mesurée |
| Titre en vraie géométrie 3D | oui (maillage extrudé) | inchangé | conforme à la contrainte « pas de text-shadow » |
| Dessus des blocs de l'accueil | bleu de la page (#051DAA), plus sombre que le sol éclairé | teinte translucide `rgba(60,115,255, 0,28 × rise)` sur la face haute : le contenu reste lisible, le dessus se rapproche du sol éclairé | amélioré ; n'atteint pas #1442FF (le contenu du bloc est du DOM, sous le canevas) |

Essai écarté : un mélange additif (`lighter`) sur la face haute. Il a masqué entièrement le contenu des blocs (le canevas est transparent au-dessus du DOM, l'addition y produit un aplat opaque). Remplacé par la teinte translucide ci-dessus.

Écarts qui restent : l'éclairage des dessus n'est pas un vrai éclairage (teinte uniforme) ; l'objet 3D du bloc supérieur reste la machine existante, petite ; le titre de la référence est plus massif encore et son ombre plus marquée ; extrusion et teintes non mesurées sur la référence.

Tests : `test-no-shopify --strict` PASS, `test-objets-3d` PASS, `test-machines` ok, `test-modes` avec son unique échec antérieur (position de lecture et coïncidence à la progression 0 passent ; mobile 12 foyers). Comparaison : `expo-titre-dessus-reference-contre-comtesse.png`.

# Passe 6 : animations et performance (GPU matériel)

## Mesure de fluidité sur GPU matériel

Outil : `node tools/mesure-fluidite-gpu.mjs gpu` (2498 × 1319, AMD Radeon RX 9070 XT via Direct3D 11, écran à 60 Hz). Les temps d'image sont plafonnés à 16,7 ms par la synchronisation verticale ; la grandeur utile est le temps du thread principal par image (protocole de débogage, `TaskDuration` et `ScriptDuration`).

| Version | Mode | Images en 5 s | Tâche (ms/image) | Script (ms/image) | Image max |
|---|---|---:|---:|---:|---:|
| Base PR 210 | à plat | 299 | 3,12 | 2,34 | 16,8 ms |
| Base PR 210 | expo | 299 | 7,17 | 5,77 | 16,8 ms |
| Branche, avant optimisation | à plat | 299 | 3,67 | 2,81 | 16,8 ms |
| Branche, avant optimisation | expo | 296 | **12,70** | 10,82 | **33,3 ms** (une image perdue) |
| Branche, après optimisation | à plat | 299 | 3,32 | 2,54 | 16,8 ms |
| Branche, après optimisation | expo | 299 | **6,24** | 4,83 | 16,8 ms |

Les ajouts des passes 2 à 4 avaient fait passer l'expo de 7,2 à 12,7 ms par image (+77 %). Profil CPU (200 µs) de l'état avant optimisation : quadrillage `drawFallbackGrid` 2,56 ms (mes lignes courbes : 300 colonnes × 121 projections par image), mise à jour du titre extrudé `projectPart` 2,80 ms (déjà présente sur la base), halos et branches 0,9 ms, panneau courbe 0,58 ms.

Optimisations :

- **Quadrillage** : à rangée fixe, la projection est linéaire en colonne (`x = W/2 + (col − W/2)·k`, `y` et `k` ne dépendent que de la rangée) ; les 121 rangées sont projetées une fois, les colonnes sont placées par multiplication, et les colonnes entièrement hors écran sont ignorées.
- **Titre extrudé** : les sommets ne sont recalculés que lorsque la vue change (clé : progression, rangée, taille, caméra, champ). Au repos, coût nul ; cela bénéficie aussi à la base.

Résultat : expo à 6,24 ms par image, soit **moins que la base** (7,17) malgré le contenu ajouté. Le rendu est inchangé à 0,4 % des points échantillonnés près (éléments animés).

Limites : un seul GPU, un seul écran 60 Hz ; aucune mesure sur machine modeste ni sur mobile réel ; pas de mesure de l'énergie ni de la mémoire. En rendu logiciel (SwiftShader), le rendu 3D domine (environ 260 ms par image) et masque tout le dessin 2D : ces valeurs ne sont pas comparables.

## Animations : observation de la référence (Chrome 157, trois instants)

- Caméra **immobile** : aucune parallaxe avec la souris (bords du sol, panneau et blocs identiques d'une capture à l'autre).
- Le cube filaire **tourne** (orientation différente à chaque instant).
- **Plusieurs arcs clairs** circulent en même temps, au moins un à gauche et un à droite, dans le noir de chaque côté de la bande.
- Les nœuds dérivent légèrement ; aucune info-bulle au survol d'un foyer.

| Comportement | Avant | Maintenant | État |
|---|---|---|---|
| Arc clair animé | un seul, à droite, trajet traversant le sol | **trois** arcs (anneaux 2, 3 et 4, plages d'angles, vitesses et phases propres), limités à l'extérieur de la bande du sol | rapproché ; trajets, vitesses et nombre exact **inventés** par comparaison à trois instants |
| Cube filaire | rotation lente | inchangé (0,21 et 0,17 rad/s), immobile en mouvement réduit | non comparé en vitesse (aucune vidéo) |
| Caméra | fixe | inchangée | conforme à l'observation |
| Dérive des nœuds, impulsions le long des branches, fuite au pointeur | existantes | inchangées | non comparées à la référence |
| Mouvement réduit | bascule immédiate | inchangé ; arcs et cube immobiles (temps nul) ; test `mouvement réduit` passe | conforme |

Tous les mouvements ajoutés sont déduits du temps de la page : reproductibles, sans graine aléatoire par image.

## Non fait

Vidéo de la référence (l'extension ne l'enregistre pas ici) ; comparaison fine des vitesses ; inertie du défilement ; essai sur machine modeste ; suites UX complète, de 14 tests longs, de navigation, de cohérence et de géométrie ; formule « e^(-x) cos(ωx + φ) » du bas gauche ; objet 3D sur le bloc supérieur ; éclairage réel des dessus de blocs.

Tests : `test-no-shopify --strict` PASS, `test-objets-3d` PASS, `test-machines` ok, `test-modes` avec son unique échec antérieur (retour élastique d'un nœud) ; mouvement réduit, position de lecture, coïncidence à la progression 0 et mobile 12 foyers passent. Comparaison : `expo-animations-reference-contre-comtesse.png`.

# Objet 3D du bloc supérieur et formule du bas gauche

## Formule « e^(-x) cos(ωx + φ) »

Observée sur la référence en bas à gauche, dans le noir : l'expression, la courbe amortie correspondante, et une valeur de φ qui change. Expression mathématique générique, reproduite avec notre propre code (aucun asset repris).

| Élément | Avant | Maintenant | État |
|---|---|---|---|
| Expression « e^(-x) cos(ωx + φ) » | absente | texte posé sur le plan du sol, colonne -290, page 1367 (position calculée en projetant le pixel de la référence dans notre vue, 2498 × 1319) | ajoutée |
| Courbe y = e^(-0,9x) cos(5x + φ) | absente | tracé de 64 points, 180 unités de large, sur le sol, suit la perspective | ajoutée ; coefficients (0,9 et 5) choisis, non relevés |
| Valeur de φ | absente | avance de 0,45 rad/s en boucle sur 2π, affichée avec deux décimales ; courbe et valeur restent synchronisées ; immobile (φ = 0) en mouvement réduit | ajoutée ; vitesse de la référence non mesurée |
| Taille et police | italique à chasse fixe de 15 unités | ajustées à l'œil | non comparées de façon fine |

## Objet 3D du bloc supérieur

La machine 3D du projet (silo avec horloge et pupitre, déjà présente dans le bloc « 11 machines 3D ») est l'objet de ce bloc ; l'appareil photo de la référence est un objet propriétaire, il n'est pas reproduit.

| Élément | Avant | Maintenant | État |
|---|---|---|---|
| Teinte du dessus des blocs | calque translucide du canevas, au-dessus de la 3D : il assombrissait et bleuissait aussi la machine | retirée ; éclairage par **filtre CSS `brightness(1 + 0,28 × rise)` sur le DOM des seuls blocs de l'accueil** (hors panneau) : le contenu s'éclaircit, la machine 3D ne change pas | corrigé |
| Taille de la machine en expo | 82 % de la largeur du cadre | × (1 + 0,3 × rise), donc inchangée à plat (continuité) | agrandie de 30 % en expo ; réglée à l'œil |
| Position sur le bloc | 62 % de la hauteur du cadre | inchangée | **écart résiduel** : la référence centre l'objet sur le dessus |

Écarts qui restent : la machine reste moins dominante que l'objet de la référence ; les dessus n'atteignent pas #1442FF (le filtre multiplie les canaux : le bleu de page #051DAA donne environ #0726DD, sans composante rouge ni verte supplémentaire) ; la police et la vitesse de la formule ne sont pas mesurées.

## Performance et tests

GPU matériel (RX 9070 XT, 2498 × 1319) : expo à **6,5 ms par image** sur deux répétitions, 16,8 ms au plus par image (un pic isolé à 33 ms dans une première série ne s'est pas reproduit) ; à plat 3,0 à 3,4 ms. Base PR 210 : 7,17 ms en expo.

`test-no-shopify --strict` PASS, `test-objets-3d` PASS, `test-machines` ok, `test-modes` avec son unique échec antérieur (retour élastique d'un nœud) ; mouvement réduit, coïncidence à la progression 0 et mobile 12 foyers passent. Comparaison : `expo-objet-formule-reference-contre-comtesse.png`.

# Tests complets : état partiel

Exécutés sur la branche, tous PASS : `test-site-consistency` (40 pages), `test-indicators` (14 indicateurs), `test-annual-gains`, `test-project-metadata`, `test-navigation` (102 routes), `test-native-geometry`, `test-jukebox-sequence`, `test-conveyor-motion`, `test-static-transforms`.

**Non exécutés** : `test-ux` (22 combinaisons) et les 14 tests de scène du job `runtime` (v52, v49-mobile-book, v49-seat-book, v49-features, v51-interactions, film-book-v50, ps1-v50, scene-runtime, user-room-props, scene-lifecycle, project-scroll, annual-gains-browser, motion-fit, custom-scene). Durée attendue : environ 45 minutes en rendu logiciel par passage. `docs/STABILISATION_PR203.md` indique que 13 de ces 14 tests échouaient déjà sur `main` brut pour des causes sans rapport (attente de la pièce, sélecteurs) : un passage sur la base PR 210 est nécessaire pour séparer les échecs hérités des régressions. Le pilote est prêt (une copie de `tools/` et un lien `node_modules` dans un worktree de base) mais n'a pas été lancé. `test-showcase`, `test-frame-bus` et `test-magic-geometry` utilisent un serveur en boucle locale, bloquée sur cette machine.

# Validation différentielle : 15 tests longs, branche contre base PR 210

Conditions : branche `6fd30e8` (worktree `E:\Talas-v2-wt-expo`) puis base `65de99d` (`E:\Talas-v2-wt-base`), passages séquentiels sans modification du code entre les deux ; Node 24.18, Playwright 1.61.0 (Chromium 1228), rendu logiciel (SwiftShader), mêmes variables d'environnement, même ordre, 15 minutes par test (150 s pour les deux tests qui exigent la boucle locale). Après chaque test, `git status` : **0 fichier modifié** dans les deux worktrees (aucun test ne touche aux sources). Les 12 tests de scène chargent `accueil.html` par la route `http://scene.test/` (aucun socket) ; ils ne passent pas par `index.html`, la page modifiée par la branche.

| Test | Branche | Base | Durée branche / base | Écart | Nature et cause | Gravité | Action |
|---|---|---|---|---|---|---|---|
| test-v52 | échec | échec | 10 s / 9 s | aucun | Même assertion : `HikingPoles.min[1] ≥ 0,007` (garde au sol d'un accessoire de la pièce) (héritée de la base, cat. 2) | faible | à traiter dans la pièce 3D, hors périmètre |
| test-v49-mobile-book | échec | échec | 6 s / 7 s | aucun | Même assertion : `evidence.arm.length` = 0 (pincement du livre mobile, déjà « ouvert » dans `STABILISATION_PR203.md`) (héritée de la base, cat. 2) | faible | idem |
| test-v49-seat-book | réussi | réussi | 33 s / 32 s | aucun | – | – | – | – |
| test-v49-features | échec | échec | 24 s / 23 s | aucun | Même assertion : valeur 8 attendue 0 après les feuilles tombantes (héritée de la base, cat. 2) | faible | idem |
| test-v51-interactions | réussi | **échec** | 61 s / 52 s | écart apparent | Assertion de base : `thought.gap − 34 < 2` (bulle de pensée). **Intermittent** : rejoué 3 fois, branche 3/3 réussie (4/4 avec le passage initial), base 2/3 réussie (2/4 avec le passage initial). `STABILISATION_PR203.md` le décrit déjà comme intermittent (écart 127 px contre 34 px) | cat. 2 (intermittent hérité) ; **non attribuable à la branche**, 4 essais ne prouvent pas une amélioration | faible | suivre ; ne pas compter comme amélioration |
| test-film-book-v50 | réussi | réussi | 55 s / 54 s | aucun | – | – | – | – |
| test-ps1-v50 | réussi | réussi | 19 s / 19 s | aucun | – | – | – | – |
| test-scene-runtime | réussi | réussi | 112 s / 107 s | aucun | – | – | – | – |
| test-user-room-props | réussi | réussi | 56 s / 56 s | aucun | – | – | – | – |
| test-scene-lifecycle | réussi | réussi | 132 s / 131 s | aucun | – | – | – | – |
| test-project-scroll | échec | échec | 22 s / 22 s | aucun | `net::ERR_CONNECTION_TIMED_OUT` sur `http://localhost:<port>/index.html?uxtest` : serveur en boucle locale | **cat. 4 : non exécutable ici** (pare-feu) | n'a pas pu s'exécuter, aucune conclusion sur la branche | l'exécuter sur une machine sans blocage ou en CI |
| test-annual-gains-browser | réussi | réussi | 3 s / 3 s | aucun | – | – | – | – |
| test-motion-fit | réussi | réussi | 172 s / 183 s | aucun | – | – | – | – |
| test-custom-scene | échec | échec | 191 s / 196 s | aucun | Même assertion : « Shoes must clear both the floor and front cushion » (mêmes valeurs de garde au sol : 0,008) (héritée de la base, cat. 2) | faible | hors périmètre |
| test-ux (22 combinaisons) | non exécutable | non exécutable | 22 s / 22 s | aucun | `net::ERR_CONNECTION_TIMED_OUT` sur `http://localhost:<port>/projet-moteur44.html?uxtest` | **cat. 4 : non exécutable ici** | aucune des 22 combinaisons n'a tourné | idem |

Synthèse : **0 régression introduite par la branche** ; 5 échecs hérités de la base, identiques à l'assertion près (v52, v49-mobile-book, v49-features, custom-scene, et l'intermittent v51 pour la base) ; 2 tests non exécutables ici (boucle locale) ; 0 amélioration démontrée ; 7 réussites communes. Les tests Playwright des chapitres du chemin ne couvrent pas `index.html` en dehors de `test-modes`, `test-no-shopify`, `test-objets-3d` et `test-machines` (déjà rejoués).

Réserve : les échecs hérités reposent sur la comparaison d'assertion ; leur cause profonde n'a pas été recherchée dans le code de la pièce 3D (hors périmètre de la branche). Les tests qui n'exercent pas `index.html` ne peuvent pas détecter une régression de l'accueil.

# Phase 3 : corrections visuelles restantes

## A. Éclairage et profondeur des blocs

| Élément | Avant | Maintenant |
|---|---|---|
| Dessus | `brightness(1 + 0,28 × rise)` | `brightness(1 + 0,40 × rise)` (filtre CSS sur le DOM du bloc ; la machine 3D n'est pas touchée) |
| Flancs gauche et droit | `#041795` uni | `#02105f` : nettement plus sombres que les dessus |
| Tranche avant | `#0a27c4` uni | dégradé vertical `#1236d6` vers `#071d8a` : lumière en haut, ombre en bas |
| Arêtes | blanc à 0,5 | blanc bleuté `rgba(210,225,255,.7)` |

Différence perceptible entre dessus, flancs et arêtes : oui sur la capture avant/après (`expo-blocs-avant-apres.png`). Limite : pas de vraie source lumineuse ni de normales ; le dessus est du DOM, éclairé par un filtre uniforme. Aucune comparaison de luminosité mesurée avec la référence.

## B. Objet 3D du bloc supérieur

Recalibrage conjoint de la taille et de la position (hors fit initial, valable à plat : inchangé) : échelle × (1 + 0,5 × rise) au lieu de 1 + 0,3 ; point d'appui à 50 % de la hauteur du cadre au lieu de 62 % (`.62 − .12 × rise`), donc remonté vers le centre du dessus. Horizontalement la machine était déjà centrée sur le cadre. Orientation : la machine garde son azimut et son tangage de scène (`entry.view`) ; non recalibrée. Ombre : celle de la machine existe déjà (maillage d'ombre aplati) et suit le déplacement. Écarts : l'objet reste moins dominant que celui de la référence (la machine est un silo avec pupitre, pas un objet compact) ; la position et l'échelle restent réglées à l'œil.

## C. Animations de l'accueil : inventaire et limites

| Animation | Valeur chez nous | Mesurée sur la référence ? |
|---|---|---|
| Bascule à plat vers expo | 800 ms, lissage de cinquième ordre, réversible | **oui** (`duration` de la configuration) |
| Départ de la montée des hauteurs | 35 % de la progression | **oui** (`riseAt`) |
| Impulsions sur les lignes de grille | vitesse 495 unités/s, longueur 300, la moitié des lignes, luminosité 0,4 ; absentes en mouvement réduit | **oui** (configuration : `pulses`), **ajoutées dans cette passe** ; la répartition entre lignes est notre choix |
| Défilement lissé | approche exponentielle, taux 10 s^-1 (constante de temps 100 ms) | **oui, grossièrement** : 6 échantillons à environ 11 images/s sur un défilement de 500 px ; taux estimé, pas lu |
| Rotation du cube | 0,21 et 0,17 rad/s (périodes 30 s et 37 s) | non : trois instants seulement, aucune vidéo |
| Arcs clairs (trois) | 0,045 / 0,034 / 0,06 tour par seconde (périodes 22, 29 et 17 s) | non : leur existence et leur multiplicité seulement |
| Valeur de φ de la formule | 0,45 rad/s (période 14 s) | non |
| Impulsions sur les branches éditoriales | une par branche, période 3,3 s | non |
| Dérive des nœuds | périodes 15,7 s et 19 s, amplitude 2 % du rayon | non |
| Fuite au pointeur et retour élastique | rayon 150 px, 18 px, retour exp(−9 t) | non |
| Relevé d'un cadre | ressort raideur 120, amortissement 17 | non |

Les vitesses non mesurées ne sont **pas** présentées comme reproduites : il faudrait une vidéo de la référence (l'extension ne l'enregistre pas ici) ou des relevés image par image.

## D. Inertie du défilement

Nouveau module `refonte/defilement.js`. Relevé de la référence (défilement de 500 px, `scrollY` échantillonné) : reste à parcourir 231, 107, 40, 18, 6 px puis 0, rapports successifs de 0,33 à 0,46 par 75 à 115 ms : approche exponentielle sans rebond, constante de temps d'environ 100 ms. Reprise : à chaque coup de molette (delta de 40 px ou plus, ou ligne/page) la cible avance et la page la rejoint par `courant += (cible − courant) × (1 − e^(−10·dt))`, sans dépassement, arrêt net sur la cible. Non intercepté : pavé tactile (petits deltas), clavier, ancres, tactile, éléments défilables eux-mêmes, champs de saisie, zoom (Ctrl), mouvement réduit, boîtes de dialogue ouvertes. Tout défilement venu d'ailleurs resynchronise la cible (pas de lutte entre deux animations).

Nouveau test `tools/test-defilement.mjs` (GPU) : arrivée exacte à 500 px, progression monotone, maximum 500,0 px (aucun dépassement), 90 % de la course en 216 ms (attendu environ 230 ms), pas de 34 px au début contre 1,1 px à la fin, petit delta natif, touche Fin non gênée, molette cohérente après le clavier, mouvement réduit natif : **PASS**. Continuité avec la caméra : le défilement pilote le chemin par `scrollY` ; la position de lecture reste exacte (test `test-modes`). Limites : estimation du taux sur un relevé grossier ; transition entre chapitres non comparée à la référence ; effet sur les autres pages du site non testé (le module n'est chargé que par `index.html`).

# Phase 4 : performance (GPU matériel, RX 9070 XT, pas de rendu logiciel)

Outils : `tools/mesure-fluidite-gpu.mjs`, `tools/mesure-chapitres-gpu.mjs`, profileur CPU de Chrome (échantillonnage 200 à 300 µs).

| Mesure | Branche | Base PR 210 |
|---|---:|---:|
| Expo, régime établi, 2498 × 1319 (tâche, ms/image) | 6,2 à 7,4 selon les passages | 7,2 |
| À plat, régime établi (tâche, ms/image) | 2,9 à 4,1 | 3,1 |
| Balayage rapide de chapitres, 1920 × 1080, 8 s de molette (tâche, ms/image) | 21,4 | 17,3 |
| Images de plus de 25 ms sur 8 s | 83 sur 410 | 118 sur 334 |
| Image la plus longue | 383 ms | 367 ms |
| p95 / p99 du temps d'image | 50 / 100 ms | 67 / 200 ms |
| Tas JavaScript : pic, puis après ramasse-miettes | 87 Mo puis 55 Mo | 78 Mo puis 59 Mo |
| Nœuds DOM avant et après | 10 317 puis 10 395 | 10 316 puis 10 413 |

Lecture : en régime établi l'expo est au niveau de la base ou en dessous. En balayage rapide, les deux versions sont limitées par le CPU (au-dessus de 16,7 ms par image) : le profil montre que le coût vient de la compilation des programmes WebGL à la première apparition des machines (`setProgram`, `getProgram`, `getProgramInfoLog`, environ 4 ms par image, **hérité de la base**), pas du décor ajouté (quadrillage 0,7 ms, panneau courbe 0,7 ms avant culling). Le panneau courbe est maintenant ignoré hors champ ; aucun gain mesurable sur le balayage. La branche perd moins d'images que la base mais coûte 23 % de plus en moyenne : les deux chiffres sont rapportés. Pas de fuite mémoire visible (tas et nœuds DOM stables après ramasse-miettes). Nombre de calculs géométriques : environ 1 000 projections par image pour les arcs, 250 pour le quadrillage (rangées), 150 pour le panneau, 100 pour la courbe ; aucun compteur instrumenté, ordres de grandeur d'après le code. Aucun objectif d'images par seconde n'est annoncé : une seule machine, un écran 60 Hz ; les 60 images par seconde sont tenues en régime établi, pas en balayage rapide.

Tests après ces modifications : `test-defilement` PASS ; `test-no-shopify --strict` PASS, `test-objets-3d` PASS, `test-machines` ok, `test-modes` avec son unique échec antérieur (retour élastique d'un nœud ; position de lecture, mouvement réduit, clavier et mobile passent). Les 15 tests longs n'ont pas été rejoués après ces modifications (ils n'exercent pas `index.html`).

# Liste des chapitres en 3D exponentielle, jonctions des blocs, hauteur du titre

Observation de la référence (Chrome 157, zooms sur la liste des chapitres et les blocs) : la liste n'est pas un panneau posé à part. C'est le **prolongement du dessus du premier bloc** : à plat au raccord (à la hauteur du dessus, sur son arête arrière), puis relevé suivant une loi exponentielle jusqu'à un mur presque vertical. Les dernières lignes (Exécution, Développeur), sur la partie quasi plate, sont écrasées par la perspective. Les blocs se raccordent en escalier : la face avant d'un bloc descend jusqu'au dessus du suivant.

| Élément | Avant | Maintenant | État |
|---|---|---|---|
| Liste des chapitres | surface détachée, hinge au sol, redressée à 74° puis couchée | surface accrochée à l'arête arrière du bloc supérieur (rangée et hauteur du bloc, largeur du bloc), angle d'élévation de 0,05 à 1,45 rad en `(e^(2,2 t) − 1)/(e^2,2 − 1)`, longueur développée = distance page entre la liste et le bloc | refaite ; exposant, angles et longueur réglés à l'œil sur les zooms |
| Jonction des blocs | trous entre blocs, le sol visible entre deux dessus | le dessus d'un bloc s'étend jusqu'à l'arête arrière du suivant (`r1 = r0` du suivant) : marge vide autour du contenu, face avant continue d'un dessus au suivant | ajoutée |
| Jonction liste et bloc | aucune | confondue avec l'arête arrière du bloc supérieur | ajoutée |
| Visuels sur la face supérieure | contenu du bloc en DOM plaqué sur le dessus | inchangé (déjà sur le dessus), maintenant bordé par la marge de jonction | à confirmer par l'auteur |
| Hauteur (extrusion) du titre « Mathieu Comtesse » | 190 | **95** (divisée par 2, sur demande) | fait ; si « hauteur » désignait la taille des lettres, à reprendre |

Écarts qui restent : la jonction entre le sol et le pied des blocs n'est pas modélisée (les blocs reposent sur le plan) ; la liste ne suit pas la loi exacte de la référence (non mesurée) ; le texte est orienté ligne par ligne par une approximation affine.

Tests après ces changements : `test-no-shopify --strict` PASS, `test-objets-3d` PASS, `test-machines` ok, `test-defilement` PASS, `test-modes` avec son unique échec antérieur (retour élastique d'un nœud) ; position de lecture, coïncidence à la progression 0, mouvement réduit et mobile passent. Expo à 6,7 ms par image sur GPU (base 7,2). Captures : `expo-quartpipe-liste.png`, `expo-comtesse-2498x1319-titre-moitie.png`.

# Phase 5 bis : branches et ramifications 3D du graphe de l'accueil

## Observation de la référence (Chrome 157, zooms sur un foyer en expo, trois instants)

- Un foyer émet un éventail d'environ 30 à 40 rayons fins, **presque droits avec une légère courbure** ; la luminosité est plus forte près du foyer et s'estompe vers l'extrémité ; chaque rayon se termine par un petit point.
- Quelques rayons plus vifs (cyan) mènent aux vignettes encadrées ; de longues lignes faibles relient les foyers ; des **ombres sombres portées au sol** accompagnent branches et vignettes.
- Pas d'info-bulle au survol d'un foyer.
- **Non observé** : épaisseurs et longueurs chiffrées (relevé visuel seulement), impulsions lumineuses, croissance et réaction aux changements de chapitre, comportement pendant les transitions : aucune vidéo de la référence n'est exploitable avec l'extension (captures fixes uniquement). Ces comportements sont donc **conçus, pas reproduits** ; ils sont décrits comme tels.

## Architecture (moteur existant, `Ciel` dans `refonte/moteur.js`, pas de moteur parallèle)

| Élément | Réalisation |
|---|---|
| Quantités | **12 foyers, 83 nœuds éditoriaux, 505 nœuds**, inchangés dans cette passe. Note d'historique : la base PR 210 avait 295 nœuds (200 décoratifs) ; la PR 212 les a portés à 505 (410) d'après les 30 à 40 rayons observés par foyer ; cette passe ne les modifie plus |
| Niveaux | niveau 0 : 83 branches éditoriales (une par vrai contenu) ; niveau 1 : 266 rayons fins issus des foyers ; niveau 2 : 108 ramifications ; niveau 3 : 36 ramifications tertiaires (calculés sur les 493 branches de l'état visible au test) |
| Géométrie | chaque branche est une **courbe de Bézier quadratique dont le point de contrôle est calculé dans l'espace** (courbure dans le plan du sol, arche en hauteur) puis projeté ; elle n'est donc plus un segment ; 453 des 493 branches visibles s'écartent de plus de 0,8 px de leur corde |
| Ramifications | elles partent d'un point `t0` (35 à 85 %) de la courbe de leur parent, dans son sens, tournées d'un angle propre ; raccord vérifié à 0,000 px près (144 ramifications) ; elles suivent donc le déplacement, la croissance et la caméra de leur parent |
| Déterminisme | courbure, arche, `t0`, angle, longueur, vitesse d'impulsion dérivent de la phase de chaque nœud (aucun tirage aléatoire supplémentaire : les positions des 83 nœuds éditoriaux sont celles de la version précédente) ; même donnée, même géométrie (empreinte identique sur deux chargements) |
| Hiérarchie visuelle | éditoriales : dégradé foyer vers carte, épaisseur 1,15 px (2,4 px survolée) ; niveau 1 : 1 px à 0,62 d'opacité, second passage plus clair sur le premier tiers ; niveau 2 : 0,85 px à 0,46 ; niveau 3 : 0,7 px à 0,34 ; racine plus discrète ; points terminaux de taille décroissante ; mélange additif (le centre des foyers s'éclaire) |
| Impulsions | un segment de quatre points pris **sur la courbe réelle** ; à l'arrivée en `t0` d'une ramification, l'impulsion lui est transmise, puis à ses propres ramifications ; portée par les 83 branches éditoriales et environ 22 % des rayons ; vitesse propre à chaque branche ; absentes en mouvement réduit |
| Croissance | les branches grandissent depuis le foyer, les ramifications après leur parent (jamais avant) |
| Ombres | en expo, ombre portée au sol de chaque branche éditoriale (courbe) et de sa carte (ellipse) |
| Foyers | liaison en arche avec la racine, dégradée ; halo |
| Interactions | survol d'une carte : sa branche et ses descendantes sont en évidence, les autres branches du foyer sont estompées (27 estompées, 4 en évidence au test) ; **survol d'une trajectoire** (à 7 px de la courbe d'une branche éditoriale) : la branche est identifiée et mise en évidence sans carte survolée ; **seules les cartes restent cliquables** (pas de lignes cliquables arbitraires) ; saisie, retour élastique, curseurs inchangés |
| Chapitre actif | lu au défilement (`__cvStandardPath.chapitreActif`, par exemple « shop ») : les branches et le halo du foyer correspondant sont plus présents, les autres foyers s'estompent légèrement |
| Performance | tracés par lots (un seul tracé par niveau et par classe de rendu au lieu d'un par segment), aucune allocation par image (la géométrie est écrite dans les nœuds) |

Écart avec la demande : le moteur d'origine est un canevas 2D ; l'instancing, les `BufferGeometry` et les shaders personnalisés n'ont **pas** été introduits (ils auraient exigé un second moteur). Les points de contrôle sont des points de l'espace projetés, mais la courbe elle-même est une Bézier d'écran : la perspective n'est pas exacte à l'intérieur d'une branche.

## Tests

`tools/test-branches.mjs` (nouveau, **PASS**, 10 contrôles) : déterminisme, quantités, hiérarchie, raccords, courbes, survol de carte, survol de trajectoire, chapitre actif en expo, aucune erreur de page. Autres tests : `test-modes` **PASS en entier** (y compris « relâché, le nœud revient à sa place », l'échec historique : il passe maintenant ; cause non établie, à surveiller comme intermittent), `test-no-shopify --strict` PASS (12 foyers, 83 nœuds éditoriaux, 505 nœuds), `test-objets-3d` PASS, `test-machines` ok, `test-defilement` PASS.

## Performance (RX 9070 XT, comparé à la base PR 210 et à la version précédente)

| Mesure | Base PR 210 | Avant cette passe | Après |
|---|---:|---:|---:|
| Expo, régime établi (ms/image, tâche) | 7,17 | 6,2 à 7,4 | 7,2 à 7,9 (deux passages) |
| À plat, régime établi | 3,12 | 2,9 à 4,1 | 3,2 à 3,5 |
| Balayage rapide, 1920 × 1080 (ms/image) | 17,3 | 21,4 | 20,8 |
| Images de plus de 25 ms sur 8 s | 118 sur 334 | 83 sur 410 | 64 sur 407 |
| Tas JS après ramasse-miettes | 59 Mo | 55 Mo | 59 Mo |

Lecture : coût équivalent à la version précédente avec trois fois plus de structure ; l'expo reste à 60 images par seconde en régime établi (aucune image au-delà de 16,8 ms) ; en balayage rapide le goulot reste la compilation des programmes WebGL des machines, hérité de la base. Mesures sur une seule machine à 60 Hz.

## Comparaisons et preuves

Captures : `branches-avant-plat.png`, `branches-apres-plat.png`, `branches-avant-expo.png`, `branches-apres-expo.png`, zooms `branches-zoom-plat.png` et `branches-zoom-expo.png`. Séquence : `branches-sequence.webm` (12 s, GPU : croissance, impulsions, survol de trois cartes, bascule en expo et retour) et deux images extraites (`branches-video-croissance.png`, `branches-video-survol.png`). Comparaison avec la référence : qualitative (zooms de la référence : éventail, courbure légère, dégradé, ombres) ; **pas de comparaison chiffrée des épaisseurs, longueurs ni vitesses, et pas de séquence vidéo de la référence** : ces critères ne sont pas déclarés conformes.

Écarts qui restent : branches un peu trop courbes par rapport au « presque droit » de la référence (amplitude `cv` ≤ 0,25 de la longueur, à réduire si la référence le confirme) ; ombres au sol non comparées en intensité ; la nature exacte des impulsions de la référence est inconnue ; le chapitre actif n'a pas d'équivalent observé sur la référence ; le mouvement des connexions pendant les déplacements de caméra suit la géométrie mais n'a pas été comparé.

# CI définitive sur la branche d'intégration (commit `039a901`) et correction de `syntax`

## Cause du contrôle `syntax` (étape « Check scene entrypoints »)

Le contrôle cherchait `js/room.js?v=` dans `index.html`. La pièce 3D est chargée par `accueil.html` → `refonte/main.js` → `../js/room.js?v=room-art-v2` ; `index.html` est l'accueil Fall 26 et ne la charge plus depuis la consolidation de la PR 209 (commit `ce2241f`, « Ma pièce » supprimée). L'échec était présent sur `10a5015` et `65de99d`. Le contrôle était donc **obsolète**, pas la page défectueuse ; aucune référence factice n'a été ajoutée. Correctif : `tools/test-entrypoints.mjs` (résout les chaînes d'entrée de `accueil.html` et `index.html`, vérifie que tout import existe et que l'étiquette de version de `moteur.js` est unique ; testé par mutation : il échoue si un fichier manque ou si une version diverge) et l'étape du workflow vérifie `accueil.html` → `refonte/main.js` → `js/room.js`. Les commandes exactes de l'étape, exécutées localement sous `set -euo pipefail`, passent.

## Résultats définitifs (run du commit `039a901`)

| Workflow, job | Résultat | Détail |
|---|---|---|
| Site integrity, `integrity` | réussi | – |
| THALEOLITHIC publication, `publication` | réussi | – |
| Scene smoke check, `syntax` | **réussi (corrigé)** | échouait sur `10a5015`, `65de99d` et `70d87cf` |
| Machines 3D, `machines` | réussi | – |
| Scene smoke check, `runtime` | échec hérité | 4 étapes : « screen activity locks, Japanese props and PS1 library » (v52), « mobile gestures and physical photo book » (v49-mobile-book), « supplied props, power strip, foliage, PS1 sounds and financial emails » (v49-features), « customized furniture, props and motion » (custom-scene) ; ce sont exactement les 4 échecs reproduits localement sur la base PR 210 avec la même assertion |
| Machines 3D, `ux` | échec intermittent, non attribuable | essai 1 : `finance desktop` (pause de la machine) ; essai 2 : `finance desktop` passe, `powerbi mobile` échoue (glissement du tiroir) ; 42 à 43 combinaisons sur 44 passent à chaque fois |

Intermittence de `ux` : quatre exécutions, quatre combinaisons différentes en échec : `vmvre mobile` (base `65de99d`, run 43490938308), `suivi mobile` (base `10a5015`, run 43442895198), `finance desktop` (essai 1 de `039a901`), `powerbi mobile` (essai 2). Même profil que l'échec « `cerfa mobile`, glissement du tiroir, sans cause de site identifiée » déjà noté dans `docs/PERFORMANCE_V5.md`. Ces pages (`projet-*.html`) ne chargent ni `index.html` ni `refonte/defilement.js` ni le graphe. La cause profonde n'a pas été recherchée (tests sensibles au temps, rendu logiciel de CI). Le run précédent `43615979448` (commit `70d87cf`) a été annulé par la nouvelle poussée (concurrence `cancel-in-progress`) ; son résultat `runtime` n'a donc pas été relevé, mais il montrait les mêmes étapes en échec.

Classement : 0 régression de la branche ; 1 échec corrigé (`syntax`) ; 4 échecs hérités et stables (`runtime`) ; 1 échec intermittent hérité (`ux`) ; aucune amélioration revendiquée en dehors de `syntax`.

## Preuves tirées du JSON brut (`shopify-fall26-effets-2026-11-13T15-17-39-071Z.json`)

Session de 304,8 s, fenêtre 1 487 × 1 319 px, 8 759 événements, 4 500 échantillons de style (de 188,8 s à 304,8 s). Le fichier ne contient aucune image : tout ce qui se passe dans les canevas reste hors de sa portée.

Certitude : **OBSERVÉ** (lu dans les données), **INFÉRÉ** (déduit, à confirmer), **NON DOCUMENTÉ**.

| Effet | Preuve brute | Instants | Certitude | Conséquence dans le code |
|---|---|---|---|---|
| Défilement lissé à la molette | 398 molettes, 1 215 défilements ; après le dernier cran la page défile encore 591 ms (médiane), moitié du reste en 148 ms, 90 % en 362 ms | toute la session | OBSERVÉ pour les durées, INFÉRÉ pour la forme (sortie cubique de 600 ms : 124 ms et 322 ms) | `refonte/defilement.js`, nouveau |
| Curseur `grab` et `grabbing` | 44 et 6 échantillons, tous sur `div.game-grab` (mini-jeu), aucun sur le graphe | 271 s | OBSERVÉ | la saisie des nœuds du graphe (PR 210) n'est **pas** un comportement de la référence ; elle est conservée comme ajout propre au site |
| Curseur `crosshair` | 25 mouvements, tous sur un graphique de carte (`group/chart`), aucun sur le graphe de l'accueil | divers | OBSERVÉ | le viseur posé sur le graphe de l'accueil (PR 210) est retiré |
| Curseur sur le graphe et les canevas | `auto` (94 mouvements sur `canvas`, 160 sur `#home-html-in-canvas`) | divers | OBSERVÉ | curseur normal sur le graphe, main seulement sur un nœud saisissable |
| Libellé qui suit le pointeur | transition `left 0.12s ease-out, top 0.12s ease-out` (30 échantillons) | 188 s à 304 s | OBSERVÉ | le libellé de survol des vignettes suit avec ce retard |
| Fondu d'état | `opacity 0.15s cubic-bezier(0.65, 0, 0.35, 1)` (390 échantillons) ; `color 0.15s` (136) | idem | OBSERVÉ | durées reprises pour les libellés et survols |
| Apparition des cartes | `scale 0.55s cubic-bezier(0.2, 0.7, 0.2, 1)`, retards échelonnés de 0,36 s à 0,96 s | idem | OBSERVÉ | courbe de référence pour les apparitions ; non appliquée aux fiches du site, qui ont leur propre mise en page |
| Survol de bouton | `background-size 0.25s cubic-bezier(0.2, 0.7, 0.2, 1)`, `color 0.2s`, `scale 0.1s` | idem | OBSERVÉ | non repris (boutons propres au site) |
| Bouton du mode expo | clic sur `html-in-canvas-corner-tip` à 123,09 s, défilement à 28 132 px | 123 s | OBSERVÉ pour le clic ; l'effet visuel est NON DOCUMENTÉ dans le JSON | voir captures au ralenti ci-dessous |
| Flou d'arrière-plan (verre CSS) | aucun `backdrop-filter` différent de `none` dans les 4 500 échantillons | 188 s à 304 s | OBSERVÉ (absence, sur les éléments échantillonnés) | aucun verre CSS à reproduire ; le reflet simulé des cadres reste un ajout propre au site |
| Transformations CSS 3D | `matrix3d` uniquement sur `button.game-start` (mini-jeu) | 272 s | OBSERVÉ | l'inclinaison des cartes n'est pas faite en CSS sur la référence : elle vit dans le canevas |
| Clavier | touches `d` (28), `a` (22), `z` (14), `q` (2), `e` (1), toutes après 271 s | fin de session | OBSERVÉ ; commandes du mini-jeu | sans objet (mini-jeu non repris) |
| Tâches longues | 154, médiane 69,5 ms, maximum 341 ms | toute la session | OBSERVÉ (fil principal, avec instrumentation) | ne dit rien de la cadence d'images |
| Trajectoire de caméra, croissance des branches, reflets | aucune donnée | sans objet | NON DOCUMENTÉ dans le JSON | voir captures |

## Observations visuelles de la référence (captures faites pendant la PR suivant la 210)

Banc : Chromium 153 sans tête, WebGPU logiciel (SwiftShader), DPR 1, réseau direct, page publique `https://www.shopify.com/editions/fall2026`. Le rendu logiciel met plusieurs secondes par image ; pour échantillonner une animation, l'horloge de la page (`performance.now`, `Date.now`, horodatage des images) est ralentie d'un facteur 300 juste avant l'action. Les captures de la référence ne sont pas versées dans le dépôt.

| Observation | Conditions | Résultat | Certitude | Effet sur le code |
|---|---|---|---|---|
| Accueil à plat, graphe rendu | 1 000 × 640 | 11 foyers carrés bleus, un anneau au centre, branches bleues dont certaines tirant sur le vert, points bleus au bout des branches, vignettes seulement pour les contenus illustrés, nom du foyer suivi d'un nombre gris, aucun cercle au sol | OBSERVÉ | CORRIGÉ : `Ciel` en mode `plat` reprend ces règles |
| Accueil en dessous de 940 px de large | 900 × 580 | autre mise en page : titre horizontal, foyers rangés en grille, nom sous le foyer, pas de bouton de mode expo | OBSERVÉ | À AMÉLIORER : le graphe mobile du site garde une disposition rayonnante |
| Défilement lissé | classe `lenis` sur `<html>` | la référence utilise un défilement lissé | OBSERVÉ | CONFIRMÉ : cohérent avec la queue de 591 ms mesurée dans le JSON |
| Bouton « Expo Mode » | 1 100 × 700 | masqué sur l'accueil (`visibility: hidden`), visible une fois dans un chapitre (défilement à 3 000 px) | OBSERVÉ | CONFIRMÉ : sur le site le bouton reste visible partout, écart assumé |
| Bascule en mode expo | clic réel sur le bouton, 10 images sur 0,5 s d'animation puis état à 9 s | une image de transition montre l'accueil recomposé par-dessus la page, puis la page reste à plat ; le mode expo ne s'établit pas dans ce banc | NON OBSERVABLE ici | la durée et la courbe de la bascule du site (0,9 s) restent un choix interne |
| Trajectoire de caméra, cadres relevés, verre en mode expo | sans objet | dépendent du mode expo, qui exige l'API expérimentale « HTML dans le canevas » avec une vraie carte graphique | NON OBSERVABLE ici | seule référence : la capture de l'accueil expo fournie par Mathieu |
| Transition entre chapitres à plat | vidéo fournie par Mathieu (24 s) | foyer fixe, branches longues, titre en contour rempli de droite à gauche, branche vers le premier contenu, dégradé de couleur | OBSERVÉ (vidéo) | CONFIRMÉ depuis la PR 209 |

### Limite exacte de la capture

Le mode expo de la référence repose sur l'API expérimentale de dessin d'éléments HTML dans un canevas. Avec l'indicateur `CanvasDrawElement` activé, l'API est présente dans le banc et le clic est accepté, mais la scène ne s'établit pas en rendu logiciel. Une capture du mode expo demande donc un navigateur avec carte graphique matérielle, que cet environnement n'a pas.

## Préparation de main (sans fusion)

État relevé le 2026-11-14 : `origin/main` = `52bddbc`, intégration = `1169288`, base commune `90f6b5d`. `main` a 14 commits que l'intégration n'a pas (THALÉOLITHIC V23.1 à V24.4, PR 204 et 205) ; l'intégration en a 151 que `main` n'a pas.

- **Recouvrement de fichiers :** aucun. Les 237 fichiers touchés par `main` sont sous `thaleolithic/` (227), `tools/` (9 scripts `*thaleolithic*` et `test-unga-publication.mjs`) et `.github/workflows/unga-web.yml`. L'intégration ne touche aucun d'eux.
- **Simulation :** `git merge-tree --write-tree origin/claude/integration-fall26 origin/main` réussit sans conflit (arbre `cc83597`). Rien n'a été créé, poussé ni fusionné.
- **Véhicule :** la PR 209 (`main` ← `claude/integration-fall26`, brouillon) reste la bonne. Plan : fusionner `origin/main` dans l'intégration (commit de fusion, sans réécriture d'historique ni force), attendre la CI, puis la PR 209 devient fusionnable.
- **Point d'attention :** `unga-web.yml` et les tests THALÉOLITHIC arrivent avec la fusion ; leur CI sera exécutée pour la première fois sur l'intégration et pourrait révéler des échecs sans lien avec Fall 26.
- **Statut :** en attente de l'autorisation explicite pour fusionner `main` dans l'intégration puis pour fusionner la PR 209.

# Passe de contrôle après les PR 211 à 220 (base `41ad3c6`, `main`)

Le pack de reprise visait la tête `65de99d` de la PR 210. Elle est dépassée : la PR 210 (`3587e29`) et la chaîne des PR 211 à 220 sont fusionnées dans `main`. Cette passe part donc de `main` et ne refait pas les phases déjà livrées (JSON brut exploité ci-dessus, captures Chrome 157, branches 3D, défilement lissé, mesures GPU).

| Effet | Preuve brute (JSON du 13 novembre) | État avant | Action | État |
|---|---|---|---|---|
| Curseur sur le graphe de l'accueil, hors nœud | `pointermove` sur les canevas : `auto` 265, `default` 15, `pointer` 2, **`crosshair` 0** ; `crosshair` seulement sur un graphique de carte (41) | la matrice déclarait le viseur retiré, mais `refonte/hero-graph.js` le posait encore | viseur retiré, curseur normal ; main ouverte et fermée conservées sur les nœuds (ajout propre au site) ; nouveau contrôle dans `tools/test-modes.mjs` | CORRIGÉ (OBSERVÉ) |
| Défilement lissé, temps de réponse | 43 gestes isolés : à partir du dernier cran, 50 % de la course à 122 ms, 90 % à 279 ms, arrêt à 629 ms (médianes) ; environ 6 événements `scroll` par geste, soit un pas d'environ 100 ms | modèle exponentiel, constante de temps 100 ms (50 % à 69 ms, 90 % à 230 ms, arrêt vers 660 ms) | aucune : l'écart de 50 ms aux deux seuils correspond au demi-pas d'échantillonnage ; l'arrêt concorde | CONFIRMÉ (INFÉRÉ pour la forme de la courbe) |
| Graphe sous 940 px de large | captures de la passe précédente : titre horizontal, foyers en grille, nom sous le foyer | disposition rayonnante : à 390 px foyers coupés aux bords et numéros seuls ; à 900 px libellés superposés | grille sous 940 px de fenêtre (2 colonnes sous 520 px de canevas, 4 au-delà), dernière rangée centrée, foyer central masqué, nom entier sous chaque foyer et borné au cadre, 56 px réservés au bouton du chemin 3D ; titre déjà horizontal ; coût de dessin inchangé (900 px : 2,14 ms contre 2,14 ; 390 px : 1,52 contre 1,67, rendu logiciel) ; contrôle ajouté à `test-modes` ; capture `docs/fall26-evidence/accueil-grille-moins-940-avant-apres.png` (avant, après à 390 puis 900 px) | CORRIGÉ (OBSERVÉ pour le principe ; nombre de colonnes et espacements choisis par nous) |

Tests de cette passe (Chromium sans tête, rendu logiciel, aucun chiffre de cadence revendiqué) : `test-modes` PASS (20 contrôles, dont le retour élastique, en échec auparavant), `test-branches` PASS, `test-entrypoints` PASS, `test-no-shopify --strict` PASS (0 requête), `test-objets-3d` PASS, `test-machines` ok (onze machines), `test-navigation` PASS (102 routes), `test-site-consistency` PASS (40 pages), `test-defilement` PASS seul (2 échecs quand il tourne en parallèle d'une autre suite : sensible à la charge du banc).

`test-ux` (11 fiches machines, deux tailles) : non conclu, coupé à 25 min sans sortie dans ce banc ; il n'exerce pas l'accueil.

## Suite de la passe : règles perdues à une fusion, transitions et libellé de survol

Constat : les commits `c62c36b` et `25ef8fc` (branche `claude/fall26-preuves-pr210`, fusionnée) avaient calé le graphe à plat sur la capture de la référence, retiré le viseur et donné un retard au libellé de survol. La réécriture des branches en courbes 3D (`d52304b`) les a écrasés : la matrice les déclarait « CORRIGÉ » alors que le code ne les contenait plus. Ils sont reportés sur le moteur actuel et couverts par des contrôles.

| Effet | Preuve | Avant cette passe | Maintenant | État |
|---|---|---|---|---|
| Rendu du graphe à plat | capture de la référence (`expo-ref-chrome157-a-plat.jpg`) : traits bleus fins, certains foyers verts, anneau au centre, pas de cercle au sol, nom contre le foyer suivi d'un nombre gris | branches blanches, gerbe centrale lumineuse, cercles et tiges au sol, numéro et nom sous le cercle, libellés superposés | option `plat` du moteur : traits bleus, un foyer sur trois vert, anneau central sans halo, aucune trace au sol, contenu sans image en point, nom à droite du foyer et nombre de contenus en gris ; envergure portée à 44 % de la largeur ; courbes des branches conservées (observées en zoom sur la référence) | CORRIGÉ (OBSERVÉ ; teintes et proportion de foyers verts choisies à l'œil) |
| Libellé de survol | JSON : `left 0.12s ease-out, top 0.12s ease-out` sur l'infobulle (30 échantillons) ; opacité `0.15s cubic-bezier(0.65, 0, 0.35, 1)` | fixe contre le nœud, apparition instantanée | suit le pointeur (constante de temps 40 ms, 95 % de l'écart en 0,12 s), fondu de 0,15 s en lissage cubique symétrique ; contre le nœud sans pointeur ou en mouvement réduit | CORRIGÉ (OBSERVÉ pour les durées ; le décalage de 18 px est notre choix) |
| Bouton du mode 3D | captures : masqué sur l'accueil, visible dans un chapitre | visible partout | masqué tant que l'accueil occupe l'écran, sauf si le mode 3D est engagé ; fondu de 0,15 s ; le clavier reste actif partout | CORRIGÉ (OBSERVÉ) |
| Survols des liens | JSON : `color 0.15s, text-decoration-color 0.15s` (136 échantillons) | changement instantané | appliqué aux liens du site (`.cv-link`, liens des fiches et des deux navigations) | CORRIGÉ (OBSERVÉ) |
| Survols des boutons | JSON : `background-size 0.25s cubic-bezier(0.2, 0.7, 0.2, 1), border-color 0.15s, color 0.2s, scale 0.1s` | instantané, ou 0,25 s uniforme pour le bouton de mode | mêmes durées et courbe sur le fond, la bordure et la couleur des boutons du site | CORRIGÉ (OBSERVÉ pour les durées ; l'effet de fond glissant de la référence n'est pas repris) |
| Barres de graphique | JSON : `scale 0.55s cubic-bezier(0.2, 0.7, 0.2, 1)`, retards de 0,36 à 0,96 s | sans objet | non repris : aucun graphique à barres équivalent sur l'accueil | NON APPLICABLE |
| Curseur sur un nœud cliquable | JSON : `pointer` (2 mouvements sur canevas) | `grab` puis `grabbing` | inchangé : la saisie des nœuds est un ajout propre au site | ÉCART ASSUMÉ |
| Fuite des nœuds devant le pointeur, inclinaison du plan | aucune donnée (rendu de canevas) | choix internes | inchangés | NON DOCUMENTÉ |

Sous 940 px la référence n'a pas de bouton de mode expo : le site le retire aussi de l'écran (décision de l'auteur : interface alignée sur la référence). Le mode 3D mobile reste dans le code et dans les tests, sans commande visible ; la réserve de 56 px de la grille est supprimée.

Tests : `test-modes` PASS (24 contrôles, dont rendu à plat, transitions, bouton, libellé de survol, grille), `test-branches`, `test-entrypoints`, `test-no-shopify --strict`, `test-defilement`, `test-objets-3d`, `test-site-consistency` PASS. Capture : `docs/fall26-evidence/accueil-graphe-plat-avant-apres.png` (avant, après à 1 400 px, après à 390 px).

## Observation directe de la référence à 1 400 × 900 et recalage du graphe à plat

Banc : Chromium sans tête (rendu logiciel), page publique `https://www.shopify.com/editions/fall2026`, fenêtre 1 400 × 900, captures à 3, 6, 10, 15, 22 et 30 s après le chargement. Les captures de la référence ne sont pas versées dans le dépôt. Aucune vidéo : les animations sont déduites de l'écart entre deux captures.

| Effet | Mesure sur la référence | Avant | Maintenant | État |
|---|---|---|---|---|
| Forme des rayons, à plat | segments droits, 1 px, aucune ramification, aucune gerbe au centre (seuls des traits vers les foyers) | courbes, ramifications sur trois niveaux, 120 rayons au centre | droits, sans ramification ni rayon central ; courbes et ramifications conservées en 3D, où elles avaient été observées | CORRIGÉ (OBSERVÉ) |
| Longueur des rayons | environ 110 à 330 px pour un cadre de 945 px | 37 à 150 px | 65 à 260 px (rayon de foyer porté à 52 % de l'envergure) | CORRIGÉ (OBSERVÉ, réglé pour rester dans le cadre) |
| Couleur des rayons | clair et turquoise au foyer, bleu vers l'extrémité ; quelques foyers verts | teinte uniforme | dégradé radial par foyer, un foyer sur trois vert | CORRIGÉ (OBSERVÉ ; choix des foyers verts arbitraire) |
| Extrémités | points bleus d'environ 2 px, y compris pour les foyers verts | points de 1 à 3 px, verts pour les foyers verts | points bleus de 1,9 px ; contenus sans image en points de 2,6 px | CORRIGÉ (OBSERVÉ) |
| Halo des foyers | aucun | halo lumineux | aucun à plat | CORRIGÉ (OBSERVÉ) |
| Impulsions sur les rayons | aucune visible sur les deux captures stabilisées | impulsions blanches | retirées à plat, conservées en 3D | CORRIGÉ (INFÉRÉ : deux images fixes seulement) |
| Vignettes | environ 20 px de côté, bord blanc | 22 à 46 px | 20 à 25 px × 15 à 20 px | CORRIGÉ (OBSERVÉ) |
| Libellés | nom à droite du foyer, environ 12 px ; nombre gris en exposant, environ 10 px | 11 px et 9 px | 12 px et 10 px | CORRIGÉ (OBSERVÉ à l'œil, à un pixel près) |
| Disposition | foyers répartis sur tout le cadre, anneau au centre du cadre | foyers dans un disque, centre à 53 % de la hauteur, foyers surélevés | envergure de 41 % de la largeur, centre au milieu, foyers à hauteur nulle | CORRIGÉ (positions exactes non reprises : elles dépendent des contenus) |
| Dérive des foyers | 5 à 20 px de déplacement entre 10 s et 30 s, soit de l'ordre de 0,3 à 1 px/s | foyers fixes | dérive sinusoïdale lente (amplitude 3,5 % de l'envergure, au plus 0,7 px/s), immobile en mouvement réduit | CORRIGÉ (OBSERVÉ pour l'ordre de grandeur ; la loi du mouvement est INFÉRÉE) |
| Apparition du graphe | cadre noir à 3 s, graphe complet à 10 s | croissance échelonnée des rayons | inchangé | NON DOCUMENTÉ (étapes intermédiaires non capturées) |
| Réaction au pointeur | non observée | fuite des nœuds, inclinaison du plan | inchangées | NON DOCUMENTÉ |

`tools/test-branches.mjs` vérifie maintenant les deux régimes : à plat, 249 rayons droits sur 249, aucune ramification ; en 3D, courbes (seuil de 80 %, les petites branches lointaines passant sous 0,8 px en perspective) et raccords exacts. `tools/test-modes.mjs` : le contrôle du retour d'un nœud relâché porte sur la stabilité à moins de 25 px (le retour est devenu plus rapide que le premier relevé).

## Apparition du graphe à plat (rafale sur la référence, 1 400 × 900)

Rafale de 22 captures entre 0,9 s et 27 s après la navigation (rendu logiciel : la page fige les captures pendant qu'elle se construit, d'où seulement deux instants utiles). Cadre noir jusqu'à 3,8 s ; une image intermédiaire saisie entre 4,9 s et 6,5 s ; une image presque finale à 6 s dans la série précédente ; état final ensuite.

| Instant | Observé sur la référence | Repris |
|---|---|---|
| Début | foyers seuls, carrés environ trois fois plus gros qu'à l'arrivée, resserrés autour du centre, traits vers l'anneau central, quelques rayons courts, noms à peine visibles | écartement 0,45, grossissement 3, rayons en croissance, noms transparents |
| Vers 2 s | positions presque finales, points et vignettes encore environ 1,5 fois plus gros, tous les rayons tracés, noms lisibles | écartement terminé en 1,6 s, grossissement terminé en 2,6 s (sorties cubiques), noms en fondu de 0,9 s à 1,9 s |
| Fin | tailles finales | écartement 1, grossissement 1 |

Certitude : OBSERVÉ pour les deux états et l'ordre des événements ; INFÉRÉ pour les durées (1,6 s et 2,6 s) et les courbes, calées sur deux instants seulement. En mouvement réduit l'état final est affiché d'emblée. Non repris sous 940 px (grille), faute d'observation. Capture du site : `docs/fall26-evidence/accueil-graphe-apparition.png` (trois instants). Contrôle ajouté à `test-modes` (26 contrôles).

## Réaction au pointeur sur le graphe à plat (observation directe, 1 400 × 900)

Banc : même page publique, pointeur déplacé par le navigateur sur deux foyers, le centre, une zone vide et une ligne de balayage ; capture 2,5 s après chaque déplacement et lecture du curseur calculé. Captures de la référence non versées.

| Effet | Observé sur la référence | Avant | Maintenant | État |
|---|---|---|---|---|
| Survol d'un foyer : couleur | rayons, points et carré du foyer en vert vif | aucun effet | idem (vert vif), bord vert sur ses vignettes | CORRIGÉ (OBSERVÉ) |
| Survol d'un foyer : nom | nom agrandi, d'environ 12 px à environ 22 px | aucun effet | corps de 12 à 22 px | CORRIGÉ (OBSERVÉ à l'œil) |
| Survol d'un foyer : rayons | rayons resserrés vers le foyer | aucun effet | rayon réduit de 35 % | CORRIGÉ (OBSERVÉ ; taux estimé) |
| Survol d'un foyer : autres foyers | rayons, points et vignettes des autres foyers estompés | aucun effet | estompés de 60 % | CORRIGÉ (OBSERVÉ ; taux estimé) |
| Survol d'un foyer : trait vers le centre | allumé, en vert | aucun effet | idem | CORRIGÉ (OBSERVÉ) |
| Curseur | `pointer` sur un foyer et sur une vignette, `auto` au centre et dans le vide | `grab` sur une vignette, rien sur un foyer | `pointer` sur un foyer et sur une vignette ; `grabbing` pendant qu'on tient un nœud (saisie propre au site) | CORRIGÉ (OBSERVÉ) |
| Clic sur un foyer | non essayé sur la référence | sans effet | mène au chapitre du foyer | AJOUT (cohérent avec le curseur `pointer`, non observé) |
| Durée des transitions de survol | non mesurée (une capture par état) | sans objet | lissage de constante de temps 0,12 s | NON DOCUMENTÉ, choix interne |
| Retour au repos | points du foyer précédent en anneaux creux pendant le retour (une capture) | sans objet | non repris | NON REPRIS |
| Infobulle au survol d'une vignette | non déclenchée pendant ce balayage | libellé qui suit le pointeur | inchangé | NON OBSERVÉ ici (durées issues du JSON) |

Pendant le survol d'un foyer, la mise en évidence d'une trajectoire (ajout antérieur du site) est suspendue. Capture du site : `docs/fall26-evidence/accueil-graphe-survol-foyer.png`.

Tests : `test-modes` PASS (27 contrôles, dont le survol d'un foyer), `test-branches` PASS, `test-entrypoints`, `test-defilement`, `test-objets-3d`, `test-no-shopify --strict` PASS ; `test-machines` (onze machines) et `test-navigation` (102 routes) PASS, relancés sur `e972cd2` ; `test-ux` : la fiche `moteur44` passe sur ses quatre tailles quand la suite est lancée fiche par fiche (les dix autres fiches non relancées ; la suite complète dépasse 25 min dans ce banc).

`test-ux` relancé fiche par fiche sur `df88def` : les onze fiches passent sur leurs quatre tailles (44 contrôles). Un échec isolé, `gares` en mobile, au premier passage ; la fiche relancée seule passe entièrement. Échec intermittent déjà consigné pour cette suite ; la branche ne modifie aucun fichier des fiches machines (seuls `index.html`, `refonte/hero-graph.js`, `refonte/moteur.js` et deux tests changent).

## Transitions entre chapitres (observation directe, 1 400 × 900, défilement instantané puis capture)

Banc : même page publique et même fenêtre que le site ; `scrollTo` instantané à des pas de 170 px autour du haut d'un chapitre, lecture de la couleur de fond calculée et capture de la fenêtre. Référence : transition « Agentic » vers « Sidekick » (haut du chapitre suivant à 6 009 px). Site : transition « Projets professionnels » vers « Parcours » (haut à 46 272 px). Captures de la référence non versées ; planche du site : `docs/fall26-evidence/chapitres-transition-site.png`. Les captures sont lentes en rendu logiciel (de 10 s à plus de 60 s par image) : aucun état intermédiaire d'animation temporelle n'est capturable.

| Effet | Référence | Site | État |
|---|---|---|---|
| Fond avant la transition | oklab(0,357162 −0,0193286 −0,214271) | identique | CONFIRMÉ (OBSERVÉ) |
| Fond après la transition | oklab(0,428252 0,13336 −0,174502) | identique | CONFIRMÉ (OBSERVÉ) |
| Fenêtre de la transition | commence entre 669 et 499 px avant le haut du chapitre : progression 0,02 à 669, 0,57 à 499, 1 à 329 | 0,01 à 680, 0,53 à 510, 1 à 340 | CONFIRMÉ à un pas d'échantillonnage près (170 px) ; la forme de la courbe entre deux points n'est pas mesurée |
| Position verticale du titre pendant la montée | environ 69 %, 51 %, 32 % et 13 % de la hauteur de fenêtre à 329 px avant, 159 px avant, au niveau puis 181 px après le haut du chapitre | 71 %, 52 %, 33 % et 14 % aux positions équivalentes | CONFIRMÉ à 2 % près (lecture sur vignettes, à l'œil) |
| Remplissage du titre (contour puis plein) | titre déjà plein sur toutes les captures, à 499 px avant et après | contour qui se remplit de la droite vers la gauche avec le défilement | NON DOCUMENTÉ : à position fixe, le nombre de pixels blancs du titre ne change pas entre des images prises de 13 s à 340 s d'écart (69, 12 340 puis 7 220 pixels selon la position) ; à 5 420 px il vaut 69 en arrivant par le haut et 7 223 en revenant de 5 500 px : l'état dépend du sens du défilement, pas seulement de la position. La vidéo de l'auteur (24 s) reste la seule preuve du remplissage ; le site n'est pas modifié. |
| Liste fixe des chapitres, à gauche | 11 noms, le chapitre actif en évidence, centrée verticalement | 4 noms (les 4 sections réelles) | DIFFÉRENT : voir structure |
| Structure | 11 sections de chapitre, chacune avec son titre et sa couleur | 4 sections réelles ; les 7 premières entrées de la liste (« Prévention & sécurité » à « Savoir-être ») sont des blocs de compétences (`rf-sk`) dans la section « Parcours », leurs ancres `#agentic` à `#operations` pointent sur ces blocs de 257 à 452 px | À DÉCIDER par l'auteur : passer à 11 sections est un choix de contenu et de structure, pas un réglage |
| Contenu des chapitres | visuels 3D produits, textes marketing | contenu du CV | HORS PÉRIMÈTRE (contenus propres à chaque site) |

Observation annexe : le fond de page est piloté par 11 chronologies `--f26-page-0` à `--f26-page-10` ; le site n'en utilise que 4 (une par section réelle), les 7 autres restent à zéro.

# Passage de 4 à 11 chapitres (PR 224)

Décision de l'auteur : les 7 blocs de compétences de « Parcours » deviennent de vrais chapitres. Mesures : `tools/test-chapitres.mjs` (rendu logiciel, 1 440 × 900, Shopify bloqué). Planches du site : `docs/fall26-evidence/chapitres-plat-site.png` (à plat) et `chapitres-expo-site.png` (expo).

| Élément | Avant | Maintenant | Mesure ou preuve | État |
|---|---|---|---|---|
| Sections de chapitre | 4 (`shop`, `marketing`, `fulfillment`, `developer`) | 11, dans l'ordre du graphe : `agentic`, `sidekick`, `online`, `merchandising`, `retail`, `payments`, `operations`, puis les 4 existantes | 11 sur 11, identifiants HTML uniques | CORRIGÉ |
| Contenus des 7 blocs | liste de pastilles dans « Parcours » | une carte par compétence (6, 4, 7, 7, 6, 8, 8), identifiant = nœud du graphe, icônes conservées | « Parcours » ne garde qu'un renvoi vers les 7 chapitres, sans doublon | CORRIGÉ |
| Nœuds du graphe | 83 nœuds, 7 chapitres pointant vers des blocs de 257 px dans « Parcours » | 83 nœuds pointant vers un élément de leur chapitre | 83 sur 83 | CORRIGÉ |
| Chronologies et couleurs | 4 sections sur les chronologies 0, 1, 2 et 10 | 11 sections sur les chronologies 0 à 10, suite bleu, violet, rose, orange, bleu, vert, rose, violet, orange, vert, ardoise | couleur au cœur de chaque chapitre = couleur attendue ; moteur chromatique et paramètres inchangés | CORRIGÉ |
| Transitions de couleur | 1 transition mesurée | 11 mesurées dans les deux sens | écart entre descente et remontée 0,000 ; fenêtre de 660 à 360 px avant le haut du chapitre (340 px avec un pas de 20 px, mesure validée) pour les chapitres 2 à 11 ; chapitre 1 de 390 à 90 px (avance d'entrée nulle, comme sur la référence) | CONFIRMÉ |
| Avance d'entrée de « Mondes & jeux » | 0 px (un `<span id="perso">` entre deux sections cassait le sélecteur voisin) | 247,5 px comme les autres ; l'ancre `#perso` est dans la section | référence : 247,5 px pour tous sauf le premier ; fenêtre mesurée identique aux autres chapitres | CORRIGÉ |
| Remplissage des titres | 0,02 à 0,34 de `u` (calage à l'œil) | 0,08 à 0,20 ; fonction pure de la position, donc sans état | à `u = 0,20` (haut du titre à 720 px) le titre est entièrement blanc sur la référence ; invisible à 0,11 en arrivant par le haut. Sur les 11 titres : nul avant 0,08, complet dès 0,22, croissant, identique en descendant et en remontant (écart < 0,05), saut < 0,45. La courbe entre les deux bornes n'est pas observée (le DOM de la référence ne porte aucun état : tout est peint dans le canevas) | CALIBRÉ sur deux points ; forme NON DOCUMENTÉE |
| Hystérésis de la référence | état du titre dépendant du sens du défilement (69 pixels blancs à 5 420 px en arrivant par le haut, 7 223 en revenant de 5 500 px) | non reproduite : le site se règle sur la position seule | choix délibéré (consigne : pas de saut ni de remise à zéro) | ÉCART ASSUMÉ |
| Liste latérale à plat | 4 noms | 11 noms, un seul actif, le bon, pour chaque chapitre | 11 sur 11 | CORRIGÉ |
| Liste en expo | pas de chapitre actif marqué | chapitre actif marqué (`aria-current`, même style qu'à plat) | 11 sur 11 | AJOUT (non observable sur la référence, qui exige l'API HTML dans le canevas) |
| Navigation à plat | ancres vers 4 sections | 11 ancres ; atterrissage à 359 px avant le haut de section | référence : 359 px aussi, relevé sur `#sidekick` et `#payments` ; retour arrière du navigateur exact | CONFIRMÉ |
| Navigation en expo | non testée | défilement doux, atterrissage à +207 px (première carte moins 30 % de la fenêtre), chapitre actif juste à l'arrivée | 11 sur 11 | CONFIRMÉ |
| Étoiles de titre en expo | 8 | 15 (11 chapitres et 4 thèmes), chaque chapitre a son foyer et son nom | 11 sur 11 visibles avec leur nom | CORRIGÉ |
| Cartes du chapitre à plat | pleine largeur, passant sous la liste latérale | à partir de la 3e colonne dès 940 px (la référence : cartes à 187 px à 1 400 px) | recouvrement supprimé | CORRIGÉ |
| Entrée en expo depuis un défilement profond | blocs 3D décalés d'environ 31 000 px (`scrollY` plafonné par le navigateur quand la page rétrécit, relu pendant les déplacements) | position d'entrée mémorisée | 0 étoile visible avant, 2 après dans le scénario reproduit ; défaut préexistant, révélé par la nouvelle structure | CORRIGÉ |
| Métadonnées | `twitter:site` = `@Shopify` | retiré, avec `twitter:account_id` | contrôle dans `test-chapitres` | CORRIGÉ |

Tests sur le dernier code : `test-chapitres` PASS (à plat et en expo ; première passe complète du mode à plat, puis relances de la seule partie expo après réglage des attentes), `test-modes`, `test-branches`, `test-defilement`, `test-entrypoints`, `test-objets-3d`, `test-machines`, `test-navigation` (102 routes), `test-site-consistency` (40 pages), `test-no-shopify --strict` : PASS.

Origine du balisage et éléments issus de la référence : `docs/reference/origine-et-elements-tiers.md`.

# Mini-jeu de la sphère (PR 224)

Décision de l'auteur : annulation du retrait décidé en PR 209 ; mini-jeu original réintégré au parcours final, dans la scène Expo. Détail, règles, commandes, mesures et limites : `docs/reference/mini-jeu-sphere.md`. Vérifications qui exigent un GPU réel : `docs/reference/verifications-gpu-expo.md`.

| Élément | Référence | Ce dépôt | État |
|---|---|---|---|
| Touches | `d` 28, `a` 22, `z` 14, `q` 2, `e` 1 (journal brut) | flèches, A, D, Q, W, S, Z, Espace, molette | REPRIS pour a, d, z, q ; reste ORIGINAL |
| Commande à saisir et glisser, bouton de départ | `div.game-grab` (curseurs `grab` et `grabbing`), `button.game-start` | zone de glisser tactile, bouton Jouer, invitation en fin de parcours | REPRIS dans le principe |
| Règles, durée d'une partie, rendu, son | NON DOCUMENTÉS (session de 36 s dont 25 s de touches) | mécanique originale ; 1 à 3 minutes visées (92,0 s mesurées au clavier) | ORIGINAL |
| Même environnement que l'Expo | sans objet | dessin dans le canevas de l'Expo avec la projection du moteur, caméra pilotant la position de lecture, entrée et sortie progressives | IMPLÉMENTÉ ET TESTÉ en rendu logiciel |
| Fluidité, rendu et ressenti sur GPU | sans objet | banc logiciel de cette session : 0,8 image/s avec le jeu, non représentatif. Une autre session déclare (commit `b275c1f`) 24 vérifications réussies sur un GPU matériel, une partie de 93,8 s au clavier et une vidéo ; non reproduit ici | DÉCLARÉ PAR UNE AUTRE SESSION ; autres GPU, son et tactile réel OUVERTS |

Tests : `tools/test-jeu-coeur.mjs` (noyau, 0,3 s) et `tools/test-jeu.mjs` (navigateur, partie complète au clavier seul) PASS ; non-régression : `test-modes`, `test-branches`, `test-entrypoints`, `test-objets-3d`, `test-machines`, `test-navigation`, `test-site-consistency`, `test-no-shopify --strict`, `test-chapitres expo` PASS ; `test-defilement` : passe seul, échoue par intermittence quand le banc est chargé (timing de 250 ms), module de défilement non modifié.

## Effets du pointeur sur le graphe de l'accueil (analyse REA des scripts publics, code propre)

Méthode : analyse statique des modules du graphe de la référence (outil REA, mode inerte, aucune exécution de code tiers), lecture des paramètres par défaut du moteur de simulation. Aucun code ni asset de la référence n'est copié ; les formules ci-dessous sont réécrites dans `refonte/moteur.js` (`repousse`).

| Comportement observé (réf.) | Paramètre relevé | Reprise dans `moteur.js?v=m30` |
|---|---|---|
| Le pointeur repousse les foyers d'après sa **vitesse**, pas sa position | portée 265, intérieur 24, seuil de vitesse 24, vitesse max 1800, élan 1,45, noyau L² | oui, mêmes bornes et même forme |
| Bouclier : un foyer situé devant le mouvement est moins poussé | bouclier 1 | oui |
| Retour vers la position d'origine | ressort de rappel | oui (ressort 16, amortissement 6 : choix propre, la référence n'expose pas d'équivalent direct) |
| Foyers non survolés ralentis | hoverSlow 0,2 | oui (poussée et rappel × 0,2 quand un foyer est survolé) |
| Voisins du foyer survolé : anneau, étiquette, arête allumée, fondu 0,3 s | 6 voisins au plus | oui (fondu 0,1 s de constante de temps) |
| Resserrement des rayons du foyer survolé | hoverConstrict 0,25 | déjà présent (0,35) |
| Sillage de glyphes fluide (WebGPU), aimant, saisie et lancer, orbite lente | fluide GPU, magnetRadius 15, orbite | **non repris** : le sillage demande un rendu GPU, le reste n'est pas relevé sur l'accueil à plat |

Vérification : `node tools/test-pointeur-graphe.mjs` (poussée 37 px au balayage rapide, retour à 0,04 px, aucune poussée à pointeur immobile, voisin et foyers estompés au survol). Le réglage d'amplitude (facteur 1,5) est un choix propre, à comparer à la référence sur matériel réel.

## 4e cadre de l'accueil : filtre animé (composant « checkpoint » rétabli)

- Historique : jusqu'au commit `7534fe4a`, ce cadre montait le composant `checkpoint` de la référence, chargé depuis le CDN Shopify (`PrototypeStage`, visible à partir de 940 × 693 px). Il a disparu quand l'accueil est devenu indépendant de Shopify (0 requête) ; seule l'affiche fixe (`checkpoint-stage__poster`) restait.
- Rétabli en local : `refonte/checkpoint.js` (code propre ; lois relevées sur le module de la référence : 5 000 arrivées par minute, 3,5 % bloqués qui rebondissent, ligne à 0,5, quatre flux à 0,2 / 0,4 / 0,6 / 0,8, enveloppes calculées sur 22 tranches, points qui défilent sur les bords, impacts de 0,52 s, poussée du pointeur). Même condition d'affichage (940 × 693 px), affiche fixe conservée en dessous et en mouvement réduit.
- Proportions des cadres de l'accueil à 2498 × 1319 comparées à la capture de référence : positions identiques à 1 px près.

## Survol du graphe de l'accueil : lois de la simulation de la référence (moteur `m31`)

Source : module `renderer` de la référence (fonctions de simulation et jeu de réglages `pack`), lu dans l'extraction ; réécrit dans `refonte/moteur.js`.

| Loi de la référence | Valeur | Reprise |
|---|---|---|
| Survol d'un foyer : ses rayons raccourcissent | `hoverConstrict` 0,25 | oui |
| Ordre du resserrement : selon l'angle de chaque rayon, à partir du haut | `hoverStagger` 0,15 s | oui |
| Vitesse du resserrement / de la relâche | `hoverResponse` 15/s, `releaseRelaxation` 3/s | oui |
| Survol d'un contenu : tout le graphe se calme | calme vers 1 à 10/s, allure = 1 − (1 − `hoverSlow` 0,2) × calme | oui |
| Orbite lente des rayons autour du foyer, un foyer sur deux en sens inverse | `orbitSpeed` 0,02 rad/s, `orbitAlternate` | oui |
| Aimant : un rayon proche du pointeur s'y colle | `magnetRadius` 15 px × échelle (min(L, H) / 741, bornée 0,4 à 3), noyau (1 − (d/r)²)², 0,9 | oui (déplacement direct vers le pointeur, sans la force de la simulation) |
| Poussée par la vitesse du pointeur, coupée pendant le survol d'un foyer | voir section précédente | oui |
| Deux traits qui circulent sur chaque branche | `flowSpeed` 1,5, `flowTrail` 1 s, sens et vitesse tirés du hachage de la branche | oui (couleur choisie : celle du foyer) |
| Anneaux des voisins | appartiennent à la vue de section, pas à l'accueil | **retirés** de l'accueil |

Non repris : sillage de glyphes WebGPU (rendu GPU), saisie et lancer d'un foyer (`grabPull` 38, `throwScale` 1,25), forces de répulsion entre foyers (notre disposition des foyers est fixe). Test : `node tools/test-pointeur-graphe.mjs`.

## Apparition du graphe de l'accueil : séquence « intro » de la référence (moteur `m32`)

Source : classe d'intro du module `controller` de la référence et ses réglages par défaut. Les captures `t03` à `t30` prises sur la référence étaient à 3, 6, 10, 15, 22 et 30 **secondes** (graphe déjà complet) : elles ne renseignent pas l'intro, c'est le code qui fait foi.

| Loi | Valeur | Reprise |
|---|---|---|
| Ordre de sortie des foyers | rang × pas premier avec leur nombre (11 foyers : pas 5), décalage 0,07 s | oui |
| Trajet d'un foyer depuis le centre | 1,1 s, courbe 1 − (1 − d)⁵ | oui |
| Rotation pendant la sortie | foyers −180°, rayons −67°, amorties en (1 − t/3)⁵ | oui |
| Rayons | partent 0,45 s après leur foyer, + 0,025 s chacun, trajet 0,99 s | oui |
| Taille d'un élément | min(1, 6d) × (1 + 0,7 sin(πd)) × souffle | oui |
| Souffle (échelle globale des tailles) | 5,6 → 1, maintien 0,25 s, retour 1,75 s, puissance 3, mélange 0,2 | oui |
| Foyer central | part de 1/5,6, atteint 1 en 0,25 s, gonfle 0,6 s (× 1,42 au plus) | oui |
| Dérive lente des foyers | `driftOn` désactivé sur la référence | **retirée** (c'était un choix propre) |

Remplace l'apparition estimée sur deux captures (écartement 0,45 → 1 en 1,6 s, taille × 3 → 1 en 2,6 s). Mouvement réduit : aucune apparition. Outil : `VW=1400 VH=900 REJOUE=0.15,0.4,0.7,1,1.5,2.4 OUT=x.png node tools/capture-accueil.mjs` (horloge de l'intro figée, une image par instant).

## Saisie et lancer d'un foyer (moteur `m33`)

Lois du module `renderer` de la référence : pendant la saisie, le foyer suit le pointeur (vitesse estimée 0,6 × ancienne + 0,4 × nouvelle), ses rayons se resserrent ; au lâcher, vitesse × 1,25 × exp(−max(0, arrêt − 80 ms) / 60 ms), plafonnée à 1 400 px/s × échelle ; freinage renforcé après le lâcher (+14, qui s'éteint à 1,5/s) puis retour à la place. Un clic (moins de 5 px parcourus) mène toujours au chapitre. Priorité au foyer quand le pointeur est à moins de 12 px de son centre. Test : `tools/test-pointeur-graphe.mjs` (suit de 120 px, pas de navigation après un glisser, retour à moins de 1 px).

## Sillage de glyphes et lueur des points (sillage `s3`, moteur `m34`)

Sources : shaders `fluid`, `fluid-ambient` et `glyph-glitch` de la référence, réglages par défaut du `renderer` (`fluidGlyphSize` 6, `fluidRadius` 6, `fluidForce` 0,6, `fluidDye` 0,15, `fluidFade` 4, `fluidTurbulence` 200, `fluidGlitch` 3, `fluidAir` 0,95, `fluidMask` 0,1, `fluidMarksOnly`, `fluidAmbient` 100, opacités accueil 0,4 et 0,6), module `glow` (`glowStagger` 0,35, `glowFade` 0,6). Réécrits ; aucun fichier de la référence n'est versionné ni chargé.

| Élément | Référence | Ici |
|---|---|---|
| Moteur | WebGPU | **WebGL2** (carte graphique, textures demi-flottantes), même suite de passes : advection, divergence, 16 itérations de Jacobi, projection, choix des glyphes par cellule, composition |
| Grille | une cellule par glyphe, 4 × 6 px (taille 6, proportion 30/48) | identique |
| Pointeur | une poussée par mouvement (16 par image au plus), ignorée après 0,25 s d'arrêt ; fluide arrêté sous 0,015 d'énergie | identique (énergie décomptée au pas de la simulation) |
| Glyphes | marques du graphe (cercle, carré, plein, creux, 2 tailles), rampe de 22, bords plus clairs, 95 % de cellules vides, masque de bruit, bascules d'un quart de tour, déchirures, scintillement × 5 | identique ; défilement des marques de bord approché (sans le décalage de rangée du texte) |
| Page nue | 100 marques isolées sur une grille 3 × 4 px, chacune à son rythme (0,5/s), ordre mélangé par réseau de Feistel | identique (atlas commun aux deux grilles) |
| Teinte | surface bleue `#0822B5` relevée vers le blanc (0,2 ; bords 0,6) | identique |
| Conditions | pointeur fin avec survol, mouvement normal | identique |
| Lueur | points à moins de 265 px du pointeur mêlés de blanc (lissage 3 − 2x), montée 24/s, extinction 0,6 s après un délai propre à chaque point (0 à 0,35 s) | identique (points des rayons et contenus sans image) |

Mesures (rendu logiciel) : grille 249 × 139, teinte maximale 0,33 pendant un geste, retombée sous le seuil du premier glyphe (0,025) au repos. Le rendu sur carte graphique matérielle reste à comparer visuellement à la référence. Tests : `tools/test-sillage.mjs`, `tools/test-pointeur-graphe.mjs` (lueur).

## Transitions entre chapitres : graphe commun et caméra (graphe-chapitres `gc2`, moteur `m36`)

Sources : modules `journey`, `heroMediaFlight` (calcul de l'image de section à partir du défilement) et `build-section-frame` de la référence. Réécrit dans `refonte/graphe-chapitres.js`.

**Séparation en 11 chapitres** : un chapitre = une section de la page (`agentic` … `developer`) = une étoile du graphe ; même identifiant partout, pas d'autre découpage.

| Loi de la référence | Valeur | Reprise |
|---|---|---|
| Après l'accueil, le même graphe reste en fond (couche fixe) | — | oui : canevas fixe, même moteur, même disposition que l'accueil |
| Cadrage d'un chapitre | étoile à 22 % de la largeur, mi-hauteur ; cadre 18 / W − 24 / 82 / 0,78 H ; agrandissement ≤ 2,8, × 0,92 | oui |
| Trajet entre chapitres | de (bas du quitté − 0,55 H) à (haut du suivant − 0,4 H) | oui |
| Repli des rayons du chapitre quitté | sur 0 à 30 % du trajet | oui |
| Glissement de caméra | courbe cubique symétrique sur tout le trajet | oui |
| Contexte (autres étoiles) | révélé de 2 à 8 %, effacé de 50 à 100 % ; plancher 0,12 | oui |
| Dépli des rayons du chapitre suivant | 50 à 100 % (lissé) | oui |
| Couleur de page | 11 à 63 % du trajet | inchangé : chaîne de couleurs CSS existante (mesurée au tour précédent) |
| Entrée depuis l'accueil | zoom de la vue d'ensemble vers la première section | approché : la caméra va du centre (échelle 1) à la première étoile pendant l'effacement de l'accueil |

Retiré : l'étoile blanche propre à chaque titre (`theme-stars.js`), qui n'existe pas sur la référence ; le remplissage des titres et la liste des chapitres sont conservés. Hors grand écran (moins de 940 px) et en mode expo, la couche est masquée. Test : `node tools/test-graphe-chapitres.mjs [dossier]` (cadrage, repli, contexte, dépli, relais au chapitre suivant).

## Disposition des chapitres : grille et cadres (relevé sur la page de référence en ligne, 1 400 × 900)

Relevé : positions et tailles des `article` de chaque section, chaîne de grilles et styles calculés (script Playwright, page de référence en ligne, aucune ressource copiée).

| Élément | Référence | Avant | Après |
|---|---|---|---|
| Grille | 16 colonnes, gouttière 16 px, groupe de cadres col. 3 à 16 | marge latérale ajoutée `clamp(20px,3vw,64px)` | marge retirée : départ à x = 189 (187 + barre de défilement) |
| Grand cadre (média) | 12 colonnes = 1 011 px, bordure 10 %, fond blanc 8 %, marges 24/24/16, titre 18 px | toute la largeur forcée (1 122 à 1 195 px) | 12 colonnes (1 022 px) ; projets compris |
| Paire | 6 colonnes = 497 px | — | jeux par paires (503 px) |
| Petite entrée | 3 colonnes = 241 px, 4 par rangée, sans cadre, carré 4 px, 14 px, 96 px entre rangées | cadres de 159 px de haut, empilés, titre 28 à 44 px | compétences en entrées de 244 px, 4 par rangée, 14 px, 96 px entre rangées ; icône et rappel du chapitre masqués |
| Texte des cadres | 18 px | 21 à 30 px (`clamp`) ; titres 28 à 44 px forcés | 18 px, titres hérités (18 px) |

Reste différent : la référence garde des cadres de 400 à 735 px de haut (texte court, média, bouton vers le détail) ; nos fiches de projets intègrent tout leur contenu (environ 3 500 px chacune). Ramener ce contenu derrière un bouton est un choix de contenu, non fait ici.

## Ordre des chapitres : projets en tête, par type (avis de Mathieu, confronté et retenu)

Raisonnement : la référence ouvre sur son offre phare ; pour un CV, la preuve la plus forte est la réalisation concrète, et chaque type de projet porte une promesse lisible. Contre-avis retenu : sept chapitres de compétences de 4 à 7 lignes chacun sont trop minces pour un chapitre ; ils sont regroupés pour garder 11 chapitres.

| Position (section) | Avant | Après |
|---|---|---|
| 1 `agentic` | Prévention & sécurité | **Faire fonctionner** (introduction + 2 projets) |
| 2 `sidekick` | Maintenance & exploitation | **Fichiers retrouvés** (introduction + 5 projets) |
| 3 `online` | Data & automatisation | **Construire une fois** (introduction + 2 projets) |
| 4 `merchandising` | IA appliquée | **Savoir où regarder** (introduction + 2 projets) |
| 5 `retail` | Référentiels | **Gains** (tirelire des gains annuels) |
| 6 `payments` | Méthodes | Maintenance & prévention (10 compétences) |
| 7 `operations` | Savoir-être | Data & IA (14) |
| 8 `shop` | Projets professionnels | Référentiels & méthodes (14) |
| 9 `marketing` | Parcours | Parcours + savoir-être (8) |
| 10, 11 | Mondes & jeux, Blog & études | inchangés |

Chaque position garde son identifiant, sa couleur et sa ligne de temps (chaîne de couleurs inchangée). Script reproductible : `python3 -I tools/reordonne-chapitres.py index.html` (contrôles : sections équilibrées, 73 cadres avant, 76 après = 3 introductions de types en plus). Menus, liste de l'accueil, données du graphe et liens de Parcours mis à jour ; titres en double des introductions retirés (ancres `s-p0` à `s-p3` conservées).

## Fiches de projets compactes

Référence : cadres de 400 à 735 px de haut (titre, texte court, média, bouton vers le détail). Avant : chaque fiche de projet affichait tout son contenu (environ 3 500 px). Après (`tools/compacte-projets.py`, passage unique) : rubrique, titre, sous-titre, « L'idée », **deux chiffres clés** tirés de « Ce que ça change » (temps libéré, valorisation), image de la machine et ses boutons restent visibles ; « L'objet en action », la démo, le projet, « Comment ça marche » et la construction se déplient avec « Voir le détail » (élément `details` natif, accessible au clavier, ouvert automatiquement quand un lien pointe à l'intérieur). Hauteur mesurée à 1 400 × 900 : 499 px par fiche (3 514 px une fois dépliée), aucune erreur de page.

## Prose au ton des Éditions Shopify Automne 2026 (version française relevée en ligne)

Relevé du ton (`shopify.com/fr/editions/fall2026`, 11 sections) : grand cadre = titre-bénéfice en groupe nominal (« Toute votre boutique gérée depuis une vue unique »), une ou deux phrases au présent, l'outil en sujet, chute courte (« Demandez-lui une fois : il s'en souviendra. ») ; petite entrée = une phrase à l'impératif ; boutons « En savoir plus », « Afficher l'aide » ; légendes chiffrées (« Plus de 12 000 … chaque minute »).

| Texte | Avant | Après | Règle |
|---|---|---|---|
| 11 fiches de projets | rubrique, nom de l'outil, sous-titre, « L'idée » | titre-bénéfice (« Des dépassements de budget signalés le matin même ») + 1 à 2 phrases (outil en sujet) + chiffres clés | `tools/prose-projets.py` ; chaque phrase reprend un fait de la fiche |
| 4 introductions de types | 2 à 4 notes | une phrase de promesse | idem |
| Bouton de détail | « Voir le détail » | « En savoir plus » | libellé de la référence |
| Légendes de l'accueil | « 3 200 à 4 000 h libérées… » | « Plus de 3 200 heures libérées chaque année pour les équipes » | format chiffre en tête |
| Présentation (Parcours) | ton familier (« Salut ! ») | phrases courtes, mêmes faits | `tools/prose-accueil-parcours.py` |
| Tailles | titre de fiche ≈ 28 px, texte 16 px, colonne ≈ 220 px | titre et texte 18 px, texte atténué, colonne 400 px | relevés de la référence |

Non réécrit, faute de matière : les 46 compétences et les 11 jeux n'ont qu'un nom dans le site. Les transformer en phrases d'action, comme les petites entrées de la référence, demanderait d'inventer ce qu'ils recouvrent ; une ligne par compétence et par jeu fournie par Mathieu permettrait de le faire. Les détails dépliables des projets gardent leur texte d'origine.

## Machines et « Voir la magie » repris de main

La branche de la PR n'avait pas reçu les commits de `main` sur les machines (#240 à #243). Repris de `main` : le dossier `refonte/m3d/` (rendu trait `lines.js` : aplat bleu à tons de faces, contours blancs, halo au sol, accent sur la pièce qui bouge) et son accroche dans le montage des machines de `index.html`. Retirés : les 11 boutons « Voir la magie » des fiches et les 11 des schémas « Comment ça marche ». Légendes des cadres de l'accueil rétablies dans leur texte d'origine (seuls les noms de chapitres ont changé). Le reste de `main` (nouveau moteur du graphe, nouvelles fiches et nouveaux cadres de l'accueil) n'est pas fusionné : les deux versions ont divergé.

## Fusion avec main

Base : `main` (115 commits absents de la PR). Repris de `main` tel quel : en-tête et accueil (les 4 cadres), styles et scripts, moteur du graphe (`CielExpo`, adaptateur spectral, transitions de chapitres par fondu), machines en trait, fiches des 11 projets (captures, fenêtres animées), tableau de bord des gains, Parcours, Mondes & jeux, Blog & études, menu des chapitres de l'en-tête.

Réappliqué depuis la PR : les **11 sections** dans le nouvel ordre (4 types de projets, Gains, 3 chapitres de compétences, Parcours, Mondes & jeux, Blog & études) avec leurs introductions, noms courts dans les menus et la liste de l'accueil, enregistrements des chapitres ; les 7 groupes de compétences que `main` plaçait dans Parcours sont remplacés par le renvoi vers les 3 chapitres de compétences, et leurs 46 ancres en double retirées ; règles de disposition alignées sur la référence ; mini-jeu de la sphère (bouton, invitation, `jeuMonde` et dessin par image raccordés au script Expo de `main`). Script : reconstruction d'`index.html` (tête, accueil et fin de page de `main`, sections de la PR, contenus récents de `main` transplantés par identifiant).

Non reporté sur le nouveau moteur (retiré, conservé dans l'historique Git) : survol, apparition, saisie et lancer, lueur et sillage de glyphes de l'ancien graphe d'accueil, graphe des chapitres à caméra, filtre animé du 4e cadre de l'accueil. Les fiches de projets reprennent le texte de `main` (la prose au ton de la référence portait sur les anciennes fiches).

Tests : `test-no-shopify --strict` vert (contrôle de la tirelire remplacé par le tableau de bord des gains, qui l'a remplacée dans `main`) ; `test-modes` de `main` : le contrôle du curseur échoue aussi sur `main` seul ; caméra et saisie instables en rendu logiciel. `test-chapitres` adapté à l'interface de `main` (menu d'en-tête, courbe de remplissage 0,02 à 0,34).

Mesures après fusion : `test-chapitres` 33 contrôles verts (11 transitions, couleurs, navigation à plat et expo, mobile) ; attribution `twitter:site` « @Shopify » réintroduite par `main` retirée. Mini-jeu : entrée, commandes, chute, relance, partie complète au clavier, résultats, sortie et tactile verts ; la page fusionnée est plus courte (parcours de 29 431 px au lieu de 77 833), d'où une partie de 31 s (cible 60 à 180 s) et moins d'objets, et le saut n'est pas compté dans un passage : rééquilibrage à faire.

## Passages entre chapitres après la fusion : comparaison image par image avec la référence (à plat, 1 400 × 900)

Relevé : référence en ligne et site capturés aux mêmes positions (700, 500, 360, 200 et 0 px avant le haut des chapitres 2, 6 et 11), pixel du fond au coin bas droit.

| Élément | Référence | Après fusion (main) | Corrigé |
|---|---|---|---|
| Couleur de page | ancienne à −700, mi-chemin à −500, nouvelle à −360 | déjà nouvelle à −700 (onde lancée ≈ 990 px avant) | loi `journey` de la référence dans `section-colours.js` : trajet du haut du chapitre − 87 px − 0,55 écran au haut − 0,4 écran, couleur de 11 % à 63 % du trajet, lissée ; mesuré : ancienne à −700, en cours à −500, nouvelle à −360 sur les 3 passages |
| Remplissage des titres | plein en entrant dans l'écran | 0,02 à 0,34 (réglage à l'œil de main) | 0,08 à 0,20, relevé sur la référence |
| Étoiles | graphe en fond, en continu, une étoile au milieu de l'écran (≈ 50 %, 45 %), traits et points blancs, vignettes, sans nom | étoile liée au titre, absente avant lui | graphe des chapitres rétabli (`graphe-chapitres.js` + `moteur-plat.js`, moteur à plat d'origine séparé du moteur Expo de main), cadrage 50 % / 45 %, traits blancs, sans nom, sans remontée des autres étoiles |
| Accueil | 4 cadres | 4e cadre (gains, filtre animé) masqué par `hero-tuning.css` | rétabli, trois rangées |

Écart restant : à −500 px l'étoile du chapitre entrant est déjà déployée sur la référence, encore repliée ici. Mode 3D : la référence exige une carte graphique et l'API « HTML dans le canevas », non observable ici ; sur le site, couleur au sol par chapitre, titres en volume et étoiles vérifiés aux mêmes positions. Tests : `test-graphe-chapitres` vert, `test-no-shopify --strict` vert ; `test-modes` : curseur (échec aussi sur main seul) et caméra (instable en rendu logiciel).

## Passages entre chapitres : relevé fin (tous les 50 px, de 700 à 300 px avant le chapitre 2)

| Élément | Référence | Avant | Après |
|---|---|---|---|
| Couleur (coin bas droit, teinte R) | 05 11 25 3a 4c 5d 69 70 70 : mélange **uniforme** (centre et coin identiques), quasi linéaire de 690 à 360 px | front radial, changement entre 550 et 450 px | mélange uniforme, linéaire de 0,767 à 0,407 écran (690 à 366 px) : 05 0e 22 38 4e 60 6c 70 70, écart ≤ 3 unités à chaque pas |
| Étoile | une étoile déployée à chaque pas, qui glisse d'un chapitre à l'autre | repliée vers −500 (vide) | toujours déployée, relais entre les deux étoiles à mi-trajet |
| Chapitres 6 et 11 | 11 : 15311d à −500 | — | 11 : 0d3120 à −500 ; 6 : départ du gris du tableau des gains (sol sombre de main) au lieu du bleu |

Essai d'un mélange en teinte pure (TSL) : plus proche pour le chapitre 6, plus loin pour les chapitres 2 et 11 ; mélange de main conservé (90 % oklab, 10 % teinte). Ces mesures portent sur le rendu sans WebGPU (repli CSS, chez la référence comme ici) ; sur carte graphique, le fond est peint par le shader de couleur de la référence, non vérifiable ici. Tests : `test-chapitres` 34 contrôles verts, `test-graphe-chapitres` et `test-no-shopify --strict` verts.

## Effets du pointeur reportés sur le nouveau graphe d'accueil de main (`CielExpo`, à plat)

Mêmes lois et mêmes paramètres que la section « Survol du graphe » (référence : module renderer) : poussée des foyers par la vitesse du pointeur (265 / 24 / 1 800 / élan 1,45 / bouclier), ressort de rappel, resserrement de 25 % des rayons du foyer survolé échelonné sur 0,15 s selon l'angle (réponse 15/s, relâche 3/s), calme quand un contenu est survolé (allure 0,2 appliquée à l'orbite), lueur des points à moins de 265 px (montée 24/s, extinction 0,6 s après un délai propre de 0 à 0,35 s), saisie et lancer d'un foyer (vitesse lissée 0,6/0,4, × 1,25, plafond 1 400 px/s, clic vers le chapitre conservé), sillage de glyphes WebGL2 sous le graphe. Les réactions propres à main (poussée locale des points, saisie d'un point, nœud survolé grossi) sont conservées. Test : `tools/test-pointeur-graphe.mjs` (attentes allongées : en rendu logiciel la physique n'avance que de 0,1 s par image) et `tools/test-sillage.mjs`, verts.

## Mini-jeu : piste étirée

La page fusionnée est plus courte (29 431 px). Le plan du jeu est construit sur des rangées multipliées par K = 70 000 / longueur de page, et l'affichage divise par K (`pt` dans `refonte/jeu.js`) : physique, sauts et trous inchangés, partie de nouveau dans la cible de 1 à 3 minutes.

## Les 10 passages entre chapitres (couleur, à plat) et curseur de l'accueil

Relevé sur la référence et sur le site à 700, 500 et 360 px avant chaque chapitre (pixel du fond au coin bas droit) : départ identique sur 9 passages sur 10, mi-chemin à 5 à 25 unités près, arrivée identique à quelques unités. Seul écart : le passage vers le chapitre 6 part du gris du tableau des gains (sol sombre de main) au lieu du bleu.

Curseur sur le graphe de l'accueil : `pointer` sur un nœud ou un foyer (relevé de la référence), `grabbing` pendant une saisie ; le curseur posé par le mode Expo n'est plus effacé par l'accueil. `test-modes` vert en entier (il attendait `grab` au survol, contraire au relevé de la référence).

## Automatisation des processus et Business Intelligence (profil et projets)

Ajouté par `tools/notions-automatisation-bi.py`, chaque notion découlant d'un fait déjà écrit dans la fiche (outil, chaîne de traitement, mesures DAX) :
- **fiches projets** : une rangée de pastilles sous la phrase d'accroche, en police mono 12 px à fond sombre, comme les boutons des cadres de la référence (ex. Gares prioritaires : Business Intelligence · Power BI · DAX : 19 tables, 159 mesures · Indicateurs de criticité ; Reporteur Q18 : Automatisation des processus · Chaîne ETL · SharePoint → Excel → Power BI · Business Intelligence) ;
- **chapitre « Data & IA »** : cinq entrées au format des autres (3 colonnes, 14 px) : Automatisation des processus, Business Intelligence, Modélisation DAX, Tableaux de bord et indicateurs, Chaînes ETL ; ajoutées aux enregistrements des chapitres (graphe, recherche, mini-jeu) ;
- **présentation (Parcours)** : « Deux leviers : l'automatisation des processus (Power Automate, machines virtuelles, SharePoint) et la Business Intelligence (Power BI, modèles DAX, tableaux de bord et indicateurs). »

La présentation au ton de la référence, perdue à la fusion avec main, est réappliquée. Tests : `test-chapitres` mis à jour (19 entrées dans « Data & IA », 84 nœuds), `test-modes` et `test-no-shopify --strict` verts.

## Compétences sous le hublot (Parcours)

- Bloc « Compétences » de main rétabli sous le hublot, à l'identique (7 rubriques, pastilles, légende « En cours d’acquisition », rail de la gare à gauche).
- Ids des rubriques renommés `sk-…` : plus de doublon avec les ids de sections.
- Data & automatisation : + Automatisation des processus, Business Intelligence, Modélisation DAX, Tableaux de bord et indicateurs, Chaînes ETL, SharePoint (icônes reprises des pastilles voisines). 52 pastilles au total.
- Outil : `tools/competences-hublot.py`. Test : `test-chapitres` vérifie 7 rubriques, au moins 52 pastilles, BI présente.

## Accroche de l'accueil

- « Ingénieur maintenance et qualité · Automatisation des processus & BI ». Vérifiée : 1440×900 (vertical, 631 px), 1366×768 (538 px, tient dans le cadre), 390×844 (2 lignes alignées à droite).

## Argumentaire « De l’innovation dans les bureaux » (chapitre Gains)

- Carte texte après le tableau des gains : chapeau + 5 paragraphes en texte suivi, sans intertitres (innovation et numérique, masse documentaire du tertiaire, outils nés de la demande des utilisateurs, pérennité, réticence au niveau de la décision, abordée sans affect), chaque idée amenée par la précédente.
- Ton : Tocqueville (longues périodes, observations générales, ironie retenue), français courant, sans tiret cadratin. Seuls chiffres : ceux du site (3 200 à 4 000 h/an, 104,74 €/h).
- Même gabarit que les cartes d’introduction (h3 + cv-card-body), enregistrement ajouté au chapitre (graphe, recherche). Outil : `tools/argumentaire.py`.
