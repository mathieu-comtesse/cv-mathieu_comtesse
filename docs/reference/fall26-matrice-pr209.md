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

# Mise à jour : observation du mode Expo dans Chrome 157 (PR 211, base PR 210)

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
