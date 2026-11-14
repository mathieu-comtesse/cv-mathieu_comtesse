# THALÉOLITHIC V24.1

Build candidat WebGL, Unity 6000.2.12f1, 0 erreur et 25 avertissements. La branche `perf/thaleolithic-v24` porte ce candidat dans la PR #205. La PR #204 porte les correctifs V23.1 et précède #205 dans l’ordre d’intégration. Les deux PR restent en brouillon. La production reste sur V22.1.

## Taille et mesures WebAssembly

| Indicateur | V23.1 | V24 | V24.1 |
| --- | ---: | ---: | ---: |
| Charge initiale des quatre fichiers Unity | 101,4 Mio | 74,0 Mio | 65,3 Mio |
| Données compressées | 92,4 Mio | 65,0 Mio | 56,2 Mio |
| Accueil prêt, bureau Windows | 12,3 s | 10,1 s | 9,4 s |
| Heap Wasm observable au démarrage, bureau | 458,9 Mio | 382,4 Mio | 382,4 Mio |
| P95 navigateur au village, bureau | 16,7 ms | 11,2 ms | 11,3 ms |

Les chiffres V23.1 et V24 de ce tableau proviennent du [rapport V24](PERFORMANCE-V24.md). La mesure V24.1 est issue du comparatif séquentiel ci-dessous, après l’endurance. Chromium et la Radeon RX 9070 XT utilisent ANGLE/D3D11 sous Windows. Les ressources sont locales et les deux versions passent par la même interception Playwright.

| Relevé séquentiel, une seule instance à la fois | V24 | V24.1 | Écart |
| --- | ---: | ---: | ---: |
| Accueil prêt, bureau | 10,57 s | 9,43 s | −10,8 % |
| Accueil prêt, tactile émulé | 10,46 s | 9,69 s | −7,4 % |
| Heap Wasm observable au démarrage et au village | 382,4 Mio | 382,4 Mio | 0 Mio |
| P95 navigateur au village, bureau et tactile émulé | 11,3 ms | 11,3 ms | 0 ms |

Le premier lot de mesures s’est déroulé pendant l’endurance Web et le parcours Unity. La V24 y a atteint 458,9 Mio au village et le P95 tactile de la V24.1 est monté à 22,2 ms. Le comparatif séquentiel ne reproduit ni cette croissance du heap V24 ni cet écart de P95. Les [mesures brutes](performance-v241/) distinguent les deux lots. La réduction supplémentaire de mémoire Wasm reste à démontrer.

Le heap Wasm mesure la capacité du tampon après exposition de l’instance Unity au JavaScript. Le compteur d’allocations Unity, le heap JS, la mémoire du processus et la mémoire GPU désignent des mesures distinctes. Les compteurs CPU/GPU Unity et GC renvoient `-1` quand la mesure est indisponible. Les fichiers initiaux du candidat totalisent 68 453 731 octets. Le gain est de 11,8 % face à V24 et d’environ 36 % face à V23.1.

## Ressources et architecture

| Poste | Avant et cause | Changement et validation |
| --- | --- | --- |
| NavMesh | La surface inactive `Terrain` référençait 23 836 980 octets d’asset historique. Son type d’agent et son emprise différaient de la surface utilisée. | La scène Web compilée écarte cette référence. Le Build Report confirme son absence. La surface active `Navigation du village V2` conserve l’agent 0, son volume de 115 × 65 × 115 m et ses tuiles de 128. Les données éditables restent disponibles pour les autres builds. |
| Physique et navigation | Chaque appel allouait un tableau de collisions. L’accès répété à `NavMeshPath.corners` et aux terrains actifs ajoutait des allocations. | Réutilisation des buffers de 24 colliders et 32 impacts, lecture unique des coins et cache de terrain par frame. La requête exhaustive reste le chemin de repli si le buffer est saturé. La mesure Web du dernier recalcul est disponible dans les diagnostics. Gain CPU isolé indisponible. |
| Textures | 319 chemins empaquetés en V24. Terrain et anciennes interfaces figurent parmi les postes les plus lourds. | 320 chemins en V24.1, détaillés avec taille empaquetée, import, dimensions, mips et matériaux. Les formats ETC2 de quatre sprites historiques non-POT n’ont produit aucune réduction de taille empaquetée. La taille de l’inventaire correspond à des chemins sources regroupés et le format d’import dépend de la cible active. |
| Comparaison du village | La vue initiale et la vue actuelle utilisaient chacune une cible 512 × 512 avec profondeur et un rendu de caméra dès la préparation. | La vue initiale reste capturée pour conserver la comparaison. La seconde cible et son rendu sont différés jusqu’à la demande de comparaison. Gain mesuré en travail évité au démarrage, sans mesure GPU isolée. |
| Lots ISO | Les sept clips de mise en scène résidaient dans `Resources` et partaient avec le build initial. | Deux lots UnityFS indépendants et versionnés, ISO 7 de 14 240 octets et ISO 8 de 136 146 octets. La V24.1 anticipe selon l’acte et réessaie après un échec réseau. Le conteneur est libéré après lecture. Les clips restent disponibles en mémoire pour rejouer. L’audit ISO 9 partage un clip ISO 8. Les chapitres 4 à 6 et 10 restent dans le noyau. |

