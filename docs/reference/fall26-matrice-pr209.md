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
