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
