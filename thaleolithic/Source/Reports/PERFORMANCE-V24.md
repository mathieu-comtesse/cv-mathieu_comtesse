# THALÉOLITHIC V24

Compare les quatre relevés JSON dans le dossier `performance-v24/`. Ils portent sur le vrai WebAssembly, dans un profil Chromium neuf par essai et avec les mêmes ressources locales interceptées par Playwright. Le candidat a été compilé avec le projet `Unity-Web` et Unity **6000.2.12f1**, qui produit aussi la V22.1 de référence. La version 6000.3.26f1 mentionnée pour le projet complémentaire n’a pas servi à ces compilations.

## Mesures avant et après

| Mesure | V23.1 | V24 | Gain |
| --- | ---: | ---: | ---: |
| Quatre fichiers avant le jeu | 101,4 Mio | 74,0 Mio | −27,0 % |
| Fichier de données compressé | 92,4 Mio | 65,0 Mio | −29,6 % |
| Accueil prêt sous Windows, bureau / tactile émulé | 12,3 s / 12,5 s | 10,1 s / 10,3 s | −18 % / −18 % |
| Heap Wasm observable au démarrage, bureau et tactile émulé | 458,9 Mio | 382,4 Mio | −16,7 % |
| Temps de frame navigateur p95 au village, bureau et tactile émulé | 16,7 ms | 11,2 ms | −33 % |

La V24 a tourné sous Windows avec Chromium 156 et une Radeon RX 9070 XT via ANGLE/D3D11. En cinématique, le p95 est passé de 16,6 à 11,2 ms au bureau et s’est maintenu à 11,2 ms en tactile émulé. Le temps de script CDP pendant les 12 s au village varie peu entre les relevés de bureau. Le débit du navigateur dépend de la fréquence de l’écran. Le heap Wasm mesure la capacité du tampon à partir du moment où le chargeur expose l’instance au JavaScript. Les valeurs de heap JavaScript, conservées dans les JSON, incluent des allocations de la page et du banc de test. Les temps CPU/GPU de Unity et les allocations GC indisponibles sont représentés par `-1`.

## Changements et preuves

| Domaine | Constat initial et changement | Vérification |
| --- | --- | --- |
| Téléchargement et mémoire | Le Build Report V23.1 attribuait 144,7 Mio aux textures, 22,7 Mio au NavMesh principal et 43,2 Mio à six fichiers de polices CJK hérités. Le build français écarte les six dépendances CJK et restaure à l’identique les assets éditables via un journal de reprise. | Build V24 réussi, 0 erreur. Les quatre fichiers ont leurs empreintes de cache. Captures de la place avec texte, GPS, acteurs et foyers. |
| Physique | `FootGrounding` exécutait quatre raycasts allouants et plusieurs tris par passage IK. Le nouveau chemin effectue deux requêtes sur buffers réutilisés et garde une solution complète en cas de saturation. | Compilation Unity. Orbite et collision sur mur dans la suite Unity, reprise en navigateur. Le nombre de requêtes IK indiqué provient du code. |
| Simulation | Les décisions ordinaires des PNJ sont réparties à 5, 2,5 et 1 Hz selon la distance. Les recherches fréquentes sont mises en cache et les animations d’activités réutilisent les clips chargés. | La cinématique d’ouverture et le village ont chargé dans les deux profils du navigateur. Le parcours Unity instrumenté couvre la progression indépendamment. |
| Feu et qualité | Les foyers proches gardent leur flamme, leurs braises et leur lumière. Les foyers éloignés actualisent moins de particules. Le profil automatique Web écarte la RAM système annoncée et attend plusieurs fenêtres lentes avant de réduire l’échelle. | Captures comparatives et p95 avant/après. Le HUD, la charpente et les foyers restent lisibles dans les captures comparatives. La télémétrie recense deux foyers et vingt personnages au village initial. |
| Diagnostics | Le panneau `?diagnostic=1` expose p50, p95, p99, qualité, mémoire Unity, appels de rendu et triangles quand les compteurs sont accessibles. Il exporte les mesures en JSON et CSV. | Le navigateur final a remonté les échantillons Unity et les compteurs de rendu dans les deux profils. |

La suite Unity V24 valide 25 contrôles, dont l’acceptation de la mission de Mathieu, la réponse puis son rechargement, 1 274° d’orbite, l’évitement d’un mur et la reprise du SST. Le vrai WebAssembly final passe les scénarios Chromium de bureau et tactile émulé. Le test de bureau obtient puis libère le Pointer Lock après un clic.

## Rejouer la comparaison

1. Lance `node tools/bench-thaleolithic.cjs` sur chaque répertoire Web, avec `THALEOLITHIC_BENCH_ROOT` pointant vers le répertoire du jeu et `THALEOLITHIC_REPORT` vers le fichier de sortie. Ajoute `--touch` pour l’émulation.
2. Lance `node tools/test-thaleolithic-browser.cjs --real` et `node tools/test-thaleolithic-browser.cjs --real --touch`. Le flag `--pointer` vérifie l’obtention du Pointer Lock par un vrai clic.
3. Dans Unity, lance `CinematicTemperateBuildV19.WebV24` sur `Unity-Web`. Le build sort dans `Builds/Web-V24`. Le projet local contient les assets natifs nécessaires.
4. Pour le parcours instrumenté, lance `-executeMethod UngaBunga45001.TemperateJourneyV19.RunV24Audit -thaleolithicJourneyV24`. Le pilote utilise une sauvegarde isolée et sélectionne les réponses connues. Le rapport Unity est distinct des mesures navigateur.

La production sert V22.1. Les essais iPhone, Android et macOS physiques, les benchmarks dédiés des scènes tardives, la validation des trois fins et le découpage du chargement par chapitre restent ouverts. Les objectifs de réduction de 30 % du pic mémoire et de 40 à 60 % du téléchargement initial restent des cibles.