Les inventaires [V24](performance-v241/inventory-v24.json) et [V24.1](performance-v241/inventory-v241.json) identifient les dépendances de la scène et les ressources embarquées dont l’usage est à confirmer. L’éditeur recense 8 258 triangles de navigation dans cette scène. Le temps de reconstruction asynchrone inclut l’attente du frame suivant. Le rapport Web de reprise a observé 600 ms sur son dernier recalcul, sans référence V24 équivalente.

## Diagnostic et essais physiques

L’échec après l’accueil sur smartphone a été signalé sur la version publique. Aucun iPhone, appareil Android ou Mac accessible n’a permis de reproduire l’échec sur ce poste. Sa cause reste indéterminée. Le scénario tactile émulé utilise Chromium Windows avec un viewport de 852 × 393 et un ratio de 2.

Les requêtes HTTP de boucle locale ont expiré depuis l’environnement d’exécution, y compris sur un serveur Node minimal. Les tests Chromium locaux ont donc utilisé l’interception Playwright. Le serveur QA est destiné à une session PowerShell hôte sur le réseau de test. La V24.1 testée et le candidat du dépôt ont les mêmes SHA-256 pour les neuf fichiers de démarrage, de build et de lots.

1. Depuis la racine du dépôt, lance le serveur du candidat sur un réseau local de test.

   ```powershell
   $env:THALEOLITHIC_QA_HOST='0.0.0.0'
   node tools/serve-thaleolithic-qa.cjs
   ```

