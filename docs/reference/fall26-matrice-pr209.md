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
