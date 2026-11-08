# Rapport de performances de comtesse.me

Branche : `claude/perf-refonte`. Banc de mesure : `tools/perf/` (mesure.cjs, profile.cjs, machines.cjs, context-loss.cjs, capture.cjs).

## Limite de la mesure

Toutes les mesures ont été faites dans un conteneur sans GPU (Chromium + SwiftShader, rendu logiciel, CPU partagé). Les images par seconde y sont dominées par le rasteriseur logiciel et par des gels de plusieurs secondes présents aussi bien avant qu'après. **Aucun FPS GPU n'a été mesuré. Les objectifs 60 FPS, 30 FPS en mode allégé, LCP, INP et p95/p99 sur matériel réel ne sont pas validés.**

## Constats (confirmés par mesure)

| Constat | Mesure |
|---|---|
| Boucles `requestAnimationFrame` indépendantes | 7 à 10 rappels natifs par image sur l'accueil |
| Contextes WebGL / canvas | 6 contextes, 25 à 27 canvas |
| Poids de `index.html` | 901 Ko (dont 375 Ko et 85 Ko de scripts de démarrage en ligne) |
| Transfert initial de l'accueil | 17,4 Mo, 139 requêtes |
| Tâches longues au chargement | 9 à 12, environ 1,5 à 1,9 s cumulées |
| Coût CPU JavaScript des 14 machines | construction 1 à 66 ms, mise à jour 0 à 0,11 ms par image : ce n'est pas le goulot |
| Temps CPU dominant | rasterisation/GPU logiciel ; côté JS : Three.js (compilation des programmes 659 ms, construction de géométries 208 ms sur 10 s) |
| Perte de contexte WebGL | gérée par Three.js : la machine se redessine après restauration (testé sur 2 pages projet, 0 erreur) |
| Fuites géométries/textures sur 15 cycles construction/destruction | compteurs plats (machines Nisaru et VM) |

## Corrections

1. `refonte/frame-bus.js` : multiplexeur unique de `requestAnimationFrame` (un seul rappel natif par image, horodatage partagé, sémantique conservée), profilage par boucle (`?perf`), gouverneur de qualité `__cvBus.quality` (1, 0,75, 0,5) selon la durée d'image lissée. Inclus en tête de `index.html`. **Rappels natifs par image : 8 en moyenne, puis 1** (mesuré).
2. Rendu des machines de l'accueil : `preserveDrawingBuffer` retiré (la copie vers le canvas 2D suit le rendu dans la même tâche), `powerPreference: high-performance`, résolution et cadence (30 images/s) abaissées quand le gouverneur descend.
3. Frise `#rf-tl` : boucle suspendue hors écran (IntersectionObserver), hauteur en cache (ResizeObserver), reprise à la visibilité. Supprime une mise en page forcée par image.
4. Surcharge globale de `fetch` et des setters `src`/`href` pour les chemins `assets/` : n'est installée que hors `https://comtesse.me`. La surcharge de `fetch` du cache Shopify local est conservée (utilisée par les modules Shopify).
5. Deux scripts de démarrage externalisés (`refonte/boot-native.js` 376 Ko, `refonte/boot-graph.js` 85 Ko), exécutés au même endroit et dans le même ordre. `index.html` : 901 Ko, puis 441 Ko.
6. Parcours : défilement à la molette repris (taux 8 à 11), suivi de caméra 16 à 22 (9 sur tactile) pour réduire d'environ 90 ms la latence cumulée ; mode `deltaMode` page géré.

## Résultats avant / après (accueil, 1440 × 900, 3 passes entrelacées contre `main`)

| | main | branche |
|---|---|---|
| Rappels rAF natifs par image | 5,4 / 8,0 / 7,9 | 1 / 1 / 1 |
| FPS (logiciel, bruité) | 1,2 / 41,2 / 1,2 | 39,1 / 37,9 / 1,3 |
| Tâches longues cumulées (ms) | 1547 / 1562 / 1487 | 1704 / 1591 / 1656 |
| Erreurs JavaScript | 0 | 0 |

Aucune amélioration ni dégradation des FPS n'est démontrable dans cet environnement. Les captures `docs/perf/avant-*` et `apres-*` (3 résolutions, 2 pages projet) diffèrent de moins de 0,3 % des pixels (animation).

## Objectifs

Atteints : un seul rappel natif d'image ; suppression de la boucle de frise hors écran ; retrait de `preserveDrawingBuffer` ; réduction de 52 % du HTML principal ; récupération après perte de contexte vérifiée ; absence de fuite sur 15 cycles ; onze machines (plus 3 variantes du livre) construites et mises à jour sans exception ni NaN ; parité visuelle.

Non atteints ou non vérifiés : 60 FPS réels, 30 FPS en mode allégé sur matériel réel, LCP, CLS, INP, p95/p99 sur GPU ; remplacement des modules du CDN Shopify par des modules originaux (non commencé, chantier majeur) ; copies WebGL vers Canvas 2D remplacées par une intégration GPU directe (conservées, seul le tampon persistant est retiré) ; moteur d'animation centralisé pour le temps, le défilement et la caméra (seul le bus d'images l'est) ; test de pièce personnelle et de navigation arrière sur matériel réel ; chargement différé des données JSON restantes du HTML (73 Ko de cache de trames) ; frame-bus non inclus dans les pages projet.

## Tests

`node tools/perf/machines.cjs` (machines, fuites), `node tools/perf/context-loss.cjs projet-vre` (perte de contexte), `node tools/perf/measure.cjs / out.json 1440 900 8` (cadence, tâches longues, rAF, contextes), `node tools/perf/profile.cjs /` (profil CPU). Tests existants relancés : `test-project-metadata` et `test-navigation` réussissent ; `test-site-consistency` échoue à l'identique sur `main` ; `test-scene-lifecycle` ne se lance pas (module introuvable, antérieur).