2. Ouvre `http://<IP-du-PC>:8793/thaleolithic/?diagnostic=1` en profil neuf ou après effacement des données de ce site. Teste Safari iPhone, Chrome Android, puis Safari et Chrome macOS. Indique le modèle, l’OS, le navigateur, l’espace disponible, l’orientation et le réseau.
3. Appuie sur **Jouer**. Note l’étape atteinte et le temps jusqu’à l’apparition de Dylan. Vérifie déplacement, caméra, pause, rotation d’écran, verrouillage et retour. Reviens ensuite à une sauvegarde après fermeture.
4. En cas d’échec, exporte le JSON avec **Copier le diagnostic** ou le volet **Diagnostic**. Si le navigateur recharge l’onglet, exporte aussi le journal de l’instance précédente depuis ce même onglet. Joins la capture et les journaux de la console distante si disponibles. Le journal distingue WebGL 2, configuration, chargeur, moteur, scène et confirmation du démarrage.
5. Refais le premier lancement sur la [version publique V22.1](https://comtesse.me/thaleolithic/) dans un profil séparé. Compare l’étape d’échec et les requêtes HTTP plutôt que les temps du serveur local et de la production.

## Parcours et régressions

Le [parcours Unity V24.1](performance-v241/unity-journey.json) part d’une sauvegarde neuve et termine en 15 min 35 s. Il valide 10 quêtes, 24 activités et 7 chapitres, puis obtient `FIN_3` après environ 815 m de déplacement. Le pilote utilise les actions du jeu et connaît les réponses. Sur 187 relevés dans l’éditeur, la mémoire allouée passe par un minimum de 604 Mio et un maximum de 660 Mio. Le relevé ne constitue pas une mesure mémoire Web.

Les tests Chromium bureau et tactile émulé passent avec déplacement, caméra, reprise après changement de visibilité et sauvegarde. Le bureau obtient et libère le Pointer Lock et termine 20 cycles de menus. Le tactile confirme les dimensions de fenêtre 852 × 393 puis 393 × 852. Une nouvelle partie ne télécharge aucun lot ISO. Une sauvegarde V24 de l’acte IV déclenche le chargement, récupère après un HTTP 503 injecté sur ISO 8 et conserve le dernier événement de démarrage de l’instance précédente.

La [suite Unity de non-régression](performance-v241/unity-regression.json) passe ses 27 contrôles, dont l’orbite continue de 1 274°, le dégagement de caméra au mur, la réponse de Mathieu conservée et la reprise d’une pièce SST. La vérification de publication, les 18 contrôles du budget graphique et le contrat du pont navigateur passent également.

## Dix scènes dans le vrai WebAssembly

Le [relevé des dix scènes](performance-v241/scenes.json) utilise des sauvegardes générées pendant le parcours Unity V24.1. Chromium les reprend via le stockage natif du jeu. Pour les scènes qui le nécessitent, le pilote utilise le clavier pour approcher le référent après reprise. L’entrée se mesure à partir de l’action du jeu et inclut les transitions mises en scène. Elle exclut le déplacement de mise en place. Les percentiles viennent d’une fenêtre de six secondes après l’entrée. Les appels de rendu et les triangles correspondent au dernier échantillon de cette fenêtre.

| Scène | Reprise / entrée (s) | P50 / P95 / P99 (ms) | Frames ≥ 50 ms | Appels de rendu | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Combat Dylan contre Aurélien | 11,67 / 19,94 | 11,0 / 11,2 / 16,7 | 0 | 906 | 589 071 |
| Chasse aux risques | 11,59 / 0,14 | 11,1 / 44,4 / 83,3 | 11 | 511 | 254 220 |
| Assemblage SST | 11,71 / 0,13 | 11,1 / 33,3 / 44,5 | 4 | 492 | 342 721 |
| Cinématique C08 de reconstruction | 11,66 / 13,46 | 11,0 / 11,3 / 16,8 | 0 | 1 123 | 594 258 |
| Village évolué | 11,49 / 0 | 11,0 / 16,8 / 27,8 | 3 | 327 | 339 423 |
| Comparaison des 15 différences | 12,32 / 0,14 | 10,9 / 22,2 / 39,0 | 1 | 295 | 338 605 |
| Course d’urgence | 11,69 / 0,06 | 11,1 / 16,7 / 44,4 | 0 | 462 | 499 092 |
| Audit des esprits | 12,41 / 0,11 | 11,1 / 28,0 / 34,0 | 1 | 477 | 478 282 |
| Revue de direction | 11,42 / 0,11 | 11,0 / 11,3 / 22,2 | 2 | 395 | 394 617 |
| Séquence finale | 11,46 / 7,60 | 11,0 / 11,2 / 11,3 | 0 | 1 270 | 756 304 |

La chasse aux risques présente le P95 le plus élevé de la série. Le heap Wasm observé reste à 382,4 Mio dans les dix fenêtres. Le JSON conserve les échantillons mémoire, les compteurs d’animation et les erreurs. La série se termine sans erreur navigateur. Le coût individuel des lumières et des animations reste à isoler.

Les [captures du village en V24](performance-v241/bench-desktop-v24.json.png) et [en V24.1](performance-v241/bench-desktop-v241.json.png) montrent les foyers, les personnages, la charpente, le HUD et le GPS depuis le même cadrage. Les captures de la [reconstruction](performance-v241/scene-4.png), de la [comparaison du village](performance-v241/scene-6.png) et de la [fin](performance-v241/scene-10.png) proviennent du build candidat. La sauvegarde Web confirme la lecture complète de `F15_C14_GOOD`, l’issue `FIN_3` et une seule récompense de la dernière quête.

## Endurance Web

Le [test d’endurance](performance-v241/endurance.json) maintient une instance Chromium active pendant 2 700,003 secondes à partir de **Jouer**. Il traverse l’ouverture puis effectue 131 cycles pause et reprise au village initial, avec déplacement au clavier pendant les quatre premiers cycles. L’autosauvegarde Web reste active. Chaque relevé confirme les commandes disponibles. Le rapport enregistre zéro erreur navigateur.

| Mémoire pendant les 131 relevés | Minimum | Maximum |
| --- | ---: | ---: |
| Heap Wasm | 382,4 Mio | 382,4 Mio |
| Mémoire allouée Unity | 257 Mio | 268 Mio |
| Heap JavaScript annoncé par Chromium | 160,8 Mio | 470,1 Mio |

La session continue couvre l’ouverture et le village initial. Les autres activités sont mesurées dans des reprises Web distinctes et jouées de bout en bout par le pilote Unity. Un enchaînement Web de 45 minutes à travers les chapitres et le test pédagogique chronométré avec un joueur découvrant le jeu restent ouverts.

## Parcours alternatifs encore ouverts

La fin est évaluée par `FinishCampaign()` après `AdvanceAct()`. La progression linéaire de la campagne ISO 45001 rend les vérifications, les compétences, l’audit et l’amélioration obligatoires. Les activités obligatoires posent les indicateurs utilisés par `FIN_3`. Le parcours effectué a aussi réduit à zéro les six risques suivis. Le compte à rebours ne déclenche la fin que dans la campagne sans activités V17.

Deux états isolés couvrent le sélecteur historique de `FIN_1` et `FIN_2`. Aucun chemin complet vers ces deux issues n’a été établi avec les règles actuelles de progression. Le candidat conserve ces règles. Ouvrir un chemin de fin anticipée ou un écart volontaire en fin de parcours demande une décision sur la progression pédagogique.

## Reproduction des mesures

1. Compile via `CinematicTemperateBuildV19.WebV241` sur le projet natif `Unity-Web`. Lance ensuite `node tools/stage-thaleolithic-build.mjs` avec les arguments indiqués par le script.
2. Lance `node tools/bench-thaleolithic.cjs` pour chaque version. Renseigne `THALEOLITHIC_BENCH_ROOT` et `THALEOLITHIC_REPORT`. Ajoute `--touch` pour l’émulation.
3. Génère les sauvegardes réelles avec `-executeMethod UngaBunga45001.TemperateJourneyV19.RunV24Audit -thaleolithicJourneyV241`. Pointe `THALEOLITHIC_SCENE_FIXTURES` vers `Revision24-1/Journey/fixtures` et lance `node tools/test-thaleolithic-browser.cjs --real`.
4. Lance le même test avec `THALEOLITHIC_ENDURANCE_MINUTES=45`, sans les options de sauvegarde et de scènes, pour maintenir une instance Web active après l’ouverture.
5. Liste précisément les fichiers avec `git diff --name-status fix/thaleolithic-v23-1-stability...perf/thaleolithic-v24`. Pour isoler V24.1, utilise `git diff --name-status 13b6ca5...perf/thaleolithic-v24`.

## Vérifications encore ouvertes

1. Reproduire le premier lancement et le retour après verrouillage sur iPhone, Android et Mac. Attribuer l’échec mobile à une étape à partir d’un diagnostic physique.
2. Mesurer les gains GPU et CPU isolés, le coût des lumières et des animations et l’impact des textures historiques sur la mémoire des appareils ciblés.
3. Vérifier le retour entre chapitres et la répétition après déchargement. Étendre la séparation des ressources aux groupes restants après cartographie de leurs dépendances.
4. Enchaîner une session Web de 45 minutes avec la progression entre chapitres et mesurer la durée d’un premier parcours avec un joueur découvrant le jeu.
5. Établir les parcours complets vers `FIN_1` et `FIN_2` et vérifier leurs sauvegardes, dialogues, récompenses et cinématiques finales.

## Fichiers modifiés pour V24.1

A correspond à un ajout. M correspond à une modification.

~~~text
A	thaleolithic/Build/Web-V24.1.data.unityweb
A	thaleolithic/Build/Web-V24.1.framework.js.unityweb
A	thaleolithic/Build/Web-V24.1.loader.js
A	thaleolithic/Build/Web-V24.1.wasm.unityweb
A	thaleolithic/Source/Editor/ChapterMotionBuildV241.cs
M	thaleolithic/Source/Editor/CinematicTemperateBuildV19.cs
A	thaleolithic/Source/Editor/LegacyWebTextureScopeV241.cs
A	thaleolithic/Source/Editor/WebAssetInventoryV241.cs
A	thaleolithic/Source/Reports/PERFORMANCE-V24.1.md
A	thaleolithic/Source/Reports/performance-v241/bench-desktop-v24.json
A	thaleolithic/Source/Reports/performance-v241/bench-desktop-v24.json.png
A	thaleolithic/Source/Reports/performance-v241/bench-desktop-v241.json
A	thaleolithic/Source/Reports/performance-v241/bench-desktop-v241.json.png
A	thaleolithic/Source/Reports/performance-v241/bench-touch-v24.json
A	thaleolithic/Source/Reports/performance-v241/bench-touch-v241.json
A	thaleolithic/Source/Reports/performance-v241/bridge-smoke.json
A	thaleolithic/Source/Reports/performance-v241/chapters.json
A	thaleolithic/Source/Reports/performance-v241/desktop.json
A	thaleolithic/Source/Reports/performance-v241/endurance.json
A	thaleolithic/Source/Reports/performance-v241/inventory-v24.json
A	thaleolithic/Source/Reports/performance-v241/inventory-v241.json
A	thaleolithic/Source/Reports/performance-v241/isolated-desktop-v24.json
A	thaleolithic/Source/Reports/performance-v241/isolated-desktop-v241.json
A	thaleolithic/Source/Reports/performance-v241/isolated-touch-v24.json
A	thaleolithic/Source/Reports/performance-v241/isolated-touch-v241.json
A	thaleolithic/Source/Reports/performance-v241/scene-1.png
A	thaleolithic/Source/Reports/performance-v241/scene-10.png
A	thaleolithic/Source/Reports/performance-v241/scene-2.png
A	thaleolithic/Source/Reports/performance-v241/scene-3.png
A	thaleolithic/Source/Reports/performance-v241/scene-4.png
A	thaleolithic/Source/Reports/performance-v241/scene-5.png
A	thaleolithic/Source/Reports/performance-v241/scene-6.png
A	thaleolithic/Source/Reports/performance-v241/scene-7.png
A	thaleolithic/Source/Reports/performance-v241/scene-8.png
A	thaleolithic/Source/Reports/performance-v241/scene-9.png
A	thaleolithic/Source/Reports/performance-v241/scenes.json
A	thaleolithic/Source/Reports/performance-v241/touch.json
A	thaleolithic/Source/Reports/performance-v241/unity-journey.json
A	thaleolithic/Source/Reports/performance-v241/unity-regression.json
A	thaleolithic/Source/Reports/performance-v241/web-build-result.txt
M	thaleolithic/Source/Runtime/ActivityActingV18.cs
M	thaleolithic/Source/Runtime/ActivityWorldV17.cs
M	thaleolithic/Source/Runtime/AuditSpiritsV17.cs
M	thaleolithic/Source/Runtime/CampaignActivitiesV17.cs
M	thaleolithic/Source/Runtime/CampaignRuntime.cs
A	thaleolithic/Source/Runtime/ChapterMotionV241.cs
M	thaleolithic/Source/Runtime/ConstructionFilmV19.cs
M	thaleolithic/Source/Runtime/MobileBrowserBridge.cs
M	thaleolithic/Source/Runtime/TemperateJourneyV19.cs
M	thaleolithic/Source/Runtime/TribalState.cs
M	thaleolithic/Source/Runtime/VillageNavigation.cs
A	thaleolithic/StreamingAssets/iso-07-f2831fb1b97a.bundle
A	thaleolithic/StreamingAssets/iso-08-da07bd32c7b4.bundle
M	thaleolithic/browser-bridge.js
M	thaleolithic/game-config.json
M	thaleolithic/index.html
A	tools/serve-thaleolithic-qa.cjs
A	tools/stage-thaleolithic-build.mjs
M	tools/test-thaleolithic-browser.cjs
M	tools/test-unga-publication.mjs
A	tools/thaleolithic-scene-bench.cjs
~~~
