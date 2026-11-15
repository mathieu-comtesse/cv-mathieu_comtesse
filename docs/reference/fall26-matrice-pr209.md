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

Non établi : la courbe d'accélération de la caméra de la référence (la fonction `Do` n'a pas été retrouvée ; la nôtre reste un lissage de cinquième ordre sur le temps).

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
